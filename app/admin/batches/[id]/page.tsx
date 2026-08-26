"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Calendar,
  FileText,
  Users,
  GraduationCap,
  UserPlus,
  Search,
  Check,
  AlertTriangle,
} from "lucide-react";

const GRADE_FLOW: Record<number, number> = { 3: 4, 4: 5 };

export default function BatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [yearInput, setYearInput] = useState("");
  const [savingYear, setSavingYear] = useState(false);

  const fetchData = useCallback(() => {
    return fetch(`/api/batches/${batchId}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, [batchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const promote = async () => {
    setPromoting(true);
    setError(null);
    try {
      const res = await fetch(`/api/batches/${batchId}/promote`, { method: "POST" });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Promotion failed");
        return;
      }
      setData((prev: any) => ({ ...prev, batch: result.batch, students: result.students }));
      setIsPromoteOpen(false);
    } finally {
      setPromoting(false);
    }
  };

  const saveBatchYear = async () => {
    setSavingYear(true);
    setError(null);
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchYear: Number(yearInput) }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Could not save batch year");
        return;
      }
      setData((prev: any) => ({ ...prev, batch: result.batch }));
    } finally {
      setSavingYear(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  if (!data?.batch) return <div className="p-12 text-center text-gray-500">Batch not found</div>;

  const { batch, classes = [], students = [] } = data;

  const classesByGrade: Record<number, any[]> = {};
  const studentsByGrade: Record<number, any[]> = {};
  batch.grades.forEach((g: number) => {
    classesByGrade[g] = classes.filter((c: any) => c.grade === g);
    studentsByGrade[g] = students.filter((s: any) => s.grade === g);
  });

  // Mirrors the server: only active students are promoted, and Grade 5 stays put.
  const promotable = batch.grades
    .filter((g: number) => GRADE_FLOW[g])
    .map((g: number) => ({
      fromGrade: g,
      toGrade: GRADE_FLOW[g],
      count: students.filter((s: any) => s.grade === g && s.isActive).length,
    }))
    .filter((p: any) => p.count > 0);
  const stayingCount = students.filter((s: any) => s.grade === 5 && s.isActive).length;

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft size={20} /> Back to Batches
      </button>

      <div className="bg-primary p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-12 translate-x-12"></div>
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{batch.name}</h1>
            <p className="text-primary-foreground/80 mt-2 text-lg">
              Starts {batch.year}
              {batch.batchYear ? ` · Batch year ${batch.batchYear}` : ""}
            </p>
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-primary-foreground/90">
              <span className="flex items-center gap-1.5"><Users size={16} /> {students.length} student{students.length === 1 ? "" : "s"}</span>
              <span className="flex items-center gap-1.5"><Calendar size={16} /> {classes.length} session{classes.length === 1 ? "" : "s"}</span>
              <span className="flex items-center gap-1.5"><GraduationCap size={16} /> Grades {batch.grades.join(", ")}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 font-medium text-sm transition-colors">
              <UserPlus size={15} /> Add Students
            </button>
            <button onClick={() => setIsPromoteOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 font-medium text-sm transition-colors">
              <GraduationCap size={15} /> Promote Grades
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Batches created before batchYear existed have none, so student IDs for
          them would fall back to the START year. Prompt to set it once. */}
      {!batch.batchYear && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle size={18} className="shrink-0 text-amber-600" />
          <span className="flex-1 min-w-56 text-amber-800 dark:text-amber-400">
            No batch year set. New student IDs would use the starting year ({batch.year}) instead — set the
            year this batch is named for.
          </span>
          <input
            type="number"
            className="field w-32"
            placeholder={String(batch.year)}
            value={yearInput}
            onChange={(e) => setYearInput(e.target.value)}
          />
          <button
            onClick={saveBatchYear}
            disabled={savingYear || !yearInput}
            className="rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 px-4 py-2 font-medium text-primary-foreground"
          >
            {savingYear ? <Loader2 className="animate-spin" size={16} /> : "Save"}
          </button>
        </div>
      )}

      {/* Students — the cohort, grouped by the grade they are currently in */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <span className="bg-primary/10 dark:bg-primary/15 text-primary w-10 h-10 rounded-xl flex items-center justify-center"><Users size={18} /></span>
          Students in this Batch
        </h2>

        {students.length === 0 ? (
          <div className="p-8 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center text-gray-400">
            No students assigned to this batch yet. Use <span className="font-medium">Add Students</span> to bring them in.
          </div>
        ) : (
          <div className="space-y-6">
            {batch.grades.map((grade: number) => (
              <div key={grade}>
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
                  Grade {grade} · {studentsByGrade[grade]?.length ?? 0}
                </h3>
                {studentsByGrade[grade]?.length ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {studentsByGrade[grade].map((s: any) => (
                      <div
                        key={s._id}
                        onClick={() => router.push(`/admin/students/${s._id}`)}
                        className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl cursor-pointer hover:border-primary hover:shadow-md transition-all flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">{s.name}</div>
                          <div className="text-xs text-gray-500 font-mono truncate">{s.qrCode}</div>
                        </div>
                        {!s.isActive && (
                          <span className="shrink-0 rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-500">Inactive</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No students currently in Grade {grade}.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Class sessions */}
      <div className="space-y-8">
        {batch.grades.map((grade: number) => (
          <div key={grade} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <span className="bg-primary/10 dark:bg-primary/15 text-primary w-10 h-10 rounded-xl flex items-center justify-center">G{grade}</span>
              Grade {grade} Classes
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classesByGrade[grade]?.map(c => (
                <div
                  key={c._id}
                  onClick={() => router.push(`/admin/classes/${c._id}`)}
                  className="p-5 border border-gray-200 dark:border-gray-800 rounded-2xl cursor-pointer hover:border-primary hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs font-bold font-mono">
                      Rs. {c.paymentAmount}
                    </span>
                    <ArrowLeft size={16} className="rotate-135 text-gray-300 group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    {c.subject || 'General Session'}
                  </h3>
                  <div className="mt-3 text-sm text-gray-500 flex items-center gap-2">
                    <Calendar size={14} />
                    {new Date(c.date).toLocaleDateString()} at {c.time || 'N/A'}
                  </div>
                </div>
              ))}

              {(!classesByGrade[grade] || classesByGrade[grade].length === 0) && (
                <div className="col-span-full p-8 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center text-gray-400">
                  No classes scheduled for Grade {grade} yet.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isPromoteOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 sm:p-8 rounded-3xl max-w-sm w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Promote Grades</h2>
            <p className="text-sm text-gray-500 mb-5">
              Moves every active student in this batch up one grade. Their records, QR codes and history stay exactly as they are.
            </p>

            {promotable.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-4 text-center text-sm text-gray-400">
                No active students in Grade 3 or 4 to promote.
              </p>
            ) : (
              <ul className="space-y-2 mb-4">
                {promotable.map((p: any) => (
                  <li key={p.fromGrade} className="flex items-center justify-between rounded-xl bg-muted px-4 py-2.5 text-sm">
                    <span className="text-foreground">Grade {p.fromGrade} → Grade {p.toGrade}</span>
                    <span className="font-bold text-primary">{p.count}</span>
                  </li>
                ))}
              </ul>
            )}

            {stayingCount > 0 && (
              <p className="text-xs text-gray-500 mb-4">
                {stayingCount} Grade 5 student{stayingCount === 1 ? "" : "s"} stay in Grade 5 — retire them individually when they finish.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsPromoteOpen(false)} className="flex-1 py-2 border border-border bg-card rounded-xl font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button
                type="button"
                onClick={promote}
                disabled={promoting || promotable.length === 0}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2 rounded-xl font-medium flex items-center justify-center"
              >
                {promoting ? <Loader2 className="animate-spin" size={18} /> : "Promote"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddOpen && (
        <AddStudentsModal
          batch={batch}
          currentIds={students.map((s: any) => s._id)}
          onClose={() => setIsAddOpen(false)}
          onAdded={(updated: any[]) => {
            setData((prev: any) => ({ ...prev, students: updated }));
            setIsAddOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AddStudentsModal({
  batch,
  currentIds,
  onClose,
  onAdded,
}: {
  batch: any;
  currentIds: string[];
  onClose: () => void;
  onAdded: (students: any[]) => void;
}) {
  const [candidates, setCandidates] = useState<any[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/students")
      .then(r => r.json())
      .then(d => {
        const inBatch = new Set(currentIds);
        // Only students the batch actually teaches — rosters match on
        // (batchId, grade), so anyone else would join and never show up.
        setCandidates(
          (d.students || []).filter(
            (s: any) => !inBatch.has(s._id) && batch.grades.includes(s.grade)
          )
        );
      })
      .catch(() => setCandidates([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/batches/${batch._id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selected }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Could not add students");
        return;
      }
      onAdded(result.students);
    } finally {
      setSaving(false);
    }
  };

  const visible = (candidates ?? []).filter((s: any) =>
    s.name.toLowerCase().includes(query.toLowerCase()) || s.qrCode?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 sm:p-8 rounded-3xl max-w-md w-full shadow-2xl flex flex-col max-h-[85vh]">
        <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">Add Students</h2>
        <p className="text-sm text-gray-500 mb-4">
          Showing students in Grade {batch.grades.join(", ")} who aren&apos;t in this batch yet.
        </p>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="field pl-9"
            placeholder="Search by name or QR code"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
          {candidates === null && (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
          )}
          {candidates !== null && visible.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">No matching students available.</p>
          )}
          {visible.map((s: any) => {
            const isSelected = selected.includes(s._id);
            const currentBatch = s.batchId?.name;
            return (
              <button
                key={s._id}
                type="button"
                onClick={() => toggle(s._id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors flex items-center gap-3 ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
              >
                <span className={`shrink-0 size-5 rounded-md border flex items-center justify-center ${
                  isSelected ? "bg-primary border-primary text-primary-foreground" : "border-gray-300 dark:border-gray-700"
                }`}>
                  {isSelected && <Check size={14} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-gray-900 dark:text-white truncate">{s.name}</span>
                  <span className="block text-xs text-gray-500 truncate">
                    Grade {s.grade}
                    {currentBatch ? ` · currently in ${currentBatch}` : " · no batch"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {selected.some((id) => (candidates ?? []).find((s: any) => s._id === id)?.batchId) && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-500">
            Some selected students are already in another batch — adding them here moves them out of it.
          </p>
        )}

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 py-2 border border-border bg-card rounded-xl font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || selected.length === 0}
            className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2 rounded-xl font-medium flex items-center justify-center"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : `Add ${selected.length || ""}`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
}
