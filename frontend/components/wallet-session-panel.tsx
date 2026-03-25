"use client";

import {
  ArrowRightLeft,
  Loader2,
  PlugZap,
  ShieldCheck,
  Unplug,
  Wallet,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatShortAddress } from "@/lib/utils";

type WalletSessionPanelProps = {
  address: string | undefined;
  connectorName: string | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  isOnSupportedChain: boolean;
  onAuthenticate: () => Promise<void>;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  onSwitchChain: () => Promise<void>;
  sessionError: string | null;
};

export function WalletSessionPanel({
  address,
  connectorName,
  isAuthenticated,
  isAuthenticating,
  isConnected,
  isConnecting,
  isOnSupportedChain,
  onAuthenticate,
  onConnect,
  onDisconnect,
  onSwitchChain,
  sessionError,
}: WalletSessionPanelProps) {
  return (
    <Card className="glass-noise overflow-hidden rounded-2xl">
      <CardHeader className="flex flex-col gap-5 border-b border-white/8 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Badge variant="secondary">Wallet control</Badge>
          <div className="space-y-2">
            <CardTitle className="text-2xl sm:text-3xl">Connect, sign, and get ready to operate</CardTitle>
            <CardDescription className="max-w-2xl text-sm sm:text-base">
              Keep the full wallet state on Home, then move into create and dashboard flows once the
              session is live.
            </CardDescription>
          </div>
        </div>

        {isAuthenticated ? (
          <StatusBadge label="Session live" status="AUTHENTICATED" />
        ) : isConnected ? (
          <Badge variant="warning">Authentication pending</Badge>
        ) : (
          <Badge variant="secondary">Wallet disconnected</Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-cyan-300/14 bg-cyan-300/[0.08] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-100">
                <PlugZap className="size-5" />
              </div>
              <Badge variant={isConnected ? "success" : "warning"}>
                {isConnected ? "Connected" : "Pending"}
              </Badge>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Connection</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {connectorName ?? "No connector selected"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300/72">
              {isConnected ? "Wallet provider is attached to TimeLend." : "Connect a wallet to start."}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-300/14 bg-emerald-400/[0.08] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-100">
                <ShieldCheck className="size-5" />
              </div>
              <Badge variant={isAuthenticated ? "success" : "warning"}>
                {isAuthenticated ? "Authenticated" : "Signature needed"}
              </Badge>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Backend session</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {isAuthenticated ? "Protected routes unlocked" : "Waiting for wallet signature"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300/72">
              JWT session powers create, verify, appeal, and settlement requests.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-300/14 bg-amber-400/[0.08] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-400/12 text-amber-100">
                <ArrowRightLeft className="size-5" />
              </div>
              {isOnSupportedChain ? (
                <StatusBadge label="Fuji ready" status="CONNECTED" />
              ) : (
                <StatusBadge label="Wrong network" status="UNSUPPORTED" />
              )}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Network</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {isOnSupportedChain ? "Avalanche Fuji" : "Switch required"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300/72">
              Contract creation and appeal settlement stay on Avalanche Fuji.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {!isConnected ? (
            <Button disabled={isConnecting} onClick={() => void onConnect()} size="lg" type="button">
              {isConnecting ? <Loader2 className="animate-spin" /> : <Wallet />}
              {isConnecting ? "Connecting..." : "Connect wallet"}
            </Button>
          ) : (
            <>
              {!isOnSupportedChain ? (
                <Button onClick={() => void onSwitchChain()} size="lg" type="button" variant="warning">
                  <ArrowRightLeft />
                  Switch to Fuji
                </Button>
              ) : null}

              {!isAuthenticated ? (
                <Button
                  disabled={isAuthenticating}
                  onClick={() => void onAuthenticate()}
                  size="lg"
                  type="button"
                >
                  {isAuthenticating ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                  {isAuthenticating ? "Signing..." : "Authenticate"}
                </Button>
              ) : null}

              <Button onClick={onDisconnect} size="lg" type="button" variant="secondary">
                <Unplug />
                Disconnect
              </Button>
            </>
          )}
        </div>

        <Separator className="soft-divider" />

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-100">
                <Wallet className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Wallet address</p>
                <p className="mt-1 text-base font-semibold text-white">
                  {address ?? "Waiting for connection"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300/72">
              Quick view: {formatShortAddress(address)}. The full address stays available here while
              the rest of the app keeps things compact.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">State checklist</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={isConnected ? "success" : "warning"}>1. Connect</Badge>
              <Badge variant={isOnSupportedChain ? "success" : "warning"}>2. Fuji</Badge>
              <Badge variant={isAuthenticated ? "success" : "warning"}>3. Sign</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300/72">
              Once all three are green, the create and dashboard actions use the same protected logic
              already wired into TimeLend.
            </p>
          </div>
        </div>

        {sessionError !== null ? (
          <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] p-4 text-sm text-rose-100">
            {sessionError}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
