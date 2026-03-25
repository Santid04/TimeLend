"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRightLeft,
  Bot,
  ChevronDown,
  FileText,
  Gavel,
  Loader2,
  MessageSquareText,
  UploadCloud,
  Wallet,
} from "lucide-react";
import { formatEther } from "viem";

import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateOnly } from "@/lib/commitment-utils";
import { formatCommitmentStatus, formatShortAddress } from "@/lib/utils";
import type { ApiCommitment, ApiEvidence, EvidenceSubmissionInput } from "@/types/frontend";

type CommitmentCardProps = {
  commitment: ApiCommitment;
  onAppeal: (commitment: ApiCommitment) => Promise<void>;
  onFinalize: (commitmentId: string) => Promise<void>;
  onResolveAppeal: (commitmentId: string) => Promise<void>;
  onUploadEvidence: (commitmentId: string, input: EvidenceSubmissionInput) => Promise<void>;
  onVerify: (commitmentId: string) => Promise<void>;
};

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

function getAppealEvidenceCutoff(commitment: ApiCommitment) {
  const appealRecordedEvent =
    commitment.events.find((event) => event.type === "APPEAL_RECORDED") ?? null;

  if (appealRecordedEvent === null) {
    return null;
  }

  return new Date(appealRecordedEvent.createdAt).getTime();
}

function getCommitmentSummaryStatus(commitment: ApiCommitment) {
  if (commitment.status === "COMPLETED") {
    return {
      label: "Completed",
      status: "COMPLETED" as const,
    };
  }

  if (commitment.status === "FAILED_FINAL") {
    return {
      label: "Failed",
      status: "FAILED_FINAL" as const,
    };
  }

  return {
    label: "Pending",
    status: "ACTIVE" as const,
  };
}

function DetailCard({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: typeof FileText;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-100">
          <Icon className="size-4" />
        </div>
        <p className="font-semibold text-white">{title}</p>
      </div>
      <div className="space-y-3 text-sm leading-6 text-slate-300/74">{children}</div>
    </div>
  );
}

