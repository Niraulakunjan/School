import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Loader2, X, Save, Receipt,
    TrendingUp, TrendingDown, DollarSign, AlertCircle, Users,
    CheckCircle2, Clock, ChevronDown, Printer, History, CreditCard, Eye
} from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { CollectModal, FeeStatementModal, FeeReceiptModal, BS_MONTHS, getBSMonthIndex } from '../../components/finance/FinancialModals';

// ── Main Page ─────────────────────────────────────────────────
const FeeCollectionPage = () => {
    const toast = useToast();
    const [collections, setCollections] = useState([]);
    const [students, setStudents]       = useState([]);
    const [structures, setStructures]   = useState([]);
    const [summary, setSummary]         = useState({});
    const [schoolInfo, setSchoolInfo]   = useState(null);
    const [loading, setLoading]         = useState(true);
    const [modalOpen, setModalOpen]     = useState(false);
    const [statementOpen, setStatementOpen] = useState(false);
    const [search, setSearch]           = useState('');
    const [view, setView]               = useState('all_students'); // 'history', 'dues', 'all_students'
    const [selectedForCollect, setSelectedForCollect] = useState(null);
    const [selectedForStatement, setSelectedForStatement] = useState(null);
    const [selectedForReceipt, setSelectedForReceipt] = useState(null);
    const [receiptOpen, setReceiptOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterYear, setFilterYear]   = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterMonth, setFilterMonth] = useState(String(getBSMonthIndex() + 1));
    const [filterSort, setFilterSort] = useState('name'); // 'name' or 'roll'
    const [years, setYears]             = useState([]);
    const [classes, setClasses]         = useState([]);
    const [sections, setSections]       = useState([]);
    const [hasApplied, setHasApplied]   = useState(false);
    const [appliedMonthLabel, setAppliedMonthLabel] = useState('');

    const fetchAll = async (isInitial = false) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.append('status', filterStatus);
            if (filterYear)   params.append('financial_year', filterYear);
            if (filterClass)  params.append('class_name', filterClass);
            if (filterSection) params.append('section', filterSection);
            if (filterMonth) params.append('month', filterMonth);

            const endpoints = [
                axios.get('/financial-years/'),
                axios.get('/fee-structures/'),
                axios.get('/school-settings/'),
                axios.get('/tenants/current/'),
            ];

            // Only fetch student data if applying or if we already have a selection
            if (!isInitial || (filterClass && filterMonth)) {
                endpoints.push(axios.get(`/fee-collections/?${params}`));
                endpoints.push(axios.get(`/fee-enrollments/?status=active&${params}`));
                endpoints.push(axios.get(`/fee-collections/summary/${filterYear ? `?financial_year=${filterYear}` : ''}`));
            }

            const results = await Promise.all(endpoints);
            
            // Year, structure, and school info are always in first three
            setYears(results[0].data);
            setStructures(results[1].data);
            const settings = results[2].data;
            const tenant   = results[3].data;
            setSchoolInfo({ 
                ...settings, 
                school_name: settings.school_name || tenant.name,
                logo: settings.logo || tenant.logo,
                address: settings.address || tenant.address,
                phone: settings.phone || tenant.phone,
                email: settings.email || tenant.email
            });

            if (results.length > 4) {
                setCollections(results[4].data);
                setStudents(results[5].data);
                setSummary(results[6].data);

                // Extract unique classes and sections from enrollments for filters
                const uniqueClasses = [...new Set(results[5].data.map(e => e.class_name).filter(Boolean))].sort();
                setClasses(uniqueClasses);
                const uniqueSections = [...new Set(results[5].data.map(e => e.section).filter(Boolean))].sort();
                setSections(uniqueSections);

                if (!isInitial) {
                    setHasApplied(true);
                    setAppliedMonthLabel(BS_MONTHS[parseInt(filterMonth) - 1] || '');
                }
            } else if (isInitial) {
                // For initial load without students, we still want to know available classes
                const eRes = await axios.get('/fee-enrollments/?status=active&limit=500');
                const uClasses = [...new Set(eRes.data.map(e => e.class_name).filter(Boolean))].sort();
                setClasses(uClasses);
            }

            return [];
        } catch (err) { 
            console.error("Fetch failed", err);
            return []; 
        } finally { setLoading(false); }
    };

    const handleCollectionSaved = (enroll) => {
        // Trigger receipt immediately with current data
        if (enroll) {
            setSelectedForReceipt({ ...enroll, autoPrint: true });
            setReceiptOpen(true);
        }
        // Refresh background data
        fetchAll();
    };

    useEffect(() => { 
        fetchAll(true); 
    }, [filterStatus, filterYear]); // Year/Status changes still trigger metadata refresh

    const handleExport = () => {
        const params = new URLSearchParams();
        if (filterYear)   params.append('financial_year', filterYear);
        if (filterClass)  params.append('class_name', filterClass);
        if (filterSection) params.append('section', filterSection);
        
        const url = `${axios.defaults.baseURL}/fee-enrollments/report/?${params.toString()}`;
        window.open(url, '_blank');
    };

    const filtered = collections.filter(c =>
        `${c.student_name} ${c.receipt_number} ${c.academic_year} ${c.month}`
            .toLowerCase().includes(search.toLowerCase())
    );



    return (
        <div className="max-w-7xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black text-white">Fee Collection</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Record and track student fee payments.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleExport}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-bold px-4 py-2.5 rounded-xl transition-all">
                        <Printer size={16} /> Export Report
                    </button>
                    <button onClick={() => { setSelectedForCollect(null); setModalOpen(true); }}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20">
                        <Plus size={16} /> Collect Fee
                    </button>
                </div>
            </div>

            {/* View Switcher */}
            <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-2xl w-fit">
                {[
                    { id: 'all_students', label: 'All Students', icon: Users },
                    { id: 'dues',    label: 'Outstanding Dues',   icon: AlertCircle },
                    { id: 'history', label: 'Collection History', icon: History },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setView(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${view === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <tab.icon size={14} className={view === tab.id ? 'text-white' : 'text-slate-500'} />
                        {tab.label}
                    </button>
                ))}
            </div>



            {/* New Horizontal Filters Layer */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1 ml-1">Search Student / Receipt</p>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, Receipt #..."
                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-indigo-500 transition-all" />
                        </div>
                    </div>

                    {[
                        { label: 'A/Year', value: filterYear, set: setFilterYear, options: years.map(y => ({ v: y.id, l: y.name })), placeholder: 'All Years' },
                        { label: 'Category', value: filterCategory, set: setFilterCategory, options: [{ v: 'ALL', l: 'ALL' }, { v: 'NEW', l: 'New' }, { v: 'OLD', l: 'Old' }] },
                        { label: 'Month of Bill', value: filterMonth, set: setFilterMonth, options: BS_MONTHS.map((m, i) => ({ v: i + 1, l: m })), placeholder: 'All Year Total' },
                        { label: 'Class', value: filterClass, set: setFilterClass, options: classes.map(c => ({ v: c, l: `Class ${c}` })), placeholder: 'All Classes' },
                    ].map(f => (
                        <div key={f.label} className="min-w-[110px]">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1 ml-1">{f.label}</p>
                            <select value={f.value} onChange={e => f.set(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                                {f.placeholder && <option value="">{f.placeholder}</option>}
                                {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                            </select>
                        </div>
                    ))}

                    <div className="min-w-[80px]">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1 ml-1">Section</p>
                        <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                            <option value="">All</option>
                            {sections.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="min-w-[120px]">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1 ml-1">Index As</p>
                        <select value={filterSort} onChange={e => setFilterSort(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                            <option value="name">As Name</option>
                            <option value="roll">As Roll No.</option>
                        </select>
                    </div>

                    <div className="flex items-end mb-0.5">
                        <button 
                            onClick={() => fetchAll(false)}
                            className="h-9 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            <Search size={14} /> Apply Filters
                        </button>
                    </div>

                    <button onClick={handleExport}
                        className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-300 transition-all flex items-center gap-2 mb-0.5 ml-auto">
                        <Printer size={14} /> Export to Excel
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
                ) : view === 'history' ? (
                    (() => {
                        let data = collections.filter(c =>
                            (`${c.student_name} ${c.receipt_number} ${c.academic_year} ${c.month}`.toLowerCase().includes(search.toLowerCase())) &&
                            (!filterMonth || c.month === filterMonth) &&
                            (!filterYear || String(c.financial_year) === String(filterYear)) &&
                            (!filterClass || c.student_class === filterClass) &&
                            (!filterSection || c.section === filterSection)
                        );
                        
                        // Category filtering for history (based on admission_date)
                        if (filterCategory !== 'ALL' && filterYear) {
                            const selectedYear = years.find(y => String(y.id) === String(filterYear));
                            if (selectedYear) {
                                const yearStart = new Date(selectedYear.start_date);
                                data = data.filter(c => {
                                    const adm = new Date(c.admission_date);
                                    return filterCategory === 'NEW' ? adm >= yearStart : adm < yearStart;
                                });
                            }
                        }

                        // Sorting
                        data.sort((a, b) => {
                            if (filterSort === 'roll') return (a.student_roll || '').localeCompare(b.student_roll || '');
                            return (a.student_name || '').localeCompare(b.student_name || '');
                        });

                        return data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                                    <Receipt size={20} className="text-emerald-400" />
                                </div>
                                <p className="text-white font-bold text-sm mb-1">No Records Found</p>
                                <p className="text-slate-500 text-xs">Try adjusting your filters.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-800">
                                        {['Receipt', 'Student', 'Roll', 'Year / Month', 'Due', 'Paid', 'Balance', 'Method', 'Status'].map(h => (
                                            <th key={h} className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((c, i) => (
                                        <tr key={c.id} className={`hover:bg-slate-800/50 transition-colors ${i < data.length - 1 ? 'border-b border-slate-800' : ''}`}>
                                            <td className="px-5 py-3.5">
                                                <code className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg text-indigo-400 font-mono">{c.receipt_number}</code>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <p className="text-sm font-semibold text-white">{c.student_name}</p>
                                                <p className="text-[10px] text-slate-500">{c.student_class}</p>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">{c.student_roll || '—'}</td>
                                            <td className="px-5 py-3.5">
                                                <p className="text-xs text-slate-300">{c.financial_year_name || c.academic_year}</p>
                                                {c.month && <p className="text-[10px] text-slate-500">{c.month}</p>}
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-slate-300">Rs. {parseFloat(c.amount_due).toLocaleString()}</td>
                                            <td className="px-5 py-3.5 text-sm font-semibold text-emerald-400">Rs. {parseFloat(c.amount_paid).toLocaleString()}</td>
                                            <td className="px-5 py-3.5 text-sm font-semibold text-amber-400">Rs. {parseFloat(c.balance).toLocaleString()}</td>
                                            <td className="px-5 py-3.5">
                                                <span className="text-[10px] text-slate-400 capitalize">{c.payment_method}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_BADGE[c.status]}`}>
                                                    {STATUS_ICON[c.status]} {c.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <button onClick={() => { setSelectedForReceipt(c); setReceiptOpen(true); }}
                                                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all" title="Print Receipt">
                                                    <Printer size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        );
                    })()
                ) : (
                    /* Dues / All Students View */
                    (() => {
                        if (!hasApplied) {
                            return (
                                <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                                    <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 relative">
                                        <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-full"></div>
                                        <Search size={32} className="text-indigo-400 relative z-10" />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-2 tracking-tight">Ready to view dues?</h3>
                                    <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                                        Select a <span className="text-indigo-400 font-bold">Class</span> and <span className="text-indigo-400 font-bold">Month</span> from the filters above and click <span className="text-white font-bold">Apply Filters</span> to see student balances.
                                    </p>
                                </div>
                            );
                        }

                        let filteredStudents = students.filter(e => 
                            (view === 'all_students' || parseFloat(e.balance) > 0) &&
                            (`${e.student_name} ${e.student_class} ${e.financial_year_name}`.toLowerCase().includes(search.toLowerCase())) &&
                            (!filterYear || String(e.financial_year) === String(filterYear)) &&
                            (!filterClass || e.class_name === filterClass) &&
                            (!filterSection || e.section === filterSection)
                        );

                        // Category filtering for dues
                        if (filterCategory !== 'ALL' && filterYear) {
                            const selectedYear = years.find(y => String(y.id) === String(filterYear));
                            if (selectedYear) {
                                const yearStart = new Date(selectedYear.start_date);
                                filteredStudents = filteredStudents.filter(e => {
                                    const adm = new Date(e.admission_date);
                                    return filterCategory === 'NEW' ? adm >= yearStart : adm < yearStart;
                                });
                            }
                        }

                        // Sorting
                        filteredStudents.sort((a, b) => {
                            if (filterSort === 'roll') return (a.student_roll || '').localeCompare(b.student_roll || '');
                            return (a.student_name || '').localeCompare(b.student_name || '');
                        });

                        return filteredStudents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
                                    <CheckCircle2 size={20} className="text-indigo-400" />
                                </div>
                                <p className="text-white font-bold text-sm mb-1">{view === 'dues' ? 'No Dues Found' : 'No Students Found'}</p>
                                <p className="text-slate-500 text-xs">{view === 'dues' ? 'All students in this view have cleared their fees.' : 'Try adjusting your filters.'}</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-800">
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Student</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Class / Roll</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            Due {appliedMonthLabel ? `up to ${appliedMonthLabel}` : ''}
                                        </th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            Paid {appliedMonthLabel ? `up to ${appliedMonthLabel}` : ''}
                                        </th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/5">
                                            Balance {appliedMonthLabel ? `up to ${appliedMonthLabel}` : ''}
                                        </th>
                                        <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right px-8">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((e, i) => (
                                        <tr key={e.id} className={`hover:bg-slate-800/50 transition-all ${i < filteredStudents.length - 1 ? 'border-b border-slate-800/50' : ''}`}>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
                                                        {e.student_name?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white leading-tight">{e.student_name}</p>
                                                        <p className="text-[10px] text-slate-500 uppercase tracking-tighter">ID: #{e.student}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-xs font-bold text-slate-300">Class {e.class_name} {e.section}</p>
                                                <p className="text-[10px] text-slate-500 font-mono">Roll: {e.student_roll || '—'}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${parseFloat(e.balance) <= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                    {parseFloat(e.balance) <= 0 ? <CheckCircle2 size={10}/> : <AlertCircle size={10}/>}
                                                    {parseFloat(e.balance) <= 0 ? 'Cleared' : 'Dues Pending'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-xs font-medium text-slate-400">Rs. {parseFloat(e.total_due).toLocaleString()}</td>
                                            <td className="px-5 py-4 text-xs font-medium text-emerald-500">Rs. {parseFloat(e.total_paid).toLocaleString()}</td>
                                            <td className="px-5 py-4 bg-indigo-500/5">
                                                <p className={`text-sm font-black ${parseFloat(e.balance) > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                                    Rs. {parseFloat(e.balance).toLocaleString()}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4 text-right px-8">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => { setSelectedForStatement(e); setStatementOpen(true); }}
                                                        className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:text-white hover:bg-indigo-600 transition-all" title="View Statement">
                                                        <Eye size={14} />
                                                    </button>
                                                    <button onClick={() => { setSelectedForReceipt(e); setReceiptOpen(true); }}
                                                        className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all" title="Print Receipt">
                                                        <Printer size={14} />
                                                    </button>
                                                    <button onClick={() => { setSelectedForCollect(e); setModalOpen(true); }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-emerald-500/10">
                                                        <Save size={12} /> Pay
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        );

                    })()
                )}
            </div>

            <FeeStatementModal
                isOpen={statementOpen}
                onClose={() => { setStatementOpen(false); setSelectedForStatement(null); }}
                enrollment={selectedForStatement}
                schoolInfo={schoolInfo}
            />

            <FeeReceiptModal 
                isOpen={receiptOpen}
                onClose={() => { setReceiptOpen(false); setSelectedForReceipt(null); }}
                enrollment={selectedForReceipt}
                schoolInfo={schoolInfo}
            />

            <CollectModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedForCollect(null); }}
                onSaved={handleCollectionSaved}
                students={students}
                structures={structures}
                initialEnrollment={selectedForCollect}
            />
        </div>
    );
};

export default FeeCollectionPage;
