"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { useUIStore } from "@/store/ui-store";
import { useCatalogAutoSync } from "@/store/catalog-store";
import { AppUpdateChecker } from "@/components/native/app-update-checker";

function CatalogSync() {
  useCatalogAutoSync();
  return null;
}

function ThemeApplier() {
  const { theme } = useUIStore();
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      root.classList.toggle("dark", mq.matches);
    }
  }, [theme]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      <CatalogSync />
      <AppUpdateChecker />
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
