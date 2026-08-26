import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Batch, ClassSession, Student, Exam } from '@/models';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const batch = await Batch.findById(id);
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

    // A batch is a cohort: the same students stay in it while their grade
    // advances 3 -> 4 -> 5 (see POST ./promote), so the roster is fetched
    // alongside the schedule rather than being derived per class session.
    const [classes, students] = await Promise.all([
      ClassSession.find({ batchId: id }).sort({ date: -1 }),
      Student.find({ batchId: id }).sort({ grade: 1, name: 1 }),
    ]);

    return NextResponse.json({ batch, classes, students });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const data = await request.json();

    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.year !== undefined) update.year = data.year;
    if (data.batchYear !== undefined) update.batchYear = data.batchYear;
    if (data.grades !== undefined) update.grades = data.grades;

    // Changing batchYear does not renumber existing student IDs — those are
    // printed on cards. It only affects students registered from now on.
    const batch = await Batch.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    return NextResponse.json({ batch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    // A batch is the shared parent of three independent things — the roster,
    // the schedule and the exams. Cascading would be irreversible multi-entity
    // data loss from a single click, and this app has no undo anywhere, so a
    // referenced batch simply cannot be deleted. Detach or delete the children
    // first, deliberately.
    const [studentCount, classCount, examCount] = await Promise.all([
      Student.countDocuments({ batchId: id }),
      ClassSession.countDocuments({ batchId: id }),
      Exam.countDocuments({ batchId: id }),
    ]);

    if (studentCount > 0 || classCount > 0 || examCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${studentCount} student(s), ${classCount} class session(s) and ${examCount} exam(s) still belong to this batch.`,
          studentCount,
          classCount,
          examCount,
        },
        { status: 409 }
      );
    }

    const batch = await Batch.findByIdAndDelete(id);
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
