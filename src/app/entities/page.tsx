import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { getRepository } from "@/data";

export const dynamic = "force-dynamic";

export default async function EntitiesPage() {
  const entities = await getRepository().listEntities();
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] pt-6 pb-16 sm:w-[calc(100%-56px)] sm:pt-9">
      <div className="mb-7 max-w-[760px]">
        <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          Decision memory
        </p>
        <h1 className="text-[26px] leading-tight font-[650] tracking-[-0.025em]">
          What the company currently believes
        </h1>
        <p className="mt-1.5 leading-6 text-muted-foreground">
          Requirements, decisions, risks, and commitments—each connected to the
          conversation that produced it.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 min-[901px]:grid-cols-3">
        {entities.map((entity) => (
          <Link
            href={`/entities/${entity.slug}`}
            className="flex min-h-[220px] flex-col rounded-lg border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.025)] hover:border-zinc-400"
            key={entity.id}
          >
            <span className="inline-flex min-h-[21px] w-fit items-center rounded-full border border-border bg-muted px-[7px] text-[9px] font-semibold tracking-[0.06em] text-zinc-600 uppercase">
              {entity.kind}
            </span>
            <h2 className="mt-[18px] mb-[7px] text-lg font-semibold">
              {entity.name}
            </h2>
            <p className="leading-6 text-muted-foreground">
              {entity.description}
            </p>
            <div className="mt-auto flex items-center justify-between text-[11px] text-muted-foreground">
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
