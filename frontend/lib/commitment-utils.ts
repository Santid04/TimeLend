/**
 * This file groups small frontend helpers used by the commitment create and evidence flows.
 * It exists to keep shared parsing and validation logic out of individual UI components.
 * It fits the system by making date-only deadlines and fail-receiver rules consistent across the demo.
 */
"use client";

import { getAddress, isAddress } from "viem";

import { getFrontendRuntimeConfig } from "./env";

const runtimeConfig = getFrontendRuntimeConfig();

export const WEB_OWNER_WALLET = getAddress(runtimeConfig.NEXT_PUBLIC_SYSTEM_FAIL_RECEIVER);

const DATE_ONLY_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * This function parses one `dd/mm/yyyy` input into the ISO and unix deadline values used by the app.
 * It receives the raw browser input from the create-commitment form.
 * It returns a local-midnight ISO string plus the matching unix timestamp.
 * It is important because the UI now hides time completely while the contract and backend still require a timestamp.
 */
export function buildDeadlineFromDateOnly(dateValue: string) {
  const trimmedDateValue = dateValue.trim();
  const match = DATE_ONLY_PATTERN.exec(trimmedDateValue);

  if (match === null) {
    throw new Error("Deadline must use dd/mm/yyyy.");
  }

  const [, dayValue, monthValue, yearValue] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  const deadlineDate = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (
    Number.isNaN(deadlineDate.getTime()) ||
    deadlineDate.getFullYear() !== year ||
    deadlineDate.getMonth() !== month - 1 ||
    deadlineDate.getDate() !== day
  ) {
    throw new Error("Deadline must be a real calendar date.");
  }

  return {
    iso: deadlineDate.toISOString(),
    unix: BigInt(Math.floor(deadlineDate.getTime() / 1_000)),
  };
}

/**
 * This function formats one stored ISO timestamp into the `dd/mm/yyyy` label used by the demo UI.
 * It receives the optional date string returned by the backend.
 * It returns a date-only label or a fallback dash when no date exists.
 * It is important because the product now treats deadlines as date-only information in the interface.
 */
export function formatDateOnly(dateValue: string | null) {
  if (dateValue === null) {
    return "-";
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return [
    String(parsedDate.getDate()).padStart(2, "0"),
    String(parsedDate.getMonth() + 1).padStart(2, "0"),
    String(parsedDate.getFullYear()),
  ].join("/");
}

/**
 * This function validates the fail-receiver input according to the current checkbox mode.
 * It receives the selected checkbox mode, the candidate fail receiver and the connected wallet address.
 * It returns a user-facing error message when the input is invalid, or null when it is valid.
 * It is important because the app must block submissions that would send funds back to the same user wallet.
 */
export function getFailReceiverValidationError(input: {
  failReceiver: string;
  useWebOwnerWallet: boolean;
  walletAddress: string | undefined;
}) {
  if (input.useWebOwnerWallet) {
    return null;
  }

  const trimmedFailReceiver = input.failReceiver.trim();

  if (trimmedFailReceiver.length === 0) {
    return "Provide a fail receiver wallet or enable Use WebOwnerWallet.";
  }

  if (!isAddress(trimmedFailReceiver)) {
    return "Fail receiver must be a valid wallet address.";
  }

  if (
    input.walletAddress !== undefined &&
    getAddress(trimmedFailReceiver) === getAddress(input.walletAddress)
  ) {
    return "Fail receiver must be different from your connected wallet.";
  }

  return null;
}

/**
 * This function resolves the effective fail receiver that will be used on-chain and off-chain.
 * It receives the checkbox mode plus the current fail receiver field value.
 * It returns the normalized wallet address that should be sent to the contract and backend.
 * It is important because the submit flow should not depend on the visual input state when the system-wallet checkbox is enabled.
 */
export function resolveEffectiveFailReceiver(input: {
  failReceiver: string;
  useWebOwnerWallet: boolean;
}) {
  return getAddress(input.useWebOwnerWallet ? WEB_OWNER_WALLET : input.failReceiver.trim());
}
