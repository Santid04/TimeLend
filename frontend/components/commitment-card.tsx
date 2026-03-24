/**
 * This file renders one commitment card inside the demo dashboard.
 * It exists to keep evidence, verification and action controls scoped to a single commitment.
 * It fits the system by making the dashboard clear to use during end-to-end testing.
 */
"use client";

import { useState } from "react";
import { formatEther } from "viem";

import { formatDateOnly } from "@/lib/commitment-utils";
import type { ApiCommitment, ApiEvidence, EvidenceSubmissionInput } from "@/types/frontend";

type CommitmentCardProps = {
  commitment: ApiCommitment;
  onAppeal: (commitment: ApiCommitment) => Promise<void>;
  onFinalize: (commitmentId: string) => Promise<void>;
  onResolveAppeal: (commitmentId: string) => Promise<void>;
  onUploadEvidence: (commitmentId: string, input: EvidenceSubmissionInput) => Promise<void>;
  onVerify: (commitmentId: string) => Promise<void>;
};

/**
 * This function formats the latest evidence entry into a short UI label.
 * It receives the latest evidence payload returned by the backend.
 * It returns a compact description of whether the entry contains a file, written evidence or both.
 * It is important because the evidence area now supports more than file uploads.
 */
function describeEvidenceEntry(evidence: ApiEvidence | null) {
  if (evidence === null) {
    return "None submitted yet";
  }

  const hasFile = evidence.originalFileName !== null;
  const hasWrittenEvidence = evidence.submittedText !== null && evidence.submittedText.length > 0;

  if (hasFile && hasWrittenEvidence) {
    return `${evidence.originalFileName} + written evidence`;
  }

  if (hasFile) {
    return evidence.originalFileName ?? "File evidence";
  }

  if (hasWrittenEvidence) {
    return "Written evidence";
  }

  return "Evidence submitted";
}

/**
 * This function returns the timestamp after which appeal evidence should be considered new.
 * It receives the hydrated commitment aggregate shown in the card.
 * It returns the appeal cutoff timestamp in milliseconds or null when the appeal event is still unavailable.
 * It is important because appeal evidence must now be newer than the recorded appeal event itself.
 */
