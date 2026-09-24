import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { getRepository } from "@/data";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const meetings = await getRepository().listMeetings();
  return (
    <div className="page-wrap inner-page">
      <div className="page-heading">
        <p className="eyebrow">Source trail</p>
        <h1>Conversations</h1>
        <p>
          Timestamped Recall evidence. Seeded meetings support the decision
          walkthrough; new live captures import transcripts only.
        </p>
      </div>
      <div className="meetings-table">
        {meetings.map((meeting) => (
          <Link href={`/meetings/${meeting.id}`} key={meeting.id}>
            <time>{formatDate(meeting.startedAt)}</time>
            <div>
              <h2>{meeting.title}</h2>
              <p>{meeting.participants.join(" · ")}</p>
            </div>
            <span>{meeting.utteranceCount} passages</span>
            <ArrowIcon />
          </Link>
        ))}
      </div>
    </div>
  );
}
