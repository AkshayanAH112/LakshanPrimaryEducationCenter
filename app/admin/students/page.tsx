"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";
import { Plus, Search, Loader2, QrCode as QrIcon, Download } from "lucide-react";

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
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
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
        setFormData({ name: "", guardianName: "", guardianPhone: "", batchId: batches[0]?._id || "", grade: "3", dateOfBirth: "" });
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
    const html2canvas = (await import('html2canvas')).default;
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
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium"
        >
          <Plus size={20} /> Register Student
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search students by name..." 
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-48 text-gray-700 dark:text-gray-300"
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
                  <th className="px-6 py-4">Batch / Grade</th>
                  <th className="px-6 py-4">Guardian</th>
                  <th className="px-6 py-4">Phone</th>
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
                    <td className="px-6 py-4 font-medium">{sys.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-gray-900 dark:text-gray-100">{sys.batchId?.name || 'No Batch'}</span>
                        <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded-md text-xs w-fit">Grade {sys.grade}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{sys.guardianName}</td>
                    <td className="px-6 py-4">{sys.guardianPhone}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); showQrCode(sys); }}
                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <QrIcon size={16} /> Get ID
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No students registered yet.</td></tr>
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
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label><input required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guardian Name</label><input required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent" value={formData.guardianName} onChange={e => setFormData({...formData, guardianName: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guardian Phone (SMS)</label><input required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent" placeholder="e.g. +94771234567" value={formData.guardianPhone} onChange={e => setFormData({...formData, guardianPhone: e.target.value})} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch</label>
                  <select required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white" value={formData.batchId} onChange={e => setFormData({...formData, batchId: e.target.value})}>
                    {batches.map(b => (
                      <option key={b._id} value={b._id}>{b.name} ({b.year})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Grade</label>
                  <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})}>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                <input type="date" required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-transparent dark:scheme-dark" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium">Create & Generate QR</button>
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
                <button className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 transition-colors" onClick={() => window.print()}>Print Card</button>
                <button className="flex items-center gap-1.5 text-white bg-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors" onClick={downloadIdCard}><Download size={15}/>Download</button>
              </div>
            </div>
            
            {/* Standard CR-80 Financial Card Size (85.6mm x 53.98mm) */}
            <div id="printable-id-card" className="w-[85.6mm] h-[53.98mm] bg-white border-[3px] border-indigo-600 rounded-xl flex flex-row items-center p-4 gap-4 relative overflow-hidden shrink-0">
              
              {/* Decorative Geometric Background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -translate-y-8 translate-x-8"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-indigo-600/5 rounded-full translate-y-8 -translate-x-4"></div>
              
              <div className="flex-1 flex flex-col justify-center z-10 w-full h-full relative">
                <div className="flex items-center gap-2 mb-2">
                  <Image src="/logo.png" width={32} height={32} className="w-8 h-8 object-contain" alt="Logo" />
                  <div className="text-[10px] font-bold text-indigo-900 leading-[1.1]">Lakshan Primary<br/>Education Center</div>
                </div>
                
                <h4 className="font-bold text-gray-900 text-[13px] leading-tight uppercase mt-3 line-clamp-2">{activeStudent.name}</h4>
                <p className="text-[10px] font-extrabold text-indigo-600 mt-1">{activeStudent.batchId?.name || 'Standard Batch'}</p>
                
                <div className="mt-auto text-[9px] text-gray-600 space-y-0.5">
                  <p><span className="font-semibold">Grade:</span> {activeStudent.grade}</p>
                  <p><span className="font-semibold">Parent:</span> {activeStudent.guardianPhone}</p>
                </div>
              </div>

              <div className="w-24 shrink-0 flex flex-col items-center z-10">
                <Image src={activeQr} alt="QR Code" width={96} height={96} unoptimized className="w-full h-auto bg-white border-2 border-gray-100 rounded-lg p-1 shadow-sm" />
                <p className="text-[7px] text-gray-400 font-mono mt-1 tracking-tighter">{activeStudent.qrCode}</p>
              </div>
            </div>

            <button onClick={() => setQrModalOpen(false)} className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-medium mt-8 print:hidden transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
