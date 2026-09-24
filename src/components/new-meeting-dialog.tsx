"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  LoaderCircle,
  Plus,
  Send,
  Video,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
} from "@/components/ui";
import { cn } from "@/lib/utils";

type JoinTiming = "now" | "scheduled";
type BotState = {
  id: string;
  captureId: string;
  status: string;
  transcriptStatus?: string | null;
  meetingId?: string;
  extractedClaims?: number;
  analysisError?: string;
  analysisSummary?: string;
};

function defaultScheduleLocal() {
  const date = new Date(Date.now() + 15 * 60 * 1000);
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function SegmentedControl({
  value,
  onChange,
}: {
  value: JoinTiming;
  onChange: (value: JoinTiming) => void;
}) {
  const options: Array<{
    value: JoinTiming;
    label: string;
    icon: typeof Send;
  }> = [
    { value: "now", label: "Join now", icon: Send },
    { value: "scheduled", label: "Schedule", icon: CalendarClock },
  ];
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <option.icon className="size-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function NewMeetingDialog() {
  const [open, setOpen] = useState(false);
  const [joinTiming, setJoinTiming] = useState<JoinTiming>("now");
  const [title, setTitle] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [joinAtLocal, setJoinAtLocal] = useState(defaultScheduleLocal);
  const [scheduleReference] = useState(Date.now);
  const [bot, setBot] = useState<BotState>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scheduleHint = useMemo(() => {
    if (joinTiming !== "scheduled" || !joinAtLocal) return null;
    const minutesOut =
      (new Date(joinAtLocal).getTime() - scheduleReference) / 60_000;
    return minutesOut < 10
      ? "Meetings under 10 minutes away use Recall's ad-hoc bot pool."
      : null;
  }, [joinAtLocal, joinTiming, scheduleReference]);

  const botId = bot?.id;
  const meetingId = bot?.meetingId;
  const botStatus = bot?.status;

  useEffect(() => {
    if (!botId || meetingId || botStatus === "fatal") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const sync = async () => {
      try {
        const response = await fetch(`/api/bots/${botId}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const payload = (await response.json()) as {
          error?: string;
          status?: string;
          transcriptStatus?: string | null;
          meetingId?: string;
          extractedClaims?: number;
          analysisError?: string;
          analysisSummary?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Could not check bot status");
        }
        if (cancelled) return;
        setError(null);
        setBot((current) =>
          current
            ? {
                ...current,
                status: payload.status || current.status,
                transcriptStatus: payload.transcriptStatus,
                meetingId: payload.meetingId,
                extractedClaims: payload.extractedClaims,
                analysisError: payload.analysisError,
                analysisSummary: payload.analysisSummary,
              }
            : current,
        );
        if (!payload.meetingId) timer = setTimeout(sync, 5000);
      } catch (syncError) {
        if (cancelled) return;
        setError(
          syncError instanceof Error
            ? syncError.message
            : "Could not check bot status",
        );
        timer = setTimeout(sync, 10_000);
      }
    };
    timer = setTimeout(sync, 2500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [botId, meetingId, botStatus]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const joinAt =
        joinTiming === "scheduled" ? new Date(joinAtLocal).toISOString() : null;
      const response = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, meetingUrl, joinAt }),
      });
      const payload = (await response.json()) as {
        error?: string;
        botId?: string;
        captureId?: string;
        status?: string;
      };
      if (!response.ok || !payload.botId || !payload.captureId) {
        throw new Error(payload.error || "Could not send the bot");
      }
      setBot({
        id: payload.botId,
        captureId: payload.captureId,
        status: payload.status || "joining_call",
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not send the bot",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2">
            <Plus /> New meeting
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="size-4" /> Send a meeting bot
          </DialogTitle>
          <DialogDescription>
            Decision Trail will capture the transcript, then extract cited
            decision memory with OpenAI.
          </DialogDescription>
        </DialogHeader>

        {bot ? (
          <BotProgress bot={bot} error={error} />
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogBody>
              <div className="grid gap-1.5">
                <label htmlFor="meeting-title" className="text-sm font-medium">
                  Meeting title
                </label>
                <Input
                  id="meeting-title"
                  autoFocus
                  maxLength={120}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Weekly product sync"
                  required
                  value={title}
                />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="meeting-url" className="text-sm font-medium">
                  Meeting URL
                </label>
                <Input
                  id="meeting-url"
                  inputMode="url"
                  onChange={(event) => setMeetingUrl(event.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  required
                  type="url"
                  value={meetingUrl}
                />
                <p className="text-xs text-muted-foreground">
                  Google Meet, Zoom, Microsoft Teams, and other supported links.
                </p>
              </div>

              <div className="grid gap-1.5">
                <p className="text-sm font-medium">Bot joins</p>
                <SegmentedControl
                  value={joinTiming}
                  onChange={(value) => {
                    setJoinTiming(value);
                    if (value === "scheduled") {
                      setJoinAtLocal(defaultScheduleLocal());
                    }
                  }}
                />
                {joinTiming === "scheduled" && (
                  <div className="grid gap-1.5 pt-1">
                    <Input
                      id="join-at"
                      onChange={(event) => setJoinAtLocal(event.target.value)}
                      required
                      type="datetime-local"
                      value={joinAtLocal}
                    />
                    <p className="text-xs text-muted-foreground">
                      {scheduleHint || "Uses your local time zone."}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 rounded-xl border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                <Video className="mt-0.5 size-4 shrink-0 text-foreground" />
                <p>
                  <strong className="font-medium text-foreground">
                    Recording consent
                  </strong>
                  <br />
                  Make sure everyone knows the bot will record and transcribe
                  the call. AI-generated claims stay linked to exact transcript
                  passages so they can be verified; transcript content is sent
                  to your configured OpenAI account for analysis.
                </p>
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
            </DialogBody>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="ghost" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Send />
                )}
                {submitting
                  ? "Sending…"
                  : joinTiming === "scheduled"
                    ? "Schedule bot"
                    : "Send bot"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BotProgress({ bot, error }: { bot: BotState; error: string | null }) {
  const complete = Boolean(bot.meetingId);
  return (
    <>
      <DialogBody>
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4",
            complete
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-blue-200 bg-blue-50 text-blue-800",
          )}
        >
          {complete ? (
            <CheckCircle2 className="size-5 shrink-0" />
          ) : (
            <LoaderCircle className="size-5 shrink-0 animate-spin" />
          )}
          <div>
            <h3 className="font-medium">
              {complete
                ? bot.analysisError
                  ? "Transcript ready"
                  : "Meeting analyzed"
                : statusLabel(bot.status)}
            </h3>
            <p className="mt-1 text-xs opacity-80">
              {complete
                ? bot.analysisError
                  ? "The transcript is ready, but AI claim extraction needs attention."
                  : `${bot.analysisSummary ?? "AI analysis complete"}. The meeting is ready to browse.`
                : "You can close this dialog; this page will keep tracking the bot."}
            </p>
          </div>
        </div>

        <dl className="overflow-hidden rounded-xl border text-xs">
          <Detail label="Bot ID" value={bot.id} />
          <Detail
            label="Recall status"
            value={bot.status.replaceAll("_", " ")}
          />
          {bot.transcriptStatus && (
            <Detail
              label="Transcript"
              value={bot.transcriptStatus.replaceAll("_", " ")}
            />
          )}
          {bot.extractedClaims !== undefined && (
            <Detail label="AI claims" value={String(bot.extractedClaims)} />
          )}
        </dl>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </DialogBody>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Close
        </DialogClose>
        {bot.meetingId && (
          <Button render={<Link href={`/meetings/${bot.meetingId}`} />}>
            Open transcript
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 border-b px-3 py-2.5 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 text-right capitalize [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: "Bot scheduled",
    joining_call: "Bot is joining",
    in_waiting_room: "Waiting to be admitted",
    in_call_not_recording: "Bot joined the call",
    in_call_recording: "Recording in progress",
    call_ended: "Processing recording",
    done: "Processing transcript",
    fatal: "The bot could not join",
  };
  return labels[status] || "Preparing the meeting bot";
}
