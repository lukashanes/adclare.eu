"use client";

import { AlertTriangle, CheckCircle2, CircleDot } from "lucide-react";
import type { AdRecord } from "@/lib/workspace-types";

export const workflowClass: Record<AdRecord["workflowStatus"], string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
  NEEDS_DATA: "border-orange-200 bg-orange-50 text-orange-800",
  READY_FOR_REVIEW: "border-sky-200 bg-sky-50 text-sky-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  PUBLISHED: "border-[#b9e0d2] bg-[#ecf8f2] text-[#0f6b45]",
  ARCHIVED: "border-neutral-200 bg-neutral-50 text-neutral-700",
};

export function noticeHref(publicUrl: string) {
  try {
    return new URL(publicUrl).pathname;
  } catch {
    return publicUrl;
  }
}

export function deadlineIcon(ad: AdRecord) {
  if (ad.deadlineState === "overdue") {
    return <AlertTriangle className="h-4 w-4 text-red-700" aria-hidden="true" />;
  }

  if (ad.missing.length === 0) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />;
  }

  return <CircleDot className="h-4 w-4 text-orange-700" aria-hidden="true" />;
}
