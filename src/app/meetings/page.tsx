import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { LocalDateTime } from "@/components/local-date-time";
import { getRepository } from "@/data";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const repository = getRepository();
  const meetings = await repository.listMeetings();
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] pt-6 pb-16 sm:w-[calc(100%-56px)] sm:pt-9">
      <div className="mb-7 max-w-[760px]">
        <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          Source trail
        </p>
        <h1 className="text-[26px] leading-tight font-[650] tracking-[-0.025em]">
          Meetings
        </h1>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        {meetings.map((meeting) => (
          <Link
            href={`/meetings/${meeting.id}`}
            key={meeting.id}
            className="grid min-h-[74px] grid-cols-[125px_1fr_auto] items-center gap-[18px] border-b border-border px-[18px] py-3.5 last:border-b-0 hover:bg-zinc-50 sm:grid-cols-[165px_1fr_100px_auto]"
          >
            <span className="text-[10px] text-muted-foreground">
              <LocalDateTime value={meeting.startedAt} />
            </span>
            <div>
              <h2 className="mb-1 text-sm font-[550]">{meeting.title}</h2>
              <p className="text-[11px] text-muted-foreground">
                {meeting.participants.join(" · ")}
              </p>
            </div>
            <span className="hidden text-[10px] text-muted-foreground sm:block">
              {meeting.utteranceCount} passages
            </span>
            <span className="[&_svg]:w-3.5 [&_svg]:text-muted-foreground">
              <ArrowIcon />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
