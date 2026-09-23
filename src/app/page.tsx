import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { QueryBox } from "@/components/query-box";
import { StatusPill } from "@/components/status-pill";
import { getRepository } from "@/data";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const repository = getRepository();
  const [stats, entities, meetings] = await Promise.all([
    repository.getStats(),
    repository.listEntities(),
    repository.listMeetings(),
  ]);
  const featured = await repository.getEntity("atlas-pilot");

  return (
    <div className="page-wrap">
      <section className="hero">
        <div>
          <p className="eyebrow">Longitudinal conversation intelligence</p>
          <h1>
            What your team knows,
            <br />
            <em>with receipts.</em>
          </h1>
          <p className="hero-copy">
            A living knowledge base that remembers what changed, who said it,
            and where the evidence lives.
          </p>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit-card one">
            <span>JAN 12</span>March 15 target
          </div>
          <div className="orbit-line" />
          <div className="orbit-card two">
            <span>FEB 03</span>April 2 agreed
          </div>
          <div className="orbit-card three">
            <span>FEB 18</span>8 partners confirmed
          </div>
        </div>
      </section>

      <QueryBox />

      <section className="stats-grid">
        {Object.entries(stats).map(([label, value]) => (
          <div className="stat" key={label}>
            <strong>{value}</strong>
            <span>{label.replace(/([A-Z])/g, " $1")}</span>
          </div>
        ))}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Evolving knowledge</p>
            <h2>One subject, every version</h2>
          </div>
          <Link href="/entities">
            Browse the wiki <ArrowIcon />
          </Link>
        </div>
        {featured && (
          <div className="feature-card">
            <div className="feature-summary">
              <span className="kind">{featured.kind}</span>
              <h3>{featured.name}</h3>
              <p>{featured.description}</p>
              <Link href={`/entities/${featured.slug}`}>
                Open entity history <ArrowIcon />
              </Link>
            </div>
            <div className="claim-stack">
              {featured.claims.slice(0, 3).map((claim) => (
                <div className="claim-preview" key={claim.id}>
                  <div>
                    <StatusPill state={claim.state} />
                    <time>{formatDate(claim.recordedAt)}</time>
                  </div>
                  <p>{claim.text}</p>
                  <small>
                    {claim.evidence.length} cited passage
                    {claim.evidence.length === 1 ? "" : "s"}
                  </small>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="section-block split-section">
        <div>
          <p className="eyebrow">Recently updated</p>
          <h2>Knowledge wiki</h2>
          <div className="entity-list">
            {entities.map((entity) => (
              <Link href={`/entities/${entity.slug}`} key={entity.id}>
                <span className="entity-glyph">{entity.name.charAt(0)}</span>
                <span>
                  <b>{entity.name}</b>
                  <small>
                    {entity.kind} · {entity.activeClaimCount} active claims
                  </small>
                </span>
                <ArrowIcon />
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow">Source trail</p>
          <h2>Recent meetings</h2>
          <div className="meeting-list">
            {meetings.map((meeting) => (
              <Link href={`/meetings/${meeting.id}`} key={meeting.id}>
                <time>{formatDate(meeting.startedAt)}</time>
                <b>{meeting.title}</b>
                <small>{meeting.participants.join(" · ")}</small>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
