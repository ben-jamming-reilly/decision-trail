import { QueryBox } from "@/components/query-box";

export default function SearchPage() {
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] pt-6 pb-16 sm:w-[calc(100%-56px)] sm:pt-9">
      <div className="mb-7 max-w-[760px]">
        <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          Cross-meeting query
        </p>
        <h1 className="text-[26px] leading-tight font-[650] tracking-[-0.025em]">
          Ask across meetings
        </h1>
        <p className="mt-1.5 leading-6 text-muted-foreground">
          Results are claims, not generated answers. Every result links back to
          its evidence.
        </p>
      </div>
      <QueryBox full />
    </div>
  );
}
