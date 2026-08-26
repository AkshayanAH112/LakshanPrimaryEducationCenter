import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Exam, Marks, Student } from '@/models';
import { notifyGuardian } from '@/lib/notify';

/**
 * One entry point for both marks flows: the web roster posts an array, the
 * mobile per-student form posts a single entry. Upserts by {examId, studentId}
 * and denormalizes subject/examDate/maxMarks/grade/batchId from the parent Exam
 * onto every row, so everything that already queries those flat fields (the
 * student profile, analysis, dashboard stats) keeps working unchanged.
 *
 * Every scored entry messages the guardian, matching how /api/marks has always
 * behaved. Absent entries are skipped — there is no score to report. Callers
 * are expected to post only CHANGED rows: re-posting an unchanged mark will
 * message the guardian again.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const exam = await Exam.findById(id);
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

    const data = await request.json();
    const entries = Array.isArray(data) ? data : [data];

    let notified = 0;

    for (const entry of entries) {
      const isAbsent = Boolean(entry.isAbsent);
      const marks = isAbsent ? 0 : Number(entry.marks);

      await Marks.findOneAndUpdate(
        { examId: id, studentId: entry.studentId },
        {
          studentId: entry.studentId,
          marks,
          isAbsent,
          examId: id,
          subject: exam.subject,
          examName: exam.name,
          examDate: exam.examDate,
          maxMarks: exam.maxMarks,
          grade: exam.grade,
          batchId: exam.batchId,
        },
        { upsert: true, runValidators: true }
      );

      if (isAbsent) continue;

      const student = await Student.findById(entry.studentId);
      if (student?.guardianPhone) {
        const percentage = Math.round((marks / exam.maxMarks) * 100);
        const label = exam.name ? `${exam.name} (${exam.subject})` : exam.subject;
        const text = `Lakshan Primary: ${student.name} scored ${marks}/${exam.maxMarks} (${percentage}%) in ${label}.`;
        if ((await notifyGuardian(student.guardianPhone, text)) !== 'failed') notified += 1;
      }
    }

    return NextResponse.json({ success: true, count: entries.length, notified }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