export function CommitmentCard({
  commitment,
  onAppeal,
  onFinalize,
  onResolveAppeal,
  onUploadEvidence,
  onVerify,
}: CommitmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textEvidence, setTextEvidence] = useState("");
  const [cardMessage, setCardMessage] = useState<{ tone: "error" | "success"; value: string } | null>(
    null,
  );
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
          (evidence) => new Date(evidence.createdAt).getTime() > appealRecordedAt,
        ) ?? null;

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
        ? "Appeal is disabled because the failed verification was considered clear with confidence >= 0.6."
        : "Consume the appeal action to unlock new evidence submission for review."
      : isAppealEvidenceStage && latestAppealEvidence === null
        ? "Upload appeal evidence or provide more explicit proof. The appeal will resolve immediately after submission."
        : null;
  const evidenceLockMessage = isFinalState
    ? "Evidence is locked because this commitment already reached a final state."
    : commitment.isProcessing
      ? "Evidence is temporarily locked while this commitment is processing."
      : commitment.status === "FAILED_PENDING_APPEAL" && !commitment.appealed
        ? "Appeal this commitment first to unlock appeal evidence submission."
        : null;
  const summaryStatus = getCommitmentSummaryStatus(commitment);
  const expandableSectionId = `commitment-details-${commitment.id}`;

  async function runCardAction(label: string, action: () => Promise<void>) {
    setActiveAction(label);
    setCardMessage(null);

    try {
      await action();
      setCardMessage({
        tone: "success",
        value: `${label} completed.`,
      });
    } catch (error) {
      setCardMessage({
        tone: "error",
        value: error instanceof Error ? error.message : `${label} failed.`,
      });
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <motion.article
      className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(14,20,40,0.84),rgba(9,12,24,0.78))] shadow-[0_24px_80px_-36px_rgba(2,6,23,0.94)]"
      layout
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <button
        aria-controls={expandableSectionId}
        aria-expanded={isExpanded}
        className="group flex w-full flex-col gap-5 px-5 py-5 text-left transition-colors hover:bg-white/[0.03] sm:px-6"
        onClick={() => setIsExpanded((currentState) => !currentState)}
        type="button"
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Commitment #{commitment.onchainId}</Badge>
              <Badge variant="outline">{commitment.appealed ? "Appealed flow" : "Standard flow"}</Badge>
              {commitment.isProcessing ? <Badge variant="default">Processing</Badge> : null}
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl font-semibold tracking-tight text-white">
                {commitment.title}
              </h3>
              <p className="text-sm leading-6 text-slate-300/72">
                Deadline {formatDateOnly(commitment.deadline)}. Evidence {commitment.evidences.length}.
                Latest verification {latestVerification ? "available" : "pending"}.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Stake
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                {formatEther(BigInt(commitment.amount))} AVAX
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
                State
              </p>
              <div className="mt-2 flex items-center gap-3">
                <StatusBadge label={summaryStatus.label} status={summaryStatus.status} />
                <Badge variant="outline">{formatCommitmentStatus(commitment.status)}</Badge>
              </div>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-300 transition-transform group-hover:border-white/16 group-hover:text-white">
              <ChevronDown className={`size-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            id={expandableSectionId}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className="border-t border-white/8 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Deadline</p>
                  <p className="mt-2 text-base font-semibold text-white">{formatDateOnly(commitment.deadline)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300/72">
                    Appeal window: {formatDateOnly(commitment.appealWindowEndsAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Evidence</p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {commitment.evidences.length} entries
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300/72">
                    Latest: {describeEvidenceEntry(latestEvidence)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Fail receiver</p>
                  <p className="mt-2 break-all text-base font-semibold text-white">
                    {formatShortAddress(commitment.failReceiver, 8, 5)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300/72">
                    Full address available in the detail panel below.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Current status</p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {commitment.isProcessing ? "Processing" : formatCommitmentStatus(commitment.status)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300/72">
                    Updated {formatDateOnly(commitment.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="space-y-5">
                  <DetailCard icon={FileText} title="Description">
                    <p className="whitespace-pre-wrap">{commitment.description}</p>
                  </DetailCard>

                  <DetailCard icon={Bot} title="Latest verification">
                    {latestVerification !== null ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={latestVerification.result ? "success" : "destructive"}>
                            {latestVerification.result ? "Success" : "Fail"}
                          </Badge>
                          <Badge variant="outline">
                            Confidence {latestVerification.confidence.toFixed(2)}
                          </Badge>
                          <Badge variant="secondary">{latestVerification.type}</Badge>
                        </div>
                        <p>{latestVerification.reasoning}</p>
                      </>
                    ) : (
                      <p>No verification has been stored for this commitment yet.</p>
                    )}
                  </DetailCard>

                  <DetailCard
                    icon={isAppealEvidenceStage ? MessageSquareText : UploadCloud}
                    title={isAppealEvidenceStage ? "Appeal evidence" : "Submitted evidence"}
                  >
                    {latestEvidence === null ? (
                      <p>No submitted evidence has been stored for this commitment yet.</p>
                    ) : (
                      <>
                        <p>Latest entry: {describeEvidenceEntry(latestEvidence)}</p>
                        {latestEvidence.originalFileName !== null ? (
                          <p>File: {latestEvidence.originalFileName}</p>
                        ) : null}
                        {latestEvidence.submittedText !== null &&
                        latestEvidence.submittedText.trim().length > 0 ? (
                          <p className="whitespace-pre-wrap">{latestEvidence.submittedText}</p>
                        ) : null}
                      </>
                    )}
                  </DetailCard>

                  {appealHint !== null ? (
                    <div className="rounded-2xl border border-amber-300/16 bg-amber-400/[0.08] p-5">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-400/12 text-amber-100">
                          <AlertTriangle className="size-4" />
                        </div>
                        <p className="font-semibold text-amber-50">
                          {isAppealEvidenceStage ? "Appeal evidence" : "Appeal policy"}
                        </p>
                      </div>
                      <p className="text-sm leading-6 text-amber-50/84">{appealHint}</p>
                    </div>
                  ) : null}

                  {canSubmitEvidence ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                      <div className="mb-5 flex items-start gap-3">
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-100">
                          <UploadCloud className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">
                            {isAppealEvidenceStage ? "Submit appeal evidence" : "Submit evidence"}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-300/72">
                            {isAppealEvidenceStage
                              ? "Upload fresh evidence or written proof. Submission triggers the appeal review immediately."
                              : "Upload a file, add written proof, or combine both before verification."}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <label className="grid gap-2">
                          <span className="text-sm font-medium text-slate-200">
                            {isAppealEvidenceStage ? "Appeal file" : "Evidence file"}
                          </span>
                          <Input
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

                        <label className="grid gap-2">
                          <span className="text-sm font-medium text-slate-200">
                            {isAppealEvidenceStage ? "Appeal explanation" : "Written evidence"}
                          </span>
                          <Textarea
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

                        <div className="flex flex-wrap gap-3">
                          <Button
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
                                    textEvidence: trimmedTextEvidence,
                                  });

                                  if (isAppealEvidenceStage) {
                                    await onResolveAppeal(commitment.id);
                                  }

                                  setSelectedFile(null);
                                  setTextEvidence("");
                                  setFileInputKey((currentKey) => currentKey + 1);
                                },
                              )
                            }
                            type="button"
                          >
                            {activeAction === "Evidence upload" || activeAction === "Appeal evidence upload" ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <UploadCloud />
                            )}
                            {activeAction === "Evidence upload" || activeAction === "Appeal evidence upload"
                              ? "Uploading..."
                              : isAppealEvidenceStage
                                ? "Submit appeal evidence"
                                : "Submit evidence"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : evidenceLockMessage !== null ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-100">
                          <UploadCloud className="size-4" />
                        </div>
                        <p className="font-semibold text-white">
                          {isAppealEvidenceStage ? "Appeal evidence" : "Evidence"}
                        </p>
                      </div>
                      <p className="text-sm leading-6 text-slate-300/72">{evidenceLockMessage}</p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="mb-5 flex items-start gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-400/12 text-indigo-100">
                        <Gavel className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Action center</p>
                        <p className="mt-1 text-sm leading-6 text-slate-300/72">
                          Every button below keeps the same backend and contract behavior currently wired
                          into the app.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <Button
                        className="w-full justify-start"
                        disabled={!canVerify || activeAction !== null}
                        onClick={() => void runCardAction("Verification", () => onVerify(commitment.id))}
                        size="lg"
                        type="button"
                      >
                        {activeAction === "Verification" ? <Loader2 className="animate-spin" /> : <Bot />}
                        {activeAction === "Verification" ? "Queueing..." : "Verify commitment"}
                      </Button>

                      <Button
                        className="w-full justify-start"
                        disabled={!canAppeal || activeAction !== null}
                        onClick={() => void runCardAction("Appeal", () => onAppeal(commitment))}
                        size="lg"
                        type="button"
                        variant="warning"
                      >
                        {activeAction === "Appeal" ? <Loader2 className="animate-spin" /> : <ArrowRightLeft />}
                        {activeAction === "Appeal" ? "Appealing..." : "Open appeal"}
                      </Button>

                      <Button
                        className="w-full justify-start"
                        disabled={!canResolveAppeal || activeAction !== null}
                        onClick={() =>
                          void runCardAction("Appeal resolution", () => onResolveAppeal(commitment.id))
                        }
                        size="lg"
                        type="button"
                        variant="secondary"
                      >
                        {activeAction === "Appeal resolution" ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <MessageSquareText />
                        )}
                        {activeAction === "Appeal resolution" ? "Queueing..." : "Resolve appeal"}
                      </Button>

                      <Button
                        className="w-full justify-start"
                        disabled={!canFinalize || activeAction !== null}
                        onClick={() =>
                          void runCardAction("Failed finalization", () => onFinalize(commitment.id))
                        }
                        size="lg"
                        type="button"
                        variant="destructive"
                      >
                        {activeAction === "Failed finalization" ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <AlertTriangle />
                        )}
                        {activeAction === "Failed finalization" ? "Finalizing..." : "Finalize failed"}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-100">
                        <Wallet className="size-4" />
                      </div>
                      <p className="font-semibold text-white">Commitment metadata</p>
                    </div>

                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">On-chain id</p>
                        <p className="mt-2 font-semibold text-white">{commitment.onchainId}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Owner</p>
                        <p className="mt-2 break-all font-semibold text-white">
                          {formatShortAddress(commitment.userWalletAddress, 8, 5)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Fail receiver</p>
                        <p className="mt-2 break-all font-semibold text-white">{commitment.failReceiver}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Last update</p>
                        <p className="mt-2 font-semibold text-white">{formatDateOnly(commitment.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  {cardMessage !== null ? (
                    <div
                      className={`rounded-2xl p-4 text-sm ${
                        cardMessage.tone === "success"
                          ? "border border-emerald-300/18 bg-emerald-400/[0.08] text-emerald-100"
                          : "border border-rose-300/18 bg-rose-400/[0.08] text-rose-100"
                      }`}
                    >
                      {cardMessage.value}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}
