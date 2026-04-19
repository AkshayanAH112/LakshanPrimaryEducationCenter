import Link from "next/link";
import Image from "next/image";
import { QrCode, MessageSquare, LineChart, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      {/* Navbar */}
      <nav className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 fixed top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Lakshan Primary Options" width={36} height={36} className="object-contain" />
              <span className="font-bold text-xl text-gray-900 dark:text-white">Lakshan Primary</span>
            </div>
            <Link 
              href="/login" 
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-all"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium text-sm mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Enrollment Open for Grade 3, 4, 5
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-8">
            The Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Primary Education</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400 mb-10">
            A state-of-the-art educational environment for young minds. We combine focused learning with modern infrastructure to help your child excel.
          </p>
          
          <div className="flex justify-center gap-4">
            <Link href="/login" className="px-8 py-4 text-base font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full hover:scale-105 transition-transform flex items-center gap-2 shadow-lg">
              Manager Portal <ArrowRight size={20} />
            </Link>
          </div>

          {/* Features Grid */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm text-left hover:border-indigo-500/50 transition-colors">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                <QrCode size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">QR Attendance</h3>
              <p className="text-gray-500 dark:text-gray-400">Lightning fast, contactless classroom check-ins using physical student ID cards.</p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm text-left hover:border-indigo-500/50 transition-colors">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Instant SMS Alerts</h3>
              <p className="text-gray-500 dark:text-gray-400">Automated payment reminders and exam mark updates delivered straight to parent phones.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm text-left hover:border-indigo-500/50 transition-colors">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                <LineChart size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Marks Management</h3>
              <p className="text-gray-500 dark:text-gray-400">Robust Excel imports and deep diagnostic reporting to track your child's progress.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
