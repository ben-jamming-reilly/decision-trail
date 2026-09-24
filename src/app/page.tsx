import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { NewMeetingDialog } from "@/components/new-meeting-dialog";
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
  const [featured, ownership, risks] = await Promise.all([
    repository.getEntity("enterprise-bulk-export"),
    repository.getEntity("bulk-export-ownership"),
    repository.getEntity("permission-aware-export"),
  ]);

  return (
    <div className="page-wrap">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Conversation-first company memory</p>
          <h1>Decision Trail</h1>
          <p>
            Recall captures what happened in each conversation. Decision Trail
            turns those conversations into the company&apos;s evolving
            memory—what it currently believes, what changed, and the evidence
            behind it.
          </p>
        </div>
        <div className="dashboard-actions">
          <div className="integration-badge">
            <span />
            Live Recall capture ready
          </div>
          <NewMeetingDialog />
        </div>
      </section>

      <section className="demo-boundary" aria-label="Demo data boundaries">
        <div>
          <strong>Seeded decision intelligence</strong>
          <p>
            This walkthrough uses an extracted, longitudinal story across three
            meetings so you can inspect claims, changes, and citations.
          </p>
        </div>
        <div>
          <strong>Live Recall ingestion</strong>
          <p>
            New Meeting captures transcript evidence, then OpenAI extracts
            structured claims with exact passage citations.
          </p>
        </div>
      </section>

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
            <h2>Current decision snapshot</h2>
            <p>
              The present state, with every statement traceable to a
              conversation.
            </p>
          </div>
        </div>
        <div className="decision-grid">
          <article className="decision-card">
            <span className="kind">Decision &amp; requirement</span>
            {featured?.claims
              .filter((claim) => claim.state === "active")
              .slice(0, 2)
              .map((claim) => (
                <p key={claim.id}>{claim.text}</p>
              ))}
          </article>
          <article className="decision-card">
            <span className="kind">Commitments &amp; owners</span>
            {ownership?.claims.map((claim) => (
              <p key={claim.id}>{claim.text}</p>
            ))}
          </article>
          <article className="decision-card">
            <span className="kind">Risks &amp; open questions</span>
            {risks?.claims
              .filter((claim) => claim.state === "active")
              .map((claim) => (
                <p key={claim.id}>{claim.text}</p>
              ))}
          </article>
        </div>
      </section>

      <section className="ask-card">
        <div className="card-heading">
          <div>
            <h2>Ask across meetings</h2>
            <p>Search entities and claims with linked transcript evidence.</p>
          </div>
        </div>
        <QueryBox />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>What changed</h2>
            <p>Follow the target date, assumptions, and evidence over time.</p>
          </div>
          <Link href="/entities">
            Browse decision memory <ArrowIcon />
          </Link>
        </div>
        {featured && (
          <div className="feature-card">
            <div className="feature-summary">
              <span className="kind">Featured {featured.kind}</span>
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
          <p className="section-label">Recently updated</p>
          <h2>Decision memory</h2>
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
          <p className="section-label">Source trail</p>
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
