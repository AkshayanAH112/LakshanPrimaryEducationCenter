import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { ClassSession, Student, Attendance, Payment } from '@/models';
import { computeBalance } from '@/lib/payments';
import { ensureAttendanceRows, sessionHasRecordedData } from '@/lib/roster';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const classSession = await ClassSession.findById(id).populate('batchId');
    if (!classSession) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // Everyone in this batch+grade, whether or not a row exists yet. Kept wider
    // than the pre-creation rule on purpose: a student who has since been
    // deactivated should still show their recorded attendance, not vanish.
    const students = await Student.find({
      batchId: classSession.batchId._id,
      grade: classSession.grade,
    }).sort({ name: 1 });

    const attendanceRecords = await Attendance.find({ classId: id });

    const roster = students.map((student) => {
      const record = attendanceRecords.find((a) => a.studentId.toString() === student._id.toString());
      const due = classSession.paymentAmount || 0;
      const paidAmount = record?.paidAmount || 0;
      return {
        student,
        isPresent: record ? record.present : false,
        isPaid: record ? record.paid : false,
        paidAmount,
        due,
        balance: record?.present ? computeBalance(due, paidAmount) : 0,
        attendanceId: record ? record._id : null,
      };
    });

    return NextResponse.json({ classSession, roster });
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
    if (data.batchId !== undefined) update.batchId = data.batchId;
    if (data.grade !== undefined) update.grade = data.grade;
    if (data.date !== undefined) update.date = data.date;
    if (data.time !== undefined) update.time = data.time;
    if (data.subject !== undefined) update.subject = data.subject;
    if (data.paymentAmount !== undefined) update.paymentAmount = data.paymentAmount;

    const classSession = await ClassSession.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!classSession) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // Moving a class to another batch/grade/date changes who belongs to it, so
    // top the roster back up. Existing rows are never overwritten.
    if (data.batchId !== undefined || data.grade !== undefined || data.date !== undefined) {
      await ensureAttendanceRows(classSession);
    }

    // Note: changing paymentAmount re-prices what everyone owes for this
    // session, since balances are computed as (fee - paidAmount) rather than
    // stored. Already-collected paidAmount values are left untouched.
    return NextResponse.json({ class: classSession });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const force = new URL(request.url).searchParams.get('force') === 'true';

    const classSession = await ClassSession.findById(id);
    if (!classSession) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // Every class now starts with a full set of blank rows, so "has attendance
    // rows" can't be the guard — it would block every delete. What matters is
    // whether anything real was recorded: someone present, or money taken.
    if (!force && (await sessionHasRecordedData(id))) {
      const present = await Attendance.countDocuments({ classId: id, present: true });
      const paid = await Attendance.countDocuments({ classId: id, paidAmount: { $gt: 0 } });
      return NextResponse.json(
        {
          error: `This class already has ${present} student(s) marked present and ${paid} payment(s) recorded. Deleting it destroys that history.`,
          presentCount: present,
          paidCount: paid,
        },
        { status: 409 }
      );
    }

    await Promise.all([
      Attendance.deleteMany({ classId: id }),
      Payment.deleteMany({ classId: id }),
    ]);
    await ClassSession.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
