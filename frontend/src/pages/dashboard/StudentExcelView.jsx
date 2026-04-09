import React, { useState, useRef, useEffect } from 'react';
import { 
    Download, Printer, Filter, ChevronDown, 
    MoreHorizontal, User, Phone, MapPin, 
    Calendar, Hash, CheckSquare, Square, 
    Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';

const StudentExcelView = ({ students, loading, onUpdate }) => {
    const [editingCell, setEditingCell] = useState(null); // { id, field }
    const [editValue, setEditValue] = useState('');
    const [savingStatus, setSavingStatus] = useState({}); // { 'id-field': 'saving' | 'success' | 'error' }
    const inputRef = useRef(null);

    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingCell]);

    const handleEditStart = (student, field) => {
        setEditingCell({ id: student.id, field });
        setEditValue(student[field] || '');
    };

    const handleSave = async () => {
        if (!editingCell) return;
        const { id, field } = editingCell;
        const originalValue = students.find(s => s.id === id)?.[field] || '';
        
        if (editValue === originalValue) {
            setEditingCell(null);
            return;
        }

        const key = `${id}-${field}`;
        setSavingStatus(prev => ({ ...prev, [key]: 'saving' }));
        setEditingCell(null);

        try {
            await onUpdate(id, { [field]: editValue });
            setSavingStatus(prev => ({ ...prev, [key]: 'success' }));
            setTimeout(() => {
                setSavingStatus(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
            }, 2000);
        } catch (err) {
            setSavingStatus(prev => ({ ...prev, [key]: 'error' }));
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') setEditingCell(null);
    };

    if (loading) return null;

    const renderCell = (student, field, className = "") => {
        const isEditing = editingCell?.id === student.id && editingCell?.field === field;
        const status = savingStatus[`${student.id}-${field}`];
        
        return (
            <td 
                className={`border border-slate-200 px-3 py-1.5 text-xs relative group/cell cursor-pointer transition-all ${isEditing ? 'bg-indigo-50 ring-2 ring-indigo-500 ring-inset z-30' : 'hover:bg-slate-50'} ${className}`}
                onClick={() => !isEditing && handleEditStart(student, field)}
            >
                {isEditing ? (
                    <input
                        ref={inputRef}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent outline-none font-bold text-slate-900 border-none p-0"
                    />
                ) : (
                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                        <span className={`truncate ${!student[field] ? 'text-slate-300 italic' : 'text-slate-700 font-medium'}`}>
                            {student[field] || 'empty'}
                        </span>
                        {status === 'saving' && <Loader2 size={10} className="animate-spin text-indigo-500 shrink-0" />}
                        {status === 'success' && <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />}
                        {status === 'error' && <AlertCircle size={10} className="text-rose-500 shrink-0" />}
                    </div>
                )}
            </td>
        );
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xl">
            {/* Toolbar */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                        Spreadsheet Mode
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
                        Click any cell to edit • Auto-syncing enabled
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Matrix */}
            <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
                <table className="w-full text-left border-collapse table-fixed min-w-[1400px]">
                    <thead className="sticky top-0 z-40">
                        <tr className="bg-slate-100/90 backdrop-blur-xl">
                            <th className="w-12 border border-slate-200 px-2 py-3 text-center text-[10px] font-black text-slate-400 bg-slate-100/50">#</th>
                            <th className="w-14 border border-slate-200 px-2 py-3 text-center bg-slate-100/50"><Square size={14} className="text-slate-300 mx-auto" /></th>
                            <th className="w-24 border border-slate-200 px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Roll</th>
                            <th className="w-40 border border-slate-200 px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Admission ID</th>
                            <th className="w-56 border border-slate-200 px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">First Name</th>
                            <th className="w-56 border border-slate-200 px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Name</th>
                            <th className="w-32 border border-slate-200 px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Section</th>
                            <th className="w-56 border border-slate-200 px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Guardian Name</th>
                            <th className="w-44 border border-slate-200 px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Phone Number</th>
                            <th className="w-44 border border-slate-200 px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">DOB (BS)</th>
                            <th className="w-72 border border-slate-200 px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Local Address</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {students.map((s, idx) => (
                            <tr key={s.id} className="hover:bg-indigo-50/20 transition-colors">
                                <td className="border border-slate-200 px-2 py-1.5 text-center text-[9px] font-black text-slate-400 bg-slate-50/50">{idx + 1}</td>
                                <td className="border border-slate-200 px-2 py-1.5 text-center"><Square size={14} className="text-slate-200 mx-auto hover:text-indigo-400 cursor-pointer" /></td>
                                
                                {renderCell(s, 'roll_number', 'font-mono')}
                                {renderCell(s, 'admission_number', 'font-black text-indigo-600')}
                                {renderCell(s, 'first_name', 'font-bold uppercase')}
                                {renderCell(s, 'last_name', 'font-bold uppercase')}
                                {renderCell(s, 'section', 'text-center font-black')}
                                {renderCell(s, 'guardian_name')}
                                {renderCell(s, 'guardian_phone', 'font-mono text-slate-400')}
                                {renderCell(s, 'date_of_birth_bs', 'text-slate-400')}
                                {renderCell(s, 'address', 'italic text-slate-500')}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="bg-slate-100 border-t border-slate-200 px-6 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dataset: {students.length} Records</span>
                    <div className="h-3 w-px bg-slate-200" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Multi-Tenant Bridge: <span className="text-emerald-500 uppercase italic">Online</span></span>
                </div>
            </div>
        </div>
    );
};

export default StudentExcelView;
