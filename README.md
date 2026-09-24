# Decision Trail

Decision Trail is a conversation-first company memory for product and
engineering decisions.

> Recall captures what happened in each conversation. Decision Trail turns
> those conversations into the company’s evolving memory—what it currently
> believes, what changed, and the evidence behind it.

Every extracted statement is a **claim** linked to verbatim transcript
evidence. Newer claims can supersede earlier ones, disputed assumptions remain
visible, and the current state never loses its source trail.

## The included walkthrough

The seeded story follows one enterprise capability across three meetings:

1. **Enterprise customer discovery** establishes demand for workspace-level
   bulk export for audits and offboarding.
2. **Bulk export product planning** chooses a CSV-based V1, assigns Priya to the
   rollout, and targets March 15.
3. **Bulk export engineering review** discovers a permission/security
   dependency, moves the target to April 2, assigns Sam to filtering, and leaves
   audit logging as an open question.

The UI exposes current requirements and decisions, commitments and owners,
risks and open questions, active/disputed/superseded history, and evidence with
meeting, speaker, timestamp, and quote.

## Seeded and live paths

Decision Trail deliberately separates two capabilities:

- **Seeded decision intelligence** demonstrates the intended longitudinal
  output: extracted claims, changes, ownership, risks, and linked evidence.
- **Live Recall + OpenAI ingestion** sends a bot to a meeting, starts a
  post-meeting transcript when the recording is ready, then uses the Vercel AI
  SDK with a Zod schema and OpenAI Structured Outputs to extract claims that
  cite exact utterance IDs.

Cross-meeting questions first retrieve deterministic claim matches, then stream
an AI synthesis grounded only in those claims and their transcript passages.
The matching source cards remain visible beneath the answer.

Live transcript text and retrieved evidence are sent to the configured OpenAI
account for these features. Provider storage is disabled in AI SDK requests;
review the account's applicable data controls before using customer meetings.

## Quick walkthrough without credentials

Use Node.js 20.18 or newer (Node 22 LTS is recommended for OpenNext builds).

```bash
pnpm install
cp .env.example .env.local
```

