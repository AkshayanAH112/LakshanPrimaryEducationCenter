"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  UserX,
  HelpCircle,
  Wallet,
} from "lucide-react";

type Entry = {
  student: any;
  due: number;
  paidAmount: number;
  balance: number;
};

function StudentRow({
  student,
  right,
  onClick,
  tone,
}: {
  student: any;
  right: React.ReactNode;
  onClick: () => void;
  tone: "paid" | "unpaid" | "muted";
}) {
  const border =
    tone === "paid"
      ? "border-emerald-200 dark:border-emerald-900/50"
      : tone === "unpaid"
        ? "border-destructive/30"
        : "border-gray-200 dark:border-gray-800";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border ${border} p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50`}
    >
      <span className="min-w-0">
        <span className="block truncate font-medium text-gray-900 dark:text-white">
          {student.name}
        </span>
        <span className="block truncate font-mono text-xs text-gray-500">
          {student.registrationNumber ?? student.qrCode}
        </span>
      </span>
      <span className="shrink-0 text-sm">{right}</span>
    </button>
  );
}

export default function TodaysPaymentsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/payments/today")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );

  if (error)
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );

  const { summary, sessions, hasClassesToday } = data;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/admin/dashboard")}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h1 className="text-2xl font-bold dark:text-white">Today&apos;s Payments</h1>
        <p className="text-gray-500 text-sm">
          Who has paid for today&apos;s classes, and who still owes.
        </p>
      </div>

      {!hasClassesToday ? (
        <div className="p-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-center text-gray-400">
          No classes scheduled today.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Collected Today</h3>
                <span className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/20">
                  <Wallet size={18} className="text-emerald-600 dark:text-emerald-400" />
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                Rs. {summary.collected}
              </p>
              <p className="mt-1 text-xs text-gray-500">of Rs. {summary.expected} due</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Still Owing</h3>
                <span className="rounded-lg bg-orange-50 p-2 dark:bg-orange-900/20">
                  <AlertCircle size={18} className="text-orange-600 dark:text-orange-400" />
                </span>
              </div>
              <p
                className={`text-3xl font-bold ${summary.outstanding > 0 ? "text-destructive" : "text-gray-900 dark:text-white"}`}
              >
                Rs. {summary.outstanding}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {summary.unpaidCount + summary.partialCount} student
                {summary.unpaidCount + summary.partialCount === 1 ? "" : "s"}
                {summary.partialCount > 0 ? ` · ${summary.partialCount} partial` : ""}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Paid</h3>
                <span className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                  <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {summary.paidCount}
                <span className="text-lg text-gray-400"> / {summary.presentCount}</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                of students present
                {summary.notMarkedCount > 0 ? ` · ${summary.notMarkedCount} not marked` : ""}
              </p>
            </div>
          </div>

          {sessions.map((s: any) => (
            <div
              key={s.classSession._id}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm"
            >
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {s.classSession.subject || "General Session"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Grade {s.classSession.grade} · {s.classSession.batchId?.name}
                    {s.classSession.time ? ` · ${s.classSession.time}` : ""} · Rs.{" "}
                    {s.classSession.paymentAmount} per student
                  </p>
                </div>
                <div className="rounded-xl bg-muted px-4 py-2 text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    Rs. {s.sessionCollected}
                  </p>
                  <p className="text-xs text-gray-500">of Rs. {s.sessionExpected}</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-600">
                    <CheckCircle2 size={15} /> Paid ({s.paid.length})
                  </h3>
                  <div className="space-y-2">
                    {s.paid.length === 0 && (
                      <p className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-4 text-center text-sm text-gray-400">
                        Nobody has paid yet.
                      </p>
                    )}
                    {s.paid.map((e: Entry) => (
                      <StudentRow
                        key={e.student._id}
                        student={e.student}
                        tone="paid"
                        onClick={() => router.push(`/admin/students/${e.student._id}`)}
                        right={
                          <span className="font-mono font-bold text-emerald-600">
                            Rs. {e.paidAmount}
                          </span>
                        }
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-destructive">
                    <AlertCircle size={15} /> Not Paid ({s.unpaid.length})
                  </h3>
                  <div className="space-y-2">
                    {s.unpaid.length === 0 && (
                      <p className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 p-4 text-center text-sm text-gray-400">
                        Everyone present has paid.
                      </p>
                    )}
                    {s.unpaid.map((e: Entry) => (
                      <StudentRow
                        key={e.student._id}
                        student={e.student}
                        tone="unpaid"
                        onClick={() => router.push(`/admin/students/${e.student._id}`)}
                        right={
                          <span className="text-right">
                            <span className="block font-mono font-bold text-destructive">
                              Rs. {e.balance}
                            </span>
                            {e.paidAmount > 0 && (
                              <span className="block text-[11px] text-gray-500">
                                paid Rs. {e.paidAmount}
                              </span>
                            )}
                          </span>
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              {(s.absent.length > 0 || s.notMarked.length > 0) && (
                <div className="mt-6 grid gap-6 border-t border-gray-100 dark:border-gray-800 pt-5 lg:grid-cols-2">
                  {s.absent.length > 0 && (
                    <div>
                      <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                        <UserX size={14} /> Absent ({s.absent.length}) — nothing owed
                      </h3>
                      <p className="text-sm text-gray-500">
                        {s.absent.map((e: any) => e.student.name).join(", ")}
                      </p>
                    </div>
                  )}
                  {s.notMarked.length > 0 && (
                    <div>
                      <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                        <HelpCircle size={14} /> Not marked yet ({s.notMarked.length})
                      </h3>
                      <p className="text-sm text-gray-500">
                        {s.notMarked.map((e: any) => e.student.name).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
