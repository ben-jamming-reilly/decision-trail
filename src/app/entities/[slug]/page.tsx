import { notFound } from "next/navigation";
import { EvidenceCard } from "@/components/evidence-card";
import { LocalDateTime } from "@/components/local-date-time";
import { StatusPill } from "@/components/status-pill";
import { getRepository } from "@/data";

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
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] pt-6 pb-16 sm:w-[calc(100%-56px)] sm:pt-9">
      <header className="max-w-[800px] pt-1 pb-[30px]">
        <span className="inline-flex min-h-[21px] items-center rounded-full border border-border bg-muted px-[7px] text-[9px] font-semibold tracking-[0.06em] text-zinc-600 uppercase">
          {entity.kind}
        </span>
        <h1 className="mt-3 text-[26px] leading-tight font-[650] tracking-[-0.025em]">
          {entity.name}
        </h1>
        <p className="mt-1.5 leading-6 text-muted-foreground">
          {entity.description}
        </p>
        <div className="mt-[9px] text-[11px] text-muted-foreground">
          Also known as {entity.aliases.join(", ")} · Updated{" "}
          <LocalDateTime value={entity.updatedAt} />
        </div>
      </header>
      <div className="grid grid-cols-1 items-start gap-[22px] min-[901px]:grid-cols-[180px_1fr]">
        <aside className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.025)] min-[901px]:sticky min-[901px]:top-[78px]">
          <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            At a glance
          </p>
          {[
            [entity.activeClaimCount, "active claims"],
            [
              entity.claims.filter((c) => c.state === "superseded").length,
              "superseded",
            ],
            [
              entity.claims.filter((c) => c.state === "disputed").length,
              "disputed",
            ],
            [
              entity.claims.filter((c) => c.state === "resolved").length,
              "resolved",
            ],
          ].map(([value, label]) => (
            <div className="border-t border-border py-3" key={label}>
              <strong className="block text-xl font-[650]">{value}</strong>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </aside>
        <section>
          <div className="mb-3.5 flex items-end justify-between">
            <div>
              <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                Claim history
              </p>
              <h2 className="text-base font-semibold tracking-[-0.01em]">
                What we heard, over time
              </h2>
            </div>
          </div>
          {entity.claims.map((claim) => (
            <article
              className="mb-3 rounded-lg border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.025)]"
              key={claim.id}
            >
              <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
                <StatusPill state={claim.state} />
                <LocalDateTime value={claim.recordedAt} />
                <span className="ml-auto">
                  {Math.round(claim.confidence * 100)}% extraction confidence
                </span>
              </div>
              <h3 className="my-[15px] text-base leading-6 font-[550]">
                {claim.text}
              </h3>
              {claim.supersedesClaimId && (
                <p className="text-[10px] text-yellow-700">
                  ↳ Supersedes an earlier claim
                </p>
              )}
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