Set `DEMO_MODE=true`, run `pnpm dev`, and open
[http://localhost:3000](http://localhost:3000). Then:

1. Review the current decision snapshot on the overview.
2. Ask **“Why was the launch delayed?”**.
3. Ask **“What changed about the target date?”**.
4. Ask **“Which customer conversations influenced this requirement?”**.
5. Open **Enterprise bulk export** and compare active, disputed, and superseded
   claims.
6. Follow an evidence card to the exact speaker and timestamp in the source
   transcript.
7. Open **New Meeting** to see the separate live Recall capture path.

Demo mode is an in-process, read-only fixture, not a second datastore.
Production persistence is PostgreSQL only.

## What is included

- Next.js 16 App Router UI and JSON query endpoint
- OpenNext configuration for Cloudflare Workers
- PostgreSQL-only persistence with Drizzle schema and migrations
- Recall.ai bot creation with retry handling for 429, 503, and 507 responses
- verified raw-body webhook HMAC handling with replay protection
- post-meeting `transcript.done` retrieval and transcript normalization
- trail and meeting IDs in bot metadata for webhook correlation
- trail vocabulary passed to async transcription as `key_terms`
- cross-meeting participant identity keys, preferring calendar email and Zoom
  `conf_user_id` over mutable display names
- immutable meeting/utterance evidence and append-oriented claim history
- Vercel AI SDK with the dedicated OpenAI provider for grounded answers and
  structured claim extraction
- domain-neutral `KnowledgeTemplate` for extraction and verticalization
- idempotent fixture seed, decision history, evidence pages, and retrieval

There is no Redis, queue, graph database, separate backend, real-time transcript
path, or unrelated product integration.

## PostgreSQL setup

```bash
createdb recall_knowledge
cp .env.example .env.local
```

Set `DATABASE_URL` and `DEMO_MODE=false`, then run:

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`db:seed` is idempotent and loads the same three-meeting story into PostgreSQL.
The typed schema lives in `src/db/schema/knowledge.ts`; generated SQL is under
`drizzle/`; schema conventions are documented in `rules/db-schema.md`.

## Recall.ai setup

| Variable                | Required   | Purpose                                            |
| ----------------------- | ---------- | -------------------------------------------------- |
| `DATABASE_URL`          | production | PostgreSQL connection string                       |
| `DEMO_MODE`             | no         | `true` uses fixtures; `false` requires PostgreSQL  |
| `RECALL_API_KEY`        | ingestion  | server-only Recall API key                         |
| `RECALL_WEBHOOK_SECRET` | ingestion  | verification secret beginning with `whsec_`        |
| `RECALL_REGION`         | ingestion  | Recall deployment region                           |
| `PUBLIC_API_BASE_URL`   | local dev  | stable public ngrok origin, without a trailing `/` |
| `OPENAI_API_KEY`        | AI         | server-only key used by the AI SDK                 |
| `OPENAI_MODEL`          | no         | OpenAI model; defaults to `gpt-5-mini`             |

Never expose these values in client code or commit `.env*` files.

Choose **New Meeting**, provide a supported HTTPS meeting link, and send the bot
immediately or schedule it. After Recall accepts the bot, the app navigates to
one durable `/meetings/{captureId}` page; the modal does not need to remain
open. That same page follows webhook-backed joining, recording, transcription,
extraction, and failure state, then refreshes in place into the finished
recording, meeting-specific changes, and timestamped transcript. Give related
meetings the same trail ID. The server
puts `trailId` and an application `meetingId` in the bot metadata, gives the bot
an explicit recording notice, and records video without enabling a real-time
transcript. On `recording.done`, it starts Recall async transcription and feeds
the trail's existing project names, product names, aliases, and speakers back as
`key_terms`. Local tests can poll as a development fallback; deployed
environments should use verified webhooks as the lifecycle source of truth.
Once stored, the transcript is analyzed into domain-neutral claims. If
extraction fails, the transcript remains available and the capture reports the
analysis error.

For local development, claim a static domain in the ngrok dashboard and save
its HTTPS origin as `PUBLIC_API_BASE_URL` in `.env.local`. Run the app and point
ngrok directly to the Next.js port in a second terminal—no relay process is
needed:

```bash
# Terminal 1
pnpm dev

# Terminal 2
ngrok http --url https://your-static-domain.ngrok-free.app 3000
```

Current ngrok releases prefer `--url`; older releases accept Recall's
documented `--domain` form. When a request arrives on `PUBLIC_API_BASE_URL`, the
Next.js proxy exposes only `POST /api/webhooks/recall` and returns `404` for the
rest of the app. Requests made directly to localhost are unaffected.

Configure the Recall webhook endpoint as:

```text
${PUBLIC_API_BASE_URL}/api/webhooks/recall
```

Copy the verification secret associated with the Recall workspace or webhook
endpoint into `RECALL_WEBHOOK_SECRET`, then restart `pnpm dev`. The handler
verifies Recall's signature against the unmodified request body before it
records or processes the event.

Subscribe the endpoint to `recording.done`, `recording.failed`,
`transcript.done`, `transcript.failed`, and every `bot.*` lifecycle event:
`joining_call`, `in_waiting_room`, `in_call_not_recording`,
`recording_permission_allowed`, `recording_permission_denied`,
`in_call_recording`, `call_ended`, `done`, and `fatal`. Unknown future bot
events are retained and surfaced as status detail instead of being rejected.
The Conversations page shows scheduled, active, processing, ready, and failed
captures, including failure subcodes. Recall documents
[local webhook development](https://docs.recall.ai/docs/local-webhook-development),
[webhook verification](https://docs.recall.ai/docs/authenticating-requests-from-recallai)
and the [post-meeting transcript lifecycle](https://docs.recall.ai/docs/async-transcription).

## Architecture

```text
Meeting dialog ──create──► meeting_capture ──send──► Recall bot
                                ▲                       │
                                │ signed webhooks       │ transcript artifact
                                └──── Next.js route ◄───┘
                                             │
                                             ▼
                                  meetings → utterances
                                             │
                               AI SDK structured output
                                             │
                                             ▼
                                  claims → evidence
                                             │
                            retrieval → AI SDK synthesis
                                             │
                                  pages + API routes
```

Key boundaries:

- `src/lib/recall/` owns Recall transport, webhook processing, and response
  shapes.
- `src/lib/trail.ts` owns the meeting-series identifier contract; trail-scoped
  repository queries keep extraction memory and transcription vocabulary from
  leaking across series.
- `src/data/` implements the repository contract; pages do not issue SQL.
- `src/db/schema/` owns durable records and provenance invariants.
- `src/lib/knowledge-template.ts` owns domain-neutral extraction vocabulary.
- `src/lib/ai/` owns the OpenAI provider, structured extractor, and grounded
  answer generation.
- `src/app/` contains thin pages and route handlers.

The structure borrows conventions from the local Station application and
integration lessons from Recall.ai’s
[AI interview note-taker](https://github.com/recallai/ai-interview-note-taker),
without copying their broader service stacks.

## Claim model and query behavior

Every extraction compares the new transcript with the trail's existing open
claims. Its structured relationship is one of `new`, `reaffirms`,
`supersedes`, `disputes`, or `resolves`; the repository applies that change and
keeps the cited old and new meeting evidence. Claim state is explicit:

- `active`: the best currently supported statement
- `superseded`: retained history replaced by a newer claim
- `disputed`: something said but later contradicted or contested
- `resolved`: a previously open risk or question that later evidence closed

`claim_evidence` connects every published claim to stored utterances with the
meeting, speaker, relative start/end time, and quotation.
`claim_transition` is the append-oriented lifecycle trail.

```http
GET /api/query?q=Why%20was%20the%20launch%20delayed%3F
```

Search performs transparent PostgreSQL text matching over entity names,
descriptions, and claim text. `/api/answer` uses those retrieved results to
stream a concise source-numbered synthesis; the model never receives unrelated
workspace data.

## Verification

```bash
pnpm check       # formatting, lint, types, and tests
pnpm build       # Next.js production build
pnpm build:cf    # OpenNext Cloudflare build
```

## Speaker identity across meetings

Display names are presentation, not identity. Transcript normalization stores a
separate participant identity key with this precedence:

1. Calendar-matched participant email (normalized to lowercase).
2. Zoom `conf_user_id`, which is stable across meetings.
3. Platform plus normalized display name as an explicitly weak fallback.

Recall participant emails require a Calendar-created bot and may be null when
fuzzy matching is ambiguous. A production UI should let a user correct or merge
the fallback identity and preserve that merge history. This matters more here
than in a single-meeting notes app because attribution such as “Sarah reversed
Tuesday's decision” is only valid if both Sarah references resolve to the same
person. See Recall's guides to
[participant emails](https://docs.recall.ai/docs/meeting-participant-emails)
and [unique participant identification](https://docs.recall.ai/v1.10/docs/identify-meeting-participants-uniquely).

## Playback and expiring media

Transcript timestamps are controls: clicking one seeks the Recall recording to
that moment. Evidence links deep-link to the same timestamp. The application
stores recording and transcript artifact IDs, never their signed download
URLs. It retrieves a fresh video URL from Recall whenever the meeting player is
opened and a fresh transcript URL when `transcript.done` is processed.

## Scheduling and Calendar V2

This sample intentionally uses `join_at` to keep setup small and inspectable.
Production should use Recall Calendar V2 so recurring events create bots
reliably, calendar attendee emails can strengthen participant identity, and the
calendar's recurring-event data can choose the trail ID. The integration point
is capture creation: replace the dialog's ad-hoc/scheduled bot call with a
Calendar V2 event handler while keeping the same `trailId`/`meetingId` metadata
and downstream recording webhook flow.

## Current limitations

- High-volume webhook processing should move from post-response work to a
  leased PostgreSQL job worker for durable retries across deploys.
- Retrieval is lexical; AI synthesizes the retrieved evidence but does not yet
  perform semantic retrieval.
- Authentication, workspace isolation, consent/retention controls, and PII
  redaction are required before handling real customer meetings.
- Webhook audit payloads need an explicit production retention policy.
- Participant email matching depends on Calendar integration enablement; name
  fallback still needs a manual correction/merge UI.
- The demo uses `join_at`; Calendar V2 is the production scheduling path.

## Safe extension points

- Add a vertical with another `KnowledgeTemplate`; keep the claim/evidence model
  unchanged.
- Add a review queue for newly extracted claims before publishing them in
  regulated or high-stakes deployments.
- Add entity resolution with aliases and explicit merge history in PostgreSQL.
- Add a PostgreSQL jobs table with `FOR UPDATE SKIP LOCKED` before introducing
  more infrastructure.
- Add `pgvector` only if lexical retrieval proves insufficient.
- Add real-time transcription only for a genuinely in-meeting workflow; the
  decision trail intentionally uses the higher-quality post-meeting path.

## Deployment with OpenNext

`open-next.config.ts`, `next.config.ts`, and `wrangler.jsonc` are checked in.
For Cloudflare, create a Hyperdrive binding named `HYPERDRIVE`, add secrets with
`wrangler secret put`, and uncomment the binding in `wrangler.jsonc`. Node hosts
can use `DATABASE_URL`. Application data uses no Cloudflare KV, D1, or R2.

Do not commit account IDs, database URLs, API keys, or webhook secrets.
