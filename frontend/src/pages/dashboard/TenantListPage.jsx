import React, { useEffect, useState, useCallback } from 'react';
import axios from '../../api/axios';
import {
    Plus, Search, UserPlus, MoreVertical,
    Globe, LayoutGrid, List, ExternalLink, ShieldCheck,
    Database, Store, Trash2, Loader2, AlertTriangle, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AddTenantModal from './AddTenantModal';
import AddUserToTenantModal from './AddUserToTenantModal';

const StatusBadge = ({ isActive }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
        isActive !== false
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border-red-500/20'
    }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        {isActive !== false ? 'Active' : 'Offline'}
    </span>
);

const DeleteModal = ({ tenant, onConfirm, onCancel, loading }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl"
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle size={18} className="text-red-400" />
                </div>
                <div>
                    <p className="font-black text-white text-base">Delete School</p>
                    <p className="text-slate-400 text-xs mt-0.5">This action cannot be undone</p>
                </div>
            </div>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                Are you sure you want to delete <span className="text-white font-bold">{tenant?.name}</span>?
                This will permanently remove the school and all its data.
            </p>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-all text-sm">Cancel</button>
                <button onClick={onConfirm} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-all text-sm">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <><Trash2 size={15} /> Delete</>}
                </button>
            </div>
        </motion.div>
    </div>
);

