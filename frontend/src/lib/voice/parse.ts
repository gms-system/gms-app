/**
 * Turns recognizer text (English or Hindi) into clean job card values.
 * Pure functions — no React — so they are easy to test and extend per language.
 */
import type { CatalogData } from "@/store/catalog-store";

export type WorkType = "service" | "repair";

const DEVANAGARI_DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};
const toLatinDigits = (s: string) => s.replace(/[०-९]/g, (d) => DEVANAGARI_DIGITS[d]);

/** Spoken digit words (English + Hindi). Add a language's words here to support it. */
const DIGIT_WORDS: Record<string, string> = {
  zero: "0", oh: "0", o: "0", one: "1", two: "2", to: "2", too: "2", three: "3", four: "4", for: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  "शून्य": "0", "जीरो": "0", "ज़ीरो": "0", "एक": "1", "दो": "2", "तीन": "3", "चार": "4",
  "पांच": "5", "पाँच": "5", "छह": "6", "छः": "6", "छे": "6", "सात": "7", "आठ": "8", "नौ": "9",
};
const REPEAT_WORDS: Record<string, number> = { double: 2, triple: 3, "डबल": 2, "ट्रिपल": 3 };

const TEENS: Record<string, number> = {
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

const tokens = (s: string) => toLatinDigits(s).toLowerCase().replace(/[.,!?;:'"()\-/]+/g, " ").split(/\s+/).filter(Boolean);

/** "nine eight double two 3 ..." → "98223..." */
function spokenToDigits(text: string): string {
  const t = tokens(text);
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const w = t[i];
    const rep = REPEAT_WORDS[w];
    if (rep && i + 1 < t.length) {
      const next = DIGIT_WORDS[t[i + 1]] ?? (/^\d$/.test(t[i + 1]) ? t[i + 1] : "");
      if (next) { out += next.repeat(rep); i++; continue; }
    }
    if (/^\d+$/.test(w)) out += w;
    else if (DIGIT_WORDS[w]) out += DIGIT_WORDS[w];
  }
  return out;
}

// ─── Name ─────────────────────────────────────────────────────────────────────
const NAME_FILLERS = [
  /^(the\s+)?customer('?s)?\s+name\s+(is\s+)?/i, /^(his|her|my)\s+name\s+is\s+/i, /^name\s+(is\s+)?/i, /^it'?s\s+/i,
  /^ग्राहक\s+का\s+नाम\s*/, /^इनका\s+नाम\s*/, /^उनका\s+नाम\s*/, /^मेरा\s+नाम\s*/, /^नाम\s*/,
];
const NAME_TRAILERS = [/\s+(है|हैं|जी|ji|sir)$/i];

export function parseName(text: string): string {
  let s = text.trim().replace(/[.,!?]+$/g, "");
  for (const r of NAME_FILLERS) s = s.replace(r, "");
  for (let i = 0; i < 2; i++) for (const r of NAME_TRAILERS) s = s.replace(r, "");
  return s.trim().split(/\s+/).map((w) => (/^[a-z]/i.test(w) ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(" ");
}

// ─── Mobile ───────────────────────────────────────────────────────────────────
export function parseMobile(text: string): { value: string; valid: boolean } {
  let d = spokenToDigits(text);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return { value: d, valid: /^[6-9]\d{9}$/.test(d) };
}

// ─── Vehicle number ───────────────────────────────────────────────────────────
const LETTER_WORDS: Record<string, string> = {
  ay: "A", eh: "A", bee: "B", be: "B", see: "C", sea: "C", cee: "C", dee: "D", ee: "E", ef: "F", eff: "F",
  gee: "G", aitch: "H", edge: "H", ech: "H", etch: "H", eich: "H", eye: "I", jay: "J", kay: "K", cay: "K",
  el: "L", ell: "L", em: "M", en: "N", pee: "P", pe: "P", queue: "Q", cue: "Q", are: "R", ar: "R",
  es: "S", ess: "S", tee: "T", tea: "T", you: "U", vee: "V", ex: "X", why: "Y", wai: "Y", zed: "Z", zee: "Z",
};

export function parseRegNo(text: string): { value: string; valid: boolean } {
  const t = tokens(text);
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const w = t[i];
    const rep = REPEAT_WORDS[w];
    if (rep && i + 1 < t.length) {
      const n = t[i + 1];
      const unit = DIGIT_WORDS[n] ?? LETTER_WORDS[n] ?? (/^[a-z0-9]$/.test(n) ? n.toUpperCase() : "");
      if (unit) { out += unit.repeat(rep); i++; continue; }
    }
    if (w === "double" && t[i + 1] === "you") { out += "W"; i++; continue; }
    if (TENS[w] !== undefined) {
      const ones = t[i + 1] && DIGIT_WORDS[t[i + 1]] && t[i + 1] !== "zero" ? DIGIT_WORDS[t[i + 1]] : "";
      out += ones ? String(TENS[w] + Number(ones)) : String(TENS[w]);
      if (ones) i++;
      continue;
    }
    if (TEENS[w] !== undefined) { out += String(TEENS[w]); continue; }
    if (DIGIT_WORDS[w]) { out += DIGIT_WORDS[w]; continue; }      // "nine", "नौ"
    if (LETTER_WORDS[w]) { out += LETTER_WORDS[w]; continue; }    // "em", "aitch"
    if (/^[a-z0-9]+$/.test(w)) out += w.toUpperCase();            // "mh12ab1234", "mh", "12", "m"
  }
  const value = out.replace(/[^A-Z0-9]/g, "");
  const valid = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(value) || /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(value);
  return { value, valid };
}

/** "MH12AB1234" → "MH 12 AB 1234" for display */
export function formatRegNo(v: string): string {
  const m = v.match(/^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/);
  return m ? [m[1], m[2], m[3], m[4]].filter(Boolean).join(" ") : v;
}

// ─── Work type ────────────────────────────────────────────────────────────────
const SERVICE_WORDS = ["service", "servicing", "servise", "general", "maintenance", "सर्विस", "सर्विसिंग", "सर्वीस", "सर्विसिं"];
const REPAIR_WORDS = ["repair", "repairing", "fix", "problem", "issue", "breakdown", "damage", "रिपेयर", "रिपेर", "मरम्मत", "ठीक", "खराब", "प्रॉब्लम", "प्रोब्लम"];

export function parseWorkType(text: string): WorkType | null {
  const s = text.toLowerCase();
  const isRepair = REPAIR_WORDS.some((w) => s.includes(w));
  const isService = SERVICE_WORDS.some((w) => s.includes(w));
  if (isRepair && !isService) return "repair";
  if (isService && !isRepair) return "service";
  return null;
}

// ─── Vehicle make + model (matched against the cloud catalog) ────────────────
/** Hindi spellings of common brands/models → English, for typed or Hindi-recognized input. */
const DEVANAGARI_ALIASES: Record<string, string> = {
  "मारुति": "maruti", "मारुती": "maruti", "सुजुकी": "suzuki", "सुज़ुकी": "suzuki", "टाटा": "tata", "महिंद्रा": "mahindra",
  "हुंडई": "hyundai", "हुंडाई": "hyundai", "ह्युंडई": "hyundai", "होंडा": "honda", "टोयोटा": "toyota", "किआ": "kia",
  "बजाज": "bajaj", "हीरो": "hero", "टीवीएस": "tvs", "यामाहा": "yamaha", "रॉयल": "royal", "एनफील्ड": "enfield",
  "ऑल्टो": "alto", "आल्टो": "alto", "स्विफ्ट": "swift", "वैगनआर": "wagonr", "वैगन": "wagon", "डिजायर": "dzire",
  "बलेनो": "baleno", "ब्रेज़ा": "brezza", "ब्रेजा": "brezza", "एर्टिगा": "ertiga", "नेक्सॉन": "nexon", "नेक्सन": "nexon",
  "पंच": "punch", "क्रेटा": "creta", "वेन्यू": "venue", "इनोवा": "innova", "स्कॉर्पियो": "scorpio", "बोलेरो": "bolero",
  "एक्टिवा": "activa", "स्प्लेंडर": "splendor", "पल्सर": "pulsar", "जुपिटर": "jupiter", "क्लासिक": "classic", "शाइन": "shine",
};
const MAKE_ALIASES: Record<string, string[]> = {
  maruti: ["Maruti Suzuki"], suzuki: ["Maruti Suzuki", "Suzuki"], merc: ["Mercedes-Benz"], mercedes: ["Mercedes-Benz"],
  benz: ["Mercedes-Benz"], vw: ["Volkswagen"], enfield: ["Royal Enfield"], re: ["Royal Enfield"], harley: ["Harley-Davidson"],
  landrover: ["Land Rover"], ola: ["Ola Electric"], hm: ["Hindustan Motors"], ambassador: ["Hindustan Motors"],
};
const GENERIC_WORDS = new Set(["motors", "motor", "electric", "motorrad", "land", "royal", "the", "a", "car", "bike", "scooter", "gadi", "गाड़ी"]);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+]/g, "");

export interface VehicleMatch { make: string; model: string; matched: boolean }

export function parseVehicle(text: string, catalog: CatalogData): VehicleMatch {
  const words = toLatinDigits(text).toLowerCase().split(/\s+/).map((w) => DEVANAGARI_ALIASES[w] ?? w)
    .map((w) => w.replace(/[^a-z0-9+]/g, "")).filter(Boolean);
  const joined = words.join("");
  const brands = [...catalog.cars, ...catalog.two_wheelers];

  const mentionedMakes = new Set<string>();
  for (const b of brands) {
    const parts = b.make.toLowerCase().split(/[\s-]+/).filter((p) => p.length >= 2 && !GENERIC_WORDS.has(p));
    if (joined.includes(norm(b.make)) || parts.some((p) => words.includes(norm(p)))) mentionedMakes.add(b.make);
  }
  for (const w of words) MAKE_ALIASES[w]?.forEach((m) => mentionedMakes.add(m));

  let best: { make: string; model: string; score: number } | null = null;
  for (const b of brands) {
    for (const model of b.models) {
      const m = norm(model);
      if (!m) continue;
      // Short names ("Go", "X1", "800") must be a whole spoken word; longer ones may be split ("wagon r").
      const hit = m.length <= 3 ? words.includes(m) : joined.includes(m);
      if (!hit) continue;
      const score = m.length * 10 + (mentionedMakes.has(b.make) ? 50 : 0);
      if (!best || score > best.score) best = { make: b.make, model, score };
    }
  }
  if (best && (mentionedMakes.size === 0 || mentionedMakes.has(best.make))) return { make: best.make, model: best.model, matched: true };

  // Make recognised but model not in the catalog → keep what was said as the model.
  const make = Array.from(mentionedMakes)[0];
  const title = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
  if (make) {
    const makeWords = new Set(make.toLowerCase().split(/[\s-]+/).concat(Object.keys(MAKE_ALIASES).filter((a) => MAKE_ALIASES[a].includes(make))));
    const rest = words.filter((w) => !makeWords.has(w)).join(" ");
    return { make, model: title(rest), matched: false };
  }
  const [first = "", ...rest] = text.trim().split(/\s+/);
  return { make: title(first.toLowerCase()), model: title(rest.join(" ").toLowerCase()), matched: false };
}
