import React, { useState, useEffect } from 'react';
import { 
    Calendar, Users, ChevronRight, Zap, 
    CheckCircle2, AlertCircle, Loader2, ArrowRight
} from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const GenerateFeePage = () => {
    const toast = useToast();
    const [years, setYears] = useState([]);
    const [classes, setClasses] = useState([]);
    
    // Form state
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const MONTHS = [
        "Baishakh", "Jestha", "Ashadh", "Shrawan", 
        "Bhadra", "Ashwin", "Kartik", "Mangsir", 
        "Poush", "Magh", "Falgun", "Chaitra"
    ];

    useEffect(() => {
        fetchMetadata();
    }, []);

    const fetchMetadata = async () => {
        try {
            const [yearsRes, classesRes] = await Promise.all([
                axios.get('/financial-years/'),
                axios.get('/classes/')
            ]);
            setYears(yearsRes.data);
            setClasses(classesRes.data);
            
            // Auto-select active year
            const active = yearsRes.data.find(y => y.is_active);
            if (active) setSelectedYear(active.id);
        } catch (err) {
            toast('Failed to load initial data', 'error');
        }
    };

    const handleGenerate = async () => {
        if (!selectedYear || !selectedMonth || !selectedClass) {
            toast('Please fill all filters', 'warning');
            return;
        }

        setLoading(true);
        setResult(null);
        try {
            const res = await axios.post('/fee-enrollments/bulk-generate/', {
                financial_year: selectedYear,
                month: selectedMonth,
                class_name: selectedClass
            });

            setResult(res.data);
            toast('Bulk fee generation complete');
        } catch (err) {
            toast(err.response?.data?.detail || 'Generation failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const cls = "w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl py-3 px-4 text-white text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer";

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-white tracking-tight">Bulk Fee Generation</h1>
                <p className="text-slate-500 text-sm">Automatically enroll students and generate monthly invoices for an entire class.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Year Selection */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Academic Year</label>
                                <div className="relative">
                                    <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className={cls}>
                                        <option value="">Select Year</option>
                                        {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                                    </select>
                                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                                </div>
                            </div>

                            {/* Month Selection */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1">Billing Month</label>
                                <div className="relative">
                                    <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={cls}>
                                        <option value="">Select Month</option>
                                        <option value="All" className="text-emerald-400 font-bold">All Months (Full Year)</option>
                                        <hr className="border-slate-700 my-1" />
                                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                    </select>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" size={16} />
                                </div>
                            </div>

                            {/* Class Selection */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest ml-1">Target Class</label>
                                <div className="relative">
                                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className={cls}>
                                        <option value="">Select Class</option>
                                        <option value="All" className="text-indigo-400 font-bold">All Classes (Whole School)</option>
                                        <hr className="border-slate-700 my-1" />
                                        {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                    <Users className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                                </div>

                            </div>
                        </div>

                        {/* Action Button */}
                        <button 
                            onClick={handleGenerate}
                            disabled={loading}
                            className={`w-full group relative overflow-hidden rounded-2xl py-4 px-6 flex items-center justify-center gap-3 transition-all duration-500 ${
                                loading 
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] active:scale-[0.98]'
                            }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span className="font-bold tracking-tight">Processing Generation...</span>
                                </>
                            ) : (
                                <>
                                    <Zap size={20} className="fill-current group-hover:animate-pulse" />
                                    <span className="font-bold tracking-tight text-lg">Generate Fees for All</span>
                                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>
                    </div>

                    {/* Quick Tips */}
                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 flex gap-4 items-start">
                        <AlertCircle className="text-indigo-400 shrink-0 mt-0.5" size={18} />
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-indigo-300">How this works</p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                This tool will find all students currently registered in {selectedClass || 'the selected class'}. 
                                If they aren't already enrolled in a fee package for {years.find(y => y.id == selectedYear)?.name || 'this year'}, 
                                the system will automatically assign them to the standard package define for their grade.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status/Result Side Column */}
                <div className="space-y-6">
                    <AnimatePresence mode="wait">
                        {result ? (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 space-y-6"
                            >
                                <div className="flex items-center gap-3 text-emerald-400">
                                    <CheckCircle2 size={24} />
                                    <h3 className="font-black text-lg">Generation Complete</h3>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
                                        <span className="text-sm text-slate-400 font-semibold">Students Found</span>
                                        <span className="text-lg font-black text-white">{result.students_found}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
                                        <div className="flex flex-col">
                                            <span className="text-sm text-slate-400 font-semibold">Actually Billed</span>
                                            {result.students_billed === 0 && result.students_found > 0 && (
                                                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-tighter">Missing Configs</span>
                                            )}
                                        </div>
                                        <span className={`text-lg font-black ${result.students_billed > 0 ? 'text-white' : 'text-amber-500'}`}>
                                            {result.students_billed}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
                                        <span className="text-sm text-slate-400 font-semibold">Total Invoices</span>
                                        <span className="text-lg font-black text-white">{result.demands_generated}</span>
                                    </div>
                                </div>

                                {result.skipped_classes?.length > 0 && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-2">
                                        <div className="flex items-center gap-2 text-amber-500">
                                            <AlertCircle size={16} />
                                            <span className="text-xs font-black uppercase tracking-widest">Skipped Classes</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 leading-tight">
                                            The following classes were skipped because they have NO active Fee Structure setup:
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {result.skipped_classes.map(c => (
                                                <span key={c} className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{c}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <p className="text-xs text-slate-500 text-center italic">
                                    {result.demands_generated > 0 
                                        ? "Invoices are now available in Fee Collection." 
                                        : "No invoices were created. Check skipped classes above."}
                                </p>
                            </motion.div>
                        ) : (
                            <div className="bg-slate-900/40 border border-slate-800/50 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4">
                                <div className="w-16 h-16 rounded-3xl bg-slate-800/50 flex items-center justify-center">
                                    <Zap size={32} className="text-slate-600" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-slate-400 font-bold">Ready to batch</h3>
                                    <p className="text-xs text-slate-600 px-4">Select the class and month above to begin bulk generation.</p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

            </div>

            {/* Maintenance Section */}
            <div className="pt-12 border-t border-slate-800/50">
                <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 text-red-400">
                            <AlertCircle size={20} />
                            <h3 className="font-black text-lg">Financial Data Reset</h3>
                        </div>
                        <p className="text-sm text-slate-500 max-w-md">
                            Permanently delete ALL fee collections, monthly invoices, and carry-over dues. 
                            Use this only if you want to start fresh with zero records. 
                            <span className="text-red-400/80 font-bold ml-1 italic underline">This cannot be undone.</span>
                        </p>
                    </div>

                    <button 
                        onClick={() => {
                            const conf = window.prompt("Type 'RESET' to confirm deleting all financial records:");
                            if (conf === 'RESET') {
                                axios.post('/fee-collections/clear-all/')
                                    .then(() => {
                                        toast('All financial records cleared successfully');
                                        setResult(null);
                                    })
                                    .catch(err => toast('Reset failed', 'error'));
                            }
                        }}
                        className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-8 py-3 rounded-2xl font-black text-sm transition-all active:scale-95"
                    >
                        Clear All Collections
                    </button>
                </div>
            </div>
        </div>
    );
};


export default GenerateFeePage;
