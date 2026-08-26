import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Student, Batch } from '@/models';
import { nextRegistrationNumber, resolveBatchYear } from '@/lib/registration';
import { getOutstandingAttendance } from '@/lib/payments';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');
    const batchId = searchParams.get('batchId');

    let query: any = {};
    if (grade) query.grade = Number(grade);
    if (batchId) query.batchId = batchId;

    const students = await Student.find(query).populate('batchId').sort({ createdAt: -1 });

    // Outstanding per student, so the list can flag who owes without the client
    // fetching every profile. One pass over the same present-but-unsettled rows
    // getOutstandingAttendance() uses.
    const outstanding = await getOutstandingAttendance();
    const owedByStudent = new Map<string, { balance: number; unpaidCount: number }>();
    for (const { student, balance } of outstanding) {
      const key = student._id.toString();
      const entry = owedByStudent.get(key) ?? { balance: 0, unpaidCount: 0 };
      entry.balance += balance;
      entry.unpaidCount += 1;
      owedByStudent.set(key, entry);
    }

    const withBalances = students.map((s) => {
      const owed = owedByStudent.get(s._id.toString());
      return {
        ...s.toObject(),
        totalOwed: owed?.balance ?? 0,
        unpaidCount: owed?.unpaidCount ?? 0,
      };
    });

    return NextResponse.json({ students: withBalances });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    // Auto-generate unique QR code
    const uniqueId = crypto.randomBytes(4).toString('hex').toUpperCase();
    data.qrCode = `LAKSHAN-${data.grade}-${uniqueId}`;

    // Human-readable student ID, sequenced under the batch's own year — see
    // lib/registration.ts. Kept separate from qrCode, which is the scan
    // identifier on the printed card and must never change.
    const batch = data.batchId ? await Batch.findById(data.batchId) : null;
    data.registrationNumber = await nextRegistrationNumber(resolveBatchYear(batch));
    data.registrationDate = data.registrationDate ? new Date(data.registrationDate) : new Date();

    const student = await Student.create(data);
    return NextResponse.json({ student }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