const ActionMenu = ({ tenant, onAddUser, onDelete }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button onClick={e => { e.stopPropagation(); setOpen(!open); }} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors">
                <MoreVertical size={16} />
            </button>
            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 4 }}
                            className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 py-1 overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => { window.open(`http://${tenant.domain_url}.localhost:5173`, '_blank'); setOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                                <Globe size={14} className="text-blue-400" /> Visit Instance
                            </button>
                            <button onClick={() => { onAddUser(tenant); setOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                                <UserPlus size={14} className="text-violet-400" /> Manage Admins
                            </button>
                            <div className="h-px bg-slate-700 my-1" />
                            <button onClick={() => { onDelete(tenant); setOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors">
                                <Trash2 size={14} /> Delete School
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

// Admin pills shown on card
const AdminSection = ({ admins, loading }) => {
    if (loading) return (
        <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5">
            <Loader2 size={12} className="animate-spin text-slate-500" />
            <span className="text-[11px] text-slate-500">Loading admins...</span>
        </div>
    );
    if (!admins || admins.length === 0) return (
        <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="text-[11px] font-semibold text-amber-400">No admin assigned</span>
        </div>
    );
    return (
        <div className="bg-slate-800 rounded-xl px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 mb-1">
                <User size={11} className="text-violet-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Admins</span>
            </div>
            {admins.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-[9px] shrink-0">
                        {a.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-300 truncate">@{a.username}</p>
                        <p className="text-[10px] text-slate-500 truncate">{a.email}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const TenantCard = ({ tenant, admins, adminsLoading, onAddUser, onDelete }) => (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-200 group"
    >
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                    {tenant.name.charAt(0)}
                </div>
                <div className="min-w-0">
                    <p className="font-black text-white text-sm truncate">{tenant.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{tenant.domain_url}.localhost</p>
                </div>
            </div>
            <ActionMenu tenant={tenant} onAddUser={onAddUser} onDelete={onDelete} />
        </div>

        <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2 text-slate-400">
                    <Database size={13} className="text-indigo-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Instance</span>
                </div>
                <code className="text-[11px] font-bold text-slate-300 font-mono">{tenant.db_name}</code>
            </div>
            <div className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2 text-slate-400">
                    <ShieldCheck size={13} className="text-violet-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Status</span>
                </div>
                <StatusBadge isActive={tenant.is_active} />
            </div>
            <AdminSection admins={admins} loading={adminsLoading} />
        </div>

        <div className="flex gap-2">
            <button onClick={() => window.open(`http://${tenant.domain_url}.localhost:5173`, '_blank')}
                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all">
                Visit <ExternalLink size={12} />
            </button>
            <button onClick={() => onAddUser(tenant)}
                className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all" title="Manage Admins">
                <UserPlus size={15} />
            </button>
            <button onClick={() => onDelete(tenant)}
                className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 text-slate-400 hover:text-red-400 rounded-xl transition-all" title="Delete School">
                <Trash2 size={15} />
            </button>
        </div>
    </motion.div>
);

const TenantListPage = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminsMap, setAdminsMap] = useState({});       // { domain_url: [admin, ...] }
    const [adminsLoading, setAdminsLoading] = useState({}); // { domain_url: bool }
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [search, setSearch] = useState('');

    const fetchAdmins = useCallback((domain_url) => {
        setAdminsLoading(prev => ({ ...prev, [domain_url]: true }));
        axios.get(`/users/tenant-admin/?tenant=${domain_url}`)
            .then(res => setAdminsMap(prev => ({ ...prev, [domain_url]: Array.isArray(res.data) ? res.data : [] })))
            .catch(() => setAdminsMap(prev => ({ ...prev, [domain_url]: [] })))
            .finally(() => setAdminsLoading(prev => ({ ...prev, [domain_url]: false })));
    }, []);

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/tenants/');
            setTenants(res.data);
            res.data.forEach(t => fetchAdmins(t.domain_url));
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchTenants(); }, []);

    const handleAddUser = (tenant) => { setSelectedTenant(tenant); setIsUserModalOpen(true); };
    const handleDeleteClick = (tenant) => setDeleteTarget(tenant);

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        try {
            await axios.delete(`/tenants/${deleteTarget.id}/`);
            setDeleteTarget(null);
            fetchTenants();
        } catch { alert('Failed to delete school. Please try again.'); }
        finally { setDeleting(false); }
    };

    const filtered = tenants.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.domain_url.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black text-white">School <span className="text-gradient">Management</span></h1>
                    <p className="text-slate-400 text-sm mt-0.5">Deploy and monitor isolated educational ecosystems.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><LayoutGrid size={15} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}><List size={15} /></button>
                    </div>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20">
                        <Plus size={16} /> New School
                    </button>
                </div>
            </div>

            <div className="relative w-full max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or domain..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
            </div>

            <AnimatePresence mode="wait">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[1,2,3,4].map(i => <div key={i} className="h-72 bg-slate-800/50 rounded-2xl animate-pulse" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 bg-slate-900 border border-dashed border-slate-700 rounded-2xl">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                            <Store size={24} className="text-indigo-400" />
                        </div>
                        <p className="text-white font-black text-lg mb-1">No Schools Found</p>
                        <p className="text-slate-500 text-sm mb-6">Deploy your first school instance to get started.</p>
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all">
                            <Plus size={15} /> New School
                        </button>
                    </motion.div>
                ) : viewMode === 'grid' ? (
                    <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map(t => (
                            <TenantCard key={t.id} tenant={t}
                                admins={adminsMap[t.domain_url]}
                                adminsLoading={adminsLoading[t.domain_url]}
                                onAddUser={handleAddUser} onDelete={handleDeleteClick}
                            />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    {['School', 'Domain', 'Admins', 'Status', ''].map(h => (
                                        <th key={h} className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((t, i) => (
                                    <tr key={t.id} className={`hover:bg-slate-800/50 transition-colors ${i < filtered.length - 1 ? 'border-b border-slate-800' : ''}`}>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shrink-0">{t.name.charAt(0)}</div>
                                                <div>
                                                    <p className="font-bold text-sm text-white">{t.name}</p>
                                                    <p className="text-xs text-slate-500">DB: {t.db_name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2 cursor-pointer group/url" onClick={() => window.open(`http://${t.domain_url}.localhost:5173`, '_blank')}>
                                                <code className="text-xs bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-indigo-400 font-mono">{t.domain_url}.localhost</code>
                                                <ExternalLink size={11} className="text-slate-600 group-hover/url:text-slate-400 transition-colors" />
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {adminsLoading[t.domain_url] ? (
                                                <Loader2 size={13} className="animate-spin text-slate-500" />
                                            ) : adminsMap[t.domain_url]?.length > 0 ? (
                                                <div className="flex flex-col gap-0.5">
                                                    {adminsMap[t.domain_url].map(a => (
                                                        <span key={a.id} className="text-xs text-slate-300 font-semibold">@{a.username}</span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-amber-400 font-semibold">No admin</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5"><StatusBadge isActive={t.is_active} /></td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => handleAddUser(t)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-violet-400 transition-colors" title="Manage Admins"><UserPlus size={14} /></button>
                                                <button onClick={() => handleDeleteClick(t)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors" title="Delete"><Trash2 size={14} /></button>
                                                <ActionMenu tenant={t} onAddUser={handleAddUser} onDelete={handleDeleteClick} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                )}
            </AnimatePresence>

            <AddTenantModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onRefresh={fetchTenants} />
            <AddUserToTenantModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                tenant={selectedTenant}
                onRefresh={(domain) => fetchAdmins(domain)}
            />
            <AnimatePresence>
                {deleteTarget && (
                    <DeleteModal tenant={deleteTarget} loading={deleting} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default TenantListPage;
