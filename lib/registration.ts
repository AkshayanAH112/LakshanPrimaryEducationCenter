import { Counter } from '@/models';

/** Institution code that prefixes every student ID. */
export const REG_PREFIX = 'LPEC';

type BatchYearSource = { batchYear?: number | null; year?: number | null } | null | undefined;

/**
 * The year a student ID is sequenced under: the batch's OWN year — the
 * scholarship year it is named for, e.g. 2028 for a "2028 Scholarship Batch"
 * that starts in 2026 — not the year the cohort started.
 *
 * The whole cohort therefore shares one number series for its entire run,
 * instead of the series shifting under them as calendar years pass.
 *
 * Falls back to the start year for batches created before `batchYear` existed,
 * then to the current year for a student with no batch at all.
 */
export function resolveBatchYear(batch: BatchYearSource): number {
  return batch?.batchYear ?? batch?.year ?? new Date().getFullYear();
}

/**
 * Claims the next ID in that year's series, atomically. Uses a counter rather
 * than countDocuments() so numbers are never reused after a student is deleted,
 * and two admins registering at the same moment can never land on the same one.
 */
export async function nextRegistrationNumber(year: number): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { _id: `regno-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `${REG_PREFIX}/${year}/${String(counter.seq).padStart(4, '0')}`;
}
