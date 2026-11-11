/**
 * Voice job card languages. To add a regional language later:
 *   1. add an entry here (speechLocale = BCP-47 code the phone recognizer supports, e.g. "mr-IN")
 *   2. add its strings in ./strings.ts and its spoken words in ./parse.ts (digits, work-type words)
 */
export type VoiceLang = "en" | "hi";

export interface VoiceLanguage {
  code: VoiceLang;
  /** Name in English + in the language itself, shown in the picker */
  label: string;
  native: string;
  /** Locale for the speech recognizer */
  speechLocale: string;
}

export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: "en", label: "English", native: "English", speechLocale: "en-IN" },
  { code: "hi", label: "Hindi", native: "हिंदी", speechLocale: "hi-IN" },
];

export const getVoiceLanguage = (code: VoiceLang | null | undefined): VoiceLanguage =>
  VOICE_LANGUAGES.find((l) => l.code === code) ?? VOICE_LANGUAGES[0];

/**
 * Brand names and number plates are spoken in English even by Hindi speakers, and the
 * Hindi recognizer writes them in Devanagari — so those steps always listen in Indian English.
 */
export const ENGLISH_SPEECH_LOCALE = "en-IN";
