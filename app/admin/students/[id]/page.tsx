"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Loader2, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students/${studentId}`).then(r => r.json()).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [studentId]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;
  if (!data?.student) return <div className="p-12 text-center">Student not found</div>;

  const { student, analytics, marks, attendance } = data;

  const chartData = marks.slice().reverse().map((m: any) => ({
    name: m.subject,
    percentage: Math.round((m.marks / m.maxMarks) * 100)
  }));

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-indigo-600"></div>
          <div className="relative mt-8 flex flex-col items-center">
            <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-full border-4 border-white dark:border-gray-900 flex items-center justify-center shadow-lg mb-4">
              <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{student.name.charAt(0)}</span>
            </div>
            <h2 className="text-2xl font-bold dark:text-white">{student.name}</h2>
            <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold px-3 py-1 rounded-full text-sm mt-2">Grade {student.grade}</span>
            
            <div className="w-full mt-8 space-y-4">
              <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="text-gray-500">Guardian</span>
                <span className="font-medium dark:text-gray-200">{student.guardianName}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium dark:text-gray-200">{student.guardianPhone}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="text-gray-500">QR ID</span>
                <span className="font-medium dark:text-gray-200">{student.qrCode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-center">
            <h3 className="text-gray-500 font-medium mb-2">Overall Attendance</h3>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-bold ${analytics.attendancePercentage > 75 ? 'text-green-600' : 'text-red-500'}`}>{analytics.attendancePercentage}%</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">Classes Present: {attendance.filter((a:any)=>a.present).length} / {attendance.length}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-center">
            <h3 className="text-gray-500 font-medium mb-2">Unpaid Sessions</h3>
            <div className="flex items-center gap-3">
              <span className={`text-4xl font-bold ${analytics.unpaidCount > 0 ? 'text-red-500' : 'text-indigo-600'}`}>{analytics.unpaidCount} Days</span>
              {analytics.unpaidCount > 0 && <AlertTriangle className="text-red-500" size={32} />}
            </div>
            {analytics.unpaidCount >= 3 && <p className="text-sm text-red-500 mt-2 font-medium">SMS reminders actived!</p>}
          </div>

          <div className="sm:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <h3 className="text-gray-500 font-medium mb-6">Subject Performance History</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="percentage" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
