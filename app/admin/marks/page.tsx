"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Upload, Download, Loader2 } from "lucide-react";

export default function MarksPage() {
  const [grade, setGrade] = useState("3");
  const [subject, setSubject] = useState("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [examDate, setExamDate] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    setLoading(true);
    try {
      // Fetch all students for the selected grade
      const res = await fetch(`/api/students?grade=${grade}`);
      const data = await res.json();
      const students = data.students || [];

      // Generate Template
      const templateData = students.map((s: any) => ({
        "Student ID": s._id,
        "Name": s.name,
        "Marks (Required)": 0,
      }));

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Marks Template");
      XLSX.writeFile(wb, `Lakshan_Grade${grade}_Template.xlsx`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !subject || !examDate) {
      alert("Please ensure Subject and Date are inputted before uploading.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const wb = XLSX.read(event.target?.result, { type: "binary" });
        const wsData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        
        const payload = wsData.map((row: any) => ({
          studentId: row["Student ID"],
          subject,
          examDate,
          marks: Number(row["Marks (Required)"]),
          maxMarks,
          grade: Number(grade)
        }));

        const res = await fetch("/api/marks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          alert(`Success! Saved ${payload.length} records & Triggered SMS notifications.`);
        } else {
          const err = await res.json();
          alert("Failed to upload marks: " + err.error);
        }
      } catch (err) {
        console.error(err);
        alert("Execution error reading Excel file.");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h1 className="text-2xl font-bold dark:text-white mb-2">Marks & Reporting (Excel Mode)</h1>
        <p className="text-gray-500 mb-8">Generate an intelligent template, record scores offline, and securely upload to save points and dispatch parental SMS warnings instantly.</p>

        <div className="grid sm:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Grade</label>
            <select className="w-full px-4 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white" value={grade} onChange={e => setGrade(e.target.value)}>
              <option value="3">Grade 3</option>
              <option value="4">Grade 4</option>
              <option value="5">Grade 5</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exam Date</label>
            <input type="date" required className="w-full px-4 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:[color-scheme:dark]" value={examDate} onChange={e => setExamDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input type="text" placeholder="e.g. Mathematics" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maximum Marks</label>
            <input type="number" min="1" className="w-full px-4 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white" value={maxMarks} onChange={e => setMaxMarks(Number(e.target.value))} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={handleDownloadTemplate}
            disabled={loading}
            className="flex-1 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Download size={20} /> 1. Download Template</>}
          </button>
          
          <div className="flex-1 relative">
            <input 
              type="file" 
              accept=".xlsx, .xls"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              ref={fileInputRef}
              onChange={handleFileUpload}
              disabled={loading || !subject || !examDate}
            />
            <div className={`w-full h-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors ${!subject || !examDate ? 'bg-gray-300 text-gray-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
              {loading ? <Loader2 className="animate-spin" /> : <><Upload size={20} /> 2. Upload Filled Template</>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
