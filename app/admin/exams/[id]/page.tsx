"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Trash2, Save, AlertTriangle, Send, CheckCircle2 } from "lucide-react";

type Entry = { marks: string; isAbsent: boolean };

function isChanged(cur: Entry, init: Entry) {
  if (cur.isAbsent !== init.isAbsent) return true;
  if (cur.isAbsent) return false;
  if (cur.marks.trim() === "") return false;
  return cur.marks.trim() !== init.marks.trim();
}

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [exam, setExam] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [initial, setInitial] = useState<Record<string, Entry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/exams/${examId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load exam");
      setLoading(false);
      return;
    }
    setExam(data.exam);
    setRoster(data.roster);

    const seed: Record<string, Entry> = {};
    for (const r of data.roster) {
      seed[r.student._id] = {
        marks: r.mark && !r.mark.isAbsent ? String(r.mark.marks) : "",
        isAbsent: Boolean(r.mark?.isAbsent),
      };
    }
    setEntries(seed);
    setInitial(JSON.parse(JSON.stringify(seed)));
    setLoading(false);
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (studentId: string, patch: Partial<Entry>) =>
    setEntries((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));

  const changedIds = Object.keys(entries).filter((id) => initial[id] && isChanged(entries[id], initial[id]));

  const save = async () => {
    setError(null);
    setNotice(null);

    const payload = changedIds.map((studentId) => {
      const e = entries[studentId];
      return e.isAbsent
        ? { studentId, isAbsent: true }
        : { studentId, marks: Number(e.marks), isAbsent: false };
    });

    const bad = payload.find(
      (p) => !p.isAbsent && (!Number.isFinite(p.marks as number) || (p.marks as number) < 0 || (p.marks as number) > exam.maxMarks)
    );
    if (bad) {
      setError(`Marks must be a number between 0 and ${exam.maxMarks}.`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/exams/${examId}/marks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save marks");
        return;
      }
      setNotice(
        `Saved ${data.count} result${data.count === 1 ? "" : "s"}` +
          (data.notified > 0 ? ` · messaged ${data.notified} guardian${data.notified === 1 ? "" : "s"}` : "")
      );
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteExam = async () => {
    setConfirmDelete(false);
    const res = await fetch(`/api/exams/${examId}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/exams");
    else setError((await res.json()).error || "Could not delete exam");
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  if (!exam) return <div className="p-12 text-center text-gray-500">{error || "Exam not found"}</div>;

  const recorded = roster.filter((r) => r.isRecorded).length;

  return (
    <div className="space-y-6">
      <button onClick={() => router.push("/admin/exams")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft size={20} /> Back to Exams
      </button>

      <div className="bg-primary p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-12 translate-x-12"></div>
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{exam.name ? `${exam.name} · ${exam.subject}` : exam.subject}</h1>
            <p className="text-primary-foreground/80 mt-2">
              Grade {exam.grade} · {exam.batchId?.name ?? "—"} · {new Date(exam.examDate).toLocaleDateString()} · out of {exam.maxMarks}
            </p>
            <p className="text-primary-foreground/80 mt-1 text-sm">
              {recorded} of {roster.length} recorded
            </p>
          </div>
          <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-destructive/80 px-3 py-2 font-medium text-sm transition-colors">
            <Trash2 size={15} /> Delete Exam
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {roster.length === 0 ? (
        <div className="p-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-center text-gray-400">
          No students in Grade {exam.grade} for this batch yet.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 p-4">
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Send size={14} />
              Saving messages each guardian their child&apos;s result. Only changed rows are sent.
            </p>
            <button
              onClick={save}
              disabled={saving || changedIds.length === 0}
              className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Save {changedIds.length || ""}</>}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold w-32">Marks</th>
                  <th className="px-4 py-3 font-semibold w-24 text-center">Absent</th>
                  <th className="px-4 py-3 font-semibold w-20 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {roster.map((r) => {
                  const e = entries[r.student._id];
                  if (!e) return null;
                  const dirty = initial[r.student._id] && isChanged(e, initial[r.student._id]);
                  const pct =
                    !e.isAbsent && e.marks.trim() !== "" && Number.isFinite(Number(e.marks))
                      ? Math.round((Number(e.marks) / exam.maxMarks) * 100)
                      : null;
                  return (
                    <tr key={r.student._id} className={dirty ? "bg-primary/5" : ""}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-white">{r.student.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{r.student.registrationNumber ?? r.student.qrCode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          max={exam.maxMarks}
                          disabled={e.isAbsent}
                          className="field disabled:opacity-40"
                          placeholder="—"
                          value={e.marks}
                          onChange={(ev) => update(r.student._id, { marks: ev.target.value })}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--color-primary)] cursor-pointer"
                          checked={e.isAbsent}
                          onChange={(ev) => update(r.student._id, { isAbsent: ev.target.checked })}
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {e.isAbsent ? (
                          <span className="text-gray-400">AB</span>
                        ) : pct !== null ? (
                          <span className={pct >= 50 ? "text-emerald-600" : "text-destructive"}>{pct}%</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 sm:p-8 rounded-3xl max-w-sm w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Delete this exam?</h2>
            <p className="text-sm text-gray-500 mb-6">
              The {recorded} recorded result{recorded === 1 ? "" : "s"} for this exam will be deleted too. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 border border-border bg-card rounded-xl font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={deleteExam} className="flex-1 bg-destructive hover:bg-destructive/90 text-white py-2 rounded-xl font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
