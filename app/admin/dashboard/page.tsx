"use client";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here's an overview of the center today.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Students", value: "0" },
          { title: "Today's Attendance", value: "0%" },
          { title: "Pending Payments", value: "0" },
          { title: "Recent Marks", value: "0" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">{stat.title}</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
