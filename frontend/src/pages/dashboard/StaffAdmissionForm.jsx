import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, ChevronDown, ChevronUp, User, Globe, Briefcase, CreditCard, Info } from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';

const INITIAL = {
    // User fields
    username: '', email: '', password: '', first_name: '', last_name: '',
    // Profile fields
    employee_id: '', account_number: '', father_name: '', grandfather_name: '',
    phone: '', mobile: '', job_start_date: '', promoted_date: '',
    gender: 'Male', is_married: 'Married', children_count: 0,
    post: '', category: '', bank_acc: '', bank_branch: '',
    is_active_status: 'Active', ssf_fund: '', pan_no: '',
    qualification: '', training: '', temp_address: '', perm_address: '',
    emergency_address: '', language: '', remarks: '',
};

const Field = ({ label, required, children }) => (
    <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all";
const selectCls = inputCls + " appearance-none";

const Input = ({ ...props }) => <input className={inputCls} {...props} />;
const Select = ({ children, ...props }) => <select className={selectCls} {...props}>{children}</select>;
const Textarea = ({ ...props }) => <textarea className={inputCls + " resize-none"} rows={3} {...props} />;

const Section = ({ title, icon: Icon, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <button type="button" onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-2.5">
                    {Icon && <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400"><Icon size={16} /></div>}
                    <p className="font-bold text-white text-sm">{title}</p>
                </div>
                {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            {open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5">{children}</motion.div>}
        </div>
    );
};

const StaffAdmissionForm = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [form, setForm] = useState(INITIAL);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);

    React.useEffect(() => {
        axios.get('/staff-posts/').then(res => setPosts(res.data));
        axios.get('/staff-categories/').then(res => setCategories(res.data));
    }, []);

    const set = (field) => (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value || '' }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});
        try {
            // First step: We need an API that handles user + profile creation together
            // Or we do it in sequence. For now, let's assume backend supports nested creation or we use /teachers/ endpoint to handle it.
            // I'll update the backend TeacherViewSet to handle nested user creation if needed, 
            // but standard DRF might need customization.
            
            await axios.post('/teachers/', form);
            toast('Staff profile created successfully');
            navigate('/dashboard/staff');
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') setErrors(data);
            else toast('Failed to create staff profile', 'error');
        } finally { setSubmitting(false); }
    };

    const err = (field) => errors[field] ? (
        <p className="text-rose-400 text-[10px] font-bold mt-1 uppercase tracking-tight">{Array.isArray(errors[field]) ? errors[field][0] : errors[field]}</p>
    ) : null;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md py-4 border-b border-slate-800 -mx-4 px-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard/staff')}
                        className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-800 bg-slate-900 shadow-sm">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-white">Staff Enrollment</h1>
                        <p className="text-slate-400 text-xs mt-0.5 tracking-tight">Register new faculty or administrative staff member</p>
                    </div>
                </div>
                <button type="submit" form="staff-form" disabled={submitting}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl transition-all text-sm shadow-xl shadow-indigo-500/20 active:scale-95">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={15} /> Save Profile</>}
                </button>
            </div>

            <form id="staff-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* User Credentials */}
                <Section title="Account & Credentials" icon={User}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Field label="Username" required>
                            <Input required value={form.username} onChange={set('username')} placeholder="e.g. jdoe" />
                            {err('username')}
                        </Field>
                        <Field label="Email Address" required>
                            <Input type="email" required value={form.email} onChange={set('email')} placeholder="staff@school.com" />
                            {err('email')}
                        </Field>
                        <Field label="Password" required>
                            <Input type="password" required value={form.password} onChange={set('password')} placeholder="••••••••" />
                            {err('password')}
                        </Field>
                    </div>
                </Section>

                {/* Personal Detail */}
                <Section title="Personal Detail" icon={Info}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Field label="Employee ID" required>
                            <Input required value={form.employee_id} onChange={set('employee_id')} placeholder="EMP-001" />
                            {err('employee_id')}
                        </Field>
                        <Field label="First Name" required>
                            <Input required value={form.first_name} onChange={set('first_name')} placeholder="John" />
                            {err('first_name')}
                        </Field>
                        <Field label="Last Name" required>
                            <Input required value={form.last_name} onChange={set('last_name')} placeholder="Doe" />
                            {err('last_name')}
                        </Field>
                        <Field label="Account Number">
                            <Input value={form.account_number} onChange={set('account_number')} placeholder="A/C No." />
                        </Field>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                        <Field label="Father's Name">
                            <Input value={form.father_name} onChange={set('father_name')} placeholder="Father's Name" />
                        </Field>
                        <Field label="Grand Father's Name">
                            <Input value={form.grandfather_name} onChange={set('grandfather_name')} placeholder="Grandfather's Name" />
                        </Field>
                        <Field label="Phone">
                            <Input value={form.phone} onChange={set('phone')} placeholder="Landline" />
                        </Field>
                        <Field label="Mobile" required>
                            <Input required value={form.mobile} onChange={set('mobile')} placeholder="98XXXXXXXX" />
                            {err('mobile')}
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                        <Field label="Job Start Date">
                            <Input type="date" value={form.job_start_date} onChange={set('job_start_date')} />
                        </Field>
                        <Field label="Promoted Date">
                            <Input type="date" value={form.promoted_date} onChange={set('promoted_date')} />
                        </Field>
                        <Field label="Sex" required>
                            <Select value={form.gender} onChange={set('gender')}>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </Select>
                        </Field>
                        <Field label="Married">
                            <Select value={form.is_married} onChange={set('is_married')}>
                                <option value="Married">Married</option>
                                <option value="Unmarried">Unmarried</option>
                            </Select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                        <Field label="Children Count">
                            <Input type="number" value={form.children_count} onChange={set('children_count')} />
                        </Field>
                        <Field label="Post" required>
                            <Select value={form.post} onChange={set('post')}>
                                <option value="">Select Post</option>
                                {posts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </Select>
                            {err('post')}
                        </Field>
                        <Field label="Category" required>
                            <Select value={form.category} onChange={set('category')}>
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Select>
                            {err('category')}
                        </Field>
                        <Field label="Status">
                            <Select value={form.is_active_status} onChange={set('is_active_status')}>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </Select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <Field label="Bank Account No (A/C)">
                            <Input value={form.bank_acc} onChange={set('bank_acc')} placeholder="Bank account number" />
                        </Field>
                        <Field label="Bank Branch">
                            <Select value={form.bank_branch} onChange={set('bank_branch')}>
                                <option value="">Select Branch</option>
                                <option value="Head Office">Head Office</option>
                                <option value="Main Branch">Main Branch</option>
                                <option value="Chakupat">Chakupat</option>
                            </Select>
                        </Field>
                    </div>
                </Section>

                {/* Others Information */}
                <Section title="Others Information" icon={Globe}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="SSF Fund">
                            <Textarea value={form.ssf_fund} onChange={set('ssf_fund')} placeholder="SSF details" />
                        </Field>
                        <Field label="Pan No.">
                            <Textarea value={form.pan_no} onChange={set('pan_no')} placeholder="PAN Number" />
                        </Field>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <Field label="Qualification">
                            <Textarea value={form.qualification} onChange={set('qualification')} placeholder="Academic qualifications" />
                        </Field>
                        <Field label="Training">
                            <Textarea value={form.training} onChange={set('training')} placeholder="Professional training" />
                        </Field>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <Field label="Temporary Address">
                            <Textarea value={form.temp_address} onChange={set('temp_address')} placeholder="Temporary address" />
                        </Field>
                        <Field label="Permanent Address">
                            <Textarea value={form.perm_address} onChange={set('perm_address')} placeholder="Permanent address" />
                        </Field>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        <div className="md:col-span-1">
                            <Field label="Language">
                                <Input value={form.language} onChange={set('language')} placeholder="Linguistic skills" />
                            </Field>
                        </div>
                        <div className="md:col-span-2">
                            <Field label="Emergency Address/Contact">
                                <Input value={form.emergency_address} onChange={set('emergency_address')} placeholder="Who to contact in emergency" />
                            </Field>
                        </div>
                    </div>
                    <div className="mt-6">
                        <Field label="Remarks">
                            <Textarea value={form.remarks} onChange={set('remarks')} placeholder="Any additional notes" />
                        </Field>
                    </div>
                </Section>

            </form>
        </div>
    );
};

export default StaffAdmissionForm;
