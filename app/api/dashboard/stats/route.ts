import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Student, ClassSession, Attendance, Marks } from '@/models';
import { getTodayRange } from '@/lib/dateRange';
import { getOutstandingAttendance } from '@/lib/payments';

export async function GET() {
  try {
    await connectToDatabase();
    const { start, end } = getTodayRange();

    const [totalStudents, todaySessions, recentMarks, outstanding] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      ClassSession.find({ date: { $gte: start, $lt: end } }),
      Marks.countDocuments({ createdAt: { $gte: start, $lt: end } }),
      getOutstandingAttendance(),
    ]);

    // Today's attendance %: roster = students matching any (batchId, grade)
    // combo among today's sessions, scored against attendance for those
    // exact class sessions — not a blind date-range scan of Attendance.date,
    // which only reflects when a record was last edited.
    const hasClassesToday = todaySessions.length > 0;
    let totalRosterSlots = 0;
    let presentRosterSlots = 0;
    // Fees for today's sessions specifically — only students marked present owe
    // anything, matching getOutstandingAttendance(). Drives the "Today's
    // Payments" card, which links through to the per-student breakdown at
    // /api/payments/today.
    let todayCollected = 0;
    let todayExpected = 0;
    let todayPaidCount = 0;

    if (hasClassesToday) {
      const sessionIds = todaySessions.map((s) => s._id.toString());
      const rosterStudents = await Student.find({
        $or: todaySessions.map((s) => ({ batchId: s.batchId, grade: s.grade })),
      });
      const todayAttendanceRecords = await Attendance.find({ classId: { $in: sessionIds } });

      for (const session of todaySessions) {
        const roster = rosterStudents.filter(
          (s) => s.batchId?.toString() === session.batchId.toString() && s.grade === session.grade
        );
        totalRosterSlots += roster.length;
        for (const student of roster) {
          const record = todayAttendanceRecords.find(
            (a) => a.studentId.toString() === student._id.toString() && a.classId.toString() === session._id.toString()
          );
          if (record?.present) {
            presentRosterSlots++;
            const due = session.paymentAmount || 0;
            const paidAmount = record.paidAmount || 0;
            todayExpected += due;
            todayCollected += Math.min(paidAmount, due);
            if (paidAmount >= due) todayPaidCount++;
          }
        }
      }
    }

    const attendancePercent = totalRosterSlots > 0
      ? Math.round((presentRosterSlots / totalRosterSlots) * 100)
      : 0;

    // Real cash owed: sum (fee - paid so far) over every present-but-unsettled
    // attendance row, instead of just counting rows.
    let totalPendingAmount = 0;
    let todayPendingAmount = 0;
    for (const { classSession, balance } of outstanding) {
      totalPendingAmount += balance;
      if (classSession.date >= start && classSession.date < end) {
        todayPendingAmount += balance;
      }
    }

    return NextResponse.json({
      totalStudents,
      hasClassesToday,
      todayAttendance: `${attendancePercent}%`,
      totalPendingAmount,
      todayPendingAmount,
      todayCollected,
      todayExpected,
      todayPaidCount,
      todayPresentCount: presentRosterSlots,
      recentMarks,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
