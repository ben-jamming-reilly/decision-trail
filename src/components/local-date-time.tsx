"use client";

import { useSyncExternalStore } from "react";
import { formatDateTime } from "@/lib/format";

const subscribe = () => () => undefined;

export function LocalDateTime({ value }: { value: string }) {
  const isBrowser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const label = isBrowser
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : formatDateTime(value);

  return <time dateTime={value}>{label}</time>;
}
