import React, { useState, useEffect } from 'react';
import { PlayCircle, Save, Loader2, CheckCircle, Search, Filter, Printer, Download, Calculator, AlertTriangle } from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import PaySlipModal from '../../components/dashboard/PaySlipModal';

const MONTHS = [
    'Baisakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin', 
    'Kartik', 'Mangshir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const SalaryGenerationPage = () => {
    const [month, setMonth] = useState('Baisakh');
    const [year, setYear] = useState('');
    const [salaries, setSalaries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedSlip, setSelectedSlip] = useState(null);
    const toast = useToast();

    useEffect(() => {
        fetchDefaultYear();
    }, []);

    const fetchDefaultYear = async () => {
        try {
            const res = await axios.get('/school-settings/');
            const data = Array.isArray(res.data) ? res.data[0] : res.data;
            if (data && data.fiscal_year_name) {
                setYear(data.fiscal_year_name);
            } else {
                setYear('081-82'); // Fallback if not set
            }
        } catch {
            setYear('081-82');
        }
    };

    useEffect(() => {
        if (year) fetchSalaries();
    }, [month, year]);

    const fetchSalaries = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/staff-monthly-salaries/', { params: { month, year } });
            setSalaries(res.data);
        } catch { toast('Failed to fetch salary records', 'error'); }
        finally { setLoading(false); }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await axios.post('/staff-monthly-salaries/generate_sheet/', { month, year });
            toast(`Salary sheet generated for ${month} ${year}`);
            fetchSalaries();
        } catch { toast('Generation failed. Ensure staff have salary structures.', 'error'); }
        finally { setGenerating(false); }
    };

    const updateDeduction = (recordId, field, value) => {
        setSalaries(prev => prev.map(s => {
            if (s.id === recordId) {
                return { ...s, [field]: parseFloat(value) || 0 };
            }
            return s;
        }));
    };

    const handleUpdate = async (recordId) => {
        const record = salaries.find(s => s.id === recordId);
        try {
            await axios.patch(`/staff-monthly-salaries/${recordId}/`, record);
            toast('Updated successfully');
        } catch { toast('Failed to update', 'error'); }
    };

    const handleAcceptAll = async () => {
        setSubmitting(true);
        try {
            await axios.post('/staff-monthly-salaries/accept_all/', { month, year });
            toast('All records accepted');
            fetchSalaries();
        } catch { toast('Action failed', 'error'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6">
            {/* Control Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-end justify-between gap-6 shadow-xl">
                <div className="flex flex-wrap items-center gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Salary Month</label>
                        <select value={month} onChange={e => setMonth(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-indigo-500 transition-all min-w-[140px]"
                        >
                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Fiscal Year</label>
                        <select value={year} onChange={e => setYear(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-indigo-500 transition-all"
                        >
                            <option value="081-82">081-82</option>
                            <option value="080-81">080-81</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={handleGenerate} disabled={generating}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20 active:scale-95">
                        {generating ? <Loader2 size={16} className="animate-spin" /> : <><PlayCircle size={16} /> Generate / Refresh</>}
                    </button>
                    <button onClick={handleAcceptAll} disabled={submitting || salaries.length === 0}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-emerald-500/20 active:scale-95">
                        <CheckCircle size={16} /> Accept & Lock All
                    </button>
                </div>
            </div>

            {/* Warning if not accepted */}
            {salaries.some(s => !s.is_accepted) && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                    <AlertTriangle className="text-amber-500" size={18} />
                    <p className="text-amber-400/80 text-xs font-bold uppercase tracking-tight">Records for this month are currently editable and not yet accepted.</p>
                </div>
            )}

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                        <Loader2 size={30} className="animate-spin text-indigo-500" />
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Loading Payroll Data...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1500px]">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-800/10">
                                    <th className="sticky left-0 bg-slate-900 px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest z-10">Employee Details</th>
                                    <th className="px-3 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Earning</th>
                                    <th className="px-2 py-4 text-[9px] font-black text-rose-500 uppercase tracking-widest text-right">Adv. Less</th>
                                    <th className="px-2 py-4 text-[9px] font-black text-rose-500 uppercase tracking-widest text-right">Sal. Tax</th>
                                    <th className="px-2 py-4 text-[9px] font-black text-rose-500 uppercase tracking-widest text-right">Miss Chg.</th>
                                    <th className="px-2 py-4 text-[9px] font-black text-rose-500 uppercase tracking-widest text-right">Payroll Tax</th>
                                    <th className="px-2 py-4 text-[9px] font-black text-rose-500 uppercase tracking-widest text-right">Other Less</th>
                                    <th className="px-2 py-4 text-[9px] font-black text-rose-500 uppercase tracking-widest text-right">Abs. Less</th>
                                    <th className="px-3 py-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest text-right">Net Payable</th>
                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salaries.map((s, idx) => (
                                    <tr key={s.id} className={`hover:bg-slate-800/30 transition-colors ${s.is_accepted ? 'opacity-90' : ''} ${idx < salaries.length - 1 ? 'border-b border-slate-800/50' : ''}`}>
                                        <td className="sticky left-0 bg-slate-900 px-4 py-4 z-10 shadow-xl shadow-black/5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg bg-slate-800 border flex items-center justify-center text-xs font-bold ${s.is_accepted ? 'border-emerald-500/20 text-emerald-400' : 'border-slate-700 text-slate-500'}`}>
                                                    {s.is_accepted ? <CheckCircle size={14} /> : idx + 1}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white leading-none mb-1">{s.staff_name}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wide font-black">{s.post}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-4 text-xs font-bold text-slate-300 text-right">
                                            Rs. {parseFloat(s.total_earnings).toLocaleString()}
                                        </td>
                                        <td className="px-2 py-4">
                                            <input type="number" value={s.advance_less} disabled={s.is_accepted}
                                                onChange={e => updateDeduction(s.id, 'advance_less', e.target.value)}
                                                className="w-full bg-slate-800/50 border border-transparent hover:border-indigo-500 disabled:opacity-40 px-2 py-1.5 rounded-lg text-xs text-rose-400 outline-none text-right" />
                                        </td>
                                        <td className="px-2 py-4">
                                            <input type="number" value={s.salary_tax} disabled={s.is_accepted}
                                                onChange={e => updateDeduction(s.id, 'salary_tax', e.target.value)}
                                                className="w-full bg-slate-800/50 border border-transparent hover:border-indigo-500 disabled:opacity-40 px-2 py-1.5 rounded-lg text-xs text-rose-400 outline-none text-right" />
                                        </td>
                                        <td className="px-2 py-4">
                                            <input type="number" value={s.miss_charge} disabled={s.is_accepted}
                                                onChange={e => updateDeduction(s.id, 'miss_charge', e.target.value)}
                                                className="w-full bg-slate-800/50 border border-transparent hover:border-indigo-500 disabled:opacity-40 px-2 py-1.5 rounded-lg text-xs text-rose-400 outline-none text-right" />
                                        </td>
                                        <td className="px-2 py-4">
                                            <input type="number" value={s.payroll_tax} disabled={s.is_accepted}
                                                onChange={e => updateDeduction(s.id, 'payroll_tax', e.target.value)}
                                                className="w-full bg-slate-800/50 border border-transparent hover:border-indigo-500 disabled:opacity-40 px-2 py-1.5 rounded-lg text-xs text-rose-400 outline-none text-right" />
                                        </td>
                                        <td className="px-2 py-4">
                                            <input type="number" value={s.other_less} disabled={s.is_accepted}
                                                onChange={e => updateDeduction(s.id, 'other_less', e.target.value)}
                                                className="w-full bg-slate-800/50 border border-transparent hover:border-indigo-500 disabled:opacity-40 px-2 py-1.5 rounded-lg text-xs text-rose-400 outline-none text-right" />
                                        </td>
                                        <td className="px-2 py-4">
                                            <input type="number" value={s.absent_less} disabled={s.is_accepted}
                                                onChange={e => updateDeduction(s.id, 'absent_less', e.target.value)}
                                                className="w-full bg-slate-800/50 border border-transparent hover:border-indigo-500 disabled:opacity-40 px-2 py-1.5 rounded-lg text-xs text-rose-400 outline-none text-right" />
                                        </td>
                                        <td className="px-3 py-4 text-sm font-black text-indigo-400 text-right">
                                            Rs. {parseFloat(s.net_salary).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                {!s.is_accepted && (
                                                    <button onClick={() => handleUpdate(s.id)}
                                                        className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20" title="Save Deductions">
                                                        <Save size={14} />
                                                    </button>
                                                )}
                                                <button onClick={() => setSelectedSlip(s)}
                                                    className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-700 hover:border-slate-600" title="View Pay Slip">
                                                    <Printer size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {salaries.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-600">
                                                <Calculator size={40} className="mb-3 opacity-20" />
                                                <p className="text-sm font-medium">Click "Generate" to create salary records for {month} {year}.</p>
                                                <p className="text-[10px] uppercase font-black tracking-widest mt-1">Status: No Data</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedSlip && <PaySlipModal slip={selectedSlip} onClose={() => setSelectedSlip(null)} />}
        </div>
    );
};

export default SalaryGenerationPage;
