"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches server components on an interval (lightweight "realtime" for talk rooms). */
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
