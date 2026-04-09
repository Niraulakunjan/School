import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Download, RefreshCw, FileSpreadsheet, Loader2, Trophy, GraduationCap, Users, Medal, Printer, Search, Maximize2, Minimize2
} from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';

const selectCls = "bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all appearance-none";

const GRADE_COLORS = {
    'A+': 'text-emerald-400', A: 'text-emerald-400', 'B+': 'text-blue-400', B: 'text-blue-400',
    'C+': 'text-amber-400', C: 'text-amber-400', D: 'text-orange-400',
    NG: 'text-red-400', AB: 'text-slate-500',
};

function calcGrade(obtained, fullMarks, passMarks, isAbsent) {
    if (isAbsent) return 'AB';
    if (obtained === '' || obtained === null || obtained === undefined) return '—';
    const numObt = parseFloat(obtained);
    const pct = (numObt / fullMarks) * 100;
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C+';
    if (pct >= 40) return 'C';
    if (numObt >= passMarks) return 'D';
    return 'NG';
}

const ViewLedgerRow = React.memo(({ student, sIdx, routines, rowData, metrics, summary }) => {
    const { position, gpa, overallGrade, totalObtained, totalFull } = metrics || {};
    const attend = summary?.attendance !== null && summary?.attendance !== undefined ? summary.attendance : '—';

    return (
        <tr className={`border-b border-slate-800 ${sIdx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/50'} hover:bg-slate-800/40 transition-colors print:border-slate-300 print:bg-white`}>
            <td className="sticky left-0 z-10 bg-inherit border-r border-slate-800 px-4 py-2 text-center text-xs text-slate-500 font-mono w-16 whitespace-nowrap print:static print:px-1 print:py-0.5 print:text-[9px] print:text-black">
                {student.roll_number || (typeof sIdx === 'number' ? sIdx + 1 : '—')}
            </td>
            <td className="sticky left-16 z-10 bg-inherit border-r border-slate-800 px-4 py-2 print:static print:px-2 print:py-0.5">
                <p className="text-white font-semibold text-sm leading-tight print:text-black print:text-[10px]">{student.first_name} {student.last_name}</p>
            </td>
            {routines.map((r) => {
                const isEnrolled = !r.is_elective || (student.elective_subjects || []).includes(r.subject);
                if (!isEnrolled) {
                    return (
                        <td key={r.id} className="border-r border-slate-800 px-2 py-1.5 text-center bg-slate-950/20">
                            <span className="text-[10px] font-black uppercase text-slate-700 tracking-widest">N/A</span>
                        </td>
                    );
                }

                const cell = rowData?.[r.id] || { marks: '', theory_marks: '', practical_marks: '' };
                const isAbsentUser = r.has_practical ? (cell.theory_marks === '' && cell.practical_marks === '') : (cell.marks === '');
                
                let combinedMarks = null;
                if (r.has_practical) {
                    let tm = parseFloat(cell.theory_marks); let pm = parseFloat(cell.practical_marks);
                    if (!isNaN(tm) || !isNaN(pm)) combinedMarks = (isNaN(tm) ? 0 : tm) + (isNaN(pm) ? 0 : pm);
                } else {
                    if (cell.marks !== '') combinedMarks = parseFloat(cell.marks);
                }

                const grade = calcGrade(combinedMarks, r.has_practical ? (r.theory_full_marks + r.practical_full_marks) : r.effective_full_marks, r.effective_pass_marks, isAbsentUser);

                return (
                    <td key={r.id} className="border-r border-slate-800 px-2 py-1.5 text-center whitespace-nowrap print:border-slate-300 print:px-1 print:py-0.5">
                        <div className="flex flex-col items-center">
                            {isAbsentUser ? (
                                <span className="text-slate-600 text-xs font-bold italic">ABS</span>
                            ) : (
                                <>
                                    <div className="text-white font-mono font-bold text-xs">
                                        {r.has_practical ? (
                                            <span className="flex gap-2">
                                                <span title="Theory" className="text-indigo-400">{cell.theory_marks || '0'}</span>
                                                <span className="text-slate-700">/</span>
                                                <span title="Practical" className="text-pink-400">{cell.practical_marks || '0'}</span>
                                            </span>
                                        ) : (
                                            <span>{cell.marks || '0'}</span>
                                        )}
                                    </div>
                                    {grade !== '—' && grade !== 'AB' && (
                                        <span className={`text-[10px] font-black ${GRADE_COLORS[grade] || 'text-slate-400'}`}>{grade}</span>
                                    )}
                                </>
                            )}
                        </div>
                    </td>
                );
            })}
            
            <td className="px-3 py-2 text-center border-l border-slate-800 border-r text-white font-mono text-xs print:static print:px-1 print:py-0.5 print:text-[9px] print:text-black">
                {attend}
            </td>
            <td className="px-3 py-2 text-center border-r border-slate-800 print:static print:px-1 print:py-0.5">
                <p className="font-black text-white font-mono text-xs print:text-black print:text-[9px]">{totalFull > 0 ? `${totalObtained.toFixed(1)}` : '—'}</p>
                <p className="text-[9px] text-slate-500 font-bold print:hidden">/ {totalFull}</p>
            </td>
            <td className="px-3 py-2 text-center border-r border-slate-800 font-black text-violet-400 font-mono text-sm print:static print:px-1 print:py-0.5 print:text-[9px] print:text-black">
                {gpa}
            </td>
            <td className="px-3 py-2 text-center border-r border-slate-800 print:static print:px-1 print:py-0.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ring-1 ring-inset print:static print:px-0 print:py-0 print:text-[9px] print:ring-0 print:text-black ${GRADE_COLORS[overallGrade] ? `${GRADE_COLORS[overallGrade].replace('text-', 'bg-').replace('-400', '-500/10')} ${GRADE_COLORS[overallGrade]} ring-${GRADE_COLORS[overallGrade].split('-')[1]}-500/20` : 'bg-slate-500/10 text-slate-400 ring-slate-500/20'}`}>
                    {overallGrade}
                </span>
            </td>
            <td className="px-3 py-2 text-center print:static print:px-1 print:py-0.5">
                <span className="font-black text-slate-300 text-xs print:text-black print:text-[9px]">{position}</span>
            </td>
        </tr>
    );
});

