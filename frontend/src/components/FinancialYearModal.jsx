import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Calendar } from 'lucide-react';
import axios from '../api/axios';
import { useToast } from './Toast';
import { motion, AnimatePresence } from 'framer-motion';

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all";

const Field = ({ label, required, children }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

const FinancialYearModal = ({ isOpen, onClose, onSaved, yearToEdit = null }) => {
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    
    const [form, setForm] = useState({
        name: '',
        start_date_bs: '',
        end_date_bs: '',
        is_active: true
    });

    useEffect(() => {
        if (isOpen) {
            if (yearToEdit) {
                setForm({
                    name: yearToEdit.name,
                    start_date_bs: yearToEdit.start_date_bs || '',
                    end_date_bs: yearToEdit.end_date_bs || '',
                    is_active: yearToEdit.is_active ?? true
                });
            } else {
                setForm({
                    name: '',
                    start_date_bs: '',
                    end_date_bs: '',
                    is_active: true
                });
            }
            setErrors({});
        }
    }, [isOpen, yearToEdit]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});

        try {
            if (yearToEdit) {
                await axios.put(`/financial-years/${yearToEdit.id}/`, form);
                toast('Year updated successfully');
            } else {
                await axios.post('/financial-years/', form);
                toast('New year created successfully');
            }
            onSaved();
            onClose();
        } catch (err) {
            console.error('Year Save error:', err.response?.data);
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                setErrors(data);
                const firstKey = Object.keys(data)[0];
                const msg = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
                toast(`${firstKey}: ${msg}`, 'error');
            } else {
                toast('Failed to save year. Please check the data.', 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <motion.div 
                        onClick={onClose} 
                        className="absolute inset-0" 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 12 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }} 
                        exit={{ scale: 0.95, opacity: 0, y: 12 }}
                        className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                    >
                        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                        
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 rounded-lg">
                                    <Calendar size={20} className="text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white">
                                        {yearToEdit ? 'Edit Cycle' : 'Add New Cycle'}
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                        Academic & Financial Sessions
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <Field label="Year Name (e.g. 2081)" required>
                                <input 
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="2081"
                                    className={inputCls}
                                />
                                {errors.name && <p className="text-red-400 text-[10px] mt-1 font-bold">{errors.name[0]}</p>}
                            </Field>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Start Date (BS)" required>
                                    <input 
                                        name="start_date_bs"
                                        value={form.start_date_bs}
                                        onChange={handleChange}
                                        required
                                        placeholder="YYYY-MM-DD"
                                        className={inputCls}
                                    />
                                    {errors.start_date_bs && <p className="text-red-400 text-[10px] mt-1 font-bold">{errors.start_date_bs[0]}</p>}
                                </Field>
                                <Field label="End Date (BS)" required>
                                    <input 
                                        name="end_date_bs"
                                        value={form.end_date_bs}
                                        onChange={handleChange}
                                        required
                                        placeholder="YYYY-MM-DD"
                                        className={inputCls}
                                    />
                                    {errors.end_date_bs && <p className="text-red-400 text-[10px] mt-1 font-bold">{errors.end_date_bs[0]}</p>}
                                </Field>
                            </div>

                            <div className="flex items-center gap-3 py-2">
                                <input 
                                    type="checkbox" 
                                    id="is_active"
                                    name="is_active"
                                    checked={form.is_active}
                                    onChange={handleChange}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-slate-300 cursor-pointer select-none">
                                    Set as Active Year
                                </label>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={onClose} 
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black py-3 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20"
                                >
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save Year</>}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default FinancialYearModal;
