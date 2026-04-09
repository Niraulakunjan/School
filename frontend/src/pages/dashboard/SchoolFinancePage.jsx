import React, { useState, useEffect, useCallback } from 'react';
import {
    Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
    Plus, Pencil, Trash2, X, Loader2, RefreshCw, BarChart3,
    Banknote, ChevronDown, Search, AlertCircle, CheckCircle2, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const INCOME_CATEGORIES = [
    { value: 'fee_income',    label: 'Student Fee Income',        icon: '💰' },
    { value: 'government',    label: 'Government Grant / Fund',   icon: '🏛️' },
    { value: 'donation',      label: 'Donation',                  icon: '🤝' },
    { value: 'bank_interest', label: 'Bank Interest',             icon: '🏦' },
    { value: 'sale',          label: 'Sale of Assets',            icon: '🏷️' },
    { value: 'event',         label: 'Event / Program Income',    icon: '🎪' },
    { value: 'other',         label: 'Other Income',              icon: '📦' },
];
const EXPENSE_CATEGORIES = [
    { value: 'salary',      label: 'Staff Salary',         icon: '👤' },
    { value: 'rent',        label: 'Rent & Lease',          icon: '🏠' },
    { value: 'electricity', label: 'Electricity',           icon: '⚡' },
    { value: 'water',       label: 'Water',                 icon: '💧' },
    { value: 'internet',    label: 'Internet / Phone',      icon: '📶' },
    { value: 'stationery',  label: 'Stationery & Supplies', icon: '📚' },
    { value: 'furniture',   label: 'Furniture & Fixtures',  icon: '🪑' },
    { value: 'equipment',   label: 'Equipment & Technology',icon: '💻' },
    { value: 'maintenance', label: 'Maintenance & Repairs', icon: '🔧' },
    { value: 'sports',      label: 'Sports & Events',       icon: '🏆' },
    { value: 'transport',   label: 'Transport',             icon: '🚌' },
    { value: 'food',        label: 'Food & Refreshments',   icon: '🍱' },
    { value: 'cleaning',    label: 'Cleaning & Sanitation', icon: '🧹' },
    { value: 'bank_charge', label: 'Bank Charges',          icon: '🏦' },
    { value: 'tax',         label: 'Taxes & Govt Fees',     icon: '📋' },
    { value: 'other',       label: 'Miscellaneous',         icon: '📦' },
];
const PAYMENT_METHODS = [
    { value: 'cash',   label: 'Cash' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'online', label: 'Online Transfer' },
    { value: 'bank',   label: 'Bank Deposit / Transfer' },
];

const getCatMeta = (cats, val) => cats.find(c => c.value === val) || { icon: '📦', label: val };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtShort = (n) => {
    n = Number(n || 0);
    if (n >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000)     return `Rs. ${(n / 1_000).toFixed(0)}K`;
    return `Rs. ${n}`;
};
const fmt = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const monthLabel = (key) => {
    const [y, m] = key.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
};
const getFirstOfYear = () => `${new Date().getFullYear()}-01-01`;
const getTodayISO    = () => new Date().toISOString().split('T')[0];

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, children }) => (
    <AnimatePresence>
        {open && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                onClick={e => e.target === e.currentTarget && onClose()}>
                <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                    className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                    {children}
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

// ─── Income Form ──────────────────────────────────────────────────────────────
const IncomeForm = ({ initial, onSave, onClose, saving }) => {
    const [form, setForm] = useState(initial || {
        date: getTodayISO(), title: '', category: 'other', amount: '',
        description: '', received_from: '', payment_method: 'cash', reference_no: ''
    });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
    return (
        <div>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <h2 className="text-white font-black text-base flex items-center gap-2">
                    <ArrowUpRight size={18} className="text-emerald-400" />
                    {initial?.id ? 'Edit Income' : 'Add Income'}
                </h2>
                <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date *</label>
                        <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-emerald-500 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount (Rs.) *</label>
                        <input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-emerald-500 transition-all" />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Title / Narration *</label>
                    <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                        placeholder="e.g. Monthly fee collection — April 2026"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-emerald-500 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
                        <div className="relative">
                            <select value={form.category} onChange={e => set('category', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-4 pr-10 text-white text-sm outline-none focus:border-emerald-500 transition-all appearance-none">
                                {INCOME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment Method</label>
                        <div className="relative">
                            <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-4 pr-10 text-white text-sm outline-none focus:border-emerald-500 transition-all appearance-none">
                                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Received From</label>
                    <input type="text" value={form.received_from} onChange={e => set('received_from', e.target.value)}
                        placeholder="Person / organization name"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-emerald-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference / Voucher No.</label>
                    <input type="text" value={form.reference_no} onChange={e => set('reference_no', e.target.value)}
                        placeholder="Cheque no., receipt no., etc."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-emerald-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                    <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                        placeholder="Optional notes..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-emerald-500 transition-all resize-none" />
                </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-bold hover:border-slate-600 transition-all">Cancel</button>
                <button onClick={() => onSave(form)} disabled={saving || !form.title || !form.amount || !form.date}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {initial?.id ? 'Update' : 'Save Income'}
                </button>
            </div>
        </div>
    );
};

// ─── Expenditure Form ─────────────────────────────────────────────────────────
const ExpenditureForm = ({ initial, onSave, onClose, saving }) => {
    const [form, setForm] = useState(initial || {
        date: getTodayISO(), title: '', category: 'other', amount: '',
        description: '', paid_to: '', payment_method: 'cash', receipt_no: ''
    });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
    return (
        <div>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <h2 className="text-white font-black text-base flex items-center gap-2">
                    <ArrowDownRight size={18} className="text-rose-400" />
                    {initial?.id ? 'Edit Expenditure' : 'Add Expenditure'}
                </h2>
                <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date *</label>
                        <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-rose-500 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount (Rs.) *</label>
                        <input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-rose-500 transition-all" />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Title / Narration *</label>
                    <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                        placeholder="e.g. Electricity bill — April 2026"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-rose-500 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
                        <div className="relative">
                            <select value={form.category} onChange={e => set('category', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-4 pr-10 text-white text-sm outline-none focus:border-rose-500 transition-all appearance-none">
                                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment Method</label>
                        <div className="relative">
                            <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-4 pr-10 text-white text-sm outline-none focus:border-rose-500 transition-all appearance-none">
                                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Paid To (Vendor / Staff)</label>
                    <input type="text" value={form.paid_to} onChange={e => set('paid_to', e.target.value)}
                        placeholder="e.g. Nepal Electricity Authority"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-rose-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Receipt / Voucher No.</label>
                    <input type="text" value={form.receipt_no} onChange={e => set('receipt_no', e.target.value)}
                        placeholder="Optional receipt number"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-rose-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                    <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                        placeholder="Optional notes..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-rose-500 transition-all resize-none" />
                </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-bold hover:border-slate-600 transition-all">Cancel</button>
                <button onClick={() => onSave(form)} disabled={saving || !form.title || !form.amount || !form.date}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {initial?.id ? 'Update' : 'Save Expenditure'}
                </button>
            </div>
        </div>
    );
};

// ─── Monthly Chart (pure CSS) ─────────────────────────────────────────────────
const MonthlyChart = ({ data }) => {
    const max = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
    if (data.length === 0) return (
        <div className="h-40 flex items-center justify-center text-slate-600">
            <BarChart3 size={28} className="mr-2" /> No data for this period
        </div>
    );
    return (
        <div className="overflow-x-auto pb-2">
            <div className="flex items-end gap-3 min-w-max h-44">
                {data.map((d, i) => (
                    <div key={d.month} className="flex flex-col items-center gap-1" style={{ minWidth: 52 }}>
                        <div className="flex items-end gap-1 h-36">
                            <div className="relative group w-5">
                                <motion.div className="bg-emerald-500/80 hover:bg-emerald-400 rounded-t-md w-full cursor-pointer"
                                    initial={{ height: 0 }} animate={{ height: `${(d.income / max) * 100}%` }}
                                    transition={{ delay: i * 0.04, duration: 0.5 }}
                                    style={{ minHeight: d.income > 0 ? 4 : 0 }} />
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-emerald-400 font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                    {fmtShort(d.income)}
                                </div>
                            </div>
                            <div className="relative group w-5">
                                <motion.div className="bg-rose-500/80 hover:bg-rose-400 rounded-t-md w-full cursor-pointer"
                                    initial={{ height: 0 }} animate={{ height: `${(d.expense / max) * 100}%` }}
                                    transition={{ delay: i * 0.04 + 0.02, duration: 0.5 }}
                                    style={{ minHeight: d.expense > 0 ? 4 : 0 }} />
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-rose-400 font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                    {fmtShort(d.expense)}
                                </div>
                            </div>
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold whitespace-nowrap">{monthLabel(d.month)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Record Row ───────────────────────────────────────────────────────────────
const RecordRow = ({ rec, type, onEdit, onDelete }) => {
    const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const meta = getCatMeta(cats, rec.category);
    const isIncome = type === 'income';
    return (
        <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors group">
            <td className="pl-5 py-3 text-lg w-10">{meta.icon}</td>
            <td className="px-3 py-3">
                <p className="text-sm font-bold text-white leading-none">{rec.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{isIncome ? rec.received_from : rec.paid_to}</p>
            </td>
            <td className="px-3 py-3">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg">{meta.label}</span>
            </td>
            <td className="px-3 py-3 text-[11px] text-slate-500 font-bold whitespace-nowrap">{rec.date}</td>
            <td className="px-3 py-3">
                <span className="text-[10px] font-bold text-slate-400 capitalize">{rec.payment_method?.replace('_', ' ')}</span>
            </td>
            <td className="px-3 py-3 text-right">
                <span className={`text-sm font-black ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isIncome ? '+' : '−'}{fmt(rec.amount)}
                </span>
            </td>
            <td className="px-3 py-3">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(rec)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                        <Pencil size={13} />
                    </button>
                    <button onClick={() => onDelete(rec)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                        <Trash2 size={13} />
                    </button>
                </div>
            </td>
        </motion.tr>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const SchoolFinancePage = () => {
    const toast = useToast();

    // Date filter
    const [fromDate, setFromDate] = useState(getFirstOfYear());
    const [toDate,   setToDate]   = useState(getTodayISO());

    // Overview
    const [overview, setOverview] = useState(null);
    const [ovLoading, setOvLoading] = useState(false);

    // Tabs
    const [activeTab, setActiveTab] = useState('overview'); // overview | income | expense

    // Records
    const [incomeList,  setIncomeList]  = useState([]);
    const [expenseList, setExpenseList] = useState([]);
    const [listLoading, setListLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');

    // Modals
    const [incomeModal,  setIncomeModal]  = useState(false);
    const [expenseModal, setExpenseModal] = useState(false);
    const [editRecord,   setEditRecord]   = useState(null);
    const [saving,       setSaving]       = useState(false);

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState(null); // {type, id, title}

    const params = { from_date: fromDate, to_date: toDate };

    const fetchOverview = useCallback(async () => {
        setOvLoading(true);
        try {
            const r = await axios.get('/school-expenditure/overview/', { params });
            setOverview(r.data);
        } catch { toast('Failed to load overview', 'error'); }
        finally { setOvLoading(false); }
    }, [fromDate, toDate]);

    const fetchLists = useCallback(async () => {
        setListLoading(true);
        try {
            const [incR, expR] = await Promise.all([
                axios.get('/school-income/', { params }),
                axios.get('/school-expenditure/', { params }),
            ]);
            setIncomeList(incR.data?.results || incR.data || []);
            setExpenseList(expR.data?.results || expR.data || []);
        } catch { toast('Failed to load records', 'error'); }
        finally { setListLoading(false); }
    }, [fromDate, toDate]);

    useEffect(() => { fetchOverview(); }, [fetchOverview]);
    useEffect(() => { if (activeTab !== 'overview') fetchLists(); }, [activeTab, fetchLists]);

    // ── CRUD ──
    const saveIncome = async (form) => {
        setSaving(true);
        try {
            if (form.id) await axios.put(`/school-income/${form.id}/`, form);
            else         await axios.post('/school-income/', form);
            toast(form.id ? 'Income updated' : 'Income saved', 'success');
            setIncomeModal(false); setEditRecord(null);
            fetchOverview(); fetchLists();
        } catch { toast('Failed to save income', 'error'); }
        finally { setSaving(false); }
    };

    const saveExpenditure = async (form) => {
        setSaving(true);
        try {
            if (form.id) await axios.put(`/school-expenditure/${form.id}/`, form);
            else         await axios.post('/school-expenditure/', form);
            toast(form.id ? 'Expenditure updated' : 'Expenditure saved', 'success');
            setExpenseModal(false); setEditRecord(null);
            fetchOverview(); fetchLists();
        } catch { toast('Failed to save expenditure', 'error'); }
        finally { setSaving(false); }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            const url = deleteTarget.type === 'income'
                ? `/school-income/${deleteTarget.id}/`
                : `/school-expenditure/${deleteTarget.id}/`;
            await axios.delete(url);
            toast('Deleted successfully', 'success');
            setDeleteTarget(null);
            fetchOverview(); fetchLists();
        } catch { toast('Failed to delete', 'error'); }
    };

    // Filter lists
    const filterList = (list) => list.filter(r => {
        const matchSearch = `${r.title} ${r.received_from || ''} ${r.paid_to || ''}`.toLowerCase().includes(search.toLowerCase());
        const matchCat = catFilter ? r.category === catFilter : true;
        return matchSearch && matchCat;
    });

    const ov = overview || {};
    const income  = ov.income  || { total: 0, count: 0, by_category: [], by_method: [] };
    const expense = ov.expense || { total: 0, count: 0, by_category: [] };
    const net     = ov.net_balance ?? 0;
    const trend   = ov.monthly_trend || [];
    const netPos  = net >= 0;

    const TABS = [
        { key: 'overview',  label: '📊 Overview' },
        { key: 'income',    label: '💰 Income' },
        { key: 'expense',   label: '💸 Expenditure' },
    ];

    return (
        <div className="space-y-5">

            {/* ─── Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                            <Wallet size={20} />
                        </div>
                        School Finance
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Track school income & expenditure independently of student fees.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { setEditRecord(null); setIncomeModal(true); setActiveTab('income'); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-500/20">
                        <Plus size={15} /> Add Income
                    </button>
                    <button onClick={() => { setEditRecord(null); setExpenseModal(true); setActiveTab('expense'); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-all shadow-lg shadow-rose-500/20">
                        <Plus size={15} /> Add Expenditure
                    </button>
                </div>
            </div>

            {/* ─── Date Filter ─────────────────────────────────────────────── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">From</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">To</label>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-indigo-500 transition-all" />
                </div>
                <button onClick={() => { fetchOverview(); fetchLists(); }}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm font-bold px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 transition-all ml-auto">
                    <RefreshCw size={13} /> Apply
                </button>
            </div>

            {/* ─── Tabs ────────────────────────────────────────────────────── */}
            <div className="flex rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 w-fit">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        className={`px-5 py-2.5 text-sm font-bold transition-all ${
                            activeTab === t.key
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-white'
                        }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ═══════════════ OVERVIEW TAB ══════════════════════════════════ */}
            {activeTab === 'overview' && (
                ovLoading ? (
                    <div className="h-48 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Loading...</p>
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

                        {/* KPI Row */}
                        <div className="flex flex-wrap gap-4">
                            {/* Income */}
                            <div className="flex-1 min-w-[160px] rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-emerald-400">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Income</p>
                                <p className="text-3xl font-black mt-1">{fmtShort(income.total)}</p>
                                <p className="text-xs opacity-50 mt-1">{income.count} records</p>
                            </div>
                            {/* Expense */}
                            <div className="flex-1 min-w-[160px] rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-rose-400">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Expenditure</p>
                                <p className="text-3xl font-black mt-1">{fmtShort(expense.total)}</p>
                                <p className="text-xs opacity-50 mt-1">{expense.count} records</p>
                            </div>
                            {/* Net */}
                            <div className={`flex-1 min-w-[200px] rounded-2xl border-2 p-5 ${
                                netPos ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 text-emerald-300'
                                       : 'border-rose-500/40 bg-gradient-to-br from-rose-500/10 to-pink-500/5 text-rose-300'
                            }`}>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Net Balance</p>
                                <p className="text-4xl font-black mt-1">{fmtShort(Math.abs(net))}</p>
                                <p className="text-xs font-bold opacity-60 mt-1">{netPos ? '▲ Surplus' : '▼ Deficit'}</p>
                                {(income.total + expense.total) > 0 && (
                                    <div className="mt-3">
                                        <div className="flex h-2 rounded-full overflow-hidden gap-px">
                                            <div className="bg-emerald-400 rounded-l-full" style={{ width: `${(income.total / (income.total + expense.total)) * 100}%` }} />
                                            <div className="bg-rose-400 rounded-r-full flex-1" />
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold opacity-50 mt-1">
                                            <span>Income {Math.round((income.total / (income.total + expense.total)) * 100)}%</span>
                                            <span>{Math.round((expense.total / (income.total + expense.total)) * 100)}% Expense</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Chart + Breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-sm font-black text-white">Monthly Trend</h2>
                                        <p className="text-[11px] text-slate-500 mt-0.5">Income vs Expenditure by month</p>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-bold">
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Income</span>
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" /> Expense</span>
                                    </div>
                                </div>
                                <MonthlyChart data={trend} />
                            </div>

                            {/* Expense categories */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                                <h2 className="text-sm font-black text-white mb-4">Expenditure by Category</h2>
                                {expense.by_category.length === 0 ? (
                                    <p className="text-slate-600 text-sm text-center py-8">No expenditures yet</p>
                                ) : (
                                    <div className="space-y-3">
                                        {expense.by_category.map(c => {
                                            const meta = getCatMeta(EXPENSE_CATEGORIES, c.category);
                                            const pct = expense.total > 0 ? (c.total / expense.total) * 100 : 0;
                                            return (
                                                <div key={c.category} className="flex items-center gap-2.5">
                                                    <span className="text-base shrink-0">{meta.icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between mb-1">
                                                            <p className="text-[11px] font-bold text-slate-300 truncate">{meta.label}</p>
                                                            <p className="text-[11px] font-black text-white ml-1 shrink-0">{fmtShort(c.total)}</p>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <motion.div className="h-full rounded-full bg-rose-500/70"
                                                                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                                                transition={{ duration: 0.6 }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Income breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                                <h2 className="text-sm font-black text-white mb-4">Income by Category</h2>
                                {income.by_category.length === 0 ? (
                                    <p className="text-slate-600 text-sm text-center py-8">No income yet — <button onClick={() => { setIncomeModal(true); setEditRecord(null); }} className="text-emerald-400 hover:underline">add first entry</button></p>
                                ) : (
                                    <div className="space-y-3">
                                        {income.by_category.map(c => {
                                            const meta = getCatMeta(INCOME_CATEGORIES, c.category);
                                            const pct = income.total > 0 ? (c.total / income.total) * 100 : 0;
                                            return (
                                                <div key={c.category} className="flex items-center gap-2.5">
                                                    <span className="text-base shrink-0">{meta.icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between mb-1">
                                                            <p className="text-[11px] font-bold text-slate-300 truncate">{meta.label}</p>
                                                            <p className="text-[11px] font-black text-white ml-1 shrink-0">{fmtShort(c.total)}</p>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <motion.div className="h-full rounded-full bg-emerald-500/70"
                                                                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                                                transition={{ duration: 0.6 }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                                <h2 className="text-sm font-black text-white mb-4">Income by Payment Method</h2>
                                {income.by_method.length === 0 ? (
                                    <p className="text-slate-600 text-sm text-center py-8">No income records</p>
                                ) : (
                                    <div className="space-y-3">
                                        {income.by_method.map(m => {
                                            const pct = income.total > 0 ? (m.total / income.total) * 100 : 0;
                                            const colors = { cash: 'bg-emerald-500', cheque: 'bg-blue-500', online: 'bg-violet-500', bank: 'bg-teal-500' };
                                            return (
                                                <div key={m.payment_method}>
                                                    <div className="flex justify-between text-xs font-bold mb-1">
                                                        <span className="text-slate-300 capitalize">{m.payment_method}</span>
                                                        <span className="text-white">{fmtShort(m.total)}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <motion.div className={`h-full rounded-full ${colors[m.payment_method] || 'bg-slate-500'}`}
                                                            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                                            transition={{ duration: 0.6 }} />
                                                    </div>
                                                    <p className="text-[10px] text-slate-600 font-bold mt-0.5">{pct.toFixed(1)}%</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )
            )}

            {/* ═══════════════ LIST TABS (income / expense) ══════════════════ */}
            {(activeTab === 'income' || activeTab === 'expense') && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600" />
                        </div>
                        <div className="relative">
                            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-9 pr-10 text-white text-sm outline-none focus:border-indigo-500 transition-all appearance-none min-w-[160px]">
                                <option value="">All Categories</option>
                                {(activeTab === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c =>
                                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                        <button onClick={() => { setEditRecord(null); activeTab === 'income' ? setIncomeModal(true) : setExpenseModal(true); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow-lg ml-auto ${
                                activeTab === 'income' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                            }`}>
                            <Plus size={15} /> Add {activeTab === 'income' ? 'Income' : 'Expenditure'}
                        </button>
                    </div>

                    {listLoading ? (
                        <div className="h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
                    ) : (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-800/50 border-b border-slate-800">
                                            <th className="pl-5 py-3 w-10" />
                                            <th className="px-3 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Title</th>
                                            <th className="px-3 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                                            <th className="px-3 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                                            <th className="px-3 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Method</th>
                                            <th className="px-3 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                                            <th className="px-3 py-3 w-16" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filterList(activeTab === 'income' ? incomeList : expenseList).map(rec => (
                                            <RecordRow key={rec.id} rec={rec} type={activeTab}
                                                onEdit={(r) => { setEditRecord(r); activeTab === 'income' ? setIncomeModal(true) : setExpenseModal(true); }}
                                                onDelete={(r) => setDeleteTarget({ type: activeTab, id: r.id, title: r.title })} />
                                        ))}
                                        {filterList(activeTab === 'income' ? incomeList : expenseList).length === 0 && (
                                            <tr><td colSpan={7} className="py-12 text-center text-slate-600">
                                                <AlertCircle size={24} className="mx-auto mb-2" />
                                                <p className="text-sm font-bold">No {activeTab} records found</p>
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-5 py-3 border-t border-slate-800 text-[11px] text-slate-600 font-bold">
                                {filterList(activeTab === 'income' ? incomeList : expenseList).length} records
                                · Total: {fmt(filterList(activeTab === 'income' ? incomeList : expenseList).reduce((s, r) => s + Number(r.amount), 0))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Income Modal ─────────────────────────────────────────────── */}
            <Modal open={incomeModal} onClose={() => { setIncomeModal(false); setEditRecord(null); }}>
                <IncomeForm initial={editRecord} onSave={saveIncome}
                    onClose={() => { setIncomeModal(false); setEditRecord(null); }} saving={saving} />
            </Modal>

            {/* ─── Expenditure Modal ────────────────────────────────────────── */}
            <Modal open={expenseModal} onClose={() => { setExpenseModal(false); setEditRecord(null); }}>
                <ExpenditureForm initial={editRecord} onSave={saveExpenditure}
                    onClose={() => { setExpenseModal(false); setEditRecord(null); }} saving={saving} />
            </Modal>

            {/* ─── Delete Confirm ───────────────────────────────────────────── */}
            <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
                            <Trash2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-white font-black">Delete Record?</h2>
                            <p className="text-slate-400 text-sm mt-0.5">"{deleteTarget?.title}"</p>
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm mb-5">This action cannot be undone.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteTarget(null)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-bold hover:border-slate-600 transition-all">Cancel</button>
                        <button onClick={confirmDelete}
                            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-all">Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SchoolFinancePage;
