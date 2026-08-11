// This app serves one school in Sri Lanka (UTC+5:30, no DST). Vercel runs
// serverless functions in UTC, so `new Date().setHours(0,0,0,0)` computes
// midnight in the wrong timezone — a class at 8pm local time could fall on
// the wrong side of the boundary. Compute "today" using a fixed offset instead.
const SRI_LANKA_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function getTodayRange() {
  const nowLocal = new Date(Date.now() + SRI_LANKA_OFFSET_MS);
  const startLocal = new Date(Date.UTC(
    nowLocal.getUTCFullYear(),
    nowLocal.getUTCMonth(),
    nowLocal.getUTCDate()
  ));
  const start = new Date(startLocal.getTime() - SRI_LANKA_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
