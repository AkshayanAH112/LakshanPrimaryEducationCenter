import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { ClassSession } from '@/models';
import { ensureAttendanceRows } from '@/lib/roster';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const grade = searchParams.get('grade');

    const query: Record<string, unknown> = {};
    if (batchId) query.batchId = batchId;
    if (grade) query.grade = Number(grade);

    const classes = await ClassSession.find(query).populate('batchId', 'name').sort({ date: -1 });

    return NextResponse.json({ classes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();
    const newClass = await ClassSession.create(data);

    // The whole roster is written in as absent/unpaid straight away, so the
    // class opens with every student listed and scanning flips them to present.
    const { created, rosterSize } = await ensureAttendanceRows(newClass);

    return NextResponse.json(
      { class: newClass, rosterSize, attendanceRowsCreated: created },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
