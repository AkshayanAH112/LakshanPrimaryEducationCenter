import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Exam, Student, Marks } from '@/models';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const exam = await Exam.findById(id).populate('batchId', 'name');
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

    // Same roster derivation as GET /api/classes/[id]: students matched to the
    // exam by (batchId, grade), left-joined with whatever marks already exist.
    const students = await Student.find({ batchId: exam.batchId, grade: exam.grade }).sort({ name: 1 });
    const marks = await Marks.find({ examId: id });

    const roster = students.map((student) => {
      const mark = marks.find((m) => m.studentId.toString() === student._id.toString());
      return { student, mark: mark ?? null, isRecorded: Boolean(mark) };
    });

    return NextResponse.json({ exam, roster });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const data = await request.json();

    const update: Record<string, unknown> = {};
    if (data.subject !== undefined) update.subject = data.subject;
    if (data.grade !== undefined) update.grade = data.grade;
    if (data.batchId !== undefined) update.batchId = data.batchId;
    if (data.examDate !== undefined) update.examDate = data.examDate;
    if (data.maxMarks !== undefined) update.maxMarks = data.maxMarks;
    if (data.name !== undefined) update.name = data.name;

    // Editing maxMarks deliberately does NOT rescale marks already entered —
    // each Marks row keeps the maxMarks it was recorded against.
    const exam = await Exam.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    return NextResponse.json({ exam });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const exam = await Exam.findByIdAndDelete(id);
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

    // Deliberate exception to the block-if-referenced rule used elsewhere:
    // marks entered through this exam only exist because this exam created
    // them, so cascading is safe here. Rows from the older flat /api/marks
    // flow have no examId and are untouched.
    await Marks.deleteMany({ examId: id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
