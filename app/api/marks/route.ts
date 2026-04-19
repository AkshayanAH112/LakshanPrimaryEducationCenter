import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Marks, Student } from '@/models';
import { sendSMS } from '@/lib/sms';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');
    const query = grade ? { grade: Number(grade) } : {};
    
    const marksList = await Marks.find(query).populate('studentId', 'name qrCode').sort({ examDate: -1 });
    return NextResponse.json({ marks: marksList });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();
    const marksData = Array.isArray(data) ? data : [data];
    
    for (const mark of marksData) {
      await Marks.findOneAndUpdate(
        { studentId: mark.studentId, subject: mark.subject, examDate: mark.examDate },
        mark,
        { upsert: true }
      );

      // Trigger SMS
      const student = await Student.findById(mark.studentId);
      if (student && student.guardianPhone) {
        const percentage = Math.round((mark.marks / mark.maxMarks) * 100);
        const text = `Lakshan Primary: ${student.name} scored ${mark.marks}/${mark.maxMarks} (${percentage}%) in ${mark.subject}.`;
        await sendSMS(student.guardianPhone, text);
      }
    }

    return NextResponse.json({ success: true, count: marksData.length }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
