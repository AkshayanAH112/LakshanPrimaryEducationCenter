import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Batch, Student } from '@/models';

/**
 * Manual year-end grade rollover for one batch: Grade 3 -> 4 and Grade 4 -> 5,
 * in place. Same Student document, same qrCode (the printed card keeps working),
 * same batch — a batch is a cohort that carries its students up through the
 * grades, not a per-grade container.
 *
 * Grade 5 students are deliberately left alone: 6 isn't a valid grade, and
 * retiring a student after their final year stays a separate manual step (the
 * isActive toggle on the student page).
 *
 * Source grades are walked in DESCENDING order (4 first, then 3). Ascending
 * order would promote Grade 3 -> 4 and then immediately catch those same
 * students again in the 4 -> 5 pass, jumping them two grades in one click.
 */
const PROMOTIONS = [
  { fromGrade: 4, toGrade: 5 },
  { fromGrade: 3, toGrade: 4 },
];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const batch = await Batch.findById(id);
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

    const promotions: { fromGrade: number; toGrade: number; promotedCount: number }[] = [];

    for (const { fromGrade, toGrade } of PROMOTIONS) {
      const result = await Student.updateMany(
        { batchId: batch._id, grade: fromGrade, isActive: true },
        { $set: { grade: toGrade } }
      );
      if (result.modifiedCount > 0) {
        promotions.push({ fromGrade, toGrade, promotedCount: result.modifiedCount });
      }
    }

    // Keep batch.grades honest. Class scheduling and every roster lookup match
    // on (batchId, grade), so a batch that now holds Grade 5 students but
    // doesn't list Grade 5 would leave them unschedulable and invisible.
    const promotedInto = promotions.map((p) => p.toGrade);
    const missingGrades = promotedInto.filter((g) => !batch.grades.includes(g));
    if (missingGrades.length > 0) {
      batch.grades = [...batch.grades, ...missingGrades].sort((a: number, b: number) => a - b);
      await batch.save();
    }

    const totalPromoted = promotions.reduce((sum, p) => sum + p.promotedCount, 0);
    const students = await Student.find({ batchId: id }).sort({ grade: 1, name: 1 });

    return NextResponse.json({ success: true, promotions, totalPromoted, batch, students });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
