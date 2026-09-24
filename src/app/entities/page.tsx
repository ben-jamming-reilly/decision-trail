import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { getRepository } from "@/data";

export const dynamic = "force-dynamic";

export default async function EntitiesPage() {
  const entities = await getRepository().listEntities();
  return (
    <div className="page-wrap inner-page">
      <div className="page-heading">
        <p className="eyebrow">Decision memory</p>
        <h1>What the company currently believes</h1>
        <p>
          Requirements, decisions, risks, and commitments—each connected to the
          conversation that produced it.
        </p>
      </div>
      <div className="entity-grid">
        {entities.map((entity) => (
          <Link
            href={`/entities/${entity.slug}`}
            className="entity-card"
            key={entity.id}
          >
            <span className="kind">{entity.kind}</span>
            <h2>{entity.name}</h2>
            <p>{entity.description}</p>
            <div>
              <span>
                {entity.activeClaimCount} active / {entity.claimCount} total
              </span>
              <ArrowIcon />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
