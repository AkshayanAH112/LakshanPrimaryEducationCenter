import { Attendance } from '@/models';

export function computeBalance(paymentAmount: number, paidAmount: number) {
  return Math.max(0, (paymentAmount || 0) - (paidAmount || 0));
}

/** Every present-but-unsettled attendance row, with its class and student populated. */
export async function getOutstandingAttendance() {
  const records = await Attendance.find({ present: true })
    .populate('classId')
    .populate('studentId');

  return records
    .map((a: any) => ({
      attendance: a,
      classSession: a.classId,
      student: a.studentId,
      balance: a.classId ? computeBalance(a.classId.paymentAmount, a.paidAmount) : 0,
    }))
    .filter((r) => r.classSession && r.student && r.balance > 0);
}
