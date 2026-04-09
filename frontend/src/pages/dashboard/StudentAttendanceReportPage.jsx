import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart2, CheckCircle2, XCircle, Clock3, SunMedium,
    Users, ChevronDown, Search, Loader2, AlertCircle,
    Download, RefreshCw, TrendingDown, TrendingUp,
    CalendarRange, Filter, ArrowUpDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getFirstOfYear  = () => `${new Date().getFullYear()}-01-01`;
const getTodayISO     = () => new Date().toISOString().split('T')[0];

const pctColor = (pct) => {
    if (pct >= 90) return { bar: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' };
    if (pct >= 75) return { bar: 'bg-amber-500',   text: 'text-amber-400',   badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400' };
    return           { bar: 'bg-rose-500',    text: 'text-rose-400',    badge: 'bg-rose-500/10 border-rose-500/30 text-rose-400' };
};

// ─── Top summary card ─────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, sub, icon: Icon, colorClass, barColor, max }) => (
    <div className={`relative overflow-hidden flex-1 min-w-[140px] rounded-2xl border p-5 ${colorClass}`}>
        <div className="flex items-start justify-between mb-4">
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
                <p className="text-4xl font-black mt-1">{value}</p>
                {sub && <p className="text-[11px] font-bold opacity-50 mt-0.5">{sub}</p>}
            </div>
            <div className="opacity-20"><Icon size={34} /></div>
        </div>
        {max > 0 && (
            <div className="h-1.5 rounded-full bg-black/20">
                <motion.div className={`h-full rounded-full ${barColor}`}
                    initial={{ width: 0 }} animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }} />
            </div>
        )}
    </div>
);

