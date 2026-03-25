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

export function DashboardPageContent() {
  const { address, isAuthenticated, isOnSupportedChain, session } = useWalletSession();
  const { appealCommitmentWithWallet } = useTimeLendWalletActions();
  const { commitments, dashboardError, initialLoadComplete, isRefreshing, refreshCommitments } =
    useCommitmentsDashboard(session, isAuthenticated ? address : undefined);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
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
    setPageMessage(response.message);
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
    setPageMessage(`Appeal recorded for commitment ${commitment.onchainId}.`);
    await refreshCommitments();
  }

  async function handleResolveAppeal(commitmentId: string) {
    const commitment = await resolveAppealDemo(commitmentId);
    setPageMessage(
      `Appeal resolved. Commitment ${commitment.onchainId} is now ${commitment.status}.`,
    );
    await refreshCommitments();
  }

  async function handleFinalize(commitmentId: string) {
    await finalizeFailedDemo(commitmentId);
    setPageMessage("Failed commitment finalization requested.");
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
            <Badge variant="secondary">Dashboard</Badge>
            <h1 className="max-w-none font-display text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
              Operate the commitment pipeline from one financial-style control center.
            </h1>
            <p className="max-w-4xl text-base leading-7 text-slate-300/78 sm:text-lg">
              Review live positions, upload evidence, trigger verification, and handle appeals or
              finalization without changing the underlying workflow logic.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/">
                  <Wallet />
                  Back home
                </Link>
              </Button>
              <Button asChild>
                <Link href="/create">
                  <PlusCircle />
                  New commitment
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              helper="Compact wallet visibility while staying focused on positions and actions."
              icon={Wallet}
              label="Wallet"
              tone="accent"
              value={formatShortAddress(address, 8, 5)}
            />
            <MetricCard
              helper="Items still moving through verification, appeal, or settlement."
              icon={Layers3}
              label="Open positions"
              tone="warning"
              value={String(activeCommitments.length)}
            />
            <MetricCard
              helper="Completed or failed-final commitments already resolved."
              icon={History}
              label="History"
              tone="success"
              value={String(settledCommitments.length)}
            />
            <MetricCard
              helper={`${processingCount} commitments currently moving through automation.`}
              icon={Activity}
              label="Staked"
              tone="neutral"
              value={`${formatEther(totalStakedWei)} AVAX`}
            />
          </div>
        </div>
      </motion.section>

      {pageMessage !== null ? (
        <div className="rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.08] p-4 text-sm text-emerald-100">
          {pageMessage}
        </div>
      ) : null}
      {dashboardError !== null ? (
        <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] p-4 text-sm text-rose-100">
          {dashboardError}
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
              <Badge variant="outline">Portfolio overview</Badge>
              <CardTitle className="text-2xl sm:text-3xl">Your commitments</CardTitle>
              <CardDescription className="max-w-3xl text-sm sm:text-base">
                Review active positions, keep an eye on processing commitments, and work through the
                allowed actions for each item below.
              </CardDescription>
            </div>

            <Button
              disabled={!isAuthenticated || isRefreshing}
              onClick={() => void refreshCommitments()}
              size="lg"
              type="button"
              variant="secondary"
            >
              {isRefreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              {isRefreshing ? "Refreshing..." : "Refresh data"}
            </Button>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Wallet {isAuthenticated ? "authenticated" : "pending"}</Badge>
              <Badge variant={isOnSupportedChain ? "success" : "destructive"}>
                {isOnSupportedChain ? "Fuji ready" : "Wrong network"}
              </Badge>
              <Badge variant="warning">{processingCount} processing</Badge>
              <Badge variant="outline">{commitments.length} total commitments</Badge>
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
                    <Link href="/">Authenticate on Home</Link>
                  </Button>
                }
                description="Connect your wallet and sign the session challenge on Home to unlock commitment data and actions here."
                icon={Wallet}
                title="Authenticate on Home to load commitments"
              />
            ) : commitments.length === 0 ? (
              <EmptyState
                action={
                  <Button asChild size="lg">
                    <Link href="/create">Create your first commitment</Link>
                  </Button>
                }
                description="This dashboard is ready for evidence, verification, appeal, and settlement. Create a commitment first, then return here to operate it."
                icon={PlusCircle}
                title="No commitments yet"
              />
            ) : (
              <div className="grid gap-6">
                <Card className="overflow-hidden rounded-2xl border-white/10 bg-white/[0.03]">
                  <CardHeader className="space-y-3 border-b border-white/8 pb-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-2">
                        <Badge variant="warning">Open pipeline</Badge>
                        <CardTitle className="text-xl">Active, processing, and appeal-stage</CardTitle>
                      </div>
                      <Badge variant="secondary">{activeCommitments.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {activeCommitments.length === 0 ? (
                      <EmptyState
                        description="Everything is settled right now. New active commitments will show up here."
                        icon={Layers3}
                        title="No active commitments"
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
                        <Badge variant="success">History</Badge>
                        <CardTitle className="text-xl">Settled commitments</CardTitle>
                      </div>
                      <Badge variant="secondary">{settledCommitments.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {settledCommitments.length === 0 ? (
                      <EmptyState
                        description="Completed and failed-final commitments will appear here once they reach a terminal state."
                        icon={History}
                        title="No settled commitments"
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
