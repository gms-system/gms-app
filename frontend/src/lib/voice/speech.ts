import { isNativeApp } from "@/lib/native";

/**
 * Speech-to-text, free and on-device:
 *  - GMS Android app : @capgo/capacitor-speech-recognition (Google recognizer, system dialog)
 *  - Browser / PWA   : Web Speech API (Chrome, Edge; not Firefox, limited on iOS Safari)
 */
export type SpeechAvailability = "native" | "web" | "update-app" | "none";

export type SpeechErrorCode = "denied" | "no-match" | "unavailable" | "failed";
export class SpeechError extends Error {
  constructor(public code: SpeechErrorCode, message?: string) {
    super(message ?? code);
  }
}

function nativePlugin(): any {
  return typeof window !== "undefined" ? (window as any).Capacitor?.Plugins?.SpeechRecognition : undefined;
}

function webRecognitionCtor(): any {
  if (typeof window === "undefined") return undefined;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
}

export function speechAvailability(): SpeechAvailability {
  if (typeof window === "undefined") return "none";
  // Older APKs don't contain the speech plugin — the in-app update prompt fixes that.
  if (isNativeApp()) return nativePlugin() ? "native" : "update-app";
  return webRecognitionCtor() ? "web" : "none";
}

let activeWeb: any = null;

/** Listens once and resolves with the recognizer's alternatives (best first). */
export async function listen(locale: string, prompt?: string): Promise<string[]> {
  const mode = speechAvailability();
  if (mode === "native") return listenNative(locale, prompt);
  if (mode === "web") return listenWeb(locale);
  throw new SpeechError("unavailable");
}

export function stopListening() {
  try { activeWeb?.stop(); } catch { /* ignore */ }
  try { nativePlugin()?.stop?.(); } catch { /* ignore */ }
}

async function listenNative(locale: string, prompt?: string): Promise<string[]> {
  const plugin = nativePlugin();
  const perm = await plugin.requestPermissions?.();
  const state = perm?.speechRecognition ?? perm?.microphone;
  if (state && state !== "granted") throw new SpeechError("denied");
  try {
    // popup: Android's own speech dialog — handles silence/timeout and shows a mic animation.
    const res = await plugin.start({ language: locale, maxResults: 5, prompt, popup: true, partialResults: false });
    const matches: string[] = (res?.matches ?? []).filter(Boolean);
    if (!matches.length) throw new SpeechError("no-match");
    return matches;
  } catch (e: any) {
    if (e instanceof SpeechError) throw e;
    const msg = String(e?.message ?? e).toLowerCase();
    if (msg.includes("permission")) throw new SpeechError("denied", msg);
    throw new SpeechError("no-match", msg); // cancelled dialog, no speech, network hiccup
  }
}

function listenWeb(locale: string): Promise<string[]> {
  const Ctor = webRecognitionCtor();
  return new Promise((resolve, reject) => {
    const rec = new Ctor();
    activeWeb = rec;
    rec.lang = locale;
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 5;
    let done = false;
    rec.onresult = (e: any) => {
      done = true;
      const r = e.results[0];
      resolve(Array.from({ length: r.length }, (_, i) => r[i].transcript as string).filter(Boolean));
    };
    rec.onerror = (e: any) => {
      done = true;
      reject(new SpeechError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : "no-match", e.error));
    };
    rec.onend = () => {
      activeWeb = null;
      if (!done) reject(new SpeechError("no-match"));
    };
    rec.start();
  });
}
