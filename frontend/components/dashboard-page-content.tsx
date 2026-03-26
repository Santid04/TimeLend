"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  History,
  Layers3,
  Loader2,
  PlusCircle,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { formatEther } from "viem";

import { CommitmentCard } from "@/components/commitment-card";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommitmentsDashboard } from "@/hooks/use-commitments-dashboard";
import { useTimeLendWalletActions } from "@/hooks/use-timelend-wallet-actions";
import { useWalletSession } from "@/hooks/use-wallet-session";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { TranslationKey, TranslationValues } from "@/lib/i18n/translations";
import { formatShortAddress } from "@/lib/utils";
import {
  finalizeFailedDemo,
  recordAppeal,
  resolveAppealDemo,
  uploadEvidence,
  verifyCommitmentRequest,
} from "@/services/timelend-api";
import type { ApiCommitment, EvidenceSubmissionInput } from "@/types/frontend";

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

type DashboardPageMessage =
  | {
      key: TranslationKey;
      type: "translated";
      values?: TranslationValues;
    }
  | {
      type: "raw";
      value: string;
    };

export function DashboardPageContent() {
  const { t, translateFrontendMessage, translateStatus } = useTranslation();
  const { address, isAuthenticated, isOnSupportedChain, session } = useWalletSession();
  const { appealCommitmentWithWallet } = useTimeLendWalletActions();
  const { commitments, dashboardError, initialLoadComplete, isRefreshing, refreshCommitments } =
    useCommitmentsDashboard(session, isAuthenticated ? address : undefined);
  const [pageMessage, setPageMessage] = useState<DashboardPageMessage | null>(null);
  const activeCommitments = commitments.filter(
    (commitment) => commitment.status !== "COMPLETED" && commitment.status !== "FAILED_FINAL",
  );
  const settledCommitments = commitments.filter(
    (commitment) => commitment.status === "COMPLETED" || commitment.status === "FAILED_FINAL",
  );
  const totalStakedWei = commitments.reduce(
    (accumulatedAmount, commitment) => accumulatedAmount + BigInt(commitment.amount),
    0n,
  );
  const processingCount = commitments.filter((commitment) => commitment.isProcessing).length;

  async function handleUploadEvidence(commitmentId: string, input: EvidenceSubmissionInput) {
    if (session === null) {
      throw new Error("Authenticate before uploading evidence.");
    }

    await uploadEvidence(session.token, commitmentId, input);
    await refreshCommitments();
  }

  async function handleVerify(commitmentId: string) {
    if (session === null) {
      throw new Error("Authenticate before verifying commitments.");
    }

    const response = await verifyCommitmentRequest(session.token, commitmentId);
    setPageMessage({
      type: "raw",
      value: response.message,
    });
    await refreshCommitments();
  }

  async function handleAppeal(commitment: ApiCommitment) {
    if (session === null || address === undefined) {
      throw new Error("Authenticate a wallet before appealing.");
    }

    if (!isOnSupportedChain) {
      throw new Error("Switch to Avalanche Fuji before appealing.");
    }

    const appealTxHash = await appealCommitmentWithWallet(address, commitment.onchainId);
    await recordAppeal(session.token, commitment.id, appealTxHash);
    setPageMessage({
      key: "appealRecordedMessage",
      type: "translated",
      values: {
        id: commitment.onchainId,
      },
    });
    await refreshCommitments();
  }

  async function handleResolveAppeal(commitmentId: string) {
    const commitment = await resolveAppealDemo(commitmentId);
    setPageMessage({
      key: "appealResolvedMessage",
      type: "translated",
      values: {
        id: commitment.onchainId,
        status: commitment.status,
      },
    });
    await refreshCommitments();
  }

  async function handleFinalize(commitmentId: string) {
    await finalizeFailedDemo(commitmentId);
    setPageMessage({
      key: "failedFinalizationRequested",
      type: "translated",
    });
    await refreshCommitments();
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-8 pt-6">
      <motion.section
        animate="visible"
        className="glass-noise overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(14,20,42,0.92),rgba(8,12,24,0.82))] px-6 py-7 shadow-[0_30px_100px_-36px_rgba(2,6,23,0.96)] backdrop-blur-xl sm:px-8 sm:py-8"
        initial="hidden"
        variants={reveal}
      >
        <div className="space-y-8">
          <div className="space-y-5">
            <Badge variant="secondary">{t("dashboardPageBadge")}</Badge>
            <h1 className="max-w-none font-display text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
              {t("dashboardPageTitle")}
            </h1>
            <p className="max-w-4xl text-base leading-7 text-slate-300/78 sm:text-lg">
              {t("dashboardPageDescription")}
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/">
                  <Wallet />
                  {t("backHome")}
                </Link>
              </Button>
              <Button asChild>
                <Link href="/create">
                  <PlusCircle />
                  {t("newCommitment")}
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              helper={t("dashboardMetricWalletHelper")}
              icon={Wallet}
              label={t("metricWallet")}
              tone="accent"
              value={translateFrontendMessage(formatShortAddress(address, 8, 5))}
            />
            <MetricCard
              helper={t("openPositionsHelper")}
              icon={Layers3}
              label={t("openPositions")}
              tone="warning"
              value={String(activeCommitments.length)}
            />
            <MetricCard
              helper={t("historyHelper")}
              icon={History}
              label={t("history")}
              tone="success"
              value={String(settledCommitments.length)}
            />
            <MetricCard
              helper={t("stakedHelper", { count: processingCount })}
              icon={Activity}
              label={t("staked")}
              tone="neutral"
              value={`${formatEther(totalStakedWei)} AVAX`}
            />
          </div>
        </div>
      </motion.section>

      {pageMessage !== null ? (
        <div className="rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.08] p-4 text-sm text-emerald-100">
          {pageMessage.type === "raw"
            ? pageMessage.value
            : t(pageMessage.key, {
                ...pageMessage.values,
                ...(pageMessage.key === "appealResolvedMessage" &&
                typeof pageMessage.values?.status === "string"
                  ? { status: translateStatus(pageMessage.values.status) }
                  : {}),
              })}
        </div>
      ) : null}
      {dashboardError !== null ? (
        <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] p-4 text-sm text-rose-100">
          {translateFrontendMessage(dashboardError)}
        </div>
      ) : null}

      <motion.section
        animate="visible"
        initial="hidden"
        transition={{ delay: 0.06 }}
        variants={reveal}
      >
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="flex flex-col gap-5 border-b border-white/8 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Badge variant="outline">{t("portfolioOverview")}</Badge>
              <CardTitle className="text-2xl sm:text-3xl">{t("yourCommitments")}</CardTitle>
              <CardDescription className="max-w-3xl text-sm sm:text-base">{t("portfolioOverviewDesc")}</CardDescription>
            </div>

            <Button
              disabled={!isAuthenticated || isRefreshing}
              onClick={() => void refreshCommitments()}
              size="lg"
              type="button"
              variant="secondary"
            >
              {isRefreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              {isRefreshing ? t("refreshing") : t("refreshData")}
            </Button>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {isAuthenticated ? t("walletAuthenticatedBadge") : t("walletPendingBadge")}
              </Badge>
              <Badge variant={isOnSupportedChain ? "success" : "destructive"}>
                {isOnSupportedChain ? t("fujiReady") : t("wrongNetwork")}
              </Badge>
              <Badge variant="warning">{t("processingCountBadge", { count: processingCount })}</Badge>
              <Badge variant="outline">{t("totalCommitmentsBadge", { count: commitments.length })}</Badge>
            </div>

            {!initialLoadComplete ? (
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Skeleton className="h-40 rounded-2xl" />
                  <Skeleton className="h-40 rounded-2xl" />
                </div>
                <Skeleton className="h-44 rounded-2xl" />
                <Skeleton className="h-44 rounded-2xl" />
              </div>
            ) : !isAuthenticated ? (
              <EmptyState
                action={
                  <Button asChild size="lg">
                    <Link href="/">{t("authenticateOnHome")}</Link>
                  </Button>
                }
                description={t("authenticateOnHomeDesc")}
                icon={Wallet}
                title={t("authenticateOnHomeTitle")}
              />
            ) : commitments.length === 0 ? (
              <EmptyState
                action={
                  <Button asChild size="lg">
                    <Link href="/create">{t("createYourFirstCommitment")}</Link>
                  </Button>
                }
                description={t("noCommitmentsYetDesc")}
                icon={PlusCircle}
                title={t("noCommitmentsYet")}
              />
            ) : (
              <div className="grid gap-6">
                <Card className="overflow-hidden rounded-2xl border-white/10 bg-white/[0.03]">
                  <CardHeader className="space-y-3 border-b border-white/8 pb-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-2">
                        <Badge variant="warning">{t("openPipeline")}</Badge>
                        <CardTitle className="text-xl">{t("activeProcessingAppealStage")}</CardTitle>
                      </div>
                      <Badge variant="secondary">{activeCommitments.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {activeCommitments.length === 0 ? (
                      <EmptyState
                        description={t("noActiveCommitmentsDesc")}
                        icon={Layers3}
                        title={t("noActiveCommitments")}
                      />
                    ) : (
                      activeCommitments.map((commitment) => (
                        <CommitmentCard
                          commitment={commitment}
                          key={commitment.id}
                          onAppeal={handleAppeal}
                          onFinalize={handleFinalize}
                          onResolveAppeal={handleResolveAppeal}
                          onUploadEvidence={handleUploadEvidence}
                          onVerify={handleVerify}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-2xl border-white/10 bg-white/[0.03]">
                  <CardHeader className="space-y-3 border-b border-white/8 pb-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-2">
                        <Badge variant="success">{t("history")}</Badge>
                        <CardTitle className="text-xl">{t("settledCommitments")}</CardTitle>
                      </div>
                      <Badge variant="secondary">{settledCommitments.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {settledCommitments.length === 0 ? (
                      <EmptyState
                        description={t("noSettledCommitmentsDesc")}
                        icon={History}
                        title={t("noSettledCommitments")}
                      />
                    ) : (
                      settledCommitments.map((commitment) => (
                        <CommitmentCard
                          commitment={commitment}
                          key={commitment.id}
                          onAppeal={handleAppeal}
                          onFinalize={handleFinalize}
                          onResolveAppeal={handleResolveAppeal}
                          onUploadEvidence={handleUploadEvidence}
                          onVerify={handleVerify}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>
    </main>
  );
}
