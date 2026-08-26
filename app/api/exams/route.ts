import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Exam, Marks } from '@/models';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');
    const batchId = searchParams.get('batchId');
    const subject = searchParams.get('subject');

    const query: Record<string, unknown> = {};
    if (grade) query.grade = Number(grade);
    if (batchId) query.batchId = batchId;
    if (subject) query.subject = subject;

    const exams = await Exam.find(query).populate('batchId', 'name').sort({ examDate: -1 });

    // Per-exam results count and average, in the same manual-reduce style the
    // rest of this API uses. Absent entries still count as "recorded" (the
    // student was reviewed) but are excluded from the sums driving the average.
    const examIds = exams.map((e) => e._id);
    const allMarks = await Marks.find({ examId: { $in: examIds } });
    const byExam = new Map<string, { count: number; scored: number; max: number }>();
    for (const m of allMarks) {
      const key = m.examId!.toString();
      const entry = byExam.get(key) ?? { count: 0, scored: 0, max: 0 };
      entry.count += 1;
      if (!m.isAbsent) {
        entry.scored += m.marks;
        entry.max += m.maxMarks;
      }
      byExam.set(key, entry);
    }

    const result = exams.map((e) => {
      const stats = byExam.get(e._id.toString());
      return {
        ...e.toObject(),
        resultsCount: stats?.count ?? 0,
        averagePercent: stats && stats.max > 0 ? Math.round((stats.scored / stats.max) * 100) : null,
      };
    });

    return NextResponse.json({ exams: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    // Creates the exam shell only — no marks yet. Staff fill in the roster
    // afterwards via POST /api/exams/[id]/marks, any number of times.
    const exam = await Exam.create({
      subject: data.subject,
      grade: data.grade,
      batchId: data.batchId,
      examDate: data.examDate,
      maxMarks: data.maxMarks,
      name: data.name,
    });
    return NextResponse.json({ exam }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
