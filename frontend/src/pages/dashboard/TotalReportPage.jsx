import React, { useState, useEffect, useRef } from 'react';
import { 
    Printer, Download, Search, FileText, BarChart3, 
    TrendingDown, TrendingUp, HandCoins, Calendar,
    Filter, LayoutGrid, User, ShieldCheck, ChevronRight,
    Calculator, ArrowUpRight, ArrowDownRight, X
} from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import { useReactToPrint } from 'react-to-print';
import { motion, AnimatePresence } from 'framer-motion';

const StatCard = ({ label, value, sub, icon: Icon, colorClass, barColor, trend }) => (
    <div className={`bg-slate-900 border ${colorClass} p-6 rounded-2xl flex items-center gap-5 relative overflow-hidden group shadow-xl transition-all hover:scale-[1.02]`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${barColor.replace('bg-', 'text-')} bg-white/5 border border-white/5 group-hover:scale-110 transition-transform`}>
            <Icon size={28} strokeWidth={1.5} />
        </div>
        <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-white leading-none">
                    <span className="text-sm font-bold text-slate-500 mr-1">Rs.</span>
                    {value.toLocaleString()}
                </h3>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {sub}
                </span>
            </div>
        </div>
        <div className={`absolute bottom-0 left-0 h-1 ${barColor} opacity-20 group-hover:opacity-100 transition-opacity`} style={{ width: '100%' }} />
    </div>
);

const TotalReportPage = () => {
    const [month, setMonth] = useState('Baisakh');
    const [year, setYear] = useState('');
    const [years, setYears] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const toast = useToast();
    const componentRef = useRef();

    const fetchInitialData = async () => {
        try {
            const res = await axios.get('/financial-years/');
            setYears(res.data);
            const active = res.data.find(y => y.is_active);
            if (active) setYear(active.name);
            else if (res.data.length > 0) setYear(res.data[0].name);
        } catch { toast('Failed to load academic sessions', 'error'); }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchRecords = async () => {
        if (!year) return;
        setLoading(true);
        try {
            const res = await axios.get('/staff-monthly-salaries/', { params: { month, year } });
            setRecords(res.data);
        } catch { toast('System failure while loading reports', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchRecords();
    }, [month, year]);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Salary_Report_${month}_${year}`,
    });

    const filtered = records.filter(r => 
        r.staff_name.toLowerCase().includes(search.toLowerCase()) ||
        r.staff?.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.staff_name.localeCompare(b.staff_name));
    
    // Totals
    const totalEarnings = filtered.reduce((acc, r) => acc + (parseFloat(r.total_earnings) || 0), 0);
    const totalDeductions = filtered.reduce((acc, r) => acc + (parseFloat(r.total_deductions) || 0), 0);
    const totalNet = filtered.reduce((acc, r) => acc + (parseFloat(r.net_salary) || 0), 0);

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 pb-32 pt-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                            <BarChart3 size={20} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight italic">Salary <span className="text-indigo-500">Summary</span></h1>
                    </div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] pl-1">Financial Operations / Monthly Report Hub</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="hidden xl:flex items-center gap-6 px-5 py-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={14} className="text-emerald-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-nowrap">Audit Ready:</span>
                            <span className="text-xs font-black text-white bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">VERIFIED</span>
                        </div>
                    </div>
                    <button onClick={handlePrint} className="flex items-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-black py-3.5 px-8 rounded-2xl transition-all shadow-xl active:scale-95 group text-xs uppercase tracking-widest">
                        <Printer size={18} className="group-hover:rotate-12 transition-transform text-indigo-600" /> Print Summary
                    </button>
                </div>
            </header>

            {/* Quick Summary Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
                <StatCard label="Gross Monthly Earnings" value={totalEarnings} sub="Total Pay Snapshot" icon={TrendingUp} colorClass="border-emerald-500/20" barColor="bg-emerald-500" trend="up" />
                <StatCard label="Institutional Deductions" value={totalDeductions} sub="Combined Reductions" icon={TrendingDown} colorClass="border-rose-500/20" barColor="bg-rose-500" trend="down" />
                <StatCard label="Net Payable Amount" value={totalNet} sub="Liquid Disbursement" icon={HandCoins} colorClass="border-indigo-500/20" barColor="bg-indigo-500" trend="up" />
            </div>

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
                            placeholder="Search employee or ID..."
                            className="w-full bg-slate-800/40 border border-slate-800 rounded-2xl py-3 pl-11 pr-12 text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                            className="py-32 flex flex-col items-center justify-center gap-4">
                            <div className="relative">
                                <div className="w-12 h-12 border-t-2 border-indigo-500 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 border-t-2 border-indigo-500 animate-spin opacity-40 translate-x-1" />
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Compiling Financial Ledger...</p>
                        </motion.div>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto min-h-[500px]">
                            {/* Printable Area Start */}
                            <div className="bg-slate-900/50 text-white" id="printable-area" ref={componentRef}>
                                <div className="p-12 border-b-4 border-slate-800 text-center">
                                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-1 select-none text-white">Sajilo School System</h1>
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="h-0.5 w-12 bg-indigo-500/50" />
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Monthly Payroll Summary Report</p>
                                        <div className="h-0.5 w-12 bg-indigo-500/50" />
                                    </div>
                                    <div className="flex items-center justify-center gap-4 mt-8">
                                        <span className="bg-indigo-600 text-white px-5 py-1.5 rounded text-[10px] font-black uppercase tracking-widest italic">Session: {year}</span>
                                        <span className="bg-slate-800 text-slate-300 border border-slate-700 px-5 py-1.5 rounded text-[10px] font-black uppercase tracking-widest italic">Month: {month}</span>
                                    </div>
                                </div>

                                <table className="w-full text-left border-collapse px-8 pb-12">
                                    <thead>
                                        <tr className="bg-slate-800/50 border-b-2 border-slate-700">
                                            <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest w-12">#</th>
                                            <th className="px-6 py-5 text-[9px] font-black text-white uppercase tracking-widest">Identified Node</th>
                                            <th className="px-6 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                                            <th className="px-6 py-5 text-[9px] font-black text-white uppercase tracking-widest text-right">Basic</th>
                                            <th className="px-6 py-5 text-[9px] font-black text-white uppercase tracking-widest text-right">Allowance</th>
                                            <th className="px-6 py-5 text-[9px] font-black text-emerald-400 uppercase tracking-widest text-right">Gross</th>
                                            <th className="px-6 py-5 text-[9px] font-black text-rose-400 uppercase tracking-widest text-right">Deduction</th>
                                            <th className="px-6 py-5 text-[9px] font-black text-indigo-400 uppercase tracking-widest text-right bg-indigo-500/10">Payable</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 italic font-medium">
                                        {filtered.map((r, i) => (
                                            <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 text-[10px] font-black text-slate-600">{i + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 group-hover:bg-slate-700 transition-all NoPrint">
                                                            <User size={14} strokeWidth={2.5} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-white leading-none mb-1">{r.staff_name}</p>
                                                            <p className="text-[9px] font-black text-slate-500 uppercase leading-none">{r.staff}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">{r.post}</td>
                                                <td className="px-6 py-4 text-right text-[11px] font-black text-slate-300">{(parseFloat(r.basic_salary) || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-[11px] font-black text-slate-500">
                                                    {(
                                                        (parseFloat(r.tiffin_allowance) || 0) + 
                                                        (parseFloat(r.special_allowance) || 0) + 
                                                        (parseFloat(r.dashain_bonus) || 0) + 
                                                        (parseFloat(r.other_allowance) || 0)
                                                    ).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right text-[11px] font-black text-emerald-500">{(parseFloat(r.total_earnings) || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-[11px] font-black text-rose-500">{(parseFloat(r.total_deductions) || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-xs font-black text-indigo-400 bg-indigo-500/5 ring-1 ring-inset ring-indigo-500/10">Rs. {(parseFloat(r.net_salary) || 0).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        
                                        {/* Grand Totals */}
                                        <tr className="bg-slate-900 text-white font-black ring-2 ring-slate-800">
                                            <td colSpan={5} className="px-6 py-5 text-[10px] uppercase tracking-[0.2em] text-right text-slate-400">Institutional Grand Totals</td>
                                            <td className="px-6 py-5 text-right text-xs">Rs. {totalEarnings.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-right text-xs text-rose-400">Rs. {totalDeductions.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-right text-base text-emerald-400 bg-emerald-500/5 ring-1 ring-emerald-500/20">Rs. {totalNet.toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Signature Block */}
                                <div className="p-16 flex justify-between gap-12 mt-12 bg-transparent flex-wrap">
                                     <div className="flex flex-col items-center gap-3">
                                        <div className="w-40 border-t-2 border-slate-700 pt-3 text-[10px] font-black uppercase text-center tracking-widest text-slate-400 tracking-tighter">Prepared BY ACCOUNT</div>
                                        <p className="text-[9px] text-slate-600 italic font-bold tracking-tight">System Generation Stamp</p>
                                     </div>
                                     <div className="flex flex-col items-center gap-3">
                                        <div className="w-40 border-t-2 border-slate-700 pt-3 text-[10px] font-black uppercase text-center tracking-widest text-slate-400 tracking-tighter">Checked BY HOD</div>
                                     </div>
                                     <div className="flex flex-col items-center gap-3">
                                        <div className="w-40 border-t-2 border-slate-700 pt-3 text-[10px] font-black uppercase text-center tracking-widest text-slate-400 tracking-tighter">APPROVED BY DIRECTOR</div>
                                        <p className="text-[9px] text-indigo-500 italic font-black tracking-widest">DIAMOND TIER VERIFIED</p>
                                     </div>
                                </div>
                            </div>
                            {/* Printable Area End */}

                            {filtered.length === 0 && !loading && (
                                <div className="py-32 text-center space-y-4">
                                    <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-600">
                                        <FileText size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-white font-bold tracking-wide uppercase text-xs">No Records Found</h3>
                                        <p className="text-[10px] text-slate-500 font-medium italic">Adjust filters to visualize monthly disbursement data.</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body { background: white !important; font-family: sans-serif; }
                    .NoPrint { display: none !important; }
                    #printable-area { 
                        background: white !important; 
                        color: black !important;
                        border: none !important; 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        width: 100% !important; 
                        min-width: 1000px;
                        padding: 40px !important;
                    }
                    h1, p, span, th, td, div { color: black !important; border-color: black !important; }
                    .bg-slate-900, .bg-indigo-600, .bg-slate-800\/50, .bg-slate-100 { background: #f8fafc !important; }
                    table { -webkit-print-color-adjust: exact; color-adjust: exact; width: 100% !important; border-top: 2px solid black; }
                    thead { display: table-header-group; background: #f1f5f9 !important; }
                    tr { border-bottom: 1px solid #e2e8f0 !important; }
                    .text-emerald-700, .text-emerald-500, .text-emerald-400 { color: #065f46 !important; }
                    .text-rose-700, .text-rose-500, .text-rose-400 { color: #9f1239 !important; }
                    .text-indigo-700, .text-indigo-400 { color: #3730a3 !important; }
                }
            `}</style>
        </div>
    );
};

export default TotalReportPage;
