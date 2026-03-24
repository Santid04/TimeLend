// This file defines the production-oriented TimeLend escrow contract.
// It exists to hold user stake, coordinate backend-authorized resolution and preserve a single on-chain appeal path.
// It fits the system by becoming the definitive contract that backend, frontend and off-chain services will integrate against.
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TimeLend
 * @notice Escrow contract for commitment staking, backend-driven resolution and one appeal opportunity.
 * @dev A failed commitment does not release funds immediately because the contract must remain solvent while an appeal is still possible.
 */
contract TimeLend is Ownable, ReentrancyGuard {
    /**
     * @notice Lifecycle states visible to backend and clients.
     * @dev The enum matches the required base model and is intentionally compact for easier off-chain consumption.
     */
    enum Status {
        Active,
        Completed,
        Failed
    }

    /**
     * @notice Tracks whether escrowed funds are still held or have already been released.
     * @dev This extension is required to prevent double execution and to support a meaningful appeal path.
     */
    enum PayoutState {
        Escrowed,
        ReleasedToUser,
        ReleasedToFailReceiver
    }

    /**
     * @notice Core commitment record stored by incremental identifier.
     * @dev The required base fields are preserved and extended with payout and appeal metadata needed for safe final settlement.
     */
    struct Commitment {
        address user;
        uint256 amount;
        uint256 deadline;
        address failReceiver;
        Status status;
        bool appealed;
        PayoutState payoutState;
        uint256 failureMarkedAt;
        uint256 appealWindowEndsAt;
    }

    /// This counter creates stable incremental identifiers for commitments.
    uint256 public commitmentCount;

    /// This address is the only off-chain actor allowed to resolve commitments and appeals.
    address public backend;

    /// This immutable window defines how long a user has to request the single allowed appeal.
    uint256 public immutable appealWindow;

    /// This mapping stores all commitments by identifier.
    mapping(uint256 commitmentId => Commitment commitment) private commitments;

    /**
     * @notice Emitted when a user creates a new escrowed commitment.
     * @param commitmentId The newly assigned identifier.
     * @param user The address that created and funded the commitment.
     * @param amount The native token amount escrowed for the commitment.
     * @param deadline The timestamp after which the commitment is considered overdue off-chain.
     * @param failReceiver The address designated to receive funds if the commitment fails definitively.
     */
    event CommitmentCreated(
        uint256 indexed commitmentId,
        address indexed user,
        uint256 amount,
        uint256 deadline,
        address indexed failReceiver
    );

    /**
     * @notice Emitted when the backend marks a commitment as completed and the user is paid.
     * @param commitmentId The resolved commitment identifier.
     * @param user The commitment owner who receives the escrowed stake back.
     * @param amount The released escrow amount.
     * @param resolver The backend address that executed the resolution.
     */
    event CommitmentCompleted(
        uint256 indexed commitmentId,
        address indexed user,
        uint256 amount,
        address indexed resolver
    );

    /**
     * @notice Emitted when the backend marks a commitment as failed and starts the appeal window.
     * @param commitmentId The failed commitment identifier.
     * @param user The commitment owner.
     * @param failReceiver The designated failure beneficiary.
     * @param amount The escrow amount that remains held until failure is final.
     * @param appealWindowEndsAt The last timestamp at which the user may request the single appeal.
     */
    event CommitmentFailed(
        uint256 indexed commitmentId,
        address indexed user,
        address indexed failReceiver,
        uint256 amount,
        uint256 appealWindowEndsAt
    );

    /**
     * @notice Emitted when the user requests the one allowed appeal.
     * @param commitmentId The appealed commitment identifier.
     * @param user The commitment owner requesting the appeal.
     * @param requestedAt The timestamp at which the appeal was registered.
     */
    event AppealRequested(uint256 indexed commitmentId, address indexed user, uint256 requestedAt);

    /**
     * @notice Emitted when the backend resolves an appealed commitment.
     * @param commitmentId The appealed commitment identifier.
     * @param success Whether the appeal succeeded.
     * @param beneficiary The address that received the escrowed funds.
     * @param amount The released escrow amount.
     * @param resolver The backend address that finalized the appeal.
     */
    event AppealResolved(
        uint256 indexed commitmentId,
        bool success,
        address indexed beneficiary,
        uint256 amount,
        address indexed resolver
    );

    /**
     * @notice Emitted when an unappealed failed commitment is finalized and paid to the failure receiver.
     * @param commitmentId The definitively failed commitment identifier.
     * @param failReceiver The address receiving the escrowed stake.
     * @param amount The released escrow amount.
     * @param resolver The backend address that finalized the failure.
     */
    event FailedCommitmentFinalized(
        uint256 indexed commitmentId,
        address indexed failReceiver,
        uint256 amount,
        address indexed resolver
    );

    /**
     * @notice Emitted whenever the owner rotates the backend address.
     * @param previousBackend The address that was previously authorized.
     * @param newBackend The newly authorized backend address.
     */
    event BackendUpdated(address indexed previousBackend, address indexed newBackend);

    /**
     * @notice Restricts a function so only the configured backend may call it.
     * @dev Backend resolution is kept off-chain so proof verification and business rules can evolve without contract upgrades.
     */
    modifier onlyBackend() {
        require(msg.sender == backend, "TimeLend: caller is not backend");
        _;
    }

    /**
     * @notice Initializes ownership and the immutable appeal window.
     * @param initialOwner The owner allowed to rotate backend access.
     * @param appealWindowInSeconds The number of seconds a user has to request the single appeal.
     * @dev The constructor intentionally does not set the backend so deployment and backend rotation remain separate operational steps.
     */
    constructor(address initialOwner, uint256 appealWindowInSeconds) Ownable(initialOwner) {
        require(initialOwner != address(0), "TimeLend: initial owner is zero address");
        require(appealWindowInSeconds > 0, "TimeLend: appeal window must be greater than zero");

        appealWindow = appealWindowInSeconds;
    }

    /**
     * @notice Rejects accidental direct transfers that are not linked to a commitment.
     * @dev All native token deposits must flow through createCommitment for accounting to stay correct.
     */
    receive() external payable {
        revert("TimeLend: direct payments are not allowed");
    }

    /**
     * @notice Rejects unexpected calls that do not match a valid function selector.
     * @dev This prevents accidental value transfers or silent fallback behavior.
     */
    fallback() external payable {
        revert("TimeLend: unknown function");
    }

    /**
     * @notice Prevents ownership from being renounced.
     * @dev Backend rotation is operationally critical, so leaving the contract ownerless would be unsafe.
     */
    function renounceOwnership() public view override onlyOwner {
        revert("TimeLend: renouncing ownership is disabled");
    }

    /**
     * @notice Sets the backend address authorized to resolve commitments and appeals.
     * @param newBackend The backend wallet that will execute resolution functions.
     * @dev Only the owner may rotate this role, and the backend may never be the zero address.
     */
    function setBackend(address newBackend) external onlyOwner {
        require(newBackend != address(0), "TimeLend: backend is zero address");

        address previousBackend = backend;
        backend = newBackend;

        emit BackendUpdated(previousBackend, newBackend);
    }

    /**
     * @notice Creates a new commitment and escrows the sent native tokens.
     * @param deadline The timestamp by which the commitment is expected to be fulfilled off-chain.
     * @param failReceiver The address that will receive the stake if failure becomes final.
     * @return commitmentId The newly created incremental identifier.
     * @dev The function is payable, requires a non-zero stake and rejects past deadlines or zero fail receivers.
     */
    function createCommitment(uint256 deadline, address failReceiver)
        external
        payable
        returns (uint256 commitmentId)
    {
        require(msg.value > 0, "TimeLend: stake amount must be greater than zero");
        require(deadline > block.timestamp, "TimeLend: deadline must be in the future");
        require(failReceiver != address(0), "TimeLend: fail receiver is zero address");
        require(
            failReceiver != msg.sender,
            "TimeLend: fail receiver must be different from commitment owner"
        );

        commitmentId = ++commitmentCount;

        commitments[commitmentId] = Commitment({
            user: msg.sender,
            amount: msg.value,
            deadline: deadline,
            failReceiver: failReceiver,
            status: Status.Active,
            appealed: false,
            payoutState: PayoutState.Escrowed,
            failureMarkedAt: 0,
            appealWindowEndsAt: 0
        });

        emit CommitmentCreated(commitmentId, msg.sender, msg.value, deadline, failReceiver);
    }

    /**
     * @notice Marks an active commitment as completed and pays the escrow back to the user.
     * @param commitmentId The identifier of the commitment being completed.
     * @dev Only the backend may call this function. Completion is allowed even after the deadline because the trusted backend may validate off-chain evidence retrospectively.
     */
    function markCompleted(uint256 commitmentId) external onlyBackend nonReentrant {
        Commitment storage commitment = _getExistingCommitment(commitmentId);

        require(commitment.status == Status.Active, "TimeLend: commitment is not active");
        require(
            commitment.payoutState == PayoutState.Escrowed,
            "TimeLend: commitment payout already released"
        );

        commitment.status = Status.Completed;
        commitment.payoutState = PayoutState.ReleasedToUser;

        _sendValue(commitment.user, commitment.amount);

        emit CommitmentCompleted(commitmentId, commitment.user, commitment.amount, msg.sender);
    }

    /**
     * @notice Marks an active commitment as failed and opens the appeal window.
     * @param commitmentId The identifier of the commitment being marked as failed.
     * @dev Funds intentionally remain in escrow at this step so a later successful appeal can still be honored without insolvency.
     */
    function markFailed(uint256 commitmentId) external onlyBackend {
        Commitment storage commitment = _getExistingCommitment(commitmentId);

        require(commitment.status == Status.Active, "TimeLend: commitment is not active");
        require(
            commitment.payoutState == PayoutState.Escrowed,
            "TimeLend: commitment payout already released"
        );

        commitment.status = Status.Failed;
        commitment.failureMarkedAt = block.timestamp;
        commitment.appealWindowEndsAt = block.timestamp + appealWindow;

        emit CommitmentFailed(
            commitmentId,
            commitment.user,
            commitment.failReceiver,
            commitment.amount,
            commitment.appealWindowEndsAt
        );
    }

    /**
     * @notice Marks an active commitment as definitively failed and immediately pays the fail receiver.
     * @param commitmentId The identifier of the commitment being marked as a clear final failure.
     * @dev This path is used when the off-chain decision is definitive and no appeal should be offered.
     */
    function markFailedFinal(uint256 commitmentId) external onlyBackend nonReentrant {
        Commitment storage commitment = _getExistingCommitment(commitmentId);

        require(commitment.status == Status.Active, "TimeLend: commitment is not active");
        require(
            commitment.payoutState == PayoutState.Escrowed,
            "TimeLend: commitment payout already released"
        );

        commitment.status = Status.Failed;
        commitment.failureMarkedAt = block.timestamp;
        commitment.appealWindowEndsAt = 0;
        commitment.payoutState = PayoutState.ReleasedToFailReceiver;

        _sendValue(commitment.failReceiver, commitment.amount);

        emit FailedCommitmentFinalized(
            commitmentId,
            commitment.failReceiver,
            commitment.amount,
            msg.sender
        );
    }

    /**
     * @notice Allows the commitment owner to request the single available appeal after a failure.
     * @param commitmentId The identifier of the failed commitment being appealed.
     * @dev Appeals are only valid while the appeal window is open and before any payout has been released.
     */
    function appeal(uint256 commitmentId) external {
        Commitment storage commitment = _getExistingCommitment(commitmentId);

        require(msg.sender == commitment.user, "TimeLend: caller is not commitment owner");
        require(commitment.status == Status.Failed, "TimeLend: commitment is not failed");
        require(!commitment.appealed, "TimeLend: appeal already used");
        require(
            commitment.payoutState == PayoutState.Escrowed,
            "TimeLend: commitment payout already released"
        );
        require(
            commitment.appealWindowEndsAt > 0,
            "TimeLend: appeal window is not initialized"
        );
        require(
            block.timestamp <= commitment.appealWindowEndsAt,
            "TimeLend: appeal window has closed"
        );

        commitment.appealed = true;

        emit AppealRequested(commitmentId, commitment.user, block.timestamp);
    }

    /**
     * @notice Resolves an appealed commitment and releases the escrow to the correct beneficiary.
     * @param commitmentId The identifier of the appealed commitment.
     * @param success Whether the appeal succeeded.
     * @dev Only the backend may call this function, and it may only be executed once while funds are still escrowed.
     */
    function resolveAppeal(uint256 commitmentId, bool success) external onlyBackend nonReentrant {
        Commitment storage commitment = _getExistingCommitment(commitmentId);

        require(commitment.status == Status.Failed, "TimeLend: commitment is not failed");
        require(commitment.appealed, "TimeLend: appeal has not been requested");
        require(
            commitment.payoutState == PayoutState.Escrowed,
            "TimeLend: commitment payout already released"
        );

        address beneficiary;

        if (success) {
            commitment.status = Status.Completed;
            commitment.payoutState = PayoutState.ReleasedToUser;
            beneficiary = commitment.user;
        } else {
            commitment.payoutState = PayoutState.ReleasedToFailReceiver;
            beneficiary = commitment.failReceiver;
        }

        _sendValue(beneficiary, commitment.amount);

        emit AppealResolved(commitmentId, success, beneficiary, commitment.amount, msg.sender);
    }

    /**
     * @notice Finalizes an unappealed failed commitment after the appeal window has expired.
     * @param commitmentId The identifier of the failed commitment being finalized.
     * @dev This extra settlement step is required so the contract can support real appeals without paying out failure funds too early.
     */
    function finalizeFailedCommitment(uint256 commitmentId)
        external
        onlyBackend
        nonReentrant
    {
        Commitment storage commitment = _getExistingCommitment(commitmentId);

        require(commitment.status == Status.Failed, "TimeLend: commitment is not failed");
        require(!commitment.appealed, "TimeLend: commitment is under appeal");
        require(
            commitment.payoutState == PayoutState.Escrowed,
            "TimeLend: commitment payout already released"
        );
        require(
            commitment.appealWindowEndsAt > 0,
            "TimeLend: appeal window is not initialized"
        );
        require(
            block.timestamp > commitment.appealWindowEndsAt,
            "TimeLend: appeal window is still open"
        );

        commitment.payoutState = PayoutState.ReleasedToFailReceiver;

        _sendValue(commitment.failReceiver, commitment.amount);

        emit FailedCommitmentFinalized(
            commitmentId,
            commitment.failReceiver,
            commitment.amount,
            msg.sender
        );
    }

    /**
     * @notice Returns the full commitment struct for an existing identifier.
     * @param commitmentId The identifier of the commitment being queried.
     * @return commitment The complete stored commitment record.
     * @dev This explicit getter is friendlier for ethers.js integrations than relying on the autogenerated tuple getter alone.
     */
    function getCommitment(uint256 commitmentId)
        external
        view
        returns (Commitment memory commitment)
    {
        commitment = _getExistingCommitment(commitmentId);
    }

    /**
     * @notice Returns whether a given commitment currently exists in storage.
     * @param commitmentId The identifier to inspect.
     * @return exists True when the commitment was created, otherwise false.
     * @dev This helper allows backend code to perform inexpensive existence checks.
     */
    function commitmentExists(uint256 commitmentId) external view returns (bool exists) {
        exists = commitments[commitmentId].user != address(0);
    }

    /**
     * @notice Returns whether the deadline timestamp has already passed for a commitment.
     * @param commitmentId The identifier of the commitment being queried.
     * @return expired True when the current block timestamp is strictly greater than the deadline.
     * @dev This helper is informative only; final resolution authority remains with the backend.
     */
    function isCommitmentExpired(uint256 commitmentId) external view returns (bool expired) {
        Commitment storage commitment = _getExistingCommitment(commitmentId);
        expired = block.timestamp > commitment.deadline;
    }

    /**
     * @notice Loads an existing commitment from storage or reverts if it does not exist.
     * @param commitmentId The identifier of the commitment to load.
     * @return commitment The storage reference for the existing commitment.
     * @dev Centralizing this check prevents inconsistent existence validation across state-changing functions.
     */
    function _getExistingCommitment(uint256 commitmentId)
        internal
        view
        returns (Commitment storage commitment)
    {
        commitment = commitments[commitmentId];
        require(commitment.user != address(0), "TimeLend: commitment does not exist");
    }

    /**
     * @notice Transfers native tokens to a beneficiary using a low-level call.
     * @param beneficiary The address receiving the funds.
     * @param amount The amount of native tokens to transfer.
     * @dev The function is isolated so payout behavior is easy to audit and kept behind the checks-effects-interactions pattern.
     */
    function _sendValue(address beneficiary, uint256 amount) internal {
        require(beneficiary != address(0), "TimeLend: beneficiary is zero address");

        (bool success,) = beneficiary.call{value: amount}("");
        require(success, "TimeLend: native token transfer failed");
    }
}
