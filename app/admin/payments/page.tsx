"use client";

import { Send, AlertTriangle, Search } from "lucide-react";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Payment Tracking</h1>
          <p className="text-gray-500 text-sm">Monitor outstanding balances and send manual SMS reminders.</p>
        </div>
        <div className="flex gap-2">
           <input type="text" placeholder="Search Student..." className="px-4 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700" />
           <button className="bg-gray-100 dark:bg-gray-800 p-2 rounded-xl"><Search size={20}/></button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 m-8 rounded-3xl">
          <AlertTriangle className="mx-auto text-indigo-300 dark:text-indigo-800 mb-4" size={56} />
          <h3 className="text-xl font-bold dark:text-white">All Clear!</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">No students currently have severe outstanding payments. If unpaid days accrue, you can trigger manual override SMS reminders here.</p>
        </div>
      </div>
    </div>
  );
}
