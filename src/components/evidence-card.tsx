import Link from "next/link";
import type { Evidence } from "@/lib/domain";
import { formatDate, formatTime } from "@/lib/format";

export function EvidenceCard({ evidence }: { evidence: Evidence }) {
  return (
    <Link
      href={`/meetings/${evidence.meetingId}#t-${Math.floor(evidence.startSeconds)}`}
      className="evidence-card"
    >
      <div className="evidence-meta">
        <span>{evidence.speaker}</span>
        <span>{formatTime(evidence.startSeconds)}</span>
      </div>
      <blockquote>“{evidence.quote}”</blockquote>
      <div className="evidence-source">
        <span>{evidence.meetingTitle}</span>
        <span>{formatDate(evidence.meetingDate)}</span>
      </div>
    </Link>
  );
}
