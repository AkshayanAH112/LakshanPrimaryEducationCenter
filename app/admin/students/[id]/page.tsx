"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Loader2,
  ArrowLeft,
  AlertTriangle,
  Wallet,
  Pencil,
  Trash2,
  CheckCircle2,
  Power,
} from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  unpaid: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [collectOpen, setCollectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/students/${studentId}`);
    const d = await res.json();
    if (!res.ok) setError(d.error || "Could not load student");
    else setData(d);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async () => {
    const res = await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !data.student.isActive }),
    });
    if (res.ok) {
      setNotice(data.student.isActive ? "Student deactivated." : "Student reactivated.");
      setTimeout(() => setNotice(null), 3000);
      load();
    }
  };

  if (loading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  if (!data?.student)
    return <div className="p-12 text-center text-gray-500">{error || "Student not found"}</div>;

  const { student, analytics, marks, attendance, ledger } = data;

  const chartData = marks
    .slice()
    .reverse()
    .filter((m: any) => !m.isAbsent)
    .map((m: any) => ({
      name: m.subject,
      percentage: Math.round((m.marks / m.maxMarks) * 100),
    }));

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={20} /> Back
      </button>

      {notice && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={18} /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-primary" />
          <div className="relative mt-8 flex flex-col items-center p-6">
            <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-full border-4 border-white dark:border-gray-900 flex items-center justify-center shadow-lg mb-4">
              <span className="text-3xl font-bold text-primary">{student.name.charAt(0)}</span>
            </div>
            <h2 className="text-2xl font-bold dark:text-white text-center">{student.name}</h2>
            <p className="font-mono text-sm text-gray-500 mt-1">
              {student.registrationNumber ?? "No student ID"}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-primary/10 dark:bg-primary/15 text-primary font-bold px-3 py-1 rounded-full text-sm">
                Grade {student.grade}
              </span>
              {!student.isActive && (
                <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold px-3 py-1 rounded-full text-sm">
                  Inactive
                </span>
              )}
            </div>

            <dl className="w-full mt-8 space-y-3 text-sm">
              {[
                ["School", student.school || "—"],
                ["Batch", student.batchId?.name ?? "No batch"],
                ["Guardian", student.guardianName],
                ["Phone", student.guardianPhone],
                [
                  "Date of Birth",
                  student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "—",
                ],
                [
                  "Enrolled",
                  student.registrationDate
                    ? new Date(student.registrationDate).toLocaleDateString()
                    : new Date(student.createdAt).toLocaleDateString(),
                ],
                ["QR Code", student.qrCode],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="flex justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-2"
                >
                  <dt className="text-gray-500 shrink-0">{label}</dt>
                  <dd className="font-medium dark:text-gray-200 text-right break-all">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 grid w-full grid-cols-2 gap-2">
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-700 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Pencil size={15} /> Edit
              </button>
              <button
                onClick={toggleActive}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-700 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Power size={15} /> {student.isActive ? "Deactivate" : "Reactivate"}
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-destructive/30 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={15} /> Delete Student
              </button>
            </div>
          </div>
        </div>

        {/* Stats + payment history */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Attendance", value: `${analytics.attendancePercentage}%`, sub: `${analytics.classesPresent}/${analytics.totalClasses} classes` },
              { label: "Avg Marks", value: `${analytics.averageMarks}%`, sub: `${marks.length} result(s)` },
              { label: "Total Paid", value: `Rs. ${analytics.totalPaid}`, sub: `of Rs. ${analytics.totalBilled}` },
              { label: "Outstanding", value: `Rs. ${analytics.totalOwed}`, sub: `${analytics.unpaidCount} unpaid`, danger: analytics.totalOwed > 0 },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm"
              >
                <p className="text-xs font-medium text-gray-500">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.danger ? "text-destructive" : "text-gray-900 dark:text-white"}`}>
                  {s.value}
                </p>
                <p className="text-xs text-gray-500">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 p-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment History</h3>
                <p className="text-sm text-gray-500">One row per class attended, newest first.</p>
              </div>
              <button
                onClick={() => setCollectOpen(true)}
                disabled={analytics.totalOwed <= 0}
                className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <Wallet size={16} /> Collect Payment
              </button>
            </div>

            {ledger.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-400">
                No classes attended yet — nothing has been billed.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Class</th>
                      <th className="px-5 py-3 font-semibold text-right">Fee</th>
                      <th className="px-5 py-3 font-semibold text-right">Paid</th>
                      <th className="px-5 py-3 font-semibold text-right">Balance</th>
                      <th className="px-5 py-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {ledger.map((l: any) => (
                      <tr key={l.attendanceId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {l.subject || "General Session"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(l.date).toLocaleDateString()} · Grade {l.grade}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-gray-500">Rs. {l.due}</td>
                        <td className="px-5 py-3 text-right font-mono">Rs. {l.paidAmount}</td>
                        <td className={`px-5 py-3 text-right font-mono ${l.balance > 0 ? "font-bold text-destructive" : "text-gray-400"}`}>
                          {l.balance > 0 ? `Rs. ${l.balance}` : "—"}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLE[l.status]}`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Exam Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} />
                <Tooltip />
                <Bar dataKey="percentage" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <h3 className="border-b border-gray-100 dark:border-gray-800 p-5 text-lg font-bold text-gray-900 dark:text-white">
          Attendance History
        </h3>
        {attendance.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">No attendance recorded yet.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {attendance.map((a: any) => (
              <div key={a._id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {a.classId?.subject || "General Session"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {a.classId ? new Date(a.classId.date).toLocaleDateString() : "—"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    a.present
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                  }`}
                >
                  {a.present ? "Present" : "Absent"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {collectOpen && (
        <CollectPaymentModal
          studentId={studentId}
          studentName={student.name}
          totalOwed={analytics.totalOwed}
          onClose={() => setCollectOpen(false)}
          onDone={(msg) => {
            setCollectOpen(false);
            setNotice(msg);
            setTimeout(() => setNotice(null), 4000);
            load();
          }}
        />
      )}

      {editOpen && (
        <EditStudentModal
          student={student}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            setNotice("Student updated.");
            setTimeout(() => setNotice(null), 3000);
            load();
          }}
        />
      )}

      {deleteOpen && (
        <DeleteStudentModal
          studentId={studentId}
          studentName={student.name}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => router.push("/admin/students")}
        />
      )}
    </div>
  );
}

