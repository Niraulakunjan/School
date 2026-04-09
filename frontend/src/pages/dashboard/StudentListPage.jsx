import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import NepaliDate from 'nepali-date-converter';
import {
    UserPlus, Search, MoreVertical, GraduationCap,
    Clock, Loader2, Filter, X, Phone, Calendar,
    Bus, User, Hash, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StudentExcelView from './StudentExcelView';
import { LayoutGrid, Table as TableIcon } from 'lucide-react';

const PAGE_SIZE = 40;

const StudentListPage = () => {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState('gallery'); // 'gallery' | 'excel'
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [studentRes, classRes] = await Promise.all([
                    axios.get('/students/'),
                    axios.get('/classes/')
                ]);
                setStudents(studentRes.data);
                setClasses(classRes.data);
            } catch (err) {
                console.error("Error fetching student directory data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Derived sections for the selected class
    const availableSections = useMemo(() => {
        if (!selectedClass) return [];
        const cls = classes.find(c => c.name === selectedClass);
        return cls?.sections || [];
    }, [selectedClass, classes]);

    // Filtering logic
    const filtered = useMemo(() => {
        const result = students.filter(s => {
            const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
            const matchesSearch = fullName.includes(search.toLowerCase()) ||
                                 s.admission_number?.toLowerCase().includes(search.toLowerCase()) ||
                                 s.roll_number?.toLowerCase().includes(search.toLowerCase());

            const matchesClass = selectedClass ? s.class_name === selectedClass : true;
            const matchesSection = selectedSection ? s.section === selectedSection : true;

            return matchesSearch && matchesClass && matchesSection;
        });
        return result;
    }, [students, search, selectedClass, selectedSection]);

    // Pagination logic
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filtered.slice(start, start + PAGE_SIZE);
    }, [filtered, currentPage]);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, selectedClass, selectedSection]);

    const handleUpdateStudent = async (id, data) => {
        try {
            const res = await axios.patch(`/students/${id}/`, data);
            setStudents(prev => prev.map(s => s.id === id ? res.data : s));
            return res.data;
        } catch (err) {
            console.error("Failed to update student", err);
            throw err;
        }
    };

    const resetFilters = () => {
        setSearch('');
        setSelectedClass('');
        setSelectedSection('');
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-inner">
                            <GraduationCap size={22} />
                        </div>
                        Student Directory
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Manage and monitor {students.length} student enrollments.</p>
                </motion.div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 shadow-inner">
                        <button 
                            onClick={() => setViewMode('gallery')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'gallery' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            title="Gallery View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('excel')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'excel' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            title="Excel View"
                        >
                            <TableIcon size={18} />
                        </button>
                    </div>
                    <motion.button
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/dashboard/students/new')}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:bg-indigo-700"
                    >
                        <UserPlus size={18} /> Enroll New Student
                    </motion.button>
                </div>
            </div>

            {/* Filter Bar */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center gap-4 shadow-xl"
            >
                {/* Search */}
                <div className="relative flex-1 min-w-[280px]">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, roll, or admission ID..."
                        className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                    />
                </div>

                {/* Class Filter */}
                <div className="relative min-w-[170px]">
                    <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <select
                        value={selectedClass}
                        onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }}
                        className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-300 outline-none focus:border-indigo-500/50 appearance-none transition-all cursor-pointer hover:border-slate-700"
                    >
                        <option value="">All Classes</option>
                        {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                </div>

                {/* Section Filter */}
                <div className="relative min-w-[150px]">
                    <select
                        disabled={!selectedClass}
                        value={selectedSection}
                        onChange={e => setSelectedSection(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-2.5 px-4 text-sm text-slate-200 outline-none focus:border-indigo-500/50 appearance-none disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer hover:border-slate-700 font-medium"
                    >
                        <option value="">All Sections</option>
                        {availableSections.map(s => <option key={s.id} value={s.name}>Section {s.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                </div>

                {/* Clear Filters */}
                {(search || selectedClass || selectedSection) && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={resetFilters}
                        className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
                        title="Clear Filters"
                    >
                        <X size={18} />
                    </motion.button>
                )}
            </motion.div>

            {/* Table Area */}
            <AnimatePresence mode="wait">
                {viewMode === 'gallery' ? (
                    <motion.div
                        key="gallery-view"
                        initial={{ opacity: 0, scale: 0.99 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.01 }}
                        className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm"
                    >
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-28 gap-4">
                                <Loader2 size={36} className="animate-spin text-indigo-500" />
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Syncing Directory...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-800/20 border-b border-slate-800">
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-16">Roll</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Educational Path</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Guardian & Contact</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-48">DOB (BS)</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-24">Bus</th>
                                            <th className="px-6 py-5 w-12" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/40">
                                        <AnimatePresence mode='popLayout'>
                                            {paginatedItems.length === 0 ? (
                                                <motion.tr
                                                    key="no-results"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    <td colSpan={7} className="px-6 py-24 text-center">
                                                        <div className="flex flex-col items-center gap-3 opacity-40">
                                                            <Search size={40} className="text-slate-600 mb-2" />
                                                            <p className="text-slate-400 font-bold text-lg">No matches found</p>
                                                            <p className="text-slate-600 text-sm">Refine your search or filters to see results.</p>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ) : paginatedItems.map((s, idx) => (
                                                <motion.tr
                                                    key={s.id}
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.98 }}
                                                    transition={{ delay: (idx % PAGE_SIZE) * 0.01 }}
                                                    className="hover:bg-indigo-500/[0.03] transition-colors group cursor-default"
                                                >
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-xs font-black text-slate-400 font-mono bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/40">
                                                            {s.roll_number || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3.5">
                                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/10 shrink-0 border border-white/5">
                                                                {s.first_name?.[0]}{s.last_name?.[0]}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                                                                    {s.first_name} {s.last_name}
                                                                </p>
                                                                <p className="text-[10px] text-slate-500 font-black mt-0.5 tracking-tighter uppercase flex items-center gap-1.5 opacity-60">
                                                                    <Hash size={10} /> {s.admission_number}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="text-[11px] font-black text-indigo-400 bg-indigo-500/5 px-3 py-1 rounded-lg border border-indigo-500/10">
                                                                {s.class_name}
                                                            </span>
                                                            {s.section && (
                                                                <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/5 px-3 py-1 rounded-lg border border-emerald-500/10">
                                                                    SEC {s.section}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <User size={12} className="text-slate-600" />
                                                                <span className="text-xs font-bold text-slate-300">{s.guardian_name || '—'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Phone size={11} className="text-slate-700" />
                                                                <span className="text-xs text-slate-500 font-bold opacity-80">{s.guardian_phone || '—'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-slate-400 font-mono">
                                                            <Calendar size={13} className="text-slate-700" />
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-300">{s.date_of_birth_bs || '—'}</p>
                                                                <p className="text-[9px] font-black text-slate-600 tracking-widest">{s.date_of_birth || '—'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {s.bus_route ? (
                                                            <div className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/10" title="Transport Enabled">
                                                                <Bus size={13} />
                                                                <span className="text-[9px] font-black uppercase text-emerald-500/80">Yes</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 px-3 py-1 bg-slate-800/10 rounded-lg border border-slate-800/20">No</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => navigate(`/dashboard/students/${s.id}`)}
                                                            className="p-2 rounded-xl hover:bg-slate-800 text-slate-600 hover:text-indigo-400 transition-all border border-transparent hover:border-slate-800 shadow-sm"
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="excel-view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <StudentExcelView students={paginatedItems} loading={loading} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 py-2">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-800 transition-all"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        {[...Array(totalPages)].map((_, i) => {
                            const p = i + 1;
                            // Basic logic to show limited page numbers if there are too many
                            if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p)}
                                        className={`w-10 h-10 rounded-xl text-sm font-black transition-all border ${
                                            currentPage === p
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                );
                            } else if (p === currentPage - 2 || p === currentPage + 2) {
                                return <span key={p} className="text-slate-600 font-black">...</span>;
                            }
                            return null;
                        })}
                    </div>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-800 transition-all"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* Footer Summary */}
            {!loading && filtered.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col sm:flex-row items-center justify-between text-[11px] font-black text-slate-600 uppercase tracking-widest px-4 gap-4"
                >
                    <p className="bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800/50">
                        Showing {paginatedItems.length} of {filtered.length} Results
                    </p>
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-2.5">
                             <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" /> 
                             Database: {students.length}
                        </span>
                        <span className="flex items-center gap-2.5">
                             <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" /> 
                             Transport: {filtered.filter(s => s.bus_route).length}
                        </span>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default StudentListPage;
