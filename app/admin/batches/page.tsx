"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Calendar, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  
  const [batchForm, setBatchForm] = useState({ name: "", year: new Date().getFullYear(), grades: [3, 4, 5] });
  const [classForm, setClassForm] = useState({ batchId: "", grade: "3", date: "", time: "", subject: "", paymentAmount: 500 });
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [bRes, cRes] = await Promise.all([
        fetch("/api/batches"), fetch("/api/classes")
      ]);
      const bData = await bRes.json();
      const cData = await cRes.json();
      setBatches(bData.batches || []);
      setClasses(cData.classes || []);
      if (bData.batches?.length > 0) {
        setClassForm(prev => ({ ...prev, batchId: bData.batches[0]._id }));
      }
    } finally {
      setLoading(false);
    }
  }

  const createBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(batchForm) });
    setIsBatchModalOpen(false);
    fetchData();
  };

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(classForm) });
    setIsClassModalOpen(false);
    fetchData();
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;

  return (
    <div className="space-y-8">
      {/* Batches Header */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Batches & Classes</h1>
          <p className="text-gray-500 text-sm">Manage academic years and daily class sessions.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsBatchModalOpen(true)} className="px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors">New Batch</button>
          <button onClick={() => setIsClassModalOpen(true)} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors flex items-center gap-2"><Plus size={18}/> New Session</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Batches List */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4 dark:text-white">Active Batches</h3>
          <div className="space-y-4">
            {batches.map(v => (
              <div 
                key={v._id} 
                onClick={() => router.push(`/admin/batches/${v._id}`)}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-primary cursor-pointer transition-colors flex justify-between items-center group"
              >
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">{v.name} ({v.year})</div>
                  <div className="text-sm text-gray-500 mt-1">Grades supported: {v.grades.join(', ')}</div>
                </div>
                <ChevronRight className="text-gray-400 group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* Classes List */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4 dark:text-white">Recent Daily Sessions</h3>
          <div className="space-y-4">
            {classes.map(v => (
              <div key={v._id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <div className="font-bold dark:text-white">Grade {v.grade} - {v.subject || 'General'}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Calendar size={14}/> {new Date(v.date).toLocaleDateString()} at {v.time}</div>
                </div>
                <div className="text-primary font-bold bg-primary/10 dark:bg-primary/15 px-3 py-1 rounded-lg">Rs. {v.paymentAmount}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals... */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 sm:p-8 rounded-3xl max-w-sm w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">New Batch</h2>
            <form onSubmit={createBatch} className="space-y-4">
              <div>
                <label className="field-label">Batch Name</label>
                <input required className="field" placeholder="e.g. 2025 Scholarship Batch" onChange={e => setBatchForm({...batchForm, name: e.target.value})} />
              </div>
              <div>
                <label className="field-label">Starting Year</label>
                <input type="number" required className="field" placeholder="Year" value={batchForm.year} onChange={e => setBatchForm({...batchForm, year: Number(e.target.value)})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsBatchModalOpen(false)} className="flex-1 py-2 border border-border bg-card rounded-xl font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-xl font-medium">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isClassModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 sm:p-8 rounded-3xl max-w-sm w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">New Class Session</h2>
            <form onSubmit={createClass} className="space-y-4">
              <div>
                <label className="field-label">Batch</label>
                <select className="field" required onChange={e => setClassForm({...classForm, batchId: e.target.value})} value={classForm.batchId}>
                  {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Grade</label>
                  <select className="field" required onChange={e => setClassForm({...classForm, grade: e.target.value})}>
                    <option value="3">Grade 3</option><option value="4">Grade 4</option><option value="5">Grade 5</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Amount</label>
                  <input type="number" required className="field" placeholder="Payment Amount" value={classForm.paymentAmount} onChange={e => setClassForm({...classForm, paymentAmount: Number(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="field-label">Date</label>
                  <input type="date" required className="field" onChange={e => setClassForm({...classForm, date: e.target.value})} />
                </div>
                 <div>
                  <label className="field-label">Time</label>
                  <input type="time" className="field" onChange={e => setClassForm({...classForm, time: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="field-label">Subject</label>
                <input type="text" className="field" placeholder="Optional e.g. Mathematics" onChange={e => setClassForm({...classForm, subject: e.target.value})} />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsClassModalOpen(false)} className="flex-1 py-2 border border-border bg-card rounded-xl font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-xl font-medium">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
