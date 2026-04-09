import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, Loader2, ChevronDown, ChevronUp, Receipt,
    CheckCircle2, Clock, AlertCircle, Printer,
    IndianRupee, TrendingUp, TrendingDown, History,
    User, GraduationCap, Calendar, CreditCard
} from 'lucide-react';
import axios from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';

// ── Status configs ─────────────────────────────────────────────
const PAYMENT_STATUS = {
    paid:    { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 size={10} />, label: 'Paid'    },
    partial: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',       icon: <Clock size={10} />,        label: 'Partial' },
    pending: { cls: 'bg-red-500/10 text-red-400 border-red-500/20',             icon: <AlertCircle size={10} />,  label: 'Pending' },
};

const ENROLL_STATUS = {
    active:      { cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',   label: 'Active'      },
    completed:   { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Cleared'     },
    transferred: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',       label: 'Transferred' },
};

const PAYMENT_METHOD_LABEL = {
    cash:   'Cash', cheque: 'Cheque', online: 'Online', esewa: 'eSewa', khalti: 'Khalti'
};

// ── Year Card ─────────────────────────────────────────────────
const YearCard = ({ yearName, enrollments, payments }) => {
    const [open, setOpen] = useState(true);

    // Aggregate across all enrollments for this year
    const totalDue   = enrollments.reduce((s, e) => s + (parseFloat(e.total_due)  || 0), 0);
    const totalPaid  = enrollments.reduce((s, e) => s + (parseFloat(e.total_paid) || 0), 0);
    const totalOwing = enrollments.reduce((s, e) => s + Math.max(parseFloat(e.balance) || 0, 0), 0);
    const isCleared  = totalOwing <= 0;

    // Payments for this year
    const yearPayments = payments.filter(p => p.financial_year_name === yearName || (p.financial_year && enrollments.find(e => e.financial_year === p.financial_year)));

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-slate-900 border rounded-2xl overflow-hidden ${isCleared ? 'border-emerald-500/20' : 'border-slate-800'}`}
        >
            {/* Year Header */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCleared ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                        <Calendar size={16} className={isCleared ? 'text-emerald-400' : 'text-amber-400'} />
                    </div>
                    <div className="text-left">
                        <p className="font-black text-white text-sm">{yearName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {enrollments.length} enrollment{enrollments.length !== 1 ? 's' : ''} · {yearPayments.length} payment{yearPayments.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-5">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-500">Balance</p>
                        <p className={`text-sm font-black ${isCleared ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isCleared ? '✓ Cleared' : `Rs. ${totalOwing.toLocaleString()}`}
                        </p>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-500">Collected</p>
                        <p className="text-sm font-bold text-emerald-400">Rs. {totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-500">Total Due</p>
                        <p className="text-sm font-bold text-slate-300">Rs. {totalDue.toLocaleString()}</p>
                    </div>
                    {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-slate-800 px-5 pb-5 pt-4 space-y-4">

                            {/* Mobile summary */}
                            <div className="grid grid-cols-3 gap-3 sm:hidden">
                                {[
                                    { l: 'Due', v: totalDue, c: 'text-slate-300' },
                                    { l: 'Paid', v: totalPaid, c: 'text-emerald-400' },
                                    { l: 'Balance', v: totalOwing, c: isCleared ? 'text-emerald-400' : 'text-red-400' },
                                ].map(({ l, v, c }) => (
                                    <div key={l} className="bg-slate-800 rounded-xl p-3 text-center">
                                        <p className={`text-sm font-black ${c}`}>Rs. {v.toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{l}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Enrollments */}
                            {enrollments.map(enrollment => {
                                        const eStatus = ENROLL_STATUS[enrollment.status] || ENROLL_STATUS.active;
                                        const eBalance = parseFloat(enrollment.balance) || 0;
                                        const ePayments = yearPayments.filter(p =>
                                            p.class_fee_detail === enrollment.class_fee_detail ||
                                            p.enrollment === enrollment.id
                                        );

                                        return (
                                            <div key={enrollment.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                                                {/* Enrollment header */}
                                                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-700/50">
                                                    <div className="flex items-center gap-2.5">
                                                        <GraduationCap size={14} className="text-slate-400" />
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{enrollment.class_fee_name || `${enrollment.class_name}${enrollment.section ? ` - ${enrollment.section}` : ''}`}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                                        Due: <span className="text-slate-300">Rs. {parseFloat(enrollment.total_due || 0).toLocaleString()}</span>
                                                        {' · '}Paid: <span className="text-emerald-400">Rs. {parseFloat(enrollment.total_paid || 0).toLocaleString()}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {eBalance > 0 && (
                                                    <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                                                        Dues: Rs. {eBalance.toLocaleString()}
                                                    </span>
                                                )}
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${eStatus.cls}`}>
                                                    {eStatus.label}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Payments sub-table */}
                                        {ePayments.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-slate-800/80">
                                                            {['Receipt', 'Month', 'Date', 'Amount Paid', 'Discount', 'Method', 'Status'].map(h => (
                                                                <th key={h} className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {ePayments.map((p, i) => {
                                                            const ps = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.pending;
                                                            return (
                                                                <tr key={p.id} className={`hover:bg-slate-700/30 transition-colors ${i < ePayments.length - 1 ? 'border-b border-slate-700/40' : ''}`}>
                                                                    <td className="px-4 py-2.5">
                                                                        <code className="text-[10px] text-indigo-400 font-mono bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">{p.receipt_number}</code>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-xs text-slate-400">{p.month || '—'}</td>
                                                                    <td className="px-4 py-2.5 text-xs text-slate-400">{p.payment_date}</td>
                                                                    <td className="px-4 py-2.5 text-xs font-semibold text-emerald-400">Rs. {parseFloat(p.amount_paid).toLocaleString()}</td>
                                                                    <td className="px-4 py-2.5 text-xs text-slate-400">
                                                                        {parseFloat(p.discount) > 0 ? `Rs. ${parseFloat(p.discount).toLocaleString()}` : '—'}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-xs text-slate-400 capitalize">{PAYMENT_METHOD_LABEL[p.payment_method] || p.payment_method}</td>
                                                                    <td className="px-4 py-2.5">
                                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${ps.cls}`}>
                                                                            {ps.icon} {ps.label}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="px-4 py-3 text-center">
                                                <p className="text-xs text-slate-600 italic">No payments recorded for this enrollment</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ── Main Page ─────────────────────────────────────────────────
const StudentFeeHistoryPage = () => {
    const [students, setStudents]       = useState([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const [enrollments, setEnrollments] = useState([]);
    const [payments, setPayments]       = useState([]);
    const [loading, setLoading]         = useState(false);

    // Load all students on mount
    useEffect(() => {
        axios.get('/students/').then(r => setStudents(r.data)).catch(() => {});
    }, []);

    const filteredStudents = students.filter(s =>
        `${s.first_name} ${s.last_name} ${s.admission_number || ''} ${s.class_name || ''}`.toLowerCase()
            .includes(studentSearch.toLowerCase())
    ).slice(0, 12);

    const selectStudent = async (student) => {
        setSelectedStudent(student);
        setStudentSearch(`${student.first_name} ${student.last_name}`);
        setShowDropdown(false);
        setLoading(true);
        try {
            const [eRes, pRes] = await Promise.all([
                axios.get(`/fee-enrollments/?student=${student.id}`),
                axios.get(`/fee-collections/?student=${student.id}`),
            ]);
            setEnrollments(eRes.data);
            setPayments(pRes.data);
        } catch { } finally { setLoading(false); }
    };

    // Group enrollments by financial year name
    const yearGroups = enrollments.reduce((acc, e) => {
        const key = e.financial_year_name || `Year ${e.financial_year}`;
        (acc[key] = acc[key] || []).push(e);
        return acc;
    }, {});
    const sortedYears = Object.keys(yearGroups).sort((a, b) => b.localeCompare(a));

    // Overall student totals
    const grandDue   = enrollments.reduce((s, e) => s + (parseFloat(e.total_due)  || 0), 0);
    const grandPaid  = enrollments.reduce((s, e) => s + (parseFloat(e.total_paid) || 0), 0);
    const grandOwing = enrollments.reduce((s, e) => s + Math.max(parseFloat(e.balance) || 0, 0), 0);

    const handlePrint = () => window.print();

    return (
        <div className="max-w-5xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black text-white">Student Fee History</h1>
                    <p className="text-slate-400 text-sm mt-0.5">View complete fee history, dues, and payments for any student.</p>
                </div>
                {selectedStudent && enrollments.length > 0 && (
                    <button onClick={handlePrint}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-bold px-4 py-2.5 rounded-xl transition-all print:hidden">
                        <Printer size={15} /> Print History
                    </button>
                )}
            </div>

            {/* Student Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Student</label>
                <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <input
                        value={studentSearch}
                        onChange={e => { setStudentSearch(e.target.value); setShowDropdown(true); setSelectedStudent(null); }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Search by name, admission number, class..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                    <AnimatePresence>
                        {showDropdown && filteredStudents.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                                className="absolute top-full left-0 right-0 z-30 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto"
                            >
                                {filteredStudents.map(s => (
                                    <button key={s.id} onMouseDown={() => selectStudent(s)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left border-b border-slate-800 last:border-0">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                            <User size={14} className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{s.first_name} {s.last_name}</p>
                                            <p className="text-[10px] text-slate-500">{s.class_name}{s.section ? ` — ${s.section}` : ''}{s.admission_number ? ` · ${s.admission_number}` : ''}</p>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {/* Click outside closes dropdown */}
                {showDropdown && <div className="fixed inset-0 z-20" onClick={() => setShowDropdown(false)} />}
            </div>

            {/* Prompt state */}
            {!selectedStudent && !loading && (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900 border border-dashed border-slate-700 rounded-2xl">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                        <History size={24} className="text-indigo-400" />
                    </div>
                    <p className="text-white font-black text-lg mb-1">No Student Selected</p>
                    <p className="text-slate-500 text-sm">Search and select a student to view their complete fee history.</p>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-indigo-400" />
                </div>
            )}

            {/* Content */}
            {selectedStudent && !loading && (
                <>
                    {/* Student Info Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center">
                                    <User size={20} className="text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-lg font-black text-white">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {selectedStudent.admission_number && (
                                            <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">#{selectedStudent.admission_number}</span>
                                        )}
                                        {selectedStudent.class_name && (
                                            <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">{selectedStudent.class_name}{selectedStudent.section ? ` — ${selectedStudent.section}` : ''}</span>
                                        )}
                                        {selectedStudent.faculty && (
                                            <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded">{selectedStudent.faculty}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Grand totals */}
                            <div className="flex gap-3 flex-wrap">
                                {[
                                    { l: 'Lifetime Due',  v: grandDue,   c: 'text-slate-300',   bg: 'bg-slate-800',        border: 'border-slate-700' },
                                    { l: 'Total Paid',    v: grandPaid,  c: 'text-emerald-400', bg: 'bg-emerald-500/10',   border: 'border-emerald-500/20' },
                                    { l: 'Outstanding',   v: grandOwing, c: grandOwing > 0 ? 'text-red-400' : 'text-emerald-400', bg: grandOwing > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10', border: grandOwing > 0 ? 'border-red-500/20' : 'border-emerald-500/20' },
                                ].map(({ l, v, c, bg, border }) => (
                                    <div key={l} className={`${bg} border ${border} rounded-xl px-4 py-2.5 text-center min-w-[110px]`}>
                                        <p className={`text-base font-black ${c}`}>Rs. {v.toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{l}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Outstanding Dues Banner */}
                    {grandOwing > 0 && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 flex items-center gap-3">
                            <AlertCircle size={20} className="text-red-400 shrink-0" />
                            <div>
                                <p className="text-sm font-black text-red-300">Outstanding Dues: Rs. {grandOwing.toLocaleString()}</p>
                                <p className="text-xs text-red-400/70 mt-0.5">
                                    This student has unpaid fees across {sortedYears.filter(y => yearGroups[y].some(e => parseFloat(e.balance) > 0)).length} academic year(s).
                                </p>
                            </div>
                        </div>
                    )}

                    {/* No history */}
                    {sortedYears.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 bg-slate-900 border border-dashed border-slate-700 rounded-2xl">
                            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
                                <Receipt size={20} className="text-slate-600" />
                            </div>
                            <p className="text-sm font-bold text-slate-500">No fee history found</p>
                            <p className="text-xs text-slate-600 mt-1">This student has no enrollment records yet.</p>
                        </div>
                    ) : (
                        /* Year-by-Year Timeline */
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                                Fee History — {sortedYears.length} Academic Year{sortedYears.length !== 1 ? 's' : ''}
                            </p>
                            {sortedYears.map(year => (
                                <YearCard
                                    key={year}
                                    yearName={year}
                                    enrollments={yearGroups[year]}
                                    payments={payments}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Print styles */}
            <style>{`
                @media print {
                    body { background: white !important; color: black !important; }
                    .print\\:hidden { display: none !important; }
                    nav, aside, header { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default StudentFeeHistoryPage;
