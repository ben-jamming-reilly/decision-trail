import { extractMeetingClaims } from "@/lib/ai/extract";
import { isAIConfigured } from "@/lib/ai/config";
import type { KnowledgeRepository, TranscriptInput } from "@/lib/repository";

export async function ingestTranscript(
  repository: KnowledgeRepository,
  transcript: TranscriptInput,
) {
  const meetingId = await repository.saveTranscript(transcript);
  if (!isAIConfigured()) {
    return { meetingId, extractedClaims: 0, analysisError: undefined };
  }

  try {
    const extractedClaims = await extractMeetingClaims(repository, meetingId);
    return { meetingId, extractedClaims, analysisError: undefined };
  } catch (error) {
    const analysisError =
      error instanceof Error ? error.message : "AI extraction failed";
    console.error(`[ai] meeting ${meetingId} extraction failed`, analysisError);
    return { meetingId, extractedClaims: 0, analysisError };
  }
}
