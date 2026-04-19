import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { ClassSession } from '@/models';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    const query = batchId ? { batchId } : {};
    const classes = await ClassSession.find(query).sort({ date: -1 });
    
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
    return NextResponse.json({ class: newClass }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
