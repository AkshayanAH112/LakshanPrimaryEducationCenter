import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { ClassSession } from '@/models';
import { ensureAttendanceRows } from '@/lib/roster';

/**
 * Tops up a class's roster with blank absent rows for any eligible student who
 * doesn't have one — for students added to the batch after the class was
 * created, or promoted into its grade.
 *
 * Idempotent: existing rows are never touched, so this can't overwrite recorded
 * attendance or payments. Safe to call as often as you like.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const classSession = await ClassSession.findById(id);
    if (!classSession) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const { created, rosterSize } = await ensureAttendanceRows(classSession);
    return NextResponse.json({ success: true, added: created, rosterSize });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
