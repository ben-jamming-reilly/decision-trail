import Link from "next/link";
import { LocalDateTime } from "@/components/local-date-time";
import type { Evidence } from "@/lib/domain";
import { formatTime } from "@/lib/format";

export function EvidenceCard({ evidence }: { evidence: Evidence }) {
  return (
    <Link
      href={`/meetings/${evidence.meetingId}?t=${evidence.startSeconds}#t-${Math.floor(evidence.startSeconds)}`}
      className="block rounded-[7px] border border-border bg-zinc-50 p-[13px] hover:border-zinc-400"
    >
      <div className="flex justify-between gap-3 text-[10px] font-medium text-zinc-700">
        <span>{evidence.speaker}</span>
        <span>{formatTime(evidence.startSeconds)}</span>
      </div>
      <blockquote className="my-[11px] text-xs leading-6 text-zinc-700">
        “{evidence.quote}”
      </blockquote>
      <div className="flex justify-between gap-3 text-[10px] text-muted-foreground">
        <span>{evidence.meetingTitle}</span>
        <LocalDateTime value={evidence.meetingDate} />
      </div>
    </Link>
  );
}