export default function ViewLedgerPage() {
    const toast = useToast();

    const [exams, setExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [examData, setExamData] = useState(null);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection]  = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [schoolInfo,      setSchoolInfo]       = useState({ name: 'Sajilo School', logo: '', address: '' });

    const [students, setStudents] = useState([]);
    const [routines, setRoutines] = useState([]);
    const [gridData, setGridData] = useState({});
    const [studentSummaries, setStudentSummaries] = useState({});
    
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        axios.get('/exams/').then(r => setExams(r.data)).catch(() => {});
        axios.get('/classes/').then(r => setClasses(r.data)).catch(() => {});
        
        // Fetch branding from both master tenant and local settings
        Promise.all([
            axios.get('/school-settings/'),
            axios.get('/tenants/current/')
        ]).then(([sRes, tRes]) => {
            const settings = sRes.data;
            const tenant   = tRes.data;
            setSchoolInfo({ 
                name: settings.school_name || tenant.name || 'Sajilo School',
                logo: settings.logo || tenant.logo,
                address: settings.address || tenant.address,
                phone: settings.phone || tenant.phone,
                email: settings.email || tenant.email
            });
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (!selectedExam) { setExamData(null); return; }
        const exam = exams.find(e => String(e.id) === String(selectedExam));
        setExamData(exam || null);
        setSelectedClass(''); setSelectedSection(''); setSelectedSubject('');
    }, [selectedExam, exams]);

    const activeClass = classes.find(c => String(c.id) === String(selectedClass));
    const sections = activeClass?.sections || [];

    const loadGrid = useCallback(async () => {
        if (!selectedExam || !selectedClass) return;
        setLoading(true);
        try {
            const classObj = classes.find(c => String(c.id) === String(selectedClass));
            const className = classObj?.name || '';
            
            const limit = 1000;
            let studentUrl = `/students/?class_name=${encodeURIComponent(className)}&limit=${limit}`;
            if (selectedSection) studentUrl += `&section=${encodeURIComponent(selectedSection)}`;

            const [studRes, markRes, sumRes] = await Promise.all([
                axios.get(studentUrl),
                axios.get(`/mark-ledgers/?exam=${selectedExam}&class_obj=${selectedClass}&limit=${limit}`),
                axios.get(`/exam-student-summaries/?exam=${selectedExam}&class_obj=${selectedClass}&limit=${limit}`)
            ]);

            const studentList = (studRes.data.results || studRes.data).filter(s => s.first_name);
            const sortedStudents = studentList.sort((a, b) => {
                const rA = parseInt(a.roll_number, 10);
                const rB = parseInt(b.roll_number, 10);
                if (!isNaN(rA) && !isNaN(rB)) return rA - rB;
                return (a.roll_number || '').localeCompare(b.roll_number || '');
            });

            const filteredRoutines = (examData?.routines || []).filter(r =>
                String(r.class_obj) === String(selectedClass)
            ).sort((a, b) => (a.exam_date || '').localeCompare(b.exam_date || ''));

            const grid = {};
            const sums = {};
            sortedStudents.forEach(s => {
                grid[s.id] = {};
                sums[s.id] = { attendance: '—' };
            });

            markRes.data.forEach(m => {
                if (grid[m.student]) {
                    grid[m.student][m.routine] = {
                        marks: m.marks_obtained !== null ? String(m.marks_obtained) : '',
                        theory_marks: m.theory_marks !== null ? String(m.theory_marks) : '',
                        practical_marks: m.practical_marks !== null ? String(m.practical_marks) : ''
                    };
                }
            });

            sumRes.data.forEach(sm => {
                if (sums[sm.student]) {
                    sums[sm.student] = { attendance: sm.attendance !== null ? String(sm.attendance) : '—' };
                }
            });

            setStudents(sortedStudents);
            setRoutines(filteredRoutines);
            setGridData(grid);
            setStudentSummaries(sums);
        } catch { toast('Failed to load grid', 'error'); }
        finally { setLoading(false); }
    }, [selectedExam, selectedClass, selectedSection, examData, classes, toast]);

    useEffect(() => { loadGrid(); }, [selectedExam, selectedClass, selectedSection]);

    // Computed values
    const availableSubjects = useMemo(() => {
        const set = new Set(routines.map(r => r.subject_name));
        return Array.from(set).sort();
    }, [routines]);

    const displayedRoutines = useMemo(() => {
        if (!selectedSubject) return routines;
        return routines.filter(r => r.subject_name === selectedSubject);
    }, [routines, selectedSubject]);

    const studentMetrics = useMemo(() => {
        if (!students.length || !routines.length) return {};
        
        let arr = students.map(s => {
            let totalObtained = 0, totalFull = 0;
            routines.forEach(r => {
                const cell = gridData[s.id]?.[r.id];
                if (!cell) return;
                const isAbsentUser = r.has_practical ? (cell.theory_marks === '' && cell.practical_marks === '') : (cell.marks === '');
                const routineFull = (r.has_practical ? (r.theory_full_marks + r.practical_full_marks) : r.effective_full_marks) || 100;
                
                if (!isAbsentUser) {
                    if (r.has_practical) {
                        totalObtained += (parseFloat(cell.theory_marks) || 0) + (parseFloat(cell.practical_marks) || 0);
                    } else {
                        totalObtained += parseFloat(cell.marks) || 0;
                    }
                }
                totalFull += routineFull;
            });
            const pct = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0;
            const gpa = pct >= 90 ? '4.00' : pct >= 80 ? '3.60' : pct >= 70 ? '3.20' : pct >= 60 ? '2.80' : pct >= 50 ? '2.40' : pct >= 40 ? '2.00' : pct >= 35 ? '1.60' : '0.00';
            const overallGrade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C+' : pct >= 40 ? 'C' : pct >= 35 ? 'D' : 'NG';
            return { s_id: s.id, totalObtained, totalFull, gpa, overallGrade };
        });

        arr.sort((a, b) => b.totalObtained - a.totalObtained);
        const metricsMap = {};
        let lastObt = -1, lastRank = 0;
        arr.forEach((item, idx) => {
            if (item.totalObtained !== lastObt) {
                lastRank = idx + 1;
                lastObt = item.totalObtained;
            }
            let pos = lastRank + "th";
            if (lastRank % 10 === 1 && lastRank % 100 !== 11) pos = lastRank + "st";
            else if (lastRank % 10 === 2 && lastRank % 100 !== 12) pos = lastRank + "nd";
            else if (lastRank % 10 === 3 && lastRank % 100 !== 13) pos = lastRank + "rd";
            
            metricsMap[item.s_id] = { ...item, position: item.totalObtained > 0 ? pos : '—' };
        });
        return metricsMap;
    }, [students, routines, gridData]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return students;
        const term = searchTerm.toLowerCase();
        return students.filter(s => 
            `${s.first_name} ${s.last_name}`.toLowerCase().includes(term) ||
            (s.roll_number && String(s.roll_number).includes(term))
        );
    }, [students, searchTerm]);

    const studentMetricData = studentMetrics;

    const exportCSV = () => {
        const headers = ['Roll', 'Name', 'Section', ...routines.map(r => r.subject_name), 'Attd', 'Total', 'GPA', 'Grade', 'Pos'];
        const rows = students.map(s => {
            const rowMarks = routines.map(r => {
                const cell = gridData[s.id]?.[r.id];
                if (!cell) return '';
                const isAbsentUser = r.has_practical ? (cell.theory_marks === '' && cell.practical_marks === '') : (cell.marks === '');
                if (isAbsentUser) return 'ABS';
                return r.has_practical ? ((parseFloat(cell.theory_marks) || 0) + (parseFloat(cell.practical_marks) || 0)) : (cell.marks || '0');
            });
            const m = studentMetrics[s.id] || {};
            return [s.roll_number || '', `${s.first_name} ${s.last_name}`, s.section || '', ...rowMarks, studentSummaries[s.id]?.attendance || '', m.totalObtained, m.gpa, m.overallGrade, m.position];
        });
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `Ledger_${examData?.name || 'Export'}_${activeClass?.name || ''}.csv`;
        a.click();
    };

    const handlePrint = () => {
        window.print();
    };

    const topbarPortal = document.getElementById('topbar-portal');
    const actionsPortal = document.getElementById('topbar-actions-portal');

    return (
        <div className="-mt-6 -mx-6 -mb-6 h-[calc(100vh-64px)] flex flex-col bg-slate-950 overflow-hidden">
            {topbarPortal && createPortal(
                <div className="flex items-center gap-4 px-2 w-full">
                    <div className="flex flex-col border-r border-slate-700 pr-4 mr-1 hidden lg:flex shrink-0">
                        <span className="text-sm font-bold text-white leading-tight">View Ledger</span>
                        <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Read Only</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className={selectCls + ' py-1.5 px-3 min-w-[130px] text-xs'}>
                            <option value="">-- Exam --</option>
                            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }} disabled={!selectedExam} className={selectCls + ' py-1.5 px-3 w-28 text-xs'}>
                            <option value="">-- Class --</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedClass} className={selectCls + ' py-1.5 px-3 min-w-[100px] text-xs'}>
                            <option value="">-- All Sec --</option>
                            {sections.map(sec => <option key={sec.id} value={sec.name}>{sec.name}</option>)}
                        </select>
                        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!selectedClass} className={selectCls + ' py-1.5 px-3 min-w-[120px] text-xs'}>
                            <option value="">-- All Subjects --</option>
                            {availableSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                        <div className="relative ml-2 hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                            <input 
                                type="text"
                                placeholder="Find student..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-slate-900 border border-slate-700/50 rounded-xl py-1.5 pl-8 pr-4 text-[11px] font-medium text-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 w-32 transition-all"
                            />
                        </div>
                        {students.length > 0 && <span className="text-[10px] items-center gap-1.5 text-slate-500 font-bold hidden lg:flex"><FileSpreadsheet size={12}/> XLS Export Ready</span>}
                    </div>
                </div>,
                topbarPortal
            )}

            {actionsPortal && createPortal(
                <div className="flex items-center gap-2">
                    <button 
                        onClick={async () => {
                            try {
                                if (!document.fullscreenElement) {
                                    await document.documentElement.requestFullscreen();
                                    setIsFullscreen(true);
                                } else {
                                    if (document.exitFullscreen) {
                                        await document.exitFullscreen();
                                        setIsFullscreen(false);
                                    }
                                }
                            } catch (e) {}
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 rounded-lg border border-slate-700 transition-all shrink-0" title="Full Screen">
                        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>
                    {examData && (
                        <div className="flex items-center bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg mr-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase mr-2.5">Working Days:</span>
                            <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{examData.total_working_days || '—'}</span>
                        </div>
                    )}
                    <button onClick={exportCSV} disabled={!students.length} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-lg text-xs font-bold transition-all border border-slate-700 whitespace-nowrap">
                        <Download size={13} /> Export
                    </button>
                    <button onClick={handlePrint} disabled={!students.length} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white rounded-lg text-xs font-bold transition-all shadow-md whitespace-nowrap">
                        <Printer size={13} /> Print
                    </button>
                    <button onClick={loadGrid} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-all">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>,
                actionsPortal
            )}

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-violet-500" />
                </div>
            ) : !selectedExam || !selectedClass ? (
                <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-40">
                    <FileSpreadsheet size={64} className="mb-4 text-slate-700" />
                    <p className="text-xl font-black text-white italic">Select Filters to View Ledger</p>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="px-4 py-1.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
                        <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <span>Students: <span className="text-slate-300">{students.length}</span></span>
                            <span>Subjects: <span className="text-slate-300">{routines.length}</span></span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-slate-900/40 print:bg-white print:overflow-visible no-scrollbar">
                        {/* SCREEN ONLY SUMMARY (Hidden on Print) */}
                        <div className="px-4 py-1.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0 print:hidden">
                            <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <span>Students: <span className="text-slate-300">{students.length}</span></span>
                                <span>Subjects: <span className="text-slate-300">{routines.length}</span></span>
                            </div>
                        </div>

                        {/* SCREEN ONLY VIEW */}
                        <div className="print:hidden">
                            <table className="text-sm border-collapse min-w-full">
                                <thead className="sticky top-0 z-30">
                                    <tr className="bg-slate-800/90 backdrop-blur-md">
                                        <th className="sticky left-0 z-40 bg-slate-800 border-b border-r border-slate-700 px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider w-16">Roll</th>
                                        <th className="sticky left-16 z-40 bg-slate-800 border-b border-r border-slate-700 px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[200px]">Student Details</th>
                                        {displayedRoutines.map(r => (
                                            <th key={r.id} className="border-b border-r border-slate-700 px-3 py-2 text-center min-w-[100px]">
                                                <p className="text-[10px] font-black text-white leading-tight uppercase tracking-tighter">{r.subject_name}</p>
                                                <div className="flex gap-1 justify-center mt-1 scale-75 origin-center">
                                                    <span className="text-[9px] px-1 bg-slate-900 text-slate-400 rounded border border-slate-700 uppercase font-bold">FM: {r.has_practical ? (r.theory_full_marks + r.practical_full_marks) : r.effective_full_marks}</span>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="border-b border-r border-slate-700 px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[60px]">Attd</th>
                                        <th className="border-b border-r border-slate-700 px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[80px]">Total</th>
                                        <th className="border-b border-r border-slate-700 px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[60px]">GPA</th>
                                        <th className="border-b border-r border-slate-700 px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[60px]">Grade</th>
                                        <th className="border-b border-slate-700 px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[70px]">Pos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student, sIdx) => (
                                        <ViewLedgerRow
                                            key={student.id}
                                            student={student}
                                            sIdx={sIdx}
                                            routines={displayedRoutines}
                                            rowData={gridData[student.id]}
                                            metrics={studentMetrics[student.id]}
                                            summary={studentSummaries[student.id]}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* PRINT CHUNKED VIEW (25 students per page) */}
                        <div className="hidden print:block text-black">
                            {(() => {
                                const CHUNK_SIZE = 18;
                                const chunks = [];
                                for (let i = 0; i < students.length; i += CHUNK_SIZE) {
                                    chunks.push(students.slice(i, i + CHUNK_SIZE));
                                }
                                return chunks.map((chunk, chunkIdx) => {
                                    return (
                                        <div key={chunkIdx} className="page-break" style={{ pageBreakAfter: chunkIdx === chunks.length - 1 ? 'auto' : 'always', paddingBottom: '5px' }}>
                                            {/* PRINT HEADER ON EVERY PAGE */}
                                            <div className="p-6 border-b-2 border-slate-950 mb-6 bg-white shrink-0">
                                                <div className="flex justify-between items-center gap-8">
                                                    {/* LOGO */}
                                                    <div className="w-32 h-32 flex-shrink-0 flex items-center justify-center">
                                                        {schoolInfo.logo ? (
                                                            <img src={schoolInfo.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                                                        ) : (
                                                            <GraduationCap size={64} className="text-slate-300" />
                                                        )}
                                                    </div>

                                                    {/* SCHOOL IDENTITY */}
                                                    <div className="flex-1 text-center space-y-1">
                                                        <h1 className="text-4xl font-black text-slate-950 uppercase tracking-tight leading-none mb-1">{schoolInfo.name}</h1>
                                                        <p className="text-base font-black text-slate-700 uppercase tracking-[0.2em]">{schoolInfo.address}</p>
                                                        <div className="flex justify-center gap-6 text-[11px] font-black text-slate-500 uppercase mt-2">
                                                            {schoolInfo.phone && <span className="flex items-center gap-1.5 font-mono">TEL: {schoolInfo.phone}</span>}
                                                            {schoolInfo.email && <span className="flex items-center gap-1.5 font-mono">EMAIL: {schoolInfo.email}</span>}
                                                        </div>
                                                    </div>

                                                    {/* CLASS INFO */}
                                                    <div className="w-40 text-right space-y-1">
                                                        <div className="inline-block bg-slate-950 text-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                                                            Official Ledger
                                                        </div>
                                                        <div className="space-y-0 text-slate-900">
                                                            <p className="text-xl font-black leading-none">Class: {activeClass?.name}</p>
                                                            <p className="text-xs font-bold uppercase tracking-widest mt-1">Section: {selectedSection || 'All'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-6 flex justify-between items-end border-t-2 border-slate-950 pt-2">
                                                    <div className="text-xs font-black uppercase tracking-widest text-slate-900 bg-slate-100 px-3 py-1">
                                                        {examData?.name} — {examData?.financial_year_name}
                                                    </div>
                                                    <div className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">
                                                        SHEET {chunkIdx + 1} OF {chunks.length}
                                                    </div>
                                                </div>
                                            </div>

                                            <table className="text-[10px] border-collapse min-w-full print:text-black border border-slate-300">
                                                <thead>
                                                    <tr className="bg-slate-50 text-black">
                                                        <th className="border border-slate-300 px-2 py-2 text-center font-black uppercase tracking-wider w-10">Roll</th>
                                                        <th className="border border-slate-300 px-3 py-2 text-left font-black uppercase tracking-wider min-w-[150px]">Student Name</th>
                                                        {displayedRoutines.map(r => (
                                                            <th key={r.id} className="border border-slate-300 px-0.5 py-1 text-center min-w-[50px] max-w-[70px]">
                                                                <p className="font-black text-slate-900 leading-tight uppercase scale-75 origin-center">{r.subject_name}</p>
                                                                <p className="text-[6px] text-slate-400 font-black mt-0.5">FM:{r.has_practical ? (r.theory_full_marks + r.practical_full_marks) : r.effective_full_marks}</p>
                                                            </th>
                                                        ))}
                                                        <th className="border border-slate-300 px-1 py-1 text-center font-black uppercase w-8">Attd</th>
                                                        <th className="border border-slate-300 px-1 py-1 text-center font-black uppercase w-10">Total</th>
                                                        <th className="border border-slate-300 px-1 py-1 text-center font-black uppercase w-8">GPA</th>
                                                        <th className="border border-slate-300 px-1 py-1 text-center font-black uppercase w-8">Grade</th>
                                                        <th className="border border-slate-300 px-1 py-1 text-center font-black uppercase w-10">Pos</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {chunk.map((student, cIdx) => (
                                                        <ViewLedgerRow
                                                            key={student.id}
                                                            student={student}
                                                            sIdx={chunkIdx * CHUNK_SIZE + cIdx}
                                                            routines={displayedRoutines}
                                                            rowData={gridData[student.id]}
                                                            metrics={studentMetricData[student.id]}
                                                            summary={studentSummaries[student.id]}
                                                        />
                                                    ))}
                                                </tbody>
                                            </table>

                                            {/* PRINT FOOTER ON EVERY PAGE */}
                                            <div className="mt-20 px-4 pb-4">
                                                <div className="flex justify-between items-end gap-16">
                                                    <div className="text-center space-y-1.5 flex-1">
                                                        <div className="w-full border-b border-black" />
                                                        <p className="text-[10px] font-black uppercase text-black leading-none">Class Teacher</p>
                                                    </div>
                                                    <div className="text-center flex-1">
                                                        <p className="text-[11px] font-black text-black border-b border-black px-3 inline-block tracking-widest leading-none pb-0.5 font-mono uppercase italic">{schoolInfo.result_date || '2079 / 01 / 01'}</p>
                                                        <p className="text-[8px] font-black uppercase text-black tracking-[0.2em] mt-1 leading-none">Result Date</p>
                                                    </div>
                                                    <div className="text-center space-y-1.5 flex-1">
                                                        <div className="w-full border-b border-black" />
                                                        <p className="text-[10px] font-black uppercase text-black leading-none">Principal</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}
            
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: landscape; margin: 8mm; }
                    body { background: white !important; }
                    header, nav, aside, footer, #topbar-portal, #topbar-actions-portal, .flex.justify-between.items-center.shrink-0 { 
                        display: none !important; 
                    }
                    /* Fixed oversized logo by removing generic div width/height overrides */
                    .page-break { page-break-after: always; }
                    tr, td, th { border-color: #000 !important; color: black !important; background: transparent !important; }
                    .sticky { position: static !important; }
                    .print-hide { display: none !important; }
                    span, p, div, h1, h2, h3 { color: black !important; }
                    table { table-layout: fixed !important; width: 100% !important; border: 1px solid black !important; }
                }
            ` }} />
        </div>
    );
}
