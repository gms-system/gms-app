import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VoiceLang } from "@/lib/voice/languages";
import { VOICE_STRINGS } from "@/lib/voice/strings";

interface VoiceState {
  /** null until the user picks one on first launch */
  language: VoiceLang | null;
  setLanguage: (l: VoiceLang) => void;
}

export const useVoiceStore = create<VoiceState>()(
  persist(
    (set) => ({ language: null, setLanguage: (language) => set({ language }) }),
    { name: "gms-voice" }
  )
);

export function useVoiceStrings() {
  const lang = useVoiceStore((s) => s.language) ?? "en";
  return { lang, t: VOICE_STRINGS[lang] };
}
