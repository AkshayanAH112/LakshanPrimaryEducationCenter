import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Student } from '@/models';
import { nextRegistrationNumber, resolveBatchYear } from '@/lib/registration';

/**
 * One-time, idempotent migration for students that predate the
 * registrationNumber field. Groups them by batch year (falling back to the
 * year they were created), orders each group oldest-first so the earliest
 * student gets the lowest number, and seeds that year's Counter along the way
 * so live registrations afterwards continue the same series.
 *
 * registrationDate is set to createdAt as the best available stand-in for
 * students who existed before that field did either.
 *
 * Filtering on `registrationNumber: { $exists: false }` makes reruns a no-op,
 * so this is safe to re-trigger if it is ever interrupted partway.
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const force = new URL(request.url).searchParams.get('force') === 'true';

    const unmigrated = await Student.find({ registrationNumber: { $exists: false } })
      .populate('batchId')
      .sort({ createdAt: 1 });

    // A student ID is permanent the moment it is printed, so refuse to mint one
    // from a fallback year. A batch with no batchYear would silently number its
    // students under the START year (2026) instead of the year the batch is
    // named for (2028) — wrong, and not fixable afterwards.
    if (!force) {
      const missing = unmigrated
        .map((s) => s.batchId as any)
        .filter((b) => b && b.batchYear == null);
      const names = Array.from(new Set(missing.map((b) => b.name)));
      if (names.length > 0) {
        return NextResponse.json(
          {
            error: `Set the batch year first for: ${names.join(', ')}. Open the batch and set it, then assign IDs — student IDs cannot be renumbered once printed.`,
            batchesMissingYear: names,
          },
          { status: 409 }
        );
      }
    }

    const groups = new Map<number, typeof unmigrated>();
    for (const student of unmigrated) {
      // resolveBatchYear defaults to the CURRENT year when given nothing, which
      // is wrong for a historical backfill — fall back to the year the student
      // record was actually created instead.
      const batch = student.batchId as any;
      const year = batch ? resolveBatchYear(batch) : student.createdAt.getFullYear();
      const group = groups.get(year) ?? [];
      group.push(student);
      groups.set(year, group);
    }

    let studentsUpdated = 0;
    const assigned: { name: string; registrationNumber: string }[] = [];

    for (const [year, group] of groups) {
      for (const student of group) {
        const registrationNumber = await nextRegistrationNumber(year);
        await Student.findByIdAndUpdate(student._id, {
          registrationNumber,
          registrationDate: student.registrationDate ?? student.createdAt,
        });
        assigned.push({ name: student.name, registrationNumber });
        studentsUpdated += 1;
      }
    }

    return NextResponse.json({
      studentsUpdated,
      years: Array.from(groups.keys()),
      assigned,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
