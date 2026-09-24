import Link from "next/link";
import { notFound } from "next/navigation";
import { ActiveRecording } from "@/components/active-recording";
import { LocalDateTime } from "@/components/local-date-time";
import { getRepository } from "@/data";
import {
  MeetingRecording,
  SeekToRecording,
} from "@/components/meeting-recording";
import { StatusPill } from "@/components/status-pill";

export const dynamic = "force-dynamic";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repository = getRepository();
  let capture = await repository.getCapture(id);
  const meeting = await repository.getMeeting(capture?.meetingId ?? id);
  if (!capture && meeting) {
    capture = await repository.getCaptureByMeetingId(meeting.id);
  }
  if (!meeting && !capture) notFound();
  if (!meeting && capture) return <ActiveRecording initialCapture={capture} />;
  if (!meeting) notFound();
  const changes = await repository.listMeetingChanges(meeting.id);
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] pt-6 pb-16 sm:w-[calc(100%-56px)] sm:pt-9">
      <header className="mb-7 max-w-[760px]">
        <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          <LocalDateTime value={meeting.startedAt} />
        </p>
        <h1 className="text-[26px] leading-tight font-[650] tracking-[-0.025em]">
          {meeting.title}
        </h1>
        <p className="mt-1.5 leading-6 text-muted-foreground">
          {meeting.participants.join(" · ")}
        </p>
      </header>
      {meeting.recallRecordingId && (
        <section className="mb-8">
          <div className="mb-3.5 flex items-end justify-between">
            <div>
              <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                Meeting recording
              </p>
            </div>
          </div>
          <MeetingRecording meetingId={meeting.id} />
        </section>
      )}
      <section className="mb-6">
        <div className="mb-3.5 flex items-end justify-between">
          <div>
            <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
              Decision trail update
            </p>
            <h2 className="text-base font-semibold tracking-[-0.01em]">
              What changed in this meeting
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Claims created, reaffirmed, disputed, superseded, or resolved by
              this conversation.
            </p>
          </div>
        </div>
        {changes.length ? (
          <div className="grid grid-cols-1 gap-2.5 min-[901px]:grid-cols-2">
            {changes.map(({ entity, claim, previousClaim }) => (
              <article
                className="rounded-lg border border-border bg-white p-4"
                key={claim.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/entities/${entity.slug}`}
                    className="text-[11px] font-semibold"
                  >
                    {entity.name}
                  </Link>
                  <StatusPill state={claim.state} />
                </div>
                {previousClaim && (
                  <div className="mt-[13px]">
                    <span className="text-[9px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                      Before
                    </span>
                    <p className="mt-1 text-[13px] leading-5 text-muted-foreground line-through">
                      {previousClaim.text}
                    </p>
                  </div>
                )}
                <div className="mt-[13px] mb-2.5">
                  <span className="text-[9px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                    {previousClaim ? "Now" : "Update"}
                  </span>
                  <p className="mt-1 text-[13px] leading-5 text-zinc-700">
                    {claim.text}
                  </p>
                </div>
                <small className="text-[10px] text-muted-foreground">
                  {claim.evidence.length} cited passage
                  {claim.evidence.length === 1 ? "" : "s"} across{" "}
                  {new Set(claim.evidence.map((item) => item.meetingId)).size}{" "}
                  meeting
                  {new Set(claim.evidence.map((item) => item.meetingId))
                    .size === 1
                    ? ""
                    : "s"}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-white p-4 text-[10px] text-muted-foreground">
            No durable decision-memory changes were extracted from this meeting.
          </p>
        )}
      </section>
      <section className="overflow-hidden rounded-lg border border-border">
        <h2 className="border-b border-border px-[18px] py-4 text-base font-semibold tracking-[-0.01em]">
          Transcript
        </h2>
        {meeting.utterances.map((utterance) => (
          <article
            id={`t-${Math.floor(utterance.startSeconds)}`}
            key={utterance.id}
            className="grid scroll-mt-[72px] grid-cols-[52px_1fr] gap-4 border-b border-border px-[18px] py-4 last:border-b-0 target:bg-green-50"
          >
            <SeekToRecording seconds={utterance.startSeconds} />
            <div>
              <b className="text-[11px] font-semibold">{utterance.speaker}</b>
              <p className="mt-1.5 leading-[1.6] text-zinc-700">
                {utterance.text}
              </p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
