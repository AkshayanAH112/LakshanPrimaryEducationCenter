"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Search,
  Loader2,
  Wallet,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  CheckCircle,
} from "lucide-react";

type Session = {
  classId: string;
  subject?: string;
  date: string;
  due: number;
  paid: number;
  balance: number;
};

type PendingStudent = {
  student: any;
  totalOwed: number;
  sessions: Session[];
};

export default function PaymentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [collectFor, setCollectFor] = useState<PendingStudent | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/payments/pending");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load payments");
      setStudents(data.students || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendReminder = async (entry: PendingStudent) => {
    setRemindingId(entry.student._id);
    setError(null);
    try {
      const res = await fetch("/api/payments/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: entry.student._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotice(
        `Reminder sent to ${entry.student.guardianName} via ${data.channel === "whatsapp" ? "WhatsApp" : "SMS"}.`
      );
      setTimeout(() => setNotice(null), 4000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRemindingId(null);
    }
  };

  const visible = students.filter((s) => {
    const q = query.toLowerCase();
    return (
      !q ||
      s.student.name.toLowerCase().includes(q) ||
      s.student.registrationNumber?.toLowerCase().includes(q) ||
      s.student.qrCode?.toLowerCase().includes(q)
    );
  });

  const grandTotal = students.reduce((sum, s) => sum + s.totalOwed, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Payment Tracking</h1>
          <p className="text-gray-500 text-sm">
            {loading
              ? "Loading outstanding balances…"
              : students.length === 0
                ? "Monitor outstanding balances and send manual reminders."
                : `${students.length} student${students.length === 1 ? "" : "s"} owing Rs. ${grandTotal} in total.`}
          </p>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search student..."
            className="field pl-10 sm:w-64"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={18} /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 m-8 rounded-3xl">
            <CheckCircle className="mx-auto text-emerald-500/50 mb-4" size={56} />
            <h3 className="text-xl font-bold dark:text-white">All Clear!</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              Every student has settled their fees. Outstanding balances will appear here as classes are attended.
            </p>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="p-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-center text-gray-400">
          No students match &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((entry) => {
            const isOpen = expanded === entry.student._id;
            return (
              <div
                key={entry.student._id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <button
                    onClick={() => setExpanded(isOpen ? null : entry.student._id)}
                    className="flex items-center gap-3 text-left min-w-0 flex-1"
                  >
                    <ChevronRight
                      size={18}
                      className={`shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                    <span className="min-w-0">
                      <span className="block font-bold text-gray-900 dark:text-white truncate">
                        {entry.student.name}
                      </span>
                      <span className="block text-xs text-gray-500">
                        <span className="font-mono">
                          {entry.student.registrationNumber ?? entry.student.qrCode}
                        </span>
                        {" · "}Grade {entry.student.grade} · {entry.sessions.length} unpaid session
                        {entry.sessions.length === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xl font-bold text-destructive">
                      Rs. {entry.totalOwed}
                    </span>
                    <button
                      onClick={() => sendReminder(entry)}
                      disabled={remindingId === entry.student._id}
                      title="Send an outstanding-fee reminder to the guardian"
                      className="flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      {remindingId === entry.student._id ? (
                        <Loader2 className="animate-spin" size={15} />
                      ) : (
                        <MessageSquare size={15} />
                      )}
                      Remind
                    </button>
                    <button
                      onClick={() => setCollectFor(entry)}
                      className="flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-3 py-2 text-sm font-medium text-primary-foreground"
                    >
                      <Wallet size={15} /> Collect
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Class</th>
                          <th className="px-5 py-3 font-semibold text-right">Fee</th>
                          <th className="px-5 py-3 font-semibold text-right">Paid</th>
                          <th className="px-5 py-3 font-semibold text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {entry.sessions.map((s) => (
                          <tr key={s.classId}>
                            <td className="px-5 py-3">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {s.subject || "General Session"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(s.date).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-gray-500">Rs. {s.due}</td>
                            <td className="px-5 py-3 text-right font-mono">Rs. {s.paid}</td>
                            <td className="px-5 py-3 text-right font-mono font-bold text-destructive">
                              Rs. {s.balance}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-5 py-3 text-right">
                      <button
                        onClick={() => router.push(`/admin/students/${entry.student._id}`)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Open full profile →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {collectFor && (
        <CollectModal
          entry={collectFor}
          onClose={() => setCollectFor(null)}
          onDone={(msg) => {
            setCollectFor(null);
            setNotice(msg);
            setTimeout(() => setNotice(null), 4000);
            load();
          }}
        />
      )}
    </div>
  );
}

function CollectModal({
  entry,
  onClose,
  onDone,
}: {
  entry: PendingStudent;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [amount, setAmount] = useState(String(entry.totalOwed));
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
        body: JSON.stringify({ studentId: entry.student._id, amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not record payment");
        return;
      }
      onDone(
        `Collected Rs. ${amount} from ${entry.student.name}. Remaining: Rs. ${data.totalOwedRemaining}.`
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
          {entry.student.name} owes <span className="font-bold text-destructive">Rs. {entry.totalOwed}</span>{" "}
          across {entry.sessions.length} session{entry.sessions.length === 1 ? "" : "s"}. Applied to the
          oldest unpaid class first.
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
              max={entry.totalOwed}
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
