import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Edit2, Trash2, ChevronDown, ChevronRight, X, Save, Loader2,
    Calendar, Clock, BookOpen, GraduationCap, AlertCircle, CheckCircle2,
    TableProperties, Search, Zap, LayoutGrid, CalendarDays, ClipboardCheck,
    ArrowRight, Settings, Sliders, Layers, MapPin, Info, Filter
} from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import NepaliDatePicker from '../../components/NepaliDatePicker';

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm";
const selectCls = inputCls + " appearance-none cursor-pointer";

// --- Shared Diamond Components ---

const Field = ({ label, children, required, description }) => (
    <div className="space-y-2">
        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
            {label}{required && <span className="text-rose-500">*</span>}
            {description && (
                 <div className="group relative">
                    <Info size={12} className="text-slate-700 cursor-help hover:text-indigo-400 transition-colors" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-56 p-3 bg-slate-900 border border-white/10 text-[10px] text-slate-400 font-medium rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[1100] shadow-2xl scale-95 group-hover:scale-100 origin-bottom">
                        {description}
                    </div>
                 </div>
            )}
        </label>
        {children}
    </div>
);

const ModalHeader = ({ title, subtitle, onClose }) => (
    <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
                {subtitle && <p className="text-xs text-slate-400 font-medium">{subtitle}</p>}
            </div>
            <button 
                onClick={onClose} 
                className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
            >
                <X size={16} />
            </button>
        </div>
    </div>
);

// --- Modals (Diamond Redesign) ---

