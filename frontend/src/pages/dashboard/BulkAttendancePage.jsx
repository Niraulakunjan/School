import React, { useState, useEffect, useCallback } from 'react';
import {
    CalendarDays, CheckCircle2, XCircle, Clock3, Loader2,
    Search, Save, Users, ChevronDown, RefreshCw, Zap,
    CheckSquare, Square, X, SunMedium, AlertCircle,
    Palmtree, Plus, Trash2, Edit3, PartyPopper, TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUSES = [
    { code: 'P', label: 'Present', icon: CheckCircle2, pill: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', ring: 'ring-2 ring-emerald-500/50 bg-emerald-500/10 text-emerald-400 border-emerald-500/40' },
    { code: 'A', label: 'Absent',  icon: XCircle,      pill: 'border-rose-500/30 bg-rose-500/10 text-rose-400',         ring: 'ring-2 ring-rose-500/50 bg-rose-500/10 text-rose-400 border-rose-500/40' },
    { code: 'L', label: 'Late',    icon: Clock3,        pill: 'border-amber-500/30 bg-amber-500/10 text-amber-400',      ring: 'ring-2 ring-amber-500/50 bg-amber-500/10 text-amber-400 border-amber-500/40' },
    { code: 'H', label: 'Holiday', icon: SunMedium,     pill: 'border-sky-500/30 bg-sky-500/10 text-sky-400',           ring: 'ring-2 ring-sky-500/50 bg-sky-500/10 text-sky-400 border-sky-500/40' },
];
const SM = Object.fromEntries(STATUSES.map(s => [s.code, s]));

const getTodayISO = () => new Date().toISOString().split('T')[0];

// ─── Big stat card ─────────────────────────────────────────────────────────────
const BigStat = ({ label, count, total, colorClass, icon: Icon, barColor }) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className={`relative overflow-hidden flex-1 min-w-[130px] rounded-2xl border p-4 ${colorClass}`}>
            <div className="flex items-start justify-between mb-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
                    <p className="text-3xl font-black mt-0.5">{count}</p>
                </div>
                <div className="opacity-30"><Icon size={28} /></div>
            </div>
            <div className="h-1.5 rounded-full bg-black/20">
                <motion.div
                    className={`h-full rounded-full ${barColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
            </div>
            <p className="text-[10px] font-bold opacity-60 mt-1">{pct}% of class</p>
        </div>
    );
};

// ─── Status toggle button ──────────────────────────────────────────────────────
const StatusBtn = ({ code, active, onClick }) => {
    const { label, icon: Icon, ring } = SM[code];
    return (
        <button type="button" onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wide transition-all duration-150
                ${active ? ring : 'border-slate-700 bg-slate-800/60 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
        >
            <Icon size={13} />{label}
        </button>
    );
};

// ─── Holiday Modal ───────────────────────────────────────────────────────────
const HolidayModal = ({ open, onClose, onSaved, editItem = null }) => {
    const toast = useToast();
    const [form, setForm] = useState({ date: getTodayISO(), title: '', description: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editItem) setForm({ date: editItem.date, title: editItem.title, description: editItem.description || '' });
        else          setForm({ date: getTodayISO(), title: '', description: '' });
    }, [editItem, open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        setSaving(true);
        try {
            if (editItem) await axios.patch(`/school-holidays/${editItem.id}/`, form);
            else          await axios.post('/school-holidays/', form);
            toast(editItem ? 'Holiday updated!' : 'Holiday added!', 'success');
            onSaved();
            onClose();
        } catch { toast('Failed to save holiday', 'error'); }
        finally { setSaving(false); }
    };

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-sky-500/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                            <Palmtree size={18} />
                        </div>
                        <h3 className="text-white font-black text-base">{editItem ? 'Edit Holiday' : 'Add School Holiday'}</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</label>
                        <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-sky-500 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Holiday Name *</label>
                        <input type="text" placeholder="e.g. Dashain, Republic Day..." value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-sky-500 transition-all placeholder:text-slate-600" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description (optional)</label>
                        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                            placeholder="Short note about this holiday..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-sky-500 transition-all placeholder:text-slate-600 resize-none" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white text-sm font-bold transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Palmtree size={16} />}
                            {editItem ? 'Update' : 'Add Holiday'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BulkAttendancePage = () => {
    const toast = useToast();

    // ── Attendance state ──────────────────────────────────────────────────────
    const [classes,         setClasses]         = useState([]);
    const [selectedClass,   setSelectedClass]   = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [date,            setDate]            = useState(getTodayISO());
    const [students,        setStudents]        = useState([]);
    const [attendance,      setAttendance]      = useState({});
    const [search,          setSearch]          = useState('');
    const [loading,         setLoading]         = useState(false);
    const [saving,          setSaving]          = useState(false);
    const [selectedIds,     setSelectedIds]     = useState(new Set());
    const [activeHoliday,   setActiveHoliday]   = useState(null); // holiday on selected date

    // ── Holiday panel state ───────────────────────────────────────────────────
    const [showHolidayPanel, setShowHolidayPanel] = useState(false);
    const [holidays,          setHolidays]        = useState([]);
    const [holidayLoading,    setHolidayLoading]  = useState(false);
    const [modalOpen,         setModalOpen]        = useState(false);
    const [editHoliday,       setEditHoliday]      = useState(null);

    // ── Load classes once ─────────────────────────────────────────────────────
    useEffect(() => {
        axios.get('/classes/').then(r => setClasses(r.data || [])).catch(() => {});
    }, []);

    // ── Load holidays ─────────────────────────────────────────────────────────
    const loadHolidays = useCallback(async () => {
        setHolidayLoading(true);
        try {
            const year = new Date().getFullYear();
            const r = await axios.get('/school-holidays/', { params: { year } });
            setHolidays(r.data || []);
        } catch { toast('Failed to load holidays', 'error'); }
        finally { setHolidayLoading(false); }
    }, []);

    useEffect(() => { loadHolidays(); }, [loadHolidays]);

    // ── Load students + attendance ────────────────────────────────────────────
    const loadData = useCallback(async () => {
        if (!selectedClass) { setStudents([]); setAttendance({}); setActiveHoliday(null); return; }
        setLoading(true);
        try {
            const params = { class_name: selectedClass, ...(selectedSection ? { section: selectedSection } : {}) };
            const [sRes, aRes] = await Promise.all([
                axios.get('/students/', { params }),
                axios.get('/student-attendance/daily-summary/', { params: { date, class_name: selectedClass, ...(selectedSection ? { section: selectedSection } : {}) } }),
            ]);
            const studs = sRes.data || [];
            setStudents(studs);
            setActiveHoliday(aRes.data?.holiday || null);

            const existing = aRes.data?.records || {};
            // If this date is a holiday and no records exist, pre-fill all as H
            const holiday = aRes.data?.holiday;
            const init = {};
            studs.forEach(s => {
                init[s.id] = existing[s.id] || { status: holiday ? 'H' : 'P', remark: holiday ? holiday.title : '' };
            });
            setAttendance(init);
            setSelectedIds(new Set());
        } catch { toast('Failed to load attendance data', 'error'); }
        finally { setLoading(false); }
    }, [selectedClass, selectedSection, date]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Mark as holiday for entire date ───────────────────────────────────────
    const markAllHoliday = useCallback((title = '') => {
        setAttendance(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(id => { next[id] = { status: 'H', remark: title }; });
            return next;
        });
    }, []);

    // When active holiday changes (e.g. date changes to a known holiday)
    useEffect(() => {
        if (activeHoliday && students.length > 0) {
            // Only auto-fill if all are already P (fresh load)
            const allPresent = Object.values(attendance).every(a => a.status === 'P');
            if (allPresent) markAllHoliday(activeHoliday.title);
        }
    }, [activeHoliday]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const setStatus = (id, s) => setAttendance(prev => ({ ...prev, [id]: { ...prev[id], status: s } }));
    const setRemark = (id, r) => setAttendance(prev => ({ ...prev, [id]: { ...prev[id], remark: r } }));

    const bulkSetStatus = (s) => {
        if (!selectedIds.size) return;
        setAttendance(prev => {
            const next = { ...prev };
            selectedIds.forEach(id => { next[id] = { ...next[id], status: s }; });
            return next;
        });
    };

    const toggleSelect = (id) => setSelectedIds(prev => {
        const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
    });

    const filtered = students.filter(s =>
        `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(search.toLowerCase())
    );
    const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
    const toggleAll = () => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(filtered.map(s => s.id)));

    const handleSave = async () => {
        if (!selectedClass || !students.length) return;
        setSaving(true);
        try {
            const records = students.map(s => ({ student_id: s.id, status: attendance[s.id]?.status || 'P', remark: attendance[s.id]?.remark || '' }));
            await axios.post('/student-attendance/bulk-mark/', { date, records });
            toast('Attendance saved! ✓', 'success');
        } catch { toast('Failed to save attendance', 'error'); }
        finally { setSaving(false); }
    };

    const handleDeleteHoliday = async (id) => {
        try {
            await axios.delete(`/school-holidays/${id}/`);
            toast('Holiday removed', 'success');
            loadHolidays();
            loadData(); // re-check active holiday for current date
        } catch { toast('Failed to delete', 'error'); }
    };

    // ── Summary counts ────────────────────────────────────────────────────────
    const counts = { P: 0, A: 0, L: 0, H: 0 };
    Object.values(attendance).forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });
    const total = students.length;

    const classObj = classes.find(c => c.name === selectedClass);

    return (
        <div className="space-y-5 pb-36">

            {/* ─── Header ────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                            <CalendarDays size={20} />
                        </div>
                        Bulk Attendance
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Mark daily attendance for an entire class in one go.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowHolidayPanel(p => !p)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all
                            ${showHolidayPanel ? 'bg-sky-500/10 border-sky-500/40 text-sky-400' : 'border-slate-700 text-slate-400 hover:border-sky-500/40 hover:text-sky-400'}`}>
                        <Palmtree size={16} />
                        Holidays
                        {holidays.length > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-sky-500/20 rounded-full text-sky-300 font-black">{holidays.length}</span>}
                    </button>
                    <button onClick={handleSave} disabled={saving || !selectedClass || !students.length}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all text-sm group">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover:scale-110 transition-transform" />}
                        {saving ? 'Saving...' : 'Save Attendance'}
                    </button>
                </div>
            </div>

            {/* ─── Holiday Panel ──────────────────────────────────────────────── */}
            <AnimatePresence>
                {showHolidayPanel && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="bg-slate-900 border border-sky-500/20 rounded-2xl overflow-hidden shadow-xl shadow-sky-500/5">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-sky-500/5">
                            <div className="flex items-center gap-2.5">
                                <Palmtree size={16} className="text-sky-400" />
                                <span className="text-sm font-black text-white">School Holidays {new Date().getFullYear()}</span>
                                <span className="text-[10px] text-slate-500 font-bold">{holidays.length} defined</span>
                            </div>
                            <button onClick={() => { setEditHoliday(null); setModalOpen(true); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all">
                                <Plus size={13} /> Add Holiday
                            </button>
                        </div>
                        {holidayLoading ? (
                            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-sky-400" /></div>
                        ) : holidays.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-slate-600">
                                <PartyPopper size={28} className="mb-2" />
                                <p className="text-sm font-bold">No holidays defined yet</p>
                                <p className="text-xs mt-1">Click "Add Holiday" to mark a school-wide holiday.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800/60">
                                {holidays.map(h => {
                                    const isToday = h.date === date;
                                    return (
                                        <div key={h.id} className={`flex items-center justify-between px-5 py-3.5 gap-4 ${isToday ? 'bg-sky-500/5' : 'hover:bg-slate-800/30'} transition-colors`}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isToday ? 'bg-sky-500 text-white' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'}`}>
                                                    <SunMedium size={15} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">
                                                        {h.title}
                                                        {isToday && <span className="ml-2 text-[9px] bg-sky-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase">Today</span>}
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-mono">{h.date}{h.description && ` · ${h.description}`}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {isToday && (
                                                    <button onClick={() => markAllHoliday(h.title)}
                                                        className="text-[10px] font-bold text-sky-400 hover:text-sky-300 border border-sky-500/30 px-2 py-1 rounded-lg transition-colors whitespace-nowrap">
                                                        Mark All H
                                                    </button>
                                                )}
                                                <button onClick={() => { setEditHoliday(h); setModalOpen(true); }}
                                                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-700 transition-colors">
                                                    <Edit3 size={13} />
                                                </button>
                                                <button onClick={() => handleDeleteHoliday(h.id)}
                                                    className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Active Holiday Banner ────────────────────────────────────── */}
            <AnimatePresence>
                {activeHoliday && (
                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                        className="flex items-center gap-4 p-4 bg-sky-500/10 border border-sky-500/30 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 shrink-0">
                            <Palmtree size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sky-300 font-black text-sm">{activeHoliday.title} — School Holiday</p>
                            {activeHoliday.description && <p className="text-sky-400/70 text-xs mt-0.5">{activeHoliday.description}</p>}
                        </div>
                        <button onClick={() => markAllHoliday(activeHoliday.title)}
                            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all whitespace-nowrap">
                            <SunMedium size={14} /> Mark All as Holiday
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Filters ────────────────────────────────────────────────────── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Class */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Class</label>
                        <div className="relative">
                            <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-4 pr-10 text-white text-sm outline-none focus:border-blue-500 transition-all appearance-none">
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
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-4 pr-10 text-white text-sm outline-none focus:border-blue-500 transition-all appearance-none disabled:opacity-40">
                                <option value="">All Sections</option>
                                {classObj?.sections?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                    {/* Date */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Date (AD)</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-blue-500 transition-all" />
                    </div>
                    {/* Search */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Search</label>
                        <div className="relative">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input type="text" placeholder="Name or Adm No..." value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none focus:border-blue-500 transition-all placeholder:text-slate-600" />
                        </div>
                    </div>
                </div>

                {/* ── Big stat bar ── */}
                {total > 0 && (
                    <div className="flex flex-wrap gap-3 pt-1">
                        {/* Total */}
                        <div className="flex-1 min-w-[120px] rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total</p>
                                    <p className="text-3xl font-black text-white mt-0.5">{total}</p>
                                </div>
                                <div className="text-slate-600"><Users size={28} /></div>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-700">
                                <div className="h-full rounded-full bg-slate-500 w-full" />
                            </div>
                            <p className="text-[10px] font-bold text-slate-600 mt-1">100% enrolled</p>
                        </div>
                        <BigStat label="Present"  count={counts.P} total={total} icon={CheckCircle2} colorClass="border-emerald-500/20 bg-emerald-500/5 text-emerald-400"  barColor="bg-emerald-400" />
                        <BigStat label="Absent"   count={counts.A} total={total} icon={XCircle}      colorClass="border-rose-500/20 bg-rose-500/5 text-rose-400"           barColor="bg-rose-400" />
                        <BigStat label="Late"     count={counts.L} total={total} icon={Clock3}        colorClass="border-amber-500/20 bg-amber-500/5 text-amber-400"        barColor="bg-amber-400" />
                        <BigStat label="Holiday"  count={counts.H} total={total} icon={SunMedium}     colorClass="border-sky-500/20 bg-sky-500/5 text-sky-400"              barColor="bg-sky-400" />

                        {/* Absent highlight */}
                        {counts.A > 0 && (
                            <div className="flex items-center gap-3 flex-1 min-w-[200px] rounded-2xl border-2 border-rose-500/40 bg-rose-500/5 p-4">
                                <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                                    <TrendingDown size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-400/70">Absent Alert</p>
                                    <p className="text-2xl font-black text-rose-400">{counts.A} <span className="text-sm font-bold text-rose-400/70">/ {total}</span></p>
                                    <p className="text-[10px] text-rose-400/60 font-bold">{Math.round((counts.A / total) * 100)}% absent today</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-end ml-auto">
                            <button onClick={loadData} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs font-bold transition-colors pb-1">
                                <RefreshCw size={13} /> Refresh
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Table ──────────────────────────────────────────────────────── */}
            {!selectedClass ? (
                <div className="h-64 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center bg-slate-900/40">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 mb-3"><CalendarDays size={30} /></div>
                    <h3 className="text-white font-bold text-lg">No Class Selected</h3>
                    <p className="text-slate-500 text-sm mt-1 text-center px-8">Choose a class and date above to start marking attendance.</p>
                </div>
            ) : loading ? (
                <div className="h-48 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Loading students...</p>
                </div>
            ) : students.length === 0 ? (
                <div className="border border-slate-800 rounded-2xl p-12 flex flex-col items-center text-center">
                    <AlertCircle size={32} className="text-slate-700 mb-3" />
                    <h3 className="text-white font-bold">No Students Found</h3>
                    <p className="text-slate-500 text-sm mt-1">No students enrolled in {selectedClass}{selectedSection ? ` - ${selectedSection}` : ''}.</p>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-800/40 border-b border-slate-800">
                                    <th className="pl-6 pr-3 py-4 w-10">
                                        <div onClick={toggleAll} className="cursor-pointer text-slate-500 hover:text-blue-400 transition-colors">
                                            {allSelected ? <CheckSquare size={17} /> : <Square size={17} />}
                                        </div>
                                    </th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-36">Roll / Adm</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[180px]">Student</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[340px]">Status</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[150px]">Remark</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filtered.map((student, i) => {
                                    const rec = attendance[student.id] || { status: 'P', remark: '' };
                                    const isSelected = selectedIds.has(student.id);
                                    const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`.toUpperCase();
                                    const avatarColor = rec.status === 'P' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : rec.status === 'A' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        : rec.status === 'L' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        : 'bg-sky-500/10 text-sky-400 border-sky-500/20';

                                    return (
                                        <motion.tr key={student.id}
                                            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: Math.min(i * 0.015, 0.25) }}
                                            className={`transition-colors group ${isSelected ? 'bg-blue-500/5' : 'hover:bg-slate-800/30'} ${rec.status === 'A' ? 'border-l-2 border-rose-500/50' : ''}`}>

                                            <td className="pl-6 pr-3 py-3.5">
                                                <div onClick={() => toggleSelect(student.id)}
                                                    className={`cursor-pointer transition-colors ${isSelected ? 'text-blue-400' : 'text-slate-700 hover:text-slate-500'}`}>
                                                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3.5">
                                                <code className="text-[11px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-lg text-slate-400 font-mono block">
                                                    {student.admission_number}
                                                </code>
                                                {student.roll_number && <span className="text-[10px] text-slate-600 font-bold pl-1">Roll {student.roll_number}</span>}
                                            </td>

                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border shrink-0 transition-all ${avatarColor}`}>
                                                        {initials || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white leading-none">{student.first_name} {student.last_name}</p>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">{student.section || student.class_name}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {STATUSES.map(s => (
                                                        <StatusBtn key={s.code} code={s.code} active={rec.status === s.code} onClick={() => setStatus(student.id, s.code)} />
                                                    ))}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3.5">
                                                <input type="text" value={rec.remark} onChange={e => setRemark(student.id, e.target.value)} placeholder="Optional..."
                                                    className="w-full bg-slate-800/50 border border-transparent hover:border-slate-700 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder:text-slate-700 outline-none transition-all" />
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-3 bg-slate-800/20 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-600 font-bold">
                        <div className="flex items-center gap-2">
                            <Users size={12} className="text-slate-700" />
                            {total} students · {filtered.length} shown
                            {selectedIds.size > 0 && <span className="text-blue-400 ml-2">{selectedIds.size} selected</span>}
                        </div>
                        <span className="text-slate-700 italic font-medium">Unsaved changes — click Save Attendance to persist.</span>
                    </div>
                </motion.div>
            )}

            {/* ─── Floating Bulk Bar ─────────────────────────────────────────── */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-2xl">
                        <div className="bg-slate-900/95 backdrop-blur-md border border-blue-500/30 rounded-2xl p-4 shadow-2xl shadow-blue-500/20 flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                                    <Zap size={18} fill="currentColor" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-sm">{selectedIds.size} Selected</p>
                                    <button onClick={() => setSelectedIds(new Set())}
                                        className="text-slate-500 text-[10px] hover:text-rose-400 flex items-center gap-0.5 font-bold uppercase transition-colors">
                                        <X size={9} /> Clear
                                    </button>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-slate-800 shrink-0" />
                            <div className="flex items-center gap-2 flex-1 flex-wrap">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Mark all as:</span>
                                {STATUSES.map(s => (
                                    <button key={s.code} onClick={() => bulkSetStatus(s.code)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wide transition-all ${s.ring}`}>
                                        <s.icon size={13} />{s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Holiday Modal ─────────────────────────────────────────────── */}
            <AnimatePresence>
                {modalOpen && <HolidayModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={loadHolidays} editItem={editHoliday} />}
            </AnimatePresence>
        </div>
    );
};

export default BulkAttendancePage;
