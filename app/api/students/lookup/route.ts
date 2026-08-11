import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Student, Attendance, ClassSession } from '@/models';
import { computeBalance } from '@/lib/payments';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const qrCode = searchParams.get('qrCode');
    const classId = searchParams.get('classId');

    if (!qrCode) return NextResponse.json({ error: 'QR code missing' }, { status: 400 });

    const student = await Student.findOne({ qrCode }).populate('batchId');
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const attendanceRecords = await Attendance.find({ studentId: student._id, present: true }).populate('classId');
    const unpaidCount = attendanceRecords.filter((a) => !a.paid).length;
    const totalOwed = attendanceRecords.reduce(
      (sum, a: any) => sum + (a.classId ? computeBalance(a.classId.paymentAmount, a.paidAmount) : 0),
      0
    );

    // Classless lookup — used by the "Find Student" scanner mode, which just
    // needs to jump to the student's profile without any class context.
    if (!classId) {
      return NextResponse.json({ student, unpaidCount, totalOwed });
    }

    const classSession = await ClassSession.findById(classId);
    if (!classSession) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // Validate grade matches
    if (student.grade !== classSession.grade) {
      return NextResponse.json({ error: `Warning: Student is Grade ${student.grade}, Class is Grade ${classSession.grade}` }, { status: 400 });
    }

    // Check if they are already present today
    const currentAtt = await Attendance.findOne({ studentId: student._id, classId: classSession._id });

    return NextResponse.json({
      student,
      unpaidCount,
      totalOwed,
      existingRecord: currentAtt
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
