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
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatDateOnly } from "@/lib/commitment-utils";
import { formatShortAddress } from "@/lib/utils";
import type { ApiCommitment, ApiEvidence, EvidenceSubmissionInput } from "@/types/frontend";

type CardActionKey =
  | "actionAppeal"
  | "actionAppealEvidenceUpload"
  | "actionAppealResolution"
  | "actionEvidenceUpload"
  | "actionFailedFinalization"
  | "actionVerification";

type CardMessage =
  | {
      tone: "error";
      type: "raw";
      value: string;
    }
  | {
      actionKey: CardActionKey;
      messageKey: "actionCompleted" | "actionFailed";
      tone: "error" | "success";
      type: "action";
    };

type CommitmentCardProps = {
  commitment: ApiCommitment;
  onAppeal: (commitment: ApiCommitment) => Promise<void>;
  onFinalize: (commitmentId: string) => Promise<void>;
  onResolveAppeal: (commitmentId: string) => Promise<void>;
  onUploadEvidence: (commitmentId: string, input: EvidenceSubmissionInput) => Promise<void>;
  onVerify: (commitmentId: string) => Promise<void>;
};

function describeEvidenceEntry(
  evidence: ApiEvidence | null,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (evidence === null) {
    return t("noneSubmittedYet");
  }

  const hasFile = evidence.originalFileName !== null;
  const hasWrittenEvidence = evidence.submittedText !== null && evidence.submittedText.length > 0;

  if (hasFile && hasWrittenEvidence) {
    return t("fileAndWrittenEvidence", {
      file: evidence.originalFileName ?? t("fileEvidence"),
    });
  }

  if (hasFile) {
    return evidence.originalFileName ?? t("fileEvidence");
  }

  if (hasWrittenEvidence) {
    return t("writtenEvidence");
  }

  return t("evidenceSubmitted");
}

function getAppealEvidenceCutoff(commitment: ApiCommitment) {
  const appealRecordedEvent =
    commitment.events.find((event) => event.type === "APPEAL_RECORDED") ?? null;

  if (appealRecordedEvent === null) {
    return null;
  }

  return new Date(appealRecordedEvent.createdAt).getTime();
}

