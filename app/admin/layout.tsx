"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { LayoutDashboard, Users, BookOpen, QrCode, CreditCard, GraduationCap, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Batches & Classes", href: "/admin/batches", icon: BookOpen },
  { name: "Scanner & Attendance", href: "/admin/scanner", icon: QrCode },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Marks & Reports", href: "/admin/marks", icon: GraduationCap },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col lg:flex-row">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
          <span className="font-bold text-gray-900 dark:text-white">Lakshan Primary</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-200 dark:border-gray-800">
          <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-contain" />
          <span className="font-bold text-lg text-gray-900 dark:text-white hidden lg:block">Lakshan Primary</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={20} className={isActive ? "text-indigo-700 dark:text-indigo-400" : "text-gray-400 group-hover:text-gray-500"} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-16 lg:pt-0 pb-8">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
