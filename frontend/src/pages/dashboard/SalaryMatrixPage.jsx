import React, { useState, useEffect } from 'react';
import { Save, Search, Loader2, DollarSign, Calculator, Briefcase, User } from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';

const SalaryMatrixPage = () => {
    const [staff, setStaff] = useState([]);
    const [salaryComponents, setSalaryComponents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const toast = useToast();

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const [staffRes, setRes] = await Promise.all([
                axios.get('/teachers/'),
                axios.get('/payroll-settings/')
            ]);
            
            const comps = setRes.data.length > 0 ? setRes.data[setRes.data.length - 1].salary_components || [] : [];
            setSalaryComponents(comps);

            const normalized = staffRes.data.map(s => {
                const allowances = s.salary_structure?.allowances || {};
                comps.forEach(c => {
                    if (c.id !== 'basic_salary' && allowances[c.id] === undefined) {
                        allowances[c.id] = 0;
                    }
                });
                
                return {
                    ...s,
                    salary_structure: {
                        basic_salary: s.salary_structure?.basic_salary || 0,
                        allowances: allowances
                    }
                };
            });
            setStaff(normalized);
        } catch { toast('Failed to load staff list', 'error'); }
        finally { setLoading(false); }
    };

    const updateField = (staffId, field, value) => {
        setStaff(prev => prev.map(s => {
            if (s.id === staffId) {
                if (field === 'basic_salary') {
                    return { ...s, salary_structure: { ...s.salary_structure, basic_salary: parseFloat(value) || '' } };
                } else {
                    return { 
                        ...s, 
                        salary_structure: { 
                            ...s.salary_structure, 
                            allowances: { ...(s.salary_structure.allowances || {}), [field]: parseFloat(value) || '' }
                        }
                    };
                }
            }
            return s;
        }));
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            const payload = staff.map(s => ({
                staff: s.id,
                ...s.salary_structure
            }));
            await axios.post('/staff-salary-structures/bulk_update/', payload);
            toast('Salary structures updated successfully');
        } catch { toast('Failed to update salary structures', 'error'); }
        finally { setSubmitting(false); }
    };

    const filtered = staff.filter(s =>
        `${s.user?.first_name} ${s.user?.last_name} ${s.employee_id} ${s.post}`
            .toLowerCase().includes(search.toLowerCase())
    );

    const calculateTotal = (struct) => {
        let total = parseFloat(struct.basic_salary) || 0;
        if (struct.allowances) {
            Object.entries(struct.allowances).forEach(([key, val]) => {
                const comp = salaryComponents.find(c => c.id === key);
                const isDeduction = comp?.type === 'deduction';
                const amount = parseFloat(val) || 0;
                
                if (isDeduction) total -= amount;
                else total += amount;
            });
        }
        return total;
    };

    const InputCell = ({ staffId, field, value }) => (
        <input 
            type="number"
            value={value}
            onChange={(e) => updateField(staffId, field, e.target.value)}
            className="w-full bg-slate-800/50 border border-transparent hover:border-indigo-500 focus:border-indigo-500 focus:bg-slate-800 px-2 py-1.5 rounded-lg text-xs text-white outline-none transition-all text-right"
        />
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white">Salary & Facilities</h1>
                        <p className="text-slate-400 text-xs mt-0.5 uppercase tracking-widest font-bold">Standard Payroll Settings</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input 
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search staff..."
                            className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-indigo-500 transition-all w-60"
                        />
                   </div>
                    <button onClick={handleSave} disabled={submitting}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold px-5 py-2 rounded-xl transition-all text-xs shadow-lg shadow-emerald-500/20">
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Update All</>}
                    </button>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={30} className="animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-800/20">
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-900 border-r border-slate-800/50">Name & Post</th>
                                    {salaryComponents.filter(c => c.id === 'basic_salary').map((c, i) => (
                                        <th key={`head-basic-${i}`} className="min-w-[120px] px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{c.name}</th>
                                    ))}
                                    {salaryComponents.length === 0 && (
                                        <th key="head-basic-default" className="min-w-[120px] px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Basic Salary</th>
                                    )}
                                    {salaryComponents.filter(c => c.id !== 'basic_salary').map((c, i) => (
                                        <th key={`head-comp-${c.id}-${i}`} className="min-w-[120px] px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
                                            <span className={c.type === 'deduction' ? 'text-rose-400' : 'text-emerald-400'}>
                                                {c.type === 'deduction' ? '(-)' : '(+)'}
                                            </span> {c.name}
                                        </th>
                                    ))}
                                    <th className="px-4 py-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest text-right w-32 border-l border-slate-800/50">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s, idx) => (
                                    <tr key={s.id} className={`hover:bg-slate-800/30 transition-colors ${idx < filtered.length - 1 ? 'border-b border-slate-800/50' : ''}`}>
                                        <td className="px-4 py-3 sticky left-0 bg-slate-900 border-r border-slate-800/50 z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-700">
                                                    {(s.employee_id || '').split('-').pop()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white leading-none mb-1 whitespace-nowrap">{s.user?.first_name} {s.user?.last_name}</p>
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wide font-black">
                                                        <Briefcase size={8} /> {s.post_details?.name || 'General'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {salaryComponents.filter(c => c.id === 'basic_salary').map(c => (
                                            <td key={`${s.id}-${c.id}`} className="px-2 py-3">
                                                <InputCell staffId={s.id} field="basic_salary" value={s.salary_structure.basic_salary} />
                                            </td>
                                        ))}
                                        {salaryComponents.length === 0 && (
                                            <td className="px-2 py-3">
                                                <InputCell staffId={s.id} field="basic_salary" value={s.salary_structure.basic_salary} />
                                            </td>
                                        )}
                                        
                                        {salaryComponents.filter(c => c.id !== 'basic_salary').map(c => (
                                            <td key={`${s.id}-${c.id}`} className="px-2 py-3">
                                                <InputCell staffId={s.id} field={c.id} value={s.salary_structure.allowances ? s.salary_structure.allowances[c.id] : ''} />
                                            </td>
                                        ))}
                                        
                                        <td className="px-4 py-3 text-right bg-slate-800/20 border-l border-slate-800/50">
                                            <div className="text-xs font-black text-indigo-400 whitespace-nowrap">
                                                Rs. {calculateTotal(s.salary_structure).toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-500">
                                                <User size={30} className="mb-2 opacity-20" />
                                                <p className="text-sm font-medium">No staff members found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalaryMatrixPage;
