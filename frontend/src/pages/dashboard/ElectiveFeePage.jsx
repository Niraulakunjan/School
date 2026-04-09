import React, { useState, useEffect } from 'react';
import { 
    CreditCard, BookOpen, Save, Loader2, ChevronDown, 
    Search, Filter, CheckCircle2, AlertCircle, Info,
    DollarSign, Zap, ArrowRight, Layers, School
} from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const ElectiveFeePage = () => {
    const toast = useToast();
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [existingFees, setExistingFees] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Local state for modified values
    const [modifiedFees, setModifiedFees] = useState({});

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchClassFees(selectedClass.id);
        } else {
            setSubjects([]);
            setModifiedFees({});
        }
    }, [selectedClass]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/classes/');
            setClasses(res.data || []);
            if (res.data && res.data.length > 0) {
                setSelectedClass(res.data[0]);
            }
        } catch (err) {
            toast.error("Failed to load classes");
        } finally {
            setLoading(false);
        }
    };

    const fetchClassFees = async (classId) => {
        setLoading(true);
        try {
            const [curriculumRes, feeRes] = await Promise.all([
                axios.get(`/classes/${classId}/`), // Getting class details which includes curriculum
                axios.get(`/elective-subject-fees/?class_id=${classId}`)
            ]);
            
            // Extract elective subjects from curriculum
            const curriculum = curriculumRes.data.subjects || [];
            const electiveSubs = curriculum
                .filter(cs => cs.is_elective)
                .map(cs => ({
                    id: cs.subject, // the subject ID
                    name: cs.subject_name,
                    code: cs.subject_code,
                    faculty: cs.faculty
                }));
            
            setSubjects(electiveSubs);

            // Map existing fees by subject ID
            const feeMap = {};
            (feeRes.data || []).forEach(f => {
                feeMap[f.subject] = {
                    id: f.id,
                    fee_name: f.fee_name,
                    amount: f.amount
                };
            });
            setExistingFees(feeMap);
            
            // Initialize modified state
            const initialModified = {};
            electiveSubs.forEach(s => {
                const subId = s.id;
                if (feeMap[subId]) {
                    initialModified[subId] = {
                        fee_name: feeMap[subId].fee_name,
                        amount: feeMap[subId].amount
                    };
                } else {
                    initialModified[subId] = {
                        fee_name: '',
                        amount: ''
                    };
                }
            });
            setModifiedFees(initialModified);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load class curriculum and fees");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (subjectId, field, value) => {
        setModifiedFees(prev => ({
            ...prev,
            [subjectId]: {
                ...prev[subjectId],
                [field]: value
            }
        }));
    };

    const filteredSubjects = subjects.filter(s => {
        const name = s.name || '';
        const code = s.code || '';
        const faculty = s.faculty || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               code.toLowerCase().includes(searchQuery.toLowerCase()) ||
               faculty.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const hasChanges = () => {
        return subjects.some(s => {
            const subId = s.id || s;
            const current = modifiedFees[subId] || {};
            const original = existingFees[subId] || { fee_name: '', amount: '' };
            return current.fee_name !== original.fee_name || parseFloat(current.amount || 0) !== parseFloat(original.amount || 0);
        });
    };

    const handleSave = async () => {
        if (!selectedClass) return;
        setSaving(true);
        try {
            // Only send actually filled and valid data
            const feesToSave = Object.entries(modifiedFees)
                .filter(([id, data]) => data.fee_name && data.amount)
                .map(([id, data]) => ({
                    subject: parseInt(id),
                    fee_name: data.fee_name,
                    amount: parseFloat(data.amount)
                }));

            await axios.post('/elective-subject-fees/bulk-save/', { 
                class_id: selectedClass.id,
                fees: feesToSave 
            });
            toast.success(`Elective prices for ${selectedClass.name} updated!`);
            await fetchClassFees(selectedClass.id); // Refresh
        } catch (err) {
            toast.error("Failed to save class-wise prices");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 space-y-6 relative min-h-screen pb-24 text-slate-200">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 border border-violet-500/20">
                            <DollarSign size={20} />
                        </div>
                        Class-Wise Elective Pricing
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 tracking-tight font-medium">Manage tiered fees for specialized academic tracks and elective subjects across different grade levels.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges() || !selectedClass}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-violet-500/25 transition-all text-sm group"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} className="group-hover:scale-110 transition-transform" />}
                        {saving ? "Saving All..." : "Save Class Prices"}
                    </button>
                </div>
            </div>

            {/* Quick Stats & Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                   <div className="flex items-center gap-3 mb-2">
                        <School size={14} className="text-indigo-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selected Class</span>
                   </div>
                   <div className="relative group">
                        <select 
                            value={selectedClass?.id || ''}
                            onChange={(e) => setSelectedClass(classes.find(c => c.id === parseInt(e.target.value)))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-white outline-none appearance-none cursor-pointer focus:border-indigo-500 transition-all font-bold group-hover:bg-slate-700/50"
                        >
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-indigo-400 transition-colors" size={16} />
                   </div>
                </div>

                <div className="md:col-span-1 bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 border border-violet-500/20">
                        <Layers size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Elective Units</p>
                        <p className="text-white font-bold">{subjects.length} Subjects</p>
                    </div>
                </div>
                
                <div className="md:col-span-2 bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                        <Zap size={18} />
                    </div>
                    <p className="text-[11px] text-indigo-300 font-medium leading-normal italic">
                        Prices set here are class-specific. For example, "Computer Science" lab fees can be different between Grade 11 and Grade 12 based on the curriculum intensity.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search current class curriculum..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none focus:border-violet-500 transition-all placeholder:text-slate-600 shadow-inner"
                    />
                </div>
            </div>

            {/* Main Content */}
            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse tracking-wide uppercase text-xs">Syncing class curriculum...</p>
                </div>
            ) : subjects.length === 0 ? (
                <div className="bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-3xl p-12 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 mb-6">
                        <BookOpen size={40} />
                    </div>
                    <h3 className="text-white font-bold text-xl">No Elective Subjects for {selectedClass?.name || 'Class'}</h3>
                    <p className="text-slate-500 text-sm mt-2 max-w-md">
                        Please assign elective subjects to this class curriculum in the <strong>Subject Management</strong> module first.
                    </p>
                    <button 
                        onClick={() => window.location.href='/dashboard/subjects'}
                        className="mt-6 flex items-center gap-2 text-violet-400 hover:text-violet-300 font-bold text-sm transition-colors group"
                    >
                        Go to Subject Management <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative z-10"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-800/50">
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 min-w-[200px]">Curriculum Subject</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 w-48">Faculty</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-violet-400 uppercase tracking-widest border-b border-slate-800 w-72">Fee Name (on Invoices)</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-emerald-400 uppercase tracking-widest border-b border-slate-800 w-48 text-right pr-12">Amount (Rs.)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredSubjects.map((sub) => {
                                    const subId = sub.id || sub;
                                    const mod = modifiedFees[subId] || { fee_name: '', amount: '' };
                                    const isDirty = (orig) => (mod.fee_name !== orig.fee_name || parseFloat(mod.amount || 0) !== parseFloat(orig.amount || 0));
                                    const dirty = isDirty(existingFees[subId] || { fee_name: '', amount: '' });

                                    return (
                                        <tr key={subId} className={`hover:bg-slate-800/30 transition-colors group ${dirty ? 'bg-indigo-500/5' : ''}`}>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-500 border border-slate-700 group-hover:border-violet-500/30 transition-colors shrink-0">
                                                        <BookOpen size={16} />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-bold text-white block">{sub.name || `Subject ${subId}`}</span>
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{sub.code || 'CORE TRACK'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-wider border border-indigo-500/10">
                                                    {sub.faculty || 'General'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <input 
                                                    type="text"
                                                    value={mod.fee_name}
                                                    onChange={(e) => handleInputChange(subId, 'fee_name', e.target.value)}
                                                    placeholder="Enter billing name (e.g. Lab Fee)..."
                                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 px-4 text-xs text-white outline-none focus:border-violet-500 transition-all placeholder:text-slate-700 font-medium"
                                                />
                                            </td>
                                            <td className="px-6 py-5 text-right pr-12">
                                                <div className="relative inline-block w-full">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-bold">Rs.</span>
                                                    <input 
                                                        type="number"
                                                        value={mod.amount}
                                                        onChange={(e) => handleInputChange(subId, 'amount', e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 pl-10 pr-4 text-xs text-emerald-400 font-black outline-none focus:border-emerald-500 transition-all placeholder:text-slate-700 text-right shadow-inner"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredSubjects.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm font-medium">
                                            No curriculum items matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Footer / Status */}
            {!loading && subjects.length > 0 && (
                <div className="flex items-center justify-between mt-4 px-2">
                    <div className="flex items-center gap-2 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        Current Class: {selectedClass?.name} Curriculum Priced
                    </div>
                    <div className="text-[10px] text-slate-600 font-medium italic animate-pulse">
                        * Invoices will be generated with these class-specific rates automatically.
                    </div>
                </div>
            )}
        </div>
    );
};

export default ElectiveFeePage;
