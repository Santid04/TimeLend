import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatShortAddress(address: string | undefined, visibleStart = 6, visibleEnd = 4) {
  if (address === undefined) {
    return "Not connected";
  }

  return `${address.slice(0, visibleStart)}...${address.slice(-visibleEnd)}`;
}

export function formatCommitmentStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
