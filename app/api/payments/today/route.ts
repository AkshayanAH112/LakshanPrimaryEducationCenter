import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { ClassSession, Student, Attendance } from '@/models';
import { getTodayRange } from '@/lib/dateRange';
import { computeBalance } from '@/lib/payments';

/**
 * Today's fee collection, per class session: who has paid and who has not.
 *
 * Only students marked PRESENT owe anything — that is the same rule
 * getOutstandingAttendance() applies, and the reason absent students are
 * reported separately rather than counted as unpaid.
 *
 * Scope note: this covers fees for TODAY'S sessions. It deliberately does not
 * try to report "cash taken today" across older classes, because Payment.amount
 * stores the cumulative amount paid for a class rather than each transaction —
 * a catch-up payment through /api/payments/collect overwrites the row instead of
 * appending to it, so a per-day cash total cannot be derived from it correctly.
 */
export async function GET() {
  try {
    await connectToDatabase();
    const { start, end } = getTodayRange();

    const sessions = await ClassSession.find({ date: { $gte: start, $lt: end } })
      .populate('batchId')
      .sort({ time: 1 });

    if (sessions.length === 0) {
      return NextResponse.json({
        hasClassesToday: false,
        summary: {
          expected: 0,
          collected: 0,
          outstanding: 0,
          paidCount: 0,
          partialCount: 0,
          unpaidCount: 0,
          presentCount: 0,
          absentCount: 0,
          notMarkedCount: 0,
        },
        sessions: [],
      });
    }

    const sessionIds = sessions.map((s) => s._id.toString());
    const [rosterStudents, attendanceRecords] = await Promise.all([
      Student.find({ $or: sessions.map((s) => ({ batchId: s.batchId, grade: s.grade })) }).sort({ name: 1 }),
      Attendance.find({ classId: { $in: sessionIds } }),
    ]);

    let expected = 0;
    let collected = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let presentCount = 0;
    let absentCount = 0;
    let notMarkedCount = 0;

    const result = sessions.map((session) => {
      const roster = rosterStudents.filter(
        (s) =>
          s.batchId?.toString() === session.batchId._id.toString() &&
          s.grade === session.grade &&
          // A student who joined after this class was held was never on it.
          (!s.registrationDate || s.registrationDate <= session.date)
      );

      const paid: any[] = [];
      const unpaid: any[] = [];
      const absent: any[] = [];
      const notMarked: any[] = [];

      for (const student of roster) {
        const record = attendanceRecords.find(
          (a) =>
            a.studentId.toString() === student._id.toString() &&
            a.classId.toString() === session._id.toString()
        );

        if (!record) {
          notMarked.push({ student });
          notMarkedCount += 1;
          continue;
        }
        if (!record.present) {
          absent.push({ student });
          absentCount += 1;
          continue;
        }

        const due = session.paymentAmount || 0;
        const paidAmount = record.paidAmount || 0;
        const balance = computeBalance(due, paidAmount);

        presentCount += 1;
        expected += due;
        collected += Math.min(paidAmount, due);

        const entry = { student, due, paidAmount, balance };
        if (balance <= 0) {
          paid.push(entry);
          paidCount += 1;
        } else {
          unpaid.push(entry);
          if (paidAmount > 0) partialCount += 1;
          else unpaidCount += 1;
        }
      }

      return {
        classSession: session,
        paid,
        unpaid,
        absent,
        notMarked,
        sessionExpected: paid.concat(unpaid).reduce((sum, e) => sum + e.due, 0),
        sessionCollected: paid.concat(unpaid).reduce((sum, e) => sum + Math.min(e.paidAmount, e.due), 0),
      };
    });

    return NextResponse.json({
      hasClassesToday: true,
      summary: {
        expected,
        collected,
        outstanding: computeBalance(expected, collected),
        paidCount,
        partialCount,
        unpaidCount,
        presentCount,
        absentCount,
        notMarkedCount,
      },
      sessions: result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
