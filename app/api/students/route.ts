import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Student } from '@/models';
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
    return NextResponse.json({ students });
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

    const student = await Student.create(data);
    return NextResponse.json({ student }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
