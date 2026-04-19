import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Batch, ClassSession } from '@/models';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    
    const batch = await Batch.findById(id);
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

    const classes = await ClassSession.find({ batchId: id }).sort({ date: -1 });

    return NextResponse.json({ batch, classes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
