import Link from "next/link";
import { LocalDateTime } from "@/components/local-date-time";
import { NewMeetingDialog } from "@/components/new-meeting-dialog";
import { StatusPill } from "@/components/status-pill";
import { getRepository } from "@/data";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const repository = getRepository();
  const [entities, meetings] = await Promise.all([
    repository.listEntities(),
    repository.listMeetings(),
  ]);
  const detailedEntities = (
    await Promise.all(
      entities.slice(0, 12).map((entity) => repository.getEntity(entity.slug)),
    )
  ).filter((entity) => entity !== null);
  const claims = detailedEntities
    .flatMap((entity) => entity.claims.map((claim) => ({ claim, entity })))
    .sort(
      (left, right) =>
        new Date(right.claim.recordedAt).getTime() -
        new Date(left.claim.recordedAt).getTime(),
    );
  const currentClaims = claims
    .filter(({ claim }) => claim.state === "active")
    .slice(0, 5);
  const recentChanges = claims
    .filter(({ claim }) => claim.state !== "active" || claim.supersedesClaimId)
    .slice(0, 5);

  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1040px] pt-6 pb-16 sm:w-[calc(100%-56px)] sm:pt-8">
      <header className="mb-6 block items-center justify-between gap-6 border-b border-border pb-6 sm:flex">
        <div className="max-w-[620px]">
          <h1 className="text-[26px] leading-tight font-[650] tracking-[-0.025em]">
            Overview
          </h1>
          <p className="mt-1.5 leading-6 text-muted-foreground">
            Current decisions, recent changes, and the conversations behind
            them.
          </p>
        </div>
        <div className="mt-4 shrink-0 sm:mt-0">
          <NewMeetingDialog />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 min-[901px]:grid-cols-2">
        <section
          className="overflow-hidden rounded-lg border border-border bg-card"
          aria-labelledby="current-heading"
        >
          <div className="border-b border-border px-5 py-[18px]">
            <h2 id="current-heading" className="text-[15px] font-semibold">
              Current state
            </h2>
            <p className="mt-1 text-[11px] leading-[1.45] text-muted-foreground">
              The latest active knowledge extracted from your meetings.
            </p>
          </div>
          <div className="divide-y divide-border">
            {currentClaims.length > 0 ? (
              currentClaims.map(({ claim, entity }) => (
                <Link
                  href={`/entities/${entity.slug}`}
                  key={claim.id}
                  className="block px-5 py-[15px] hover:bg-zinc-50"
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                    <span className="inline-flex min-h-[21px] items-center rounded-full border border-border bg-muted px-[7px] text-[9px] font-semibold tracking-[0.06em] text-zinc-600 uppercase">
                      {entity.kind}
                    </span>
                    <span>{entity.name}</span>
                  </div>
                  <p className="mt-2.5 leading-6 text-zinc-700">{claim.text}</p>
                </Link>
              ))
            ) : (
              <p className="px-5 py-6 text-xs leading-6 text-muted-foreground">
                Active decisions will appear after a meeting is processed.
              </p>
            )}
          </div>
        </section>

        <section
          className="overflow-hidden rounded-lg border border-border bg-card"
          aria-labelledby="changes-heading"
        >
          <div className="border-b border-border px-5 py-[18px]">
            <h2 id="changes-heading" className="text-[15px] font-semibold">
              Recent changes
            </h2>
            <p className="mt-1 text-[11px] leading-[1.45] text-muted-foreground">
              Knowledge that was replaced, disputed, or resolved.
            </p>
          </div>
          <div className="divide-y divide-border">
            {recentChanges.length > 0 ? (
              recentChanges.map(({ claim, entity }) => (
                <Link
                  href={`/entities/${entity.slug}`}
                  key={claim.id}
                  className="block px-5 py-[15px] hover:bg-zinc-50"
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                    <StatusPill state={claim.state} />
                    <LocalDateTime value={claim.recordedAt} />
                  </div>
                  <p className="mt-2.5 leading-6 text-zinc-700">{claim.text}</p>
                  <small className="mt-1.5 block text-[10px] text-muted-foreground">
                    {entity.name}
                  </small>
                </Link>
              ))
            ) : (
              <p className="px-5 py-6 text-xs leading-6 text-muted-foreground">
                Changes will appear when meeting evidence updates existing
                knowledge.
              </p>
            )}
          </div>
        </section>
      </div>

      <section
        className="mt-4 overflow-hidden rounded-lg border border-border bg-card"
        aria-labelledby="recent-meetings-heading"
      >
        <div className="border-b border-border px-5 py-[18px]">
          <h2
            id="recent-meetings-heading"
            className="text-[15px] font-semibold"
          >
            Recent meetings
          </h2>
          <p className="mt-1 text-[11px] leading-[1.45] text-muted-foreground">
            The latest source conversations added to Decision Trail.
          </p>
        </div>
        <div className="divide-y divide-border">
          {meetings.length > 0 ? (
            meetings.slice(0, 5).map((meeting) => (
              <Link
                href={`/meetings/${meeting.id}`}
                key={meeting.id}
                className="grid min-h-[62px] grid-cols-[1fr_auto] items-center gap-4 px-5 py-3 hover:bg-zinc-50 sm:grid-cols-[150px_1fr_auto]"
              >
                <span className="col-span-2 text-[10px] text-muted-foreground sm:col-span-1">
                  <LocalDateTime value={meeting.startedAt} />
                </span>
                <span>
                  <strong className="block text-xs font-[550]">
                    {meeting.title}
                  </strong>
                  <small className="mt-[3px] block text-[10px] text-muted-foreground">
                    {meeting.participants.join(" · ")}
                  </small>
                </span>
                <small className="text-[10px] text-muted-foreground">
                  {meeting.utteranceCount} passages
                </small>
              </Link>
            ))
          ) : (
            <p className="px-5 py-6 text-xs leading-6 text-muted-foreground">
              Your processed meetings will appear here.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
