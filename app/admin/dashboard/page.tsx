"use client";

import { useEffect, useState } from "react";
import { Users, CreditCard, CalendarCheck, GraduationCap } from "lucide-react";

interface Stats {
  totalStudents: number;
  pendingPayments: number;
  todayAttendance: string;
  recentMarks: number;
}

const statConfig = [
  {
    key: "totalStudents" as keyof Stats,
    title: "Total Students",
    icon: Users,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    key: "todayAttendance" as keyof Stats,
    title: "Today's Attendance",
    icon: CalendarCheck,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
  },
  {
    key: "pendingPayments" as keyof Stats,
    title: "Pending Payments",
    icon: CreditCard,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
  },
  {
    key: "recentMarks" as keyof Stats,
    title: "Marks Today",
    icon: GraduationCap,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <p className="text-gray-500">
          Welcome back! Here&apos;s an overview of the center today.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load stats: {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statConfig.map(({ key, title, icon: Icon, color, bg }) => (
          <div
            key={key}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
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
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats ? String(stats[key]) : "—"}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
