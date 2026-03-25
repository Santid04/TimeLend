"use client";

import { useState } from "react";
import {
  CalendarDays,
  Coins,
  Loader2,
  ScrollText,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import { getFailReceiverValidationError, WEB_OWNER_WALLET } from "@/lib/commitment-utils";
import type { CreateCommitmentFormValues } from "@/types/frontend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatShortAddress } from "@/lib/utils";

type CommitmentCreateFormProps = {
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: (values: CreateCommitmentFormValues) => Promise<void>;
  userWalletAddress: string | undefined;
};

const initialValues: CreateCommitmentFormValues = {
  amountAvax: "0.01",
  deadlineDate: "",
  description: "",
  failReceiver: WEB_OWNER_WALLET,
  title: "",
  useWebOwnerWallet: true,
};

export function CommitmentCreateForm({
  canSubmit,
  isSubmitting,
  onSubmit,
  userWalletAddress,
}: CommitmentCreateFormProps) {
  const [values, setValues] = useState<CreateCommitmentFormValues>(initialValues);
  const [formError, setFormError] = useState<string | null>(null);
  const effectiveFailReceiverLabel = values.useWebOwnerWallet
    ? WEB_OWNER_WALLET
    : values.failReceiver.trim().length > 0
      ? values.failReceiver
      : "Set a custom fail receiver";

  function updateValue(field: keyof CreateCommitmentFormValues, value: string) {
    setFormError(null);
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function toggleUseWebOwnerWallet(useWebOwnerWallet: boolean) {
    setFormError(null);
    setValues((currentValues) => ({
      ...currentValues,
      failReceiver: useWebOwnerWallet
        ? WEB_OWNER_WALLET
        : currentValues.failReceiver === WEB_OWNER_WALLET
          ? ""
          : currentValues.failReceiver,
      useWebOwnerWallet,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (
      values.title.trim().length === 0 ||
      values.description.trim().length === 0 ||
      values.deadlineDate.trim().length === 0
    ) {
      setFormError("Complete title, description and deadline before submitting.");
      return;
    }

    const failReceiverError = getFailReceiverValidationError({
      failReceiver: values.failReceiver,
      useWebOwnerWallet: values.useWebOwnerWallet,
      walletAddress: userWalletAddress,
    });

    if (failReceiverError !== null) {
      setFormError(failReceiverError);
      return;
    }

    try {
      await onSubmit(values);
      setValues(initialValues);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to create the commitment.");
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]" id="create-panel">
      <Card className="glass-noise overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-white/8 pb-5">
          <div className="space-y-3">
            <Badge variant="secondary">Guided creation flow</Badge>
            <CardTitle className="text-2xl sm:text-3xl">Create a commitment without the clutter</CardTitle>
            <CardDescription className="max-w-3xl text-sm sm:text-base">
              The logic stays exactly the same: create the escrow on-chain first, then register the
              backend record. This version just makes the steps easier to scan and review.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-100">
                    <ScrollText className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline">Step 01</Badge>
                    <h3 className="font-display text-xl font-semibold text-white">Commitment details</h3>
                    <p className="text-sm leading-6 text-slate-300/72">
                      Give the promise a clear title and describe what evidence should prove it later.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-200">Title</span>
                  <Input
                    onChange={(event) => updateValue("title", event.target.value)}
                    placeholder="Morning workout streak"
                    value={values.title}
                  />
                  <span className="text-xs leading-5 text-slate-500">
                    Keep it short and outcome-oriented.
                  </span>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-200">Description</span>
                  <Textarea
                    onChange={(event) => updateValue("description", event.target.value)}
                    placeholder="Describe the proof that should convince the verifier you completed the goal."
                    rows={5}
                    value={values.description}
                  />
                  <span className="text-xs leading-5 text-slate-500">
                    This is what the verifier will evaluate against your evidence later.
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-400/12 text-indigo-100">
                  <Coins className="size-5" />
                </div>
                <div className="space-y-2">
                  <Badge variant="outline">Step 02</Badge>
                  <h3 className="font-display text-xl font-semibold text-white">Stake and deadline</h3>
                  <p className="text-sm leading-6 text-slate-300/72">
                    Set the amount at risk and the date the protocol should judge against.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-200">Amount (AVAX)</span>
                  <Input
                    min="0.001"
                    onChange={(event) => updateValue("amountAvax", event.target.value)}
                    step="0.001"
                    type="number"
                    value={values.amountAvax}
                  />
                  <span className="text-xs leading-5 text-slate-500">
                    Funds are locked on-chain once you create the commitment.
                  </span>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-200">Deadline</span>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      className="pl-11"
                      inputMode="numeric"
                      onChange={(event) => updateValue("deadlineDate", event.target.value)}
                      placeholder="dd/mm/yyyy"
                      value={values.deadlineDate}
                    />
                  </div>
                  <span className="text-xs leading-5 text-slate-500">
                    Use `dd/mm/yyyy`. The system keeps time fixed to 00:00.
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-400/12 text-amber-100">
                  <ShieldAlert className="size-5" />
                </div>
                <div className="space-y-2">
                  <Badge variant="outline">Step 03</Badge>
                  <h3 className="font-display text-xl font-semibold text-white">Failure receiver</h3>
                  <p className="text-sm leading-6 text-slate-300/72">
                    Choose whether failed settlements route to the configured system wallet or a custom
                    address.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={values.useWebOwnerWallet}
                      onCheckedChange={(checked) => toggleUseWebOwnerWallet(Boolean(checked))}
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-medium text-slate-100">
                        Use system fail receiver
                      </span>
                      <span className="block text-xs leading-5 text-slate-500">{WEB_OWNER_WALLET}</span>
                    </span>
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-200">Custom fail receiver</span>
                  <Input
                    disabled={values.useWebOwnerWallet}
                    onChange={(event) => updateValue("failReceiver", event.target.value)}
                    placeholder="0x..."
                    value={values.failReceiver}
                  />
                  <span className="text-xs leading-5 text-slate-500">
                    {values.useWebOwnerWallet
                      ? "Locked to the system fail receiver."
                      : "Use a valid wallet address different from your connected wallet."}
                  </span>
                </label>
              </div>
            </div>

            {formError !== null ? (
              <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] p-4 text-sm text-rose-100">
                {formError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div>
                <p className="text-sm font-semibold text-white">Ready to publish</p>
                <p className="mt-1 text-sm leading-6 text-slate-300/72">
                  Submission creates the escrow on-chain and then syncs the backend record.
                </p>
              </div>

              <Button disabled={!canSubmit || isSubmitting} size="lg" type="submit">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Coins />}
                {isSubmitting ? "Creating..." : "Create commitment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:sticky xl:top-28 xl:self-start">
        <Card className="glass-noise overflow-hidden rounded-2xl">
          <CardHeader className="space-y-3">
            <Badge variant={canSubmit ? "success" : "warning"}>
              {canSubmit ? "Ready to submit" : "Wallet gate required"}
            </Badge>
            <CardTitle className="text-2xl">Live review</CardTitle>
            <CardDescription>
              A compact summary of what will be sent through the unchanged create flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Title</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {values.title.trim().length > 0 ? values.title : "Add a clear title"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Stake</p>
              <p className="mt-2 text-sm font-semibold text-white">{values.amountAvax} AVAX</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Deadline</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {values.deadlineDate.trim().length > 0 ? values.deadlineDate : "Select a date"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Fail receiver</p>
              <p className="mt-2 break-all text-sm font-semibold text-white">{effectiveFailReceiverLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-white/10 bg-white/[0.04]">
          <CardHeader className="space-y-3">
            <Badge variant="outline">Submission checklist</Badge>
            <CardTitle className="text-xl">Before you hit create</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-slate-950/28 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-100">
                  <Wallet className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Connected wallet</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {userWalletAddress ?? "Connect and authenticate first"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300/72">
                Quick view: {formatShortAddress(userWalletAddress)}.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">1. Wallet connected</Badge>
              <Badge variant="secondary">2. Fuji selected</Badge>
              <Badge variant="secondary">3. Form reviewed</Badge>
            </div>

            <p className="text-sm leading-6 text-slate-300/72">
              The form keeps the same backend and contract behavior, but the information is grouped so
              the final review is faster and less error-prone.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
