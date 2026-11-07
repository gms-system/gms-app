"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Wrench, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#gallery", label: "Gallery" },
  { href: "#videos", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#app", label: "Android App" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

export function MarketingNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="#top" className="flex items-center gap-2 shrink-0">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 shadow-md shadow-sky-500/30">
              <Wrench className="h-5 w-5 text-white" />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              GMS<span className="text-sky-500">.</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-sky-50 hover:text-sky-600"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-sky-600"
            >
              Login
            </Link>
            <a
              href="#pricing"
              className="rounded-lg bg-yellow-300 px-4 py-2 text-sm font-bold text-slate-900 shadow-sm transition-all hover:bg-yellow-400 hover:shadow-md"
            >
              Start Free Trial
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 shadow-lg">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-base font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-600"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-center text-base font-semibold text-slate-700"
              >
                Login
              </Link>
              <a
                href="#pricing"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-yellow-300 px-3 py-2.5 text-center text-base font-bold text-slate-900"
              >
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
