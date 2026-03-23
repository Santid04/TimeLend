/**
 * This file renders one commitment card inside the demo dashboard.
 * It exists to keep evidence, verification and action controls scoped to a single commitment.
 * It fits the system by making the dashboard clear to use during end-to-end testing.
 */
"use client";

import { formatEther } from "viem";
import { useState } from "react";

import type { ApiCommitment } from "@/types/frontend";

type CommitmentCardProps = {
  commitment: ApiCommitment;
  onAppeal: (commitment: ApiCommitment) => Promise<void>;
  onFinalize: (commitmentId: string) => Promise<void>;
  onResolveAppeal: (commitmentId: string) => Promise<void>;
  onUploadEvidence: (commitmentId: string, file: File) => Promise<void>;
  onVerify: (commitmentId: string) => Promise<void>;
};

/**
 * This function formats a raw ISO date string into a readable local label.
 * It receives the optional ISO string returned by the backend.
 * It returns a human-friendly string or a fallback dash.
 * It is important because most dashboard timestamps come from async backend and on-chain state transitions.
 */
function formatDate(dateValue: string | null) {
  if (dateValue === null) {
    return "—";
  }

  return new Date(dateValue).toLocaleString();
}

/**
 * This component renders the full demo controls and latest state for one commitment.
 * It receives the hydrated commitment aggregate and the action handlers owned by the parent screen.
 * It returns the card UI used in the dashboard list.
 * It is important because the demo flow is easiest to understand when every commitment exposes its own controls.
 */
