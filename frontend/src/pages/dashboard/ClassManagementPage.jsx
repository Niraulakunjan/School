import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, X, Save, BookOpen, Users, TableProperties, Check } from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const inputCls = "w-full bg-transparent text-sm text-white outline-none focus:text-indigo-400 transition-colors placeholder:text-slate-700";

export default function ClassManagementPage() {
    const toast = useToast();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchClasses = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/classes/');
            setClasses(res.data || []);
        } catch {
            toast('Failed to load classes', 'error');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    const updateRow = (idx, field, val) => {
        const newClasses = [...classes];
        newClasses[idx][field] = val;
        setClasses(newClasses);
    };

    const addRow = () => {
        setClasses(p => [...p, { id: null, name: '', faculty: '', sections: [], subjects: [], _new: true }]);
    };

    const saveAll = async () => {
        setSaving(true);
        try {
            await axios.post('/classes/bulk-save/', classes);
            toast('All changes saved successfully!');
            fetchClasses();
        } catch {
            toast('Failed to save master sheet', 'error');
        } finally {
            setSaving(false);
        }
    };

    const deleteClass = async (id, name) => {
        if (!id) {
            setClasses(p => p.filter(c => c.id !== id || c.name !== name));
            return;
        }
        if (!window.confirm(`Delete class "${name}" and all its sections?`)) return;
        try {
            await axios.delete(`/classes/${id}/`);
            toast(`Class "${name}" deleted`);
            fetchClasses();
        } catch {
            toast('Cannot delete class — check dependencies', 'error');
        }
    };

    const addSection = async (classId, idx) => {
        const name = window.prompt("Enter section name (e.g. A, B, Green):");
        if (!name) return;
        try {
            await axios.post(`/classes/${classId}/sections/`, { name, capacity: 40 });
            toast(`Section ${name} added`);
            fetchClasses();
        } catch {
            toast('Failed to add section', 'error');
        }
    };

    const deleteSection = async (classId, sectionId, sectionName) => {
        if (!window.confirm(`Delete section "${sectionName}"?`)) return;
        try {
            await axios.delete(`/classes/${classId}/sections/${sectionId}/`);
            fetchClasses();
        } catch {
            toast('Failed to delete section', 'error');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <BookOpen className="text-indigo-500" size={28} /> Class & Section Master
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Manage academic classes and assignments in a spreadsheet view.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={addRow} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all border border-slate-700 shadow-xl">
                        <Plus size={16} /> Add Row
                    </button>
                    <button onClick={saveAll} disabled={saving || loading} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Master Sheet
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-slate-950/50">
                            <tr className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                <th className="px-6 py-4 text-left border-r border-slate-800 w-16 text-center">#</th>
                                <th className="px-6 py-4 text-left border-r border-slate-800 min-w-[200px]">Class Name</th>
                                <th className="px-6 py-4 text-left border-r border-slate-800 w-48">Faculty / Stream</th>
                                <th className="px-6 py-4 text-left border-r border-slate-800">Sections</th>
                                <th className="px-6 py-4 text-center border-r border-slate-800 w-32">Curriculum</th>
                                <th className="px-6 py-4 text-right w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading && classes.length === 0 ? (
                                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} /></td></tr>
                            ) : classes.length === 0 ? (
                                <tr><td colSpan={6} className="py-20 text-center text-slate-500 italic">No classes defined. Click "Add Row" to begin.</td></tr>
                            ) : classes.map((cls, idx) => (
                                <tr key={cls.id || `new-${idx}`} className={`hover:bg-slate-800/30 transition-all ${cls._new ? 'bg-indigo-500/5' : ''}`}>
                                    <td className="px-4 py-3 border-r border-slate-800 text-center text-[10px] font-bold text-slate-600 italic">
                                        {idx + 1}
                                    </td>
                                    <td className="px-6 py-3 border-r border-slate-800">
                                        <input value={cls.name} onChange={e => updateRow(idx, 'name', e.target.value)} placeholder="e.g. Class 11" className={inputCls + " font-black text-white"} />
                                    </td>
                                    <td className="px-6 py-3 border-r border-slate-800">
                                        <input value={cls.faculty || ''} onChange={e => updateRow(idx, 'faculty', e.target.value)} placeholder="Science / General" className={inputCls + " font-bold text-indigo-400/70"} />
                                    </td>
                                    <td className="px-6 py-3 border-r border-slate-800">
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            {cls.sections?.map(s => (
                                                <div key={s.id} className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 group/sec">
                                                    <span className="text-[10px] font-bold text-white mb-0.5">{s.name}</span>
                                                    <button onClick={() => deleteSection(cls.id, s.id, s.name)} className="text-slate-600 hover:text-red-400 transition-colors p-0.5">
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                            {cls.id && (
                                                <button onClick={() => addSection(cls.id, idx)} className="w-6 h-6 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-600 hover:text-indigo-400 hover:border-indigo-500/50 transition-all">
                                                    <Plus size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 border-r border-slate-800 text-center">
                                        <a href={`/dashboard/subjects?class=${cls.id}`} className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-500/5 border border-indigo-500/10 rounded-lg hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all group">
                                            <TableProperties size={12} className="text-indigo-500/50 group-hover:text-indigo-500" />
                                            <span className="text-xs font-black text-indigo-400">{cls.subjects?.length || 0} <span className="text-[9px] font-bold text-slate-500 uppercase ml-0.5">Subs</span></span>
                                        </a>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <button onClick={() => deleteClass(cls.id, cls.name)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                                            <Trash2 size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 bg-slate-950/20 border-t border-slate-800 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-600 italic">Total Classes: {classes.length}</p>
                    <button onClick={addRow} className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                        <Plus size={12} /> Click here to add another class
                    </button>
                </div>
            </div>
        </div>
    );
}
