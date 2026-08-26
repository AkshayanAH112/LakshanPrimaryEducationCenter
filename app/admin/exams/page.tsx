"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ChevronRight, Calendar, AlertTriangle } from "lucide-react";

export default function ExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    subject: "",
    grade: "3",
    batchId: "",
    examDate: "",
    maxMarks: 100,
  });

  const fetchData = useCallback(async () => {
    try {
      const [eRes, bRes] = await Promise.all([fetch("/api/exams"), fetch("/api/batches")]);
      const eData = await eRes.json();
      const bData = await bRes.json();
      setExams(eData.exams || []);
      setBatches(bData.batches || []);
      if (bData.batches?.length > 0) {
        setForm((prev) => (prev.batchId ? prev : { ...prev, batchId: bData.batches[0]._id }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, grade: Number(form.grade), maxMarks: Number(form.maxMarks) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create exam");
        return;
      }
      setIsOpen(false);
      setForm((prev) => ({ ...prev, name: "", subject: "", examDate: "" }));
      router.push(`/admin/exams/${data.exam._id}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;

  const visible = filterGrade ? exams.filter((e) => e.grade === Number(filterGrade)) : exams;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Exams</h1>
          <p className="text-gray-500 text-sm">
            Schedule an exam, then fill in each student&apos;s marks — and correct them any time.
          </p>
        </div>
        <div className="flex gap-3">
          <select className="field cursor-pointer sm:w-40" value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
            <option value="">All Grades</option>
            <option value="3">Grade 3</option>
            <option value="4">Grade 4</option>
            <option value="5">Grade 5</option>
          </select>
          <button
            onClick={() => setIsOpen(true)}
            disabled={batches.length === 0}
            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> New Exam
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="p-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-center text-gray-400">
          {batches.length === 0
            ? "Create a batch first — an exam belongs to one batch and grade."
            : "No exams scheduled yet."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((exam) => (
            <div
              key={exam._id}
              onClick={() => router.push(`/admin/exams/${exam._id}`)}
              className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl cursor-pointer hover:border-primary hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="bg-primary/10 dark:bg-primary/15 text-primary px-2 py-1 rounded text-xs font-bold">
                  Grade {exam.grade}
                </span>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white truncate">
                {exam.name ? `${exam.name} · ${exam.subject}` : exam.subject}
              </h3>
              <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                <Calendar size={14} />
                {new Date(exam.examDate).toLocaleDateString()} · out of {exam.maxMarks}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3 text-sm">
                <span className="text-gray-500">{exam.resultsCount} recorded</span>
                <span className={`font-bold ${exam.averagePercent === null ? "text-gray-400" : exam.averagePercent >= 50 ? "text-emerald-600" : "text-destructive"}`}>
                  {exam.averagePercent !== null ? `Avg ${exam.averagePercent}%` : "No marks"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 sm:p-8 rounded-3xl max-w-sm w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">New Exam</h2>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={createExam} className="space-y-4">
              <div>
                <label className="field-label">Exam Name</label>
                <input className="field" placeholder="Optional e.g. Mid-term" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Subject</label>
                <input required className="field" placeholder="e.g. Mathematics" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Batch</label>
                <select className="field" required value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
                  {batches.map((b) => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Grade</label>
                  <select className="field" required value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Out of</label>
                  <input type="number" min={1} required className="field" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className="field-label">Exam Date</label>
                <input type="date" required className="field" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 py-2 border border-border bg-card rounded-xl font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2 rounded-xl font-medium flex items-center justify-center">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
