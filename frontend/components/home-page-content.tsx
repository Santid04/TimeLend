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
import { formatShortAddress } from "@/lib/utils";
import { useWalletSession } from "@/hooks/use-wallet-session";

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HomePageContent() {
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
    sessionError,
    switchToSupportedChain,
  } = useWalletSession();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-8 pt-6">
      <motion.section
        animate="visible"
        className="glass-noise overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,20,42,0.92),rgba(8,12,24,0.82))] px-6 py-7 shadow-[0_30px_100px_-36px_rgba(2,6,23,0.96)] backdrop-blur-2xl sm:px-8 sm:py-8"
        initial="hidden"
        variants={reveal}
      >
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="space-y-4">
              <Badge variant="secondary">TimeLend protocol</Badge>
              <div className="space-y-4">
                <h1 className="max-w-4xl font-display text-4xl font-semibold tracking-[-0.06em] text-white text-balance sm:text-5xl lg:text-6xl">
                  Commit capital to a goal. Let proof and settlement do the rest.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300/78 sm:text-lg">
                  A modern Web3 surface for creating escrow-backed commitments, authenticating with
                  your wallet, and moving through AI-powered verification with less noise and better
                  operational clarity.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={isConnected ? "success" : "warning"}>
                {isConnected ? "Wallet connected" : "Wallet pending"}
              </Badge>
              <Badge variant={isAuthenticated ? "success" : "warning"}>
                {isAuthenticated ? "Backend session live" : "Signature required"}
              </Badge>
              <Badge variant={isOnSupportedChain ? "success" : "destructive"}>
                {isOnSupportedChain ? "Avalanche Fuji" : "Switch network"}
              </Badge>
              <Badge variant="outline">{connectorName ?? "No connector"}</Badge>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/create">
                  <PlusCircle />
                  Create commitment
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/dashboard">
                  <LayoutDashboard />
                  Open dashboard
                </Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Step 01
                </p>
                <p className="mt-3 text-base font-semibold text-white">Connect wallet</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  Establish the wallet provider once and keep the session status visible.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Step 02
                </p>
                <p className="mt-3 text-base font-semibold text-white">Create escrow</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  Publish the commitment, stake AVAX, and lock the failure receiver path.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Step 03
                </p>
                <p className="mt-3 text-base font-semibold text-white">Operate workflow</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  Upload proof, verify, appeal if needed, and settle the result on-chain.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              helper="Compact visibility for the connected account powering TimeLend."
              icon={Wallet}
              label="Wallet"
              tone="accent"
              value={formatShortAddress(address, 8, 5)}
            />
            <MetricCard
              helper={isAuthenticated ? "Protected backend routes are ready." : "Authenticate after connecting."}
              icon={ShieldCheck}
              label="Session"
              tone={isAuthenticated ? "success" : "warning"}
              value={isAuthenticated ? "Active" : "Pending"}
            />
            <MetricCard
              helper="The commitment contract and appeals run on Avalanche Fuji."
              icon={Bot}
              label="Network"
              tone={isOnSupportedChain ? "success" : "warning"}
              value={isOnSupportedChain ? "Avalanche Fuji" : "Switch required"}
            />
            <MetricCard
              helper={runtimeConfig.NEXT_PUBLIC_CONTRACT_ADDRESS}
              icon={ArrowUpRight}
              label="Contract"
              tone="neutral"
              value={formatShortAddress(runtimeConfig.NEXT_PUBLIC_CONTRACT_ADDRESS, 8, 6)}
            />
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
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
          <Card className="glass-noise overflow-hidden rounded-[32px]">
            <CardHeader className="space-y-3">
              <Badge variant="secondary">Operational map</Badge>
              <CardTitle className="text-2xl">A cleaner route structure</CardTitle>
              <CardDescription>
                Each screen now has a single job, so users spend less time parsing instructions and
                more time progressing the workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">Home</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  Wallet connection, authentication, network readiness, and route entry points.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">Create</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  Guided form flow for publishing the escrow-backed commitment.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">Dashboard</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  Evidence, verification, appeals, and settlement in a financial-style command view.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-noise overflow-hidden rounded-[32px]">
            <CardHeader className="space-y-3">
              <Badge variant="outline">Why this feels lighter</Badge>
              <CardTitle className="text-2xl">Visual hierarchy over raw text</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">Status-first cards</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  Critical readiness states stay visible with badges, tones, and grouped actions.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">Fewer dense paragraphs</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/72">
                  Content is split into smaller panels, each with a single job and faster scan path.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
