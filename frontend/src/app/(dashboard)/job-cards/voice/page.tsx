"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, Mic, Pencil, Wrench, Settings2, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCatalog } from "@/store/catalog-store";
import { useVoiceStrings } from "@/store/voice-store";
import { getVoiceLanguage, ENGLISH_SPEECH_LOCALE } from "@/lib/voice/languages";
import { listen, speechAvailability, SpeechError, type SpeechAvailability } from "@/lib/voice/speech";
import { parseName, parseMobile, parseRegNo, parseVehicle, parseWorkType, formatRegNo, type WorkType } from "@/lib/voice/parse";
import { VoiceLanguageSelect } from "@/components/voice/language-picker";

const STEPS = ["customer_name", "mobile", "vehicle", "registration_number", "work_type"] as const;
type Step = (typeof STEPS)[number];

interface Values {
  customer_name: string;
  mobile: string;
  make: string;
  model: string;
  registration_number: string;
  work_type: WorkType | null;
}
const EMPTY: Values = { customer_name: "", mobile: "", make: "", model: "", registration_number: "", work_type: null };

export default function VoiceJobCardPage() {
  const router = useRouter();
  const { lang, t } = useVoiceStrings();
  const catalog = useCatalog();
  const [stepIdx, setStepIdx] = useState(0);             // STEPS.length = review
  const [values, setValues] = useState<Values>(EMPTY);
  const [transcript, setTranscript] = useState<Partial<Record<Step, string>>>({});
  const [vehicleMatched, setVehicleMatched] = useState(true);
  const [listening, setListening] = useState(false);
  const [autoListen, setAutoListen] = useState(false);   // chain steps after a spoken answer
  const [availability, setAvailability] = useState<SpeechAvailability>("none");
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());

  useEffect(() => setAvailability(speechAvailability()), []);

  const step: Step | "review" = stepIdx < STEPS.length ? STEPS[stepIdx] : "review";
  const set = (patch: Partial<Values>) => setValues((v) => ({ ...v, ...patch }));

  const mobileOk = parseMobile(values.mobile).valid;
  const regOk = parseRegNo(values.registration_number).valid;
  const stepValid: Record<Step, boolean> = {
    customer_name: values.customer_name.trim().length > 0,
    mobile: mobileOk,
    vehicle: !!values.make.trim() && !!values.model.trim(),
    registration_number: values.registration_number.replace(/[^A-Z0-9]/gi, "").length >= 4,
    work_type: !!values.work_type,
  };

  /** Applies recognizer alternatives to the current step; returns true if the answer is usable. */
  function applySpeech(s: Step, alts: string[]): boolean {
    const best = alts[0];
    setTranscript((tr) => ({ ...tr, [s]: best }));
    switch (s) {
      case "customer_name": set({ customer_name: parseName(best) }); return !!parseName(best);
      case "mobile": {
        const ok = alts.map(parseMobile).find((m) => m.valid) ?? parseMobile(best);
        set({ mobile: ok.value }); return ok.valid;
      }
      case "vehicle": {
        const m = alts.map((a) => parseVehicle(a, catalog)).find((v) => v.matched) ?? parseVehicle(best, catalog);
        set({ make: m.make, model: m.model }); setVehicleMatched(m.matched); return !!(m.make && m.model);
      }
      case "registration_number": {
        const r = alts.map(parseRegNo).find((x) => x.valid) ?? parseRegNo(best);
        set({ registration_number: r.value }); return r.valid;
      }
      case "work_type": {
        const w = alts.map(parseWorkType).find(Boolean) ?? null;
        if (w) set({ work_type: w }); return !!w;
      }
    }
  }

  async function speak() {
    if (step === "review" || listening) return;
    const s = step;
    const locale = s === "vehicle" || s === "registration_number" ? ENGLISH_SPEECH_LOCALE : getVoiceLanguage(lang).speechLocale;
    setListening(true);
    try {
      const alts = await listen(locale, t.q[s]);
      if (applySpeech(s, alts)) {
        setAutoListen(true);
        setTimeout(() => setStepIdx((i) => (STEPS[i] === s ? i + 1 : i)), 700);
      } else {
        toast.warning(t.didntCatch);
      }
    } catch (e) {
      setAutoListen(false);
      const code = e instanceof SpeechError ? e.code : "failed";
      toast.error(code === "denied" ? t.micDenied : code === "unavailable" ? t.noSpeech : t.didntCatch);
    } finally {
      setListening(false);
    }
  }

  // Hands-free: after a spoken answer moves to the next step, start listening again.
  useEffect(() => {
    if (autoListen && step !== "review" && !listening && (availability === "native" || availability === "web")) {
      const id = setTimeout(speak, 400);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  const goto = (i: number) => { setAutoListen(false); setStepIdx(i); };

  // ── Review: default work for the chosen type / vehicle ──
  const { data: defaults, isFetching: loadingDefaults } = useQuery({
    queryKey: ["default-work", values.work_type, values.make, values.model],
    queryFn: () => api.get("/job-cards/default-work", {
      params: { work_type: values.work_type, make: values.make, model: values.model },
    }).then((r) => r.data.data as { label: string; items: string[] }),
    enabled: step === "review" && !!values.work_type,
  });
  useEffect(() => setUnchecked(new Set()), [defaults]);

  const create = useMutation({
    mutationFn: () => api.post("/job-cards/quick", {
      customer_name: values.customer_name.trim(),
      mobile: parseMobile(values.mobile).value,
      vehicle_make: values.make.trim(),
      vehicle_model: values.model.trim(),
      registration_number: values.registration_number,
      work_type: values.work_type,
      work_items: (defaults?.items ?? []).filter((i) => !unchecked.has(i)),
      source: Object.keys(transcript).length ? "voice" : "quick",
      language: getVoiceLanguage(lang).speechLocale,
      transcript,
    }).then((r) => r.data.data),
    onSuccess: (jc) => {
      toast.success(`${t.created} — ${jc.job_card_number}`);
      if (jc.existing_vehicle) toast.info(t.existingVehicle);
      else if (jc.existing_customer) toast.info(t.existingCustomer);
      router.push(`/job-cards/${jc.id}`);
    },
    onError: (e: any) => {
      const d = e.response?.data?.detail;
      toast.error(typeof d === "string" ? d : Array.isArray(d) ? d.map((x: any) => x.msg).join(", ") : "Could not create job card");
    },
  });

  const makes = useMemo(() => Array.from(new Set([...catalog.cars, ...catalog.two_wheelers].map((b) => b.make))).sort(), [catalog]);
  const models = useMemo(() => [...catalog.cars, ...catalog.two_wheelers].filter((b) => b.make === values.make).flatMap((b) => b.models), [catalog, values.make]);
  const now = new Date();
  const inputCls = "w-full px-4 py-3 text-lg border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring";
  const canSpeak = availability === "native" || availability === "web";

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-accent text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2"><Mic className="w-5 h-5 text-primary" /> {t.title}</h1>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
        <VoiceLanguageSelect />
      </div>

      {/* Progress */}
      <div className="flex gap-1.5">
        {[...STEPS, "review"].map((s, i) => (
          <div key={s} className={cn("h-1.5 flex-1 rounded-full", i <= stepIdx ? "bg-primary" : "bg-muted")} />
        ))}
      </div>

      {availability === "update-app" && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 p-3 text-sm dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {t.updateApp}
        </div>
      )}
      {availability === "none" && (
        <div className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground"><AlertTriangle className="w-4 h-4 shrink-0" /> {t.noSpeech}</div>
      )}

      {step !== "review" ? (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t.stepOf(stepIdx + 1, STEPS.length)} · {t.label[step]}</p>
            <p className="text-lg font-semibold mt-1">{t.q[step]}</p>
          </div>

          {canSpeak && (
            <div className="flex flex-col items-center gap-2 py-2">
              <button onClick={speak} disabled={listening}
                className={cn("w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all",
                  listening ? "bg-red-500 text-white animate-pulse scale-105" : "bg-primary text-primary-foreground hover:scale-105")}>
                <Mic className="w-10 h-10" />
              </button>
              <p className="text-sm text-muted-foreground">{listening ? t.listening : t.tapToSpeak}</p>
              {transcript[step] && <p className="text-xs text-muted-foreground italic">“{transcript[step]}”</p>}
            </div>
          )}

          <div className="space-y-2">
            {canSpeak && <p className="text-xs text-muted-foreground text-center">{t.typeInstead}</p>}
            {step === "customer_name" && (
              <input autoComplete="off" value={values.customer_name} onChange={(e) => set({ customer_name: e.target.value })} className={inputCls} />
            )}
            {step === "mobile" && (
              <>
                <input inputMode="numeric" value={values.mobile} maxLength={14}
                  onChange={(e) => set({ mobile: e.target.value.replace(/[^\d+ ]/g, "") })} className={inputCls} />
                {values.mobile && !mobileOk && <p className="text-xs text-red-600">{t.invalidMobile}</p>}
              </>
            )}
            {step === "vehicle" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">{t.make}</label>
                  <input list="voice-makes" value={values.make} onChange={(e) => { set({ make: e.target.value }); setVehicleMatched(true); }} className={inputCls} />
                  <datalist id="voice-makes">{makes.map((m) => <option key={m} value={m} />)}</datalist>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t.model}</label>
                  <input list="voice-models" value={values.model} onChange={(e) => { set({ model: e.target.value }); setVehicleMatched(true); }} className={inputCls} />
                  <datalist id="voice-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
                </div>
                {!vehicleMatched && values.make && <p className="col-span-2 text-xs text-amber-600">{t.notInCatalog}</p>}
              </div>
            )}
            {step === "registration_number" && (
              <>
                <input autoCapitalize="characters" value={formatRegNo(values.registration_number)}
                  onChange={(e) => set({ registration_number: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                  className={cn(inputCls, "font-mono tracking-wider uppercase")} />
                {values.registration_number && !regOk && <p className="text-xs text-amber-600">{t.invalidReg}</p>}
              </>
            )}
            {step === "work_type" && (
              <div className="grid grid-cols-2 gap-3">
                {(["service", "repair"] as const).map((w) => (
                  <button key={w} type="button" onClick={() => set({ work_type: w })}
                    className={cn("rounded-xl border-2 py-5 flex flex-col items-center gap-1.5 font-semibold transition-colors",
                      values.work_type === w ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")}>
                    {w === "service" ? <Settings2 className="w-6 h-6" /> : <Wrench className="w-6 h-6" />}
                    {t[w]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => goto(Math.max(0, stepIdx - 1))} disabled={stepIdx === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-border hover:bg-muted disabled:opacity-40">
              <ArrowLeft className="w-4 h-4" /> {t.back}
            </button>
            <button onClick={() => goto(stepIdx + 1)} disabled={!stepValid[step]}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-40">
              {t.next} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-lg">{t.reviewTitle}</h2>
          <dl className="divide-y divide-border text-sm">
            {([
              ["customer_name", values.customer_name],
              ["mobile", parseMobile(values.mobile).value],
              ["vehicle", `${values.make} ${values.model}`],
              ["registration_number", formatRegNo(values.registration_number)],
              ["work_type", values.work_type ? t[values.work_type] : ""],
            ] as [Step, string][]).map(([s, v]) => (
              <div key={s} className="flex items-center gap-3 py-2.5">
                <dt className="w-32 shrink-0 text-muted-foreground">{t.label[s]}</dt>
                <dd className={cn("flex-1 font-medium", s === "registration_number" && "font-mono")}>{v}</dd>
                <button onClick={() => goto(STEPS.indexOf(s))} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title={t.edit}>
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3 py-2.5">
              <dt className="w-32 shrink-0 text-muted-foreground">{t.dateTime}</dt>
              <dd className="flex-1 font-medium">{now.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</dd>
            </div>
          </dl>

          <div>
            <p className="text-sm font-medium">{t.defaultWork}{defaults && <span className="text-muted-foreground font-normal"> — {defaults.label}</span>}</p>
            <p className="text-xs text-muted-foreground mb-2">{t.defaultWorkHint}</p>
            {loadingDefaults ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : (
              <ul className="space-y-1.5">
                {(defaults?.items ?? []).map((item) => {
                  const on = !unchecked.has(item);
                  return (
                    <li key={item}>
                      <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                        <input type="checkbox" checked={on} className="w-4 h-4 accent-[hsl(var(--primary))]"
                          onChange={() => setUnchecked((u) => { const n = new Set(u); on ? n.add(item) : n.delete(item); return n; })} />
                        <span className={cn(!on && "line-through text-muted-foreground")}>{item}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => goto(STEPS.length - 1)} className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-border hover:bg-muted">
              <ArrowLeft className="w-4 h-4" /> {t.back}
            </button>
            <button onClick={() => create.mutate()} disabled={create.isPending || !STEPS.every((s) => stepValid[s])}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50">
              {create.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.creating}</> : <><Check className="w-4 h-4" /> {t.create}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
