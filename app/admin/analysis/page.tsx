"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trophy, AlertTriangle } from "lucide-react";

type StudentResult = {
  studentId: string;
  name: string;
  registrationNumber: string | null;
  grade: number;
  examCount: number;
  avgMarksPercent: number | null;
  attendancePercent: number | null;
  combinedScore: number | null;
  partial: boolean;
  feesDue: number;
  feesPaid: number;
  feesBalance: number;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const RANK_COLORS = ["bg-amber-100 text-amber-700", "bg-gray-200 text-gray-700", "bg-orange-100 text-orange-700"];

function scoreColor(v: number | null) {
  if (v === null) return "text-gray-400";
  if (v >= 75) return "text-emerald-600";
  if (v >= 50) return "text-amber-600";
  return "text-destructive";
}

export default function AnalysisPage() {
  const router = useRouter();
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [start, setStart] = useState(isoDate(thirtyDaysAgo));
  const [end, setEnd] = useState(isoDate(today));
  const [grade, setGrade] = useState("");
  const [batchId, setBatchId] = useState("");
  const [batches, setBatches] = useState<any[]>([]);
  const [results, setResults] = useState<StudentResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/batches")
      .then((r) => r.json())
      .then((d) => setBatches(d.batches || []))
      .catch(() => setBatches([]));
  }, []);

  const runReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ start, end });
      if (grade) params.set("grade", grade);
      if (batchId) params.set("batchId", batchId);
      const res = await fetch(`/api/analysis?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not run report");
      setResults(data.students);
    } catch (e: any) {
      setError(e.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [start, end, grade, batchId]);

  useEffect(() => {
    runReport();
    // Initial load only — afterwards the report re-runs on the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gradeBatches = batches.filter((b) => !grade || b.grades?.includes(Number(grade)));

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h1 className="text-2xl font-bold dark:text-white">Analysis</h1>
        <p className="text-gray-500 text-sm">
          Rank students by exam results, attendance and fees together, over any date range.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm sm:grid-cols-5">
        <div>
          <label className="field-label">From</label>
          <input type="date" className="field" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="field-label">To</label>
          <input type="date" className="field" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Grade</label>
          <select className="field" value={grade} onChange={(e) => { setGrade(e.target.value); setBatchId(""); }}>
            <option value="">All Grades</option>
            <option value="3">Grade 3</option>
            <option value="4">Grade 4</option>
            <option value="5">Grade 5</option>
          </select>
        </div>
        <div>
          <label className="field-label">Batch</label>
          <select className="field" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">All Batches</option>
            {gradeBatches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={runReport}
            disabled={loading || !start || !end}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2 rounded-xl font-medium flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Run Report"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {results && results.length === 0 && (
        <div className="p-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-center text-gray-400">
          No exam results or class sessions in this range.
        </div>
      )}

      {results && results.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Grade</th>
                  <th className="px-4 py-3 font-semibold text-right">Exams</th>
                  <th className="px-4 py-3 font-semibold text-right">Avg Marks</th>
                  <th className="px-4 py-3 font-semibold text-right">Attendance</th>
                  <th className="px-4 py-3 font-semibold text-right">Combined</th>
                  <th className="px-4 py-3 font-semibold text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {results.map((r, i) => (
                  <tr
                    key={r.studentId}
                    onClick={() => router.push(`/admin/students/${r.studentId}`)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-flex size-7 items-center justify-center rounded-lg text-xs font-bold ${RANK_COLORS[i] ?? "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                        {i < 3 ? <Trophy size={13} /> : i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-white">{r.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{r.registrationNumber ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">Grade {r.grade}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{r.examCount}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${scoreColor(r.avgMarksPercent)}`}>
                      {r.avgMarksPercent !== null ? `${r.avgMarksPercent}%` : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${scoreColor(r.attendancePercent)}`}>
                      {r.attendancePercent !== null ? `${r.attendancePercent}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${scoreColor(r.combinedScore)}`}>
                        {r.combinedScore !== null ? `${r.combinedScore}%` : "—"}
                      </span>
                      {r.partial && (
                        <span className="ml-1.5 text-[10px] uppercase tracking-wide text-gray-400" title="Based on only one of marks / attendance">
                          partial
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${r.feesBalance > 0 ? "text-destructive font-bold" : "text-gray-400"}`}>
                      {r.feesBalance > 0 ? `Rs. ${r.feesBalance}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 text-xs text-gray-500">
            <span className="font-medium">Combined</span> averages whatever is available — a row marked{" "}
            <span className="font-medium">partial</span> had only marks or only attendance in this range.
            Outstanding covers attended sessions in the range only.
          </p>
        </div>
      )}
    </div>
  );
}
