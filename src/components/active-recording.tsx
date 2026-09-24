"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  Check,
  CircleAlert,
  FileText,
  LoaderCircle,
  Radio,
  Sparkles,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui";
import { LocalDateTime } from "@/components/local-date-time";
import type { CaptureStatus, MeetingCapture } from "@/lib/repository";
import { cn } from "@/lib/utils";

const STEPS: Array<{
  label: string;
  description: string;
  icon: typeof Video;
}> = [
  {
    label: "Join meeting",
    description: "Recall connects and waits for admission when needed.",
    icon: Video,
  },
  {
    label: "Record conversation",
    description: "Audio and video are captured with the in-call disclosure.",
    icon: Radio,
  },
  {
    label: "Create transcript",
    description:
      "Recall transcribes the finished recording with trail vocabulary.",
    icon: FileText,
  },
  {
    label: "Update decision trail",
    description: "Open claims are compared and cited changes are saved.",
    icon: Sparkles,
  },
];

const STATUS_STEP: Record<CaptureStatus, number> = {
  scheduled: 0,
  joining: 0,
  waiting_room: 0,
  in_call: 1,
  recording: 1,
  processing: 2,
  ready: 3,
  failed: 0,
};

export function ActiveRecording({
  initialCapture,
}: {
  initialCapture: MeetingCapture;
}) {
  const router = useRouter();
  const [capture, setCapture] = useState(initialCapture);
  const [refreshError, setRefreshError] = useState<string>();

  useEffect(() => {
    // Recall pushes lifecycle changes to the server, not the browser. A light
    // poll keeps this durable page current while webhooks update the capture.
    if (capture.status === "ready" || capture.status === "failed") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const refresh = async () => {
      try {
        const response = await fetch(`/api/captures/${capture.id}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as MeetingCapture & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error || "Could not refresh status");
        if (cancelled) return;
        setCapture(payload);
        setRefreshError(undefined);
        if (payload.status !== "ready" && payload.status !== "failed") {
          timer = setTimeout(refresh, 3000);
        }
      } catch (error) {
        if (cancelled) return;
        setRefreshError(
          error instanceof Error ? error.message : "Could not refresh status",
        );
        timer = setTimeout(refresh, 8000);
      }
    };

    timer = setTimeout(refresh, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [capture.id, capture.status]);

  useEffect(() => {
    if (capture.status === "ready" && capture.meetingId) router.refresh();
  }, [capture.meetingId, capture.status, router]);

  const activeStep = STATUS_STEP[capture.status];
  const failed = capture.status === "failed";
  const ready = capture.status === "ready";

  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[980px] pt-6 pb-16 sm:w-[calc(100%-56px)] sm:pt-9">
      <header className="flex flex-col items-stretch justify-between gap-7 sm:flex-row sm:items-start">
        <div>
          <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            Live Recall capture
          </p>
          <h1 className="mt-[7px] mb-[9px] text-3xl font-bold tracking-[-0.035em]">
            {capture.title}
          </h1>
          <p className="leading-6 text-muted-foreground">
            Trail <strong>{capture.trailId}</strong> · Bot status updates arrive
            through verified webhooks.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex min-h-8 shrink-0 items-center gap-[7px] rounded-full border border-blue-200 bg-blue-50 px-[11px] text-[11px] font-semibold text-blue-700 [&_svg]:size-3.5",
            !ready && !failed && "[&_svg]:animate-spin",
            ready && "border-green-200 bg-green-50 text-green-800",
            failed && "border-red-200 bg-red-50 text-red-800",
          )}
        >
          {ready ? <Check /> : failed ? <CircleAlert /> : <LoaderCircle />}
          {statusLabel(capture.status)}
        </span>
      </header>

      {failed && (
        <section
          className="mt-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-[18px] py-4 text-red-800"
          role="alert"
        >
          <CircleAlert className="w-5 shrink-0" />
          <div>
            <strong>Capture needs attention</strong>
            <p className="mt-1 text-[11px]">
              {capture.error ??
                capture.statusDetail ??
                "Recall reported a failure."}
            </p>
          </div>
        </section>
      )}

      {ready && (
        <section className="mt-6 flex flex-col items-stretch justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-[18px] py-4 text-green-800 sm:flex-row sm:items-center">
          <div>
            <strong>Meeting memory is ready</strong>
            <p className="mt-1 text-[11px]">
              {capture.statusDetail ??
                "The transcript and cited claims are available."}
            </p>
          </div>
          {capture.meetingId && (
            <Button onClick={() => router.refresh()}>Load recording</Button>
          )}
        </section>
      )}

      <section
        className="mt-7 overflow-hidden rounded-lg border border-border"
        aria-label="Capture progress"
      >
        {STEPS.map((step, index) => {
          const complete = ready || (!failed && index < activeStep);
          const active = !failed && !ready && index === activeStep;
          const Icon = step.icon;
          return (
            <article
              key={step.label}
              data-active={active || undefined}
              data-complete={complete || undefined}
              className="group grid min-h-[86px] grid-cols-[38px_1fr_auto] items-center gap-3.5 border-b border-border px-[18px] py-4 text-muted-foreground last:border-b-0 data-[active=true]:bg-slate-50 data-[active=true]:text-foreground data-[complete=true]:text-green-800 [&_svg]:size-[15px]"
            >
              <span className="grid size-[34px] place-items-center rounded-full border border-border bg-white group-data-[active=true]:border-blue-200 group-data-[active=true]:bg-blue-50 group-data-[active=true]:text-blue-700 group-data-[complete=true]:border-green-200 group-data-[complete=true]:bg-green-50">
                {complete ? <Check /> : <Icon />}
              </span>
              <div>
                <strong className="block text-[13px] text-inherit">
                  {step.label}
                </strong>
                <p className="mt-1 text-[11px] leading-[1.45] text-muted-foreground">
                  {step.description}
                </p>
              </div>
              {active && (
                <LoaderCircle className="animate-spin text-blue-600" />
              )}
            </article>
          );
        })}
      </section>

      <section className="mt-[18px] grid grid-cols-1 gap-2.5 min-[901px]:grid-cols-3">
        <div className="grid min-w-0 grid-cols-[18px_1fr] gap-x-2 gap-y-1 rounded-lg border border-border p-3.5">
          <CalendarClock className="w-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Join time</span>
          <strong className="col-span-full mt-1 [overflow-wrap:anywhere] text-[11px] font-[550] capitalize">
            <LocalDateTime value={capture.joinAt} />
          </strong>
        </div>
        <div className="grid min-w-0 grid-cols-[18px_1fr] gap-x-2 gap-y-1 rounded-lg border border-border p-3.5">
          <Radio className="w-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Current status
          </span>
          <strong className="col-span-full mt-1 [overflow-wrap:anywhere] text-[11px] font-[550] capitalize">
            {capture.status.replaceAll("_", " ")}
          </strong>
        </div>
        <div className="grid min-w-0 grid-cols-[18px_1fr] gap-x-2 gap-y-1 rounded-lg border border-border p-3.5">
          <Video className="w-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Recall bot</span>
          <strong className="col-span-full mt-1 [overflow-wrap:anywhere] text-[11px] font-[550] capitalize">
            {capture.botId ?? "Creating bot…"}
          </strong>
        </div>
      </section>

      {(capture.statusDetail || refreshError) && !failed && !ready && (
        <p className="mt-4 text-[11px] leading-6 text-muted-foreground">
          {refreshError ?? capture.statusDetail}
        </p>
      )}
      <p className="mt-4 border-t border-border pt-4 text-[11px] leading-6 text-muted-foreground">
        You can leave this page. Recording and processing continue in the
        background, and this capture remains available from Conversations.
      </p>
    </div>
  );
}

function statusLabel(status: CaptureStatus) {
  const labels: Record<CaptureStatus, string> = {
    scheduled: "Scheduled",
    joining: "Joining",
    waiting_room: "Waiting for admission",
    in_call: "In meeting",
    recording: "Recording",
    processing: "Processing",
    ready: "Ready",
    failed: "Failed",
  };
  return labels[status];
}
