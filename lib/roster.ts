import { Attendance, Student } from '@/models';

type SessionLike = {
  _id: any;
  batchId: any;
  grade: number;
  date: Date;
};

/**
 * The students a session applies to. Membership is derived, not stored:
 * same batch + same grade, active, and enrolled on or before the class date.
 */
export async function getEligibleStudents(session: SessionLike) {
  const students = await Student.find({
    batchId: session.batchId?._id ?? session.batchId,
    grade: session.grade,
    isActive: true,
  }).sort({ name: 1 });

  return students.filter((s) => !s.registrationDate || s.registrationDate <= session.date);
}

/**
 * Pre-creates a blank attendance row — absent, unpaid — for every eligible
 * student who doesn't already have one for this session.
 *
 * This is what makes a newly created class arrive with its whole roster already
 * listed as absent, so scanning a student flips them to present rather than
 * conjuring a row from nothing.
 *
 * `$setOnInsert` + upsert makes it idempotent and safe to re-run: an existing
 * row is never overwritten, so re-syncing after adding students to the batch
 * can't wipe attendance or payments already recorded. The compound unique index
 * on {studentId, classId} is what upsert matches on.
 *
 * `date` is seeded from the class date rather than "now" — for a row nobody has
 * touched yet, the day of the class is the truthful value. POST /api/attendance
 * overwrites it with the edit time as soon as it is actually recorded.
 */
export async function ensureAttendanceRows(session: SessionLike) {
  const students = await getEligibleStudents(session);
  if (students.length === 0) return { created: 0, rosterSize: 0 };

  const existing = await Attendance.find({ classId: session._id }).select('studentId');
  const have = new Set(existing.map((a: any) => a.studentId.toString()));
  const missing = students.filter((s) => !have.has(s._id.toString()));

  if (missing.length > 0) {
    await Attendance.bulkWrite(
      missing.map((s) => ({
        updateOne: {
          filter: { studentId: s._id, classId: session._id },
          update: {
            $setOnInsert: {
              present: false,
              paid: false,
              paidAmount: 0,
              date: session.date,
            },
          },
          upsert: true,
        },
      }))
    );
  }

  return { created: missing.length, rosterSize: students.length };
}

/**
 * True when a session carries real recorded data — anyone marked present, or
 * any money taken. Blank pre-created rows don't count, which is what makes it
 * safe to delete a class that was created by mistake.
 */
export async function sessionHasRecordedData(classId: string) {
  const meaningful = await Attendance.countDocuments({
    classId,
    $or: [{ present: true }, { paidAmount: { $gt: 0 } }],
  });
  return meaningful > 0;
}
