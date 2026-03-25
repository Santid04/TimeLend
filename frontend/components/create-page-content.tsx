"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarClock, LayoutDashboard, Wallet, Workflow } from "lucide-react";

import { CommitmentCreateForm } from "@/components/commitment-create-form";
import { MetricCard } from "@/components/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildDeadlineFromDateOnly,
  getFailReceiverValidationError,
  resolveEffectiveFailReceiver,
} from "@/lib/commitment-utils";
import { useTimeLendWalletActions } from "@/hooks/use-timelend-wallet-actions";
import { useWalletSession } from "@/hooks/use-wallet-session";
import { createCommitmentRecord } from "@/services/timelend-api";
import type { CreateCommitmentFormValues } from "@/types/frontend";
import { formatShortAddress } from "@/lib/utils";

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function CreatePageContent() {
  const { address, isAuthenticated, isOnSupportedChain, session } = useWalletSession();
  const { createCommitmentWithWallet, walletReady } = useTimeLendWalletActions();
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create the commitment.";
      setCreateError(message);
      throw error;
    } finally {
      setIsCreating(false);
    }
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
            <Badge variant="secondary">Create commitment</Badge>
            <h1 className="max-w-none font-display text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
              Publish the escrow and goal with a guided, onboarding-style flow.
            </h1>
            <p className="max-w-4xl text-base leading-7 text-slate-300/78 sm:text-lg">
              This page keeps the exact same creation logic, but now the form is split into clearer
              steps, supported by a live review panel and more consistent product-level hierarchy.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/">
                  <ArrowRight className="rotate-180" />
                  Back home
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard">
                  <LayoutDashboard />
                  Open dashboard
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              helper="Authenticate from Home before publishing the escrow."
              icon={Wallet}
              label="Wallet"
              tone="accent"
              value={formatShortAddress(address, 8, 5)}
            />
            <MetricCard
              helper="This route is dedicated to the publication step only."
              icon={Workflow}
              label="Flow"
              tone="neutral"
              value="Create only"
            />
            <MetricCard
              helper="After publishing, use the dashboard for evidence and verification."
              icon={LayoutDashboard}
              label="Next stop"
              tone="success"
              value="Dashboard"
            />
            <MetricCard
              helper="Deadlines remain date-only in the interface, just with better guidance."
              icon={CalendarClock}
              label="Deadline"
              tone="warning"
              value="dd/mm/yyyy"
            />
          </div>
        </div>
      </motion.section>

      {!isAuthenticated || !isOnSupportedChain ? (
        <motion.section
          animate="visible"
          initial="hidden"
          transition={{ delay: 0.05 }}
          variants={reveal}
        >
          <Card className="overflow-hidden rounded-2xl border-amber-300/16 bg-[linear-gradient(180deg,rgba(56,38,16,0.86),rgba(21,14,7,0.8))]">
            <CardHeader className="space-y-3">
              <Badge variant="warning">Wallet gate</Badge>
              <CardTitle className="text-2xl">Connect and authenticate on Home first</CardTitle>
              <CardDescription>
                Create logic is unchanged, but this route assumes the wallet is already connected,
                signed in, and on Avalanche Fuji.
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.section>
      ) : null}

      <motion.section
        animate="visible"
        initial="hidden"
        transition={{ delay: 0.08 }}
        variants={reveal}
      >
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="space-y-3">
            <Badge variant="outline">Before you submit</Badge>
            <CardTitle className="text-2xl">Three quick checks before publishing</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">01</p>
              <p className="mt-3 text-base font-semibold text-white">Wallet authenticated</p>
              <p className="mt-2 text-sm leading-6 text-slate-300/72">
                Connect and sign on Home before returning to this page.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">02</p>
              <p className="mt-3 text-base font-semibold text-white">Fuji selected</p>
              <p className="mt-2 text-sm leading-6 text-slate-300/72">
                Contract creation still requires Avalanche Fuji exactly as before.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">03</p>
              <p className="mt-3 text-base font-semibold text-white">Dashboard next</p>
              <p className="mt-2 text-sm leading-6 text-slate-300/72">
                After publish, use the dashboard to upload evidence and operate the rest of the flow.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {createError !== null ? (
        <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] p-4 text-sm text-rose-100">
          {createError}
        </div>
      ) : null}
      {pageMessage !== null ? (
        <div className="rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.08] p-4 text-sm text-emerald-100">
          {pageMessage}
        </div>
      ) : null}

      <motion.div
        animate="visible"
        initial="hidden"
        transition={{ delay: 0.12 }}
        variants={reveal}
      >
        <CommitmentCreateForm
          canSubmit={isAuthenticated && isOnSupportedChain && walletReady}
          isSubmitting={isCreating}
          onSubmit={handleCreateCommitment}
          userWalletAddress={address}
        />
      </motion.div>
    </main>
  );
}
