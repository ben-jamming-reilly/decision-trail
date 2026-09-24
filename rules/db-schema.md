# Database schema

PostgreSQL is the application's only persistent datastore. The schema is
defined in `src/db/schema/knowledge.ts`; generated SQL lives in `drizzle/`.

## Conventions

- Tables and database columns use `snake_case`; TypeScript fields use camelCase.
- Product records use PostgreSQL UUID primary keys.
- Every foreign key states an `onDelete` action.
- Source artifacts are immutable. Corrections create new claims and transitions.
- External Recall IDs and webhook IDs have unique indexes for idempotency.
- Raw webhook payloads are retained for replay/audit, never treated as knowledge.
- Evidence always points to a stored utterance. A claim without evidence must not
  be published to the wiki.
- Timestamps are timezone-aware and all confidence values are constrained to
  the inclusive range 0–1.

## Core model

- `meeting`: one completed Recall recording/transcript.
- `meeting_capture`: durable pre-transcript bot scheduling and lifecycle state.
- `utterance`: speaker-attributed transcript span with relative timestamps.
- `entity`: a reusable wiki subject (initiative, person, organization, etc.).
- `claim`: an extracted statement about one entity, with lifecycle state.
- `claim_evidence`: many-to-many link from claims to supporting utterances.
- `claim_transition`: append-only state-history record, including supersession.
- `webhook_event`: idempotency and audit boundary for verified Recall events.
- `knowledge_template`: configurable extraction vocabulary for future verticals.
