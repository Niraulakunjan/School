import React, { useState } from 'react';
import { X, Loader2, Store, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../../api/axios';

const AddTenantModal = ({ isOpen, onClose, onRefresh }) => {
    const [formData, setFormData] = useState({ name: '', domain_url: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.post('/tenants/', formData);
            onRefresh();
            onClose();
            setFormData({ name: '', domain_url: '' });
        } catch (err) {
            setError(err.response?.data?.detail || 'Error creating school. Subdomain might be taken.');
        } finally { setLoading(false); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <motion.div onClick={onClose} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 12 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 12 }}
                        className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                    >
                        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <p className="text-lg font-black text-white">New School</p>
                                    <p className="text-slate-400 text-xs mt-0.5">Deploy a new isolated school instance</p>
                                </div>
                                <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                                    <X size={18} />
                                </button>
                            </div>

                            {error && (
                                <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" /> {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">School Name</label>
                                    <div className="relative">
                                        <Store size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input type="text" required value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Springfield Academy"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Subdomain</label>
                                    <div className="relative">
                                        <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input type="text" required value={formData.domain_url}
                                            onChange={e => setFormData({ ...formData, domain_url: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                            placeholder="springfield"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-28 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        />
                                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium select-none">.{import.meta.env.VITE_BASE_DOMAIN}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 mt-1.5 ml-1">Lowercase letters, numbers and hyphens only</p>
                                </div>

                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={onClose}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-all text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={loading}
                                        className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20"
                                    >
                                        {loading ? <Loader2 size={16} className="animate-spin" /> : <><Store size={15} /> Deploy School</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AddTenantModal;
