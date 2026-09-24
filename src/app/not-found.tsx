import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[760px] pt-6 pb-16 sm:w-[calc(100%-56px)] sm:pt-9">
      <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
        404
      </p>
      <h1 className="text-[26px] leading-tight font-[650] tracking-[-0.025em]">
        Nothing remembered here.
      </h1>
      <p className="mt-1.5 leading-6 text-muted-foreground">
        The entity or meeting could not be found.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex h-[34px] items-center justify-center rounded-md bg-primary px-[13px] text-xs font-medium text-primary-foreground"
      >
        Return home
      </Link>
    </div>
  );
}
