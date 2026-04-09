import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import { 
    Trophy, GraduationCap, Medal, 
    Search, Download, FileText, Loader2, ChevronDown, 
    Maximize2, Minimize2, Zap, LayoutGrid, Table as TableIcon,
    TrendingUp, ShieldCheck, Star, Award, ChevronRight,
    ArrowRightCircle, History, Filter
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import GradeSheet from '../../components/exams/GradeSheet';
import { motion, AnimatePresence } from 'framer-motion';

const RANK_ICONS = {
    1: <Trophy className="text-yellow-400" size={24} />,
    2: <Medal className="text-slate-300" size={24} />,
    3: <Medal className="text-amber-600" size={24} />
};

const inputCls = "h-12 bg-slate-900 border border-slate-800 rounded-xl py-2 px-4 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-all shadow-sm";
const selectCls = inputCls + " appearance-none cursor-pointer";

// --- Shared Diamond Components ---

const TabButton = ({ id, label, active, onClick }) => (
    <button 
        onClick={() => onClick(id)}
        className={`relative px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${active ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
    >
        {active && (
            <motion.div 
                layoutId="examActiveTab"
                className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/10"
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            />
        )}
        <span className="relative z-10 whitespace-nowrap">{label}</span>
    </button>
);

export default function ExamResultPage() {
    const { toast } = useToast();
    
    // Filters
    const [exams, setExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('analytic'); // 'analytic' or 'ledger'
    const [exporting, setExporting] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Data
    const [schoolInfo, setSchoolInfo] = useState({ name: 'My School', logo: '', address: '' });
    const [students, setStudents] = useState([]);
    const [routines, setRoutines] = useState([]);
    const [gridData, setGridData] = useState({});
    const [loading, setLoading] = useState(false);
    
    // UI State
    const [showGradeSheet, setShowGradeSheet] = useState(false);
    const [activeStudent, setActiveStudent] = useState(null);

    // Initial load
    useEffect(() => {
        api.get('/exams/').then(r => setExams(r.data.results || r.data)).catch(() => {});
        api.get('/classes/').then(r => setClasses(r.data.results || r.data)).catch(() => {});
        api.get('/tenants/current/').then(r => setSchoolInfo(r.data)).catch(() => {});
    }, []);

    const activeClass = Array.isArray(classes) ? classes.find(c => String(c.id) === String(selectedClass)) : null;
    const sections = activeClass?.sections || [];

    // Calculate result data
    const results = useMemo(() => {
        if (!students.length || !routines.length) return [];

        const studentResults = students.map(student => {
            let totalObtained = 0;
            let totalFull = 0;
            let totalGPW = 0; 
            let totalCredits = 0;
            let failedSub = 0;

            routines.forEach(r => {
                const cell = gridData[student.id]?.[r.id];
                if (cell && !cell.isAbsent && cell.marks !== '') {
                    const marks = parseFloat(cell.marks);
                    const full = r.effective_full_marks;
                    const pass = r.effective_pass_marks;
                    const credit = parseFloat(r.credit_hours || 0);

                    totalObtained += marks;
                    totalFull += full;
                    
                    const pct = (marks / full) * 100;
                    let gp = 0;
                    if (pct >= 90) gp = 4.0;
                    else if (pct >= 80) gp = 3.6;
                    else if (pct >= 70) gp = 3.2;
                    else if (pct >= 60) gp = 2.8;
                    else if (pct >= 50) gp = 2.4;
                    else if (pct >= 40) gp = 2.0;
                    else if (pct >= 35) gp = 1.6;
                    
                    totalGPW += gp * credit;
                    totalCredits += credit;
                    if (marks < pass) failedSub++;
                }
            });

            const gpa = totalCredits > 0 ? (totalGPW / totalCredits) : 0;
            
            return {
                ...student,
                totalObtained,
                totalFull,
                gpa,
                isPass: failedSub === 0 && totalCredits > 0,
                failedSub
            };
        });

        const sorted = (studentResults || []).sort((a, b) => {
            if (b.gpa !== a.gpa) return b.gpa - a.gpa;
            return b.totalObtained - a.totalObtained;
        });
        
        const ranked = sorted.map((res, idx) => ({ ...res, rank: idx + 1 }));
        
        if (!searchTerm) return ranked;
        return ranked.filter(r => 
            `${r.first_name} ${r.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.roll_number && String(r.roll_number).includes(searchTerm))
        );
    }, [students, routines, gridData, searchTerm]);

    const fetchData = useCallback(async () => {
        if (!selectedExam || !selectedClass) return;
        setLoading(true);
        try {
            const currentExam = Array.isArray(exams) ? exams.find(e => String(e.id) === String(selectedExam)) : null;
            const classObj = Array.isArray(classes) ? classes.find(c => String(c.id) === String(selectedClass)) : null;
            
            let studentUrl = `/students/?class_name=${encodeURIComponent(classObj?.name || '')}`;
            if (selectedSection) studentUrl += `&section=${encodeURIComponent(selectedSection)}`;

            const [studRes, markRes] = await Promise.all([
                api.get(studentUrl),
                api.get(`/mark-ledgers/?exam=${selectedExam}&class_id=${selectedClass}`)
            ]);

            const filteredRoutines = (currentExam?.routines || []).filter(r => 
                String(r.class_obj) === String(selectedClass)
            );

            const grid = {};
            const marksArray = markRes.data.results || markRes.data;
            if (Array.isArray(marksArray)) {
                marksArray.forEach(m => {
                    if (!grid[m.student]) grid[m.student] = {};
                    grid[m.student][m.routine] = { marks: m.marks_obtained, isAbsent: m.is_absent };
                });
            }

            setStudents(studRes.data.results || studRes.data);
            setRoutines(filteredRoutines);
            setGridData(grid);
        } catch (e) {
            toast("Failed to load records", "error");
        } finally {
            setLoading(false);
        }
    }, [selectedExam, selectedClass, selectedSection, exams, classes]);

    useEffect(() => { fetchData(); }, [selectedExam, selectedClass, selectedSection]);

    const topbarPortal = document.getElementById('topbar-portal');

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-32 relative">
             {/* Simple Background */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.01] -z-10 bg-slate-950" />

            {/* Header: Consolidated Title */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-10">
                <div className="space-y-2">
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <Star size={10} /> Academic Reports
                    </motion.div>
                    <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl font-bold text-white tracking-tight">
                        Exam Results
                    </motion.h1>
                    <p className="text-slate-500 text-sm font-medium">View and analyze student performance across selected examination cycles.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    {results.length > 0 && (
                        <motion.button 
                            whileHover={{ scale: 1.02 }} 
                            onClick={() => window.open(`/print/bulk-grade-sheets/${selectedExam}/${selectedClass}?section=${selectedSection}&className=${activeClass?.name}`, '_blank')}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-md active:scale-95"
                        >
                            <Award size={14} /> Bulk Grade Sheets
                        </motion.button>
                    )}
                </div>
            </header>

            {/* Executive Workspace Bar */}
            {/* Executive Workspace Bar */}
            <div className="flex flex-wrap gap-4 items-center bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-lg sticky top-4 z-[100]">
                <div className="relative flex-[2] min-w-[300px]">
                    <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input 
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                        placeholder="Search by name or roll number..."
                        className="w-full bg-transparent border-none py-4 pl-16 pr-8 text-sm text-white placeholder:text-slate-600 outline-none focus:placeholder:text-indigo-400 transition-all font-medium tracking-wide" 
                    />
                </div>
                <div className="flex items-center gap-3 pr-2">
                    <div className="relative group">
                        <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className={selectCls + " w-48 font-bold"}>
                            <option value="">Select Exam...</option>
                            {exams.map(e => <option key={e.id} value={e.id} className="bg-slate-900 font-bold">{e.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-white transition-colors pointer-events-none" size={12} />
                    </div>
                    <div className="relative group">
                        <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }} className={selectCls + " w-32 font-bold"}>
                            <option value="">Grade...</option>
                            {classes.map(c => <option key={c.id} value={c.id} className="bg-slate-900 font-bold">{c.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-white transition-colors pointer-events-none" size={12} />
                    </div>
                    
                    {selectedClass && (
                        <div className="relative group">
                            <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} className={selectCls + " w-28 font-bold"}>
                                <option value="">Section...</option>
                                {sections.map(s => (
                                    <option key={s.id} value={s.name} className="bg-slate-900 font-bold">
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-white transition-colors pointer-events-none" size={12} />
                        </div>
                    )}
                    
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
                        <TabButton id="analytic" label="Analytic" active={viewMode === 'analytic'} onClick={setViewMode} />
                        <TabButton id="ledger" label="Matrix" active={viewMode === 'ledger'} onClick={setViewMode} />
                    </div>

                    <button className="h-12 w-12 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-sm" title="Download Report">
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* Performance Data Matrix */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aggregating Records...</p>
                    </motion.div>
                ) : results.length > 0 ? (
                    viewMode === 'analytic' ? (
                        <motion.div key="ana" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            {/* Ranking Matrix */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[1000px]">
                                        <thead>
                                            <tr className="bg-slate-950/50 border-b border-slate-800">
                                                <th className="w-24 border-r border-slate-800 px-6 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rank</th>
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Student Details</th>
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Total Score</th>
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">GPA</th>
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                                <th className="w-48 px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-transparent">
                                            {results.map((res) => (
                                                <tr key={res.id} className="group hover:bg-slate-800/20 transition-all border-b border-slate-800/50 last:border-none">
                                                    <td className="border-r border-slate-800/50 px-6 py-4 text-center font-bold text-slate-400">
                                                        <div className="flex items-center justify-center">
                                                            {RANK_ICONS[res.rank] || (
                                                                <span className="text-sm">#{res.rank}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-white font-bold text-xs">
                                                                {res.first_name[0]}{res.last_name[0]}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{res.first_name} {res.last_name}</p>
                                                                <p className="text-[10px] text-slate-500 font-medium tracking-wide">Roll: {res.roll_number || 'ST-??'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4 text-center">
                                                        <p className="text-sm font-bold text-white tracking-wide">{res.totalObtained.toFixed(1)} <span className="text-slate-600 font-medium">/ {res.totalFull}</span></p>
                                                    </td>
                                                    <td className="px-8 py-4 text-center">
                                                        <span className="text-lg font-bold text-indigo-400 tracking-wide">{res.gpa.toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-8 py-4 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${res.isPass ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                            {res.isPass ? <ShieldCheck size={10} /> : <Zap size={10} />} {res.isPass ? 'Success' : `Failed (${res.failedSub})`}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <button 
                                                            onClick={() => window.open(`/print/grade-sheet/${selectedExam}/${res.id}`, '_blank')}
                                                            className="px-4 py-2 bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ml-auto"
                                                        >
                                                            <FileText size={12} /> Grade Sheet
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="led" initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                             <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[1200px]">
                                    <thead>
                                        <tr className="bg-slate-950/50 border-b border-slate-800">
                                            <th className="w-16 border-r border-slate-800 px-4 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Roll</th>
                                            <th className="min-w-[250px] border-r border-slate-800 px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-950 z-20">Student Name</th>
                                            {routines.map(r => (
                                                <th key={r.id} className="min-w-[100px] border-r border-slate-800 px-4 py-4 text-center">
                                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider leading-none mb-1">{r.subject_name}</p>
                                                    <p className="text-[8px] font-bold text-indigo-400/60 uppercase tracking-wider">FM: {r.effective_full_marks}</p>
                                                </th>
                                            ))}
                                            <th className="min-w-[100px] bg-slate-950 border-x border-slate-800 px-4 py-4 text-center text-[10px] font-bold text-white uppercase tracking-wider">GPA</th>
                                            <th className="min-w-[80px] px-4 py-4 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rank</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-transparent">
                                        {results.map((res) => (
                                            <tr key={res.id} className="hover:bg-slate-800/20 transition-colors border-b border-slate-800/30 last:border-none group">
                                                <td className="border-r border-slate-800/30 px-4 py-3 text-center text-[11px] font-bold text-slate-500">{res.roll_number || '—'}</td>
                                                <td className="border-r border-slate-800/30 px-8 py-3 sticky left-0 bg-slate-900 group-hover:bg-slate-800 transition-colors z-10 text-sm font-bold text-white">
                                                    {res.first_name} {res.last_name}
                                                </td>
                                                {routines.map(r => {
                                                    const cell = gridData[res.id]?.[r.id];
                                                    const isAbsent = cell?.isAbsent;
                                                    const marks = cell?.marks;
                                                    const isFail = marks !== undefined && marks !== '' && parseFloat(marks) < r.effective_pass_marks;
                                                    return (
                                                        <td key={r.id} className={`border-r border-slate-800/30 px-4 py-3 text-center text-sm font-bold ${isFail ? 'text-rose-400 bg-rose-500/5' : 'text-slate-400'}`}>
                                                            {isAbsent ? <span className="text-rose-500/50">ABS</span> : (marks !== undefined && marks !== '' ? marks : '—')}
                                                        </td>
                                                    );
                                                })}
                                                <td className="bg-slate-950 border-x border-slate-800/30 px-4 py-3 text-center text-lg font-bold text-indigo-400 tracking-wide">{res.gpa.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-sm font-bold ${res.rank <= 3 ? 'text-indigo-400' : 'text-slate-500'}`}>
                                                        #{res.rank}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                        </motion.div>
                    )
                ) : (
                    /* Initial Guidance State */
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900 border border-slate-800 rounded-3xl py-24 text-center shadow-lg">
                         <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-6 border border-slate-700">
                            <GraduationCap className="text-slate-500" size={32} />
                         </div>
                         <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Select Examination Cycle</h3>
                         <p className="text-slate-500 font-medium px-10 text-sm uppercase tracking-wider max-w-[450px] mx-auto leading-relaxed">Choose an exam and class sector from the workspace bar above to view performance metrics.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
