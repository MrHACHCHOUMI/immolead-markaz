import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "MAD") {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function fullName(first: string, last: string) {
  return `${first} ${last}`.trim();
}

/** CA société = commission, jamais le prix du bien */
export function calculateCommissionAmount(
  salePrice: number,
  commissionType: "percentage" | "fixed" | "custom_per_unit",
  commissionValue: number
): number {
  if (commissionType === "percentage") {
    return Math.round(salePrice * (commissionValue / 100) * 100) / 100;
  }
  return Math.round(commissionValue * 100) / 100;
}
