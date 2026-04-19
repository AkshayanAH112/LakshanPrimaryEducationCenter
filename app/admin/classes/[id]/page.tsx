"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Search } from "lucide-react";

export default function ClassAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchClassData();
  }, [classId]);

  async function fetchClassData() {
    try {
      const res = await fetch(`/api/classes/${classId}`);
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const toggleAttendance = async (studentId: string, currentPresent: boolean, currentPaid: boolean, field: 'present' | 'paid') => {
    const isPresent = field === 'present' ? !currentPresent : currentPresent;
    const isPaid = field === 'paid' ? !currentPaid : currentPaid;

    // Optimistic UI Update
    setData((prev: any) => ({
      ...prev,
      roster: prev.roster.map((r: any) => 
        r.student._id === studentId 
          ? { ...r, isPresent, isPaid } 
          : r
      )
    }));

    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, classId, present: isPresent, paid: isPaid })
      });
    } catch (e) {
      console.error("Failed to update attendance", e);
      fetchClassData(); // Revert on failure
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;
  if (!data?.classSession) return <div className="p-12 text-center text-gray-500">Class not found</div>;

  const { classSession, roster } = data;

  const filteredRoster = roster.filter((r: any) => r.student.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const presentCount = roster.filter((r: any) => r.isPresent).length;
  const paidCount = roster.filter((r: any) => r.isPaid).length;

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold px-3 py-1 rounded-full text-xs mb-3 inline-block">
            Grade {classSession.grade}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold dark:text-white">{classSession.subject || 'General Session'}</h1>
          <p className="text-gray-500 mt-1">{new Date(classSession.date).toDateString()} at {classSession.time || 'N/A'}</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl flex flex-col items-center justify-center min-w-[100px]">
            <span className="text-2xl font-bold text-indigo-600">{presentCount}<span className="text-sm font-normal text-indigo-400">/{roster.length}</span></span>
            <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase mt-1">Present</span>
          </div>
          <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl flex flex-col items-center justify-center min-w-[100px]">
             <span className="text-2xl font-bold text-green-600">{paidCount}</span>
             <span className="text-xs font-bold text-green-800 dark:text-green-300 uppercase mt-1">Paid</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 relative">
           <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
           <input 
             type="text" 
             placeholder="Search roster..." 
             className="w-full pl-12 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl outline-none text-gray-900 dark:text-white"
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
           />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-medium">
              <tr>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4 text-center">Attendance</th>
                <th className="px-6 py-4 text-center">Payment (Rs. {classSession.paymentAmount})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredRoster.map((r: any) => (
                <tr key={r.student._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{r.student.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{r.student.qrCode}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleAttendance(r.student._id, r.isPresent, r.isPaid, 'present')}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                        r.isPresent 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                    >
                      {r.isPresent ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                      {r.isPresent ? 'Present' : 'Absent'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleAttendance(r.student._id, r.isPresent, r.isPaid, 'paid')}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                        r.isPaid 
                          ? 'bg-green-500 text-white shadow-md shadow-green-500/20' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                    >
                      {r.isPaid ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                      {r.isPaid ? 'Paid' : 'Unpaid'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRoster.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-500">No students found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
