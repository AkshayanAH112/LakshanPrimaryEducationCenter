"use client";

import { AlertTriangle, Search } from "lucide-react";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Payment Tracking</h1>
          <p className="text-gray-500 text-sm">Monitor outstanding balances and send manual SMS reminders.</p>
        </div>
        <div className="flex gap-2">
           <input type="text" placeholder="Search Student..." className="field" />
           <button className="bg-muted hover:bg-muted/80 p-2 rounded-xl transition-colors"><Search size={20}/></button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 m-8 rounded-3xl">
          <AlertTriangle className="mx-auto text-primary/40 mb-4" size={56} />
          <h3 className="text-xl font-bold dark:text-white">All Clear!</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">No students currently have severe outstanding payments. If unpaid days accrue, you can trigger manual override SMS reminders here.</p>
        </div>
      </div>
    </div>
  );
}
