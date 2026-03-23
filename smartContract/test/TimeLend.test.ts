/**
 * This file verifies the real TimeLend contract behavior end to end.
 * It exists to lock down the contract that backend and frontend integrations will depend on.
 * It fits the system by covering creation, success, failure, appeal and access-control paths before deployment.
 */
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const APPEAL_WINDOW_SECONDS = 86_400n;
const STAKE_AMOUNT = ethers.parseEther("1");

type DeployedFixture = Awaited<ReturnType<typeof deployFixture>>;

/**
 * This function guarantees that a required runtime value is present.
 * It receives a possibly undefined value and a label used for error reporting.
 * It returns the same value narrowed to a defined type.
 * It is important because the fixture depends on a stable signer set provided by Hardhat.
 */
function ensureDefined<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`Expected ${label} to be defined.`);
  }

  return value;
}

/**
 * This helper reads a stored commitment through the explicit contract getter.
 * It receives the deployed contract instance and the target identifier.
 * It returns the decoded commitment tuple as provided by ethers.
 * It is important because many tests need to inspect state transitions after a transaction.
 */
async function getCommitment(fixture: DeployedFixture, commitmentId: bigint) {
  return fixture.contract.getFunction("getCommitment").staticCall(commitmentId);
}

/**
 * This helper creates a fresh commitment funded by the user signer.
 * It receives the deployed fixture, the deadline timestamp and an optional receiver override.
 * It returns the newly assigned commitment identifier.
 * It is important because most tests focus on behavior after a commitment already exists.
 */
async function createCommitment(
  fixture: DeployedFixture,
  deadline: bigint,
  failReceiver = fixture.failReceiver.address
) {
  const createCommitmentFunction = fixture.userContract.getFunction("createCommitment");

  await expect(
    createCommitmentFunction(deadline, failReceiver, {
      value: STAKE_AMOUNT
    })
  )
    .to.emit(fixture.contract, "CommitmentCreated")
    .withArgs(1n, fixture.user.address, STAKE_AMOUNT, deadline, failReceiver);

  return 1n;
}

/**
 * This helper deploys the TimeLend contract with owner and backend already configured.
 * It receives no parameters because Hardhat provides the deterministic local signers.
 * It returns the deployed contract plus the main actors used in the tests.
 * It is important because each test should start from a clean and auditable initial state.
 */
async function deployFixture() {
  const [rawOwner, rawBackend, rawUser, rawFailReceiver, rawOther] = await ethers.getSigners();
  const owner = ensureDefined(rawOwner, "owner signer");
  const backend = ensureDefined(rawBackend, "backend signer");
  const user = ensureDefined(rawUser, "user signer");
  const failReceiver = ensureDefined(rawFailReceiver, "fail receiver signer");
  const other = ensureDefined(rawOther, "other signer");

  const contract = await ethers.deployContract("TimeLend", [owner.address, APPEAL_WINDOW_SECONDS]);
  await contract.waitForDeployment();

  await contract.connect(owner).getFunction("setBackend")(backend.address);

  return {
    backend,
    backendContract: contract.connect(backend),
    contract,
    failReceiver,
    other,
    owner,
    user,
    userContract: contract.connect(user)
  };
}

/**
 * This test suite covers the complete on-chain commitment lifecycle.
 * It receives no explicit parameters because Mocha controls execution.
 * It returns no value because it only registers test cases.
 * It is important because backend implementation will assume these behaviors are stable.
 */
