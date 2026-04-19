"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Calendar, FileText } from "lucide-react";

export default function BatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/batches/${batchId}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, [batchId]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;
  if (!data?.batch) return <div className="p-12 text-center text-gray-500">Batch not found</div>;

  const { batch, classes } = data;

  // Group classes by grade
  const classesByGrade: Record<number, any[]> = {};
  batch.grades.forEach((g: number) => {
    classesByGrade[g] = classes.filter((c: any) => c.grade === g);
  });

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft size={20} /> Back to Batches
      </button>

      <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-12 translate-x-12"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">{batch.name}</h1>
          <p className="text-indigo-200 mt-2 text-lg">Year: {batch.year}</p>
        </div>
      </div>

      <div className="space-y-8">
        {batch.grades.map((grade: number) => (
          <div key={grade} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 w-10 h-10 rounded-xl flex items-center justify-center">G{grade}</span>
              Grade {grade} Classes
            </h2>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classesByGrade[grade]?.map(c => (
                <div 
                  key={c._id}
                  onClick={() => router.push(`/admin/classes/${c._id}`)}
                  className="p-5 border border-gray-200 dark:border-gray-800 rounded-2xl cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs font-bold font-mono">
                      Rs. {c.paymentAmount}
                    </span>
                    <ArrowLeft size={16} className="rotate-135 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText size={16} className="text-indigo-500" />
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
    </div>
  );
}
