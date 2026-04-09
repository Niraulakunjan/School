import React, { useState, useEffect } from 'react';
import { X, Loader2, UserPlus, Mail, Key, User, Pencil, Trash2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';

const Field = ({ label, icon: Icon, ...props }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
        <div className="relative">
            <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input {...props}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
        </div>
    </div>
);

// view states: 'list' | 'form' | 'delete'
const AddUserToTenantModal = ({ isOpen, onClose, tenant, onRefresh }) => {
    const toast = useToast();
    const [view, setView] = useState('list');
    const [admins, setAdmins] = useState([]);
    const [loadingAdmins, setLoadingAdmins] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });

    const headers = tenant ? { 'X-Tenant': tenant.domain_url } : {};

    const loadAdmins = () => {
        if (!tenant) return;
        setLoadingAdmins(true);
        axios.get(`/users/tenant-admin/?tenant=${tenant.domain_url}`)
            .then(res => setAdmins(Array.isArray(res.data) ? res.data : []))
            .catch(() => setAdmins([]))
            .finally(() => setLoadingAdmins(false));
    };

    useEffect(() => {
        if (!isOpen || !tenant) return;
        setView('list');
        setError('');
        setEditingAdmin(null);
        loadAdmins();
    }, [isOpen, tenant]);

    const openCreate = () => {
        setEditingAdmin(null);
        setFormData({ username: '', email: '', password: '' });
        setError('');
        setView('form');
    };

    const openEdit = (admin) => {
        setEditingAdmin(admin);
        setFormData({ username: admin.username, email: admin.email, password: '' });
        setError('');
        setView('form');
    };

    const openDelete = (admin) => {
        setDeleteTarget(admin);
        setView('delete');
    };

    const set = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const payload = { ...formData, role: 'ADMIN' };
            if (!payload.password) delete payload.password;
            if (editingAdmin) {
                await axios.patch(`/users/${editingAdmin.id}/`, payload, { headers });
                toast(`Admin updated successfully`);
            } else {
                await axios.post('/users/', payload, { headers });
                toast(`Admin created for ${tenant.name}`);
            }
            loadAdmins();
            if (onRefresh) onRefresh(tenant.domain_url);
            setView('list');
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                const msg = data.detail || Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
                setError(msg);
            } else {
                setError('Something went wrong. Please try again.');
            }
        } finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await axios.delete(`/users/${deleteTarget.id}/`, { headers });
            toast(`Admin @${deleteTarget.username} deleted`, 'error');
            loadAdmins();
            if (onRefresh) onRefresh(tenant.domain_url);
            setView('list');
        } catch {
            toast('Failed to delete admin', 'error');
        } finally { setDeleting(false); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <motion.div onClick={onClose} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 12 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 12 }}
                        className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                    >
                        <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 to-indigo-500" />
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    {view !== 'list' && (
                                        <button onClick={() => setView('list')} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                                            <ArrowLeft size={16} />
                                        </button>
                                    )}
                                    <div>
                                        <p className="text-lg font-black text-white">
                                            {view === 'list' ? 'School Admins' : view === 'form' ? (editingAdmin ? 'Edit Admin' : 'Create Admin') : 'Delete Admin'}
                                        </p>
                                        <p className="text-slate-400 text-xs mt-0.5">
                                            <span className="text-indigo-400 font-semibold">{tenant?.name}</span>
                                        </p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* LIST VIEW */}
                            {view === 'list' && (
                                <>
                                    {loadingAdmins ? (
                                        <div className="flex items-center justify-center py-10">
                                            <Loader2 size={22} className="animate-spin text-indigo-400" />
                                        </div>
                                    ) : admins.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                                                <User size={20} className="text-amber-400" />
                                            </div>
                                            <p className="text-white font-bold text-sm mb-1">No admins yet</p>
                                            <p className="text-slate-500 text-xs">Create the first admin for this school.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 mb-4">
                                            {admins.map(admin => (
                                                <div key={admin.id} className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                            {admin.username.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-white truncate">@{admin.username}</p>
                                                            <p className="text-xs text-slate-500 truncate">{admin.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                                        <button onClick={() => openEdit(admin)}
                                                            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-indigo-400 transition-colors" title="Edit">
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button onClick={() => openDelete(admin)}
                                                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button onClick={openCreate}
                                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition-all text-sm">
                                        <UserPlus size={15} /> Add Admin
                                    </button>
                                </>
                            )}

                            {/* FORM VIEW */}
                            {view === 'form' && (
                                <>
                                    {error && (
                                        <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" /> {error}
                                        </div>
                                    )}
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <Field label="Username" icon={User} type="text" required placeholder="principal_admin"
                                            value={formData.username} onChange={set('username')} />
                                        <Field label="Email Address" icon={Mail} type="email" required placeholder="admin@school.com"
                                            value={formData.email} onChange={set('email')} />
                                        <Field label={editingAdmin ? 'New Password (leave blank to keep)' : 'Password'}
                                            icon={Key} type="password" required={!editingAdmin} placeholder="••••••••"
                                            value={formData.password} onChange={set('password')} />
                                        <div className="flex gap-3 pt-1">
                                            <button type="button" onClick={() => setView('list')}
                                                className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-all text-sm">
                                                Cancel
                                            </button>
                                            <button type="submit" disabled={submitting}
                                                className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-all text-sm">
                                                {submitting ? <Loader2 size={16} className="animate-spin" />
                                                    : editingAdmin ? <><Pencil size={15} /> Update Admin</> : <><UserPlus size={15} /> Create Admin</>}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}

                            {/* DELETE CONFIRM VIEW */}
                            {view === 'delete' && deleteTarget && (
                                <div>
                                    <div className="flex items-center gap-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                        <AlertTriangle size={18} className="text-red-400 shrink-0" />
                                        <p className="text-sm text-slate-300">
                                            Delete admin <span className="text-white font-bold">@{deleteTarget.username}</span>? This cannot be undone.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setView('list')}
                                            className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-all text-sm">
                                            Cancel
                                        </button>
                                        <button onClick={handleDelete} disabled={deleting}
                                            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-all text-sm">
                                            {deleting ? <Loader2 size={15} className="animate-spin" /> : <><Trash2 size={15} /> Delete</>}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AddUserToTenantModal;
