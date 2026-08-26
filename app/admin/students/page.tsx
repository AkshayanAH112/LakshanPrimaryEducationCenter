"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";
import { Plus, Search, Loader2, QrCode as QrIcon, Download, IdCard } from "lucide-react";

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeQr, setActiveQr] = useState<string | null>(null);
  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [backfilling, setBackfilling] = useState(false);
  const [backfillError, setBackfillError] = useState<string | null>(null);
  const router = useRouter();

  // One-time migration for students registered before student IDs existed.
  const backfillIds = async () => {
    setBackfilling(true);
    setBackfillError(null);
    try {
      const res = await fetch("/api/students/backfill-registration-numbers", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setBackfillError(data.error || "Could not assign student IDs");
        return;
      }
      await fetchData();
    } finally {
      setBackfilling(false);
    }
  };
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    school: "",
    guardianName: "",
    guardianPhone: "",
    batchId: "",
    grade: "3",
    dateOfBirth: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [sRes, bRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/batches")
      ]);
      const sData = await sRes.json();
      const bData = await bRes.json();
      setStudents(sData.students || []);
      setBatches(bData.batches || []);
      if (bData.batches?.length > 0) {
        setFormData(prev => ({ ...prev, batchId: bData.batches[0]._id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, grade: Number(formData.grade) }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: "", school: "", guardianName: "", guardianPhone: "", batchId: batches[0]?._id || "", grade: "3", dateOfBirth: "" });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const showQrCode = async (student: any) => {
    try {
      const url = await QRCode.toDataURL(student.qrCode, { margin: 1, scale: 10 });
      setActiveQr(url);
      setActiveStudent(student);
      setQrModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadIdCard = async () => {
    const html2canvas = (await import('html2canvas-pro')).default;
    const card = document.getElementById('printable-id-card');
    if (!card) return;
    const canvas = await html2canvas(card, { scale: 4, useCORS: true, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.download = `${activeStudent?.name?.replace(/\s+/g, '_')}_ID_Card.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
    (filterBatch === "" || s.batchId?._id === filterBatch)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Management</h1>
          <p className="text-gray-500">Register students and generate physical QR ID cards.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {students.some((s) => !s.registrationNumber) && (
            <button
              onClick={backfillIds}
              disabled={backfilling}
              title="Assign student IDs to students registered before IDs existed"
              className="border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium"
            >
              {backfilling ? <Loader2 className="animate-spin" size={18} /> : <IdCard size={18} />}
              Assign missing IDs
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium"
          >
            <Plus size={20} /> Register Student
          </button>
        </div>
      </div>

      {backfillError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-400">
          <IdCard size={18} className="mt-0.5 shrink-0" />
          <span>{backfillError}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search students by name..." 
            className="field pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="field sm:w-48"
          value={filterBatch}
          onChange={(e) => setFilterBatch(e.target.value)}
        >
          <option value="">All Batches</option>
          {batches.map(b => (
            <option key={b._id} value={b._id}>{b.name} ({b.year})</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-medium">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Student ID</th>
                  <th className="px-6 py-4">Batch / Grade</th>
                  <th className="px-6 py-4">Guardian</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Outstanding</th>
                  <th className="px-6 py-4">QR Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredStudents.map((sys) => (
                  <tr 
                    key={sys._id} 
                    onClick={() => router.push(`/admin/students/${sys._id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors text-gray-900 dark:text-gray-100 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium">{sys.name}</div>
                      {sys.school && (
                        <div className="text-xs text-gray-500">{sys.school}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {sys.registrationNumber ?? <span className="text-gray-400">not assigned</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-gray-900 dark:text-gray-100">{sys.batchId?.name || 'No Batch'}</span>
                        <span className="bg-primary/10 dark:bg-primary/15 text-primary px-2 py-1 rounded-md text-xs w-fit">Grade {sys.grade}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{sys.guardianName}</td>
                    <td className="px-6 py-4">{sys.guardianPhone}</td>
                    <td className="px-6 py-4">
                      {sys.totalOwed > 0 ? (
                        <span className="font-mono font-bold text-destructive">
                          Rs. {sys.totalOwed}
                          <span className="ml-1 text-xs font-normal text-gray-500">
                            ({sys.unpaidCount})
                          </span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">Settled</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); showQrCode(sys); }}
                        className="text-primary hover:text-primary/80 font-medium flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <QrIcon size={16} /> Get ID
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No students registered yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Register New Student</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="field-label">Full Name</label><input required className="field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div><label className="field-label">School</label><input className="field" placeholder="e.g. Kallar Maha Vidyalayam" value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} /></div>
              <div><label className="field-label">Guardian Name</label><input required className="field" value={formData.guardianName} onChange={e => setFormData({...formData, guardianName: e.target.value})} /></div>
              <div><label className="field-label">Guardian Phone (SMS)</label><input required className="field" placeholder="e.g. +94771234567" value={formData.guardianPhone} onChange={e => setFormData({...formData, guardianPhone: e.target.value})} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Batch</label>
                  <select required className="field" value={formData.batchId} onChange={e => setFormData({...formData, batchId: e.target.value})}>
                    {batches.map(b => (
                      <option key={b._id} value={b._id}>{b.name} ({b.year})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Current Grade</label>
                  <select className="field" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})}>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">Date of Birth</label>
                <input type="date" required className="field" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-border bg-card rounded-xl font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium">Create & Generate QR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal & Printable ID Card */}
      {qrModalOpen && activeQr && activeStudent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white" onClick={() => setQrModalOpen(false)}>
          {/* CSS to isolate the ID card when physical printing is triggered */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * { visibility: hidden; }
              #printable-id-card, #printable-id-card * { visibility: visible; }
              #printable-id-card { position: absolute; left: 0; top: 0; margin: 0; padding: 0; border: none; box-shadow: none; transform: scale(1.05); transform-origin: top left; }
            }
          `}} />
          
          <div className="bg-white rounded-3xl p-8 max-w-100 w-full shadow-2xl flex flex-col items-center print:shadow-none print:p-0 print:m-0" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between w-full mb-6 print:hidden items-center">
              <h3 className="text-xl font-bold text-gray-900">Student ID Card</h3>
              <div className="flex gap-2">
                <button className="text-primary bg-primary/10 px-3 py-1.5 rounded-lg font-bold hover:bg-primary/10 transition-colors" onClick={() => window.print()}>Print Card</button>
                <button className="flex items-center gap-1.5 text-white bg-primary px-3 py-1.5 rounded-lg font-bold hover:bg-primary/90 transition-colors" onClick={downloadIdCard}><Download size={15}/>Download</button>
              </div>
            </div>
            
            {/* Standard CR-80 Financial Card Size (85.6mm x 53.98mm) */}
            <div
              id="printable-id-card"
              className="relative w-[85.6mm] h-[53.98mm] shrink-0 rounded-2xl p-[2.5px] overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 45%, #134e4a 100%)' }}
            >
              <div className="relative w-full h-full rounded-[15px] bg-white overflow-hidden">

                {/* Decorative corner waves */}
                <div
                  className="absolute -top-16 -right-14 w-36 h-36 rotate-24"
                  style={{ background: 'linear-gradient(135deg, #0f766e 0%, #134e4a 100%)', borderRadius: '38% 62% 55% 45% / 45% 40% 60% 55%' }}
                />
                <div
                  className="absolute -top-16 right-10 w-14 h-32 rotate-16"
                  style={{ background: 'linear-gradient(180deg, #5eead4 0%, #2dd4bf 100%)', opacity: 0.55, borderRadius: '50%' }}
                />
                <div
                  className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full"
                  style={{ background: '#0d9488', opacity: 0.16 }}
                />
                <div
                  className="absolute -bottom-6 -left-6 w-16 h-16 rounded-full"
                  style={{ background: '#2dd4bf', opacity: 0.4 }}
                />

                {/* Watermark logo */}
                <Image
                  src="/logo.png"
                  alt=""
                  width={140}
                  height={140}
                  unoptimized
                  className="absolute top-1/2 left-[58%] -translate-x-1/2 -translate-y-1/2 w-32 h-32 object-contain opacity-[0.07]"
                />

                <div className="relative z-10 h-full flex flex-col p-3.5">
                  <div className="flex items-center gap-2">
                    <Image src="/logo.png" width={30} height={30} unoptimized className="w-[30px] h-[30px] object-contain shrink-0" alt="Logo" />
                    <div className="w-px h-7 bg-teal-800/30 shrink-0" />
                    <div className="text-[9px] font-bold text-teal-800 leading-[1.15]">Lakshan Primary<br/>Education Center</div>
                  </div>

                  <div className="flex-1 flex items-center gap-2 mt-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-[15px] leading-tight uppercase truncate">{activeStudent.name}</h4>

                      {activeStudent.registrationNumber && (
                        <p className="text-[8px] font-mono font-bold text-teal-800 tracking-tight mt-0.5">
                          {activeStudent.registrationNumber}
                        </p>
                      )}

                      <div className="relative inline-block mt-2">
                        <span
                          className="block text-[8px] font-bold text-white px-2.5 py-1 pr-4"
                          style={{ background: '#0f766e', clipPath: 'polygon(0 0, 100% 0, 88% 100%, 0% 100%)' }}
                        >
                          {activeStudent.batchId?.name || 'Standard Batch'}
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-1">
                        <p className="text-[8px] text-slate-700">
                          <span className="font-bold bg-teal-100 text-teal-800 rounded-full px-1.5 py-0.5 mr-1">Grade:</span>
                          <span className="font-bold">{activeStudent.grade}</span>
                        </p>
                        <p className="text-[8px] text-slate-700">
                          <span className="font-bold bg-teal-100 text-teal-800 rounded-full px-1.5 py-0.5 mr-1">Parent:</span>
                          <span className="font-bold">{activeStudent.guardianPhone}</span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-center gap-1">
                      <div className="bg-white border-2 rounded-lg p-1" style={{ borderColor: '#0d9488' }}>
                        <Image src={activeQr} alt="QR Code" width={72} height={72} unoptimized className="w-[72px] h-[72px]" />
                      </div>
                      <p className="text-[6px] text-teal-700 font-mono tracking-tighter flex items-center gap-1">
                        <span className="w-2 h-px bg-teal-600" />
                        {activeStudent.qrCode}
                        <span className="w-2 h-px bg-teal-600" />
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => setQrModalOpen(false)} className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-medium mt-8 print:hidden transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
