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
import { useTranslation } from "@/lib/i18n/useTranslation";
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
  const { t, translateFrontendMessage } = useTranslation();

  return (
    <Card className="glass-noise overflow-hidden rounded-2xl">
      <CardHeader className="flex flex-col gap-5 border-b border-white/8 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Badge variant="secondary">{t("walletControl")}</Badge>
          <div className="space-y-2">
            <CardTitle className="text-2xl sm:text-3xl">{t("walletPanelTitle")}</CardTitle>
            <CardDescription className="max-w-2xl text-sm sm:text-base">{t("walletPanelDescription")}</CardDescription>
          </div>
        </div>

        {isAuthenticated ? (
          <StatusBadge label={t("sessionLive")} status="AUTHENTICATED" />
        ) : isConnected ? (
          <Badge variant="warning">{t("authenticationPending")}</Badge>
        ) : (
          <Badge variant="secondary">{t("walletDisconnected")}</Badge>
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
                {isConnected ? t("connected") : t("pending")}
              </Badge>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("connection")}</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {connectorName ?? t("noConnectorSelected")}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300/72">
              {isConnected ? t("walletProviderAttached") : t("connectWalletToStart")}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-300/14 bg-emerald-400/[0.08] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-100">
                <ShieldCheck className="size-5" />
              </div>
              <Badge variant={isAuthenticated ? "success" : "warning"}>
                {isAuthenticated ? t("authenticated") : t("signatureNeeded")}
              </Badge>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("backendSession")}</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {isAuthenticated ? t("protectedRoutesUnlocked") : t("waitingForWalletSignature")}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300/72">
              {t("backendSessionHelper")}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-300/14 bg-amber-400/[0.08] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-400/12 text-amber-100">
                <ArrowRightLeft className="size-5" />
              </div>
              {isOnSupportedChain ? (
                <StatusBadge label={t("fujiReady")} status="CONNECTED" />
              ) : (
                <StatusBadge label={t("wrongNetwork")} status="UNSUPPORTED" />
              )}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("network")}</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {isOnSupportedChain ? t("avalancheFuji") : t("switchRequired")}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300/72">
              {t("networkHelper")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {!isConnected ? (
            <Button disabled={isConnecting} onClick={() => void onConnect()} size="lg" type="button">
              {isConnecting ? <Loader2 className="animate-spin" /> : <Wallet />}
              {isConnecting ? t("connecting") : t("connectWallet")}
            </Button>
          ) : (
            <>
              {!isOnSupportedChain ? (
                <Button onClick={() => void onSwitchChain()} size="lg" type="button" variant="warning">
                  <ArrowRightLeft />
                  {t("switchToFuji")}
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
                  {isAuthenticating ? t("signing") : t("authenticate")}
                </Button>
              ) : null}

              <Button onClick={onDisconnect} size="lg" type="button" variant="secondary">
                <Unplug />
                {t("disconnect")}
              </Button>
            </>
          )}
        </div>

        <Separator className="soft-divider" />

        <div className="grid gap-4 2xl:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-100">
                <Wallet className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("walletAddress")}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/8 bg-slate-950/36 px-4 py-3">
              <p className="break-all text-sm font-semibold text-white sm:text-base">
                {address ?? t("waitingForConnection")}
              </p>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-300/72">
              {t("walletQuickView", {
                address: translateFrontendMessage(formatShortAddress(address)),
              })}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("stateChecklist")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={isConnected ? "success" : "warning"}>{t("checklistConnect")}</Badge>
              <Badge variant={isOnSupportedChain ? "success" : "warning"}>{t("checklistFuji")}</Badge>
              <Badge variant={isAuthenticated ? "success" : "warning"}>{t("checklistSign")}</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300/72">
              {t("allThreeReadyDesc")}
            </p>
          </div>
        </div>

        {sessionError !== null ? (
          <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] p-4 text-sm text-rose-100">
            {translateFrontendMessage(sessionError)}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
