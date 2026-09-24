"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarClock, LoaderCircle, Plus, Send, Video } from "lucide-react";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [joinTiming, setJoinTiming] = useState<JoinTiming>("now");
  const [title, setTitle] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [joinAtLocal, setJoinAtLocal] = useState(defaultScheduleLocal);
  const [scheduleReference] = useState(Date.now);
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
      setOpen(false);
      router.push(`/meetings/${payload.captureId}`);
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
                Make sure everyone knows the bot will record and transcribe the
                call. AI-generated claims stay linked to exact transcript
                passages so they can be verified; transcript content is sent to
                your configured OpenAI account for analysis.
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
      </DialogContent>
    </Dialog>
  );
}
