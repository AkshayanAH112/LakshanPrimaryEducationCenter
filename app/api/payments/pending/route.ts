import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { getOutstandingAttendance } from '@/lib/payments';

export async function GET() {
  try {
    await connectToDatabase();
    const outstanding = await getOutstandingAttendance();

    const byStudent = new Map<string, {
      student: any;
      totalOwed: number;
      sessions: Array<{ classId: string; subject?: string; date: Date; due: number; paid: number; balance: number }>;
    }>();

    for (const { attendance, classSession, student, balance } of outstanding) {
      const id = student._id.toString();
      if (!byStudent.has(id)) {
        byStudent.set(id, { student, totalOwed: 0, sessions: [] });
      }
      const entry = byStudent.get(id)!;
      entry.totalOwed += balance;
      entry.sessions.push({
        classId: classSession._id.toString(),
        subject: classSession.subject,
        date: classSession.date,
        due: classSession.paymentAmount,
        paid: attendance.paidAmount || 0,
        balance,
      });
    }

    const students = Array.from(byStudent.values())
      .map((entry) => ({
        ...entry,
        sessions: entry.sessions.sort((a, b) => a.date.getTime() - b.date.getTime()),
      }))
      .sort((a, b) => b.totalOwed - a.totalOwed);

    return NextResponse.json({ students });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
