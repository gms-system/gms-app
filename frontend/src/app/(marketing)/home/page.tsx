import type { Metadata } from "next";
import Link from "next/link";
import {
  Wrench, ClipboardList, Receipt, Package, Users, Bell, BarChart3,
  Clock, ShoppingCart, ShieldCheck, Smartphone, Languages, MessageCircle,
  CheckCircle2, Star, ArrowRight, MapPin, Phone, Mail, Facebook,
  Instagram, Youtube, Linkedin, IndianRupee, Zap, FileText, TrendingUp,
} from "lucide-react";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { VideoSection } from "@/components/marketing/video-section";

export const metadata: Metadata = {
  title: "GMS — Garage Management Software for Indian Workshops",
  description:
    "GMS is India's simple garage management software. Digital job cards, GST billing, inventory, WhatsApp invoices, service reminders & reports. Start a 3-month free trial.",
};

const STATS = [
  { value: "12,000+", label: "Garages onboarded" },
  { value: "₹180 Cr+", label: "Invoices generated" },
  { value: "28", label: "States covered" },
  { value: "4.8★", label: "Average rating" },
];

const FEATURES = [
  { icon: ClipboardList, title: "Digital Job Cards", desc: "Create job cards for new or returning customers in seconds. Capture complaints, odometer, fuel level and assign a technician.", accent: "sky" },
  { icon: Receipt, title: "GST & Non-GST Billing", desc: "Generate professional, GST-compliant invoices with your garage logo and share the PDF on WhatsApp in one tap.", accent: "yellow" },
  { icon: Package, title: "Inventory & Stock", desc: "Track every spare part, get low-stock alerts and know exactly what was used, what's left and what to reorder.", accent: "sky" },
  { icon: ShoppingCart, title: "Purchase Orders", desc: "Raise purchase orders to suppliers, record bills and keep vendor balances accurate without any paperwork.", accent: "yellow" },
  { icon: Users, title: "Customer & Vehicle History", desc: "A complete database of customers with full service history of every vehicle — recall any record instantly.", accent: "sky" },
  { icon: Bell, title: "Service Reminders", desc: "Automatic SMS & WhatsApp service-due reminders bring customers back to your workshop, not your competitor.", accent: "yellow" },
  { icon: FileText, title: "Estimates & Quotes", desc: "Send transparent repair estimates for approval before work begins and convert them into job cards instantly.", accent: "sky" },
  { icon: Clock, title: "Staff Attendance", desc: "Mark daily attendance and track each mechanic's output to improve productivity with real data.", accent: "yellow" },
  { icon: BarChart3, title: "Reports & Insights", desc: "Daily, weekly and monthly reports on revenue, expenses and profit so you always know your garage's health.", accent: "sky" },
];

const HIGHLIGHTS = [
  { icon: Smartphone, title: "Works on any phone", desc: "Install it like an app on a basic Android phone or use it on the web. Your workshop floor is not a desk." },
  { icon: Languages, title: "Made for India", desc: "Built for how Indian garages actually run — two-wheeler, three-wheeler, four-wheeler and commercial." },
  { icon: MessageCircle, title: "WhatsApp first", desc: "Job cards, estimates and invoices go straight to your customer's WhatsApp in a single tap." },
  { icon: ShieldCheck, title: "Safe & multi-user", desc: "Role-based access for owner, manager, advisor and technician. Your data stays private and backed up." },
];

const GALLERY = [
  { title: "Dashboard", desc: "Today's revenue, open job cards & pending bills at a glance", icon: TrendingUp, accent: "from-sky-500 to-indigo-600" },
  { title: "Job Cards", desc: "Track every vehicle from check-in to delivery", icon: ClipboardList, accent: "from-yellow-300 to-amber-500" },
  { title: "GST Invoice", desc: "Clean, branded, tax-ready bills in seconds", icon: Receipt, accent: "from-emerald-400 to-sky-500" },
  { title: "Inventory", desc: "Live stock levels with low-stock alerts", icon: Package, accent: "from-sky-400 to-cyan-500" },
  { title: "Customers", desc: "Full history for every customer & vehicle", icon: Users, accent: "from-amber-400 to-orange-500" },
  { title: "Reports", desc: "Know your profit down to the last rupee", icon: BarChart3, accent: "from-indigo-500 to-sky-500" },
];

