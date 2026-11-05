import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const JOB_CARD_STATUS_LABELS: Record<string, string> = {
  received: "Received",
  work_in_progress: "Work In Progress",
  quality_check: "Quality Check",
  ready_for_delivery: "Ready for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const JOB_CARD_STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  work_in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  quality_check: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  ready_for_delivery: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  delivered: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const ITEM_CATEGORY_LABELS: Record<string, string> = {
  spare_part: "Spare Part",
  lubricant: "Lubricant",
  paint: "Paint",
  consumable: "Consumable",
  external: "External",
  tool: "Tool",
  labour: "Labour",
};

export const FUEL_TYPE_LABELS: Record<string, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  cng: "CNG",
  electric: "Electric",
  hybrid: "Hybrid",
  lpg: "LPG",
};

export const EMPLOYEE_ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  service_advisor: "Service Advisor",
  technician: "Technician",
  receptionist: "Receptionist",
  store_manager: "Store Manager",
};
