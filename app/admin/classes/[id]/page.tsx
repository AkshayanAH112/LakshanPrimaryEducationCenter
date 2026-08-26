"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Search, Pencil, Trash2, RefreshCw, AlertTriangle } from "lucide-react";

export default function ClassAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchClassData = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes/${classId}`);
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchClassData();
  }, [fetchClassData]);

  const toggleAttendance = async (studentId: string, currentPresent: boolean, currentPaid: boolean, field: 'present' | 'paid') => {
    const isPresent = field === 'present' ? !currentPresent : currentPresent;
    const isPaid = field === 'paid' ? !currentPaid : currentPaid;

    // Optimistic UI Update
    setData((prev: any) => ({
      ...prev,
      roster: prev.roster.map((r: any) => 
        r.student._id === studentId 
          ? { ...r, isPresent, isPaid } 
          : r
      )
    }));

    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, classId, present: isPresent, paid: isPaid })
      });
    } catch (e) {
      console.error("Failed to update attendance", e);
      fetchClassData(); // Revert on failure
    }
  };

  const syncRoster = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/classes/${classId}/sync-roster`, { method: "POST" });
      const d = await res.json();
      setNotice(res.ok ? `Roster synced — ${d.added} student(s) added.` : d.error);
      setTimeout(() => setNotice(null), 4000);
      fetchClassData();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  if (!data?.classSession) return <div className="p-12 text-center text-gray-500">Class not found</div>;

  const { classSession, roster } = data;

  const filteredRoster = roster.filter((r: any) => r.student.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const presentCount = roster.filter((r: any) => r.isPresent).length;
  const paidCount = roster.filter((r: any) => r.isPaid).length;

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft size={20} /> Back
      </button>

      {notice && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={18} /> {notice}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="bg-primary/10 dark:bg-primary/15 text-primary font-bold px-3 py-1 rounded-full text-xs mb-3 inline-block">
            Grade {classSession.grade}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold dark:text-white">{classSession.subject || 'General Session'}</h1>
          <p className="text-gray-500 mt-1">
            {new Date(classSession.date).toDateString()} at {classSession.time || 'N/A'} · Rs. {classSession.paymentAmount}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
              <Pencil size={14} /> Edit
            </button>
            <button onClick={syncRoster} disabled={syncing} title="Add students who joined the batch after this class was created" className="flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
              {syncing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />} Sync Roster
            </button>
            <button onClick={() => setDeleteOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-primary/10 dark:bg-primary/10 p-4 rounded-2xl flex flex-col items-center justify-center min-w-25">
            <span className="text-2xl font-bold text-primary">{presentCount}<span className="text-sm font-normal text-primary/60">/{roster.length}</span></span>
            <span className="text-xs font-bold text-primary uppercase mt-1">Present</span>
          </div>
          <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl flex flex-col items-center justify-center min-w-25">
             <span className="text-2xl font-bold text-green-600">{paidCount}</span>
             <span className="text-xs font-bold text-green-800 dark:text-green-300 uppercase mt-1">Paid</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 relative">
           <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
           <input 
             type="text" 
             placeholder="Search roster..." 
             className="field pl-12"
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
           />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4 text-center">Attendance</th>
                <th className="px-6 py-4 text-center">Payment (Rs. {classSession.paymentAmount})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredRoster.map((r: any) => (
                <tr key={r.student._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{r.student.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{r.student.qrCode}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleAttendance(r.student._id, r.isPresent, r.isPaid, 'present')}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                        r.isPresent 
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                    >
                      {r.isPresent ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                      {r.isPresent ? 'Present' : 'Absent'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleAttendance(r.student._id, r.isPresent, r.isPaid, 'paid')}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                        r.isPaid 
                          ? 'bg-green-500 text-white shadow-md shadow-green-500/20' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                    >
                      {r.isPaid ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                      {r.isPaid ? 'Paid' : 'Unpaid'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRoster.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-500">No students found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editOpen && (
        <EditClassModal
          classSession={classSession}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            setNotice("Class updated.");
            setTimeout(() => setNotice(null), 3000);
            fetchClassData();
          }}
        />
      )}

      {deleteOpen && (
        <DeleteClassModal
          classId={classId}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => router.push("/admin/batches")}
        />
      )}
    </div>
  );
}

function EditClassModal({
  classSession,
  onClose,
  onSaved,
}: {
  classSession: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    subject: classSession.subject ?? "",
    grade: String(classSession.grade),
    date: new Date(classSession.date).toISOString().slice(0, 10),
    time: classSession.time ?? "",
    paymentAmount: classSession.paymentAmount ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classSession._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          grade: Number(form.grade),
          paymentAmount: Number(form.paymentAmount),
        }),
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
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 sm:p-8 rounded-3xl max-w-sm w-full shadow-2xl">
        <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">Edit Class</h2>
        <p className="text-sm text-gray-500 mb-5">
          Changing the fee re-prices what everyone owes for this session. Amounts already collected stay as they are.
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="field-label">Subject</label>
            <input className="field" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
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
              <label className="field-label">Fee (Rs.)</label>
              <input type="number" min={0} required className="field" value={form.paymentAmount} onChange={(e) => setForm({ ...form, paymentAmount: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Date</label>
              <input type="date" required className="field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Time</label>
              <input type="time" className="field" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-border bg-card rounded-xl font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2 rounded-xl font-medium flex items-center justify-center">
              {saving ? <Loader2 className="animate-spin" size={18} /> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteClassModal({
  classId,
  onClose,
  onDeleted,
}: {
  classId: string;
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
      const res = await fetch(`/api/classes/${classId}${force ? "?force=true" : ""}`, { method: "DELETE" });
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
        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Delete this class?</h2>
        <p className="text-sm text-gray-500 mb-5">
          The roster and any payments recorded against this session go with it. There is no undo.
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-400">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-border bg-card rounded-xl font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
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
