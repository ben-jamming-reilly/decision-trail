import type { ClaimState } from "@/lib/domain";
import { cn } from "@/lib/utils";

const stateStyles: Record<ClaimState, string> = {
  active: "border-green-200 bg-green-50 text-green-800",
  superseded: "border-amber-200 bg-amber-50 text-amber-800",
  disputed: "border-red-200 bg-red-50 text-red-800",
  resolved: "border-sky-200 bg-sky-50 text-sky-700",
};

export function StatusPill({ state }: { state: ClaimState }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[21px] items-center rounded-full border px-[7px] text-[9px] font-semibold tracking-[0.06em] uppercase",
        stateStyles[state],
      )}
    >
      {state}
    </span>
  );
}
