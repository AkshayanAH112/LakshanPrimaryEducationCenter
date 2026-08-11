import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Student, Attendance, Payment } from '@/models';
import { computeBalance } from '@/lib/payments';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { studentId, amount } = await request.json();

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Oldest scheduled class first — a student's outstanding attendance rows,
    // ordered by the class's actual date (not Attendance.date, which just
    // reflects when the record was last edited).
    const outstandingRecords = (await Attendance.find({ studentId, present: true }).populate('classId'))
      .filter((a: any) => a.classId && computeBalance(a.classId.paymentAmount, a.paidAmount) > 0)
      .sort((a: any, b: any) => a.classId.date.getTime() - b.classId.date.getTime());

    const totalOwed = outstandingRecords.reduce(
      (sum: number, a: any) => sum + computeBalance(a.classId.paymentAmount, a.paidAmount),
      0
    );

    if (amount > totalOwed) {
      return NextResponse.json(
        { error: `Amount exceeds outstanding balance of Rs. ${totalOwed}` },
        { status: 400 }
      );
    }

    let remaining = amount;
    for (const record of outstandingRecords as any[]) {
      if (remaining <= 0) break;
      const balance = computeBalance(record.classId.paymentAmount, record.paidAmount);
      const applied = Math.min(remaining, balance);

      record.paidAmount = (record.paidAmount || 0) + applied;
      record.paid = record.paidAmount >= record.classId.paymentAmount;
      await record.save();

      await Payment.findOneAndUpdate(
        { studentId: student._id, classId: record.classId._id },
        { amount: record.paidAmount, status: record.paid ? 'paid' : 'partial', date: new Date() },
        { upsert: true }
      );

      remaining -= applied;
    }

    return NextResponse.json({ success: true, totalOwedRemaining: totalOwed - amount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
