import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Student, Payment, Attendance, Marks } from '@/models';

export async function GET() {
  try {
    await connectToDatabase();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalStudents,
      pendingPayments,
      todayAttendanceTotal,
      todayAttendancePresent,
      recentMarks,
    ] = await Promise.all([
      // Count active students
      Student.countDocuments({ isActive: true }),

      // Pending payments = attendance records where present=true but paid=false
      Attendance.countDocuments({ present: true, paid: false }),

      // Today's total attendance records
      Attendance.countDocuments({ date: { $gte: today, $lt: tomorrow } }),

      // Today's present count
      Attendance.countDocuments({ date: { $gte: today, $lt: tomorrow }, present: true }),

      // Marks entered today
      Marks.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
    ]);

    const attendancePercent =
      todayAttendanceTotal > 0
        ? Math.round((todayAttendancePresent / todayAttendanceTotal) * 100)
        : 0;

    return NextResponse.json({
      totalStudents,
      pendingPayments,
      todayAttendance: `${attendancePercent}%`,
      recentMarks,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
