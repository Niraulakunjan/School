import React, { useState } from 'react';
import {
    LayoutDashboard, Users, UserCog, BookOpen, Calendar,
    Settings, LogOut, DollarSign, GraduationCap, ChevronDown, Trophy,
    Receipt, CreditCard, PiggyBank, FileBarChart2, School, History, Bus, BarChart2, Wallet,
    PanelLeftClose, PanelLeftOpen, FileSpreadsheet, Ticket, Zap
} from 'lucide-react';

import { Link, useLocation } from 'react-router-dom';
import { getTenantFromSubdomain } from '../../utils/tenant';
import { motion, AnimatePresence } from 'framer-motion';

const FINANCE_ITEMS = [
    { name: 'Generate Fees',   path: '/dashboard/finance/generate-fees', icon: Zap           },
    { name: 'Fee Collection',  path: '/dashboard/finance/fees',         icon: CreditCard     },

    { name: 'Fee Structure',   path: '/dashboard/finance/structure',    icon: Receipt        },
    { name: 'Elective Fees',   path: '/dashboard/finance/elective-fees',icon: BookOpen       },
    { name: 'Fee History',     path: '/dashboard/finance/history',      icon: History        },
    { name: 'Expenses',        path: '/dashboard/finance/expenses',     icon: PiggyBank      },
    { name: 'Reports',         path: '/dashboard/finance/reports',      icon: FileBarChart2  },
    { name: 'Bus System',      path: '/dashboard/finance/bus',          icon: Bus            },
    { name: 'Discounts',       path: '/dashboard/finance/discounts',    icon: Ticket         },
];

const EXAM_ITEMS = [
    { name: 'Exam Setup',      path: '/dashboard/exams/setup',        icon: GraduationCap  },
    { name: 'Mark Ledger',     path: '/dashboard/exams/ledger',       icon: FileBarChart2  },
    { name: 'View Ledger',     path: '/dashboard/exams/view-ledger',  icon: FileSpreadsheet },
    { name: 'Exam Results',    path: '/dashboard/exams/results',      icon: Trophy         },
];

const STUDENT_ITEMS = [
    { name: 'Admission',       path: '/dashboard/students/new',       icon: UserCog        },
    { name: 'Student List',    path: '/dashboard/students',           icon: Users          },
    { name: 'Bulk Electives',  path: '/dashboard/students/electives', icon: BookOpen       },
];

const ATTENDANCE_ITEMS = [
    { name: 'Daily Mark',         path: '/dashboard/attendance',        icon: Calendar       },
    { name: 'Attendance Report',  path: '/dashboard/attendance/report', icon: BarChart2      },
];

