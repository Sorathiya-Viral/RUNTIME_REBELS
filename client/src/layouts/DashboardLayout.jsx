import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Badge } from '../components/common/Badge.jsx';
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  GraduationCap,
  BookOpen,
  Users,
  Building2,
  Sliders,
  AlertTriangle,
  History,
  FileSpreadsheet,
  ShieldAlert,
  UserCheck,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
} from 'lucide-react';

export function DashboardLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // 14 Navigation Items mapped to permissions
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'coordinator', 'faculty', 'viewer'] },
    { name: 'Generate Timetable', path: '/generate', icon: Sparkles, roles: ['admin', 'coordinator'] },
    { name: 'Timetable Calendar', path: '/calendar', icon: CalendarDays, roles: ['admin', 'coordinator', 'faculty', 'viewer'] },
    { name: 'Programmes & Semesters', path: '/programmes', icon: GraduationCap, roles: ['admin', 'coordinator'] },
    { name: 'Subjects & Batches', path: '/subjects', icon: BookOpen, roles: ['admin', 'coordinator'] },
    { name: 'Faculty & Availability', path: '/faculty', icon: Users, roles: ['admin', 'coordinator', 'faculty'] },
    { name: 'Classrooms & Labs', path: '/rooms', icon: Building2, roles: ['admin', 'coordinator'] },
    { name: 'Scheduling Constraints', path: '/constraints', icon: Sliders, roles: ['admin', 'coordinator'] },
    { name: 'Conflicts & Validation', path: '/conflicts', icon: AlertTriangle, roles: ['admin', 'coordinator'] },
    { name: 'Timetable Versions', path: '/versions', icon: History, roles: ['admin', 'coordinator'] },
    { name: 'Reports & Exports', path: '/reports', icon: FileSpreadsheet, roles: ['admin', 'coordinator', 'faculty', 'viewer'] },
    { name: 'Forensic Audit Logs', path: '/audit', icon: ShieldAlert, roles: ['admin'] },
    { name: 'User & Role Management', path: '/users', icon: UserCheck, roles: ['admin'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'coordinator'] },
  ];

  const visibleNavItems = navItems.filter((item) => item.roles.includes(role));

  const roleBadgeVariants = {
    admin: 'danger',
    coordinator: 'primary',
    faculty: 'indigo',
    viewer: 'default',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-navy-900 text-slate-200 border-r border-navy-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-navy-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white block">Schedulix</span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-brand-300 block -mt-0.5">
                NFSU Academic Engine
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-navy-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            System Modules
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </NavLink>
            );
          })}
        </nav>

        {/* User Card in Sidebar Footer */}
        <div className="p-4 border-t border-navy-800 bg-navy-950/60">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <Badge variant={roleBadgeVariants[role] || 'default'} size="xs">
                  {role?.toUpperCase()}
                </Badge>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-navy-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 hidden sm:block">
                National Forensic Sciences University
              </h2>
              <p className="text-xs text-slate-500 font-mono hidden sm:block">
                School of Cyber Security & Digital Forensics
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>CSP Engine Ready</span>
            </div>

            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 text-xs text-slate-600">
              <span className="font-medium">{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