function CollectPaymentModal({
  studentId,
  studentName,
  totalOwed,
  onClose,
  onDone,
}: {
  studentId: string;
  studentName: string;
  totalOwed: number;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [amount, setAmount] = useState(String(totalOwed));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not record payment");
        return;
      }
      onDone(
        `Collected Rs. ${amount} from ${studentName}. Remaining: Rs. ${data.totalOwedRemaining}.`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 sm:p-8 rounded-3xl max-w-sm w-full shadow-2xl">
        <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">Collect Payment</h2>
        <p className="text-sm text-gray-500 mb-5">
          {studentName} owes <span className="font-bold text-destructive">Rs. {totalOwed}</span>.
          Payment is applied to their oldest unpaid class first.
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="field-label">Amount (Rs.)</label>
            <input
              type="number"
              min={1}
              max={totalOwed}
              required
              className="field"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-border bg-card rounded-xl font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2 rounded-xl font-medium flex items-center justify-center"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : "Collect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditStudentModal({
  student,
  onClose,
  onSaved,
}: {
  student: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [batches, setBatches] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: student.name,
    school: student.school ?? "",
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    grade: String(student.grade),
    batchId: student.batchId?._id ?? "",
    dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().slice(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/batches")
      .then((r) => r.json())
      .then((d) => setBatches(d.batches || []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${student._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, grade: Number(form.grade) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 sm:p-8 rounded-3xl max-w-sm w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">Edit Student</h2>
        <p className="text-sm text-gray-500 mb-5">
          The QR code and student ID can&apos;t be changed — both are printed on the ID card.
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="field-label">Full Name</label>
            <input required className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="field-label">School</label>
            <input className="field" placeholder="e.g. Kallar Maha Vidyalayam" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Guardian Name</label>
            <input required className="field" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Guardian Phone</label>
            <input required className="field" value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Grade</label>
              <select className="field" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
                <option value="3">Grade 3</option>
                <option value="4">Grade 4</option>
                <option value="5">Grade 5</option>
              </select>
            </div>
            <div>
              <label className="field-label">Date of Birth</label>
              <input type="date" className="field" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="field-label">Batch</label>
            <select className="field" value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
              <option value="">No batch</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-border bg-card rounded-xl font-medium text-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2 rounded-xl font-medium flex items-center justify-center">
              {saving ? <Loader2 className="animate-spin" size={18} /> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteStudentModal({
  studentId,
  studentName,
  onClose,
  onDeleted,
}: {
  studentId: string;
  studentName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const doDelete = async (force: boolean) => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${studentId}${force ? "?force=true" : ""}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not delete");
        if (res.status === 409) setBlocked(true);
        return;
      }
      onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 sm:p-8 rounded-3xl max-w-sm w-full shadow-2xl">
        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Delete {studentName}?</h2>
        <p className="text-sm text-gray-500 mb-5">
          This permanently removes their attendance, fee and exam history. There is no undo.
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-400">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-border bg-card rounded-xl font-medium text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={() => doDelete(blocked)}
            disabled={deleting}
            className="flex-1 bg-destructive hover:bg-destructive/90 disabled:opacity-50 text-white py-2 rounded-xl font-medium flex items-center justify-center"
          >
            {deleting ? <Loader2 className="animate-spin" size={18} /> : blocked ? "Delete anyway" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