const Sidebar = () => {
    const location = useLocation();
    const tenantId = getTenantFromSubdomain();
    const [financeOpen,    setFinanceOpen]    = useState(location.pathname.startsWith('/dashboard/finance'));
    const [examOpen,       setExamOpen]       = useState(location.pathname.startsWith('/dashboard/exams'));
    const [studentOpen,    setStudentOpen]    = useState(location.pathname.startsWith('/dashboard/students'));
    const [attendanceOpen, setAttendanceOpen] = useState(location.pathname.startsWith('/dashboard/attendance'));
    const [isCollapsed,    setIsCollapsed]    = useState(false);

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/';
    };

    const isActive = (path) => location.pathname === path;
    const financeActive    = location.pathname.startsWith('/dashboard/finance');
    const examActive       = location.pathname.startsWith('/dashboard/exams');
    const studentActive    = location.pathname.startsWith('/dashboard/students');
    const attendanceActive = location.pathname.startsWith('/dashboard/attendance');

    const linkCls = (active) =>
        `relative flex items-center gap-3 py-3 rounded-xl font-semibold text-sm transition-all no-underline ${
            active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
        } ${isCollapsed ? 'justify-center px-0' : 'px-4'}`;

    const NavLink = ({ path, icon: Icon, name }) => {
        const active = isActive(path);
        return (
            <Link to={path} className={linkCls(active)} title={isCollapsed ? name : ''}>
                {active && (
                    <motion.div layoutId="sidebar-active"
                        className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl"
                    />
                )}
                <Icon size={18} className="relative z-10 shrink-0" />
                {!isCollapsed && <span className="relative z-10 whitespace-nowrap">{name}</span>}
            </Link>
        );
    };

    const toggleDropdown = (setter, curr) => {
        if (isCollapsed) setIsCollapsed(false);
        setter(!curr);
    };

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 border-r border-slate-800 flex flex-col h-screen shrink-0 transition-all duration-300 z-50`}>
            {/* Logo */}
            <div className={`px-5 py-5 border-b border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                <div className="flex items-center gap-3" title={isCollapsed ? 'SajiloSchool' : ''}>
                    <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/30">
                        S
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden whitespace-nowrap">
                            <p className="text-white font-black text-base leading-none">SajiloSchool</p>
                            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest mt-0.5">
                                {tenantId ? 'School Admin' : 'Super Admin'}
                            </p>
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <button onClick={() => setIsCollapsed(true)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
                        <PanelLeftClose size={16} />
                    </button>
                )}
            </div>

            {/* If collapsed, give a way to expand at the top or bottom. A small expand button under logo is nice */}
            {isCollapsed && (
                <div className="flex justify-center py-2 border-b border-slate-800">
                    <button onClick={() => setIsCollapsed(false)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                        <PanelLeftOpen size={18} />
                    </button>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar space-y-1">
                <NavLink path="/dashboard" icon={LayoutDashboard} name="Dashboard" />

                {tenantId && (
                    <>
                        <NavLink path="/dashboard/users"      icon={UserCog}      name="Users"      />
                        <NavLink path="/dashboard/classes"    icon={School}       name="Classes"    />
                        <NavLink path="/dashboard/subjects"   icon={BookOpen}     name="Subjects"   />
                        
                        {/* Students Dropdown */}
                        <div title={isCollapsed ? "Students" : ""}>
                            <button
                                onClick={() => toggleDropdown(setStudentOpen, studentOpen)}
                                className={`w-full flex items-center gap-3 py-3 rounded-xl font-semibold text-sm transition-all ${
                                    studentActive
                                        ? 'bg-indigo-600/20 text-indigo-400'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                } ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
                            >
                                <Users size={18} className="shrink-0" />
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1 text-left whitespace-nowrap">Students</span>
                                        <ChevronDown
                                            size={15}
                                            className={`transition-transform duration-200 ${studentOpen ? 'rotate-180' : ''}`}
                                        />
                                    </>
                                )}
                            </button>

                            <AnimatePresence initial={false}>
                                {studentOpen && !isCollapsed && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="ml-4 mt-1 space-y-1 border-l border-slate-800 pl-3 whitespace-nowrap">
                                            {STUDENT_ITEMS.map(item => {
                                                const active = isActive(item.path);
                                                return (
                                                    <Link key={item.path} to={item.path}
                                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all no-underline ${
                                                            active
                                                                ? 'bg-indigo-600 text-white'
                                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        <item.icon size={15} className="shrink-0" />
                                                        {item.name}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <NavLink path="/dashboard/staff"      icon={UserCog}      name="Staff"      />

                        {/* Attendance Dropdown */}
                        <div title={isCollapsed ? "Attendance" : ""}>
                            <button
                                onClick={() => toggleDropdown(setAttendanceOpen, attendanceOpen)}
                                className={`w-full flex items-center gap-3 py-3 rounded-xl font-semibold text-sm transition-all ${
                                    attendanceActive
                                        ? 'bg-blue-600/20 text-blue-400'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                } ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
                            >
                                <Calendar size={18} className="shrink-0" />
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1 text-left whitespace-nowrap">Attendance</span>
                                        <ChevronDown
                                            size={15}
                                            className={`transition-transform duration-200 ${attendanceOpen ? 'rotate-180' : ''}`}
                                        />
                                    </>
                                )}
                            </button>

                            <AnimatePresence initial={false}>
                                {attendanceOpen && !isCollapsed && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="ml-4 mt-1 space-y-1 border-l border-slate-800 pl-3 whitespace-nowrap">
                                            {ATTENDANCE_ITEMS.map(item => {
                                                const active = isActive(item.path);
                                                return (
                                                    <Link key={item.path} to={item.path}
                                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all no-underline ${
                                                            active
                                                                ? 'bg-blue-600 text-white'
                                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        <item.icon size={15} className="shrink-0" />
                                                        {item.name}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* School Finance — standalone link */}
                        <NavLink path="/dashboard/finance/overview" icon={Wallet} name="School Finance" />

                        {/* Exams Dropdown */}
                        <div title={isCollapsed ? "Exams" : ""}>
                            <button
                                onClick={() => toggleDropdown(setExamOpen, examOpen)}
                                className={`w-full flex items-center gap-3 py-3 rounded-xl font-semibold text-sm transition-all ${
                                    examActive
                                        ? 'bg-violet-600/20 text-violet-400'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                } ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
                            >
                                <GraduationCap size={18} className="shrink-0" />
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1 text-left whitespace-nowrap">Exams</span>
                                        <ChevronDown
                                            size={15}
                                            className={`transition-transform duration-200 ${examOpen ? 'rotate-180' : ''}`}
                                        />
                                    </>
                                )}
                            </button>

                            <AnimatePresence initial={false}>
                                {examOpen && !isCollapsed && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="ml-4 mt-1 space-y-1 border-l border-slate-800 pl-3 whitespace-nowrap">
                                            {EXAM_ITEMS.map(item => {
                                                const active = isActive(item.path);
                                                return (
                                                    <Link key={item.path} to={item.path}
                                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all no-underline ${
                                                            active
                                                                ? 'bg-violet-600 text-white'
                                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        <item.icon size={15} className="shrink-0" />
                                                        {item.name}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Finance Dropdown */}
                        <div title={isCollapsed ? "Finance" : ""}>
                            <button
                                onClick={() => toggleDropdown(setFinanceOpen, financeOpen)}
                                className={`w-full flex items-center gap-3 py-3 rounded-xl font-semibold text-sm transition-all ${
                                    financeActive
                                        ? 'bg-indigo-600/20 text-indigo-400'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                } ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
                            >
                                <DollarSign size={18} className="shrink-0" />
                                {!isCollapsed && (
                                    <>
                                        <span className="flex-1 text-left whitespace-nowrap">Finance</span>
                                        <ChevronDown
                                            size={15}
                                            className={`transition-transform duration-200 ${financeOpen ? 'rotate-180' : ''}`}
                                        />
                                    </>
                                )}
                            </button>

                            <AnimatePresence initial={false}>
                                {financeOpen && !isCollapsed && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="ml-4 mt-1 space-y-1 border-l border-slate-800 pl-3 whitespace-nowrap">
                                            {FINANCE_ITEMS.map(item => {
                                                const active = isActive(item.path);
                                                return (
                                                    <Link key={item.path} to={item.path}
                                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all no-underline ${
                                                            active
                                                                ? 'bg-indigo-600 text-white'
                                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        <item.icon size={15} className="shrink-0" />
                                                        {item.name}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <NavLink path="/dashboard/settings/school" icon={Settings} name="School Settings" />
                    </>
                )}

                {!tenantId && (
                    <>
                        <NavLink path="/dashboard/tenants"  icon={GraduationCap} name="Schools"  />
                        <NavLink path="/dashboard/settings" icon={Settings}      name="Settings" />
                    </>
                )}
            </nav>

            {/* Logout */}
            <div className="px-3 py-4 border-t border-slate-800" title={isCollapsed ? "Logout" : ""}>
                <button onClick={handleLogout}
                    className={`flex items-center gap-3 w-full py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
                >
                    <LogOut size={18} className="shrink-0" />
                    {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
