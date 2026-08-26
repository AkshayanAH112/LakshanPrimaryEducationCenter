import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Batch, Student } from '@/models';

/**
 * Assign existing students to this batch. A student belongs to exactly one
 * batch (Student.batchId is a single ref), so assigning someone who is already
 * in another batch *moves* them rather than adding a second membership — the
 * caller is expected to surface that. Nothing is duplicated: the same Student
 * document is reused, keeping its qrCode, attendance and payment history intact.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const { studentIds } = await request.json();

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'studentIds must be a non-empty array' }, { status: 400 });
    }

    const batch = await Batch.findById(id);
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

    const found = await Student.find({ _id: { $in: studentIds } });
    if (found.length !== studentIds.length) {
      return NextResponse.json({ error: 'One or more students not found' }, { status: 404 });
    }

    // Rosters are matched on (batchId, grade), so a student whose grade the
    // batch doesn't teach would join it and then never appear in any session.
    const mismatched = found.filter((s) => !batch.grades.includes(s.grade));
    if (mismatched.length > 0) {
      return NextResponse.json(
        {
          error: `This batch covers Grade ${batch.grades.join(', ')}. Cannot add: ${mismatched
            .map((s) => `${s.name} (Grade ${s.grade})`)
            .join(', ')}`,
        },
        { status: 400 }
      );
    }

    await Student.updateMany({ _id: { $in: studentIds } }, { $set: { batchId: batch._id } });

    const students = await Student.find({ batchId: id }).sort({ grade: 1, name: 1 });
    return NextResponse.json({ success: true, assigned: studentIds.length, students });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
