"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Bot,
  LayoutDashboard,
  PlusCircle,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { WalletSessionPanel } from "@/components/wallet-session-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFrontendRuntimeConfig } from "@/lib/env";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatShortAddress } from "@/lib/utils";
import { useWalletSession } from "@/hooks/use-wallet-session";

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HomePageContent() {
  const runtimeConfig = getFrontendRuntimeConfig();
  const { t, translateFrontendMessage } = useTranslation();
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
    sessionError,
    switchToSupportedChain,
  } = useWalletSession();

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
            <Badge variant="secondary">{t("homeProtocolBadge")}</Badge>
            <h1 className="max-w-none font-display text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
              {t("homeTitle")}
            </h1>
            <p className="max-w-4xl text-base leading-7 text-slate-300/78 sm:text-lg">
              {t("homeDescription")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={isConnected ? "success" : "warning"}>
              {isConnected ? t("walletConnected") : t("walletPending")}
            </Badge>
            <Badge variant={isAuthenticated ? "success" : "warning"}>
              {isAuthenticated ? t("backendSessionLive") : t("signatureRequired")}
            </Badge>
            <Badge variant={isOnSupportedChain ? "success" : "destructive"}>
              {isOnSupportedChain ? t("avalancheFuji") : t("switchNetwork")}
            </Badge>
            <Badge variant="outline">{connectorName ?? t("noConnector")}</Badge>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/create">
                <PlusCircle />
                {t("createCommitmentAction")}
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard">
                <LayoutDashboard />
                {t("openDashboard")}
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              helper={t("homeMetricWalletHelper")}
              icon={Wallet}
              label={t("metricWallet")}
              tone="accent"
              value={translateFrontendMessage(formatShortAddress(address, 8, 5))}
            />
            <MetricCard
              helper={isAuthenticated ? t("homeSessionHelperReady") : t("homeSessionHelperPending")}
              icon={ShieldCheck}
              label={t("metricSession")}
              tone={isAuthenticated ? "success" : "warning"}
              value={isAuthenticated ? t("statusActive") : t("pending")}
            />
            <MetricCard
              helper={t("homeMetricNetworkHelper")}
              icon={Bot}
              label={t("metricNetwork")}
              tone={isOnSupportedChain ? "success" : "warning"}
              value={isOnSupportedChain ? t("avalancheFuji") : t("switchRequired")}
            />
            <MetricCard
              helper={runtimeConfig.NEXT_PUBLIC_CONTRACT_ADDRESS}
              icon={ArrowUpRight}
              label={t("metricContract")}
              tone="neutral"
              value={formatShortAddress(runtimeConfig.NEXT_PUBLIC_CONTRACT_ADDRESS, 8, 6)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("step01")}</p>
              <p className="mt-3 text-base font-semibold text-white">{t("homeStep1Title")}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300/72">
                {t("homeStep1Desc")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("step02")}</p>
              <p className="mt-3 text-base font-semibold text-white">{t("homeStep2Title")}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300/72">
                {t("homeStep2Desc")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("step03")}</p>
              <p className="mt-3 text-base font-semibold text-white">{t("homeStep3Title")}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300/72">
                {t("homeStep3Desc")}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-2">
        <motion.div
          animate="visible"
          initial="hidden"
          transition={{ delay: 0.06 }}
          variants={reveal}
        >
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
        </motion.div>

        <motion.div
          animate="visible"
          className="grid gap-6"
          initial="hidden"
          transition={{ delay: 0.12 }}
          variants={reveal}
        >
          <Card className="glass-noise overflow-hidden rounded-2xl">
            <CardHeader className="space-y-3">
              <Badge variant="secondary">{t("operationalMap")}</Badge>
              <CardTitle className="text-2xl">{t("cleanerRouteStructure")}</CardTitle>
              <CardDescription>{t("cleanerRouteStructureDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm font-semibold text-white">{t("routeHome")}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  {t("routeHomeDesc")}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm font-semibold text-white">{t("routeCreate")}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  {t("routeCreateDesc")}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm font-semibold text-white">{t("routeDashboard")}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  {t("routeDashboardDesc")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-noise overflow-hidden rounded-2xl">
            <CardHeader className="space-y-3">
              <Badge variant="outline">{t("whyLighter")}</Badge>
              <CardTitle className="text-2xl">{t("visualHierarchy")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm font-semibold text-white">{t("statusFirstCards")}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  {t("statusFirstCardsDesc")}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm font-semibold text-white">{t("fewerDenseParagraphs")}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  {t("fewerDenseParagraphsDesc")}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
