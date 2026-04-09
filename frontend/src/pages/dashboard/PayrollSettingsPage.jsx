import React, { useState, useEffect } from 'react';
import { 
    Settings, Briefcase, Layers, Percent, Save, Plus, 
    Trash2, Loader2, DollarSign, X, CheckCircle2, 
    AlertTriangle, Send, ShieldCheck
} from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const Modal = ({ children, isOpen, onClose, title, icon: Icon, color = "indigo" }) => {
    if (!isOpen) return null;
    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose} className="absolute inset-0" 
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
                >
                    <div className={`h-1.5 w-full bg-${color}-500`} />
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 bg-${color}-500/10 rounded-xl`}>
                                <Icon size={20} className={`text-${color}-400`} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">{title}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic leading-tight">System Notification</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-white transition-all">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6">
                        {children}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

const PayrollSettingsPage = () => {
    const [activeTab, setActiveTab] = useState('payroll');
    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [settings, setSettings] = useState({ 
        pf_percentage: 0, tax_percentage: 1.0, expense_category: 'salary',
        absent_deduction_rate: 100.0,
        salary_components: [
            { id: 'basic_salary', name: 'Basic Salary' }
        ]
    });
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();

    // Popup States
    const [popup, setPopup] = useState({ show: false, type: '', data: null });
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [p, c, s] = await Promise.all([
                axios.get('/staff-posts/'),
                axios.get('/staff-categories/'),
                axios.get('/payroll-settings/')
            ]);
            setPosts(p.data);
            setCategories(c.data);
            if (s.data.length > 0) setSettings(s.data[s.data.length - 1]);
        } catch { toast('Failed to load settings', 'error'); }
        finally { setLoading(false); }
    };

    const handleSaveSettings = async () => {
        setSubmitting(true);
        try {
            if (settings.id) await axios.put(`/payroll-settings/${settings.id}/`, settings);
            else await axios.post('/payroll-settings/', settings);
            setPopup({ show: true, type: 'success', title: 'Configuration Locked', message: 'The payroll matrix and global rules have been successfully synchronized across the system.' });
        } catch { toast('Failed to update configuration', 'error'); }
        finally { setSubmitting(false); }
    };

    const triggerAdd = (type) => {
        setInputValue('');
        setPopup({ 
            show: true, 
            type: 'input', 
            title: `Add ${type === 'post' ? 'Institutional Role' : 'Job Department'}`, 
            inputType: type 
        });
    };

    const confirmAddItem = async () => {
        if (!inputValue.trim()) return;
        const type = popup.inputType;
        try {
            const url = type === 'post' ? '/staff-posts/' : '/staff-categories/';
            const res = await axios.post(url, { name: inputValue });
            if (type === 'post') setPosts([...posts, res.data]);
            else setCategories([...categories, res.data]);
            setPopup({ show: false });
            toast(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully`);
        } catch { toast(`Failed to add ${type}`, 'error'); }
    };

    const triggerDelete = (type, item) => {
        setPopup({ 
            show: true, 
            type: 'confirm', 
            title: 'Irreversible Action', 
            message: `Are you sure you want to remove "${item.name}"? This could affect current staff assignments and historical payroll records.`,
            confirmAction: () => execDelete(type, item.id),
            color: 'rose'
        });
    };

    const execDelete = async (type, id) => {
        try {
            const url = type === 'post' ? `/staff-posts/${id}/` : `/staff-categories/${id}/`;
            await axios.delete(url);
            if (type === 'post') setPosts(posts.filter(p => p.id !== id));
            else setCategories(categories.filter(c => c.id !== id));
            setPopup({ show: false });
            toast(`${type} deleted`);
        } catch { toast(`Failed to delete ${type}`, 'error'); }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex border-b border-slate-800 p-2 gap-2">
                    {[
                        { id: 'payroll', name: 'Payroll Configuration', icon: DollarSign },
                        { id: 'posts', name: 'Post Setting', icon: Briefcase },
                        { id: 'categories', name: 'Job Category', icon: Layers },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                                ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'}
                            `}
                        >
                            <tab.icon size={15} />
                            {tab.name}
                        </button>
                    ))}
                </div>

                <div className="p-10">
                    {activeTab === 'payroll' && (
                        <div className="max-w-xl mx-auto space-y-8">
                             <div className="text-center space-y-2">
                                <h3 className="text-xl font-black text-white">Advanced Payroll Rules</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Define global automated deduction percentages</p>
                             </div>

                             <div className="grid grid-cols-2 gap-8 pt-6">
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">
                                        <Percent size={12} /> Provident Fund %
                                    </label>
                                    <div className="relative group">
                                        <input type="number" 
                                            value={settings.pf_percentage} 
                                            onChange={e => setSettings({...settings, pf_percentage: e.target.value})}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-2xl font-black text-white outline-none focus:border-indigo-500 transition-all text-center group-hover:bg-slate-750" 
                                        />
                                        <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none text-slate-600 font-black text-sm">%</div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-rose-400 uppercase tracking-widest px-1">
                                        <Percent size={12} /> Salary Tax %
                                    </label>
                                    <div className="relative group">
                                        <input type="number" 
                                            value={settings.tax_percentage} 
                                            onChange={e => setSettings({...settings, tax_percentage: e.target.value})}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-2xl font-black text-white outline-none focus:border-indigo-500 transition-all text-center group-hover:bg-slate-750" 
                                        />
                                        <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none text-slate-600 font-black text-sm">%</div>
                                    </div>
                                </div>
                             </div>

                             <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                            <Settings size={18} />
                                        </div>
                                        <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Accounting Integration</p>
                                    </div>
                                    <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full uppercase">Enabled</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Default Expense Head</label>
                                        <input 
                                            value={settings.expense_category} 
                                            onChange={e => setSettings({...settings, expense_category: e.target.value})}
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-indigo-500 transition-all" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest pl-1">Absent Deduction Rate (%)</label>
                                        <div className="relative">
                                            <input 
                                                type="number" step="1"
                                                value={settings.absent_deduction_rate} 
                                                onChange={e => setSettings({...settings, absent_deduction_rate: e.target.value})}
                                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-rose-400 font-bold outline-none focus:border-rose-500 transition-all" 
                                            />
                                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-600 font-black text-[10px]">PERCENT (%)</div>
                                        </div>
                                    </div>
                                </div>
                             </div>

                             <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6 space-y-5">
                                <div className="flex items-center justify-between mb-2 border-b border-indigo-500/10 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                            <Layers size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white uppercase tracking-wider leading-none">Salary Components</h4>
                                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Define dynamic earnings and allowances</p>
                                        </div>
                                    </div>
                                    <button onClick={() => {
                                        setSettings({
                                            ...settings, 
                                            salary_components: [...(settings.salary_components || []), { id: `custom_${Date.now()}`, name: '', type: 'addition' }]
                                        });
                                    }} className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all">
                                        + Add Component
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {(settings.salary_components || []).map((comp, idx) => (
                                        <div key={comp.id || idx} className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-slate-700 group/comp transition-all hover:bg-slate-900">
                                            <div className="flex-1">
                                                <input 
                                                    value={comp.name} 
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const newComps = [...settings.salary_components];
                                                        newComps[idx].name = val;
                                                        if (comp.id.startsWith('custom_') && val.trim()) {
                                                            newComps[idx].id = val.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                                        }
                                                        setSettings({...settings, salary_components: newComps});
                                                    }}
                                                    className="w-full bg-transparent text-sm text-white font-bold outline-none border-b border-transparent focus:border-indigo-500 transition-all placeholder:text-slate-600"
                                                    placeholder="Component Name"
                                                />
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    const newComps = [...settings.salary_components];
                                                    newComps[idx].type = newComps[idx].type === 'deduction' ? 'addition' : 'deduction';
                                                    setSettings({...settings, salary_components: newComps});
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                                                    ${comp.type === 'deduction' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'}
                                                `}
                                            >
                                                {comp.type === 'deduction' ? '(-) Deduction' : '(+) Addition'}
                                            </button>

                                            {comp.id !== 'basic_salary' && (
                                                <button onClick={() => {
                                                    setSettings({
                                                        ...settings,
                                                        salary_components: settings.salary_components.filter((_, i) => i !== idx)
                                                    });
                                                }} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {(!settings.salary_components || settings.salary_components.length === 0) && (
                                        <div className="text-center py-4">
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">No custom components defined.</p>
                                        </div>
                                    )}
                                </div>
                             </div>

                             <div className="pt-6">
                                <button onClick={handleSaveSettings} disabled={submitting}
                                    className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 uppercase tracking-widest text-xs"
                                >
                                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Commit Configuration</>}
                                </button>
                             </div>
                        </div>
                    )}

                    {(activeTab === 'posts' || activeTab === 'categories') && (
                        <div className="max-w-2xl mx-auto space-y-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-white">{activeTab === 'posts' ? 'Staff Roles' : 'Job Departments'}</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Manage your institutional hierarchy</p>
                                </div>
                                <button onClick={() => triggerAdd(activeTab === 'posts' ? 'post' : 'category')}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-2.5 rounded-xl transition-all text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/10"
                                >
                                    <Plus size={16} /> Add New
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(activeTab === 'posts' ? posts : categories).map(item => (
                                    <div key={item.id} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5 flex items-center justify-between group hover:border-slate-600 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                                {activeTab === 'posts' ? <Briefcase size={20} /> : <Layers size={20} />}
                                            </div>
                                            <span className="text-sm font-black text-white tracking-wide">{item.name}</span>
                                        </div>
                                        <button onClick={() => triggerDelete(activeTab === 'posts' ? 'post' : 'category', item)}
                                            className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Popup Dialogs */}
            <AnimatePresence mode="wait">
                {popup.show && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPopup({show: false})} className="absolute inset-0" />
                        
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
                        >
                            <div className={`h-1.5 w-full ${popup.type === 'confirm' ? 'bg-rose-500' : popup.type === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                            
                            <div className="p-8 space-y-6">
                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                                        popup.type === 'confirm' ? 'bg-rose-500/10 text-rose-500' : 
                                        popup.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 
                                        'bg-indigo-500/10 text-indigo-500'
                                    }`}>
                                        {popup.type === 'confirm' ? <AlertTriangle size={32} /> : 
                                         popup.type === 'success' ? <CheckCircle2 size={32} /> : 
                                         <Plus size={32} />}
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-white tracking-tight">{popup.title}</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic leading-tight">System Notification</p>
                                    </div>
                                    {popup.message && <p className="text-sm text-slate-400 font-medium leading-relaxed">{popup.message}</p>}
                                </div>

                                {popup.type === 'input' && (
                                    <div className="space-y-4">
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors">
                                                <Briefcase size={16} />
                                            </div>
                                            <input 
                                                autoFocus
                                                value={inputValue}
                                                onChange={e => setInputValue(e.target.value)}
                                                placeholder="Enter identifier name..."
                                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm text-white font-bold outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700 shadow-inner"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setPopup({show: false})} className="flex-1 px-6 py-3.5 bg-slate-800 hover:bg-slate-750 text-slate-400 font-black rounded-2xl transition-all text-xs uppercase tracking-widest active:scale-95">
                                        Dismiss
                                    </button>
                                    {popup.type !== 'success' && (
                                        <button 
                                            onClick={popup.type === 'input' ? confirmAddItem : popup.confirmAction}
                                            className={`flex-[1.5] flex items-center justify-center gap-2 px-6 py-3.5 font-black rounded-2xl transition-all text-xs uppercase tracking-widest active:scale-95 shadow-lg ${
                                                popup.type === 'confirm' ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/10' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/10'
                                            }`}
                                        >
                                            {popup.type === 'input' ? <><Send size={15} /> Confirm Add</> : <><Trash2 size={15} /> Process Delete</>}
                                        </button>
                                    )}
                                    {popup.type === 'success' && (
                                        <button onClick={() => setPopup({show: false})} className="flex-[1.5] flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all text-xs uppercase tracking-widest active:scale-95 shadow-lg shadow-emerald-500/10">
                                            <ShieldCheck size={16} /> Acknowledged
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PayrollSettingsPage;
