import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Student, Attendance, Payment, Marks } from '@/models';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    
    const student = await Student.findById(id).populate('batchId');
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const [attendance, payments, marks] = await Promise.all([
      Attendance.find({ studentId: id }).populate('classId').sort({ date: -1 }),
      Payment.find({ studentId: id }).sort({ date: -1 }),
      Marks.find({ studentId: id }).sort({ examDate: -1 })
    ]);

    // Analytics Calculation
    const totalClasses = attendance.length;
    const classesPresent = attendance.filter(a => a.present).length;
    const attendancePercentage = totalClasses > 0 ? Math.round((classesPresent / totalClasses) * 100) : 0;
    
    const unpaidCount = attendance.filter(a => !a.paid && a.present).length;
    
    let totalMarks = 0, totalMax = 0;
    marks.forEach(m => { totalMarks += m.marks; totalMax += m.maxMarks; });
    const averageMarks = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0;

    return NextResponse.json({
      student,
      attendance,
      payments,
      marks,
      analytics: {
        attendancePercentage,
        unpaidCount,
        averageMarks,
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
