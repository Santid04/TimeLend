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
import { useTranslation } from "@/lib/i18n/useTranslation";
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
  const { t, translateFrontendMessage } = useTranslation();
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
            <Badge variant="secondary">{t("guidedCreationFlow")}</Badge>
            <CardTitle className="text-2xl sm:text-3xl">{t("createWithoutClutter")}</CardTitle>
            <CardDescription className="max-w-3xl text-sm sm:text-base">{t("createWithoutClutterDesc")}</CardDescription>
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
                    <Badge variant="outline">{t("step01")}</Badge>
                    <h3 className="font-display text-xl font-semibold text-white">{t("commitmentDetails")}</h3>
                    <p className="text-sm leading-6 text-slate-300/72">
                      {t("commitmentDetailsDesc")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-200">{t("titleLabel")}</span>
                  <Input
                    onChange={(event) => updateValue("title", event.target.value)}
                    placeholder={t("titlePlaceholder")}
                    value={values.title}
                  />
                  <span className="text-xs leading-5 text-slate-500">
                    {t("titleHelper")}
                  </span>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-200">{t("descriptionLabel")}</span>
                  <Textarea
                    onChange={(event) => updateValue("description", event.target.value)}
                    placeholder={t("descriptionPlaceholder")}
                    rows={5}
                    value={values.description}
                  />
                  <span className="text-xs leading-5 text-slate-500">
                    {t("descriptionHelper")}
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
                  <Badge variant="outline">{t("step02")}</Badge>
                  <h3 className="font-display text-xl font-semibold text-white">{t("stakeAndDeadline")}</h3>
                  <p className="text-sm leading-6 text-slate-300/72">
                    {t("stakeAndDeadlineDesc")}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-200">{t("amountAvax")}</span>
                  <Input
                    min="0.001"
                    onChange={(event) => updateValue("amountAvax", event.target.value)}
                    step="0.001"
                    type="number"
                    value={values.amountAvax}
                  />
                  <span className="text-xs leading-5 text-slate-500">
                    {t("amountHelper")}
                  </span>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-200">{t("deadlineLabel")}</span>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      className="pl-11"
                      inputMode="numeric"
                      onChange={(event) => updateValue("deadlineDate", event.target.value)}
                      placeholder={t("deadlinePlaceholder")}
                      value={values.deadlineDate}
                    />
                  </div>
                  <span className="text-xs leading-5 text-slate-500">
                    {t("deadlineHelper")}
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
                  <Badge variant="outline">{t("step03")}</Badge>
                  <h3 className="font-display text-xl font-semibold text-white">{t("failureReceiver")}</h3>
                  <p className="text-sm leading-6 text-slate-300/72">
                    {t("failureReceiverDesc")}
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
                        {t("useSystemFailReceiver")}
                      </span>
                      <span className="block text-xs leading-5 text-slate-500">{WEB_OWNER_WALLET}</span>
                    </span>
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-200">{t("customFailReceiver")}</span>
                  <Input
                    disabled={values.useWebOwnerWallet}
                    onChange={(event) => updateValue("failReceiver", event.target.value)}
                    placeholder={t("customFailReceiverPlaceholder")}
                    value={values.failReceiver}
                  />
                  <span className="text-xs leading-5 text-slate-500">
                    {values.useWebOwnerWallet
                      ? t("failReceiverLocked")
                      : t("failReceiverCustomHelper")}
                  </span>
                </label>
              </div>
            </div>

            {formError !== null ? (
              <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] p-4 text-sm text-rose-100">
                {translateFrontendMessage(formError)}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div>
                <p className="text-sm font-semibold text-white">{t("readyToPublish")}</p>
                <p className="mt-1 text-sm leading-6 text-slate-300/72">
                  {t("readyToPublishDesc")}
                </p>
              </div>

              <Button disabled={!canSubmit || isSubmitting} size="lg" type="submit">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Coins />}
                {isSubmitting ? t("creating") : t("createCommitmentAction")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:sticky xl:top-28 xl:self-start">
        <Card className="glass-noise overflow-hidden rounded-2xl">
          <CardHeader className="space-y-3">
            <Badge variant={canSubmit ? "success" : "warning"}>
              {canSubmit ? t("readyToSubmit") : t("walletGateRequired")}
            </Badge>
            <CardTitle className="text-2xl">{t("liveReview")}</CardTitle>
            <CardDescription>{t("liveReviewDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("titleLabel")}</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {values.title.trim().length > 0 ? values.title : t("addClearTitle")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("stake")}</p>
              <p className="mt-2 text-sm font-semibold text-white">{values.amountAvax} AVAX</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("deadline")}</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {values.deadlineDate.trim().length > 0 ? values.deadlineDate : t("selectDate")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("failureReceiver")}</p>
              <p className="mt-2 break-all text-sm font-semibold text-white">{effectiveFailReceiverLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-white/10 bg-white/[0.04]">
          <CardHeader className="space-y-3">
            <Badge variant="outline">{t("submissionChecklist")}</Badge>
            <CardTitle className="text-xl">{t("beforeYouHitCreate")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-slate-950/28 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-100">
                  <Wallet className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t("connectedWallet")}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {userWalletAddress ?? t("connectAndAuthenticateFirst")}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300/72">
                {t("addressQuickView", {
                  address: translateFrontendMessage(formatShortAddress(userWalletAddress)),
                })}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{t("checklistWalletConnected")}</Badge>
              <Badge variant="secondary">{t("checklistFujiSelected")}</Badge>
              <Badge variant="secondary">{t("checklistFormReviewed")}</Badge>
            </div>

            <p className="text-sm leading-6 text-slate-300/72">
              {t("formReviewDescription")}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
