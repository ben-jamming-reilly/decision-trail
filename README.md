# Recall Knowledge

Recall Knowledge turns a sequence of meeting transcripts into a living,
source-grounded wiki. It is a deliberately small foundation for longitudinal
conversation intelligence: every extracted statement is a **claim**, every
claim points to verbatim transcript evidence, and older or conflicting claims
remain visible instead of being silently overwritten.

The included walkthrough follows the fictional Atlas initiative across three
meetings. A March 15 pilot target is superseded by April 2, an optimistic
partner-count claim is disputed, and a later meeting confirms launch readiness.

## What is included

- Next.js 16 App Router UI and JSON query endpoint
- OpenNext configuration for Cloudflare Workers
- PostgreSQL-only persistence with Drizzle schema and migrations
- Recall.ai client with retry handling for 429, 503, and 507 responses
- verified webhook endpoint with raw-body HMAC verification and replay protection
- post-meeting `transcript.done` retrieval and transcript normalization
- immutable meeting/utterance evidence and append-oriented claim history
- domain-neutral `KnowledgeTemplate` contract for later verticalization
- fixture walkthrough plus idempotent PostgreSQL seed script
- entity wiki, claim timeline, transcript pages, and cross-meeting search

There is no Redis, queue, graph database, separate backend, real-time transcript
path, or unrelated product integration.

## Quick walkthrough (no credentials required)

Use Node.js 20.18 or newer (Node 22 LTS is recommended for OpenNext builds).

```bash
pnpm install
cp .env.example .env.local
```

Set `DEMO_MODE=true` in `.env.local`, then:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Suggested flow:

1. Ask **“What changed about the Atlas pilot?”** on the overview or query page.
2. Open **Atlas pilot** and compare active, superseded, and disputed claims.
3. Follow an evidence card into the exact speaker/timestamp in a meeting.
4. Open **Identity migration** to see one dependency evolve across meetings.

Demo mode is an in-process, read-only walkthrough—not a second datastore. All
production persistence uses PostgreSQL.

## PostgreSQL setup

Create a database and copy the example environment file:

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

`db:seed` is idempotent and loads the same three-meeting walkthrough into
PostgreSQL. Drizzle's typed source schema is in
`src/db/schema/knowledge.ts`; generated SQL is committed under `drizzle/`.
Schema conventions and invariants are documented in `rules/db-schema.md`.

## Recall.ai setup

| Variable                | Required   | Purpose                                                       |
| ----------------------- | ---------- | ------------------------------------------------------------- |
| `DATABASE_URL`          | production | PostgreSQL connection string                                  |
| `DEMO_MODE`             | no         | `true` forces the walkthrough; `false` requires PostgreSQL    |
| `RECALL_API_KEY`        | ingestion  | server-only Recall API key                                    |
| `RECALL_WEBHOOK_SECRET` | ingestion  | verification secret beginning with `whsec_`                   |
| `RECALL_REGION`         | ingestion  | `us-west-2`, `us-east-1`, `eu-central-1`, or `ap-northeast-1` |

Never expose these values in client code. The application sends Recall API
credentials only from the server and never commits `.env*` files.

Configure a Recall webhook endpoint at:

```text
https://YOUR_HOST/api/webhooks/recall
```

