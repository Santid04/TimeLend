/**
 * This file renders the full functional demo workbench for TimeLend.
 * It exists to replace the placeholder landing page with an end-to-end testing UI.
 * It fits the system by exposing wallet auth, contract creation and backend flows in one place.
 */
"use client";

import { useState } from "react";

import { CommitmentCard } from "@/components/commitment-card";
import { CommitmentCreateForm } from "@/components/commitment-create-form";
import { WalletSessionPanel } from "@/components/wallet-session-panel";
import {
  buildDeadlineFromDateOnly,
  getFailReceiverValidationError,
  resolveEffectiveFailReceiver,
} from "@/lib/commitment-utils";
import { getFrontendRuntimeConfig } from "@/lib/env";
import { useCommitmentsDashboard } from "@/hooks/use-commitments-dashboard";
import { useTimeLendWalletActions } from "@/hooks/use-timelend-wallet-actions";
import { useWalletSession } from "@/hooks/use-wallet-session";
import {
  createCommitmentRecord,
  finalizeFailedDemo,
  recordAppeal,
  resolveAppealDemo,
  uploadEvidence,
  verifyCommitmentRequest,
} from "@/services/timelend-api";
import type {
  ApiCommitment,
  CreateCommitmentFormValues,
  EvidenceSubmissionInput,
} from "@/types/frontend";

/**
 * This component renders the single-page demo workbench used to test the full system.
 * It receives no props because all state comes from hooks and runtime config.
 * It returns the main functional frontend UI.
 * It is important because the project now needs a practical operator-facing demo instead of a placeholder landing page.
 */
