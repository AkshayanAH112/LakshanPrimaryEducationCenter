"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Loader2, AlertTriangle, Search, Save } from "lucide-react";

export default function ScannerPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [scannedStudent, setScannedStudent] = useState<any>(null);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Attendance Toggles
  const [isPresent, setIsPresent] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Manual fallback via ID
  const [manualCode, setManualCode] = useState("");
  const lastScannedCode = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/classes").then(r => r.json()).then(d => {
      setClasses(d.classes || []);
      if (d.classes?.length > 0) setSelectedClass(d.classes[0]._id);
    });
  }, []);

  const handleQrScan = useCallback(async (qrCode: string) => {
    if (lastScannedCode.current === qrCode) return;
    lastScannedCode.current = qrCode;

    setScannedStudent(null);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/students/lookup?qrCode=${qrCode}&classId=${selectedClass}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setScannedStudent(data.student);
      setUnpaidCount(data.unpaidCount);
      setIsPresent(true); // Default to present on scan
      setIsPaid(data.existingRecord?.paid || false);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;

    // React 18 strict mode mount fix for html5-qrcode
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        handleQrScan(decodedText);
        // Optional: pause scanner scanner.pause()
      },
      (_error) => { /* ignore normal errors */ }
    );

    return () => {
      scanner.clear().catch(e => console.error(e));
    };
  }, [selectedClass, handleQrScan]);

  const submitAttendance = async () => {
    if (!scannedStudent || !selectedClass) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: scannedStudent._id,
          classId: selectedClass,
          present: isPresent,
          paid: isPaid
        })
      });
      if (res.ok) {
        setScannedStudent(null);
        lastScannedCode.current = null;
        setErrorMsg("Attendance Saved Successfully!");
        setTimeout(() => setErrorMsg(""), 3000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h1 className="text-2xl font-bold dark:text-white mb-4">Scanner & Attendance</h1>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Active Class Session</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="" disabled>Select a class...</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>Grade {c.grade} - {c.subject || 'Session'} ({new Date(c.date).toLocaleDateString()})</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manual Override</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl dark:bg-gray-800" 
                placeholder="Enter QR Data Manually"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQrScan(manualCode)}
              />
              <button 
                onClick={() => handleQrScan(manualCode)}
                className="bg-gray-200 dark:bg-gray-800 px-4 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition"
              ><Search size={20}/></button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Camera Scanner View */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">Live Camera Feed</h3>
          <style>{`
            #qr-reader button {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 8px 18px;
              border-radius: 10px;
              font-weight: 600;
              font-size: 14px;
              cursor: pointer;
              border: none;
              transition: background 0.2s, transform 0.1s;
            }
            #qr-reader button:active { transform: scale(0.97); }
            #qr-reader__scan_region + #qr-reader__dashboard button,
            #qr-reader__dashboard_section_csr button,
            #qr-reader__dashboard_section_fsr button {
              background: #4f46e5;
              color: #fff;
              margin: 4px 4px;
            }
            #qr-reader__dashboard_section_csr button:hover,
            #qr-reader__dashboard_section_fsr button:hover {
              background: #4338ca;
            }
            #qr-reader__status_span { font-size: 13px; color: #6b7280; }
            #qr-reader select {
              padding: 6px 10px;
              border-radius: 8px;
              border: 1px solid #d1d5db;
              font-size: 14px;
              margin: 4px 0;
            }
          `}</style>
          {!selectedClass ? (
            <div className="text-center p-12 text-gray-500">Please select a class session first.</div>
          ) : (
            <div id="qr-reader" className="overflow-hidden rounded-xl border-none w-full" />
          )}
        </div>

        {/* Student Result Card */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">Scanner Result</h3>
          
          {errorMsg && (
            <div className={`p-4 rounded-xl mb-4 ${errorMsg.includes('Saved') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {errorMsg}
            </div>
          )}

          {!scannedStudent ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Search size={48} className="mb-4 opacity-50" />
              <p>Scan a student card to begin</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold dark:text-white">{scannedStudent.name}</h2>
                  <p className="text-indigo-600 dark:text-indigo-400 font-medium">Grade {scannedStudent.grade}</p>
                  <p className="text-sm text-gray-500 mt-1">Guardian: {scannedStudent.guardianName} ({scannedStudent.guardianPhone})</p>
                </div>
                {unpaidCount > 0 && (
                  <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold shadow-sm">
                    <AlertTriangle size={18} /> {unpaidCount} Unpaid Past Days!
                  </div>
                )}
              </div>

              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="font-medium dark:text-white">Mark Present?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isPresent} onChange={() => setIsPresent(!isPresent)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div>
                    <span className="font-medium dark:text-white">Pay Session Fee</span>
                    <p className="text-xs text-gray-500">Toggle this if they paid today or to Undo a previous mistake.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isPaid} onChange={() => setIsPaid(!isPaid)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              <button 
                onClick={submitAttendance}
                disabled={submitting}
                className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2 text-white py-4 rounded-xl font-bold shadow-lg transition-transform active:scale-95"
              >
                {submitting ? <Loader2 className="animate-spin" /> : <><Save size={24} /> Confirm & Save</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
