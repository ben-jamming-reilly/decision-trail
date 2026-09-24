"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/format";

const SEEK_EVENT = "decision-trail:seek";

export function MeetingRecording({ meetingId }: { meetingId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const initialSeek = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Evidence links use ?t= so a shared URL opens at the cited passage.
    const value = Number(new URLSearchParams(window.location.search).get("t"));
    if (Number.isFinite(value) && value >= 0) initialSeek.current = value;
  }, []);

  useEffect(() => {
    let cancelled = false;
    // The server resolves a fresh presigned Recall URL on every page load.
    fetch(`/api/meetings/${meetingId}/recording`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          url?: string;
          error?: string;
        };
        if (!response.ok || !payload.url) {
          throw new Error(payload.error ?? "Recording unavailable");
        }
        if (!cancelled) setUrl(payload.url);
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(
            reason instanceof Error ? reason.message : "Recording unavailable",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  useEffect(() => {
    // Transcript controls and the player are separate components; a local event
    // keeps seeking client-side without coupling either component to the other.
    const seek = (event: Event) => {
      const seconds = (event as CustomEvent<number>).detail;
      if (!videoRef.current || !Number.isFinite(seconds)) return;
      videoRef.current.currentTime = seconds;
      void videoRef.current.play();
    };
    window.addEventListener(SEEK_EVENT, seek);
    return () => window.removeEventListener(SEEK_EVENT, seek);
  }, []);

  if (error)
    return (
      <p className="grid min-h-[140px] place-items-center rounded-lg border border-border bg-muted text-[10px] leading-[1.4] text-muted-foreground">
        {error}
      </p>
    );
  if (!url)
    return (
      <p className="grid min-h-[140px] place-items-center rounded-lg border border-border bg-muted text-[10px] leading-[1.4] text-muted-foreground">
        Loading fresh recording URL…
      </p>
    );
  return (
    <video
      ref={videoRef}
      className="block max-h-[680px] w-full rounded-lg bg-zinc-900 shadow-sm"
      controls
      src={url}
      onLoadedMetadata={() => {
        if (videoRef.current && initialSeek.current !== undefined) {
          videoRef.current.currentTime = initialSeek.current;
        }
      }}
    />
  );
}

export function SeekToRecording({ seconds }: { seconds: number }) {
  return (
    <button
      className="self-start border-0 bg-transparent p-0 font-mono text-[10px] text-muted-foreground hover:text-foreground hover:underline"
      type="button"
      onClick={() =>
        window.dispatchEvent(new CustomEvent(SEEK_EVENT, { detail: seconds }))
      }
      aria-label={`Play recording at ${formatTime(seconds)}`}
    >
      {formatTime(seconds)}
    </button>
  );
}