describe("TimeLend", function () {
  /**
   * This test verifies the creation flow of a funded commitment.
   * It receives no explicit parameters because the fixture handles deployment state.
   * It returns a promise resolved by the test runner.
   * It is important because commitment creation is the main user write path into the contract.
   */
  it("creates a commitment with escrowed funds", async function () {
    const fixture = await loadFixture(deployFixture);
    const deadline = BigInt((await time.latest()) + 3_600);
    const commitmentId = await createCommitment(fixture, deadline);
    const commitment = await getCommitment(fixture, commitmentId);

    expect(commitment.user).to.equal(fixture.user.address);
    expect(commitment.amount).to.equal(STAKE_AMOUNT);
    expect(commitment.deadline).to.equal(deadline);
    expect(commitment.failReceiver).to.equal(fixture.failReceiver.address);
    expect(commitment.status).to.equal(0n);
    expect(commitment.appealed).to.equal(false);
    expect(commitment.payoutState).to.equal(0n);
  });

  /**
   * This test verifies that the backend can resolve a commitment successfully.
   * It receives no explicit parameters because the fixture handles deployment state.
   * It returns a promise resolved by the test runner.
   * It is important because this is the happy path that returns escrowed funds to the user.
   */
  it("marks a commitment as completed and pays the user", async function () {
    const fixture = await loadFixture(deployFixture);
    const deadline = BigInt((await time.latest()) + 3_600);
    const commitmentId = await createCommitment(fixture, deadline);
    const beforeBalance = await ethers.provider.getBalance(fixture.user.address);

    await expect(fixture.backendContract.getFunction("markCompleted")(commitmentId))
      .to.emit(fixture.contract, "CommitmentCompleted")
      .withArgs(commitmentId, fixture.user.address, STAKE_AMOUNT, fixture.backend.address);

    const afterBalance = await ethers.provider.getBalance(fixture.user.address);
    const commitment = await getCommitment(fixture, commitmentId);

    expect(afterBalance - beforeBalance).to.equal(STAKE_AMOUNT);
    expect(commitment.status).to.equal(1n);
    expect(commitment.payoutState).to.equal(1n);
  });

  /**
   * This test verifies the failure path without appeal after the appeal window expires.
   * It receives no explicit parameters because the fixture handles deployment state.
   * It returns a promise resolved by the test runner.
   * It is important because failed commitments must eventually pay the configured receiver safely.
   */
  it("marks a commitment as failed and finalizes payout to the fail receiver", async function () {
    const fixture = await loadFixture(deployFixture);
    const deadline = BigInt((await time.latest()) + 3_600);
    const commitmentId = await createCommitment(fixture, deadline);

    await expect(fixture.backendContract.getFunction("markFailed")(commitmentId)).to.emit(
      fixture.contract,
      "CommitmentFailed"
    );

    await time.increase(APPEAL_WINDOW_SECONDS + 1n);

    const beforeBalance = await ethers.provider.getBalance(fixture.failReceiver.address);

    await expect(fixture.backendContract.getFunction("finalizeFailedCommitment")(commitmentId))
      .to.emit(fixture.contract, "FailedCommitmentFinalized")
      .withArgs(
        commitmentId,
        fixture.failReceiver.address,
        STAKE_AMOUNT,
        fixture.backend.address
      );

    const afterBalance = await ethers.provider.getBalance(fixture.failReceiver.address);
    const commitment = await getCommitment(fixture, commitmentId);

    expect(afterBalance - beforeBalance).to.equal(STAKE_AMOUNT);
    expect(commitment.status).to.equal(2n);
    expect(commitment.payoutState).to.equal(2n);
  });

  /**
   * This test verifies that a failed commitment can be appealed and then overturned.
   * It receives no explicit parameters because the fixture handles deployment state.
   * It returns a promise resolved by the test runner.
   * It is important because the single appeal path is a core business requirement of the product.
   */
  it("supports a successful appeal and returns funds to the user", async function () {
    const fixture = await loadFixture(deployFixture);
    const deadline = BigInt((await time.latest()) + 3_600);
    const commitmentId = await createCommitment(fixture, deadline);

    await fixture.backendContract.getFunction("markFailed")(commitmentId);

    await expect(fixture.userContract.getFunction("appeal")(commitmentId)).to.emit(
      fixture.contract,
      "AppealRequested"
    );

    const beforeBalance = await ethers.provider.getBalance(fixture.user.address);

    await expect(fixture.backendContract.getFunction("resolveAppeal")(commitmentId, true))
      .to.emit(fixture.contract, "AppealResolved")
      .withArgs(commitmentId, true, fixture.user.address, STAKE_AMOUNT, fixture.backend.address);

    const afterBalance = await ethers.provider.getBalance(fixture.user.address);
    const commitment = await getCommitment(fixture, commitmentId);

    expect(afterBalance - beforeBalance).to.equal(STAKE_AMOUNT);
    expect(commitment.status).to.equal(1n);
    expect(commitment.appealed).to.equal(true);
    expect(commitment.payoutState).to.equal(1n);
  });

  /**
   * This test verifies that an appealed failure can still be reaffirmed by the backend.
   * It receives no explicit parameters because the fixture handles deployment state.
   * It returns a promise resolved by the test runner.
   * It is important because the appeal process must handle both success and rejection outcomes.
   */
  it("reaffirms failure on appeal rejection and pays the fail receiver", async function () {
    const fixture = await loadFixture(deployFixture);
    const deadline = BigInt((await time.latest()) + 3_600);
    const commitmentId = await createCommitment(fixture, deadline);

    await fixture.backendContract.getFunction("markFailed")(commitmentId);
    await fixture.userContract.getFunction("appeal")(commitmentId);

    const beforeBalance = await ethers.provider.getBalance(fixture.failReceiver.address);

    await expect(fixture.backendContract.getFunction("resolveAppeal")(commitmentId, false))
      .to.emit(fixture.contract, "AppealResolved")
      .withArgs(
        commitmentId,
        false,
        fixture.failReceiver.address,
        STAKE_AMOUNT,
        fixture.backend.address
      );

    const afterBalance = await ethers.provider.getBalance(fixture.failReceiver.address);
    const commitment = await getCommitment(fixture, commitmentId);

    expect(afterBalance - beforeBalance).to.equal(STAKE_AMOUNT);
    expect(commitment.status).to.equal(2n);
    expect(commitment.appealed).to.equal(true);
    expect(commitment.payoutState).to.equal(2n);
  });

  /**
   * This test verifies that a user cannot appeal the same failed commitment twice.
   * It receives no explicit parameters because the fixture handles deployment state.
   * It returns a promise resolved by the test runner.
   * It is important because the business rules allow exactly one appeal per commitment.
   */
  it("rejects a second appeal request", async function () {
    const fixture = await loadFixture(deployFixture);
    const deadline = BigInt((await time.latest()) + 3_600);
    const commitmentId = await createCommitment(fixture, deadline);

    await fixture.backendContract.getFunction("markFailed")(commitmentId);
    await fixture.userContract.getFunction("appeal")(commitmentId);

    await expect(fixture.userContract.getFunction("appeal")(commitmentId)).to.be.revertedWith(
      "TimeLend: appeal already used"
    );
  });

  /**
   * This test verifies that only the configured backend may execute resolution functions.
   * It receives no explicit parameters because the fixture handles deployment state.
   * It returns a promise resolved by the test runner.
   * It is important because backend-only access is a critical security boundary for the platform.
   */
  it("restricts resolution functions to the backend", async function () {
    const fixture = await loadFixture(deployFixture);
    const deadline = BigInt((await time.latest()) + 3_600);
    const commitmentId = await createCommitment(fixture, deadline);
    const otherContract = fixture.contract.connect(fixture.other);

    await expect(otherContract.getFunction("markCompleted")(commitmentId)).to.be.revertedWith(
      "TimeLend: caller is not backend"
    );
    await expect(otherContract.getFunction("markFailed")(commitmentId)).to.be.revertedWith(
      "TimeLend: caller is not backend"
    );

    await fixture.backendContract.getFunction("markFailed")(commitmentId);
    await fixture.userContract.getFunction("appeal")(commitmentId);

    await expect(
      otherContract.getFunction("resolveAppeal")(commitmentId, true)
    ).to.be.revertedWith("TimeLend: caller is not backend");
  });

  /**
   * This test verifies that a commitment cannot be resolved twice.
   * It receives no explicit parameters because the fixture handles deployment state.
   * It returns a promise resolved by the test runner.
   * It is important because double resolution would otherwise risk double payout.
   */
  it("prevents resolving the same commitment twice", async function () {
    const fixture = await loadFixture(deployFixture);
    const deadline = BigInt((await time.latest()) + 3_600);
    const commitmentId = await createCommitment(fixture, deadline);

    await fixture.backendContract.getFunction("markCompleted")(commitmentId);

    await expect(fixture.backendContract.getFunction("markCompleted")(commitmentId)).to.be.revertedWith(
      "TimeLend: commitment is not active"
    );
    await expect(fixture.backendContract.getFunction("markFailed")(commitmentId)).to.be.revertedWith(
      "TimeLend: commitment is not active"
    );
  });

  /**
   * This test verifies that expired deadlines are rejected at creation time.
   * It receives no explicit parameters because the fixture handles deployment state.
   * It returns a promise resolved by the test runner.
   * It is important because commitments must never start already expired.
   */
  it("rejects commitment creation with a past deadline", async function () {
    const fixture = await loadFixture(deployFixture);
    const expiredDeadline = BigInt((await time.latest()) - 1);

    await expect(
      fixture.userContract.getFunction("createCommitment")(
        expiredDeadline,
        fixture.failReceiver.address,
        {
          value: STAKE_AMOUNT
        }
      )
    ).to.be.revertedWith("TimeLend: deadline must be in the future");
  });

  /**
   * This test verifies that the backend can still mark completion after the deadline.
   * It receives no explicit parameters because the fixture handles deployment state.
   * It returns a promise resolved by the test runner.
   * It is important because backend verification may happen after the recorded deadline even when the user completed on time off-chain.
   */
  it("allows the backend to complete after the deadline when off-chain verification succeeds", async function () {
    const fixture = await loadFixture(deployFixture);
    const deadline = BigInt((await time.latest()) + 60);
    const commitmentId = await createCommitment(fixture, deadline);

    await time.increaseTo(deadline + 1n);

    await expect(fixture.backendContract.getFunction("markCompleted")(commitmentId)).to.emit(
      fixture.contract,
      "CommitmentCompleted"
    );
  });

  /**
   * This test verifies that appeal requests stop once the window has expired.
   * It receives no explicit parameters because the fixture handles deployment state.
   * It returns a promise resolved by the test runner.
   * It is important because failed commitments must become final if the user does not act in time.
   */
  it("rejects appeals after the appeal window closes", async function () {
    const fixture = await loadFixture(deployFixture);
    const deadline = BigInt((await time.latest()) + 3_600);
    const commitmentId = await createCommitment(fixture, deadline);

    await fixture.backendContract.getFunction("markFailed")(commitmentId);
    await time.increase(APPEAL_WINDOW_SECONDS + 1n);

    await expect(fixture.userContract.getFunction("appeal")(commitmentId)).to.be.revertedWith(
      "TimeLend: appeal window has closed"
    );
  });

  /**
   * This test verifies that nonexistent commitments cannot be resolved.
   * It receives no explicit parameters because the fixture handles deployment state.
   * It returns a promise resolved by the test runner.
   * It is important because mapping defaults must never be mistaken for real commitments.
   */
  it("rejects operations on nonexistent commitments", async function () {
    const fixture = await loadFixture(deployFixture);

    await expect(fixture.backendContract.getFunction("markCompleted")(999n)).to.be.revertedWith(
      "TimeLend: commitment does not exist"
    );
    await expect(fixture.userContract.getFunction("appeal")(999n)).to.be.revertedWith(
      "TimeLend: commitment does not exist"
    );
  });
});
