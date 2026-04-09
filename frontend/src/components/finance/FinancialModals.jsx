import React, { useState, useEffect } from 'react';
import {
    X, Save, Receipt, CheckCircle2, Clock, 
    AlertCircle, Loader2, Printer, History
} from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../Toast';
import { motion, AnimatePresence } from 'framer-motion';

export const BS_MONTHS = ['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];

export const getBSMonthIndex = (dateInput) => {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return 0;
    const m = d.getMonth();
    const date = d.getDate();
    if (m === 3 && date >= 14 || m === 4 && date < 15) return 0;
    if (m === 4 && date >= 15 || m === 5 && date < 15) return 1;
    if (m === 5 && date >= 15 || m === 6 && date < 16) return 2;
    if (m === 6 && date >= 16 || m === 7 && date < 16) return 3;
    if (m === 7 && date >= 16 || m === 8 && date < 16) return 4;
    if (m === 8 && date >= 16 || m === 9 && date < 17) return 5;
    if (m === 9 && date >= 17 || m === 10 && date < 16) return 6;
    if (m === 10 && date >= 16 || m === 11 && date < 15) return 7;
    if (m === 11 && date >= 15 || m === 0 && date < 14) return 8;
    if (m === 0 && date >= 14 || m === 1 && date < 13) return 9;
    if (m === 1 && date >= 13 || m === 2 && date < 14) return 10;
    if (m === 2 && date >= 14 || m === 3 && date < 14) return 11;
    return 0;
};

const PAYMENT_METHODS = [
    { value: 'cash',   label: 'Cash'            },
    { value: 'cheque', label: 'Cheque'           },
    { value: 'online', label: 'Online Transfer'  },
    { value: 'esewa',  label: 'eSewa'            },
    { value: 'khalti', label: 'Khalti'           },
];

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all";
const selectCls = inputCls + " appearance-none";

const Field = ({ label, required, children }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

// ── Collect Fee Modal ─────────────────────────────────────────
export const CollectModal = ({ isOpen, onClose, onSaved, students, structures, initialEnrollment }) => {
    const toast = useToast();
    const today = new Date().toISOString().split('T')[0];
    const EMPTY = {
        student: '', class_fee_detail: '', financial_year: '', month: '',
        amount_due: '', amount_paid: '', discount: '0', fine: '0',
        payment_method: 'cash', payment_date: today, remarks: '', collected_by: '',
    };
    const [form, setForm] = useState(EMPTY);
    const [selectedEnrollment, setSelectedEnrollment] = useState(null);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [ledger, setLedger] = useState(null);
    const [loadingLedger, setLoadingLedger] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            setForm(EMPTY);
            setErrors({});
            setLedger(null);
            if (initialEnrollment) {
                handleEnrollmentChange(initialEnrollment.id);
            } else {
                setSelectedEnrollment(null);
                setSelectedPackage(null);
            }
        }
    }, [isOpen, initialEnrollment]);

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

    const handleEnrollmentChange = async (id) => {
        const enroll = students.find(e => String(e.id) === String(id));
        setSelectedEnrollment(enroll);
        if (enroll) {
            set('student', enroll.student);
            set('enrollment', enroll.id);
            set('financial_year', enroll.financial_year);
            set('class_fee_detail', enroll.class_fee_detail);
            
            // Auto-resolve package
            const pkg = structures.find(s => String(s.id) === String(enroll.fee_structure));
            setSelectedPackage(pkg);
            set('amount_due', enroll.balance || 0);

            // Fetch Ledger
            setLoadingLedger(true);
            try {
                const res = await axios.get(`/fee-enrollments/${enroll.id}/ledger/`);
                setLedger(res.data);
            } catch (err) {
                toast('Could not fetch student ledger', 'error');
            } finally {
                setLoadingLedger(false);
            }
        } else {
            set('student', '');
            set('enrollment', '');
            setSelectedPackage(null);
            setLedger(null);
        }
    };

    const handlePackageChange = (id) => {
        const pkg = structures.find(s => String(s.id) === String(id));
        setSelectedPackage(pkg);
        set('financial_year', pkg?.financial_year || '');
        set('class_fee_detail', '');
    };

    const handleDetailChange = (id) => {
        set('class_fee_detail', id);
    };

    const handleMonthChange = (monthVal) => {
        set('month', monthVal);
        if (!ledger || !monthVal) return;

        const monthIdx = BS_MONTHS.indexOf(monthVal) + 1;
        let totalDemandUpToSelected = 0;
        let totalPaidUpToSelected = 0;

        ledger.monthly_breakdown.forEach(m => {
            if (m.month_idx <= monthIdx) {
                totalDemandUpToSelected += (m.demand || 0);
                totalPaidUpToSelected += (m.paid || 0);
            }
        });

        const currentDues = totalDemandUpToSelected - totalPaidUpToSelected;
        const previousYearArrears = (ledger.summary.previous_year_dues || 0) - (ledger.summary.previous_year_paid || 0);
        
        const totalToCollect = Math.max(0, currentDues + previousYearArrears);
        set('amount_due', totalToCollect);
        
        setForm(p => ({
            ...p,
            _breakdown: {
                current_dues: currentDues,
                arrears: previousYearArrears,
                target_month: monthVal
            }
        }));
    };

    const balance = (parseFloat(form.amount_due) || 0)
        - (parseFloat(form.amount_paid) || 0)
        - (parseFloat(form.discount) || 0)
        + (parseFloat(form.fine) || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});
        try {
            await axios.post('/fee-collections/', form);
            toast('Fee collected successfully');
            onSaved(selectedEnrollment); onClose();
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') setErrors(data);
            else toast('Failed to collect fee', 'error');
        } finally { setSubmitting(false); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <motion.div onClick={onClose} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }}
                        className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
                            <div>
                                <p className="text-lg font-black text-white">Collect Fee</p>
                                {loadingLedger && <p className="text-[10px] text-indigo-400 animate-pulse font-bold uppercase tracking-widest">Validating Ledger...</p>}
                            </div>
                            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                                <Field label="Student (Search by Name / Class / Section)" required>
                                    <select required value={form.enrollment || ''} onChange={e => handleEnrollmentChange(e.target.value)} className={selectCls}>
                                        <option value="">Select student</option>
                                        {students.map(e => (
                                            <option key={e.id} value={e.id}>
                                                {e.student_name} — Class {e.student_class}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.student && <p className="text-red-400 text-xs mt-1">{errors.student}</p>}
                                </Field>

                                {selectedEnrollment && (
                                    <div className="bg-slate-800/50 border border-slate-800 p-4 rounded-xl space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Arrears / Previous Dues</span>
                                            <span className="text-sm font-black text-red-400">Rs. {parseFloat(selectedEnrollment.balance).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                                            <span>Package: {selectedEnrollment.class_fee_name}</span>
                                            <span>Year: {selectedEnrollment.financial_year_name}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Fee Package" required>
                                        <select required value={selectedPackage?.id || ''} onChange={e => handlePackageChange(e.target.value)} className={selectCls}>
                                            <option value="">Select package</option>
                                            {structures.map(s => <option key={s.id} value={s.id}>{s.financial_year_name} — {s.name}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Class Detail" required>
                                        <select required value={form.class_fee_detail} onChange={e => handleDetailChange(e.target.value)} className={selectCls} disabled={!selectedPackage}>
                                            <option value="">Select class</option>
                                            {selectedPackage?.class_details?.map(d => (
                                                <option key={d.id} value={d.id}>Class {d.class_name} {d.faculty ? `(${d.faculty})` : ''}</option>
                                            ))}
                                        </select>
                                        {errors.class_fee_detail && <p className="text-red-400 text-xs mt-1">{errors.class_fee_detail}</p>}
                                    </Field>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Month" required>
                                        <select required value={form.month} onChange={e => handleMonthChange(e.target.value)} className={selectCls}>
                                            <option value="">Select month</option>
                                            {BS_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Payment Date" required>
                                        <input required type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} className={inputCls} />
                                    </Field>
                                </div>

                                {form._breakdown && (
                                    <div className="space-y-3 mt-1">
                                        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4 overflow-hidden">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <History size={12} /> Billing Breakdown: {form._breakdown.target_month}
                                            </p>
                                            <div className="space-y-2">
                                                {(ledger?.monthly_breakdown?.find(m => m.month_name === form._breakdown.target_month)?.items || []).map((it, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-xs">
                                                        <span className={it.amount < 0 ? 'text-emerald-400' : 'text-slate-400'}>{it.name}</span>
                                                        <span className={`font-mono font-bold ${it.amount < 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                                                            {it.amount < 0 ? '- ' : '+ '}Rs. {Math.abs(it.amount).toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                                <div className="pt-2 mt-2 border-t border-slate-700/50 flex justify-between items-center">
                                                    <span className="text-xs font-black text-white">Current Month Net:</span>
                                                    <span className="text-sm font-black text-indigo-400">Rs. {form._breakdown.current_dues.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {form._breakdown.arrears > 0 && (
                                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex justify-between items-center">
                                                <span className="text-xs font-bold text-amber-500/80 italic flex items-center gap-1.5"><AlertCircle size={12} /> Carryover Arrears</span>
                                                <span className="text-sm font-black text-amber-400 font-mono">Rs. {form._breakdown.arrears.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Amount Due (Rs.)" required>
                                        <input required type="number" min="0" value={form.amount_due} onChange={e => set('amount_due', e.target.value)} className={inputCls} />
                                    </Field>
                                    <Field label="Amount Paid (Rs.)" required>
                                        <input required type="number" min="0" value={form.amount_paid} onChange={e => set('amount_paid', e.target.value)} placeholder="0" className={inputCls} />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Discount (Rs.)">
                                        <input type="number" min="0" value={form.discount} onChange={e => set('discount', e.target.value)} className={inputCls} />
                                    </Field>
                                    <Field label="Fine (Rs.)">
                                        <input type="number" min="0" value={form.fine} onChange={e => set('fine', e.target.value)} className={inputCls} />
                                    </Field>
                                </div>

                                {form.amount_due && (
                                    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${balance <= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                        <span className="text-xs font-semibold text-slate-400">Balance</span>
                                        <span className={`text-sm font-black ${balance <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            Rs. {balance.toLocaleString()}
                                        </span>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Payment Method">
                                        <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} className={selectCls}>
                                            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Collected By">
                                        <input value={form.collected_by} onChange={e => set('collected_by', e.target.value)} placeholder="Staff name" className={inputCls} />
                                    </Field>
                                </div>

                                <Field label="Remarks">
                                    <input value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional notes" className={inputCls} />
                                </Field>
                            </div>

                            <div className="flex gap-3 px-6 py-4 border-t border-slate-800 shrink-0">
                                <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-all text-sm">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-[2] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-emerald-500/20">
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Receipt size={15} /> Save Collection</>}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// ── Fee Statement Modal ───────────────────────────────────────
export const FeeStatementModal = ({ isOpen, onClose, enrollment, schoolInfo }) => {
    const [history, setHistory] = useState([]);
    const [ledger, setLedger] = useState(null);
    const [loading, setLoading] = useState(false);
    const [viewType, setViewType] = useState('invoice');

    useEffect(() => {
        if (isOpen && enrollment) {
            setLoading(true);
            Promise.all([
                axios.get(`/fee-collections/?enrollment=${enrollment.id}`),
                axios.get(`/fee-enrollments/${enrollment.id}/ledger/`)
            ])
            .then(([hRes, lRes]) => {
                setHistory(hRes.data);
                setLedger(lRes.data);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
            setViewType('invoice');
        }
    }, [isOpen, enrollment]);

    useEffect(() => {
        if (!loading && isOpen && ledger && enrollment && schoolInfo && enrollment.autoPrint) {
            const timer = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [loading, isOpen, ledger, enrollment, schoolInfo]);

    const handlePrint = () => { window.print(); };

    if (!enrollment) return null;

    const lastPayment = history.length > 0 ? history.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0] : null;
    let invoiceItems = [];
    let dynamicItemNames = [];
    let totalExpectedSoFar = 0;
    let totalPaid = 0;
    let trueTotalDue = 0;

    if (ledger) {
        totalExpectedSoFar = ledger.summary.current_year_total_demand;
        totalPaid = ledger.summary.current_year_total_paid;
        trueTotalDue = ledger.summary.net_balance;
        const itemSet = new Set();
        ledger.monthly_breakdown.forEach(m => {
            m.items?.forEach(it => itemSet.add(it.name));
        });
        dynamicItemNames = Array.from(itemSet).sort();
        invoiceItems = ledger.monthly_breakdown.map(m => {
            const rowItems = {};
            dynamicItemNames.forEach(name => {
                const found = m.items?.find(it => it.name === name);
                rowItems[name] = found ? found.amount : 0;
            });
            return {
                id: m.month_idx,
                monthName: m.month_name,
                dynamicItems: rowItems,
                demand: m.demand,
                paid: m.paid,
                balance: m.demand - m.paid,
                status: m.status,
            };
        });
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:bg-white print:p-0">
                    <motion.div onClick={onClose} className="absolute inset-0 print:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }}
                        className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col print:max-h-full print:rounded-none"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 print:hidden">
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button onClick={() => setViewType('invoice')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewType === 'invoice' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>
                                    Invoice View
                                </button>
                                <button onClick={() => setViewType('history')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewType === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>
                                    Transaction History
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 transition-all"><Printer size={14} /> Print</button>
                                <button onClick={onClose} className="p-2 rounded-xl border border-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all"><X size={18} /></button>
                            </div>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar print:overflow-visible print:p-0 bg-white">
                            <div className="flex justify-between items-start mb-8 border-b-2 border-slate-900 pb-8">
                                <div className="flex gap-6">
                                    {schoolInfo?.logo ? (
                                        <img src={schoolInfo.logo} alt="Logo" className="w-24 h-24 object-contain" />
                                    ) : (
                                        <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-4xl font-black shadow-xl">
                                            {schoolInfo?.school_name?.[0] || 'S'}
                                        </div>
                                    )}
                                    <div>
                                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none mb-2">
                                            {schoolInfo?.school_name || "Sajilo School Management"}
                                        </h1>
                                        <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-1">{schoolInfo?.address}</p>
                                        <p className="text-xs font-medium text-slate-500">{schoolInfo?.phone} {schoolInfo?.email && `| ${schoolInfo.email}`}</p>
                                        <div className="flex items-center gap-3 mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full w-fit">
                                            <Receipt size={12} /> Official Fee Statement
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <div className="bg-slate-900 text-white px-4 py-2 rounded-lg mb-4 text-center min-w-[180px]">
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Net Balance Due</p>
                                        <p className="text-2xl font-black tracking-tighter">Rs. {(trueTotalDue > 0 ? trueTotalDue : 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="text-slate-500 text-[10px] font-bold uppercase space-y-1">
                                        <p><span className="text-slate-400">Student:</span> <span className="text-slate-900">{enrollment.student_name}</span></p>
                                        <p><span className="text-slate-400">Class:</span> <span className="text-slate-900">{enrollment.student_class}</span></p>
                                        <p><span className="text-slate-400">Academic Year:</span> <span className="text-slate-900">{enrollment.financial_year_name}</span></p>
                                    </div>
                                </div>
                            </div>

                            {viewType === 'invoice' ? (
                                <div className="space-y-0">
                                    <div className="border-[1.5px] border-slate-900 rounded-sm overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-widest font-black">
                                                    <th className="px-2 py-3 text-center border-r border-slate-700 w-12 text-slate-400">#</th>
                                                    <th className="px-4 py-3 text-left border-r border-slate-700 w-32">Billing Month</th>
                                                    {dynamicItemNames.map(name => (
                                                        <th key={name} className="px-3 py-3 text-right border-r border-slate-700 font-bold tracking-tighter text-[9px] uppercase leading-tight max-w-[80px]">
                                                            {name}
                                                        </th>
                                                    ))}
                                                    <th className="px-3 py-3 text-right border-r border-slate-700 bg-slate-800 text-indigo-300">Total Demand</th>
                                                    <th className="px-3 py-3 text-right border-r border-slate-700 bg-slate-800 text-emerald-300">Amount Paid</th>
                                                    <th className="px-3 py-3 text-right text-rose-300">Dues</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-slate-800">
                                                {invoiceItems.map((item, idx) => (
                                                    <tr key={item.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${item.balance > 0 ? '' : 'opacity-40 grayscale'}`}>
                                                        <td className="px-2 py-3 text-center border-r border-slate-100 font-medium text-slate-400 text-[10px]">{idx + 1}</td>
                                                        <td className="px-4 py-3 border-r border-slate-100 font-black text-slate-900 text-xs">{item.monthName}</td>
                                                        {dynamicItemNames.map(name => (
                                                            <td key={name} className="px-3 py-3 text-right border-r border-slate-100 font-mono text-[10px] text-slate-600">
                                                                {item.dynamicItems[name] ? item.dynamicItems[name].toLocaleString() : '—'}
                                                            </td>
                                                        ))}
                                                        <td className="px-3 py-3 text-right border-r border-slate-100 font-black text-slate-800 bg-slate-50/50">Rs. {item.demand?.toLocaleString()}</td>
                                                        <td className="px-3 py-3 text-right border-r border-slate-100 font-bold text-emerald-600 bg-slate-50/50">Rs. {item.paid?.toLocaleString()}</td>
                                                        <td className={`px-4 py-3 text-right font-black ${item.balance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                            Rs. {item.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="border-t-2 border-slate-900 bg-slate-50">
                                                <tr className="font-black text-slate-900 bg-slate-100/50">
                                                    <td colSpan={dynamicItemNames.length + 2} className="px-6 py-4 text-right border-r border-slate-200 uppercase tracking-widest text-[11px]">Subtotal Current Year :</td>
                                                    <td className="px-3 py-4 text-right border-r border-slate-200 font-mono text-slate-500">{(totalExpectedSoFar).toLocaleString()}</td>
                                                    <td className="px-3 py-4 text-right border-r border-slate-200 font-mono text-emerald-600">{(totalPaid).toLocaleString()}</td>
                                                    <td className="px-4 py-4 text-right font-mono text-rose-600 text-base">{(totalExpectedSoFar - totalPaid).toLocaleString()}</td>
                                                </tr>
                                                {ledger?.summary.previous_year_dues > 0 && (
                                                <tr className="font-bold text-slate-500 border-t border-slate-100">
                                                    <td colSpan={dynamicItemNames.length + 4} className="px-6 py-3 text-right border-r border-slate-200 uppercase tracking-widest text-[10px]">Previous Year Balance Forward :</td>
                                                    <td className="px-4 py-3 text-right font-mono">{(ledger.summary.previous_year_dues - ledger.summary.previous_year_paid).toLocaleString()}</td>
                                                </tr>
                                                )}
                                                <tr className="bg-slate-900 text-white font-black text-lg">
                                                    <td colSpan={dynamicItemNames.length + 4} className="px-6 py-4 text-right border-r border-slate-700 uppercase tracking-[0.3em] text-[12px]">Net Payable Amount :</td>
                                                    <td className="px-4 py-4 text-right font-mono tracking-tighter text-2xl">Rs. {(trueTotalDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                                {lastPayment && (
                                                <tr className="bg-emerald-50 text-emerald-800 font-bold border-t border-slate-900">
                                                    <td colSpan="8" className="px-6 py-4 text-center text-xs uppercase tracking-[0.2em]">
                                                        Last Payment Captured: {new Date(lastPayment.payment_date).toLocaleDateString()} &bull; Amount: Rs. {parseFloat(lastPayment.amount_paid).toLocaleString()}
                                                    </td>
                                                </tr>
                                                )}
                                            </tfoot>
                                        </table>
                                    </div>
                                    <div className="mt-10 flex justify-between items-center px-1">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Electronic Copy - Verified by Account Dept</p>
                                        <div className="text-right">
                                            <div className="h-10 w-32 border-b border-slate-300 ml-auto mb-1"></div>
                                            <p className="text-[10px] text-slate-500 font-black uppercase">AUTHORIZED SIGNATORY</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Summary of Payments</p>
                                            <p className="text-lg font-black text-slate-800">Received Total: Rs. {parseFloat(enrollment.total_paid).toLocaleString()}</p>
                                        </div>
                                        {lastPayment && (
                                            <div className="text-right text-xs">
                                                <p className="text-slate-400 font-bold">Last Payment</p>
                                                <p className="font-black text-indigo-600">Rs. {parseFloat(lastPayment.amount_paid).toLocaleString()} ({new Date(lastPayment.payment_date).toLocaleDateString()})</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 text-slate-500">
                                                <tr className="text-[10px] font-black uppercase tracking-wider">
                                                    <th className="px-6 py-4 border-b border-slate-100">Date</th>
                                                    <th className="px-6 py-4 border-b border-slate-100">Receipt #</th>
                                                    <th className="px-6 py-4 border-b border-slate-100">Description</th>
                                                    <th className="px-6 py-4 border-b border-slate-100 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {loading ? (
                                                    <tr><td colSpan="4" className="py-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" size={16} /> Loading...</td></tr>
                                                ) : history.length === 0 ? (
                                                    <tr><td colSpan="4" className="py-20 text-center text-slate-400 font-medium italic">No transactions found.</td></tr>
                                                ) : history.map(c => (
                                                    <tr key={c.id} className="text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 font-mono text-xs">{new Date(c.payment_date).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4 font-bold text-slate-900">{c.receipt_number}</td>
                                                        <td className="px-6 py-4">{c.month || 'Fee'}</td>
                                                        <td className="px-6 py-4 text-right font-black text-emerald-600">+Rs. {parseFloat(c.amount_paid).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            <p className="text-[10px] text-slate-400 mt-12 italic text-center print:block hidden border-t border-slate-100 pt-8">
                                System generated invoice. No signature required for validation.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// ── Number to Words Utility ──────────────────────────────────
const numberToWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n) => {
        if ((n = n.toString().split('.')[0]).length > 9) return 'Amount too large';
        let n_str = ('000000000' + n).substr(-9);
        let n_arr = n_str.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n_arr) return '';
        let str = '';
        str += n_arr[1] != 0 ? (a[Number(n_arr[1])] || b[n_arr[1][0]] + ' ' + a[n_arr[1][1]]) + 'Crore ' : '';
        str += n_arr[2] != 0 ? (a[Number(n_arr[2])] || b[n_arr[2][0]] + ' ' + a[n_arr[2][1]]) + 'Lakh ' : '';
        str += n_arr[3] != 0 ? (a[Number(n_arr[3])] || b[n_arr[3][0]] + ' ' + a[n_arr[3][1]]) + 'Thousand ' : '';
        str += n_arr[4] != 0 ? (a[Number(n_arr[4])] || b[n_arr[4][0]] + ' ' + a[n_arr[4][1]]) + 'Hundred ' : '';
        str += n_arr[5] != 0 ? ((str != '') ? 'and ' : '') + (a[Number(n_arr[5])] || b[n_arr[5][0]] + ' ' + a[n_arr[5][1]]) + 'Only' : 'Only';
        return str;
    };
    return inWords(num);
};

// ── Fee Receipt Modal (Traditional Bill Redesign) ─────────────
export const FeeReceiptModal = ({ isOpen, onClose, enrollment, schoolInfo }) => {
    const [history, setHistory] = useState([]);
    const [ledger, setLedger] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && enrollment) {
            setLoading(true);
            Promise.all([
                axios.get(`/fee-collections/?enrollment=${enrollment.id}`),
                axios.get(`/fee-enrollments/${enrollment.id}/ledger/`)
            ])
            .then(([hRes, lRes]) => {
                setHistory(hRes.data);
                setLedger(lRes.data);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
        }
    }, [isOpen, enrollment]);

    useEffect(() => {
        // Trigger auto-print only after loading is complete, history is fetched, and items are ready
        if (!loading && isOpen && history.length > 0 && enrollment && schoolInfo && enrollment.autoPrint) {
            const timer = setTimeout(() => {
                window.print();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [loading, isOpen, history.length, enrollment?.id, enrollment?.autoPrint, schoolInfo]);

    if (!enrollment) return null;

    const receipt = history.length > 0 
        ? history.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0] 
        : null;

    // Itemization Logic
    const getItemizedBreakdown = () => {
        if (!receipt || !ledger) return [];
        
        // 1. Identify which months are covered by the receipt
        // Check both the explicitly selected month AND the auto-allocation logs in remarks
        const rMonth = receipt.month || "";
        const targetMonths = new Set();
        
        // Standard parsing from the 'month' field
        if (rMonth.includes('-')) {
            const [start, end] = rMonth.split('-').map(m => BS_MONTHS.indexOf(m.trim()) + 1);
            if (start && end) {
                for (let i = start; i <= end; i++) targetMonths.add(i);
            }
        } else {
            const idx = BS_MONTHS.indexOf(rMonth.trim()) + 1;
            if (idx > 0) targetMonths.add(idx);
        }

        // Advanced Parsing: Look for "towards [Month] dues" in remarks
        // Backend log format: "Paid Rs. 400.00 towards Baisakh dues"
        if (receipt.remarks) {
            BS_MONTHS.forEach((mName, mIdx) => {
                const regex = new RegExp(`towards ${mName} dues`, 'i');
                if (regex.test(receipt.remarks)) {
                    targetMonths.add(mIdx + 1);
                }
            });
        }

        const monthsArray = Array.from(targetMonths).sort((a, b) => a - b);
        if (monthsArray.length === 0) return [];

        // 2. Extract items from ledger for these months
        const itemsMap = {}; 
        const relevantDemands = ledger.monthly_breakdown.filter(d => monthsArray.includes(d.month_idx));
        
        relevantDemands.forEach(d => {
            d.items.forEach(it => {
                if (!itemsMap[it.name]) {
                    itemsMap[it.name] = { amount: 0, startIdx: d.month_idx, endIdx: d.month_idx };
                }
                itemsMap[it.name].amount += it.amount;
                itemsMap[it.name].startIdx = Math.min(itemsMap[it.name].startIdx, d.month_idx);
                itemsMap[it.name].endIdx = Math.max(itemsMap[it.name].endIdx, d.month_idx);
            });
        });

        return Object.entries(itemsMap).map(([name, info]) => {
            const range = info.startIdx !== info.endIdx 
                ? `(${BS_MONTHS[info.startIdx-1]}-${BS_MONTHS[info.endIdx-1]})`
                : `(${BS_MONTHS[info.startIdx-1]})`;
            return {
                label: `${name} ${range}`,
                amount: info.amount
            };
        });
    };

    const billItems = getItemizedBreakdown();

    if (loading) {
        return (
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white p-12 rounded-3xl flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-indigo-600" size={32} />
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Compiling Bill...</p>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        );
    }

    if (!receipt && !loading && isOpen) {
        return (
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white p-12 rounded-3xl flex flex-col items-center gap-4 max-w-sm text-center text-slate-900 border border-slate-200 shadow-2xl">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-2 mx-auto border border-slate-100">
                                <Printer size={32} />
                            </div>
                            <h3 className="text-xl font-black">Record Not Found</h3>
                            <p className="text-sm text-slate-500 font-medium">No recent transaction identified for this identity profile.</p>
                            <button onClick={onClose} className="mt-6 w-full py-4 bg-slate-950 text-white rounded-2xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl">Dismiss</button>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        );
    }

    const paid = parseFloat(receipt?.amount_paid) || 0;
    const discount = parseFloat(receipt?.discount) || 0;
    const fine = parseFloat(receipt?.fine) || 0;
    const dueBefore = parseFloat(receipt?.amount_due) || 0;
    const balanceRemaining = dueBefore - paid - discount + fine;

    return (
        <AnimatePresence>
            {isOpen && receipt && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:bg-white print:p-0 overflow-y-auto">
                    <motion.div onClick={onClose} className="absolute inset-0 print:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                    <motion.div
                        initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 10 }}
                        className="relative bg-white border border-slate-300 w-full max-w-3xl shadow-2xl overflow-hidden print:max-w-full print:border-none print:shadow-none font-serif text-slate-900"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Document Registry Index</p>
                            <div className="flex items-center gap-3">
                                <button onClick={() => window.print()} className="flex items-center gap-2.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 transition-all"><Printer size={16} /> Print Document</button>
                                <button onClick={onClose} className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={20} /></button>
                            </div>
                        </div>

                        {/* Physical Bill Layout */}
                        <div className="p-6 md:p-8 print:p-4 bg-white min-h-[700px] flex flex-col relative text-[12px] leading-tight">
                            
                            {/* Watermark Section */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
                                {schoolInfo?.logo ? (
                                    <img src={schoolInfo.logo} alt="" className="w-80 h-80 object-contain grayscale" />
                                ) : (
                                    <div className="text-8xl font-black text-slate-900/20">{schoolInfo?.school_name?.[0] || 'S'}</div>
                                )}
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                {/* Header (Institutional Letterhead Style) */}
                                <div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-slate-950/10">
                                     <div className="flex gap-4">
                                         {schoolInfo?.logo ? (
                                             <img src={schoolInfo.logo} alt="Logo" className="w-20 h-20 object-contain" />
                                         ) : (
                                             <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-4xl font-black">
                                                 {schoolInfo?.school_name?.[0] || 'S'}
                                             </div>
                                         )}
                                         <div className="text-left py-1">
                                            <h1 className="text-3xl font-black uppercase tracking-tight mb-1 text-slate-900 leading-none">
                                                {schoolInfo?.school_name || ""}
                                            </h1>
                                            <p className="text-[13px] font-black uppercase tracking-[0.2em] text-indigo-700 mb-1">
                                                {schoolInfo?.address || ""}
                                            </p>
                                            <div className="flex items-center gap-4 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                                                {schoolInfo?.phone && <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-slate-300" /> {schoolInfo.phone}</span>}
                                                {schoolInfo?.email && <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-slate-300" /> {schoolInfo.email}</span>}
                                            </div>
                                         </div>
                                     </div>
                                     <div className="text-right">
                                         <div className="inline-block border-2 border-slate-950 px-6 py-1.5 bg-slate-50">
                                             <h2 className="text-sm font-black uppercase tracking-[0.4em]">Receipt</h2>
                                         </div>
                                     </div>
                                </div>

                                {/* Identity Grid (Boxed - Thick Border) */}
                                <div className="border-2 border-slate-950 grid grid-cols-2 text-[11px] mb-4">
                                    <div className="border-r-2 border-slate-950 p-2 space-y-1">
                                        <div className="flex gap-2"><span className="font-bold w-20 uppercase">Bill No:</span> <span>{receipt.receipt_number}</span></div>
                                        <div className="flex gap-2"><span className="font-bold w-20 uppercase">Student's Name:</span> <span className="uppercase font-black">{enrollment.student_name}</span></div>
                                        <div className="flex gap-2"><span className="font-bold w-20 uppercase">Student ID:</span> <span>{enrollment.student}</span></div>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        <div className="flex gap-2"><span className="font-bold w-20 uppercase">Date:</span> <span>{new Date(receipt.payment_date).toLocaleDateString()}</span></div>
                                        <div className="flex gap-2"><span className="font-bold w-20 uppercase">Roll No:</span> <span>{enrollment.student_roll || '—'}</span></div>
                                        <div className="flex gap-2"><span className="font-bold w-20 uppercase">Class:</span> <span className="font-black">{enrollment.student_class} {enrollment.student_section ? `(${enrollment.student_section})` : ''} - {enrollment.financial_year_name}</span></div>
                                    </div>
                                </div>

                                <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 px-1 text-slate-500 italic">Fee Heading Ledger</div>

                                {/* Fee Table - Thick Border */}
                                <div className="border-2 border-slate-950 min-h-[250px] flex flex-col">
                                    <table className="w-full border-collapse">
                                        <thead className="border-b-2 border-slate-950">
                                            <tr className="bg-slate-50">
                                                <th className="border-r-2 border-slate-950 w-10 px-1 py-1 text-center">S.N.</th>
                                                <th className="border-r-2 border-slate-950 px-4 py-1 text-left uppercase text-[10px]">Particulars</th>
                                                <th className="px-4 py-1 text-right uppercase text-[10px] w-32">Amount (Rs.)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {billItems.length > 0 ? billItems.map((item, idx) => (
                                                <tr key={idx} className="border-b border-slate-300 last:border-b-0">
                                                    <td className="border-r-2 border-slate-950 px-1 py-2 text-center">{idx + 1}.</td>
                                                    <td className="border-r-2 border-slate-950 px-4 py-2 font-bold uppercase text-[10px]">
                                                        {item.label}
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-black italic">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            )) : (
                                                <tr className="border-b border-slate-300">
                                                    <td className="border-r-2 border-slate-950 px-1 py-4 text-center">1.</td>
                                                    <td className="border-r-2 border-slate-950 px-4 py-4 font-bold uppercase">
                                                        {receipt.month ? `${receipt.month} Fee Collection` : 'Direct Fee Settlement'}
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-black italic text-base">{dueBefore.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            )}
                                            {/* Fill height */}
                                            {Array(Math.max(0, 6 - billItems.length)).fill(0).map((_, i) => (
                                                <tr key={`spacer-${i}`}>
                                                    <td className="border-r-2 border-slate-950 h-5 opacity-0">.</td>
                                                    <td className="border-r-2 border-slate-950 h-5 opacity-0"></td>
                                                    <td className="h-5 opacity-0"></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    
                                    {/* Bottom Grid - Thick Bordered Header */}
                                    <div className="mt-auto border-t-2 border-slate-950 bg-white grid grid-cols-2">
                                        <div className="p-3 border-r-2 border-slate-950">
                                            <p className="font-bold uppercase text-[9px] mb-1 text-slate-400 tracking-wider">Account Remarks:</p>
                                            <p className="text-[11px] italic leading-tight text-slate-700">{receipt.remarks || 'Standard transaction recorded.'}</p>
                                        </div>
                                        <div className="flex flex-col">
                                            {[
                                                { label: 'Sub Total (This Bill)', value: dueBefore },
                                                { label: 'Discount', value: discount },
                                                { label: fine > 0 ? 'Fine/Rebate' : 'Fine', value: fine },
                                                { label: 'Total Paid (This Bill)', value: paid, highlight: true },
                                                { label: 'Previous Arrears', value: ledger?.summary ? (ledger.summary.previous_year_dues - ledger.summary.previous_year_paid) : 0, color: 'text-slate-500' },
                                                { label: 'Current Package Dues', value: ledger?.summary ? (ledger.summary.current_year_total_demand - ledger.summary.current_year_total_paid) : 0 },
                                                { label: 'Total Outstanding', value: ledger?.summary ? ledger.summary.net_balance : balanceRemaining, highlight: true, color: 'text-red-700' }
                                            ].map((row, idx) => (
                                                <div key={idx} className={`flex justify-between px-3 py-1 border-b border-slate-200 last:border-0 ${row.highlight ? 'bg-slate-50 font-black italic underline decoration-slate-300' : 'font-medium'}`}>
                                                    <span className="text-[10px] uppercase truncate max-w-[150px]">{row.label}</span>
                                                    <span className={`text-[11px] ${row.color || ''}`}>{parseFloat(row.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Words & Signature Row */}
                                <div className="mt-4 grid grid-cols-5 gap-4">
                                    <div className="col-span-3 pt-1">
                                        <div className="flex gap-2">
                                            <span className="font-bold underline uppercase text-[10px]">In Words:</span>
                                            <span className="italic capitalize font-black text-[11px]">{numberToWords(paid)} Only.</span>
                                        </div>
                                        <p className="text-[8px] text-slate-400 mt-4 font-medium italic">* Verified electronic record for internal audit purposes.</p>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <div className="mt-8 border-b-2 border-slate-950 w-full ml-auto"></div>
                                        <p className="mt-1 font-black uppercase tracking-[0.2em] text-[10px]">Staff Signature</p>
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 text-center text-slate-400">
                                    <div className="flex items-center justify-center gap-3 text-[8px] font-bold uppercase tracking-widest italic">
                                        <span>Copy: Original</span>
                                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                                        <span>Institutional Verification Document</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
