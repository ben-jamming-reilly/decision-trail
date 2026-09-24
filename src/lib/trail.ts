const DEFAULT_TRAIL_ID = "decision-trail";

export function normalizeTrailId(value: unknown) {
  const trailId = typeof value === "string" ? value.trim() : DEFAULT_TRAIL_ID;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trailId) && trailId.length <= 80
    ? trailId
    : null;
}
