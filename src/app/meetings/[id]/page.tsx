import { notFound } from "next/navigation";
import { getRepository } from "@/data";
import { formatDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meeting = await getRepository().getMeeting(id);
  if (!meeting) notFound();
  return (
    <div className="page-wrap inner-page transcript-page">
      <header className="page-heading">
        <p className="eyebrow">
          Recall transcript · {formatDate(meeting.startedAt)}
        </p>
        <h1>{meeting.title}</h1>
        <p>{meeting.participants.join(" · ")}</p>
      </header>
      <div className="transcript-layout">
        <aside>
          <p className="eyebrow">Provenance</p>
          <dl>
            <dt>Source</dt>
            <dd>Recall.ai</dd>
            <dt>Bot ID</dt>
            <dd>{meeting.recallBotId ?? "—"}</dd>
            <dt>Passages</dt>
            <dd>{meeting.utteranceCount}</dd>
          </dl>
        </aside>
        <section className="transcript">
          <h2>Transcript</h2>
          {meeting.utterances.map((utterance) => (
            <article
              id={`t-${Math.floor(utterance.startSeconds)}`}
              key={utterance.id}
            >
              <a href={`#t-${Math.floor(utterance.startSeconds)}`}>
                {formatTime(utterance.startSeconds)}
              </a>
              <div>
                <b>{utterance.speaker}</b>
                <p>{utterance.text}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
