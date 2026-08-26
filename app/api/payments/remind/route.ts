import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Student } from '@/models';
import { getOutstandingAttendance } from '@/lib/payments';
import { notifyGuardian } from '@/lib/notify';

/**
 * Manual outstanding-fee reminder for one student — the "send it now" button on
 * the Payments page, as opposed to GET /api/cron/reminders which sweeps
 * everyone at fixed unpaid-count thresholds on a schedule.
 *
 * Wording is deliberately gentler than the cron's escalating one: this is sent
 * by a person who is looking at the account, not an automated threshold trip.
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { studentId } = await request.json();

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const student = await Student.findById(studentId);
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    if (!student.guardianPhone) {
      return NextResponse.json({ error: `${student.name} has no guardian phone number on record` }, { status: 400 });
    }

    // Recompute rather than trusting a number from the client — the caller's
    // page may be stale, and this text goes to a real parent.
    const outstanding = await getOutstandingAttendance();
    const owed = outstanding
      .filter((o) => o.student._id.toString() === studentId)
      .reduce((sum, o) => sum + o.balance, 0);
    const sessionCount = outstanding.filter((o) => o.student._id.toString() === studentId).length;

    if (owed <= 0) {
      return NextResponse.json({ error: `${student.name} has nothing outstanding.` }, { status: 400 });
    }

    const message = `Lakshan Primary: Friendly reminder that ${student.name} has Rs. ${owed} outstanding across ${sessionCount} class session${sessionCount === 1 ? '' : 's'}. Please settle the dues at the center. Thank you.`;

    const channel = await notifyGuardian(student.guardianPhone, message);
    if (channel === 'failed') {
      return NextResponse.json({ error: 'Could not send the reminder — check the messaging credentials.' }, { status: 502 });
    }

    return NextResponse.json({ success: true, channel, owed, sessionCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
