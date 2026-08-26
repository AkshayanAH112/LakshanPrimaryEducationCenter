"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  Users,
  CreditCard,
  CalendarCheck,
  GraduationCap,
  Wallet,
  QrCode,
  Search,
  X,
  AlertTriangle,
} from "lucide-react";

interface Stats {
  totalStudents: number;
  totalPendingAmount: number;
  todayPendingAmount: number;
  todayCollected: number;
  todayExpected: number;
  todayPaidCount: number;
  todayPresentCount: number;
  todayAttendance: string;
  hasClassesToday: boolean;
  recentMarks: number;
}

type Card = {
  title: string;
  href: string;
  icon: typeof Users;
  color: string;
  bg: string;
  value: (s: Stats) => string;
  subtitle?: (s: Stats) => string | null;
};

const cards: Card[] = [
  {
    title: "Total Students",
    href: "/admin/students",
    icon: Users,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    value: (s) => String(s.totalStudents),
  },
  {
    title: "Today's Attendance",
    href: "/admin/attendance",
    icon: CalendarCheck,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    value: (s) => (s.hasClassesToday ? s.todayAttendance : "No classes"),
  },
  {
    title: "Today's Payments",
    href: "/admin/payments/today",
    icon: Wallet,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    value: (s) => (s.hasClassesToday ? `Rs. ${s.todayCollected}` : "No classes"),
    subtitle: (s) =>
      s.hasClassesToday
        ? `${s.todayPaidCount} of ${s.todayPresentCount} paid · Rs. ${s.todayPendingAmount} owing`
        : null,
  },
  {
    title: "Pending Payments",
    href: "/admin/payments",
    icon: CreditCard,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    value: (s) => `Rs. ${s.totalPendingAmount}`,
    subtitle: () => "all time",
  },
  {
    title: "Marks Today",
    href: "/admin/marks",
    icon: GraduationCap,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    value: (s) => String(s.recentMarks),
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStats(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-gray-500">
            Welcome back! Here&apos;s an overview of the center today.
          </p>
        </div>
        <button
          onClick={() => setScanOpen(true)}
          title="Scan a student card to open their profile"
          className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 font-medium text-primary-foreground transition-colors"
        >
          <QrCode size={20} /> Scan Student
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load stats: {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map(({ title, href, icon: Icon, color, bg, value, subtitle }) => (
          <Link
            key={title}
            href={href}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-primary hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">{title}</h3>
              <span className={`rounded-lg p-2 ${bg}`}>
                <Icon size={18} className={color} />
              </span>
            </div>
            {loading ? (
              <div className="h-9 w-16 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats ? value(stats) : "—"}
                </p>
                {stats && subtitle?.(stats) && (
                  <p className="mt-1 text-xs text-gray-500">{subtitle(stats)}</p>
                )}
              </>
            )}
          </Link>
        ))}
      </div>

      {scanOpen && <QrLookupModal onClose={() => setScanOpen(false)} />}
    </div>
  );
}

/**
 * Scan a student card and jump straight to their profile. Uses the classless
 * mode of /api/students/lookup — no classId, so it just resolves the student
 * without touching attendance.
 */
function QrLookupModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [looking, setLooking] = useState(false);
  const lastCode = useRef<string | null>(null);

  const lookup = useCallback(
    async (qrCode: string) => {
      const code = qrCode.trim();
      if (!code || lastCode.current === code) return;
      lastCode.current = code;

      setLooking(true);
      setError(null);
      try {
        const res = await fetch(`/api/students/lookup?qrCode=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Student not found");
        router.push(`/admin/students/${data.student._id}`);
      } catch (e: any) {
        setError(e.message);
        lastCode.current = null;
      } finally {
        setLooking(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "dashboard-qr-reader",
      { fps: 10, qrbox: { width: 220, height: 220 } },
      false
    );
    scanner.render(
      (decoded) => lookup(decoded),
      () => {}
    );
    return () => {
      scanner.clear().catch(() => {});
    };
  }, [lookup]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Scan Student Card</h2>
            <p className="text-sm text-gray-500">Opens their profile — nothing is recorded.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
            <X size={22} />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <style>{`
          #dashboard-qr-reader button {
            display: inline-flex; align-items: center; justify-content: center;
            padding: 8px 18px; border-radius: 10px; font-weight: 600; font-size: 14px;
            cursor: pointer; border: none; background: #4f46e5; color: #fff; margin: 4px;
          }
          #dashboard-qr-reader select { padding: 6px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 14px; margin: 4px 0; }
          #dashboard-qr-reader__status_span { font-size: 13px; color: #6b7280; }
        `}</style>
        <div id="dashboard-qr-reader" className="overflow-hidden rounded-xl w-full" />

        <div className="mt-4">
          <label className="field-label">Or enter the code manually</label>
          <div className="flex gap-2">
            <input
              className="field"
              placeholder="LAKSHAN-3-XXXXXXXX"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookup(manual)}
            />
            <button
              onClick={() => lookup(manual)}
              disabled={looking}
              className="shrink-0 rounded-xl bg-gray-200 dark:bg-gray-800 px-4 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <Search size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
