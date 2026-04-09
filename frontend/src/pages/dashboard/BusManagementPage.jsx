import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { 
    Bus, Plus, Search, Edit2, Trash2, 
    MapPin, IndianRupee, Loader2, CheckCircle2, XCircle
} from 'lucide-react';
import { useToast } from '../../components/Toast';

const selectCls = "bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-sm font-medium hover:border-slate-600";
const inputCls = "w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/50 transition-all placeholder:text-slate-600";

export default function BusManagementPage() {
    const toast = useToast();
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingRoute, setEditingRoute] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        is_active: true
    });

    const fetchRoutes = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/bus-routes/');
            setRoutes(response.data.results || response.data);
        } catch (error) {
            toast("Failed to load bus routes", "error");
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchRoutes();
    }, [fetchRoutes]);

    const handleOpenModal = (route = null) => {
        if (route) {
            setEditingRoute(route);
            setFormData({
                name: route.name,
                description: route.description,
                price: route.price,
                is_active: route.is_active
            });
        } else {
            setEditingRoute(null);
            setFormData({ name: '', description: '', price: '', is_active: true });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingRoute) {
                await api.patch(`/bus-routes/${editingRoute.id}/`, formData);
                toast("Route updated successfully", "success");
            } else {
                await api.post('/bus-routes/', formData);
                toast("New route added successfully", "success");
            }
            setShowModal(false);
            fetchRoutes();
        } catch (error) {
            const msg = error.response?.data?.detail || error.response?.data?.name?.[0] || "Failed to save route";
            toast(msg, "error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this route?")) return;
        try {
            await api.delete(`/bus-routes/${id}/`);
            toast("Route deleted successfully", "success");
            fetchRoutes();
        } catch (error) {
            const msg = error.response?.data?.detail || "Failed to delete route";
            toast(msg, "error");
        }
    };

    const filteredRoutes = routes.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tight">
                        <Bus className="text-violet-500 drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]" size={36} /> 
                        Bus Management
                    </h1>
                    <p className="text-slate-400 font-medium">Manage transport routes and monthly pricing</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-violet-500/20 active:scale-95"
                >
                    <Plus size={20} /> Add New Route
                </button>
            </div>

            {/* Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-500 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by route name or areas..." 
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/50 transition-all placeholder:text-slate-600"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-sm font-bold">
                    Total: {filteredRoutes.length} Routes
                </div>
            </div>

            {/* Main Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="text-violet-500 animate-spin" size={48} />
                    <p className="text-slate-500 font-bold animate-pulse">Loading transport network...</p>
                </div>
            ) : filteredRoutes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRoutes.map((route) => (
                        <div key={route.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 hover:border-slate-600 transition-all group relative overflow-hidden shadow-xl shadow-black/40 hover:shadow-violet-500/5">
                            <div className="absolute top-0 right-0 p-4">
                                {route.is_active ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                        <CheckCircle2 size={10} /> Active
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                                        <XCircle size={10} /> Inactive
                                    </span>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="p-3 bg-violet-600/10 rounded-2xl w-fit text-violet-400 ring-1 ring-violet-500/20">
                                    <Bus size={24} />
                                </div>
                                
                                <div>
                                    <h3 className="text-xl font-black text-white group-hover:text-violet-400 transition-colors">{route.name}</h3>
                                    <div className="flex items-start gap-2 mt-2 text-slate-400">
                                        <MapPin size={16} className="mt-1 shrink-0 text-slate-600" />
                                        <p className="text-sm font-medium line-clamp-2">{route.description || 'No stops described'}</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Fee</span>
                                        <span className="text-2xl font-black text-white flex items-center tracking-tighter">
                                            Rs. {parseFloat(route.price).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleOpenModal(route)}
                                            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(route.id)}
                                            className="p-2.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-[3rem] py-32 text-center">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Bus className="text-slate-600" size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-300">No Bus Routes Found</h3>
                    <p className="text-slate-500 mt-2 font-medium max-w-sm mx-auto">Get started by creating your first school bus route with its coverage and pricing.</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
                    <div className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-950 px-8 py-6 flex items-center justify-between border-b border-slate-800">
                            <div>
                                <h3 className="text-xl font-black text-white">{editingRoute ? 'Edit Route' : 'New Route Details'}</h3>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Bus Management System</p>
                            </div>
                            <div className="p-2 bg-violet-600/10 rounded-xl text-violet-400 ring-1 ring-violet-500/20">
                                <Bus size={20} />
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Route Identifier / Name</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="e.g., Route A - Main City"
                                    className={inputCls}
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Route Description (Stops)</label>
                                <textarea 
                                    placeholder="List the major stops or areas covered..."
                                    className={inputCls + " min-h-[100px] resize-none"}
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Monthly Price (Rs.)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            required
                                            placeholder="0.00"
                                            className={inputCls}
                                            value={formData.price}
                                            onChange={e => setFormData({...formData, price: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Route Status</label>
                                    <select 
                                        className={selectCls + " w-full h-[50px]"}
                                        value={formData.is_active}
                                        onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})}
                                    >
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-[2] px-6 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-violet-500/20 active:scale-95"
                                >
                                    {editingRoute ? 'Update Route' : 'Create Route'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