const PLANS = [
  {
    name: "Free Trial",
    badge: "3 Months Free",
    price: "₹0",
    period: "for 3 months",
    tagline: "Experience everything, risk-free.",
    highlighted: false,
    cta: "Start Free Trial",
    features: ["All core features unlocked", "Unlimited job cards & invoices", "1 user account", "WhatsApp invoice sharing", "No credit card required"],
  },
  {
    name: "Single User",
    badge: "Most Popular",
    price: "₹999",
    period: "per month",
    tagline: "Perfect for owner-run garages.",
    highlighted: true,
    cta: "Choose Single User",
    features: ["Everything in Free Trial", "1 user account", "GST & non-GST billing", "Inventory & purchase orders", "Service reminders (SMS/WhatsApp)", "Priority phone support"],
  },
  {
    name: "Multi User",
    badge: "For Teams",
    price: "₹2,999",
    period: "per month",
    tagline: "For busy, multi-staff workshops.",
    highlighted: false,
    cta: "Choose Multi User",
    features: ["Everything in Single User", "Unlimited staff accounts", "Role-based access control", "Staff attendance & productivity", "Advanced reports & insights", "Dedicated account manager"],
  },
];

const TESTIMONIALS = [
  { name: "Imran Shaikh", role: "Shaikh Auto Works, Pune", quote: "Billing used to take me 20 minutes per customer. With GMS I hand over a GST invoice on WhatsApp before the customer leaves the counter." },
  { name: "Ramesh Patil", role: "Balaji Motors, Nashik", quote: "Service reminders alone brought back dozens of old customers. My garage is busier than it has been in years." },
  { name: "Sandeep Verma", role: "Verma Car Care, Nagpur", quote: "I can see every mechanic's work and my daily profit from my phone. No more guessing, no more paper registers." },
];

function accentClasses(accent: string) {
  return accent === "yellow"
    ? { ring: "ring-yellow-200", bg: "bg-yellow-100", text: "text-amber-600" }
    : { ring: "ring-sky-200", bg: "bg-sky-100", text: "text-sky-600" };
}

