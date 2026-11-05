"use client";
import { useState } from "react";
import { Play, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type VideoItem = {
  title: string;
  description: string;
  duration: string;
  // YouTube embed URL (set when a video is ready). Leave empty for "coming soon".
  embedUrl?: string;
  // Accent gradient for the thumbnail placeholder.
  accent: string;
};

// Add new tutorials here as they are recorded — the grid updates automatically.
const VIDEOS: VideoItem[] = [
  {
    title: "Getting Started with GMS",
    description: "Set up your garage, add staff and go live in under 2 minutes.",
    duration: "2:30",
    accent: "from-sky-400 to-sky-600",
  },
  {
    title: "Create Your First Job Card",
    description: "Log a vehicle, capture complaints and assign a technician.",
    duration: "3:15",
    accent: "from-yellow-300 to-amber-500",
  },
  {
    title: "GST Billing & WhatsApp Invoices",
    description: "Convert a job card into a GST invoice and share it instantly.",
    duration: "2:45",
    accent: "from-sky-500 to-indigo-500",
  },
  {
    title: "Managing Inventory & Purchases",
    description: "Track spare parts, low-stock alerts and purchase orders.",
    duration: "4:05",
    accent: "from-emerald-400 to-sky-500",
  },
  {
    title: "Staff Attendance & Productivity",
    description: "Mark attendance and track each mechanic's daily output.",
    duration: "3:40",
    accent: "from-amber-400 to-orange-500",
  },
  {
    title: "Reports & Business Insights",
    description: "Read daily, weekly and monthly reports to grow profit.",
    duration: "3:00",
    accent: "from-sky-400 to-cyan-500",
  },
];

export function VideoSection() {
  const [active, setActive] = useState<VideoItem | null>(null);

  return (
    <section id="videos" className="scroll-mt-20 bg-slate-900 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-yellow-300/20 px-4 py-1 text-sm font-semibold text-yellow-300">
            Learn in minutes
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Watch how GMS works
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Short, no-nonsense tutorials in simple language. New videos on using
            and managing your garage are added regularly.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEOS.map((v) => (
            <button
              key={v.title}
              type="button"
              onClick={() => v.embedUrl && setActive(v)}
              className={cn(
                "group relative overflow-hidden rounded-2xl text-left shadow-lg ring-1 ring-white/10 transition-transform",
                v.embedUrl ? "cursor-pointer hover:-translate-y-1" : "cursor-default"
              )}
            >
              {/* Thumbnail */}
              <div className={cn("relative aspect-video bg-gradient-to-br", v.accent)}>
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-xl transition-transform group-hover:scale-110">
                    <Play className="h-7 w-7 translate-x-0.5 fill-slate-900 text-slate-900" />
                  </span>
                </div>
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                  <Clock className="h-3 w-3" /> {v.duration}
                </span>
                {!v.embedUrl && (
                  <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-yellow-300">
                    Coming soon
                  </span>
                )}
              </div>
              {/* Caption */}
              <div className="bg-slate-800 p-5">
                <h3 className="text-base font-semibold text-white">{v.title}</h3>
                <p className="mt-1.5 text-sm text-slate-400">{v.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Modal */}
      {active?.embedUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActive(null)}
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900 hover:bg-white"
              aria-label="Close video"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="aspect-video">
              <iframe
                className="h-full w-full"
                src={active.embedUrl}
                title={active.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
