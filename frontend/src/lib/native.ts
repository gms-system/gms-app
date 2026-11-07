/**
 * Thin bridge to the Capacitor Android shell (mobile/). The shell injects
 * `window.Capacitor` into this website, so no Capacitor npm packages are
 * needed here. Everything degrades gracefully in a normal browser / PWA.
 */
type CapPlugins = {
  App?: { getInfo: () => Promise<{ version: string; build: string }> };
  Browser?: { open: (o: { url: string }) => Promise<void> };
};

function cap(): { isNativePlatform?: () => boolean; Plugins?: CapPlugins } | undefined {
  return typeof window !== "undefined" ? (window as any).Capacitor : undefined;
}

export function isNativeApp(): boolean {
  return !!cap()?.isNativePlatform?.();
}

/** Installed APK version, e.g. { version: "1.0.3", build: "4" }; null outside the app. */
export async function getNativeAppInfo(): Promise<{ version: string; build: number } | null> {
  const app = cap()?.Plugins?.App;
  if (!isNativeApp() || !app) return null;
  const info = await app.getInfo();
  return { version: info.version, build: Number(info.build) };
}

/** Open a URL outside the app (system browser / the app that handles it, e.g. WhatsApp). */
export async function openExternal(url: string) {
  const absolute = new URL(url, window.location.origin).toString();
  if (isNativeApp()) {
    const browser = cap()?.Plugins?.Browser;
    // Different-host links (wa.me) are handed to Android, which opens WhatsApp.
    // Same-host links (the APK) need the system browser so the download works.
    if (new URL(absolute).host === window.location.host && browser) await browser.open({ url: absolute });
    else window.location.href = absolute;
    return;
  }
  window.open(absolute, "_blank", "noopener");
}