function getAppealEvidenceCutoff(commitment: ApiCommitment) {
  const appealRecordedEvent =
    commitment.events.find((event) => event.type === "APPEAL_RECORDED") ?? null;

  if (appealRecordedEvent === null) {
    return null;
  }

  return new Date(appealRecordedEvent.createdAt).getTime();
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
  const [textEvidence, setTextEvidence] = useState("");
  const [cardMessage, setCardMessage] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const latestVerification = commitment.verifications[0] ?? null;
  const latestEvidence = commitment.evidences[0] ?? null;
  const latestInitialVerification =
    commitment.verifications.find((verification) => verification.type === "INITIAL") ?? null;
  const appealRecordedAt = getAppealEvidenceCutoff(commitment);
  const latestAppealEvidence =
    appealRecordedAt === null
      ? null
      : commitment.evidences.find(
          (evidence) => new Date(evidence.createdAt).getTime() > appealRecordedAt
        ) ?? null;

  /*
   * This block derives appeal eligibility and evidence-stage behavior from verification history and status.
   * It is important because appeal evidence now starts after the user consumes the on-chain appeal path.
   */
  const appealAllowedByConfidence =
    latestInitialVerification !== null &&
    !latestInitialVerification.result &&
    latestInitialVerification.confidence < 0.6;
  const canSubmitEvidence =
    !commitment.isProcessing &&
    (commitment.status === "ACTIVE" ||
      (commitment.status === "FAILED_PENDING_APPEAL" && commitment.appealed));
  const isAppealEvidenceStage =
    commitment.status === "FAILED_PENDING_APPEAL" && commitment.appealed;
  const isFinalState =
    commitment.status === "COMPLETED" || commitment.status === "FAILED_FINAL";
  const canVerify =
    commitment.status === "ACTIVE" &&
    !commitment.isProcessing &&
    commitment.evidences.length > 0;
  const canAppeal =
    commitment.status === "FAILED_PENDING_APPEAL" &&
    !commitment.appealed &&
    !commitment.isProcessing &&
    appealAllowedByConfidence;
  const canResolveAppeal =
    commitment.status === "FAILED_PENDING_APPEAL" &&
    commitment.appealed &&
    !commitment.isProcessing &&
    latestAppealEvidence !== null;
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
        : "Click appeal to unlock appeal evidence submission."
      : isAppealEvidenceStage && latestAppealEvidence === null
        ? "Upload appeal evidence or provide more explicit proof. Submitting it will trigger the final appeal review."
        : null;
  const evidenceLockMessage = isFinalState
    ? "Evidence is locked because this commitment already reached a final state."
    : commitment.isProcessing
      ? "Evidence is temporarily locked while this commitment is processing."
      : commitment.status === "FAILED_PENDING_APPEAL" && !commitment.appealed
        ? "Appeal this commitment first to unlock appeal evidence submission."
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
          <strong>{formatDateOnly(commitment.deadline)}</strong>
          <small>Appeal window ends: {formatDateOnly(commitment.appealWindowEndsAt)}</small>
        </div>

        <div className="stat-box">
          <span>Evidence</span>
          <strong>{commitment.evidences.length} entries</strong>
          <small>Latest: {describeEvidenceEntry(latestEvidence)}</small>
        </div>

        <div className="stat-box">
          <span>Fail receiver</span>
          <strong>{commitment.failReceiver}</strong>
          <small>Payout only happens after final on-chain settlement.</small>
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
          <strong>{isAppealEvidenceStage ? "Appeal evidence" : "Appeal policy"}</strong>
          <p>{appealHint}</p>
        </div>
      ) : null}

      {canSubmitEvidence ? (
        <div className="detail-box">
          <strong>{isAppealEvidenceStage ? "Appeal evidence" : "Evidence submission"}</strong>
          <p>
            {isAppealEvidenceStage
              ? "Upload appeal evidence or provide more explicit proof. The backend will resolve the appeal right after submission."
              : "Submit a file, written evidence, or both before verification."}
          </p>

          <div className="evidence-form">
            <label className="field evidence-field">
              <span>{isAppealEvidenceStage ? "Appeal file" : "Upload file"}</span>
              <input
                accept=".pdf,.txt,text/plain,application/pdf"
                disabled={activeAction !== null}
                key={fileInputKey}
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setSelectedFile(nextFile);
                }}
                type="file"
              />
            </label>

            <label className="field field-wide">
              <span>{isAppealEvidenceStage ? "Write your appeal evidence" : "Write your evidence"}</span>
              <textarea
                disabled={activeAction !== null}
                onChange={(event) => setTextEvidence(event.target.value)}
                placeholder={
                  isAppealEvidenceStage
                    ? "Explain why the previous failure should be reconsidered."
                    : "Describe the proof you want the verifier to consider."
                }
                rows={4}
                value={textEvidence}
              />
            </label>

            <div className="form-actions">
              <button
                className="button button-secondary"
                disabled={
                  activeAction !== null ||
                  (selectedFile === null && textEvidence.trim().length === 0)
                }
                onClick={() =>
                  void runCardAction(
                    isAppealEvidenceStage ? "Appeal evidence upload" : "Evidence upload",
                    async () => {
                      const trimmedTextEvidence = textEvidence.trim();

                      if (selectedFile === null && trimmedTextEvidence.length === 0) {
                        throw new Error("Provide a file, written evidence, or both.");
                      }

                      await onUploadEvidence(commitment.id, {
                        file: selectedFile,
                        textEvidence: trimmedTextEvidence
                      });

                      if (isAppealEvidenceStage) {
                        await onResolveAppeal(commitment.id);
                      }

                      setSelectedFile(null);
                      setTextEvidence("");
                      setFileInputKey((currentKey) => currentKey + 1);
                    }
                  )
                }
                type="button"
              >
                {activeAction === "Evidence upload" || activeAction === "Appeal evidence upload"
                  ? "Uploading..."
                  : isAppealEvidenceStage
                    ? "Submit appeal evidence"
                    : "Submit evidence"}
              </button>
            </div>
          </div>
        </div>
      ) : evidenceLockMessage !== null ? (
        <div className="detail-box">
          <strong>{isAppealEvidenceStage ? "Appeal evidence" : "Evidence"}</strong>
          <p>{evidenceLockMessage}</p>
        </div>
      ) : null}

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
