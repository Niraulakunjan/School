import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, Save, Loader2, TableProperties, 
    Calendar, Clock, BookOpen, Filter, CheckCircle2, AlertCircle,
    GraduationCap, Zap
} from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const ExamRoutinePage = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    // Data State
    const [exam, setExam] = useState(null);
    const [classes, setClasses] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // UI State
    const [selectedClass, setSelectedClass] = useState('All');
    const [defaultMonth, setDefaultMonth] = useState('01');
    const [defaultStartTime, setDefaultStartTime] = useState('10:00');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [eRes, cRes, rRes, asRes] = await Promise.all([
                axios.get(`/exams/${examId}/`),
                axios.get('/classes/'),
                axios.get(`/exam-routines/?exam=${examId}`),
                axios.get('/class-subjects/')
            ]);

            setExam(eRes.data);
            setClasses(cRes.data || []);
            
            const routines = rRes.data || [];
            const assignments = asRes.data || [];

            // Merge assignments with existing routines
            const masterRows = assignments.map(as => {
                const existing = routines.find(r => 
                    String(r.subject) === String(as.subject) && 
                    String(r.class_obj) === String(as.class_obj)
                );
                return {
                    id: existing?.id || null,
                    exam: examId,
                    class_obj: as.class_obj,
                    class_name: as.class_name,
                    subject: as.subject,
                    subject_name: as.subject_name,
                    exam_date: existing?.exam_date || '',
                    start_time: existing?.start_time || '',
                    end_time: existing?.end_time || '',
                    full_marks: existing?.full_marks || as.full_marks || 100,
                    pass_marks: existing?.pass_marks || as.pass_marks || 35,
                    venue: existing?.venue || ''
                };
            });

            // Sort by class name
            masterRows.sort((a, b) => (a.class_name || '').localeCompare(b.class_name || ''));
            setRows(masterRows);
        } catch (err) {
            console.error('Fetch Error:', err);
            toast('Failed to load routine data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (examId) fetchData();
    }, [examId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Only save rows that have at least a date or time or existing ID
            // Map over rows to ensure no NULL values for start_time (fallback to default)
            const toSave = rows
                .filter(r => r.exam_date || r.start_time || r.id)
                .map(r => ({
                    ...r,
                    exam_date: r.exam_date || "", // CharField
                    start_time: r.start_time || defaultStartTime // TimeField (MUST be a time)
                }));
            
            const res = await axios.post('/exam-routines/bulk-save/', toSave);
            
            const { saved, errors, message } = res.data;
            if (errors && errors.length > 0) {
                const firstErr = errors[0];
                const errMsg = firstErr.subject ? `[${firstErr.subject}] ${firstErr.detail}` : firstErr.detail;
                toast(errMsg || `Saved ${saved} routines with ${errors.length} errors`, 'warning');
                console.warn('Sync Errors:', errors);
            } else {
                toast(message || 'All routines synced successfully!', 'success');
            }
            fetchData(); // Refresh to get IDs
        } catch (err) {
            toast('Failed to save routines. Please check your connection.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const updateRow = (idx, field, val) => {
        const newRows = [...rows];
        newRows[idx] = { ...newRows[idx], [field]: val };
        setRows(newRows);
    };

    // Filtering & Sorting
    const filteredRows = useMemo(() => {
        let result = [];
        if (selectedClass === 'All') {
            result = [...rows];
        } else {
            result = rows.filter(r => String(r.class_obj) === String(selectedClass));
        }

        // Auto-sort by date (Ascending)
        return result.sort((a, b) => {
            if (!a.exam_date) return 1;
            if (!b.exam_date) return -1;
            return a.exam_date.localeCompare(b.exam_date);
        });
    }, [rows, selectedClass]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[70vh]">
            <Loader2 size={48} className="animate-spin text-indigo-500 mb-4" />
            <p className="text-slate-500 font-black animate-pulse tracking-widest uppercase text-xs">Loading Master Routine...</p>
        </div>
    );

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/dashboard/exams/setup')}
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all shadow-lg border border-slate-700/50"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-white tracking-tight">
                                {exam?.name} <span className="text-indigo-500 underline underline-offset-8 decoration-4">Routine</span>
                            </h1>
                            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black rounded-full uppercase tracking-widest">
                                Master Sheet
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm mt-1 font-medium italic italic">Excel-style scheduler for all classes and subjects.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-2xl mr-2">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-indigo-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">BS Month</span>
                            <select 
                                value={defaultMonth} 
                                onChange={(e) => setDefaultMonth(e.target.value)}
                                className="bg-transparent text-xs font-black text-white outline-none cursor-pointer hover:text-indigo-400 transition-colors"
                            >
                                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                                    <option key={m} value={m} className="bg-slate-900">{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-[1px] h-4 bg-slate-700"></div>
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-indigo-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Default Time</span>
                            <input 
                                type="time"
                                value={defaultStartTime}
                                onChange={(e) => setDefaultStartTime(e.target.value)}
                                className="bg-transparent text-xs font-black text-white outline-none cursor-pointer hover:text-indigo-400 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => {
                                const newRows = [...rows];
                                filteredRows.forEach(r => {
                                    if (!r.exam_date) {
                                        const idx = rows.findIndex(row => row.class_obj === r.class_obj && row.subject === r.subject);
                                        newRows[idx] = { ...newRows[idx], exam_date: `${defaultMonth}:` };
                                    }
                                });
                                setRows(newRows);
                                toast(`Applied ${defaultMonth}: to all empty dates`, 'info');
                            }}
                            className="p-2 py-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-all group relative"
                            title="Fill empty dates with default month"
                        >
                            <Calendar size={16} />
                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-slate-700 text-[10px] font-bold text-white rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50">Auto-fill Month</span>
                        </button>
                        <button 
                            onClick={() => {
                                const newRows = [...rows];
                                filteredRows.forEach(r => {
                                    if (!r.start_time) {
                                        const idx = rows.findIndex(row => row.class_obj === r.class_obj && row.subject === r.subject);
                                        newRows[idx] = { ...newRows[idx], start_time: defaultStartTime };
                                    }
                                });
                                setRows(newRows);
                                toast(`Applied ${defaultStartTime} to all subjects`, 'info');
                            }}
                            className="p-2 py-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-all group relative"
                            title="Apply default time to all subjects"
                        >
                            <Clock size={16} />
                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-slate-700 text-[10px] font-bold text-white rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50">Apply Time to All</span>
                        </button>

                        <button 
                            onClick={() => {
                                if (filteredRows.length < 2) return;
                                const masterRow = filteredRows[0];
                                if (!masterRow.exam_date) {
                                    toast('Please fill at least the first row to sync.', 'warning');
                                    return;
                                }
                                const newRows = [...rows];
                                filteredRows.forEach(r => {
                                    const idx = rows.findIndex(row => row.class_obj === r.class_obj && row.subject === r.subject);
                                    newRows[idx] = { 
                                        ...newRows[idx], 
                                        exam_date: masterRow.exam_date,
                                        start_time: masterRow.start_time || defaultStartTime
                                    };
                                });
                                setRows(newRows);
                                toast(`Synced all subjects to ${masterRow.exam_date}`, 'success');
                            }}
                            className="p-2 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-all group relative"
                            title="Flash sync: Copy first row to all others in view"
                        >
                            <Zap size={16} />
                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-slate-700 text-[10px] font-bold text-white rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50">Flash Sync Class</span>
                        </button>
                    </div>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-xl text-sm font-black transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {saving ? 'Syncing...' : 'Save All Over School'}
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center gap-2 overflow-x-auto no-scrollbar shadow-xl">
                <button 
                    onClick={() => setSelectedClass('All')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap uppercase tracking-widest ${selectedClass === 'All' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    All School
                </button>
                <div className="w-[1px] h-6 bg-slate-800 mx-1"></div>
                {classes.map(cls => (
                    <button 
                        key={cls.id}
                        onClick={() => setSelectedClass(cls.id)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap uppercase tracking-widest ${String(selectedClass) === String(cls.id) ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
                    >
                        {cls.name}
                    </button>
                ))}
            </div>

            {/* Spreadsheet Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
                <div className="px-8 py-5 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between">
                    <p className="text-xs font-black text-white uppercase tracking-[0.2em] inline-flex items-center gap-3">
                        <TableProperties size={14} className="text-indigo-500" /> 
                        Viewing: {selectedClass === 'All' ? 'Whole School' : classes.find(c => String(c.id) === String(selectedClass))?.name} 
                        <span className="text-slate-600 ml-2 italic">({filteredRows.length} subjects)</span>
                    </p>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Calendar size={10} /> Date</span>
                        <span className="flex items-center gap-1.5"><Clock size={10} /> Time</span>
                        <span className="flex items-center gap-1.5"><BookOpen size={10} /> Marks</span>
                    </div>
                </div>

                <div className="overflow-auto flex-1 max-h-[calc(100vh-450px)]">
                    <table className="w-full border-collapse">
                        <thead className="bg-slate-950 sticky top-0 z-20">
                            <tr className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                                <th className="px-8 py-4 text-center border-r border-slate-800 w-48">Exam Date (MM:DD)</th>
                                <th className="px-8 py-4 text-left border-r border-slate-800">Subject</th>
                                <th className="px-8 py-4 text-left border-r border-slate-800 w-48">Class</th>
                                <th className="px-8 py-4 text-center border-r border-slate-800 w-36">Time</th>
                                <th className="px-8 py-4 text-center border-r border-slate-800 w-24">Full M.</th>
                                <th className="px-8 py-4 text-center border-r border-slate-800 w-24">Pass M.</th>
                                <th className="px-8 py-4 text-left">Room / Venue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-32 text-center text-slate-600 italic">
                                        <div className="flex flex-col items-center gap-3">
                                            <AlertCircle size={40} className="text-slate-800" />
                                            <p className="text-sm font-bold uppercase tracking-widest">No subjects assigned for this selection.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRows.map((row) => {
                                const globalIdx = rows.findIndex(r => r.class_obj === row.class_obj && r.subject === row.subject);
                                
                                const handleDateUpdate = (val) => {
                                    // Smart Entry: If user types just "15", it becomes "DEFAULT_MONTH:15"
                                    let finalVal = val;
                                    if (val.length > 0 && val.length <= 2 && !val.includes(':')) {
                                        finalVal = `${defaultMonth}:${val.padStart(2, '0')}`;
                                    }
                                    updateRow(globalIdx, 'exam_date', finalVal);
                                };

                                return (
                                    <tr key={`${row.class_obj}-${row.subject}`} className="hover:bg-slate-800/20 group transition-all">
                                        <td className="px-4 py-2 border-r border-slate-800 bg-slate-900/10">
                                            <input 
                                                value={row.exam_date}
                                                placeholder="MM:DD"
                                                onFocus={(e) => {
                                                    if (!e.target.value) updateRow(globalIdx, 'exam_date', `${defaultMonth}:`);
                                                }}
                                                onBlur={(e) => handleDateUpdate(e.target.value)}
                                                onChange={(e) => updateRow(globalIdx, 'exam_date', e.target.value)}
                                                className="w-full bg-slate-800/50 border border-transparent focus:border-indigo-500/50 rounded-lg p-1.5 text-center text-xs font-black text-slate-300 outline-none focus:text-white transition-all shadow-inner"
                                            />
                                        </td>
                                        <td className="px-8 py-4 border-r border-slate-800">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                                                    {row.subject_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 border-r border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <GraduationCap size={16} className="text-indigo-600/50" />
                                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                                    {row.class_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 border-r border-slate-800">
                                            <input 
                                                type="time" 
                                                value={row.start_time || defaultStartTime}
                                                onChange={(e) => updateRow(globalIdx, 'start_time', e.target.value)}
                                                className="w-full bg-slate-800/50 border border-transparent focus:border-indigo-500/50 rounded-lg p-1.5 text-center text-xs font-black text-slate-300 outline-none focus:text-white transition-all"
                                            />
                                        </td>
                                        <td className="px-2 py-2 border-r border-slate-800">
                                            <input 
                                                type="number" 
                                                value={row.full_marks}
                                                onChange={(e) => updateRow(globalIdx, 'full_marks', e.target.value)}
                                                className="w-full bg-transparent text-center text-xs font-black text-slate-400 outline-none focus:text-white"
                                            />
                                        </td>
                                        <td className="px-2 py-2 border-r border-slate-800">
                                            <input 
                                                type="number" 
                                                value={row.pass_marks}
                                                onChange={(e) => updateRow(globalIdx, 'pass_marks', e.target.value)}
                                                className="w-full bg-transparent text-center text-xs font-black text-slate-400 outline-none focus:text-white"
                                            />
                                        </td>
                                        <td className="px-8 py-2">
                                            <input 
                                                placeholder="e.g. Hall A"
                                                value={row.venue}
                                                onChange={(e) => updateRow(globalIdx, 'venue', e.target.value)}
                                                className="w-full bg-transparent text-left text-xs font-medium text-slate-500 outline-none focus:text-slate-300 italic"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="px-8 py-4 border-t border-slate-800 bg-slate-950/30 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Database Synced</p>
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">
                        Powered by Antigravity Master Sheet
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ExamRoutinePage;
