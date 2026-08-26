import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Marks } from '@/models';

export async function PATCH(request: Request, context: { params: Promise<{ id: string; markId: string }> }) {
  try {
    await connectToDatabase();
    const { id, markId } = await context.params;
    const data = await request.json();

    const update: Record<string, unknown> = {};
    if (data.isAbsent !== undefined) {
      update.isAbsent = Boolean(data.isAbsent);
      update.marks = data.isAbsent ? 0 : (data.marks ?? 0);
    } else if (data.marks !== undefined) {
      update.marks = data.marks;
    }

    // Scoped to {_id, examId} so a mark can only ever be edited through the
    // exam it belongs to. No guardian message here — this is the quiet
    // correction path; POST ./ is the one that notifies.
    const mark = await Marks.findOneAndUpdate({ _id: markId, examId: id }, update, { new: true, runValidators: true });
    if (!mark) return NextResponse.json({ error: 'Mark not found for this exam' }, { status: 404 });
    return NextResponse.json({ mark });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string; markId: string }> }) {
  try {
    await connectToDatabase();
    const { id, markId } = await context.params;

    const mark = await Marks.findOneAndDelete({ _id: markId, examId: id });
    if (!mark) return NextResponse.json({ error: 'Mark not found for this exam' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
