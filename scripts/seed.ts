import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  claim,
  claimEvidence,
  claimTransition,
  entity,
  knowledgeTemplate,
  meeting,
  utterance,
} from "@/db/schema";
import { demoEntities, demoMeetings } from "@/lib/demo-data";
import { neutralTemplate } from "@/lib/knowledge-template";

const db = getDb();
const stableUuid = (value: number) =>
  `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;

async function seed() {
  await db
    .insert(knowledgeTemplate)
    .values({
      id: neutralTemplate.id,
      name: neutralTemplate.name,
      config: neutralTemplate,
    })
    .onConflictDoUpdate({
      target: knowledgeTemplate.id,
      set: { name: neutralTemplate.name, config: neutralTemplate },
    });

  const utteranceIds = new Map<string, string>();
  for (const [meetingIndex, demoMeeting] of demoMeetings.entries()) {
    await db
      .insert(meeting)
      .values({
        id: demoMeeting.id,
        title: demoMeeting.title,
        startedAt: new Date(demoMeeting.startedAt),
        recallBotId: demoMeeting.recallBotId,
        recallTranscriptId: `demo-transcript-${meetingIndex + 1}`,
        participants: demoMeeting.participants,
      })
      .onConflictDoUpdate({
        target: meeting.id,
        set: {
          title: demoMeeting.title,
          participants: demoMeeting.participants,
        },
      });
    for (const [utteranceIndex, item] of demoMeeting.utterances.entries()) {
      const id = stableUuid(100 + meetingIndex * 10 + utteranceIndex);
      utteranceIds.set(`${demoMeeting.id}:${item.text}`, id);
      await db
        .insert(utterance)
        .values({
          id,
          meetingId: demoMeeting.id,
          speaker: item.speaker,
          startSeconds: item.startSeconds,
          endSeconds: item.endSeconds,
          text: item.text,
          ordinal: utteranceIndex,
        })
        .onConflictDoUpdate({
          target: [utterance.meetingId, utterance.ordinal],
          set: { text: item.text, speaker: item.speaker },
        });
    }
  }

  const claimIds = new Map<string, string>();
  let claimNumber = 200;
  for (const demoEntity of demoEntities) {
    await db
      .insert(entity)
      .values({
        id: demoEntity.id,
        slug: demoEntity.slug,
        name: demoEntity.name,
        kind: demoEntity.kind,
        description: demoEntity.description,
        aliases: demoEntity.aliases,
        updatedAt: new Date(demoEntity.updatedAt),
      })
      .onConflictDoUpdate({
        target: entity.id,
        set: { name: demoEntity.name, description: demoEntity.description },
      });
    for (const demoClaim of demoEntity.claims) {
      const id = stableUuid(claimNumber++);
      claimIds.set(demoClaim.id, id);
      await db
        .insert(claim)
        .values({
          id,
          entityId: demoEntity.id,
          text: demoClaim.text,
          state: demoClaim.state,
          confidence: demoClaim.confidence,
          templateId: neutralTemplate.id,
          recordedAt: new Date(demoClaim.recordedAt),
        })
        .onConflictDoUpdate({
          target: claim.id,
          set: { text: demoClaim.text, state: demoClaim.state },
        });
      for (const item of demoClaim.evidence) {
        const utteranceId = utteranceIds.get(`${item.meetingId}:${item.quote}`);
        if (!utteranceId)
          throw new Error(`Missing utterance for evidence ${item.id}`);
        await db
          .insert(claimEvidence)
          .values({ claimId: id, utteranceId })
          .onConflictDoNothing();
      }
      await db
        .insert(claimTransition)
        .values({
          id: stableUuid(claimNumber + 500),
          claimId: id,
          toState: demoClaim.state,
          reason: "Seeded demonstration history",
          meetingId: demoClaim.evidence[0]?.meetingId,
          changedAt: new Date(demoClaim.recordedAt),
        })
        .onConflictDoNothing();
    }
  }

  for (const demoEntity of demoEntities) {
    for (const demoClaim of demoEntity.claims) {
      if (!demoClaim.supersedesClaimId) continue;
      await db
        .update(claim)
        .set({ supersedesClaimId: claimIds.get(demoClaim.supersedesClaimId) })
        .where(eq(claim.id, claimIds.get(demoClaim.id)!));
    }
  }
}

seed()
  .then(() => {
    console.log("Seeded three meetings and longitudinal claim history.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
