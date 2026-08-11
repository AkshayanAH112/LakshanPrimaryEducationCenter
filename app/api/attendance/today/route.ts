import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { ClassSession, Student, Attendance } from '@/models';
import { getTodayRange } from '@/lib/dateRange';

export async function GET() {
  try {
    await connectToDatabase();
    const { start, end } = getTodayRange();

    const sessions = await ClassSession.find({ date: { $gte: start, $lt: end } })
      .populate('batchId')
      .sort({ time: 1 });

    if (sessions.length === 0) {
      return NextResponse.json({ sessions: [] });
    }

    const sessionIds = sessions.map((s) => s._id.toString());
    const [rosterStudents, attendanceRecords] = await Promise.all([
      Student.find({ $or: sessions.map((s) => ({ batchId: s.batchId, grade: s.grade })) }).sort({ name: 1 }),
      Attendance.find({ classId: { $in: sessionIds } }),
    ]);

    const result = sessions.map((session) => {
      const roster = rosterStudents.filter(
        (s) => s.batchId?.toString() === session.batchId._id.toString() && s.grade === session.grade
      );
      return {
        classSession: session,
        roster: roster.map((student) => {
          const record = attendanceRecords.find(
            (a) => a.studentId.toString() === student._id.toString() && a.classId.toString() === session._id.toString()
          );
          return {
            student,
            isPresent: record ? record.present : false,
            isPaid: record ? record.paid : false,
            balance: session.paymentAmount - (record?.paidAmount || 0),
          };
        }),
      };
    });

    return NextResponse.json({ sessions: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
