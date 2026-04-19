import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Batch } from '@/models';

export async function GET() {
  try {
    await connectToDatabase();
    const batches = await Batch.find().sort({ createdAt: -1 });
    return NextResponse.json({ batches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();
    const batch = await Batch.create(data);
    return NextResponse.json({ batch }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
