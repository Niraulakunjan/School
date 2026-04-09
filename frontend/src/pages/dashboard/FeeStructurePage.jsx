import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, X, Save, Pencil, DollarSign, GraduationCap, Copy, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import FinancialYearModal from '../../components/FinancialYearModal';

const FREQUENCIES = [
    { value: 'monthly',   label: 'Monthly'   },
    { value: 'one_time',  label: 'One Time'  },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly',    label: 'Yearly'    },
];

const EMPTY_ITEM = { name: '', amount: '', frequency: 'monthly', is_optional: false, billing_months: '1,2,3,4,5,6,7,8,9,10,11,12' };
const NEPALI_MONTHS = ["Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

const EMPTY_MONTHLY_FEES = NEPALI_MONTHS.map((_, idx) => ({ 
    month: idx + 1, 
    tuition_fee: '', 
    bus_fee: '', 
    other_fee: '' 
}));

const EMPTY_CLASS = { 
    class_name: '', 
    faculty: '', 
    items: [], 
    monthly_fees: [...EMPTY_MONTHLY_FEES],
    mode: 'structured' // 'structured' or 'flexible'
};
const EMPTY_FORM = { financial_year: '', name: '', description: '', is_active: true, class_details: [{ ...EMPTY_CLASS }] };


// ── Month Selector Component ──────────────────────────────────
const MonthSelector = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const selected = value ? value.split(',') : [];
    
    const toggleMonth = (m) => {
        const idx = (m + 1).toString();
        let next;
        if (selected.includes(idx)) {
            next = selected.filter(s => s !== idx).sort((a,b) => parseInt(a)-parseInt(b));
        } else {
            next = [...selected, idx].sort((a,b) => parseInt(a)-parseInt(b));
        }
        onChange(next.join(','));
    };

    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(!open)} 
                className={`w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-1.5 px-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between hover:border-indigo-500/50
                    ${selected.length === 12 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                <span>{selected.length === 12 ? 'Full Cycle' : `${selected.length} Months`}</span>
                <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                        <motion.div 
                            initial={{ opacity: 0, y: 8, scale: 0.95 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            className="absolute z-20 top-full mt-2 right-0 w-56 bg-slate-900/90 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-3"
                        >
                            <div className="grid grid-cols-3 gap-1.5 mb-3">
                                {NEPALI_MONTHS.map((name, idx) => {
                                    const isSel = selected.includes((idx + 1).toString());
                                    return (
                                        <button key={idx} type="button" onClick={() => toggleMonth(idx)}
                                            className={`h-9 rounded-lg flex flex-col items-center justify-center transition-all border
                                                ${isSel ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40 shadow-lg shadow-indigo-500/10' : 'bg-slate-800/40 text-slate-500 border-transparent hover:bg-slate-800 hover:text-slate-300'}`}>
                                            <span className="text-[11px] font-black leading-none">{name.substring(0, 3)}</span>
                                            <span className="text-[7px] font-bold opacity-60 mt-0.5">{idx + 1}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex gap-1.5">
                                <button type="button" onClick={() => onChange('1,2,3,4,5,6,7,8,9,10,11,12')} 
                                    className="flex-1 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-indigo-500/20 transition-all">
                                    Select All
                                </button>
                                <button type="button" onClick={() => onChange('')} 
                                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-700 transition-all">
                                    Clear
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all";
const selectCls = inputCls + " appearance-none";

// ── Class Detail Card ──────────────────────────────────────────
const ClassDetailCard = ({ detail, index, onUpdate, onRemove, classes }) => {
    const [open, setOpen] = useState(true);

    const updateMonthlyFee = (mIdx, field, value) => {
        const newMonthly = detail.monthly_fees.map((m, idx) => idx === mIdx ? { ...m, [field]: value } : m);
        onUpdate(index, { ...detail, monthly_fees: newMonthly });
    };

    const bulkApply = () => {
        const first = detail.monthly_fees[0];
        const newMonthly = detail.monthly_fees.map(m => ({
            ...m,
            tuition_fee: first.tuition_fee,
            bus_fee: first.bus_fee,
            other_fee: first.other_fee,
        }));
        onUpdate(index, { ...detail, monthly_fees: newMonthly });
    };

    const addItem = () => {
        onUpdate(index, { ...detail, items: [...(detail.items || []), { ...EMPTY_ITEM }] });
    };

    const updateItem = (iIdx, field, value) => {
        let newItems = detail.items.map((item, idx) => idx === iIdx ? { ...item, [field]: value } : item);
        
        // Automated Billing Months based on Frequency
        if (field === 'frequency') {
            newItems = newItems.map((item, idx) => {
                if (idx !== iIdx) return item;
                let months = item.billing_months;
                if (value === 'monthly') months = '1,2,3,4,5,6,7,8,9,10,11,12';
                else if (value === 'quarterly') months = '1,4,7,10';
                else if (value === 'yearly' || value === 'one_time') months = '1';
                return { ...item, billing_months: months };
            });
        }
        
        onUpdate(index, { ...detail, items: newItems });
    };


    const removeItem = (iIdx) => {
        const newItems = detail.items.filter((_, idx) => idx !== iIdx);
        onUpdate(index, { ...detail, items: newItems });
    };


    const totalFlexible = detail.items?.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) || 0;
    const totalStructured = detail.monthly_fees?.reduce((s, m) => s + (parseFloat(m.tuition_fee) || 0) + (parseFloat(m.bus_fee) || 0) + (parseFloat(m.other_fee) || 0), 0) || 0;
    const total = (detail.mode === 'flexible' ? totalFlexible : totalStructured);


    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-3 flex-1">
                    <button type="button" onClick={() => setOpen(!open)} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400">
                        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <select required value={detail.class_name} onChange={e => {
                         const cls = classes.find(c => c.name === e.target.value);
                         onUpdate(index, { ...detail, class_name: e.target.value, faculty: cls?.faculty || detail.faculty });
                    }} className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 cursor-pointer p-0 min-w-[120px]">
                        <option value="" className="bg-slate-900">Select Class</option>
                        {classes.map(c => <option key={c.id} value={c.name} className="bg-slate-900">{c.name}</option>)}
                    </select>
                    <input value={detail.faculty} onChange={e => onUpdate(index, { ...detail, faculty: e.target.value })}
                        placeholder="Faculty (opt)" className="bg-transparent border-none text-xs text-indigo-400 focus:ring-0 p-0 w-24" />
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                        Rs. {(Number(total) || 0).toLocaleString()}
                    </span>
                    <button type="button" onClick={() => onRemove(index)} className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="p-4">
                            <div className="space-y-3">
                                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                                    <p className="col-span-4">Fee Name</p>
                                    <p className="col-span-3">Amount</p>
                                    <p className="col-span-2">Freq.</p>
                                    <p className="col-span-2 text-center">Billing Months</p>
                                    <p className="col-span-1" />
                                </div>
                                {detail.items?.map((item, i) => (
                                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                        <input value={item.name} onChange={e => updateItem(i, 'name', e.target.value)}
                                            placeholder="Tuition..." required className={inputCls + " col-span-4 !py-1.5 !text-xs"} />
                                        <input type="number" value={item.amount} onChange={e => updateItem(i, 'amount', e.target.value)}
                                            placeholder="0" required className={inputCls + " col-span-3 !py-1.5 !text-xs"} />
                                        <select value={item.frequency} onChange={e => updateItem(i, 'frequency', e.target.value)}
                                            className={selectCls + " col-span-2 !py-1.5 !text-xs"}>
                                            {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                        </select>
                                        <div className="col-span-2">
                                            <MonthSelector value={item.billing_months} onChange={v => updateItem(i, 'billing_months', v)} />
                                        </div>
                                        <button type="button" onClick={() => removeItem(i)} disabled={detail.items.length === 1}
                                            className="col-span-1 flex justify-center p-1.5 hover:text-red-400 text-slate-600 disabled:opacity-20">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addItem}
                                    className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-slate-700 hover:border-slate-500 rounded-xl text-[11px] text-slate-500 hover:text-slate-300 transition-all">
                                    <Plus size={12} /> Add Item
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>

        </div>
    );
};

// ── Main Modal ────────────────────────────────────────────────
const StructureModal = ({ isOpen, onClose, onSaved, editing, classes, financialYears }) => {
    const toast = useToast();
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        if (editing) {
            setForm({
                financial_year: editing.financial_year,
                name: editing.name,
                description: editing.description || '',
                is_active: editing.is_active,
                class_details: editing.class_details.map(d => ({
                    class_name: d.class_name,
                    faculty: d.faculty || '',
                    items: d.items.map(i => ({ name: i.name, amount: i.amount, frequency: i.frequency, is_optional: i.is_optional, billing_months: i.billing_months })),
                    monthly_fees: d.monthly_fees?.length ? d.monthly_fees : [...EMPTY_MONTHLY_FEES],
                    mode: d.monthly_fees?.length ? 'structured' : 'flexible'
                }))

            });
        } else {
            setForm({ ...EMPTY_FORM, class_details: [{ ...EMPTY_CLASS, items: [{ ...EMPTY_ITEM }] }] });
        }
    }, [isOpen, editing]);

    const setField = (f, v) => setForm(p => ({ ...p, [f]: v }));
    
    const updateDetail = (idx, newData) => {
        setForm(p => ({ ...p, class_details: p.class_details.map((d, i) => i === idx ? newData : d) }));
    };

    const addClass = () => setForm(p => ({ ...p, class_details: [...p.class_details, { ...EMPTY_CLASS, items: [{ ...EMPTY_ITEM }] }] }));
    const removeClass = (idx) => setForm(p => ({ ...p, class_details: p.class_details.filter((_, i) => i !== idx) }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        
        // Sanitize form data to prevent 400 Bad Request from extra fields
        // Keep class_details ID if present, but strip UI-only metadata
        const sanitized = {
            ...form,
            class_details: form.class_details.map(d => {
                const { mode, total_amount, monthly_fees, id, ...rest } = d;
                return {
                    ...rest,
                    id, 
                    items: d.items.map(item => {
                        const { id: itemId, ...itemRest } = item;
                        return itemRest;
                    })
                };
            })


        };

        try {
            editing?.id 
                ? await axios.put(`/fee-structures/${editing.id}/`, sanitized)
                : await axios.post('/fee-structures/', sanitized);

            toast(`Fee structure ${editing?.id ? 'updated' : 'created'}`);
            onSaved(); onClose();
        } catch (err) {
            console.error("FEE STRUCTURE SAVE ERROR:", err.response?.data || err);
            const data = err.response?.data;
            if (data?.class_details) {
                const errorObj = Array.isArray(data.class_details) ? (data.class_details.find(x => x && Object.keys(x).length > 0) || data.class_details[0]) : data.class_details;
                toast(JSON.stringify(errorObj || "Validation error"), 'error');
            } else if (data?.detail) {
                toast(data.detail, 'error');
            } else {
                toast('Failed to save. Check console for details.', 'error');
            }
        } finally { setSubmitting(false); }

    };



    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <motion.div onClick={onClose} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }}
                        className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
                    >
                        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                            <div>
                                <p className="text-lg font-black text-white">{editing?.id ? 'Edit' : 'New'} Fee Package</p>
                                <p className="text-xs text-slate-500 mt-0.5">Define fees for multiple classes under one year.</p>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Package Name</label>
                                        <input required value={form.name} onChange={e => setField('name', e.target.value)}
                                            placeholder="e.g. Regular Academic Fees" className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Academic Year</label>
                                        <select required value={form.financial_year} onChange={e => setField('financial_year', e.target.value)} className={selectCls}>
                                            <option value="">Select Year</option>
                                            {financialYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm font-black text-white uppercase tracking-widest text-indigo-400">Class Breakdown</p>
                                        <button type="button" onClick={addClass} className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300">
                                            <Plus size={14} /> Add Another Class
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {form.class_details?.map((detail, i) => (
                                            <ClassDetailCard key={i} index={i} detail={detail} onUpdate={updateDetail} onRemove={removeClass} classes={classes} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex gap-3">
                                <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition-all text-sm">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm shadow-lg shadow-indigo-500/20">
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save Fee Structure</>}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// ── Main Page ─────────────────────────────────────────────────
const FeeStructurePage = () => {
    const toast = useToast();
    const [structures, setStructures] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [modalOpen, setModalOpen]   = useState(false);
    const [fyModalOpen, setFyModalOpen] = useState(false);
    const [editing, setEditing]       = useState(null);
    const [years, setYears]           = useState([]);
    const [classes, setClasses]       = useState([]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [sRes, yRes, cRes] = await Promise.all([
                axios.get('/fee-structures/'),
                axios.get('/financial-years/'),
                axios.get('/classes/'),
            ]);
            setStructures(sRes.data);
            setYears(yRes.data);
            setClasses(cRes.data);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleDelete = async (id) => {
        if (!confirm('Delete this entire fee package?')) return;
        try {
            await axios.delete(`/fee-structures/${id}/`);
            toast('Structure deleted');
            fetchAll();
        } catch { toast('Failed to delete', 'error'); }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Fee Packaging</h1>
                    <p className="text-slate-400 text-sm mt-1">Group and manage class fees centrally by Academic Year.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setFyModalOpen(true)} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition-all text-sm">Manage Years</button>
                    <button onClick={() => { setEditing(null); setModalOpen(true); }} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                        <Plus size={18} /> New Package
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-indigo-400" /></div>
            ) : structures.length === 0 ? (
                <div className="bg-slate-900 border border-dashed border-slate-700 rounded-3xl py-24 text-center">
                    <Layers size={48} className="mx-auto text-slate-700 mb-4" />
                    <p className="text-white font-bold text-lg">No Fee Packages Yet</p>
                    <p className="text-slate-500 text-sm mt-1 mb-6">Start by creating a centralized fee structure for your academic sessions.</p>
                    <button onClick={() => setModalOpen(true)} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl">Create Structure</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {structures.map(s => (
                        <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                                <div>
                                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-indigo-500 rounded text-[10px] uppercase font-black tracking-tighter shadow-lg shadow-indigo-500/20">{s.financial_year_name}</span>
                                        {s.name}
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-1">{s.description || 'No description provided.'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { setEditing(s); setModalOpen(true); }} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"><Pencil size={18} /></button>
                                    <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-all"><Trash2 size={18} /></button>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {s.class_details?.map(d => {
                                    const rawTotal = typeof d.total_amount === 'object' ? d.total_amount?.total : d.total_amount;
                                    const displayTotal = (parseFloat(rawTotal) || 0).toLocaleString();
                                    return (
                                        <div key={d.id || Math.random()} className="bg-slate-800/40 border border-slate-800 p-4 rounded-2xl hover:border-slate-600 transition-all group">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <p className="text-sm font-black text-white">Class {String(d.class_name || 'Unknown')}</p>
                                                    {d.faculty && <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{String(d.faculty)}</p>}
                                                </div>
                                                <span className="text-xs font-black text-emerald-400">Rs. {displayTotal}</span>
                                            </div>
                                            <div className="space-y-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                {(d.items || []).map((item, idx) => {
                                                    const itemAmt = (parseFloat(item.amount) || 0).toLocaleString();
                                                    return (
                                                        <div key={item.id || idx} className="flex items-center justify-between text-[11px] text-slate-400">
                                                            <span>• {String(item.name || 'Fee Item')}</span>
                                                            <span className="font-mono text-[10px]">Rs.{itemAmt}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                </div>
            )}

            <StructureModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchAll} editing={editing} classes={classes} financialYears={years} />
            <FinancialYearModal isOpen={fyModalOpen} onClose={() => setFyModalOpen(false)} onSaved={fetchAll} />
        </div>
    );
};

export default FeeStructurePage;
