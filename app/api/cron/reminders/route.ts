import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Attendance } from '@/models';
import { sendSMS } from '@/lib/sms';
import { sendWhatsApp } from '@/lib/whatsapp';

export async function GET(request: Request) {
  // Security check for Vercel Cron
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized CRON execution' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    
    // Find all unpaid and present attendance records
    const unpaidRecords = await Attendance.find({ paid: false, present: true }).populate('studentId');
    
    // Group unpaid counts by student
    const studentCounts: Record<string, { count: number, student: any }> = {};
    for (const record of unpaidRecords) {
      if (!record.studentId) continue;
      const sId = record.studentId._id.toString();
      if (!studentCounts[sId]) {
        studentCounts[sId] = { count: 0, student: record.studentId };
      }
      studentCounts[sId].count++;
    }

    const TARGET_DAYS = [3, 5, 10, 15];
    let whatsappSent = 0;
    let smsSent = 0;

    for (const sId in studentCounts) {
      const data = studentCounts[sId];
      if (TARGET_DAYS.includes(data.count) && data.student.guardianPhone) {
        const urgency = data.count === 15 ? "CRITICAL: " : (data.count >= 10 ? "URGENT: " : "");
        const msg = `Lakshan Primary: ${urgency}Friendly reminder that ${data.student.name} currently has ${data.count} unpaid class sessions. Please settle the dues at the center.`;

        // WhatsApp first (far cheaper per message) — falls back to SMS if the
        // API key isn't configured yet, or the send itself fails.
        if (await sendWhatsApp(data.student.guardianPhone, msg)) {
          whatsappSent++;
        } else if (await sendSMS(data.student.guardianPhone, msg)) {
          smsSent++;
        }
      }
    }

    return NextResponse.json({ success: true, processedStudents: Object.keys(studentCounts).length, whatsappSent, smsSent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
