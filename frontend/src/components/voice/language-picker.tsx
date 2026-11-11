"use client";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { VOICE_LANGUAGES } from "@/lib/voice/languages";
import { VOICE_STRINGS } from "@/lib/voice/strings";
import { useVoiceStore } from "@/store/voice-store";

/** Compact language switch (Settings page, voice job card header). */
export function VoiceLanguageSelect({ className }: { className?: string }) {
  const { language, setLanguage } = useVoiceStore();
  return (
    <div className={cn("inline-flex rounded-lg border border-border p-0.5", className)}>
      {VOICE_LANGUAGES.map((l) => (
        <button key={l.code} type="button" onClick={() => setLanguage(l.code)}
          className={cn("px-3 py-1 text-sm rounded-md font-medium transition-colors",
            (language ?? "en") === l.code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
          {l.native}
        </button>
      ))}
    </div>
  );
}

/** Asked once, the first time the app is opened after login. */
export function VoiceLanguagePrompt() {
  const { language, setLanguage } = useVoiceStore();
  if (language) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Languages className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold">{VOICE_STRINGS.en.pickTitle} / {VOICE_STRINGS.hi.pickTitle}</p>
            <p className="text-sm text-muted-foreground mt-1">{VOICE_STRINGS.en.pickSubtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {VOICE_LANGUAGES.map((l) => (
            <button key={l.code} onClick={() => setLanguage(l.code)}
              className="rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 py-4 transition-colors">
              <span className="block text-xl font-bold">{l.native}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{l.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
