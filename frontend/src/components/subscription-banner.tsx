"use client";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, XCircle, Phone } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore, atLeastRole } from "@/store/auth-store";

export function SubscriptionBanner() {
  const user = useAuthStore((s) => s.user);

  const { data } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: () => api.get("/settings/subscription").then(r => r.data.data),
    // Check every 6 hours
    staleTime: 6 * 60 * 60 * 1000,
    refetchInterval: 6 * 60 * 60 * 1000,
  });

  // Don't show if no subscription data or everything is fine
  if (!data || (!data.is_expired && !data.is_expiring_soon)) return null;

  const isExpired = data.is_expired;
  const daysLeft = data.days_left;
  const isOwner = atLeastRole(user, "owner");

  return (
    <div className={cn(
      "mx-4 md:mx-6 mt-4 rounded-xl px-4 py-3 flex items-start gap-3",
      isExpired
        ? "bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-800"
        : "bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/40 dark:border-yellow-800"
    )}>
      {isExpired
        ? <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        : <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
      }
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold",
          isExpired ? "text-red-700 dark:text-red-300" : "text-yellow-700 dark:text-yellow-300")}>
          {isExpired
            ? "Subscription Expired"
            : `Subscription expiring in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
          }
        </p>
        <p className={cn("text-xs mt-0.5",
          isExpired ? "text-red-600/80 dark:text-red-400/80" : "text-yellow-600/80 dark:text-yellow-400/80")}>
          {isExpired
            ? `Your ${data.plan} plan expired. Some features may stop working after the grace period.`
            : `Your ${data.plan} plan expires on ${data.subscription_end}. Renew now to avoid interruption.`
          }
          {isOwner && " Contact your GMS provider to renew."}
        </p>
      </div>
      {isOwner && (
        <a href="tel:+91" className={cn(
          "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg shrink-0",
          isExpired
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-yellow-600 text-white hover:bg-yellow-700"
        )}>
          <Phone className="w-3.5 h-3.5" /> Renew
        </a>
      )}
    </div>
  );
}
