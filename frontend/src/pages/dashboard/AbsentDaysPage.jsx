import React, { useState, useEffect, useCallback } from 'react';
import { 
    Save, Loader2, CalendarX, Search, AlertCircle, 
    UserX, DollarSign, ArrowRight, TrendingDown,
    Calendar, Filter, User
} from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const StatCard = ({ label, value, sub, icon: Icon, colorClass, barColor }) => (
    <div className={`bg-slate-900 border ${colorClass} p-6 rounded-2xl flex items-center gap-5 relative overflow-hidden group shadow-xl transition-all hover:scale-[1.02]`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${barColor.replace('bg-', 'text-')} bg-white/5 border border-white/5 group-hover:scale-110 transition-transform`}>
            <Icon size={24} strokeWidth={1.5} />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-white leading-none">{value}</h3>
                <span className="text-[10px] font-bold text-slate-600 uppercase">{sub}</span>
            </div>
        </div>
        <div className={`absolute bottom-0 left-0 h-1 ${barColor} opacity-20 group-hover:opacity-100 transition-opacity`} style={{ width: '100%' }} />
    </div>
);

const AbsentDaysPage = () => {
    const [month, setMonth] = useState('Baisakh');
    const [year, setYear] = useState('');
    const [years, setYears] = useState([]);
    const [records, setRecords] = useState([]);
    const [payrollSettings, setPayrollSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const toast = useToast();

    const fetchInitialData = useCallback(async () => {
        try {
            const res = await axios.get('/financial-years/');
            setYears(res.data);
            const active = res.data.find(y => y.is_active);
            if (active) setYear(active.name);
            else if (res.data.length > 0) setYear(res.data[0].name);
        } catch { toast('Failed to load academic sessions', 'error'); }
    }, [toast]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const fetchRecords = useCallback(async () => {
        if (!year) return;
        setLoading(true);
        try {
            const [salRes, setRes] = await Promise.all([
                axios.get('/staff-monthly-salaries/', { params: { month, year } }),
                axios.get('/payroll-settings/')
            ]);
            setRecords(salRes.data);
            if (setRes.data.length > 0) {
                setPayrollSettings(setRes.data[setRes.data.length - 1]);
            }
        } catch { toast('System failure while syncing records', 'error'); }
        finally { setLoading(false); }
    }, [month, year, toast]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const updateAbsent = (id, days) => {
        setRecords(prev => prev.map(r => {
            if (r.id === id) {
                const dayVal = parseInt(days) || 0;
                const multiplier = (payrollSettings?.absent_deduction_rate || 100.0) / 100.0;
                const dailyRate = r.basic_salary / 30;
                const deduction = parseFloat((dailyRate * dayVal * multiplier).toFixed(2));
                return { ...r, absent_days: dayVal, absent_less: deduction };
            }
            return r;
        }));
    };

    const updateDeduction = (id, amount) => {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, absent_less: parseFloat(amount) || 0 } : r));
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            const payload = records.map(r => ({ 
                id: r.id, 
                absent_days: r.absent_days,
                absent_less: r.absent_less
            }));
            await axios.post('/staff-monthly-salaries/bulk_absent/', payload);
            toast('Attendance matrix synchronized successfully');
            fetchRecords();
        } catch { toast('Critical write failure', 'error'); }
        finally { setSubmitting(false); }
    };

    const filtered = records.filter(r => 
        r.staff_name.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.staff_name.localeCompare(b.staff_name));

    const totalAbsent = records.reduce((sum, r) => sum + (parseInt(r.absent_days) || 0), 0);
    const totalDeduction = records.reduce((sum, r) => sum + (parseFloat(r.absent_less) || 0), 0);

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 pb-32 pt-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-white tracking-tight">Attendance <span className="text-rose-500">& Deductions</span></h1>
                        <div className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                            Payroll Operations
                        </div>
                    </div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-widest pl-1">Syncing monthly absences with institutional payroll rules</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="hidden xl:flex items-center gap-6 px-5 py-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
                        <div className="flex items-center gap-3">
                            <Filter size={14} className="text-indigo-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate (%):</span>
                            <span className="text-xs font-black text-white bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">{payrollSettings?.absent_deduction_rate || '100'}%</span>
                        </div>
                    </div>
                    <button onClick={() => {
                        if(window.confirm('Clear all recorded absences for this month?')) {
                            setRecords(prev => prev.map(r => ({ ...r, absent_days: 0, absent_less: 0 })));
                            toast('Attendance matrix cleared');
                        }
                    }}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3.5 px-6 rounded-2xl transition-all border border-slate-700 active:scale-95"
                    >
                        <CalendarX size={18} /> Clear Matrix
                    </button>
                    <button onClick={handleSave} disabled={submitting || records.length === 0}
                        className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-3.5 px-8 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 group">
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} className="group-hover:rotate-12 transition-transform" /> Commit Attendance Data</>}
                    </button>
                </div>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
                <StatCard label="Total Absences" value={totalAbsent} sub="Person-Days" icon={UserX} colorClass="border-rose-500/20" barColor="bg-rose-500" />
                <StatCard label="Total Deductions" value={`Rs. ${totalDeduction.toLocaleString()}`} sub="Revenue Impact" icon={TrendingDown} colorClass="border-indigo-500/20" barColor="bg-indigo-500" />
                <StatCard label="Configured Rate" value={`${payrollSettings?.absent_deduction_rate || '100'}%`} sub="Deduction Logic" icon={DollarSign} colorClass="border-emerald-500/20" barColor="bg-emerald-500" />
            </section>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl mx-4">
                {/* Control Bar */}
                <div className="p-5 bg-slate-900/50 border-b border-slate-800/50 flex flex-wrap gap-5 items-center">
                    <div className="flex items-center gap-4 bg-slate-800/40 p-1.5 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-2">
                            <select value={month} onChange={e => setMonth(e.target.value)}
                                className="bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2 text-xs text-white font-bold outline-none focus:border-indigo-500 transition-all min-w-[130px] appearance-none cursor-pointer"
                            >
                                {['Baisakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangshir', 'Poush', 'Magh', 'Falgun', 'Chaitra'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <Calendar size={14} className="text-slate-500 mr-2" />
                        </div>
                        <div className="w-px h-6 bg-slate-700 mx-1" />
                        <div className="flex items-center gap-2">
                            <select value={year} onChange={e => setYear(e.target.value)}
                                className="bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2 text-xs text-white font-bold outline-none focus:border-indigo-500 transition-all min-w-[100px] appearance-none cursor-pointer"
                            >
                                {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 min-w-[300px] relative group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Find employee by name or ID..."
                            className="w-full bg-slate-800/40 border border-slate-800 rounded-2xl py-3 pl-11 pr-12 text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                        />
                        {search && (
                            <button 
                                onClick={() => setSearch('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                            >
                                <CalendarX size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                            className="py-32 flex flex-col items-center justify-center gap-4">
                            <Loader2 size={40} className="animate-spin text-indigo-500" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Synchronizing Data Matrix...</p>
                        </motion.div>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto min-h-[500px]">
                            {records.length > 0 && records[0].status === 'PAID' && (
                                <div className="m-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center gap-4 text-amber-500">
                                    <AlertCircle size={20} className="shrink-0" />
                                    <p className="text-[10px] font-black uppercase tracking-widest italic leading-relaxed">
                                        Active Payroll Locked: This month's payroll is already processed as PAID. Deductions recorded here will not affect finalized slips.
                                    </p>
                                </div>
                            )}

                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-slate-900/50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Employee Node</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Basic Salary</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-rose-500 uppercase tracking-widest text-center">Absent Days</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-widest text-right pr-12">Deduction Outcome</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((r, i) => (
                                        <tr key={r.id} className="group hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] last:border-0">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white mb-0.5">{r.staff_name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight">{r.staff}</span>
                                                            <div className="w-1 h-1 rounded-full bg-slate-700" />
                                                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{r.post}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-600 uppercase">Rs.</span>
                                                    <span className="text-xs font-bold text-slate-300">{parseFloat(r.basic_salary).toLocaleString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-center">
                                                    <div className="relative group/input">
                                                        <input type="text" value={Number(r.absent_days) || ''} 
                                                            onChange={e => {
                                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                                updateAbsent(r.id, val);
                                                            }}
                                                            className={`w-24 bg-slate-800 border border-slate-700 hover:border-rose-500/50 focus:border-rose-500 focus:bg-rose-500/5 px-4 py-2.5 rounded-xl text-xs font-bold outline-none transition-all text-center shadow-inner ${Number(r.absent_days) > 0 ? 'text-rose-400' : 'text-slate-600'}`} />
                                                        <div className="absolute -top-2 -right-2 opacity-0 group-hover/input:opacity-100 transition-opacity">
                                                            <div className="bg-rose-500 text-[8px] font-black text-white px-1.5 py-0.5 rounded shadow-lg">DAYS</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-end pr-4">
                                                    <div className="bg-slate-800/50 rounded-2xl p-1 border border-slate-800 flex items-center gap-3 focus-within:border-indigo-500/50 transition-all group/deduct">
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5">
                                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Rs.</span>
                                                            <input type="text" readOnly value={Number(r.absent_less) > 0 ? Number(r.absent_less).toLocaleString(undefined, {minimumFractionDigits: 2}) : ''} 
                                                                className={`w-28 bg-transparent text-sm font-black outline-none text-right cursor-default ${Number(r.absent_less) > 0 ? 'text-indigo-400' : 'text-slate-600'}`} 
                                                            />
                                                        </div>
                                                        <div className="p-2 bg-slate-900 rounded-xl text-slate-600 group-hover/deduct:text-indigo-400 transition-colors">
                                                            <ArrowRight size={14} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={4} className="py-32 text-center space-y-4">
                                                <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-600">
                                                    <CalendarX size={32} />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="text-white font-bold tracking-wide">No Records Identified</h3>
                                                    <p className="text-xs text-slate-500 font-medium italic">Adjust your search parameters or select a different month.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AbsentDaysPage;
