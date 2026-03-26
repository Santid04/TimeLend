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
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { TranslationKey, TranslationValues } from "@/lib/i18n/translations";
import { useTimeLendWalletActions } from "@/hooks/use-timelend-wallet-actions";
import { useWalletSession } from "@/hooks/use-wallet-session";
import { createCommitmentRecord } from "@/services/timelend-api";
import type { CreateCommitmentFormValues } from "@/types/frontend";
import { formatShortAddress } from "@/lib/utils";

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

type TranslatedPageMessage = {
  key: TranslationKey;
  values?: TranslationValues;
};

export function CreatePageContent() {
  const { t, translateFrontendMessage } = useTranslation();
  const { address, isAuthenticated, isOnSupportedChain, session } = useWalletSession();
  const { createCommitmentWithWallet, walletReady } = useTimeLendWalletActions();
  const [pageMessage, setPageMessage] = useState<TranslatedPageMessage | null>(null);
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

      setPageMessage({
        key: "createSuccessMessage",
        values: {
          id: onChainCommitment.onchainId,
          receiver: effectiveFailReceiver,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("unableToCreateCommitment");
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
            <Badge variant="secondary">{t("createPageBadge")}</Badge>
            <h1 className="max-w-none font-display text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
              {t("createPageTitle")}
            </h1>
            <p className="max-w-4xl text-base leading-7 text-slate-300/78 sm:text-lg">
              {t("createPageDescription")}
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/">
                  <ArrowRight className="rotate-180" />
                  {t("backHome")}
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard">
                  <LayoutDashboard />
                  {t("openDashboard")}
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              helper={t("createMetricWalletHelper")}
              icon={Wallet}
              label={t("metricWallet")}
              tone="accent"
              value={translateFrontendMessage(formatShortAddress(address, 8, 5))}
            />
            <MetricCard
              helper={t("createMetricFlowHelper")}
              icon={Workflow}
              label={t("createMetricFlow")}
              tone="neutral"
              value={t("createMetricFlowValue")}
            />
            <MetricCard
              helper={t("createMetricNextStopHelper")}
              icon={LayoutDashboard}
              label={t("nextStop")}
              tone="success"
              value={t("routeDashboard")}
            />
            <MetricCard
              helper={t("createMetricDeadlineHelper")}
              icon={CalendarClock}
              label={t("deadline")}
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
              <Badge variant="warning">{t("walletGate")}</Badge>
              <CardTitle className="text-2xl">{t("connectAndAuthenticateOnHomeFirst")}</CardTitle>
              <CardDescription>{t("createGateDescription")}</CardDescription>
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
            <Badge variant="outline">{t("beforeYouSubmit")}</Badge>
            <CardTitle className="text-2xl">{t("threeQuickChecks")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">01</p>
              <p className="mt-3 text-base font-semibold text-white">{t("walletAuthenticated")}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300/72">
                {t("walletAuthenticatedDesc")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">02</p>
              <p className="mt-3 text-base font-semibold text-white">{t("fujiSelected")}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300/72">
                {t("fujiSelectedDesc")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">03</p>
              <p className="mt-3 text-base font-semibold text-white">{t("dashboardNext")}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300/72">
                {t("dashboardNextDesc")}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {createError !== null ? (
        <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] p-4 text-sm text-rose-100">
          {translateFrontendMessage(createError)}
        </div>
      ) : null}
      {pageMessage !== null ? (
        <div className="rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.08] p-4 text-sm text-emerald-100">
          {t(pageMessage.key, pageMessage.values)}
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