export function CommitmentCard({
  commitment,
  onAppeal,
  onFinalize,
  onResolveAppeal,
  onUploadEvidence,
  onVerify
}: CommitmentCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cardMessage, setCardMessage] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const latestVerification = commitment.verifications[0] ?? null;
  const latestEvidence = commitment.evidences[0] ?? null;
  const latestInitialVerification =
    commitment.verifications.find((verification) => verification.type === "INITIAL") ?? null;

  /*
   * This block derives appeal eligibility from the latest failed initial verification and the evidence timeline.
   * It is important because the demo should not let the user consume the on-chain appeal path when backend policy would reject it.
   */
  const appealAllowedByConfidence =
    latestInitialVerification !== null &&
    !latestInitialVerification.result &&
    latestInitialVerification.confidence < 0.6;
  const hasNewEvidenceForAppeal =
    latestInitialVerification !== null &&
    commitment.evidences.some(
      (evidence) =>
        evidence.id !== latestInitialVerification.evidenceId &&
        new Date(evidence.createdAt).getTime() >
          new Date(latestInitialVerification.createdAt).getTime()
    );
  const canVerify = commitment.status === "ACTIVE" && !commitment.isProcessing;
  const canAppeal =
    commitment.status === "FAILED_PENDING_APPEAL" &&
    !commitment.appealed &&
    !commitment.isProcessing &&
    appealAllowedByConfidence &&
    hasNewEvidenceForAppeal;
  const canResolveAppeal =
    commitment.status === "FAILED_PENDING_APPEAL" &&
    commitment.appealed &&
    !commitment.isProcessing;
  const canFinalize =
    commitment.status === "FAILED_PENDING_APPEAL" &&
    !commitment.appealed &&
    !commitment.isProcessing &&
    commitment.appealWindowEndsAt !== null &&
    new Date(commitment.appealWindowEndsAt).getTime() <= Date.now();
  const appealHint =
    commitment.status === "FAILED_PENDING_APPEAL" && !commitment.appealed
      ? !appealAllowedByConfidence
        ? "Appeal disabled because the failed verification was considered clear (confidence >= 0.6)."
        : !hasNewEvidenceForAppeal
          ? "Upload new evidence after the failed verification to enable appeal."
          : null
      : null;

  /**
   * This function runs one card action and maps any thrown error into local UI feedback.
   * It receives a stable action label plus the async action callback to execute.
   * It returns a promise that resolves after local loading and feedback state is updated.
   * It is important because each commitment card can trigger several independent backend and contract actions.
   */
  async function runCardAction(label: string, action: () => Promise<void>) {
    setActiveAction(label);
    setCardMessage(null);

    try {
      await action();
      setCardMessage(`${label} completed.`);
    } catch (error) {
      setCardMessage(error instanceof Error ? error.message : `${label} failed.`);
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <article className="commitment-card">
      <div className="commitment-card-header">
        <div>
          <p className="section-label">{commitment.title}</p>
          <h3>{commitment.description}</h3>
        </div>
        <span className={`status-badge status-${commitment.status.toLowerCase()}`}>
          {commitment.isProcessing ? "PROCESSING" : commitment.status}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <span>Amount</span>
          <strong>{formatEther(BigInt(commitment.amount))} AVAX</strong>
          <small>On-chain id: {commitment.onchainId}</small>
        </div>

        <div className="stat-box">
          <span>Deadline</span>
          <strong>{formatDate(commitment.deadline)}</strong>
          <small>Appeal window ends: {formatDate(commitment.appealWindowEndsAt)}</small>
        </div>

        <div className="stat-box">
          <span>Evidence</span>
          <strong>{commitment.evidences.length} files</strong>
          <small>Latest: {latestEvidence?.originalFileName ?? "None uploaded yet"}</small>
        </div>
      </div>

      {latestVerification !== null ? (
        <div className="detail-box">
          <strong>Latest verification</strong>
          <p>
            Result: {latestVerification.result ? "success" : "fail"} | Confidence:{" "}
            {latestVerification.confidence}
          </p>
          <p>{latestVerification.reasoning}</p>
        </div>
      ) : (
        <div className="detail-box">
          <strong>Latest verification</strong>
          <p>No verification has been stored for this commitment yet.</p>
        </div>
      )}

      {appealHint !== null ? (
        <div className="detail-box">
          <strong>Appeal policy</strong>
          <p>{appealHint}</p>
        </div>
      ) : null}

      <div className="evidence-row">
        <input
          accept=".pdf,.txt,text/plain,application/pdf"
          onChange={(event) => {
            const nextFile = event.target.files?.[0] ?? null;
            setSelectedFile(nextFile);
          }}
          type="file"
        />
        <button
          className="button button-secondary"
          disabled={selectedFile === null || activeAction !== null}
          onClick={() =>
            void runCardAction("Evidence upload", async () => {
              if (selectedFile === null) {
                throw new Error("Choose a TXT or PDF file first.");
              }

              await onUploadEvidence(commitment.id, selectedFile);
              setSelectedFile(null);
            })
          }
          type="button"
        >
          {activeAction === "Evidence upload" ? "Uploading..." : "Upload evidence"}
        </button>
      </div>

      <div className="button-row">
        <button
          className="button button-primary"
          disabled={!canVerify || activeAction !== null}
          onClick={() => void runCardAction("Verification", () => onVerify(commitment.id))}
          type="button"
        >
          {activeAction === "Verification" ? "Queueing..." : "Verify"}
        </button>

        <button
          className="button button-warning"
          disabled={!canAppeal || activeAction !== null}
          onClick={() => void runCardAction("Appeal", () => onAppeal(commitment))}
          type="button"
        >
          {activeAction === "Appeal" ? "Appealing..." : "Appeal"}
        </button>

        <button
          className="button button-secondary"
          disabled={!canResolveAppeal || activeAction !== null}
          onClick={() =>
            void runCardAction("Appeal resolution", () => onResolveAppeal(commitment.id))
          }
          type="button"
        >
          {activeAction === "Appeal resolution" ? "Queueing..." : "Resolve appeal"}
        </button>

        <button
          className="button button-secondary"
          disabled={!canFinalize || activeAction !== null}
          onClick={() => void runCardAction("Failed finalization", () => onFinalize(commitment.id))}
          type="button"
        >
          {activeAction === "Failed finalization" ? "Finalizing..." : "Finalize failed"}
        </button>
      </div>

      {cardMessage !== null ? <p className="feedback">{cardMessage}</p> : null}
    </article>
  );
}
