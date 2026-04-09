import React, { useState, useEffect } from 'react';
import { 
  Building2, Globe, Phone, Mail, MapPin, 
  Calendar, CreditCard, Save, Loader2, Upload,
  Briefcase, GraduationCap, Zap, Plus
} from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import { motion } from 'framer-motion';
import FinancialYearModal from '../../components/FinancialYearModal';

const SchoolSettingsPage = () => {
    const [settings, setSettings] = useState({
        school_name: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        academic_year: '',
        fiscal_year: '',
        result_date: '',
        logo: null
    });
    const [years, setYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    const [isYearModalOpen, setYearModalOpen] = useState(false);
    const toast = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [sRes, yRes] = await Promise.all([
                axios.get('/school-settings/'),
                axios.get('/financial-years/')
            ]);
            
            const sData = Array.isArray(sRes.data) ? sRes.data[0] : sRes.data;
            if (sData) {
                setSettings(sData);
                if (sData.logo) setLogoPreview(sData.logo);
            }
            setYears(yRes.data);
        } catch (err) {
            toast('Failed to load settings data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSettings({ ...settings, logo: file });
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            const formData = new FormData();
            // Define actual model fields to prevent sending read-only displays (which can cause 400s)
            const modelFields = [
                'school_name', 'address', 'phone', 'email', 'website', 
                'academic_year', 'fiscal_year', 'result_date'
            ];

            modelFields.forEach(key => {
                let val = settings[key];
                // Skip null, undefined, or empty strings for ForeignKey fields
                if (val === null || val === undefined || val === 'null') return;
                if ((key === 'academic_year' || key === 'fiscal_year') && val === '') return;
                
                // Auto-normalize website URL if protocol is missing
                if (key === 'website' && val && !/^https?:\/\//i.test(val)) {
                    val = `https://${val}`;
                }

                formData.append(key, val);
            });

            if (settings.logo instanceof File) {
                formData.append('logo', settings.logo);
            }

            await axios.post('/school-settings/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast('School settings updated successfully');
        } catch (err) {
            console.error('Save Error:', err.response?.data);
            const errorData = err.response?.data;
            let errorMsg = 'Failed to update settings';
            
            if (errorData) {
                if (typeof errorData === 'string') {
                    errorMsg = errorData;
                } else if (typeof errorData === 'object') {
                    // Extract first error message from the response object
                    const firstKey = Object.keys(errorData)[0];
                    const firstErr = errorData[firstKey];
                    errorMsg = `${firstKey}: ${Array.isArray(firstErr) ? firstErr[0] : firstErr}`;
                }
            }
            
            toast(errorMsg, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={30} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <header className="space-y-2">
                <h1 className="text-3xl font-black text-white tracking-tight">Institutional <span className="text-indigo-500">Profile</span></h1>
                <p className="text-slate-500 text-sm font-medium">Manage your school branding and official system cycles.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Branding Section */}
                <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    
                    <div className="p-8 space-y-8">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-800/50">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Building2 size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">School Identity</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Logo and Branding Details</p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-10">
                            {/* Logo Upload */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group">
                                    <div className="w-40 h-40 rounded-3xl bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-500/50">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-4" />
                                        ) : (
                                            <Building2 size={40} className="text-slate-600" />
                                        )}
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <label className="cursor-pointer p-4">
                                                <Upload size={24} className="text-white" />
                                                <input type="file" id="logo-input" className="hidden" onChange={handleLogoChange} accept="image/*" />
                                            </label>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => document.getElementById('logo-input').click()}
                                        className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-xl border border-slate-700 transition-all"
                                    >
                                        Update Logo
                                    </button>
                                </div>
                            </div>

                            {/* Detail Inputs */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Official Name</label>
                                    <input 
                                        type="text" 
                                        value={settings.school_name || ''} 
                                        onChange={(e) => setSettings({...settings, school_name: e.target.value})}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3 px-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                        placeholder="e.g. Sajilo Academy"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Primary Phone</label>
                                    <div className="relative">
                                        <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input 
                                            type="text" 
                                            value={settings.phone || ''} 
                                            onChange={(e) => setSettings({...settings, phone: e.target.value})}
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                            placeholder="+977-XXXXXXXX"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Contact Email</label>
                                    <div className="relative">
                                        <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input 
                                            type="email" 
                                            value={settings.email || ''} 
                                            onChange={(e) => setSettings({...settings, email: e.target.value})}
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                            placeholder="admin@sajilo.com"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Physical Address</label>
                                    <div className="relative">
                                        <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input 
                                            type="text" 
                                            value={settings.address || ''} 
                                            onChange={(e) => setSettings({...settings, address: e.target.value})}
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                            placeholder="Kathmandu, Nepal"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Official Website</label>
                                    <div className="relative">
                                        <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input 
                                            type="text" 
                                            value={settings.website || ''} 
                                            onChange={(e) => setSettings({...settings, website: e.target.value})}
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                            placeholder="https://www.school.edu.np"
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-600 font-medium pl-1 italic">Note: Ensure the URL includes https:// (e.g., https://example.com)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* System Cycles Section */}
                <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                    
                    <div className="p-8 space-y-8">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-800/50">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">System Cycles</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Academic and financial year management</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3 p-6 bg-slate-950/30 border border-slate-800/50 rounded-2xl relative group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <GraduationCap size={16} className="text-emerald-500" />
                                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">Academic Year</h4>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setYearModalOpen(true)}
                                        className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-all flex items-center gap-1.5"
                                        title="Add New Academic Year"
                                    >
                                        <Plus size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Add</span>
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium mb-4">Sets the global academic context for student enrollments and reports.</p>
                                <select 
                                    value={settings.academic_year || ''} 
                                    onChange={(e) => setSettings({...settings, academic_year: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer hover:border-slate-700"
                                >
                                    <option value="">Select Academic Year</option>
                                    {years.map(y => (
                                        <option key={y.id} value={y.id}>{y.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3 p-6 bg-slate-950/30 border border-slate-800/50 rounded-2xl relative group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Briefcase size={16} className="text-blue-500" />
                                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">Financial Year</h4>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setYearModalOpen(true)}
                                        className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all flex items-center gap-1.5"
                                        title="Add New Financial Year"
                                    >
                                        <Plus size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Add</span>
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium mb-4">Controls the fiscal cycle for staff payroll and institutional budgeting.</p>
                                <select 
                                    value={settings.fiscal_year || ''} 
                                    onChange={(e) => setSettings({...settings, fiscal_year: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer hover:border-slate-700"
                                >
                                    <option value="">Select Financial Year</option>
                                    {years.map(y => (
                                        <option key={y.id} value={y.id}>{y.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Default Result Date</label>
                                    <input 
                                        type="text" 
                                        value={settings.result_date || ''} 
                                        onChange={(e) => setSettings({...settings, result_date: e.target.value})}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3 px-4 text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none"
                                        placeholder="e.g. 2081-01-15"
                                    />
                                </div>
                                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                                    <p className="text-[10px] text-indigo-400 font-bold leading-relaxed">
                                        Note: Changing these values will update the default selection for new reports and payroll generators across the entire system.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] px-10 py-4 rounded-2xl text-xs transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save Changes</>}
                    </button>
                </div>
            </form>

            <FinancialYearModal 
                isOpen={isYearModalOpen}
                onClose={() => setYearModalOpen(false)}
                onSaved={fetchData}
            />
        </div>
    );
};

export default SchoolSettingsPage;
