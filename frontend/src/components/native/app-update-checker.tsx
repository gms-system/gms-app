"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, X } from "lucide-react";
import { getNativeAppInfo, isNativeApp, openExternal } from "@/lib/native";

interface ApkManifest {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  notes?: string;
  mandatory?: boolean;
}

const WEB_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Two kinds of update:
 *  1. Web content (every platform): the app UI is served by the server, so a new
 *     deployment is picked up on next launch; while open we detect it via
 *     /app-version and offer a one-tap reload.
 *  2. Android shell (APK only): compare the installed build with
 *     /downloads/version.json and prompt to download the new APK.
 */
export function AppUpdateChecker() {
  const [apk, setApk] = useState<ApkManifest | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let notified = false;
    const checkWeb = async () => {
      if (notified || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/app-version", { cache: "no-store" });
        const { build } = await res.json();
        if (build && build !== process.env.NEXT_PUBLIC_BUILD_ID) {
          notified = true;
          toast("A new version of GMS is available", {
            duration: Infinity,
            action: { label: "Update now", onClick: () => window.location.reload() },
          });
        }
      } catch { /* offline */ }
    };

    const checkApk = async () => {
      if (!isNativeApp()) return;
      try {
        const [info, res] = await Promise.all([getNativeAppInfo(), fetch("/downloads/version.json", { cache: "no-store" })]);
        const manifest: ApkManifest = await res.json();
        if (info && manifest.versionCode > info.build) setApk(manifest);
      } catch { /* offline or no manifest yet */ }
    };

    const runAll = () => { checkWeb(); checkApk(); };
    runAll();
    const timer = setInterval(checkWeb, WEB_CHECK_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") runAll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  if (!apk || (dismissed && !apk.mandatory)) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Update available — v{apk.versionName}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {apk.notes || "A new version of the GMS app is ready to install."}
            </p>
          </div>
          {!apk.mandatory && (
            <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => openExternal(apk.apkUrl)}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90"
        >
          Download &amp; install
        </button>
        {!apk.mandatory && (
          <button onClick={() => setDismissed(true)} className="w-full py-2 text-sm rounded-xl border border-border hover:bg-muted">
            Later
          </button>
        )}
      </div>
    </div>
  );
}
