import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { ClassSession, Student, Attendance } from '@/models';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    
    // 1. Fetch Class Session
    const classSession = await ClassSession.findById(id).populate('batchId');
    if (!classSession) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // 2. Fetch all eligible students for this class based on Batch and Grade
    const students = await Student.find({ 
        batchId: classSession.batchId._id, 
        grade: classSession.grade 
    }).sort({ name: 1 });

    // 3. Fetch existing attendance records for this class
    const attendanceRecords = await Attendance.find({ classId: id });

    // 4. Map them together
    const roster = students.map(student => {
        const record = attendanceRecords.find(a => a.studentId.toString() === student._id.toString());
        return {
            student,
            isPresent: record ? record.present : false,
            isPaid: record ? record.paid : false,
            attendanceId: record ? record._id : null
        };
    });

    return NextResponse.json({ classSession, roster });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
