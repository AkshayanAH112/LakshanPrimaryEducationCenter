"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Loader2, Download, FileSpreadsheet, AlertTriangle } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  present: "P",
  absent: "A",
  not_recorded: "—",
  not_eligible: "N/A",
};

const STATUS_CLASS: Record<string, string> = {
  present: "text-emerald-600 font-bold",
  absent: "text-destructive font-bold",
  not_recorded: "text-gray-300",
  not_eligible: "text-gray-300",
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AttendanceExportPage() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [from, setFrom] = useState(isoDate(monthStart));
  const [to, setTo] = useState(isoDate(today));
  const [grade, setGrade] = useState("");
  const [batchId, setBatchId] = useState("");
  const [batches, setBatches] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/batches")
      .then((r) => r.json())
      .then((d) => setBatches(d.batches || []))
      .catch(() => setBatches([]));
  }, []);

  const generate = async () => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to });
      if (grade) params.set("grade", grade);
      if (batchId) params.set("batchId", batchId);
      const res = await fetch(`/api/attendance/export?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not build report");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (!result) return;

    const header = [
      "Student ID",
      "Student Name",
      "Grade",
      "Batch",
      ...result.sessions.map(
        (s: any) =>
          `${new Date(s.date).toLocaleDateString()}${s.subject ? ` (${s.subject})` : ""}`
      ),
      "Present",
      "Absent",
      "Attendance %",
      "Fees Due",
      "Fees Paid",
      "Outstanding",
    ];

    const sheetRows = result.rows.map((row: any) => [
      row.registrationNumber,
      row.name,
      `Grade ${row.grade}`,
      row.batchName,
      ...result.sessions.map((s: any) => STATUS_LABEL[row.byClassId[s._id]] ?? "N/A"),
      row.totalPresent,
      row.totalAbsent,
      row.attendancePercent !== null ? `${row.attendancePercent}%` : "—",
      row.totalDue,
      row.totalPaid,
      row.totalBalance,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...sheetRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Lakshan_Attendance_${from}_to_${to}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h1 className="text-2xl font-bold dark:text-white">Attendance Report</h1>
        <p className="text-gray-500 text-sm">
          Pick a date range to build an attendance and fees report, then download it as Excel.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm sm:grid-cols-5">
        <div>
          <label className="field-label">From</label>
          <input type="date" required className="field" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="field-label">To</label>
          <input type="date" required className="field" value={to} onChange={(e) => setTo(e.target.value)} />
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
            {batches
              .filter((b) => !grade || b.grades?.includes(Number(grade)))
              .map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={generate}
            disabled={loading || !from || !to}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-2 rounded-xl font-medium flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><FileSpreadsheet size={16} /> Generate</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && result.rows.length === 0 && (
        <div className="p-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-center text-gray-400">
          No class sessions in this range.
        </div>
      )}

      {result && result.rows.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900 dark:text-white">{result.rows.length}</span> students ·{" "}
              <span className="font-semibold text-gray-900 dark:text-white">{result.sessions.length}</span> sessions
            </p>
            <button
              onClick={downloadExcel}
              className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Download size={16} /> Download Excel
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold sticky left-0 bg-gray-50 dark:bg-gray-800/50">Student</th>
                  {result.sessions.map((s: any) => (
                    <th key={s._id} className="px-2 py-3 text-center font-semibold whitespace-nowrap">
                      {new Date(s.date).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-semibold">%</th>
                  <th className="px-3 py-3 text-right font-semibold">Due</th>
                  <th className="px-3 py-3 text-right font-semibold">Owing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {result.rows.map((row: any) => (
                  <tr key={row.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 sticky left-0 bg-white dark:bg-gray-900">
                      <div className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">{row.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{row.registrationNumber}</div>
                    </td>
                    {result.sessions.map((s: any) => {
                      const status = row.byClassId[s._id] ?? "not_eligible";
                      return (
                        <td key={s._id} className={`px-2 py-3 text-center ${STATUS_CLASS[status]}`}>
                          {STATUS_LABEL[status]}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right font-semibold">
                      {row.attendancePercent !== null ? `${row.attendancePercent}%` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-gray-500">Rs. {row.totalDue}</td>
                    <td className={`px-3 py-3 text-right font-mono ${row.totalBalance > 0 ? "text-destructive font-bold" : "text-gray-400"}`}>
                      {row.totalBalance > 0 ? `Rs. ${row.totalBalance}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 text-xs text-gray-500">
            <span className="font-bold text-emerald-600">P</span> present ·{" "}
            <span className="font-bold text-destructive">A</span> absent ·{" "}
            <span className="text-gray-400">—</span> not recorded ·{" "}
            <span className="text-gray-400">N/A</span> not yet enrolled. Fees are only owed for sessions
            actually attended.
          </p>
        </div>
      )}
    </div>
  );
}
