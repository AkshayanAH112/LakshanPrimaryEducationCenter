import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Student, ClassSession, Attendance } from '@/models';
import { computeBalance } from '@/lib/payments';

type CellStatus = 'present' | 'absent' | 'not_eligible' | 'not_recorded';

/**
 * Raw JSON for the attendance + fees export. The .xlsx file itself is built
 * client-side with the `xlsx` package (same pattern as the marks template) —
 * this route only assembles the data.
 *
 * Unlike the equivalent report in the sibling KCSC project, this one carries
 * money: every session has its own paymentAmount, so each row reports what was
 * due, collected and still outstanding across the range.
 *
 * GET /api/attendance/export?from=2026-08-01&to=2026-08-31&grade=&batchId=
 */
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    if (!fromParam || !toParam) {
      return NextResponse.json({ error: 'from and to dates are required' }, { status: 400 });
    }
    const from = new Date(fromParam);
    const to = new Date(toParam);
    to.setUTCHours(23, 59, 59, 999);

    const grade = searchParams.get('grade');
    const batchId = searchParams.get('batchId');

    const sessionQuery: Record<string, unknown> = { date: { $gte: from, $lte: to } };
    if (grade) sessionQuery.grade = Number(grade);
    if (batchId) sessionQuery.batchId = batchId;

    const sessions = await ClassSession.find(sessionQuery).populate('batchId').sort({ date: 1 });
    if (sessions.length === 0) {
      return NextResponse.json({
        range: { from: from.toISOString(), to: to.toISOString() },
        sessions: [],
        rows: [],
      });
    }

    const [rosterStudents, attendanceRecords] = await Promise.all([
      Student.find({ $or: sessions.map((s) => ({ batchId: s.batchId, grade: s.grade })) }).populate('batchId'),
      Attendance.find({ classId: { $in: sessions.map((s) => s._id.toString()) } }),
    ]);

    const rows = rosterStudents.map((student) => {
      const byClassId: Record<string, CellStatus> = {};
      let totalPresent = 0;
      let totalAbsent = 0;
      let eligibleCount = 0;
      let totalDue = 0;
      let totalPaid = 0;

      for (const session of sessions) {
        const onRoster =
          student.batchId?._id?.toString() === session.batchId._id.toString() &&
          student.grade === session.grade;
        if (!onRoster) continue;

        // Mid-batch registration: a class held before the student joined was
        // never something they could have attended, so it must not count
        // against them.
        const eligible = !student.registrationDate || student.registrationDate <= session.date;
        if (!eligible) {
          byClassId[session._id.toString()] = 'not_eligible';
          continue;
        }

        eligibleCount += 1;
        const record = attendanceRecords.find(
          (a) =>
            a.studentId.toString() === student._id.toString() &&
            a.classId.toString() === session._id.toString()
        );

        if (record?.present) {
          byClassId[session._id.toString()] = 'present';
          totalPresent += 1;
          // Fees are only owed for sessions actually attended — this mirrors
          // getOutstandingAttendance(), which only ever looks at present rows.
          totalDue += session.paymentAmount || 0;
          totalPaid += record.paidAmount || 0;
        } else if (record) {
          byClassId[session._id.toString()] = 'absent';
          totalAbsent += 1;
        } else {
          // Eligible but never marked either way. Counts against the
          // denominator (same as the analysis and dashboard roster math) but
          // is not a recorded absence.
          byClassId[session._id.toString()] = 'not_recorded';
        }
      }

      return {
        studentId: student._id.toString(),
        registrationNumber: student.registrationNumber ?? '—',
        name: student.name,
        grade: student.grade,
        batchName: student.batchId?.name ?? '—',
        byClassId,
        totalPresent,
        totalAbsent,
        eligibleCount,
        attendancePercent: eligibleCount > 0 ? Math.round((totalPresent / eligibleCount) * 100) : null,
        totalDue,
        totalPaid,
        totalBalance: computeBalance(totalDue, totalPaid),
      };
    });

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      sessions: sessions.map((s) => ({
        _id: s._id.toString(),
        date: s.date,
        subject: s.subject,
        grade: s.grade,
        paymentAmount: s.paymentAmount,
        batchName: s.batchId?.name ?? '—',
      })),
      rows: rows.filter((r) => Object.keys(r.byClassId).length > 0),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
