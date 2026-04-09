import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, Check } from 'lucide-react';
import axios from '../api/axios';
import { motion } from 'framer-motion';

const selectCls = "w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none";

const Field = ({ label, required, children }) => (
    <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

const ElectiveSelector = ({ className, classId, selectedSubjects = [], onChange }) => {
    const [loading, setLoading] = useState(false);
    const [curriculum, setCurriculum] = useState([]);
    const [groupedElectives, setGroupedElectives] = useState({ groups: {}, nonGrouped: [] });

    useEffect(() => {
        if (!classId) {
            setCurriculum([]);
            setGroupedElectives({ groups: {}, nonGrouped: [] });
            return;
        }

        const fetchCurriculum = async () => {
            setLoading(true);
            try {
                const res = await axios.get('/class-subjects/');
                const myCurriculum = res.data.filter(cs => cs.class_obj === parseInt(classId));
                setCurriculum(myCurriculum);

                const groups = {};
                const nonGrouped = [];
                myCurriculum.forEach(cs => {
                    if (cs.is_elective) {
                        const rawGroup = (cs.elective_group || '').trim();
                        if (!rawGroup) {
                            nonGrouped.push(cs);
                        } else {
                            const g = rawGroup.toUpperCase(); // Normalize
                            if (!groups[g]) groups[g] = [];
                            groups[g].push(cs);
                        }
                    }
                });
                setGroupedElectives({ groups, nonGrouped });
            } catch (err) {
                console.error("Failed to load curriculum", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCurriculum();
    }, [classId]);

    if (!classId) return null;
    if (loading) return <div className="flex items-center gap-2 text-slate-500 text-xs py-4"><Loader2 size={14} className="animate-spin" /> Loading electives...</div>;

    const hasElectives = Object.keys(groupedElectives.groups).length > 0 || groupedElectives.nonGrouped.length > 0;
    if (!hasElectives) return (
        <div className="py-2">
            <p className="text-[11px] text-slate-500 italic">No elective subjects defined for this class.</p>
            {/* Show compulsory subjects anyway for context */}
            <div className="mt-2 flex flex-wrap gap-1.5">
                {curriculum.filter(cs => !cs.is_elective).map(cs => (
                    <span key={cs.id} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded-lg border border-slate-700">{cs.subject_name}</span>
                ))}
            </div>
        </div>
    );

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`space-y-4 ${className}`}>
            {/* Compulsory Subjects (Info Only) */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <BookOpen size={12} className="text-indigo-500" /> Compulsory Core Subjects
                </label>
                <div className="flex flex-wrap gap-2">
                    {curriculum.filter(cs => !cs.is_elective).map(cs => (
                        <div key={cs.id} className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/5 text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-500/10">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                            {cs.subject_name}
                        </div>
                    ))}
                    {curriculum.filter(cs => !cs.is_elective).length === 0 && <span className="text-slate-500 text-xs italic">No compulsory subjects.</span>}
                </div>
                <p className="text-[10px] text-slate-600 mt-3 italic font-medium">Standard curriculum subjects are automatically assigned.</p>
            </div>

            {/* Grouped Electives (Dropdowns) */}
            {Object.entries(groupedElectives.groups).map(([groupName, options]) => (
                <Field key={groupName} label={groupName} required>
                    <div className="relative">
                        <select 
                            className={selectCls}
                            value={selectedSubjects.find(id => options.some(o => o.subject === id)) || ''}
                            onChange={e => {
                                const val = parseInt(e.target.value);
                                const otherElectives = selectedSubjects.filter(id => !options.some(o => o.subject === id));
                                onChange(val ? [...otherElectives, val] : otherElectives);
                            }}
                        >
                            <option value="">Select subject for {groupName}</option>
                            {options.map(opt => (
                                <option key={opt.id} value={opt.subject}>{opt.subject_name}</option>
                            ))}
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                        </div>
                    </div>
                </Field>
            ))}

            {/* Non-Grouped Electives (Checkboxes) */}
            {groupedElectives.nonGrouped?.length > 0 && (
                <div className="pt-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Other Elective Options</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {groupedElectives.nonGrouped.map(cs => (
                            <label key={cs.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border group ${selectedSubjects.includes(cs.subject) ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg shadow-indigo-500/5' : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'}`}>
                                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${selectedSubjects.includes(cs.subject) ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-900 border-slate-700'}`}>
                                    {selectedSubjects.includes(cs.subject) && <Check size={12} className="text-white" />}
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="hidden"
                                    checked={selectedSubjects.includes(cs.subject)}
                                    onChange={e => {
                                        const val = cs.subject;
                                        onChange(e.target.checked 
                                            ? [...selectedSubjects, val] 
                                            : selectedSubjects.filter(id => id !== val)
                                        );
                                    }}
                                />
                                <span className={`text-sm font-bold transition-colors ${selectedSubjects.includes(cs.subject) ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>{cs.subject_name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default ElectiveSelector;