// ─── Attendance mini bar ──────────────────────────────────────────────────────
const AttBar = ({ present, absent, late, total }) => {
    if (total === 0) return <div className="h-2 rounded-full bg-slate-800 w-full" />;
    const pPct = (present / total) * 100;
    const aPct = (absent  / total) * 100;
    const lPct = (late    / total) * 100;
    return (
        <div className="flex h-2 rounded-full overflow-hidden w-full gap-px bg-slate-800">
            <div className="bg-emerald-500 transition-all" style={{ width: `${pPct}%` }} title={`Present: ${present}`} />
            <div className="bg-rose-500 transition-all"    style={{ width: `${aPct}%` }} title={`Absent: ${absent}`}  />
            <div className="bg-amber-500 transition-all"   style={{ width: `${lPct}%` }} title={`Late: ${late}`}    />
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const StudentAttendanceReportPage = () => {
    const toast = useToast();

    const [classes,         setClasses]         = useState([]);
    const [selectedClass,   setSelectedClass]   = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [fromDate,        setFromDate]        = useState(getFirstOfYear());
    const [toDate,          setToDate]          = useState(getTodayISO());
    const [data,            setData]            = useState([]);
    const [loading,         setLoading]         = useState(false);
    const [search,          setSearch]          = useState('');
    const [sortBy,          setSortBy]          = useState('absent'); // absent|name|pct|working
    const [sortDir,         setSortDir]         = useState('desc');
    const [threshold,       setThreshold]       = useState(''); // filter: show only pct < threshold

    useEffect(() => {
        axios.get('/classes/').then(r => setClasses(r.data || [])).catch(() => {});
    }, []);

    const classObj = classes.find(c => c.name === selectedClass);

    const fetchReport = useCallback(async () => {
        if (!selectedClass) return;
        setLoading(true);
        try {
            const params = { class_name: selectedClass };
            if (selectedSection) params.section = selectedSection;
            if (fromDate) params.from_date = fromDate;
            if (toDate)   params.to_date   = toDate;
            const r = await axios.get('/student-attendance/student-summary/', { params });
            setData(r.data || []);
        } catch { toast('Failed to load report', 'error'); }
        finally { setLoading(false); }
    }, [selectedClass, selectedSection, fromDate, toDate]);

    useEffect(() => { fetchReport(); }, [fetchReport]);

    // Sort + filter
    const sorted = [...data]
        .filter(s => {
            const matchSearch = `${s.name} ${s.admission_number}`.toLowerCase().includes(search.toLowerCase());
            const matchThresh = threshold ? s.attendance_pct < parseFloat(threshold) : true;
            return matchSearch && matchThresh;
        })
        .sort((a, b) => {
            let va, vb;
            if (sortBy === 'name')    { va = a.name;           vb = b.name;           }
            else if (sortBy === 'pct')  { va = a.attendance_pct; vb = b.attendance_pct; }
            else if (sortBy === 'working') { va = a.working_days; vb = b.working_days; }
            else                        { va = a.absent;        vb = b.absent;        }
            if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
            return sortDir === 'asc' ? va - vb : vb - va;
        });

    const toggleSort = (col) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('desc'); }
    };

    // Aggregates for summary cards
    const totalStudents = sorted.length;
    const totalWorking  = totalStudents > 0 ? Math.max(...sorted.map(s => s.working_days)) : 0; // school days
    const totalAbsent   = sorted.reduce((sum, s) => sum + s.absent, 0);
    const belowThresh   = sorted.filter(s => s.attendance_pct < 75).length;
    const avgPct        = totalStudents > 0
        ? (sorted.reduce((sum, s) => sum + s.attendance_pct, 0) / totalStudents).toFixed(1)
        : 0;

    const SortTh = ({ col, label }) => (
        <th onClick={() => toggleSort(col)}
            className="px-4 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-300 select-none transition-colors">
            <div className="flex items-center gap-1.5">
                {label}
                <ArrowUpDown size={11} className={sortBy === col ? 'text-blue-400' : 'text-slate-700'} />
            </div>
        </th>
    );

    // CSV Export
    const exportCSV = () => {
        const header = ['Name', 'Adm No', 'Section', 'Working Days', 'Present', 'Absent', 'Late', 'Holiday', 'Attendance %'];
        const rows = sorted.map(s => [
            s.name, s.admission_number, s.section,
            s.working_days, s.present, s.absent, s.late, s.holiday, s.attendance_pct
        ]);
        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a'); a.href = url;
        a.download = `attendance_${selectedClass}_${fromDate}_to_${toDate}.csv`; a.click();
    };

    return (
        <div className="space-y-6">

            {/* ─── Header ────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
                            <BarChart2 size={20} />
                        </div>
                        Attendance Report
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Per-student working days, absent count and attendance percentage.</p>
                </div>
                {data.length > 0 && (
                    <button onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:border-violet-500/40 hover:text-violet-400 text-sm font-bold transition-all">
                        <Download size={15} /> Export CSV
                    </button>
                )}
            </div>

            {/* ─── Filters ────────────────────────────────────────────────────── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Class */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Class</label>
                        <div className="relative">
                            <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-4 pr-10 text-white text-sm outline-none focus:border-violet-500 transition-all appearance-none">
                                <option value="">Select Class...</option>
                                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                    {/* Section */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Section</label>
                        <div className="relative">
                            <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedClass}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-4 pr-10 text-white text-sm outline-none focus:border-violet-500 transition-all appearance-none disabled:opacity-40">
                                <option value="">All Sections</option>
                                {classObj?.sections?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                    {/* From */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">From Date</label>
                        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-violet-500 transition-all" />
                    </div>
                    {/* To */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">To Date</label>
                        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-violet-500 transition-all" />
                    </div>
                    {/* Threshold filter */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Below % (filter)</label>
                        <div className="relative">
                            <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input type="number" min={0} max={100} placeholder="e.g. 75" value={threshold}
                                onChange={e => setThreshold(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm outline-none focus:border-violet-500 transition-all placeholder:text-slate-600" />
                        </div>
                    </div>
                </div>

                {/* Search + refresh */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="text" placeholder="Search student name or admission number..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none focus:border-violet-500 transition-all placeholder:text-slate-600" />
                    </div>
                    {search && <button onClick={() => setSearch('')} className="text-xs text-slate-500 hover:text-white flex items-center gap-1 font-bold transition-colors"><span>✕</span> Clear</button>}
                    {threshold && <button onClick={() => setThreshold('')} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold transition-colors"><span>✕</span> Remove filter</button>}
                    <button onClick={fetchReport} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs font-bold transition-colors ml-auto">
                        <RefreshCw size={13} /> Refresh
                    </button>
                </div>
            </div>

            {/* ─── Summary Cards ────────────────────────────────────────────── */}
            {data.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-3">
                    <SummaryCard label="Students"     value={totalStudents} sub="in report"           icon={Users}         colorClass="border-slate-700 bg-slate-800/40 text-white"             barColor="bg-slate-400" max={0} />
                    <SummaryCard label="Working Days" value={totalWorking}  sub="max for any student" icon={CalendarRange} colorClass="border-blue-500/20 bg-blue-500/5 text-blue-400"          barColor="bg-blue-400"  max={0} />
                    <SummaryCard label="Total Absent" value={totalAbsent}   sub="all students combined" icon={XCircle}     colorClass="border-rose-500/20 bg-rose-500/5 text-rose-400"          barColor="bg-rose-400"  max={totalStudents * totalWorking} />
                    <SummaryCard label="Below 75%"    value={belowThresh}   sub="at-risk students"    icon={TrendingDown}  colorClass="border-amber-500/20 bg-amber-500/5 text-amber-400"       barColor="bg-amber-400" max={totalStudents} />
                    <SummaryCard label="Avg Attend."  value={`${avgPct}%`}  sub="class average"       icon={TrendingUp}   colorClass="border-emerald-500/20 bg-emerald-500/5 text-emerald-400" barColor="bg-emerald-400" max={0} />
                </motion.div>
            )}

            {/* ─── Table / States ───────────────────────────────────────────── */}
            {!selectedClass ? (
                <div className="h-64 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 mb-3"><BarChart2 size={30} /></div>
                    <h3 className="text-white font-bold text-lg">Select a Class</h3>
                    <p className="text-slate-500 text-sm mt-1 text-center px-8">Choose a class and date range to generate the attendance report.</p>
                </div>
            ) : loading ? (
                <div className="h-48 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Generating report...</p>
                </div>
            ) : sorted.length === 0 ? (
                <div className="border border-slate-800 rounded-2xl p-12 flex flex-col items-center">
                    <AlertCircle size={32} className="text-slate-700 mb-3" />
                    <h3 className="text-white font-bold">No Data Found</h3>
                    <p className="text-slate-500 text-sm mt-1">No attendance records for {selectedClass} in this date range.</p>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-800/50 border-b border-slate-800">
                                    <th className="pl-6 pr-3 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-8">#</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-36">Adm / Roll</th>
                                    <SortTh col="name" label="Student" />
                                    <SortTh col="working" label="Working Days" />
                                    <th className="px-4 py-4 text-center text-[10px] font-black text-emerald-500/70 uppercase tracking-widest">Present</th>
                                    <th className="px-4 py-4 text-center text-[10px] font-black text-rose-500/70 uppercase tracking-widest">Absent</th>
                                    <th className="px-4 py-4 text-center text-[10px] font-black text-amber-500/70 uppercase tracking-widest">Late</th>
                                    <th className="px-4 py-4 text-center text-[10px] font-black text-sky-500/70 uppercase tracking-widest">Holiday</th>
                                    <SortTh col="pct" label="Attend. %" />
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[160px]">Breakdown</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {sorted.map((s, i) => {
                                    const pc   = pctColor(s.attendance_pct);
                                    const isRisk = s.attendance_pct < 75 && s.working_days > 0;
                                    const initials = s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

                                    return (
                                        <motion.tr key={s.student_id}
                                            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: Math.min(i * 0.012, 0.25) }}
                                            className={`hover:bg-slate-800/30 transition-colors group ${isRisk ? 'border-l-2 border-rose-500/50' : ''}`}>

                                            {/* # */}
                                            <td className="pl-6 pr-3 py-3.5">
                                                <span className="text-[11px] text-slate-600 font-bold">{i + 1}</span>
                                            </td>

                                            {/* Adm */}
                                            <td className="px-4 py-3.5">
                                                <code className="text-[11px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-lg text-slate-400 font-mono block mb-0.5">
                                                    {s.admission_number}
                                                </code>
                                                {s.roll_number && <span className="text-[10px] text-slate-600 font-bold pl-1">Roll {s.roll_number}</span>}
                                                {s.section && <span className="text-[10px] text-slate-600 font-bold pl-1">· {s.section}</span>}
                                            </td>

                                            {/* Name */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border shrink-0 ${
                                                        isRisk
                                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                            : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                                                    }`}>
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white leading-none">{s.name}</p>
                                                        {isRisk && (
                                                            <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">⚠ Low Attendance</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Working days */}
                                            <td className="px-4 py-3.5 text-center">
                                                <span className="text-sm font-black text-white">{s.working_days}</span>
                                                <span className="text-[10px] text-slate-600 font-bold"> days</span>
                                            </td>

                                            {/* Present */}
                                            <td className="px-4 py-3.5 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-black text-emerald-400">{s.present}</span>
                                                    <span className="text-[10px] text-emerald-400/40 font-bold">
                                                        {s.working_days > 0 ? Math.round((s.present / s.working_days) * 100) : 0}%
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Absent — highlighted */}
                                            <td className="px-4 py-3.5 text-center">
                                                <div className={`inline-flex flex-col items-center px-3 py-1 rounded-xl border ${
                                                    s.absent > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'border-transparent'
                                                }`}>
                                                    <span className={`text-sm font-black ${s.absent > 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                                                        {s.absent}
                                                    </span>
                                                    {s.absent > 0 && s.working_days > 0 && (
                                                        <span className="text-[10px] text-rose-400/50 font-bold">
                                                            {Math.round((s.absent / s.working_days) * 100)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Late */}
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`text-sm font-black ${s.late > 0 ? 'text-amber-400' : 'text-slate-700'}`}>
                                                    {s.late}
                                                </span>
                                            </td>

                                            {/* Holiday */}
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`text-sm font-black ${s.holiday > 0 ? 'text-sky-400' : 'text-slate-700'}`}>
                                                    {s.holiday}
                                                </span>
                                            </td>

                                            {/* Attendance % */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-black min-w-[42px] ${s.working_days === 0 ? 'text-slate-600' : pc.text}`}>
                                                        {s.working_days === 0 ? '—' : `${s.attendance_pct}%`}
                                                    </span>
                                                    {s.working_days > 0 && (
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-lg border ${pc.badge}`}>
                                                            {s.attendance_pct >= 90 ? 'Good' : s.attendance_pct >= 75 ? 'Warning' : 'Risk'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Breakdown bar */}
                                            <td className="px-4 py-3.5 min-w-[160px]">
                                                <div className="space-y-1.5">
                                                    <AttBar present={s.present} absent={s.absent} late={s.late} total={s.working_days} />
                                                    <div className="flex items-center gap-3 text-[9px] font-bold">
                                                        <span className="text-emerald-400/70">P:{s.present}</span>
                                                        <span className="text-rose-400/70">A:{s.absent}</span>
                                                        <span className="text-amber-400/70">L:{s.late}</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 bg-slate-800/20 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-600 font-bold">
                        <div className="flex items-center gap-3">
                            <Users size={12} className="text-slate-700" />
                            {totalStudents} students
                            {belowThresh > 0 && <span className="text-rose-400">· {belowThresh} below 75%</span>}
                            {threshold && <span className="text-amber-400">· filtered: below {threshold}%</span>}
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> &ge;90% Good</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 75–89% Warning</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> &lt;75% Risk</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default StudentAttendanceReportPage;