export default function HomePage() {
  return (
    <div id="top" className="min-h-screen scroll-smooth bg-white text-slate-900">
      <MarketingNavbar />

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-32 sm:pb-28">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-white" />
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="absolute -right-16 top-32 h-72 w-72 rounded-full bg-yellow-200/50 blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-1.5 text-sm font-semibold text-sky-700 shadow-sm">
              <Zap className="h-4 w-4 text-yellow-500" />
              India's simplest garage software
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Run your garage from your{" "}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">phone</span>
                <span className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-yellow-300/70" />
              </span>
              , not from paper.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-600">
              Digital job cards, GST billing, inventory, service reminders and
              reports — everything an Indian workshop needs, in one easy app.
              Get started in under 2 minutes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-sky-500/30 transition-all hover:bg-sky-600 hover:shadow-xl"
              >
                Start 3-Month Free Trial <ArrowRight className="h-5 w-5" />
              </a>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-6 py-3.5 text-base font-bold text-slate-800 transition-colors hover:border-sky-300 hover:text-sky-600"
              >
                Login to GMS
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-sky-500" /> No credit card</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-sky-500" /> Cancel anytime</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-sky-500" /> Hindi & English</span>
            </div>
          </div>

          {/* Hero mock dashboard */}
          <div className="relative">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/40">
              <div className="rounded-2xl bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500">
                      <Wrench className="h-4 w-4 text-white" />
                    </span>
                    <span className="text-sm font-bold text-white">GMS Dashboard</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300">Live</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { k: "Today's Revenue", v: "₹42,850", c: "text-yellow-300" },
                    { k: "Open Job Cards", v: "14", c: "text-sky-300" },
                    { k: "Pending Bills", v: "6", c: "text-amber-300" },
                    { k: "Low Stock Items", v: "3", c: "text-rose-300" },
                  ].map((s) => (
                    <div key={s.k} className="rounded-xl bg-slate-800 p-3">
                      <p className="text-[11px] text-slate-400">{s.k}</p>
                      <p className={`mt-1 text-lg font-bold ${s.c}`}>{s.v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl bg-slate-800 p-3">
                  <p className="text-[11px] text-slate-400">This week's revenue</p>
                  <div className="mt-2 flex h-16 items-end gap-1.5">
                    {[40, 65, 50, 80, 60, 95, 75].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-sky-500 to-yellow-300" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Floating invoice card */}
            <div className="absolute -bottom-5 -left-5 hidden w-48 rotate-[-6deg] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:block">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-300"><Receipt className="h-4 w-4 text-slate-900" /></span>
                <div>
                  <p className="text-xs font-bold text-slate-900">Invoice sent</p>
                  <p className="text-[10px] text-slate-500">via WhatsApp ✓</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold text-sky-600 sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-sky-100 px-4 py-1 text-sm font-semibold text-sky-700">Everything in one place</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Powerful features, made simple</h2>
            <p className="mt-4 text-lg text-slate-600">From the first job card to the final invoice, GMS handles your entire garage workflow so you can focus on the vehicles.</p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const a = accentClasses(f.accent);
              return (
                <div key={f.title} className={`group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ring-1 ${a.ring} transition-all hover:-translate-y-1 hover:shadow-lg`}>
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${a.bg}`}>
                    <f.icon className={`h-6 w-6 ${a.text}`} />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Highlights banner */}
          <div className="mt-16 grid gap-6 rounded-3xl bg-gradient-to-r from-sky-500 to-sky-600 p-8 sm:grid-cols-2 lg:grid-cols-4 lg:p-10">
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} className="text-white">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  <h.icon className="h-5 w-5 text-yellow-300" />
                </span>
                <h3 className="mt-3 text-base font-bold">{h.title}</h3>
                <p className="mt-1 text-sm text-sky-50/90">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ GALLERY ============ */}
      <section id="gallery" className="scroll-mt-20 bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-yellow-200 px-4 py-1 text-sm font-semibold text-amber-700">A peek inside</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">See GMS in action</h2>
            <p className="mt-4 text-lg text-slate-600">A clean, modern interface your whole team can pick up in minutes — no training needed.</p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {GALLERY.map((g) => (
              <div key={g.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg">
                <div className={`relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br ${g.accent}`}>
                  <g.icon className="h-16 w-16 text-white/90" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-slate-900">{g.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ VIDEOS ============ */}
      <VideoSection />

      {/* ============ PRICING ============ */}
      <section id="pricing" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-sky-100 px-4 py-1 text-sm font-semibold text-sky-700">Simple, honest pricing</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Plans that grow with your garage</h2>
            <p className="mt-4 text-lg text-slate-600">Start free for 3 months. No hidden charges, no setup fees. Upgrade or cancel anytime.</p>
          </div>

          <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={
                  p.highlighted
                    ? "relative flex flex-col rounded-3xl border-2 border-sky-500 bg-white p-8 shadow-2xl shadow-sky-500/20 lg:-mt-4 lg:mb-4"
                    : "relative flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
                }
              >
                <span
                  className={
                    p.highlighted
                      ? "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-500 px-4 py-1 text-xs font-bold uppercase tracking-wide text-white shadow"
                      : "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-300 px-4 py-1 text-xs font-bold uppercase tracking-wide text-slate-900 shadow"
                  }
                >
                  {p.badge}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{p.tagline}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">{p.price}</span>
                  <span className="mb-1 text-sm font-medium text-slate-500">/ {p.period}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#contact"
                  className={
                    p.highlighted
                      ? "mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-sky-500/30 transition-colors hover:bg-sky-600"
                      : "mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-300 px-6 py-3 text-base font-bold text-slate-900 transition-colors hover:bg-yellow-400"
                  }
                >
                  {p.cta} <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
          <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
            <IndianRupee className="h-4 w-4" /> All prices in INR. GST extra as applicable. Yearly billing discounts available on request.
          </p>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Loved by garages across India</h2>
            <p className="mt-4 text-lg text-slate-600">Real workshops, real results.</p>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex gap-1 text-yellow-400">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400" />)}
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-700">“{t.quote}”</p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ GET THE APP ============ */}
      <section id="app" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 to-sky-700 p-8 text-white sm:p-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-3 py-1 text-xs font-bold text-slate-900">
                <Smartphone className="h-3.5 w-3.5" /> Android app
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Run your garage from your phone</h2>
              <p className="mt-4 text-lg text-sky-50">
                Job cards, bills and stock in your pocket. Send invoices on WhatsApp in one tap.
                The app updates itself, and new car models and parts arrive automatically every day.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/downloads/gms.apk" download
                  className="inline-flex items-center gap-2 rounded-xl bg-yellow-300 px-6 py-3 font-bold text-slate-900 shadow-lg hover:bg-yellow-200">
                  <Smartphone className="h-5 w-5" /> Download for Android
                </a>
                <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">
                  Use in browser <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-4 text-xs text-sky-100">
                Android 7.0 or later. If your phone asks, allow &quot;Install unknown apps&quot; for your browser, then tap the downloaded file.
                On iPhone, open this site in Safari → Share → Add to Home Screen.
              </p>
            </div>
            <ul className="space-y-3 text-sm">
              {[
                "Share invoices & job card status on WhatsApp — straight to the customer's number",
                "Automatic updates — new features reach you without reinstalling",
                "Daily catalog sync — latest car makes, models, spare parts & lubes",
                "Works on low-cost phones, light on data",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 rounded-xl bg-white/10 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============ ABOUT ============ */}
      <section id="about" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="inline-block rounded-full bg-yellow-200 px-4 py-1 text-sm font-semibold text-amber-700">About us</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Built in Pune, for every Indian garage</h2>
            <div className="mt-6 space-y-4 text-slate-600">
              <p>
                GMS started with a simple belief — the hard-working garage owner
                deserves software that is as reliable as their tools. Too many
                workshops still run on paper registers, lost job slips and
                guesswork at the end of the month.
              </p>
              <p>
                We set out to change that. From our base in Pimple Saudagar,
                Pune, our small team works closely with real mechanics and
                owners to build a product that feels familiar on day one — in
                Hindi or English, on any phone.
              </p>
              <p>
                Today, thousands of garages use GMS to create job cards, send
                GST invoices on WhatsApp, manage spare parts and understand
                their profit. We are just getting started.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { icon: ShieldCheck, t: "Secure & reliable", d: "Daily backups, private data" },
                { icon: Smartphone, t: "Mobile-first", d: "Install like an app" },
                { icon: Languages, t: "Local languages", d: "Hindi & English" },
                { icon: Phone, t: "Human support", d: "Real people, real help" },
              ].map((x) => (
                <div key={x.t} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <x.icon className="h-5 w-5 shrink-0 text-sky-600" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{x.t}</p>
                    <p className="text-xs text-slate-500">{x.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 p-8 text-white shadow-2xl">
              <h3 className="text-xl font-bold">Our mission</h3>
              <p className="mt-3 text-sky-50/90">
                To digitise one lakh Indian garages and help every owner run a
                more profitable, stress-free workshop.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                {STATS.slice(0, 4).map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white/10 p-4">
                    <p className="text-2xl font-extrabold text-yellow-300">{s.value}</p>
                    <p className="mt-1 text-xs text-sky-50/80">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -right-4 -top-4 -z-10 h-40 w-40 rounded-full bg-yellow-300/40 blur-2xl" />
          </div>
        </div>
      </section>

      {/* ============ CONTACT ============ */}
      <section id="contact" className="scroll-mt-20 bg-slate-900 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-block rounded-full bg-yellow-300/20 px-4 py-1 text-sm font-semibold text-yellow-300">Get in touch</span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Let's digitise your garage</h2>
              <p className="mt-4 text-lg text-slate-300">
                Have a question or want a free demo? Our Pune team is happy to
                help you get started.
              </p>

              <div className="mt-8 space-y-5">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/20"><MapPin className="h-5 w-5 text-sky-400" /></span>
                  <div>
                    <p className="text-sm font-semibold text-white">Office Address</p>
                    <p className="mt-0.5 text-sm text-slate-300">
                      GMS Technologies, Office No. 204, 2nd Floor,<br />
                      Kunal Icon Road, Pimple Saudagar,<br />
                      Pune, Maharashtra 411027
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/20"><Phone className="h-5 w-5 text-sky-400" /></span>
                  <div>
                    <p className="text-sm font-semibold text-white">Phone / WhatsApp</p>
                    <a href="tel:+919876543210" className="mt-0.5 block text-sm text-slate-300 hover:text-yellow-300">+91 98765 43210</a>
                    <a href="tel:+912041234567" className="block text-sm text-slate-300 hover:text-yellow-300">+91 20 4123 4567</a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/20"><Mail className="h-5 w-5 text-sky-400" /></span>
                  <div>
                    <p className="text-sm font-semibold text-white">Email</p>
                    <a href="mailto:support@gms.co.in" className="mt-0.5 block text-sm text-slate-300 hover:text-yellow-300">support@gms.co.in</a>
                    <a href="mailto:sales@gms.co.in" className="block text-sm text-slate-300 hover:text-yellow-300">sales@gms.co.in</a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/20"><Clock className="h-5 w-5 text-sky-400" /></span>
                  <div>
                    <p className="text-sm font-semibold text-white">Working Hours</p>
                    <p className="mt-0.5 text-sm text-slate-300">Mon – Sat, 9:30 AM – 7:00 PM IST</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact form (visual) */}
            <div className="rounded-3xl bg-white p-8 shadow-2xl">
              <h3 className="text-xl font-bold text-slate-900">Request a free demo</h3>
              <p className="mt-1 text-sm text-slate-500">Fill in your details and we'll call you back.</p>
              <form className="mt-6 space-y-4" action="#contact">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Your Name</label>
                  <input type="text" placeholder="e.g. Ramesh Patil" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Mobile Number</label>
                  <input type="tel" inputMode="numeric" placeholder="10-digit mobile number" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Garage Name & City</label>
                  <input type="text" placeholder="e.g. Balaji Motors, Pune" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Message (optional)</label>
                  <textarea rows={3} placeholder="Tell us about your garage" className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                </div>
                <button type="submit" className="w-full rounded-xl bg-sky-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-sky-500/30 transition-colors hover:bg-sky-600">
                  Request Callback
                </button>
                <p className="text-center text-xs text-slate-400">By submitting, you agree to be contacted by the GMS team.</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-slate-950 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500">
                  <Wrench className="h-5 w-5 text-white" />
                </span>
                <span className="text-xl font-extrabold text-white">GMS<span className="text-sky-500">.</span></span>
              </div>
              <p className="mt-4 max-w-sm text-sm text-slate-400">
                India's simple garage management software. Digital job cards, GST
                billing, inventory and reports — all from your phone.
              </p>
              <div className="mt-5 flex gap-3">
                {[Facebook, Instagram, Youtube, Linkedin].map((Icon, i) => (
                  <a key={i} href="#top" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition-colors hover:bg-sky-500 hover:text-white">
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide text-white">Product</h4>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-yellow-300">Features</a></li>
                <li><a href="#gallery" className="hover:text-yellow-300">Gallery</a></li>
                <li><a href="#videos" className="hover:text-yellow-300">How it works</a></li>
                <li><a href="#pricing" className="hover:text-yellow-300">Pricing</a></li>
                <li><Link href="/login" className="hover:text-yellow-300">Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide text-white">Company</h4>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
                <li><a href="#about" className="hover:text-yellow-300">About us</a></li>
                <li><a href="#contact" className="hover:text-yellow-300">Contact</a></li>
                <li><a href="#contact" className="hover:text-yellow-300">Request a demo</a></li>
                <li><span className="text-slate-500">Pimple Saudagar, Pune</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-slate-500 sm:flex-row">
            <p>© {new Date().getFullYear()} GMS Technologies. All rights reserved.</p>
            <p className="flex items-center gap-4">
              <a href="#top" className="hover:text-slate-300">Privacy Policy</a>
              <a href="#top" className="hover:text-slate-300">Terms of Service</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
