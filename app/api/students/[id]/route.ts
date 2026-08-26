import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Student, Attendance, Payment, Marks } from '@/models';
import { computeBalance } from '@/lib/payments';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const student = await Student.findById(id).populate('batchId');
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const [attendance, payments, marks] = await Promise.all([
      Attendance.find({ studentId: id }).populate('classId').sort({ date: -1 }),
      Payment.find({ studentId: id }).populate('classId').sort({ date: -1 }),
      Marks.find({ studentId: id }).sort({ examDate: -1 }),
    ]);

    const totalClasses = attendance.length;
    const classesPresent = attendance.filter((a) => a.present).length;
    const attendancePercentage = totalClasses > 0 ? Math.round((classesPresent / totalClasses) * 100) : 0;

    const unpaidCount = attendance.filter((a) => !a.paid && a.present).length;

    const totalOwed = attendance
      .filter((a) => a.present && a.classId)
      .reduce((sum, a: any) => sum + computeBalance(a.classId.paymentAmount, a.paidAmount), 0);

    let totalMarks = 0;
    let totalMax = 0;
    marks.forEach((m) => {
      if (m.isAbsent) return;
      totalMarks += m.marks;
      totalMax += m.maxMarks;
    });
    const averageMarks = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0;

    /**
     * The student's fee ledger — one row per session they actually attended,
     * newest class first. This is the payment history: balances are computed
     * from Attendance (the source of truth), not read off Payment, which is
     * only a mirror.
     *
     * Ordered by the CLASS date, not Attendance.date — the latter records when
     * the row was last edited.
     */
    const ledger = attendance
      .filter((a: any) => a.present && a.classId)
      .map((a: any) => {
        const due = a.classId.paymentAmount || 0;
        const paidAmount = a.paidAmount || 0;
        const balance = computeBalance(due, paidAmount);
        return {
          attendanceId: a._id.toString(),
          classId: a.classId._id.toString(),
          date: a.classId.date,
          subject: a.classId.subject ?? null,
          grade: a.classId.grade,
          due,
          paidAmount,
          balance,
          status: balance <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalPaid = ledger.reduce((sum, l) => sum + l.paidAmount, 0);
    const totalBilled = ledger.reduce((sum, l) => sum + l.due, 0);

    return NextResponse.json({
      student,
      attendance,
      payments,
      marks,
      ledger,
      analytics: {
        attendancePercentage,
        classesPresent,
        totalClasses,
        unpaidCount,
        totalOwed,
        totalPaid,
        totalBilled,
        averageMarks,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const data = await request.json();

    // qrCode and registrationNumber are deliberately not editable — both are
    // printed on the physical ID card, and changing either would orphan every
    // card already in circulation.
    const update: Record<string, unknown> = {};
    for (const field of [
      'name',
      'school',
      'guardianName',
      'guardianPhone',
      'grade',
      'dateOfBirth',
      'batchId',
      'photoUrl',
      'isActive',
      'registrationDate',
    ]) {
      if (data[field] !== undefined) update[field] = data[field];
    }

    const student = await Student.findByIdAndUpdate(id, update, { new: true, runValidators: true }).populate('batchId');
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    return NextResponse.json({ student });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const force = new URL(request.url).searchParams.get('force') === 'true';

    const student = await Student.findById(id);
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    // Deleting a student erases their attendance, fee and marks history for
    // good. Deactivating (isActive: false) takes them off the active roster
    // while keeping the record, which is almost always what's wanted.
    if (!force) {
      const [presentCount, paidCount, marksCount] = await Promise.all([
        Attendance.countDocuments({ studentId: id, present: true }),
        Attendance.countDocuments({ studentId: id, paidAmount: { $gt: 0 } }),
        Marks.countDocuments({ studentId: id }),
      ]);
      if (presentCount > 0 || paidCount > 0 || marksCount > 0) {
        return NextResponse.json(
          {
            error: `${student.name} has ${presentCount} class(es) attended, ${paidCount} payment(s) and ${marksCount} exam result(s). Deactivate instead to keep the history.`,
            presentCount,
            paidCount,
            marksCount,
          },
          { status: 409 }
        );
      }
    }

    await Promise.all([
      Attendance.deleteMany({ studentId: id }),
      Payment.deleteMany({ studentId: id }),
      Marks.deleteMany({ studentId: id }),
    ]);
    await Student.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
