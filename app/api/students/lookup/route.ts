import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Student, Attendance, ClassSession } from '@/models';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const qrCode = searchParams.get('qrCode');
    const classId = searchParams.get('classId');
    
    if (!qrCode || !classId) return NextResponse.json({ error: 'QR or Class missing' }, { status: 400 });

    const student = await Student.findOne({ qrCode }).populate('batchId');
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const classSession = await ClassSession.findById(classId);
    if (!classSession) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // Validate grade matches
    if (student.grade !== classSession.grade) {
      return NextResponse.json({ error: `Warning: Student is Grade ${student.grade}, Class is Grade ${classSession.grade}` }, { status: 400 });
    }

    // Find unpaid days
    const unpaidCount = await Attendance.countDocuments({ studentId: student._id, paid: false, present: true });
    
    // Check if they are already present today
    const currentAtt = await Attendance.findOne({ studentId: student._id, classId: classSession._id });

    return NextResponse.json({ 
      student, 
      unpaidCount,
      existingRecord: currentAtt 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
