# Decision Trail

Decision Trail is a conversation-first memory for product and engineering teams. It turns a series of meeting transcripts into a current, evidence-backed view of what the team believes, what changed, who owns the next step, and why.

Unlike a single-meeting notes app, Decision Trail keeps history across conversations. Every extracted claim links to an exact speaker, timestamp, and transcript passage; newer claims can supersede earlier ones without erasing the original evidence.

## Prerequisites

The seeded walkthrough only requires:

1. [Node.js](https://nodejs.org/en/) 20.18 or later (Node 22 LTS is recommended)
2. [pnpm](https://pnpm.io/installation)

To send a bot to a real meeting, you will also need:

3. [PostgreSQL](https://www.postgresql.org/download/)
4. [Ngrok](https://ngrok.com/docs/getting-started/) with a [static domain](https://ngrok.com/docs/universal-gateway/domains/)
5. A Recall.ai API key and workspace verification secret (`whsec_…`) from the API keys page for your region
6. An [OpenAI API key](https://platform.openai.com/api-keys) for claim extraction and grounded answers

Recall.ai supports Zoom, Google Meet, Microsoft Teams, and other meeting platforms through its [Meeting Bot API](https://www.recall.ai/product/meeting-bot-api).

## Installation

### Clone the repository

```bash
git clone https://github.com/ben-jamming-reilly/decision-trail.git
cd decision-trail
```

### Install dependencies

```bash
pnpm install
cp .env.example .env.local
```

## Quickstart

The fastest way to review the project is the read-only seeded walkthrough. It does not require a database, Recall.ai account, or OpenAI key.

1. Set `DEMO_MODE=true` in `.env.local`.
2. Start the development server:

   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).
4. Review the current decision snapshot, then try these questions:
   - **Why was the launch delayed?**
   - **What changed about the target date?**
   - **Which customer conversations influenced this requirement?**
5. Follow an evidence link to the exact speaker and timestamp in the source transcript.

Demo mode is an in-process fixture, not a second datastore. Live data is persisted in PostgreSQL.

## Configuration

### Environment variables

Copy `.env.example` to `.env.local` and fill in the values for the path you want to run.

| Variable                | Required for   | Purpose                                                         |
| ----------------------- | -------------- | --------------------------------------------------------------- |
| `DEMO_MODE`             | all modes      | `true` uses the seeded walkthrough; `false` requires PostgreSQL |
| `DATABASE_URL`          | live meetings  | PostgreSQL connection string                                    |
| `RECALL_API_KEY`        | live meetings  | Server-only Recall.ai API key                                   |
| `RECALL_WEBHOOK_SECRET` | live meetings  | Recall.ai verification secret beginning with `whsec_`           |
| `RECALL_REGION`         | live meetings  | Recall.ai deployment region; defaults to `us-west-2`            |
| `PUBLIC_API_BASE_URL`   | local webhooks | Stable public ngrok origin without a trailing slash             |
| `OPENAI_API_KEY`        | AI features    | Server-only key for extraction and grounded answers             |
| `OPENAI_MODEL`          | optional       | OpenAI model; defaults to `gpt-5-mini`                          |

Never expose these values in client code or commit `.env*` files.

### PostgreSQL

Create the database, then apply the checked-in migrations and seed the same three-meeting story used by demo mode:

```bash
createdb recall_knowledge
pnpm db:migrate
pnpm db:seed
```

Set `DATABASE_URL` and `DEMO_MODE=false` in `.env.local` before starting the app. The seed command is idempotent.

## Live meeting quickstart

1. **Start the app** (terminal 1):

   ```bash
   pnpm dev
   ```

2. **Expose only the webhook route** through your static ngrok domain (terminal 2):

   ```bash
   ngrok http --url https://your-static-domain.ngrok-free.app 3000
   ```

   Save the same origin as `PUBLIC_API_BASE_URL`. Older ngrok versions accept `--domain` instead of `--url`.

3. **Configure a webhook endpoint** in the Recall.ai dashboard:
   - Endpoint: `https://your-static-domain.ngrok-free.app/api/webhooks/recall`
   - Subscribe to `recording.done`, `recording.failed`, `transcript.done`, and `transcript.failed`
   - Subscribe to `bot.joining_call`, `bot.in_waiting_room`, `bot.in_call_not_recording`, `bot.recording_permission_allowed`, `bot.recording_permission_denied`, `bot.in_call_recording`, `bot.call_ended`, `bot.done`, and `bot.fatal`
4. Copy the endpoint's verification secret into `RECALL_WEBHOOK_SECRET`, then restart the app.
5. Open [http://localhost:3000](http://localhost:3000), choose **New meeting**, and paste a supported HTTPS meeting URL. You can send the bot immediately or schedule it with `join_at`.

> **Note:** This sample has no authentication, workspace isolation, consent management, or retention controls. Keep the ngrok URL private, make sure every participant knows the call will be recorded and transcribed, and add the appropriate controls before using real customer meetings in production.

After Recall accepts the bot, Decision Trail opens a durable meeting page that follows the bot through joining, recording, transcription, and claim extraction. The app will:

- Track bot and recording status from verified webhooks
- Start post-meeting transcription when `recording.done` arrives
- Feed existing trail vocabulary back to Recall.ai as transcription `key_terms`
- Normalize speakers across meetings using calendar email, Zoom `conf_user_id`, or a display-name fallback
- Extract domain-neutral claims that cite exact utterance IDs
- Preserve superseded, disputed, and resolved history alongside the current state
- Show the recording and timestamped transcript after processing
- Answer cross-meeting questions using only retrieved claims and their evidence

Live transcript text and retrieved evidence are sent to the configured OpenAI account. Provider storage is disabled in AI SDK requests; review your account's applicable data controls before using customer meetings.

## How the decision trail works

Each meeting belongs to a trail. When its transcript is ready, structured extraction compares the conversation with that trail's existing open claims and labels each result as `new`, `reaffirms`, `supersedes`, `disputes`, or `resolves`.

The repository then applies the transition while retaining both old and new evidence:

- `active`: the best currently supported statement
- `superseded`: history replaced by a newer claim
- `disputed`: a statement later contradicted or contested
- `resolved`: a risk or question closed by later evidence

Cross-meeting questions first retrieve deterministic claim matches, then stream an AI synthesis grounded only in those claims and their transcript passages. The matching source cards remain visible beneath the answer.

## Troubleshooting

**The app opens with seeded data instead of PostgreSQL.** Set `DEMO_MODE=false` and confirm that `DATABASE_URL` is available to the Next.js process. With `DEMO_MODE=true`, live ingestion is intentionally read-only.

**The meeting status is stuck.** The app is probably not receiving webhooks. In the Recall.ai dashboard, confirm that the endpoint is active and ends in `/api/webhooks/recall`. A `404` usually means the path is wrong; a `401` means the verification secret does not match. Local development can use the meeting page's sync fallback, but deployed environments should treat verified webhooks as the lifecycle source of truth.

**The transcript is ready but no claims appear.** Confirm that `OPENAI_API_KEY` is set and inspect the capture's analysis error. The transcript remains available when extraction fails.

**A recording link expired.** Decision Trail stores Recall artifact IDs rather than signed download URLs. Opening the meeting page requests a fresh playback URL.

## Where to look in the code

- [`src/lib/recall/client.ts`](src/lib/recall/client.ts): Recall.ai requests, retries, bot configuration, async transcription, and fresh media URLs
- [`src/app/api/bots/route.ts`](src/app/api/bots/route.ts): immediate and scheduled bot creation
- [`src/app/api/webhooks/recall/route.ts`](src/app/api/webhooks/recall/route.ts): raw-body webhook verification and replay protection
- [`src/lib/recall/webhooks.ts`](src/lib/recall/webhooks.ts): bot lifecycle updates, post-meeting transcription, and ingestion
- [`src/lib/ai/extract.ts`](src/lib/ai/extract.ts): structured claim extraction against the existing trail
- [`src/lib/ai/answer.ts`](src/lib/ai/answer.ts): evidence-grounded answer generation
- [`src/lib/knowledge-template.ts`](src/lib/knowledge-template.ts): domain-neutral extraction vocabulary
- [`src/data/`](src/data/): demo and PostgreSQL repository implementations
- [`src/db/schema/knowledge.ts`](src/db/schema/knowledge.ts): durable claims, evidence, transitions, meetings, and webhook records

The app uses Next.js 16, React 19, PostgreSQL, Drizzle ORM, the Vercel AI SDK, OpenAI Structured Outputs, and Recall.ai.

## Verification

```bash
pnpm check       # formatting, lint, types, and tests
pnpm build       # Next.js production build
```
