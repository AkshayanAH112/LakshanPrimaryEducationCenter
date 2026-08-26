"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  Loader2,
  AlertTriangle,
  Search,
  Save,
  Plus,
  CheckCircle2,
  RefreshCw,
  X,
} from "lucide-react";

type Scanned = {
  student: any;
  unpaidCount: number;
  totalOwed: number;
  existingRecord: any;
};

export default function ScannerPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [scanned, setScanned] = useState<Scanned | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [recent, setRecent] = useState<{ name: string; present: boolean; paid: number }[]>([]);

  const [isPresent, setIsPresent] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [arrears, setArrears] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [manualCode, setManualCode] = useState("");
  const [newClassOpen, setNewClassOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const lastScannedCode = useRef<string | null>(null);

  const activeClass = classes.find((c) => c._id === selectedClass);

  const loadClasses = useCallback(async (selectId?: string) => {
    const [cRes, bRes] = await Promise.all([fetch("/api/classes"), fetch("/api/batches")]);
    const cData = await cRes.json();
    const bData = await bRes.json();
    setClasses(cData.classes || []);
    setBatches(bData.batches || []);
    if (selectId) setSelectedClass(selectId);
    else if (cData.classes?.length > 0) {
      setSelectedClass((prev) => prev || cData.classes[0]._id);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleQrScan = useCallback(
    async (qrCode: string) => {
      if (!qrCode || !selectedClass) return;
      if (lastScannedCode.current === qrCode) return;
      lastScannedCode.current = qrCode;

      setErrorMsg("");
      setOkMsg("");
      try {
        const res = await fetch(
          `/api/students/lookup?qrCode=${encodeURIComponent(qrCode)}&classId=${selectedClass}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setScanned({
          student: data.student,
          unpaidCount: data.unpaidCount,
          totalOwed: data.totalOwed ?? 0,
          existingRecord: data.existingRecord ?? null,
        });
        setIsPresent(true);
        setIsPaid(data.existingRecord?.paid || false);
        setArrears("");
      } catch (e: any) {
        setErrorMsg(e.message);
        lastScannedCode.current = null;
      }
    },
    [selectedClass]
  );

  useEffect(() => {
    if (!selectedClass) return;
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    scanner.render(
      (decodedText) => handleQrScan(decodedText),
      () => {}
    );
    return () => {
      scanner.clear().catch((e) => console.error(e));
    };
  }, [selectedClass, handleQrScan]);

  const closePopup = () => {
    setScanned(null);
    lastScannedCode.current = null;
  };

  const submitAttendance = async () => {
    if (!scanned || !selectedClass) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      // 1. Presence + this session's fee.
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: scanned.student._id,
          classId: selectedClass,
          present: isPresent,
          paid: isPaid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save attendance");

      // 2. Any arrears handed over at the same time. Applied oldest class
      //    first by /api/payments/collect — deliberately a second call so the
      //    session fee above is settled before older dues are chipped at.
      const arrearsAmount = Number(arrears);
      if (arrearsAmount > 0) {
        const pRes = await fetch("/api/payments/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: scanned.student._id, amount: arrearsAmount }),
        });
        const pData = await pRes.json();
        if (!pRes.ok) throw new Error(pData.error || "Attendance saved, but the arrears payment failed");
      }

      setRecent((prev) =>
        [
          {
            name: scanned.student.name,
            present: isPresent,
            paid: (isPaid ? activeClass?.paymentAmount || 0 : 0) + (arrearsAmount || 0),
          },
          ...prev,
        ].slice(0, 8)
      );
      setOkMsg(`Saved ${scanned.student.name}`);
      closePopup();
      setTimeout(() => setOkMsg(""), 3000);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const syncRoster = async () => {
    if (!selectedClass) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/classes/${selectedClass}/sync-roster`, { method: "POST" });
      const data = await res.json();
      setOkMsg(
        res.ok
          ? `Roster synced — ${data.added} student(s) added, ${data.rosterSize} total.`
          : data.error
      );
      setTimeout(() => setOkMsg(""), 4000);
    } finally {
      setSyncing(false);
    }
  };

  const sessionFee = activeClass?.paymentAmount ?? 0;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold dark:text-white">Scanner &amp; Attendance</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={syncRoster}
              disabled={!selectedClass || syncing}
              title="Add any students who joined the batch after this class was created"
              className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 px-4 py-2 rounded-xl font-medium transition-colors"
            >
              {syncing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
              Sync Roster
            </button>
            <button
              onClick={() => setNewClassOpen(true)}
              disabled={batches.length === 0}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-4 py-2 rounded-xl font-medium transition-colors"
            >
              <Plus size={18} /> New Class
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="field-label">Active Class Session</label>
            <select
              className="field"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="" disabled>
                Select a class...
              </option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  Grade {c.grade} – {c.subject || "Session"} ({new Date(c.date).toLocaleDateString()}) · Rs. {c.paymentAmount}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="field-label">Manual Override</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="field"
                placeholder="Enter QR data manually"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQrScan(manualCode)}
              />
              <button
                onClick={() => handleQrScan(manualCode)}
                className="bg-gray-200 dark:bg-gray-800 px-4 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition"
              >
                <Search size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {okMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={18} /> {okMsg}
        </div>
      )}
      {errorMsg && !scanned && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle size={18} /> {errorMsg}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">Live Camera Feed</h3>
          <style>{`
            #qr-reader button {
              display: inline-flex; align-items: center; justify-content: center;
              padding: 8px 18px; border-radius: 10px; font-weight: 600; font-size: 14px;
              cursor: pointer; border: none; transition: background 0.2s, transform 0.1s;
            }
            #qr-reader button:active { transform: scale(0.97); }
            #qr-reader__scan_region + #qr-reader__dashboard button,
            #qr-reader__dashboard_section_csr button,
            #qr-reader__dashboard_section_fsr button { background: #4f46e5; color: #fff; margin: 4px 4px; }
            #qr-reader__dashboard_section_csr button:hover,
            #qr-reader__dashboard_section_fsr button:hover { background: #4338ca; }
            #qr-reader__status_span { font-size: 13px; color: #6b7280; }
            #qr-reader select { padding: 6px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 14px; margin: 4px 0; }
          `}</style>
          {!selectedClass ? (
            <div className="text-center p-12 text-gray-500">
              Select a class session first — or create one with <span className="font-medium">New Class</span>.
            </div>
          ) : (
            <div id="qr-reader" className="overflow-hidden rounded-xl border-none w-full" />
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">Scanned This Session</h3>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Search size={48} className="mb-4 opacity-50" />
              <p>Scan a student card to begin</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 p-3"
                >
                  <span className="font-medium text-gray-900 dark:text-white">{r.name}</span>
                  <span className="flex items-center gap-3 text-sm">
                    <span className={r.present ? "text-emerald-600" : "text-gray-400"}>
                      {r.present ? "Present" : "Absent"}
                    </span>
                    {r.paid > 0 && (
                      <span className="font-mono font-bold text-primary">Rs. {r.paid}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scan result popup — presence, this session's fee, and any arrears */}
      {scanned && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 sm:p-8 rounded-3xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold dark:text-white truncate">{scanned.student.name}</h2>
                <p className="text-primary font-medium">Grade {scanned.student.grade}</p>
                <p className="font-mono text-xs text-gray-500">
                  {scanned.student.registrationNumber ?? scanned.student.qrCode}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {scanned.student.guardianName} · {scanned.student.guardianPhone}
                </p>
              </div>
              <button onClick={closePopup} className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X size={22} />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {scanned.totalOwed > 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-100 dark:bg-red-900/30 px-4 py-3 font-bold text-red-700 dark:text-red-400">
                <AlertTriangle size={18} /> Rs. {scanned.totalOwed} pending from {scanned.unpaidCount} earlier class
                {scanned.unpaidCount === 1 ? "" : "es"}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="font-medium dark:text-white">Mark Present</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isPresent} onChange={() => setIsPresent(!isPresent)} />
                  <div className="w-11 h-6 bg-input rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <div>
                  <span className="font-medium dark:text-white">Pay this session — Rs. {sessionFee}</span>
                  <p className="text-xs text-gray-500">Toggle off to undo a payment recorded by mistake.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isPaid} onChange={() => setIsPaid(!isPaid)} />
                  <div className="w-11 h-6 bg-input rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {scanned.totalOwed > 0 && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <label className="field-label">Also collect towards past dues</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      max={scanned.totalOwed}
                      className="field"
                      placeholder={`0 – ${scanned.totalOwed}`}
                      value={arrears}
                      onChange={(e) => setArrears(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setArrears(String(scanned.totalOwed))}
                      className="shrink-0 rounded-xl border border-gray-300 dark:border-gray-700 px-4 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      All
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Applied to their oldest unpaid class first.</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={closePopup}
                className="flex-1 py-3 border border-border bg-card rounded-xl font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitAttendance}
                disabled={submitting}
                className="flex-2 bg-primary hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 text-primary-foreground py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95"
              >
                {submitting ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Confirm &amp; Save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {newClassOpen && (
        <NewClassModal
          batches={batches}
          onClose={() => setNewClassOpen(false)}
          onCreated={(id) => {
            setNewClassOpen(false);
            loadClasses(id);
            setOkMsg("Class created — the full roster was added as absent.");
            setTimeout(() => setOkMsg(""), 4000);
          }}
        />
      )}
    </div>
  );
}

function NewClassModal({
  batches,
  onClose,
  onCreated,
}: {
  batches: any[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    batchId: batches[0]?._id ?? "",
    grade: "3",
    date: today,
    time: "",
    subject: "",
    paymentAmount: 500,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          grade: Number(form.grade),
          paymentAmount: Number(form.paymentAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create class");
        return;
      }
      onCreated(data.class._id);
    } finally {
      setSaving(false);
    }
  };

  const selectedBatch = batches.find((b) => b._id === form.batchId);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 sm:p-8 rounded-3xl max-w-sm w-full shadow-2xl">
        <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">New Class Session</h2>
        <p className="text-sm text-gray-500 mb-5">
          Every student in the batch and grade is added straight away as absent — scan them in to mark present.
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="field-label">Batch</label>
            <select
              className="field"
              required
              value={form.batchId}
              onChange={(e) => setForm({ ...form, batchId: e.target.value })}
            >
              {batches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Grade</label>
              <select
                className="field"
                required
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
              >
                {(selectedBatch?.grades ?? [3, 4, 5]).map((g: number) => (
                  <option key={g} value={String(g)}>Grade {g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Fee (Rs.)</label>
              <input
                type="number"
                min={0}
                required
                className="field"
                value={form.paymentAmount}
                onChange={(e) => setForm({ ...form, paymentAmount: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Date</label>
              <input
                type="date"
                required
                className="field"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Time</label>
              <input
                type="time"
                className="field"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Subject</label>
            <input
              className="field"
              placeholder="Optional e.g. Mathematics"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
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
              {saving ? <Loader2 className="animate-spin" size={18} /> : "Create & Scan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