Subscribe at minimum to `transcript.done`; subscribing to `transcript.failed`,
`recording.done`, and bot lifecycle events also preserves them in the webhook
audit table. For local testing, expose the Next.js server with a stable HTTPS
tunnel. Recall's [verification guide](https://docs.recall.ai/docs/authenticating-requests-from-recallai)
describes workspace secrets, and its [post-meeting transcription guide](https://docs.recall.ai/docs/async-transcription)
describes the artifact lifecycle.

The handler verifies the exact raw request body, accepts both current
`webhook-*` and legacy `svix-*` headers, rejects deliveries outside a five-minute
window, downloads the short-lived transcript URL immediately, and upserts the
meeting by Recall transcript ID.

## Architecture

```text
Recall transcript.done
        │ signed raw webhook
        ▼
Next.js route ──verify──► Recall client ──download──► normalized utterances
        │                                                   │
        └──────────────── PostgreSQL repository ◄───────────┘
                                  │
                     meetings → claims → evidence
                                  │
                   server pages + /api/query
```

Important boundaries:

- `src/integrations/recall/` owns Recall-specific transport and shapes.
- `src/data/` implements the repository contract; pages never issue SQL.
- `src/db/schema/` owns durable records and provenance invariants.
- `src/lib/knowledge-template.ts` owns domain vocabulary and extraction guidance.
- `src/app/` contains thin pages and route handlers.

This layout borrows useful conventions from the local Station application
(pnpm, `src/`, Drizzle, Tailwind v4, OpenNext/Hyperdrive-aware database access)
and integration lessons from Recall.ai's
[AI interview note-taker](https://github.com/recallai/ai-interview-note-taker)
(metadata correlation, retries, raw-body verification, and immediate download of
expiring transcript URLs). Their broader service stacks are intentionally not
copied.

## Data model and provenance

A claim is not promoted to unquestioned truth. Its lifecycle state is one of:

- `active`: the best currently supported statement
- `superseded`: retained history replaced by a newer claim
- `disputed`: supported as something said, but contradicted or contested

`claim_evidence` requires every published claim to point to one or more stored
utterances. Each utterance keeps its meeting, speaker, relative start/end time,
and quotation. `claim_transition` is the append-only audit trail for lifecycle
changes. The application never mutates transcript evidence during claim updates.

## Query API

```http
GET /api/query?q=identity
```

The endpoint currently performs PostgreSQL text matching over entity names,
descriptions, and claims, then returns hydrated claims with evidence. It is
intentionally transparent and deterministic. PostgreSQL full-text search or
`pgvector` can be introduced later without adding another database.

## Verification

```bash
pnpm check       # formatting, lint, types, and tests
pnpm build       # Next.js production build
pnpm build:cf    # OpenNext Cloudflare build
```

Tests cover signature/replay validation, Recall transcript normalization, and
the longitudinal demo states/query behavior.

## Current limitations

- The ingestion boundary stores completed transcripts; automated claim
  extraction is represented by the template and data contracts but is not yet
  connected to a model. The seeded claims demonstrate the intended output.
- The webhook processes transcript download inline. For higher volume, use a
  PostgreSQL-backed jobs table and a scheduled Worker—still no Redis required.
- Search is lexical and does not yet summarize or synthesize an answer.
- Authentication, workspace isolation, retention/consent controls, and PII
  redaction must be added before handling real customer meetings.
- Webhook audit payload retention needs an explicit production retention policy.
- The application receives completed Recall transcripts but does not yet create
  or schedule bots. When added, include the local meeting UUID in Recall
  `metadata`; Recall echoes it on lifecycle webhooks for stable correlation.

## Safe extension points

- Add a vertical by creating another `KnowledgeTemplate`; keep the underlying
  claim/evidence model unchanged.
- Add extraction behind a `ClaimExtractor` interface and require utterance IDs
  in its structured output. Never allow uncited claims into the wiki.
- Add entity resolution as a PostgreSQL transaction with aliases and explicit
  merge history; do not use names as identity.
- Add asynchronous work with a PostgreSQL jobs table and `FOR UPDATE SKIP
LOCKED` before considering more infrastructure.
- Add semantic search with PostgreSQL `pgvector` only if lexical retrieval proves
  insufficient.
- Add bot creation to the Recall client using metadata correlation and the same
  verified webhook path.

## Deployment with OpenNext

`open-next.config.ts`, `next.config.ts`, and `wrangler.jsonc` are checked in.
For Cloudflare, create a Hyperdrive binding named `HYPERDRIVE` that points to the
PostgreSQL database, add secrets with `wrangler secret put`, and uncomment the
binding in `wrangler.jsonc`. The repository also accepts `DATABASE_URL` on Node
hosts. No Cloudflare KV, D1, or R2 binding is used for application data.

Do not commit account IDs, database URLs, API keys, or webhook secrets.
