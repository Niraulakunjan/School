import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
    Plus, Trash2, Loader2, X, Save, BookOpen, Check, Edit2, 
    LayoutGrid, TableProperties, Filter, ChevronRight, Search, 
    AlertCircle, GraduationCap, Copy, ArrowRightLeft, Settings2
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all";

// ── Global Subject Edit Modal ───────────────────────────
const GlobalSubjectModal = ({ isOpen, onClose, onSaved, initial }) => {
    const toast = useToast();
    const [form, setForm] = useState({ name: '', code: '', faculty: '', full_marks: 100, pass_marks: 35, order: 0, is_elective: false, elective_group: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initial) setForm({ 
            name: initial.name, 
            code: initial.code || '', 
            faculty: initial.faculty || '', 
            full_marks: initial.full_marks || 100, 
            pass_marks: initial.pass_marks || 35,
            order: initial.order || 0,
            is_elective: initial.is_elective || false,
            elective_group: initial.elective_group || ''
        });
        else setForm({ name: '', code: '', faculty: '', full_marks: 100, pass_marks: 35, order: 0, is_elective: false, elective_group: '' });
    }, [initial, isOpen]);

    const submit = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            if (initial) await axios.patch(`/subjects/${initial.id}/`, form);
            else await axios.post('/subjects/', form);
            toast('Subject saved'); onSaved(); onClose();
        } catch { toast('Failed to save subject', 'error'); } finally { setSaving(false); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                            <p className="font-black text-white">{initial ? 'Edit Subject' : 'New Global Subject'}</p>
                            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><X size={18} /></button>
                        </div>
                        <form onSubmit={submit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Subject Name</label>
                                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="e.g. Mathematics" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Code</label>
                                    <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className={inputCls} placeholder="MATH101" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Faculty</label>
                                    <input value={form.faculty} onChange={e => setForm(p => ({ ...p, faculty: e.target.value }))} className={inputCls} placeholder="Science" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Default FM</label>
                                    <input type="number" value={form.full_marks} onChange={e => setForm(p => ({ ...p, full_marks: e.target.value }))} className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Default PM</label>
                                    <input type="number" value={form.pass_marks} onChange={e => setForm(p => ({ ...p, pass_marks: e.target.value }))} className={inputCls} />
                                </div>
                            </div>
                            <button disabled={saving} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Subject
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// ── Clone Curriculum Modal ──────────────────────────────
const CloneCurriculumModal = ({ isOpen, onClose, targetClass, classes, onCloned }) => {
    const toast = useToast();
    const [sourceId, setSourceId] = useState('');
    const [cloning, setCloning] = useState(false);

    const submit = async () => {
        if (!sourceId) return;
        setCloning(true);
        try {
            const res = await axios.post(`/classes/${targetClass.id}/clone-curriculum/`, { source_class_id: sourceId });
            toast(res.data.detail);
            onCloned();
            onClose();
        } catch { toast('Cloning failed', 'error'); } finally { setCloning(false); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6"
                    >
                        <h3 className="text-lg font-black text-white mb-2">Clone Curriculum</h3>
                        <p className="text-slate-400 text-xs mb-6">Select a class to copy its subject setup into <span className="text-indigo-400 font-bold">{targetClass?.name}</span>.</p>
                        
                        <select 
                            value={sourceId} 
                            onChange={e => setSourceId(e.target.value)} 
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 mb-6"
                        >
                            <option value="">Select Source Class...</option>
                            {classes.filter(c => c.id !== targetClass?.id).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>

                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold hover:text-white text-xs">Cancel</button>
                            <button onClick={submit} disabled={!sourceId || cloning} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2">
                                {cloning ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />} Confirm Clone
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default function SubjectManagementPage() {
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Core Data
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Sidebar State
    const [classSearch, setClassSearch] = useState('');
    const targetClassId = searchParams.get('class');
    const targetClass = useMemo(() => classes.find(c => String(c.id) === String(targetClassId)), [classes, targetClassId]);

    // UI state
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
    const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);
    const [editingGlobal, setEditingGlobal] = useState(null);
    const [isAddingToClass, setIsAddingToClass] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [cRes, sRes, aRes] = await Promise.all([
                axios.get('/classes/'),
                axios.get('/subjects/'),
                axios.get('/class-subjects/')
            ]);
            setClasses(cRes.data || []);
            setSubjects(sRes.data || []);
            setAssignments(aRes.data || []);
        } catch { toast('Sync interrupted', 'error'); } finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const classAssignments = useMemo(() => 
        assignments.filter(a => String(a.class_obj) === String(targetClassId)), 
    [assignments, targetClassId]);

    const filteredClasses = useMemo(() => 
        classes.filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase())), 
    [classes, classSearch]);

    // Assignments Logic
    const toggleSubjectAssignment = async (subId, currentAssignment) => {
        if (currentAssignment) {
            if (!window.confirm('Remove this subject from this grade\'s curriculum?')) return;
            try {
                await axios.delete(`/class-subjects/${currentAssignment.id}/`);
                setAssignments(prev => prev.filter(a => a.id !== currentAssignment.id));
                toast('Subject removed');
            } catch { toast('Failed to remove', 'error'); }
        } else {
            const sub = subjects.find(s => s.id === subId);
            try {
                const res = await axios.post('/class-subjects/', {
                    class_obj: targetClass.id,
                    subject: subId,
                    full_marks: sub.full_marks || 100,
                    pass_marks: sub.pass_marks || 35,
                    is_elective: sub.is_elective || false
                });
                setAssignments(prev => [...prev, res.data]);
                toast('Subject assigned');
                setIsAddingToClass(false);
            } catch { toast('Assignment failed', 'error'); }
        }
    };

    const updateAssignment = async (id, patch) => {
        try {
            const res = await axios.patch(`/class-subjects/${id}/`, patch);
            setAssignments(prev => prev.map(a => a.id === id ? res.data : a));
        } catch { toast('Update failed', 'error'); }
    };

    const deleteGlobalSubject = async (id, name) => {
        if (!window.confirm(`Delete "${name}" from Global Master list? Warning: This will remove it from all curriculums.`)) return;
        try {
            await axios.delete(`/subjects/${id}/`);
            toast('Subject deleted');
            fetchAll();
        } catch (err) { toast(err.response?.data?.detail || 'Delete failed', 'error'); }
    }

    if (loading && classes.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[500px]">
            <Loader2 size={32} className="animate-spin text-indigo-500 mb-2" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Registry Syncing...</p>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-120px)] -mt-2 -mx-4 overflow-hidden">
            {/* ── CLASS SIDEBAR ────────────────────────────────── */}
            <div className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <GraduationCap size={16} className="text-indigo-400" /> Class Registry
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input 
                            value={classSearch}
                            onChange={e => setClassSearch(e.target.value)}
                            placeholder="Find class..." 
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white outline-none focus:border-indigo-500/50 transition-all font-medium"
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
                    <button 
                        onClick={() => setSearchParams({})}
                        className={`w-full text-left px-5 py-3.5 rounded-2xl transition-all flex items-center justify-between group ${!targetClassId ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <span className="text-xs font-black uppercase tracking-tight">Global Subject Master</span>
                        <ChevronRight size={14} className={!targetClassId ? 'block' : 'opacity-0 group-hover:opacity-100'} />
                    </button>

                    <div className="pt-4 pb-2 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Institutional Grades</div>
                    {filteredClasses.map(cls => (
                        <button 
                            key={cls.id}
                            onClick={() => setSearchParams({ class: cls.id })}
                            className={`w-full text-left px-5 py-3.5 rounded-2xl transition-all flex items-center justify-between group ${String(targetClassId) === String(cls.id) ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <div className="flex flex-col">
                                <span className={`text-[13px] font-black tracking-tight ${String(targetClassId) === String(cls.id) ? 'text-white' : 'text-slate-300'}`}>{cls.name}</span>
                                <span className="text-[10px] font-bold opacity-60 italic">{cls.faculty || 'Core Stream'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black border rounded px-1.5 py-0.5 ${String(targetClassId) === String(cls.id) ? 'bg-white/20 border-white/30 text-white' : 'bg-slate-950 border-slate-700 text-slate-500'}`}>
                                    {cls.subjects?.length || 0}
                                </span>
                                <ChevronRight size={12} className={String(targetClassId) === String(cls.id) ? 'block' : 'opacity-0 group-hover:opacity-100'} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── MAIN CONTENT AREA ─────────────────────────────── */}
            <div className="flex-1 bg-slate-950/20 overflow-y-auto custom-scrollbar p-8">
                <AnimatePresence mode="wait">
                    {targetClass ? (
                        /* CLASS SPECIFIC CURRICULUM */
                        <motion.div key={targetClassId} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
                                <div>
                                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                                        {targetClass.name} <span className="text-sm font-bold text-indigo-400 px-3 py-1 bg-indigo-500/10 rounded-full">Academic Curriculum</span>
                                    </h1>
                                    <p className="text-slate-400 text-sm mt-1 font-medium tracking-tight">Define subjects, marks, and credit weightage for this specific grade.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsCloneModalOpen(true)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 border border-slate-700">
                                        <Copy size={16} className="text-indigo-400" /> Clone Curriculum
                                    </button>
                                    <button onClick={() => setIsAddingToClass(true)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2">
                                        <Plus size={16} /> Assign Subject
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                                    <div className="px-8 py-5 border-b border-slate-800 bg-slate-950/20 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                <TableProperties size={20} />
                                            </div>
                                            <p className="text-xs font-black text-white uppercase tracking-widest italic">Assigned Curriculum Matrix</p>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-950/50">
                                                <tr className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                                                    <th className="px-8 py-4 text-left">Subject Profile</th>
                                                    <th className="px-4 py-4 text-center w-32">Full Marks</th>
                                                    <th className="px-4 py-4 text-center w-32">Pass Marks</th>
                                                    <th className="px-4 py-4 text-center w-32">Credits</th>
                                                    <th className="px-4 py-4 text-center w-32">Category</th>
                                                    <th className="px-8 py-4 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {classAssignments.map(a => {
                                                    const sub = subjects.find(s => s.id === a.subject);
                                                    if (!sub) return null;
                                                    return (
                                                        <tr key={a.id} className="hover:bg-slate-800/30 transition-all group">
                                                            <td className="px-8 py-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-black text-white">{sub.name}</span>
                                                                    <span className="text-[10px] font-bold text-slate-500 font-mono italic opacity-60 tracking-tighter">{sub.code || 'NO-CODE'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <input 
                                                                    type="number" 
                                                                    defaultValue={a.full_marks} 
                                                                    onBlur={e => updateAssignment(a.id, { full_marks: e.target.value })}
                                                                    className="w-full bg-slate-950/50 border border-transparent focus:border-indigo-500/50 rounded-lg py-1.5 text-center text-xs font-black text-indigo-400 transition-all outline-none" 
                                                                />
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <input 
                                                                    type="number" 
                                                                    defaultValue={a.pass_marks} 
                                                                    onBlur={e => updateAssignment(a.id, { pass_marks: e.target.value })}
                                                                    className="w-full bg-slate-950/50 border border-transparent focus:border-indigo-500/50 rounded-lg py-1.5 text-center text-xs font-black text-slate-200 transition-all outline-none" 
                                                                />
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <input 
                                                                    type="number" 
                                                                    step="0.1"
                                                                    defaultValue={a.credit_hours || 0} 
                                                                    onBlur={e => updateAssignment(a.id, { credit_hours: e.target.value })}
                                                                    className="w-full bg-slate-950/50 border border-transparent focus:border-indigo-500/50 rounded-lg py-1.5 text-center text-xs font-black text-emerald-400 transition-all outline-none" 
                                                                />
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <button 
                                                                    onClick={() => updateAssignment(a.id, { is_elective: !a.is_elective })}
                                                                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all ${a.is_elective ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
                                                                >
                                                                    {a.is_elective ? 'Elective' : 'Core'}
                                                                </button>
                                                            </td>
                                                            <td className="px-8 py-4 text-right">
                                                                <button onClick={() => toggleSubjectAssignment(a.subject, a)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {classAssignments.length === 0 && !isAddingToClass && (
                                                    <tr><td colSpan={6} className="py-20 text-center text-slate-600 italic font-bold uppercase tracking-widest text-[10px]">Registry Empty: Select "Assign Subject" to begin.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        /* GLOBAL SUBJECT MASTER */
                        <motion.div key="global" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                                <div>
                                    <h1 className="text-4xl font-black text-white flex items-center gap-4">
                                        <BookOpen size={40} className="text-indigo-500" /> Subject Master
                                    </h1>
                                    <p className="text-slate-400 text-sm mt-2 font-medium">Define the global pool of subjects available to your institution.</p>
                                </div>
                                <button onClick={() => { setEditingGlobal(null); setIsGlobalModalOpen(true); }} className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-2">
                                    <Plus size={20} /> Create Global Subject
                                </button>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                                <div className="px-8 py-5 border-b border-slate-800 bg-slate-950/20 text-xs font-black text-slate-500 uppercase tracking-widest italic">Central Curriculum Resource Pool</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                                    {subjects.map(s => (
                                        <div key={s.id} className="relative group bg-slate-950 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all shadow-lg overflow-hidden">
                                           <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                                                <button onClick={() => { setEditingGlobal(s); setIsGlobalModalOpen(true); }} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"><Edit2 size={14} /></button>
                                                <button onClick={() => deleteGlobalSubject(s.id, s.name)} className="p-2 bg-red-500/10 text-red-500/60 hover:text-red-400 rounded-lg transition-all"><Trash2 size={14} /></button>
                                           </div>
                                           <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{s.code || 'CORE'}</span>
                                                <h3 className="text-lg font-black text-white">{s.name}</h3>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                                        <Settings2 size={12} /> {s.faculty || 'General'}
                                                    </div>
                                                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                                                    <div className="text-[10px] font-bold text-slate-500">
                                                        FM: <span className="text-slate-200">{s.full_marks}</span>
                                                    </div>
                                                </div>
                                           </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── MODALS ── */}
            <GlobalSubjectModal isOpen={isGlobalModalOpen} onClose={() => setIsGlobalModalOpen(false)} onSaved={fetchAll} initial={editingGlobal} />
            <CloneCurriculumModal isOpen={isCloneModalOpen} onClose={() => setIsCloneModalOpen(false)} targetClass={targetClass} classes={classes} onCloned={fetchAll} />
            
            {/* Subject Assignment Drawer/Overlay */}
            <AnimatePresence>
                {isAddingToClass && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                        >
                            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
                                <div>
                                    <h2 className="text-2xl font-black text-white">Import from Global Master</h2>
                                    <p className="text-slate-500 text-xs mt-1 font-bold italic">Assigning to {targetClass?.name}</p>
                                </div>
                                <button onClick={() => setIsAddingToClass(false)} className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-950/10">
                                <div className="grid grid-cols-2 gap-3">
                                    {subjects
                                        .filter(s => !classAssignments.some(a => a.subject === s.id))
                                        .map(s => (
                                            <button 
                                                key={s.id}
                                                onClick={() => toggleSubjectAssignment(s.id)}
                                                className="flex items-center gap-4 p-4 bg-slate-800/40 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-2xl transition-all text-left"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-indigo-400">
                                                    <BookOpen size={18} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-white leading-tight">{s.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{s.faculty || '—'}</span>
                                                </div>
                                            </button>
                                        ))
                                    }
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
