import { notFound } from "next/navigation";
import { EvidenceCard } from "@/components/evidence-card";
import { StatusPill } from "@/components/status-pill";
import { getRepository } from "@/data";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EntityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entity = await getRepository().getEntity(slug);
  if (!entity) notFound();

  return (
    <div className="page-wrap inner-page entity-page">
      <header className="entity-header">
        <span className="kind">{entity.kind}</span>
        <h1>{entity.name}</h1>
        <p>{entity.description}</p>
        <div className="alias-row">
          Also known as {entity.aliases.join(", ")} · Updated{" "}
          {formatDate(entity.updatedAt)}
        </div>
      </header>
      <div className="entity-layout">
        <aside>
          <p className="eyebrow">At a glance</p>
          <div>
            <strong>{entity.activeClaimCount}</strong>
            <span>active claims</span>
          </div>
          <div>
            <strong>
              {entity.claims.filter((c) => c.state === "superseded").length}
            </strong>
            <span>superseded</span>
          </div>
          <div>
            <strong>
              {entity.claims.filter((c) => c.state === "disputed").length}
            </strong>
            <span>disputed</span>
          </div>
        </aside>
        <section className="timeline">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Claim history</p>
              <h2>What we heard, over time</h2>
            </div>
          </div>
          {entity.claims.map((claim) => (
            <article className="claim-card" key={claim.id}>
              <div className="claim-card-head">
                <StatusPill state={claim.state} />
                <time>{formatDate(claim.recordedAt)}</time>
                <span>
                  {Math.round(claim.confidence * 100)}% extraction confidence
                </span>
              </div>
              <h3>{claim.text}</h3>
              {claim.supersedesClaimId && (
                <p className="supersedes">↳ Supersedes an earlier claim</p>
              )}
              <div className="evidence-grid">
                {claim.evidence.map((item) => (
                  <EvidenceCard evidence={item} key={item.id} />
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