export function DemoWorkbench() {
  const runtimeConfig = getFrontendRuntimeConfig();
  const {
    address,
    authenticateWallet,
    connectWallet,
    connectorName,
    disconnectWallet,
    isAuthenticated,
    isAuthenticating,
    isConnected,
    isConnecting,
    isOnSupportedChain,
    session,
    sessionError,
    switchToSupportedChain,
  } = useWalletSession();
  const { appealCommitmentWithWallet, createCommitmentWithWallet, walletReady } =
    useTimeLendWalletActions();
  const { commitments, dashboardError, initialLoadComplete, isRefreshing, refreshCommitments } =
    useCommitmentsDashboard(session, isAuthenticated ? address : undefined);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  /**
   * This function creates the commitment on-chain and then persists its metadata in the backend.
   * It receives the controlled create-form values.
   * It returns a promise that resolves after both the chain transaction and backend sync finish.
   * It is important because the demo must test the real split responsibility between contract and backend.
   */
  async function handleCreateCommitment(values: CreateCommitmentFormValues) {
    if (!isAuthenticated || session === null || address === undefined) {
      throw new Error("Connect and authenticate a wallet before creating commitments.");
    }

    if (!isOnSupportedChain) {
      throw new Error("Switch the wallet to Avalanche Fuji before creating commitments.");
    }

    if (!walletReady) {
      throw new Error("Wallet client is still initializing.");
    }

    setIsCreating(true);
    setCreateError(null);
    setPageMessage(null);

    try {
      const failReceiverError = getFailReceiverValidationError({
        failReceiver: values.failReceiver,
        useWebOwnerWallet: values.useWebOwnerWallet,
        walletAddress: address,
      });

      if (failReceiverError !== null) {
        throw new Error(failReceiverError);
      }

      const effectiveFailReceiver = resolveEffectiveFailReceiver({
        failReceiver: values.failReceiver,
        useWebOwnerWallet: values.useWebOwnerWallet,
      });
      const deadline = buildDeadlineFromDateOnly(values.deadlineDate);
      const onChainCommitment = await createCommitmentWithWallet({
        amountAvax: values.amountAvax,
        deadlineUnix: deadline.unix,
        failReceiver: effectiveFailReceiver,
        walletAddress: address,
      });

      await createCommitmentRecord(session.token, {
        amount: onChainCommitment.amountWei,
        createCommitmentTxHash: onChainCommitment.txHash,
        deadline: deadline.iso,
        description: values.description.trim(),
        failReceiver: effectiveFailReceiver,
        onchainId: onChainCommitment.onchainId,
        title: values.title.trim(),
      });

      setPageMessage(
        `Commitment created successfully. On-chain id: ${onChainCommitment.onchainId}. Fail receiver: ${effectiveFailReceiver}.`,
      );
      await refreshCommitments();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create the commitment.";
      setCreateError(message);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }

  /**
   * This function uploads one evidence file for the selected commitment and refreshes the dashboard.
   * It receives the off-chain commitment id and the browser file selected by the user.
   * It returns a promise that resolves after the backend stores and parses the evidence.
   * It is important because evidence ingestion is the entry point to AI verification.
   */
  async function handleUploadEvidence(commitmentId: string, input: EvidenceSubmissionInput) {
    if (session === null) {
      throw new Error("Authenticate before uploading evidence.");
    }

    await uploadEvidence(session.token, commitmentId, input);
    await refreshCommitments();
  }

  /**
   * This function queues backend verification for the selected commitment and refreshes the dashboard.
   * It receives the off-chain commitment id.
   * It returns a promise that resolves after the queue request is accepted.
   * It is important because verification moves the commitment into completed or failed-pending-appeal asynchronously.
   */
  async function handleVerify(commitmentId: string) {
    if (session === null) {
      throw new Error("Authenticate before verifying commitments.");
    }

    const response = await verifyCommitmentRequest(session.token, commitmentId);
    setPageMessage(response.message);
    await refreshCommitments();
  }

  /**
   * This function consumes the on-chain appeal with the wallet and then records it in the backend.
   * It receives the hydrated commitment aggregate selected for appeal.
   * It returns a promise that resolves after both the chain and backend steps finish.
   * It is important because the current backend only accepts appeals that were first registered on-chain by the user.
   */
  async function handleAppeal(commitment: ApiCommitment) {
    if (session === null || address === undefined) {
      throw new Error("Authenticate a wallet before appealing.");
    }

    if (!isOnSupportedChain) {
      throw new Error("Switch to Avalanche Fuji before appealing.");
    }

    const appealTxHash = await appealCommitmentWithWallet(address, commitment.onchainId);
    await recordAppeal(session.token, commitment.id, appealTxHash);
    setPageMessage(`Appeal recorded for commitment ${commitment.onchainId}.`);
    await refreshCommitments();
  }

  /**
   * This function triggers the internal demo appeal-resolution proxy and refreshes the dashboard.
   * It receives the off-chain commitment id.
   * It returns a promise that resolves after the internal route accepts the request.
   * It is important because demo users need a simple way to exercise the internal resolution path.
   */
  async function handleResolveAppeal(commitmentId: string) {
    const response = await resolveAppealDemo(commitmentId);
    setPageMessage(response.message);
    await refreshCommitments();
  }

  /**
   * This function triggers the internal demo finalization proxy for unappealed failed commitments.
   * It receives the off-chain commitment id.
   * It returns a promise that resolves after the backend finalizes or rejects the action.
   * It is important because the demo should expose the full failure settlement flow as well.
   */
  async function handleFinalize(commitmentId: string) {
    await finalizeFailedDemo(commitmentId);
    setPageMessage("Failed commitment finalization requested.");
    await refreshCommitments();
  }

  return (
    <main className="demo-shell">
      <section className="hero-strip">
        <div>
          <p className="section-label">TimeLend Demo</p>
          <h1>Functional frontend for end-to-end testing</h1>
          <p className="hero-copy">
            This screen lets you connect a wallet, create the escrow on-chain, sync the backend
            record, upload evidence and drive the full verification flow.
          </p>
        </div>
      </section>

      <WalletSessionPanel
        address={address}
        connectorName={connectorName}
        isAuthenticated={isAuthenticated}
        isAuthenticating={isAuthenticating}
        isConnected={isConnected}
        isConnecting={isConnecting}
        isOnSupportedChain={isOnSupportedChain}
        onAuthenticate={authenticateWallet}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        onSwitchChain={switchToSupportedChain}
        sessionError={sessionError}
      />

      <CommitmentCreateForm
        canSubmit={isAuthenticated && isOnSupportedChain && walletReady}
        isSubmitting={isCreating}
        onSubmit={handleCreateCommitment}
        userWalletAddress={address}
      />

      {createError !== null ? <p className="feedback feedback-error">{createError}</p> : null}
      {pageMessage !== null ? <p className="feedback feedback-success">{pageMessage}</p> : null}
      {dashboardError !== null ? <p className="feedback feedback-error">{dashboardError}</p> : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Dashboard</p>
            <h2 className="section-title">Your commitments</h2>
          </div>

          <button
            className="button button-secondary"
            disabled={!isAuthenticated || isRefreshing}
            onClick={() => void refreshCommitments()}
            type="button"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {!initialLoadComplete ? (
          <p className="empty-state">Loading dashboard...</p>
        ) : !isAuthenticated ? (
          <p className="empty-state">Connect a wallet and authenticate to load your commitments.</p>
        ) : commitments.length === 0 ? (
          <p className="empty-state">No commitments found yet for this wallet.</p>
        ) : (
          <div className="commitment-list">
            {commitments.map((commitment) => (
              <CommitmentCard
                commitment={commitment}
                key={commitment.id}
                onAppeal={handleAppeal}
                onFinalize={handleFinalize}
                onResolveAppeal={handleResolveAppeal}
                onUploadEvidence={handleUploadEvidence}
                onVerify={handleVerify}
              />
            ))}
          </div>
        )}
      </section>

      <p className="secondary-meta">
        Contract: <span>{runtimeConfig.NEXT_PUBLIC_CONTRACT_ADDRESS}</span>
      </p>
    </main>
  );
}