const ExamModal = ({ isOpen, onClose, onSaved, initial, financialYears, classes }) => {
    const toast = useToast();
    const [form, setForm] = useState({ name: '', term: 'first', financial_year: '', start_date: '', end_date: '', remarks: '' });
    const [quick, setQuick] = useState(!initial); 
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initial) {
            setForm({ name: initial.name, term: initial.term, financial_year: initial.financial_year, start_date: initial.start_date, remarks: initial.remarks || '' });
            setQuick(false);
        } else {
            setForm({ name: '', term: 'first', financial_year: financialYears[0]?.id || '', start_date: '', remarks: '' });
            setQuick(true);
            setSelectedClasses([]);
        }
    }, [initial, isOpen, financialYears]);

    const submit = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            let finalForm = { ...form };
            if (quick) {
                finalForm = { ...form, remarks: `Bulk created for ${selectedClasses.length} instances.` };
            }

            const res = await axios.post('/exams/', finalForm);
            const newExam = res.data;

            if (quick && selectedClasses.length > 0) {
                let allRoutines = [];
                for (const classId of selectedClasses) {
                    const cRes = await axios.get(`/classes/${classId}/`);
                    const subjects = cRes.data.subjects || [];
                    const routines = subjects.map(cs => ({
                        exam: newExam.id, subject: cs.subject, class_obj: classId,
                        exam_date: form.start_date, start_time: '10:00',
                        full_marks: cs.full_marks, pass_marks: cs.pass_marks
                    }));
                    allRoutines = [...allRoutines, ...routines];
                }
                if (allRoutines.length > 0) await axios.post('/exam-routines/bulk-save/', allRoutines);
            }

            toast(quick ? `Enterprise Cluster Scheduled!` : 'Exam Protocol Initialized.');
            onSaved(); onClose();
        } catch { toast('Critical system failure during save', 'error'); } finally { setSaving(false); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-800"
                    >
                        <ModalHeader 
                            title={initial ? 'Edit Examination' : 'Create New Exam'} 
                            subtitle={quick ? "Bulk Scheduling Mode" : "Manual Configuration"} 
                            onClose={onClose} 
                        />
                        
                        <form onSubmit={submit} className="p-8 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-center">
                                <div className="bg-slate-800/50 p-1 rounded-xl flex border border-slate-700">
                                    <button type="button" onClick={() => setQuick(true)} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${quick ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-300'}`}>Quick Mode</button>
                                    <button type="button" onClick={() => setQuick(false)} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${!quick ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-300'}`}>Detailed</button>
                                </div>
                            </div>

                            <Field label="Exam Name" required description="Enter a descriptive name for this examination cycle.">
                                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="e.g. First Terminal Examination 2081" />
                            </Field>

                            <div className="grid grid-cols-2 gap-6">
                                <Field label="Exam Date (BS)" required>
                                    <NepaliDatePicker value={form.start_date} onChange={date => setForm(p => ({ ...p, start_date: date }))} />
                                </Field>
                                <Field label="Financial Year" required>
                                    <div className="relative">
                                        <Layers size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                                        <select required value={form.financial_year} onChange={e => setForm(p => ({ ...p, financial_year: e.target.value }))} className={selectCls + " pl-10"}>
                                            <option value="">Select Year</option>
                                            {financialYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                                        </select>
                                    </div>
                                </Field>
                            </div>

                            {quick && (
                                <div className="space-y-4 pt-4 border-t border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Class Participation</p>
                                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{selectedClasses.length} Selected</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {classes.map(c => (
                                            <label key={c.id} className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${selectedClasses.includes(c.id) ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}>
                                                <input type="checkbox" checked={selectedClasses.includes(c.id)} onChange={() => setSelectedClasses(p => p.includes(c.id) ? p.filter(id => id !== c.id) : [...p, c.id])} className="hidden" />
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-sm font-bold ${selectedClasses.includes(c.id) ? 'text-indigo-400' : 'text-slate-300'}`}>{c.name}</span>
                                                    <span className="text-[10px] text-slate-500 uppercase font-medium">{c.faculty || 'General'}</span>
                                                </div>
                                                {selectedClasses.includes(c.id) && (
                                                    <div className="absolute top-2 right-2">
                                                        <CheckCircle2 size={12} className="text-indigo-400" />
                                                    </div>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!quick && (
                                <Field label="Remarks / Instructions">
                                    <textarea rows={3} value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} className={inputCls + " resize-none"} placeholder="Add any specific instructions for this exam..." />
                                </Field>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-sm font-bold transition-all">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50">
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                                    {initial ? 'Save Changes' : (quick ? 'Create Bulk Exams' : 'Create Exam')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const RoutineModal = ({ isOpen, onClose, onSaved, examId, subjects, classes, initial }) => {
    const toast = useToast();
    const [form, setForm] = useState({ 
        exam: examId, subject: '', class_obj: '', exam_date: '', start_time: '10:00', 
        full_marks: '', pass_marks: '', venue: '', remarks: '',
        has_practical: false, theory_full_marks: '', theory_pass_marks: '', practical_full_marks: '', practical_pass_marks: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initial) {
            setForm({
                ...initial,
                exam: examId,
                start_time: initial.start_time?.slice(0, 5) || '10:00'
            });
        } else {
            setForm({ 
                exam: examId, subject: '', class_obj: '', exam_date: '', start_time: '10:00', 
                full_marks: '', pass_marks: '', venue: '', remarks: '',
                has_practical: false, theory_full_marks: '', theory_pass_marks: '', practical_full_marks: '', practical_pass_marks: ''
            });
        }
    }, [initial, isOpen, examId]);

    const selectedClass = classes.find(c => String(c.id) === String(form.class_obj));
    const filteredSubjects = subjects.filter(s => !s.faculty || s.faculty === selectedClass?.faculty);

    const submit = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            if (initial) await axios.patch(`/exam-routines/${initial.id}/`, form);
            else await axios.post('/exam-routines/', form);
            toast('Routine Protocol Updated.'); onSaved(); onClose();
        } catch { toast('Matrix synchronization failed.', 'error'); } finally { setSaving(false); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.95, opacity: 0, x: 20 }} animate={{ scale: 1, opacity: 1, x: 0 }} exit={{ scale: 0.95, opacity: 0, x: 20 }}
                        className="relative bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-800"
                    >
                        <ModalHeader title={initial ? "Edit Schedule" : "Add Exam Schedule"} subtitle="Configure date, time and marks for this subject." onClose={onClose} />
                        
                        <form onSubmit={submit} className="p-8 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <Field label="Class" required>
                                    <div className="relative">
                                        <GraduationCap size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                                        <select required value={form.class_obj} onChange={e => setForm(p => ({ ...p, class_obj: e.target.value }))} className={selectCls + " pl-10"}>
                                            <option value="">Select Class</option>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.faculty ? `(${c.faculty})` : ''}</option>)}
                                        </select>
                                    </div>
                                </Field>
                                <Field label="Subject" required>
                                    <div className="relative">
                                        <BookOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                                        <select required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className={selectCls + " pl-10"}>
                                            <option value="">Select Subject</option>
                                            {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </Field>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <Field label="Exam Date (BS)" required>
                                    <NepaliDatePicker value={form.exam_date} onChange={date => setForm(p => ({ ...p, exam_date: date }))} />
                                </Field>
                                <Field label="Start Time" required>
                                    <div className="relative">
                                        <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
                                        <input required type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} className={inputCls + " pl-10"} />
                                    </div>
                                </Field>
                            </div>

                            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marks Configuration</p>
                                    <label className="flex items-center gap-3 cursor-pointer group/switch">
                                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-300">Theory/Practical Split</span>
                                         <div className={`w-10 h-5 rounded-full relative transition-all duration-300 ${form.has_practical ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                            <input type="checkbox" checked={form.has_practical} onChange={e => setForm(p => ({ ...p, has_practical: e.target.checked }))} className="hidden" />
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${form.has_practical ? 'left-6' : 'left-1'}`} />
                                         </div>
                                    </label>
                                </div>

                                {form.has_practical ? (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-6">
                                        <Field label="Theory (FM/PM)">
                                            <div className="flex gap-2">
                                                <input type="number" required value={form.theory_full_marks} onChange={e => setForm(p => ({ ...p, theory_full_marks: e.target.value }))} className={inputCls + " text-center"} placeholder="FM" />
                                                <input type="number" required value={form.theory_pass_marks} onChange={e => setForm(p => ({ ...p, theory_pass_marks: e.target.value }))} className={inputCls + " text-center"} placeholder="PM" />
                                            </div>
                                        </Field>
                                        <Field label="Practical (FM/PM)">
                                            <div className="flex gap-2">
                                                <input type="number" required value={form.practical_full_marks} onChange={e => setForm(p => ({ ...p, practical_full_marks: e.target.value }))} className={inputCls + " text-center"} placeholder="FM" />
                                                <input type="number" required value={form.practical_pass_marks} onChange={e => setForm(p => ({ ...p, practical_pass_marks: e.target.value }))} className={inputCls + " text-center"} placeholder="PM" />
                                            </div>
                                        </Field>
                                    </motion.div>
                                ) : (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-6">
                                        <Field label="Full Marks">
                                            <input type="number" value={form.full_marks} onChange={e => setForm(p => ({ ...p, full_marks: e.target.value }))} className={inputCls} placeholder="e.g. 100" />
                                        </Field>
                                        <Field label="Pass Marks">
                                            <input type="number" value={form.pass_marks} onChange={e => setForm(p => ({ ...p, pass_marks: e.target.value }))} className={inputCls} placeholder="e.g. 35" />
                                        </Field>
                                    </motion.div>
                                )}
                            </div>

                            <Field label="Exam Room (Venue)">
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} className={inputCls + " pl-10"} placeholder="e.g. Science Lab, Room 102" />
                                </div>
                            </Field>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-sm font-bold transition-all">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50">
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <ClipboardCheck size={18} />} Save Schedule
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// --- Statistics Registry ---

const CompletenessGauge = ({ percentage }) => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 -rotate-90">
                <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-800" />
                <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(79,70,229,0.3)]" />
            </svg>
            <span className="absolute text-[9px] font-black text-slate-400">{Math.round(percentage)}%</span>
        </div>
    );
};

const StatBox = ({ label, value, icon: Icon, color }) => (
    <div className="group relative bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-5 hover:border-slate-700 transition-all overflow-hidden shadow-lg">
        <div className={`w-12 h-12 bg-${color}-500/10 flex items-center justify-center text-${color}-400 rounded-xl group-hover:scale-110 transition-transform duration-500 border border-${color}-500/20`}>
            <Icon size={24} strokeWidth={1.5} />
        </div>
        <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-2xl font-black text-white leading-none">{value}</p>
        </div>
    </div>
);

export default function ExamSetupPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [exams, setExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classes, setClasses] = useState([]);
    const [financialYears, setFinancialYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedExam, setExpandedExam] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('');

    const [examModal, setExamModal] = useState({ open: false, initial: null });
    const [routineModal, setRoutineModal] = useState({ open: false, initial: null, examId: null });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [eRes, sRes, yRes, cRes] = await Promise.all([
                axios.get('/exams/'), axios.get('/subjects/'),
                axios.get('/financial-years/'), axios.get('/classes/'),
            ]);
            setExams(eRes.data); setSubjects(sRes.data);
            setFinancialYears(yRes.data); setClasses(cRes.data);
        } catch { toast('Critical load failure', 'error'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = exams.filter(e => {
        const sm = e.name.toLowerCase().includes(searchTerm.toLowerCase());
        const ym = !selectedYear || String(e.financial_year) === String(selectedYear);
        const tm = !selectedTerm || e.term === selectedTerm;
        return sm && ym && tm;
    });

    const TERMS = [
        { value: 'first', label: 'First' }, { value: 'mid', label: 'Mid' }, { value: 'final', label: 'Annual' }
    ];
    const getExamCompleteness = (exam) => {
        if (!exam.routines?.length) return 0;
        // Find unique classes in this exam's routines
        const classIds = [...new Set(exam.routines.map(r => r.class_obj))];
        let totalExpectedSubjects = 0;
        classIds.forEach(id => {
            const cls = classes.find(c => String(c.id) === String(id));
            if (cls && cls.subjects) totalExpectedSubjects += cls.subjects.length;
        });
        if (totalExpectedSubjects === 0) return 0;
        return (exam.routines.length / totalExpectedSubjects) * 100;
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 pb-32 pt-6 px-10 relative">
            {/* Header: Simplified for Better UX */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-white tracking-tight">
                            Exam <span className="text-indigo-500">Setup</span>
                        </h1>
                        <div className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                            Management Portal
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm mt-1.5 font-medium">Manage examination cycles, schedules, and class participation.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="hidden xl:flex items-center gap-6 px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                            <Layers size={14} className="text-indigo-400" />
                            <span className="text-xs font-bold text-white whitespace-nowrap">{exams.length} Exams</span>
                        </div>
                        <div className="w-px h-4 bg-slate-800"></div>
                        <div className="flex items-center gap-3">
                            <Zap size={14} className="text-indigo-400" />
                            <span className="text-xs font-bold text-white whitespace-nowrap">
                                Routine: {Math.round(exams.reduce((acc, e) => acc + getExamCompleteness(e), 0) / (exams.length || 1))}% Set
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                         <a href="/dashboard/subjects" className="px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all">Registry</a>
                         <button 
                            onClick={() => setExamModal({ open: true, initial: null })} 
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5"
                        >
                            <Plus size={18} /> New Exam
                         </button>
                    </div>
                </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatBox label="Active Cycles" value={exams.length} icon={Layers} color="indigo" />
                <StatBox label="Routine Health" value={`${Math.round(exams.reduce((acc, e) => acc + getExamCompleteness(e), 0) / (exams.length || 1))}%`} icon={Sliders} color="violet" />
                <StatBox label="Managed Grades" value={classes.length} icon={GraduationCap} color="emerald" />
            </section>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                {/* Search & Intelligence Bar */}
                <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[300px] relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            placeholder="Search exams..." 
                            className="w-full bg-slate-800 border border-slate-700 py-2.5 pl-11 pr-4 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500/50 transition-all" 
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                             <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                             <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className={selectCls + " pl-10 h-10 w-40 text-xs font-bold"}>
                                <option value="">Financial Year</option>
                                {financialYears.map(y => <option key={y.id} value={y.id} className="bg-slate-900">{y.name}</option>)}
                             </select>
                        </div>
                        <div className="relative">
                             <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                             <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className={selectCls + " pl-10 h-10 w-36 text-xs font-bold"}>
                                <option value="">All Terms</option>
                                {TERMS.map(t => <option key={t.value} value={t.value} className="bg-slate-900">{t.label}</option>)}
                             </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[500px]">
                    {loading ? (
                         <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <Loader2 size={40} className="text-indigo-500 animate-spin" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading examination data...</p>
                         </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-24 text-center bg-slate-900/10">
                            <CalendarDays className="text-slate-800 mx-auto mb-6" size={64} strokeWidth={1.5} />
                            <h3 className="text-xl font-bold text-white mb-1">No Examinations Found</h3>
                            <p className="text-slate-500 text-sm">Adjust your filters or create a new exam cycle.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-900/80 border-b border-slate-800">
                                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-8 py-5 w-12 text-center opacity-40">#</th>
                                    <th className="px-8 py-5">Examination Info</th>
                                    <th className="px-8 py-5 w-32">Term</th>
                                    <th className="px-8 py-5 w-32 text-center">Start Date</th>
                                    <th className="px-8 py-5 w-40 text-center">Routine Coverage</th>
                                    <th className="px-8 py-5 text-right pr-10">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {filtered.map((exam, i) => (
                                    <React.Fragment key={exam.id}>
                                    <tr key={exam.id} className={`group transition-all duration-300 ${expandedExam === exam.id ? 'bg-indigo-500/5' : 'hover:bg-slate-800/50'}`}>
                                            <td className="px-8 py-6 text-xs font-bold text-slate-600 text-center">{String(i + 1).padStart(2, '0')}</td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-1 h-6 rounded-full transition-all duration-300 ${expandedExam === exam.id ? 'bg-indigo-500 shadow-lg' : 'bg-slate-700'}`} />
                                                    <div>
                                                        <h4 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">{exam.name}</h4>
                                                        <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5 tracking-tight px-1">{exam.financial_year_name || 'Current Year'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-tighter">{exam.term_display}</span>
                                            </td>
                                            <td className="px-8 py-6 text-center text-slate-400 text-xs font-medium">{exam.start_date || 'TBD'}</td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center justify-center gap-3">
                                                    <CompletenessGauge percentage={getExamCompleteness(exam)} />
                                                    <div className="hidden lg:block text-left">
                                                        <p className="text-[10px] font-bold text-white leading-none">{exam.routines?.length || 0}</p>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">entries</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => setExpandedExam(p => p === exam.id ? null : exam.id)}
                                                        className={`p-2 rounded-xl border transition-all ${expandedExam === exam.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'}`}
                                                        title="Quick View Routine"
                                                    >
                                                        <Calendar size={16} />
                                                    </button>
                                                    <button onClick={() => navigate(`/dashboard/exams/${exam.id}/routine`)} className="px-4 py-2 rounded-xl bg-white text-slate-900 text-[10px] font-bold uppercase transition-all hover:bg-indigo-50 active:scale-95 shadow-sm">Master Sheet</button>
                                                    <button onClick={() => setRoutineModal({ open: true, initial: null, examId: exam.id })} className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all" title="Add Schedule"><Plus size={16} /></button>
                                                    <button onClick={() => setExamModal({ open: true, initial: exam })} className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all" title="Edit Exam"><Edit2 size={16} /></button>
                                                    <button onClick={() => { if(window.confirm('Wipe Protocol?')) axios.delete(`/exams/${exam.id}/`).then(load) }} className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all" title="Delete"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                        <AnimatePresence>
                                            {expandedExam === exam.id && (
                                                <tr>
                                                    <td colSpan={6} className="bg-slate-900/50 p-0 overflow-hidden border-b border-slate-800">
                                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
                                                            <div className="p-8 space-y-6">
                                                                <div className="flex items-center justify-between border-l-2 border-indigo-500 pl-4">
                                                                    <div>
                                                                        <h5 className="text-sm font-bold text-white">Examination Routine</h5>
                                                                        <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5 tracking-wider font-medium">Schedule overview for {exam.name}</p>
                                                                    </div>
                                                                    <button onClick={() => setRoutineModal({ open: true, initial: null, examId: exam.id })} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-500 hover:text-white transition-all">Add Schedule</button>
                                                                </div>

                                                                {exam.routines?.length === 0 ? (
                                                                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-center opacity-50">
                                                                        <AlertCircle size={32} className="text-slate-600" />
                                                                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">No schedules defined yet.</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                                                                        <table className="w-full text-left">
                                                                            <thead className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                                                                <tr>
                                                                                    <th className="px-6 py-3">Class</th>
                                                                                    <th className="px-6 py-3">Subject</th>
                                                                                    <th className="px-6 py-3 text-center">Date & Time</th>
                                                                                    <th className="px-6 py-3 text-center">Marks (FM/PM)</th>
                                                                                    <th className="px-6 py-3 text-right pr-8">Actions</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-800">
                                                                                {exam.routines.map(r => (
                                                                                    <tr key={r.id} className="hover:bg-slate-900/50 transition-colors group/row">
                                                                                        <td className="px-6 py-4">
                                                                                            <span className="text-sm font-bold text-white">{r.class_name}</span>
                                                                                        </td>
                                                                                        <td className="px-6 py-4 text-xs font-bold text-indigo-400">
                                                                                            {r.subject_name}
                                                                                        </td>
                                                                                        <td className="px-6 py-4 text-center">
                                                                                            <div className="inline-flex flex-col items-center px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                                                                                                <p className="text-xs font-bold text-white">{r.exam_date}</p>
                                                                                                <p className="text-[10px] font-medium text-slate-500 mt-0.5">{r.start_time?.slice(0, 5)}</p>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-6 py-4 text-center">
                                                                                            <p className="text-xs font-bold text-slate-400">{r.effective_full_marks} / {r.effective_pass_marks}</p>
                                                                                        </td>
                                                                                        <td className="px-6 py-4 text-right pr-8">
                                                                                            <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                                                                <button onClick={() => setRoutineModal({ open: true, initial: r, examId: exam.id })} className="p-1.5 rounded-lg bg-slate-800 text-slate-500 hover:text-white transition-all"><Edit2 size={12} /></button>
                                                                                                <button onClick={() => { if(window.confirm('Wipe Point?')) axios.delete(`/exam-routines/${r.id}/`).then(load) }} className="p-1.5 rounded-lg bg-slate-800 text-rose-500/50 hover:text-rose-500 transition-all"><Trash2 size={12} /></button>
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    </td>
                                                </tr>
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modals: Diamond Suite */}
            <ExamModal
                isOpen={examModal.open} onClose={() => setExamModal({ open: false, initial: null })}
                onSaved={load} initial={examModal.initial} financialYears={financialYears} classes={classes}
            />
            <RoutineModal 
                isOpen={routineModal.open} onClose={() => setRoutineModal({ open: false, initial: null, examId: null })} 
                onSaved={load} examId={routineModal.examId} subjects={subjects} classes={classes} initial={routineModal.initial} 
            />
        </div>
    );
}
