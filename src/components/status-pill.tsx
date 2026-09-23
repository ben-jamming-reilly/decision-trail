import type { ClaimState } from "@/lib/domain";

export function StatusPill({ state }: { state: ClaimState }) {
  return <span className={`status status-${state}`}>{state}</span>;
}