function getCommitmentSummaryStatus(
  commitment: ApiCommitment,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (commitment.status === "COMPLETED") {
    return {
      label: t("summaryCompleted"),
      status: "COMPLETED" as const,
    };
  }

  if (commitment.status === "FAILED_FINAL") {
    return {
      label: t("summaryFailed"),
      status: "FAILED_FINAL" as const,
    };
  }

  return {
    label: t("summaryPending"),
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
  const { t, translateFrontendMessage, translateStatus } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textEvidence, setTextEvidence] = useState("");
  const [cardMessage, setCardMessage] = useState<CardMessage | null>(null);
  const [activeAction, setActiveAction] = useState<CardActionKey | null>(null);
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
        ? t("appealDisabledHint")
        : t("appealUnlockHint")
      : isAppealEvidenceStage && latestAppealEvidence === null
        ? t("appealUploadHint")
        : null;
  const evidenceLockMessage = isFinalState
    ? t("evidenceLockedFinalState")
    : commitment.isProcessing
      ? t("evidenceLockedProcessing")
      : commitment.status === "FAILED_PENDING_APPEAL" && !commitment.appealed
        ? t("evidenceLockedAppeal")
        : null;
  const summaryStatus = getCommitmentSummaryStatus(commitment, t);
  const expandableSectionId = `commitment-details-${commitment.id}`;

  async function runCardAction(actionKey: CardActionKey, action: () => Promise<void>) {
    setActiveAction(actionKey);
    setCardMessage(null);

    try {
      await action();
      setCardMessage({
        actionKey,
        messageKey: "actionCompleted",
        tone: "success",
        type: "action",
      });
    } catch (error) {
      if (error instanceof Error) {
        setCardMessage({
          tone: "error",
          type: "raw",
          value: error.message,
        });
      } else {
        setCardMessage({
          actionKey,
          messageKey: "actionFailed",
          tone: "error",
          type: "action",
        });
      }
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
              <Badge variant="secondary">
                {t("commitmentBadge", { id: commitment.onchainId })}
              </Badge>
              <Badge variant="outline">
                {commitment.appealed ? t("appealedFlow") : t("standardFlow")}
              </Badge>
              {commitment.isProcessing ? <Badge variant="default">{t("processing")}</Badge> : null}
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl font-semibold tracking-tight text-white">
                {commitment.title}
              </h3>
              <p className="text-sm leading-6 text-slate-300/72">
                {t("deadlineEvidenceSummary", {
                  count: commitment.evidences.length,
                  deadline: formatDateOnly(commitment.deadline),
                  verification: latestVerification
                    ? t("latestVerificationAvailable")
                    : t("latestVerificationPending"),
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {t("stake")}
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                {formatEther(BigInt(commitment.amount))} AVAX
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {t("state")}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <StatusBadge label={summaryStatus.label} status={summaryStatus.status} />
                <Badge variant="outline">{translateStatus(commitment.status)}</Badge>
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
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("deadline")}</p>
                  <p className="mt-2 text-base font-semibold text-white">{formatDateOnly(commitment.deadline)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300/72">
                    {t("appealWindow", { date: formatDateOnly(commitment.appealWindowEndsAt) })}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("evidence")}</p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {t("evidenceEntries", { count: commitment.evidences.length })}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300/72">
                    {t("latestValue", { value: describeEvidenceEntry(latestEvidence, t) })}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("failureReceiver")}</p>
                  <p className="mt-2 break-all text-base font-semibold text-white">
                    {formatShortAddress(commitment.failReceiver, 8, 5)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300/72">
                    {t("fullAddressAvailable")}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("currentStatus")}</p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {commitment.isProcessing ? t("processing") : translateStatus(commitment.status)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300/72">
                    {t("updatedAt", { date: formatDateOnly(commitment.updatedAt) })}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="space-y-5">
                  <DetailCard icon={FileText} title={t("detailDescription")}>
                    <p className="whitespace-pre-wrap">{commitment.description}</p>
                  </DetailCard>

                  <DetailCard icon={Bot} title={t("latestVerificationTitle")}>
                    {latestVerification !== null ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={latestVerification.result ? "success" : "destructive"}>
                            {latestVerification.result ? t("verificationSuccess") : t("verificationFail")}
                          </Badge>
                          <Badge variant="outline">
                            {t("confidence", { value: latestVerification.confidence.toFixed(2) })}
                          </Badge>
                          <Badge variant="secondary">{latestVerification.type}</Badge>
                        </div>
                        <p>{latestVerification.reasoning}</p>
                      </>
                    ) : (
                      <p>{t("noVerificationStored")}</p>
                    )}
                  </DetailCard>

                  <DetailCard
                    icon={isAppealEvidenceStage ? MessageSquareText : UploadCloud}
                    title={isAppealEvidenceStage ? t("appealEvidence") : t("submittedEvidence")}
                  >
                    {latestEvidence === null ? (
                      <p>{t("noEvidenceStored")}</p>
                    ) : (
                      <>
                        <p>{t("latestEntry", { value: describeEvidenceEntry(latestEvidence, t) })}</p>
                        {latestEvidence.originalFileName !== null ? (
                          <p>{t("fileLabel", { name: latestEvidence.originalFileName })}</p>
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
                          {isAppealEvidenceStage ? t("appealEvidenceNotice") : t("appealPolicy")}
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
                            {isAppealEvidenceStage ? t("submitAppealEvidence") : t("submitEvidence")}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-300/72">
                            {isAppealEvidenceStage
                              ? t("submitAppealEvidenceDesc")
                              : t("submitEvidenceDesc")}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <label className="grid gap-2">
                          <span className="text-sm font-medium text-slate-200">
                            {isAppealEvidenceStage ? t("appealFile") : t("evidenceFile")}
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
                            {isAppealEvidenceStage ? t("appealExplanation") : t("writtenEvidenceLabel")}
                          </span>
                          <Textarea
                            disabled={activeAction !== null}
                            onChange={(event) => setTextEvidence(event.target.value)}
                            placeholder={
                              isAppealEvidenceStage
                                ? t("appealExplanationPlaceholder")
                                : t("writtenEvidencePlaceholder")
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
                                isAppealEvidenceStage
                                  ? "actionAppealEvidenceUpload"
                                  : "actionEvidenceUpload",
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
                            {activeAction === "actionEvidenceUpload" ||
                            activeAction === "actionAppealEvidenceUpload" ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <UploadCloud />
                            )}
                            {activeAction === "actionEvidenceUpload" ||
                            activeAction === "actionAppealEvidenceUpload"
                              ? t("uploading")
                              : isAppealEvidenceStage
                                ? t("submitAppealEvidence")
                                : t("submitEvidence")}
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
                          {isAppealEvidenceStage ? t("appealEvidence") : t("evidence")}
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
                        <p className="font-semibold text-white">{t("actionCenter")}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-300/72">
                          {t("actionCenterDesc")}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <Button
                        className="w-full justify-start"
                        disabled={!canVerify || activeAction !== null}
                        onClick={() => void runCardAction("actionVerification", () => onVerify(commitment.id))}
                        size="lg"
                        type="button"
                      >
                        {activeAction === "actionVerification" ? <Loader2 className="animate-spin" /> : <Bot />}
                        {activeAction === "actionVerification" ? t("queueing") : t("verifyCommitment")}
                      </Button>

                      <Button
                        className="w-full justify-start"
                        disabled={!canAppeal || activeAction !== null}
                        onClick={() => void runCardAction("actionAppeal", () => onAppeal(commitment))}
                        size="lg"
                        type="button"
                        variant="warning"
                      >
                        {activeAction === "actionAppeal" ? <Loader2 className="animate-spin" /> : <ArrowRightLeft />}
                        {activeAction === "actionAppeal" ? t("appealing") : t("openAppeal")}
                      </Button>

                      <Button
                        className="w-full justify-start"
                        disabled={!canResolveAppeal || activeAction !== null}
                        onClick={() =>
                          void runCardAction("actionAppealResolution", () => onResolveAppeal(commitment.id))
                        }
                        size="lg"
                        type="button"
                        variant="secondary"
                      >
                        {activeAction === "actionAppealResolution" ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <MessageSquareText />
                        )}
                        {activeAction === "actionAppealResolution" ? t("queueing") : t("resolveAppeal")}
                      </Button>

                      <Button
                        className="w-full justify-start"
                        disabled={!canFinalize || activeAction !== null}
                        onClick={() =>
                          void runCardAction("actionFailedFinalization", () => onFinalize(commitment.id))
                        }
                        size="lg"
                        type="button"
                        variant="destructive"
                      >
                        {activeAction === "actionFailedFinalization" ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <AlertTriangle />
                        )}
                        {activeAction === "actionFailedFinalization" ? t("finalizing") : t("finalizeFailed")}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-100">
                        <Wallet className="size-4" />
                      </div>
                      <p className="font-semibold text-white">{t("commitmentMetadata")}</p>
                    </div>

                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t("onChainId")}</p>
                        <p className="mt-2 font-semibold text-white">{commitment.onchainId}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t("owner")}</p>
                        <p className="mt-2 break-all font-semibold text-white">
                          {formatShortAddress(commitment.userWalletAddress, 8, 5)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t("failureReceiver")}</p>
                        <p className="mt-2 break-all font-semibold text-white">{commitment.failReceiver}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t("lastUpdate")}</p>
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
                      {cardMessage.type === "raw"
                        ? translateFrontendMessage(cardMessage.value)
                        : t(cardMessage.messageKey, { label: t(cardMessage.actionKey) })}
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
