import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Attendance, Payment, Student, ClassSession } from '@/models';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { studentId, classId, present, paid } = await request.json();

    const student = await Student.findById(studentId);
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const classSession = await ClassSession.findById(classId);
    if (!classSession) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // Update or Create Attendance
    const att = await Attendance.findOneAndUpdate(
      { studentId: student._id, classId },
      { present, paid, paidAmount: paid ? classSession.paymentAmount : 0, date: new Date() },
      { upsert: true, new: true }
    );

    // Update or Create Payment record
    if (paid) {
      await Payment.findOneAndUpdate(
        { studentId: student._id, classId },
        { amount: classSession.paymentAmount, status: 'paid', date: new Date() },
        { upsert: true }
      );
    } else {
      // Undo or Refund Payment
      await Payment.findOneAndUpdate(
        { studentId: student._id, classId },
        { amount: 0, status: 'unpaid', date: new Date() },
        { upsert: true }
      );
    }

    const unpaidCount = await Attendance.countDocuments({ studentId: student._id, paid: false, present: true });

    return NextResponse.json({ 
      success: true, 
      attendance: att, 
      unpaidCount 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
