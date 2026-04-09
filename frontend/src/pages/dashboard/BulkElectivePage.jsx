import React, { useState, useEffect } from 'react';
import { 
    Users, BookOpen, Save, Loader2, ChevronDown, 
    Search, Filter, CheckCircle2, AlertCircle, Info,
    CheckSquare, Square, X, Zap
} from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const BulkElectivePage = () => {
    const toast = useToast();
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [students, setStudents] = useState([]);
    const [curriculum, setCurriculum] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [missingGroups, setMissingGroups] = useState([]); // Subjects marked elective but no group

    // Local state for tracking changes before saving
    const [assignments, setAssignments] = useState({});
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Fetch classes on mount
    useEffect(() => {
        axios.get('/classes/')
            .then(res => setClasses(res.data || []))
            .catch(() => toast("Failed to load classes", "error"));
    }, []);

    // Fetch students and curriculum when class changes
    useEffect(() => {
        if (!selectedClass) {
            setStudents([]);
            setCurriculum([]);
            setSelectedIds(new Set());
            return;
        }

        setLoading(true);
        setSelectedIds(new Set());
        const classObj = classes.find(c => c.name === selectedClass);
        
        Promise.all([
            axios.get(`/students/?class_name=${selectedClass}${selectedSection ? `&section=${selectedSection}` : ''}`),
            axios.get(`/classes/${classObj.id}/`)
        ]).then(([sRes, cRes]) => {
            setStudents(sRes.data || []);
            // Identify elective groups from curriculum
            const subjects = cRes.data.subjects || [];
            const electiveGroups = {};
            const ungrouped = [];
            
            subjects.forEach(s => {
                if (s.is_elective) {
                    const rawGroup = (s.elective_group || '').trim();
                    if (!rawGroup) {
                        ungrouped.push(s.subject_name);
                    } else {
                        const groupName = rawGroup.toUpperCase(); // Normalize
                        if (!electiveGroups[groupName]) {
                            electiveGroups[groupName] = {
                                name: groupName,
                                subjects: []
                            };
                        }
                        // Avoid duplicates in subjects list
                        if (!electiveGroups[groupName].subjects.some(sub => sub.id === s.subject)) {
                            electiveGroups[groupName].subjects.push({
                                id: s.subject,
                                name: s.subject_name
                            });
                        }
                    }
                }
            });
            
            setMissingGroups(ungrouped);

            // Sort groups by name (OPT1, OPT2, etc.)
            const sortedGroups = Object.values(electiveGroups).sort((a, b) => a.name.localeCompare(b.name));
            setCurriculum(sortedGroups);

            // Initialize local assignments state from student data
            const initial = {};
            sRes.data.forEach(student => {
                initial[student.id] = student.elective_subjects || [];
            });
            setAssignments(initial);
        }).catch((err) => {
            console.error(err);
            toast("Failed to load class data", "error");
        }).finally(() => {
            setLoading(false);
        });
    }, [selectedClass, selectedSection, classes]);

    const handleAssignmentChange = (studentId, groupId, subjectId) => {
        setAssignments(prev => {
            const currentStudentSubjects = prev[studentId] || [];
            // Remove any subject that belongs to the same group
            const groupSubjectIds = curriculum.find(g => g.name === groupId).subjects.map(s => s.id);
            const filtered = currentStudentSubjects.filter(id => !groupSubjectIds.includes(id));
            
            // Add the new selected subject
            if (subjectId) {
                return { ...prev, [studentId]: [...filtered, parseInt(subjectId)] };
            }
            return { ...prev, [studentId]: filtered };
        });
    };

    const handleBulkAssign = (groupId, subjectId) => {
        if (selectedIds.size === 0) return;
        
        setAssignments(prev => {
            const next = { ...prev };
            const groupSubjectIds = curriculum.find(g => g.name === groupId).subjects.map(s => s.id);
            
            selectedIds.forEach(id => {
                const currentStudentSubjects = next[id] || [];
                const filtered = currentStudentSubjects.filter(sid => !groupSubjectIds.includes(sid));
                if (subjectId) {
                    next[id] = [...filtered, parseInt(subjectId)];
                } else {
                    next[id] = filtered;
                }
            });
            return next;
        });
        toast.info(`Updated Group "${groupId}" for ${selectedIds.size} selected students.`);
    };

    const toggleSelection = (studentId) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(studentId)) next.delete(studentId);
            else next.add(studentId);
            return next;
        });
    };

    const filteredStudents = students.filter(s => 
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.admission_number.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleAll = () => {
        if (selectedIds.size === filteredStudents.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredStudents.map(s => s.id)));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                assignments: Object.entries(assignments).map(([id, subs]) => ({
                    student_id: parseInt(id),
                    subject_ids: subs
                }))
            };
            
            await axios.post('/students/bulk-assign-electives/', payload);
            toast("All elective assignments saved successfully!", "success");
        } catch (err) {
            toast("Failed to save assignments", "error");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 space-y-6 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                            <BookOpen size={20} />
                        </div>
                        Bulk Elective Assignment
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Assign academic tracks and elective subjects to multiple students simultaneously.</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving || !selectedClass || students.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all text-sm group"
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} className="group-hover:scale-110 transition-transform" />}
                    {saving ? "Saving Changes..." : "Save All Assignments"}
                </button>
            </div>

            {/* Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Active Class</label>
                        <div className="relative">
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-4 pr-10 text-white text-sm outline-none focus:border-indigo-500 transition-all appearance-none"
                            >
                                <option value="">Select Class...</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Section (Optional)</label>
                        <div className="relative">
                            <select
                                value={selectedSection}
                                onChange={(e) => setSelectedSection(e.target.value)}
                                disabled={!selectedClass}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-4 pr-10 text-white text-sm outline-none focus:border-indigo-500 transition-all appearance-none disabled:opacity-50"
                            >
                                <option value="">All Sections</option>
                                {classes.find(c => c.name === selectedClass)?.sections?.map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Quick Search</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Filter students by name or admission ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-11 pr-4 text-white text-sm outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Floating Bar */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4"
                    >
                        <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-4 shadow-2xl shadow-indigo-500/30 flex items-center gap-6 overflow-x-auto no-scrollbar">
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white scale-110 shadow-lg shadow-indigo-500/30">
                                    <Zap size={20} fill="currentColor" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-sm whitespace-nowrap">{selectedIds.size} Selected</p>
                                    <div onClick={() => setSelectedIds(new Set())} className="text-slate-500 text-[10px] hover:text-red-400 cursor-pointer flex items-center gap-1 font-bold uppercase">
                                        <X size={10} /> Clear Selection
                                    </div>
                                </div>
                            </div>

                            <div className="h-10 w-px bg-slate-800 shrink-0" />

                            <div className="flex items-center gap-4 flex-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Assign to All:</p>
                                {curriculum.map(group => (
                                    <div key={group.name} className="relative shrink-0 w-44">
                                        <select
                                            onChange={(e) => handleBulkAssign(group.name, e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs outline-none focus:border-indigo-500 transition-all appearance-none"
                                        >
                                            <option value="">Set {group.name}...</option>
                                            {group.subjects.map(sub => (
                                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                                            ))}
                                            <option value="">- Clear -</option>
                                        </select>
                                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Area */}
            {!selectedClass ? (
                <div className="h-64 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center p-8 bg-slate-900/40">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 mb-4">
                        <Filter size={32} />
                    </div>
                    <h3 className="text-white font-bold text-lg">No Class Selected</h3>
                    <p className="text-slate-500 text-sm max-w-xs text-center mt-2">Choose a class from the filters above to begin bulk assignment of elective subjects.</p>
                </div>
            ) : loading ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse tracking-wide uppercase text-xs">Fetching enrollment data...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Warning for Floating Electives */}
                    {missingGroups.length > 0 && (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h4 className="text-amber-500 font-bold text-sm">Floating Electives Detected</h4>
                                <p className="text-slate-400 text-xs mt-1">
                                    The following subjects are marked as Electives but have no <strong>Group ID</strong> (e.g., OPT1). 
                                    They will not appear in the assignment table until you assign them a group in <a href={`/dashboard/subjects?class=${classes.find(c => c.name === selectedClass)?.id}`} className="text-indigo-400 font-bold hover:underline">Subject Management</a>:
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {missingGroups.map(name => (
                                        <span key={name} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700">{name}</span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {curriculum.length === 0 ? (
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-8 flex flex-col items-center text-center">
                            <Info className="text-amber-500 mb-4" size={40} />
                            <h3 className="text-white font-bold text-lg">No Elective Groups Defined</h3>
                            <p className="text-slate-400 text-sm mt-2 max-w-md">
                                There are no subjects marked as 'Elective' for {selectedClass}. 
                                Go to <strong>Subjects Management</strong> to configure elective groups for this class's curriculum.
                            </p>
                        </div>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative z-10"
                        >
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-800/50">
                                    <th className="px-6 py-4 text-left border-b border-slate-800 w-12">
                                        <div onClick={toggleAll} className="cursor-pointer text-slate-500 hover:text-indigo-400 transition-colors">
                                            {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 min-w-[120px]">Adm No</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 min-w-[200px]">Student Name</th>
                                    {curriculum.map(group => (
                                        <th key={group.name} className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest border-b border-slate-800 min-w-[200px]">
                                            <div className="flex items-center gap-2 text-indigo-400">
                                                <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                                                {group.name}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredStudents.map((student) => {
                                    const isSelected = selectedIds.has(student.id);
                                    return (
                                        <tr key={student.id} 
                                            className={`transition-colors group ${isSelected ? 'bg-indigo-500/5 hover:bg-indigo-500/10' : 'hover:bg-slate-800/30'}`}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div onClick={() => toggleSelection(student.id)} 
                                                    className={`cursor-pointer transition-colors ${isSelected ? 'text-indigo-500' : 'text-slate-700 hover:text-slate-500'}`}>
                                                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                                    {student.admission_number}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border transition-all ${
                                                        isSelected 
                                                            ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20' 
                                                            : 'bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-400 border-indigo-500/10'
                                                    }`}>
                                                        {student.first_name[0]}{student.last_name ? student.last_name[0] : ''}
                                                    </div>
                                                    <span className={`text-sm font-bold transition-colors ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                        {student.first_name} {student.last_name}
                                                    </span>
                                                </div>
                                            </td>
                                            {curriculum.map(group => {
                                                const selectedId = assignments[student.id]?.find(id => 
                                                    group.subjects.map(s => s.id).includes(id)
                                                ) || "";
                                                
                                                return (
                                                    <td key={group.name} className="px-6 py-4">
                                                        <div className="relative group/sel">
                                                            <select
                                                                value={selectedId}
                                                                onChange={(e) => handleAssignmentChange(student.id, group.name, e.target.value)}
                                                                className={`w-full bg-slate-800/50 border rounded-xl py-2 px-3 text-xs outline-none transition-all appearance-none cursor-pointer ${
                                                                    selectedId 
                                                                        ? 'border-indigo-500/50 text-indigo-300 bg-indigo-500/5' 
                                                                        : 'border-slate-700 text-slate-500 border-dashed hover:border-slate-500'
                                                                }`}
                                                            >
                                                                <option value="">Not Assigned</option>
                                                                {group.subjects.map(sub => (
                                                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                                                ))}
                                                            </select>
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 opacity-0 group-hover/sel:opacity-100 transition-opacity">
                                                                <ChevronDown size={12} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={curriculum.length + 3} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center">
                                                <AlertCircle size={32} className="text-slate-700 mb-3" />
                                                <p className="text-slate-500 text-sm font-medium">No students found matching your criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="px-6 py-4 bg-slate-800/20 border-t border-slate-800 flex items-center justify-between relative z-10">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                Total Students Loaded: {students.length}
                            </div>
                            <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest pl-5">
                                Students Selected: {selectedIds.size}
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-600 font-medium italic text-right max-w-[200px]">
                            Changes are staged locally for selected students. Click "Save All Assignments" for persistent update.
                        </div>
                    </div>
                        </motion.div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BulkElectivePage;
