import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    ChevronDown, Save, Loader2, CheckCircle2, AlertCircle,
    Download, RefreshCw, FileSpreadsheet, Settings, X, Search, Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
const selectCls = "bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all appearance-none";
const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";

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

function calcGPA(pct) {
    if (pct === null || isNaN(pct)) return '—';
    if (pct >= 90) return '4.00';
    if (pct >= 80) return '3.60';
    if (pct >= 70) return '3.20';
    if (pct >= 60) return '2.80';
    if (pct >= 50) return '2.40';
    if (pct >= 40) return '2.00';
    if (pct >= 35) return '1.60';
    return '0.00';
}

const LedgerRow = React.memo(({ student, sIdx, routines, rowData, metrics, summary, updateCell, updateSummary, handleKeyDown }) => {

    const { position, gpa, overallGrade, totalObtained, totalFull } = metrics || {};
    const attend = summary?.attendance !== null && summary?.attendance !== undefined ? summary.attendance : '';

    return (
        <tr className={`border-b border-slate-800 ${sIdx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/50'} hover:bg-slate-800/40 transition-colors`}>
            {/* Same ID/Name cols */}
            <td className="sticky left-0 z-10 bg-inherit border-r border-slate-800 px-4 py-2 text-center text-xs text-slate-500 font-mono w-16 whitespace-nowrap">
                {student.roll_number || sIdx + 1}
            </td>
            <td className="sticky left-16 z-10 bg-inherit border-r border-slate-800 px-4 py-2">
                <p className="text-white font-semibold text-sm leading-tight">{student.first_name} {student.last_name}</p>
                <p className="text-slate-500 text-[10px]">{student.class_name} {student.section ? `- ${student.section}` : ''}</p>
            </td>
            {routines.map((r, rIdx) => {
                const isEnrolled = !r.is_elective || (student.elective_subjects || []).includes(r.subject);
                
                if (!isEnrolled) {
                    return (
                        <td key={r.id} className="border-r border-slate-800 px-2 py-1.5 text-center bg-slate-950/20">
                            <div className="flex flex-col items-center justify-center opacity-40">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-tight">Not Opted</span>
                                <div className="w-8 h-px bg-slate-700 mt-2 mb-1" />
                            </div>
                        </td>
                    );
                }

                const cell = rowData?.[r.id] || { marks: '', theory_marks: '', practical_marks: '' };
                const isAbsentUser = r.has_practical ? (cell.theory_marks === '' && cell.practical_marks === '') : (cell.marks === '');
                
                let combinedMarks = null;
                let isInvalid = false;
                
                if (r.has_practical) {
                    let tm = parseFloat(cell.theory_marks); let pm = parseFloat(cell.practical_marks);
                    if (!isNaN(tm) || !isNaN(pm)) {
                        combinedMarks = (isNaN(tm) ? 0 : tm) + (isNaN(pm) ? 0 : pm);
                    }
                    if (!isAbsentUser) {
                        if (!isNaN(tm) && (tm > r.theory_full_marks || tm < 0)) isInvalid = true;
                        if (!isNaN(pm) && (pm > r.practical_full_marks || pm < 0)) isInvalid = true;
                    }
                } else {
                    if (cell.marks !== '') combinedMarks = parseFloat(cell.marks);
                    if (!isAbsentUser && combinedMarks !== null && (combinedMarks > r.effective_full_marks || combinedMarks < 0)) isInvalid = true;
                }

                const grade = calcGrade(combinedMarks, r.has_practical ? (r.theory_full_marks + r.practical_full_marks) : r.effective_full_marks, r.effective_pass_marks, isAbsentUser);

                return (
                    <td key={r.id} className="border-r border-slate-800 px-2 py-1.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                            {r.has_practical ? (
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number" data-cell value={cell.theory_marks} min={0} max={r.theory_full_marks}
                                        onChange={e => updateCell(student.id, r.id, 'theory_marks', e.target.value)}
                                        onKeyDown={e => handleKeyDown(e)}
                                        className={`w-12 text-center bg-slate-800 border rounded-lg py-1 px-1 text-xs font-mono text-white outline-none transition-all placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/40 ${isInvalid && (parseFloat(cell.theory_marks)>r.theory_full_marks) ? 'border-red-500 bg-red-500/10' : 'border-slate-700 focus:border-violet-500'}`}
                                        placeholder="TH"
                                    />
                                    <input
                                        type="number" data-cell value={cell.practical_marks} min={0} max={r.practical_full_marks}
                                        onChange={e => updateCell(student.id, r.id, 'practical_marks', e.target.value)}
                                        onKeyDown={e => handleKeyDown(e)}
                                        className={`w-12 text-center bg-slate-800 border rounded-lg py-1 px-1 text-xs font-mono text-white outline-none transition-all placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/40 ${isInvalid && (parseFloat(cell.practical_marks)>r.practical_full_marks) ? 'border-red-500 bg-red-500/10' : 'border-slate-700 focus:border-violet-500'}`}
                                        placeholder="PR"
                                    />
                                </div>
                            ) : (
                                <input
                                    type="number"
                                    data-cell
                                    value={cell.marks}
                                    min={0}
                                    max={r.effective_full_marks}
                                    onChange={e => updateCell(student.id, r.id, 'marks', e.target.value)}
                                    onKeyDown={e => handleKeyDown(e)}
                                    className={`w-16 text-center bg-slate-800 border rounded-lg py-1 px-1.5 text-sm font-mono text-white outline-none transition-all focus:ring-2 focus:ring-violet-500/40 ${isInvalid ? 'border-red-500 bg-red-500/10' : 'border-slate-700 focus:border-violet-500'}`}
                                    placeholder="—"
                                />
                            )}
                            <div className="flex items-center gap-1.5 min-h-[14px]">
                                {grade !== '—' && grade !== 'AB' && (
                                    <span className={`text-[10px] font-black ${GRADE_COLORS[grade] || 'text-slate-400'}`}>{grade}</span>
                                )}
                            </div>
                        </div>
                    </td>
                );
            })}
            
            <td className="px-3 py-2 text-center border-l border-slate-800 border-r">
                <input 
                    type="number" data-cell
                    value={attend}
                    onChange={e => updateSummary(student.id, 'attendance', e.target.value)}
                    onKeyDown={e => handleKeyDown(e)}
                    className="w-16 text-center bg-slate-800 border-slate-700 border rounded-lg py-1 px-1.5 text-sm font-mono text-white outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
                    placeholder="—"
                />
            </td>
            <td className="px-3 py-2 text-center border-r border-slate-800">
                <p className="font-black text-white font-mono text-xs">{totalFull > 0 ? `${totalObtained.toFixed(1)}` : '—'}</p>
                <p className="text-[9px] text-slate-500 font-bold">out of {totalFull}</p>
            </td>
            <td className="px-3 py-2 text-center border-r border-slate-800 font-black text-violet-400 font-mono text-sm group-hover:scale-110 transition-transform">
                {gpa}
            </td>
            <td className="px-3 py-2 text-center border-r border-slate-800">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ring-1 ring-inset ${GRADE_COLORS[overallGrade] ? `${GRADE_COLORS[overallGrade].replace('text-', 'bg-').replace('-400', '-500/10')} ${GRADE_COLORS[overallGrade]} ring-${GRADE_COLORS[overallGrade].split('-')[1]}-500/20` : 'bg-slate-500/10 text-slate-400 ring-slate-500/20'}`}>
                    {overallGrade}
                </span>
            </td>
            <td className="px-3 py-2 text-center">
                <span className="font-black text-slate-300 text-xs">{position}</span>
            </td>
        </tr>
    );
});

// ── Routine Config Modal ─────────────────────────────────
const RoutineConfigModal = ({ isOpen, onClose, routine, onSaved }) => {
    const toast = useToast();
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (routine) {
            setForm({
                has_practical: routine.has_practical || false,
                theory_full_marks: routine.theory_full_marks || '',
                theory_pass_marks: routine.theory_pass_marks || '',
                practical_full_marks: routine.practical_full_marks || '',
                practical_pass_marks: routine.practical_pass_marks || '',
                full_marks: routine.effective_full_marks || '',
                pass_marks: routine.effective_pass_marks || ''
            });
        }
    }, [routine, isOpen]);

    if (!isOpen || !form) return null;

    const submit = async (e) => {
        e.preventDefault(); setSaving(true);
        const payload = { ...form };
        if (!payload.full_marks) delete payload.full_marks;
        if (!payload.pass_marks) delete payload.pass_marks;
        if (!payload.theory_full_marks) delete payload.theory_full_marks;
        if (!payload.theory_pass_marks) delete payload.theory_pass_marks;
        if (!payload.practical_full_marks) delete payload.practical_full_marks;
        if (!payload.practical_pass_marks) delete payload.practical_pass_marks;

        try {
            await axios.patch(`/exam-routines/${routine.id}/`, payload);
            toast('Routine updated!');
            onSaved();
            onClose();
        } catch (err) {
            toast('Failed to update routine', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <motion.div onClick={onClose} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col"
                >
                    <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 to-purple-500" />
                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
                        <p className="font-black text-white">Config: {routine.subject_name}</p>
                        <button onClick={onClose} className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"><X size={16} /></button>
                    </div>
                    <form onSubmit={submit} className="p-5 space-y-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                            <input type="checkbox" checked={form.has_practical} onChange={e => setForm(p => ({ ...p, has_practical: e.target.checked }))} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-violet-500 focus:ring-violet-500" />
                            <span className="text-xs font-bold text-violet-400">Split Theory / Practical</span>
                        </label>
                        
                        {form.has_practical ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3 bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10">
                                    <div className="col-span-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">Theory</div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Marks</label>
                                        <input required type="number" value={form.theory_full_marks} onChange={e => setForm(p => ({ ...p, theory_full_marks: e.target.value }))} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pass Marks</label>
                                        <input required type="number" value={form.theory_pass_marks} onChange={e => setForm(p => ({ ...p, theory_pass_marks: e.target.value }))} className={inputCls} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 bg-pink-500/5 p-3 rounded-xl border border-pink-500/10">
                                    <div className="col-span-2 text-[10px] font-black text-pink-400 uppercase tracking-widest text-center">Practical</div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Marks</label>
                                        <input required type="number" value={form.practical_full_marks} onChange={e => setForm(p => ({ ...p, practical_full_marks: e.target.value }))} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pass Marks</label>
                                        <input required type="number" value={form.practical_pass_marks} onChange={e => setForm(p => ({ ...p, practical_pass_marks: e.target.value }))} className={inputCls} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Total Full</label>
                                    <input type="number" value={form.full_marks} onChange={e => setForm(p => ({ ...p, full_marks: e.target.value }))} className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Total Pass</label>
                                    <input type="number" value={form.pass_marks} onChange={e => setForm(p => ({ ...p, pass_marks: e.target.value }))} className={inputCls} />
                                </div>
                            </div>
                        )}
                        <div className="pt-2">
                            <button type="submit" disabled={saving} className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all">
                                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Update Structure
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

// ── Working Days Input (Isolated to prevent main grid refreshes) ──
const WorkingDaysInput = ({ val, examId, onRemoteUpdate }) => {
    const [localVal, setLocalVal] = useState(val || '');
    const timer = useRef(null);

    useEffect(() => { setLocalVal(val || ''); }, [val]);

    const handleChange = (e) => {
        const v = e.target.value;
        setLocalVal(v);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
            try {
                await axios.patch(`/exams/${examId}/`, { total_working_days: v === '' ? null : parseInt(v, 10) });
                if (onRemoteUpdate) onRemoteUpdate(v);
            } catch (err) { console.error('Failed to save working days'); }
        }, 1000);
    };

    return (
        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden h-[30px] mr-1">
            <span className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-800 h-full flex items-center border-r border-slate-700">Days</span>
            <input 
                type="number" 
                className="w-12 bg-transparent text-white text-xs font-mono text-center outline-none h-full placeholder:text-slate-600 focus:bg-slate-800 transition-colors" 
                value={localVal}
                onChange={handleChange}
                placeholder="—"
            />
        </div>
    );
};

export default function MarkLedgerPage() {
    const toast = useToast();

    // Filters
    const [exams, setExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [examData, setExamData] = useState(null);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Grid data
    const [students, setStudents] = useState([]);
    const [routines, setRoutines] = useState([]);  // columns
    const [gridData, setGridData] = useState({});  // { studentId: { routineId: { marks, isAbsent } } }
    const [studentSummaries, setStudentSummaries] = useState({}); // { studentId: { attendance } }
    const [existingMarks, setExistingMarks] = useState([]);

    const [configModal, setConfigModal] = useState({ open: false, routine: null });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const gridRef = useRef(null);

    // Load exams and classes on mount
    useEffect(() => {
        axios.get('/exams/').then(r => setExams(r.data)).catch(() => {});
        axios.get('/classes/').then(r => setClasses(r.data)).catch(() => {});
    }, []);

    // When exam selected, update examData
    useEffect(() => {
        if (!selectedExam) { setExamData(null); return; }
        const exam = exams.find(e => String(e.id) === String(selectedExam));
        setExamData(exam || null);
        setSelectedClass(''); setSelectedSection(''); setSelectedSubject('');
    }, [selectedExam, exams]);

    const activeClass = classes.find(c => String(c.id) === String(selectedClass));
    const sections = activeClass?.sections || [];

    // Load grid when filters change
    const loadGrid = useCallback(async () => {
        if (!selectedExam || !selectedClass) return;
        setLoading(true);
        try {
            const classObj = classes.find(c => String(c.id) === String(selectedClass));
            const className = classObj?.name || '';
            
            let studentUrl = `/students/?class_name=${encodeURIComponent(className)}`;
            if (selectedSection) studentUrl += `&section=${encodeURIComponent(selectedSection)}`;

            const [studRes, markRes, sumRes] = await Promise.all([
                axios.get(studentUrl),
                axios.get(`/mark-ledgers/?exam=${selectedExam}&class_obj=${selectedClass}`),
                axios.get(`/exam-student-summaries/?exam=${selectedExam}&class_obj=${selectedClass}`)
            ]);

            const studentList = (studRes.data.results || studRes.data).filter(s => s.first_name);
            const filteredStudents = studentList
                .sort((a, b) => {
                    const rA = a.roll_number;
                    const rB = b.roll_number;
                    if (rA && rB) {
                        const numA = parseInt(rA, 10);
                        const numB = parseInt(rB, 10);
                        if (!isNaN(numA) && !isNaN(numB)) {
                            if (numA !== numB) return numA - numB;
                        }
                        return String(rA).localeCompare(String(rB));
                    }
                    if (rA) return -1;
                    if (rB) return 1;
                    return String(a.first_name).localeCompare(String(b.first_name));
                });

            // Filter routines for this class
            const filteredRoutines = (examData?.routines || []).filter(r =>
                String(r.class_obj) === String(selectedClass)
            ).sort((a, b) => a.exam_date > b.exam_date ? 1 : -1);

            setStudents(filteredStudents);
            setRoutines(filteredRoutines);
            setExistingMarks(markRes.data);

            // Build grid data from existing marks
            const grid = {};
            const sums = {};
            filteredStudents.forEach(s => {
                grid[s.id] = {};
                sums[s.id] = { attendance: '' };
                filteredRoutines.forEach(r => {
                    grid[s.id][r.id] = { marks: '', theory_marks: '', practical_marks: '' };
                });
            });
            markRes.data.forEach(m => {
                if (grid[m.student] && grid[m.student][m.routine] !== undefined) {
                    grid[m.student][m.routine] = {
                        marks: m.marks_obtained !== null ? String(m.marks_obtained) : '',
                        theory_marks: m.theory_marks !== null ? String(m.theory_marks) : '',
                        practical_marks: m.practical_marks !== null ? String(m.practical_marks) : ''
                    };
                }
            });
            (sumRes.data || []).forEach(sm => {
                 if (sums[sm.student]) {
                     sums[sm.student] = { attendance: sm.attendance !== null ? String(sm.attendance) : '' };
                 }
            });
            setGridData(grid);
            setStudentSummaries(sums);
            setDirty(false);
        } catch { toast('Failed to load grid', 'error'); }
        finally { setLoading(false); }
    }, [selectedExam, selectedClass, selectedSection, examData?.routines, toast]);

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

    const updateCell = useCallback((studentId, routineId, field, value) => {
        setGridData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [routineId]: { ...prev[studentId][routineId], [field]: value }
            }
        }));
        setDirty(true);
    }, []);

    const updateSummary = useCallback((studentId, field, value) => {
        setStudentSummaries(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [field]: value }
        }));
        setDirty(true);
    }, []);

    const handleKeyDown = useCallback((e) => {
        const inputs = Array.from(gridRef.current?.querySelectorAll('input[data-cell]') || []);
        if (!inputs.length) return;
        
        const currentIndex = inputs.indexOf(e.target);
        if (currentIndex === -1) return;

        if (e.key === 'Tab' || e.key === 'ArrowRight') {
            e.preventDefault();
            const next = currentIndex + 1;
            if (next < inputs.length) {
                inputs[next].focus();
                inputs[next].select();
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const next = currentIndex - 1;
            if (next >= 0) {
                inputs[next].focus();
                inputs[next].select();
            }
        } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            const td = e.target.closest('td');
            const tr = e.target.closest('tr');
            if (td && tr) {
                const cellIndex = td.cellIndex;
                const inputIndexInTd = Array.from(td.querySelectorAll('input[data-cell]')).indexOf(e.target);
                let nextTr = tr.nextElementSibling;
                while (nextTr) {
                    const nextTd = nextTr.cells[cellIndex];
                    if (nextTd) {
                        const nextInputs = nextTd.querySelectorAll('input[data-cell]');
                        if (nextInputs.length > 0) {
                            nextInputs[Math.min(inputIndexInTd, nextInputs.length - 1)].focus();
                            nextInputs[Math.min(inputIndexInTd, nextInputs.length - 1)].select();
                            return;
                        }
                    }
                    nextTr = nextTr.nextElementSibling;
                }
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const td = e.target.closest('td');
            const tr = e.target.closest('tr');
            if (td && tr) {
                const cellIndex = td.cellIndex;
                const inputIndexInTd = Array.from(td.querySelectorAll('input[data-cell]')).indexOf(e.target);
                let prevTr = tr.previousElementSibling;
                while (prevTr) {
                    const prevTd = prevTr.cells[cellIndex];
                    if (prevTd) {
                        const prevInputs = prevTd.querySelectorAll('input[data-cell]');
                        if (prevInputs.length > 0) {
                            prevInputs[Math.min(inputIndexInTd, prevInputs.length - 1)].focus();
                            prevInputs[Math.min(inputIndexInTd, prevInputs.length - 1)].select();
                            return;
                        }
                    }
                    prevTr = prevTr.previousElementSibling;
                }
            }
        }
    }, []);

    const saveAll = async () => {
        setSaving(true);
        try {
            const markPayload = [];
            const summaryPayload = [];

            students.forEach(s => {
                routines.forEach(r => {
                    const cell = gridData[s.id]?.[r.id];
                    if (!cell) return;
                    const isAbsentUser = r.has_practical ? (cell.theory_marks === '' && cell.practical_marks === '') : (cell.marks === '');
                    markPayload.push({
                        student: s.id,
                        routine: r.id,
                        marks_obtained: isAbsentUser ? null : (cell.marks !== '' ? parseFloat(cell.marks) : null),
                        theory_marks: isAbsentUser ? null : (cell.theory_marks !== '' ? parseFloat(cell.theory_marks) : null),
                        practical_marks: isAbsentUser ? null : (cell.practical_marks !== '' ? parseFloat(cell.practical_marks) : null),
                        is_absent: isAbsentUser,
                    });
                });
                const sm = studentSummaries[s.id];
                if (sm) {
                    summaryPayload.push({
                        exam: selectedExam,
                        student: s.id,
                        class_obj: selectedClass,
                        attendance: sm.attendance !== '' ? parseInt(sm.attendance, 10) : null
                    });
                }
            });

            await Promise.all([
                axios.post('/mark-ledgers/bulk-save/', markPayload),
                axios.post('/exam-student-summaries/bulk-save/', summaryPayload)
            ]);
            
            toast('Everything synchronized perfectly!', 'success');
            setDirty(false);
            loadGrid();
        } catch { toast('Save failed. Please try again.', 'error'); }
        finally { setSaving(false); }
    };

    // Student global metrics calculation (including rank calculation)
    const studentMetrics = useMemo(() => {
        if (!students.length || !routines.length) return {};
        
        let arr = students.map(s => {
            let totalObtained = 0, totalFull = 0;
            routines.forEach(r => {
                const cell = gridData[s.id]?.[r.id];
                if (!cell) return;
                const isAbsentUser = r.has_practical ? (cell.theory_marks === '' && cell.practical_marks === '') : (cell.marks === '');
                if (!isAbsentUser) {
                    if (r.has_practical) {
                        let s_tot = 0; let s_any = false;
                        if (cell.theory_marks !== '') { s_tot += parseFloat(cell.theory_marks); s_any = true; }
                        if (cell.practical_marks !== '') { s_tot += parseFloat(cell.practical_marks); s_any = true; }
                        if (s_any) {
                            totalObtained += s_tot;
                            totalFull += (r.theory_full_marks + r.practical_full_marks) || r.effective_full_marks;
                        }
                    } else {
                        if (cell.marks !== '') {
                            const m = parseFloat(cell.marks);
                            if (!isNaN(m)) { 
                                totalObtained += m; 
                                totalFull += r.effective_full_marks; 
                            }
                        }
                    }
                } else {
                    totalFull += r.has_practical ? ((r.theory_full_marks + r.practical_full_marks) || r.effective_full_marks) : r.effective_full_marks;
                }
            });
            const pct = totalFull > 0 ? (totalObtained / totalFull) * 100 : null;
            const gpa = pct !== null ? (pct >= 90 ? 4.0 : pct >= 80 ? 3.6 : pct >= 70 ? 3.2 : pct >= 60 ? 2.8 : pct >= 50 ? 2.4 : pct >= 40 ? 2.0 : 0) : '—';
            const overallGrade = pct !== null ? (pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C+' : pct >= 40 ? 'C' : 'F') : '—';
            return { s_id: s.id, totalObtained, totalFull, gpa, overallGrade };
        });

        // Compute rank based on totalObtained
        arr.sort((a, b) => b.totalObtained - a.totalObtained);
        let currentRank = 1, lastTotal = -1;
        const metricsMap = {};
        
        arr.forEach((item, index) => {
            if (item.totalObtained !== lastTotal) {
                currentRank = index + 1;
                lastTotal = item.totalObtained;
            }
            
            // Format suffix
            let posStr = '—';
            if (item.totalObtained > 0) {
                const j = currentRank % 10, k = currentRank % 100;
                if (j === 1 && k !== 11) posStr = currentRank + "st";
                else if (j === 2 && k !== 12) posStr = currentRank + "nd";
                else if (j === 3 && k !== 13) posStr = currentRank + "rd";
                else posStr = currentRank + "th";
            }
            
            metricsMap[item.s_id] = { ...item, position: posStr };
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

    const exportCSV = () => {
        const headers = ['Roll', 'Student Name', 'Section', ...routines.map(r => `${r.subject_name}`), 'Attendance', 'Total', 'GPA', 'Grade', 'Position'];
        const rows = students.map(s => {
            const cells = routines.map(r => {
                const cell = gridData[s.id]?.[r.id];
                if (!cell) return '';
                const isAbsentUser = r.has_practical ? (cell.theory_marks === '' && cell.practical_marks === '') : (cell.marks === '');
                if (isAbsentUser) return 'AB';
                
                let subTot = null;
                if (r.has_practical) {
                    const tm = parseFloat(cell?.theory_marks); const pm = parseFloat(cell?.practical_marks);
                    if (!isNaN(tm) || !isNaN(pm)) {
                        subTot = (isNaN(tm) ? 0 : tm) + (isNaN(pm) ? 0 : pm);
                    }
                } else {
                    const m = parseFloat(cell?.marks);
                    if (!isNaN(m)) { 
                        subTot = m;
                    }
                }
                return subTot !== null ? subTot : '';
            });
            const m = studentMetrics[s.id] || {};
            const attend = studentSummaries[s.id]?.attendance || '—';
            return [s.roll_number || '—', `${s.first_name} ${s.last_name}`, s.section || '—', ...cells, attend, m.totalObtained || 0, m.totalFull || 0, m.gpa || '—', m.overallGrade || '—', m.position || '—'];
        });
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        const className = classes.find(c => String(c.id) === String(selectedClass))?.name || 'Class';
        a.download = `marks_${examData?.name || 'export'}_${className}${selectedSection ? `_${selectedSection}` : ''}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    // Memoize column averages
    const columnAverages = useMemo(() => {
        return displayedRoutines.map(r => {
            const marks = students
                .map(s => {
                    const c = gridData[s.id]?.[r.id];
                    if (!c) return NaN;
                    const isAbsentUser = r.has_practical ? (c.theory_marks === '' && c.practical_marks === '') : (c.marks === '');
                    if (isAbsentUser) return NaN;
                    if (r.has_practical) {
                        let tot = 0; let any = false;
                        if (c.theory_marks !== '') { tot += parseFloat(c.theory_marks); any = true; }
                        if (c.practical_marks !== '') { tot += parseFloat(c.practical_marks); any = true; }
                        return any ? tot : NaN;
                    }
                    return c.marks !== '' ? parseFloat(c.marks) : NaN;
                })
                .filter(m => !isNaN(m));
            return marks.length > 0 ? (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(1) : '—';
        });
    }, [routines, gridData, students]);

    const topbarPortal = document.getElementById('topbar-portal');
    const actionsPortal = document.getElementById('topbar-actions-portal');

    return (
        <div className="-mt-6 -mx-6 -mb-6 h-[calc(100vh-64px)] flex flex-col bg-slate-950 overflow-hidden">
            {topbarPortal && createPortal(
                <div className="flex items-center gap-4 px-2 w-full">
                    {/* Minimal Title */}
                    <div className="flex flex-col border-r border-slate-700 pr-4 mr-1 hidden lg:flex shrink-0">
                        <span className="text-sm font-bold text-white leading-tight">Mark Ledger</span>
                        <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Admin Grid</span>
                    </div>

                    <div className="flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar">
                        <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className={selectCls + ' py-1.5 px-3 min-w-[130px] text-xs'}>
                            <option value="">-- Exam --</option>
                            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }} disabled={!selectedExam} className={selectCls + ' py-1.5 px-3 w-28 text-xs'}>
                            <option value="">-- Class --</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedClass} className={selectCls + ' py-1.5 px-3 w-24 text-xs'}>
                            <option value="">-- Sec --</option>
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
                    </div>
                </div>,
                topbarPortal
            )}

            {actionsPortal && createPortal(
                <div className="flex items-center gap-2">
                    {examData && selectedExam && (
                        <WorkingDaysInput 
                            val={examData.total_working_days}
                            examId={examData.id}
                            onRemoteUpdate={(newVal) => {
                                setExams(prev => prev.map(ex => ex.id === examData.id ? { ...ex, total_working_days: newVal } : ex));
                            }}
                        />
                    )}
                    {students.length > 0 && (
                        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all border border-slate-700 whitespace-nowrap">
                            <Download size={13} /> Export
                        </button>
                    )}
                    <button onClick={saveAll} disabled={saving || !dirty || students.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shadow-md whitespace-nowrap">
                        {saving ? <Loader2 size={13} className="animate-spin shrink-0" /> : <Save size={13} className="shrink-0" />}
                        {saving ? 'Saving' : dirty ? 'Save *' : 'Saved'}
                    </button>
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
                            } catch (err) { console.error("FS Error", err); }
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 rounded-lg border border-slate-700 transition-all shrink-0" title="Full Screen">
                        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>
                </div>,
                actionsPortal
            )}

            {/* Status bar */}
            <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0 flex justify-between items-center">
                {selectedClass && !loading && students.length > 0 ? (
                    <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="text-slate-400">{students.length} students · {routines.length} subjects</span>
                        {dirty && <span className="text-amber-400 flex items-center gap-1"><AlertCircle size={12} /> Unsaved changes</span>}
                        {!dirty && existingMarks.length > 0 && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> All saved</span>}
                    </div>
                ) : (
                    <span className="text-slate-500 text-xs font-semibold">Waiting for selection...</span>
                )}
                <button onClick={loadGrid} className="flex items-center gap-1 text-slate-500 hover:text-white transition-all text-xs font-semibold">
                    <RefreshCw size={12} /> Refresh
                </button>
            </div>

            {/* The Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={32} className="animate-spin text-violet-500" />
                </div>
            ) : !selectedExam || !selectedClass ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl py-32 text-center shadow-xl shadow-black/20">
                    <FileSpreadsheet size={48} className="mx-auto text-slate-800 mb-4" />
                    <p className="text-slate-400 font-bold text-lg tracking-tight">Select an exam and class</p>
                    <p className="text-slate-600 text-sm">to load the real-time mark sheet.</p>
                </div>
            ) : students.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl py-20 text-center">
                    <p className="text-slate-400">No students found for this class{selectedSection ? ` and section ${selectedSection}` : ''}.</p>
                </div>
            ) : routines.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl py-20 text-center">
                    <p className="text-slate-400">No exam routines configured for this class. Add routines first.</p>
                </div>
            ) : (
                /* Grid Container */
                <div className="bg-slate-900 border-none overflow-hidden flex flex-col flex-1 min-h-0">
                    <div className="overflow-x-auto" ref={gridRef}>
                        <table className="text-sm border-collapse min-w-full">
                            {/* Header */}
                            <thead>
                                <tr className="bg-slate-800/80 backdrop-blur-md">
                                    <th className="sticky left-0 z-20 bg-slate-800 border-b border-r border-slate-700 px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider w-16 whitespace-nowrap">Roll No</th>
                                    <th className="sticky left-16 z-20 bg-slate-800 border-b border-r border-slate-700 px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[200px]">Student Details</th>
                                    {displayedRoutines.map(r => (
                                        <th key={r.id} className="group relative border-b border-r border-slate-700 px-3 py-2 text-center min-w-[120px]">
                                            <div className="flex items-center justify-center gap-2">
                                                <p className="text-xs font-black text-white">{r.subject_name}</p>
                                                <button onClick={() => setConfigModal({ open: true, routine: r })} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white bg-slate-800 rounded transition-all">
                                                    <Settings size={12} />
                                                </button>
                                            </div>
                                            {r.has_practical ? (
                                                <div className="flex items-center justify-center gap-1.5 mt-1">
                                                    <span className="text-[9px] px-1 py-0.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20 uppercase font-black tracking-tighter">TH {r.theory_full_marks}</span>
                                                    <span className="text-[9px] px-1 py-0.5 bg-pink-500/10 text-pink-400 rounded border border-pink-500/20 uppercase font-black tracking-tighter">PR {r.practical_full_marks}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1.5 mt-1">
                                                    <span className="text-[9px] px-1 py-0.5 bg-slate-900 text-slate-500 rounded border border-slate-700 uppercase font-black tracking-tighter">FM {r.effective_full_marks}</span>
                                                    <span className="text-[9px] px-1 py-0.5 bg-slate-900 text-violet-400/60 rounded border border-violet-500/10 uppercase font-black tracking-tighter">PM {r.effective_pass_marks}</span>
                                                </div>
                                            )}
                                        </th>
                                    ))}
                                    <th className="border-b border-r border-slate-700 px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[90px]">Total Attd.</th>
                                    <th className="border-b border-r border-slate-700 px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[90px]">Total Mark</th>
                                    <th className="border-b border-r border-slate-700 px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[70px]">GPA<br/><span className="text-[8px] opacity-70">(e.g. 3.6)</span></th>
                                    <th className="border-b border-r border-slate-700 px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[70px]">Grade<br/><span className="text-[8px] opacity-70">(A)</span></th>
                                    <th className="border-b border-slate-700 px-3 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[70px]">Position</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student, sIdx) => (
                                    <LedgerRow
                                        key={student.id}
                                        student={student}
                                        sIdx={sIdx}
                                        routines={displayedRoutines}
                                        rowData={gridData[student.id]}
                                        metrics={studentMetrics[student.id]}
                                        summary={studentSummaries[student.id]}
                                        updateCell={updateCell}
                                        updateSummary={updateSummary}
                                        handleKeyDown={handleKeyDown}
                                    />
                                ))}
                            </tbody>
                            {/* Footer totals */}
                            <tfoot>
                                <tr className="bg-slate-800/50 border-t-2 border-violet-500/30">
                                    <td className="sticky left-0 bg-slate-800/80 border-r border-slate-700" />
                                    <td className="sticky left-8 bg-slate-800/80 border-r border-slate-700 px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Class Average</td>
                                    {columnAverages.map((avg, i) => (
                                        <td key={displayedRoutines[i].id} className="border-r border-slate-700 px-3 py-3 text-center text-xs font-black text-violet-400">{avg}</td>
                                    ))}
                                    <td className="border-r border-slate-700 bg-slate-800/30" />
                                    <td className="border-r border-slate-700 bg-slate-800/30" />
                                    <td className="border-r border-slate-700 bg-slate-800/30" />
                                    <td className="border-r border-slate-700 bg-slate-800/30" />
                                    <td className="bg-slate-800/30" />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/40 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-6">
                            <span className="flex items-center gap-1.5"><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white font-mono">TAB</kbd> Next Cell</span>
                            <span className="flex items-center gap-1.5"><kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white font-mono">ENTER</kbd> Next Student</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${dirty ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                            {dirty ? 'Unsaved changes pending' : 'All data synchronized'}
                        </div>
                    </div>
                </div>
            )}
            
            <RoutineConfigModal
                isOpen={configModal.open}
                routine={configModal.routine}
                onClose={() => setConfigModal({ open: false, routine: null })}
                onSaved={loadGrid}
            />
        </div>
    );
}
