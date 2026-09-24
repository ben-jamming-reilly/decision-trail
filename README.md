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
- **Live Recall + OpenAI ingestion** sends a bot to a meeting, imports the
  completed transcript, then uses the Vercel AI SDK with OpenAI Structured
  Outputs to extract claims that cite exact utterance IDs.

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
immediately or schedule it. The server gives the Recall bot an explicit
recording notice, stores correlation metadata, and enables transcription. Local
tests can poll and import a completed transcript; deployed environments should
use the verified webhook as the primary lifecycle path. Once stored, the
transcript is analyzed into domain-neutral claims. If extraction fails, the
transcript remains available and the capture reports the analysis error.

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

Subscribe at minimum to `transcript.done`. `transcript.failed`,
`recording.done`, and bot lifecycle events are also retained in the webhook
audit table. Recall documents
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

Claim state is explicit:

- `active`: the best currently supported statement
- `superseded`: retained history replaced by a newer claim
- `disputed`: something said but later contradicted or contested

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

## Current limitations

- High-volume webhook processing should move from post-response work to a
  leased PostgreSQL job worker for durable retries across deploys.
- Retrieval is lexical; AI synthesizes the retrieved evidence but does not yet
  perform semantic retrieval.
- Authentication, workspace isolation, consent/retention controls, and PII
  redaction are required before handling real customer meetings.
- Webhook audit payloads need an explicit production retention policy.
- Scheduled/in-progress capture state is durable but not yet listed on the
  overview before a transcript is ready.

## Safe extension points

- Add a vertical with another `KnowledgeTemplate`; keep the claim/evidence model
  unchanged.
- Add a review queue for newly extracted claims before publishing them in
  regulated or high-stakes deployments.
- Add entity resolution with aliases and explicit merge history in PostgreSQL.
- Add a PostgreSQL jobs table with `FOR UPDATE SKIP LOCKED` before introducing
  more infrastructure.
- Add `pgvector` only if lexical retrieval proves insufficient.

## Deployment with OpenNext

`open-next.config.ts`, `next.config.ts`, and `wrangler.jsonc` are checked in.
For Cloudflare, create a Hyperdrive binding named `HYPERDRIVE`, add secrets with
`wrangler secret put`, and uncomment the binding in `wrangler.jsonc`. Node hosts
can use `DATABASE_URL`. Application data uses no Cloudflare KV, D1, or R2.

Do not commit account IDs, database URLs, API keys, or webhook secrets.
