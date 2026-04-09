import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, ChevronDown, ChevronUp, Upload, X, FileText, Image, BookOpen, Truck as Bus } from 'lucide-react';
import axios from '../../api/axios';
import { useToast } from '../../components/Toast';
import NepaliDatePicker from '../../components/NepaliDatePicker';
import ElectiveSelector from '../../components/ElectiveSelector';

const DOC_TYPES = [
    { value: 'citizenship', label: 'Citizenship' },
    { value: 'birth_cert',  label: 'Janma Dartha (Birth Certificate)' },
    { value: 'passport',    label: 'Passport' },
    { value: 'character',   label: 'Character Certificate' },
    { value: 'migration',   label: 'Migration Certificate' },
    { value: 'marksheet',   label: 'Marksheet' },
    { value: 'other',       label: 'Other' },
];

const INITIAL = {
    admission_number: '', registration_number: '', roll_number: '',
    first_name: '', last_name: '', gender: '', date_of_birth: '', blood_group: '',
    admission_date: new Date().toISOString().split('T')[0],
    class_name: '', section: '', mobile_number: '', email: '',
    height: '', weight: '', alns_emis_number: '', national_id: '', local_id: '',
    file_number: '', regs_number: '',
    guardian_is: 'father', guardian_name: '', guardian_phone: '',
    guardian_relation: '', guardian_email: '', guardian_occupation: '', guardian_address: '',
    father_name: '', father_phone: '', father_occupation: '',
    mother_name: '', mother_phone: '', mother_occupation: '',
    current_address: '', permanent_address: '',
    previous_school: '', note: '',
    elective_subjects: [],
    bus_route: '',
};

const Field = ({ label, required, children }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all";
const selectCls = inputCls + " appearance-none";

const Input = ({ ...props }) => <input className={inputCls} {...props} />;
const Select = ({ children, ...props }) => <select className={selectCls} {...props}>{children}</select>;
const Textarea = ({ ...props }) => <textarea className={inputCls + " resize-none"} rows={3} {...props} />;

const Section = ({ title, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <button type="button" onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                <p className="font-bold text-white text-sm">{title}</p>
                {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            {open && <div className="p-5">{children}</div>}
        </div>
    );
};

const StudentAdmissionForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [form, setForm] = useState(INITIAL);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(!!id);
    const [errors, setErrors] = useState({});
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [classes, setClasses] = useState([]);
    const [busRoutes, setBusRoutes] = useState([]);
    const photoRef = useRef();

    const addDocument = () => setDocuments(prev => [...prev, { doc_type: 'birth_cert', title: '', file: null }]);
    const removeDocument = (i) => setDocuments(prev => prev.filter((_, idx) => idx !== i));
    const setDoc = (i, field, value) => setDocuments(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));

    const handlePhoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    // Fetch data on mount
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const [clsRes, busRes] = await Promise.all([
                    axios.get('/classes/'),
                    axios.get('/bus-routes/')
                ]);
                setClasses(clsRes.data);
                setBusRoutes(busRes.data);

                if (id) {
                    const res = await axios.get(`/students/${id}/`);
                    setForm(res.data);
                    if (res.data.photo) setPhotoPreview(res.data.photo);
                    if (res.data.documents) setDocuments(res.data.documents);
                } else {
                    const res = await axios.get('/students/generate-ids/');
                    setForm(prev => ({
                        ...prev,
                        admission_number: res.data.admission_number,
                        registration_number: res.data.registration_number,
                    }));
                }
            } catch (err) {
                console.error("Error fetching form data", err);
                if (id) toast('Failed to load student data', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchInitial();
    }, [id]);

    const set = (field) => (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});

        // Frontend Validation
        const newErrors = {};
        if (form.bus_route === 'placeholder' || (form.bus_route && !busRoutes.some(r => String(r.id) === String(form.bus_route)))) {
            newErrors.bus_route = 'Please select a bus route if bus facility is enabled.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setSubmitting(false);
            toast('Please fix the errors in the form', 'error');
            return;
        }

        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                // Rules for PATCH/POST:
                // 1. Don't send empty strings for fields that should be null (Dates, FKs)
                // 2. Don't send URL strings for file fields (Photo)
                // 3. Keep standard strings for CharFields
                
                if (k === 'photo') {
                    if (photo instanceof File) fd.append('photo', photo);
                    return;
                }
                
                if (['id', 'user', 'documents', 'enrolled_at', 'admission_date_bs', 'date_of_birth_bs'].includes(k)) return;
                
                if (v === '' || v === null || v === undefined) {
                    // Send empty string for bus_route to explicitly clear it if turned off
                    if (k === 'bus_route' && v === '') fd.append(k, '');
                    // Otherwise skip to avoid 400
                    return; 
                }

                if (Array.isArray(v)) {
                    v.forEach(item => fd.append(k, item));
                    return;
                }

                fd.append(k, v);
            });
            
            // Explicitly re-add the new BS fields if present in the form state
            if (form.date_of_birth_bs) fd.append('date_of_birth_bs', form.date_of_birth_bs);
            if (form.admission_date_bs) fd.append('admission_date_bs', form.admission_date_bs);

            documents.forEach((doc, i) => {
                // documents is a separate local state, if doc.file is an actual File object, it's a new upload
                if (doc.file instanceof File) {
                    fd.append(`doc_type_${i}`, doc.doc_type);
                    fd.append(`doc_title_${i}`, doc.title);
                    fd.append(`doc_file_${i}`, doc.file);
                }
            });
            if (id) {
                await axios.patch(`/students/${id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast('Student updated successfully');
            } else {
                await axios.post('/students/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast('Student enrolled successfully');
            }
            navigate('/dashboard/students');
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') setErrors(data);
            else toast(`Failed to ${id ? 'update' : 'enroll'} student`, 'error');
        } finally { setSubmitting(false); }
    };

    const err = (field) => errors[field] ? (
        <p className="text-red-400 text-xs mt-1">{Array.isArray(errors[field]) ? errors[field][0] : errors[field]}</p>
    ) : null;

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="animate-spin text-indigo-500" size={40} />
            <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Profile...</p>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto pb-20 px-4">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-8"
            >
                <div>
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-bold mb-2">
                        <ArrowLeft size={16} /> Back to Directory
                    </button>
                    <h1 className="text-3xl font-black text-white tracking-tight">
                        {id ? 'Edit Student Profile' : 'Enroll New Student'}
                    </h1>
                </div>
                <button type="submit" form="admission-form" disabled={submitting}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={15} /> {id ? 'Update Profile' : 'Save & Enroll'}</>}
                </button>
            </motion.div>

            <form id="admission-form" onSubmit={handleSubmit} className="space-y-4">

                {/* Basic Info */}
                <Section title="Basic Information">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Field label="Admission No" required>
                            <Input value={form.admission_number} onChange={set('admission_number')} placeholder="Auto-generated" />
                            {err('admission_number')}
                        </Field>
                        <Field label="Registration No">
                            <Input value={form.registration_number} onChange={set('registration_number')} placeholder="Auto-generated" />
                            {err('registration_number')}
                        </Field>
                        <Field label="Roll Number">
                            <Input value={form.roll_number} onChange={set('roll_number')} placeholder="e.g. 01" />
                        </Field>
                        <Field label="ALNS / EMIS No">
                            <Input value={form.alns_emis_number} onChange={set('alns_emis_number')} placeholder="EMIS number" />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <Field label="First Name" required>
                            <Input required value={form.first_name} onChange={set('first_name')} placeholder="John" />
                            {err('first_name')}
                        </Field>
                        <Field label="Last Name">
                            <Input value={form.last_name} onChange={set('last_name')} placeholder="Doe" />
                        </Field>
                        <Field label="Gender" required>
                            <Select required value={form.gender} onChange={set('gender')}>
                                <option value="">Select</option>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                                <option value="O">Other</option>
                            </Select>
                        </Field>
                        <Field label="Date of Birth (BS)" required>
                            <NepaliDatePicker
                                required
                                maxToday
                                hideAD
                                valueBS={form.date_of_birth_bs}
                                onChange={(ad, bs) => setForm(prev => ({ ...prev, date_of_birth: ad, date_of_birth_bs: bs }))}
                            />
                            {err('date_of_birth')}
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <Field label="Class" required>
                            <Select required value={form.class_name} onChange={e => {
                                setForm(prev => ({ ...prev, class_name: e.target.value, section: '' }));
                            }}>
                                <option value="">Select class</option>
                                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </Select>
                            {err('class_name')}
                        </Field>
                        <Field label="Section">
                            <Select value={form.section} onChange={set('section')} disabled={!form.class_name}>
                                <option value="">Select section</option>
                                {(classes.find(c => c.name === form.class_name)?.sections || []).map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Blood Group">
                            <Select value={form.blood_group} onChange={set('blood_group')}>
                                <option value="">Select</option>
                                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
                            </Select>
                        </Field>
                        <Field label="Admission Date (BS)">
                            <NepaliDatePicker
                                hideAD
                                valueBS={form.admission_date_bs}
                                onChange={(ad, bs) => setForm(prev => ({ ...prev, admission_date: ad, admission_date_bs: bs }))}
                            />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <Field label="Mobile Number">
                            <Input value={form.mobile_number} onChange={set('mobile_number')} placeholder="98XXXXXXXX" />
                        </Field>
                        <Field label="Email">
                            <Input type="email" value={form.email} onChange={set('email')} placeholder="student@email.com" />
                        </Field>
                        <Field label="Height (cm)">
                            <Input value={form.height} onChange={set('height')} placeholder="150" />
                        </Field>
                        <Field label="Weight (kg)">
                            <Input value={form.weight} onChange={set('weight')} placeholder="45" />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <Field label="File No">
                            <Input value={form.file_number} onChange={set('file_number')} placeholder="File no." />
                        </Field>
                        <Field label="Regs No">
                            <Input value={form.regs_number} onChange={set('regs_number')} placeholder="Regs no." />
                        </Field>
                    </div>
                </Section>

                {/* Elective Selection */}
                <Section title="Subject Selection & Electives">
                    {form.class_name ? (
                        <ElectiveSelector 
                            classId={classes.find(c => c.name === form.class_name)?.id}
                            selectedSubjects={form.elective_subjects}
                            onChange={subjects => setForm(p => ({ ...p, elective_subjects: subjects }))}
                        />
                    ) : (
                        <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
                            <BookOpen size={30} className="text-slate-700 mb-3" />
                            <p className="text-slate-500 text-sm font-medium tracking-tight">Please select a class above to configure academic track and electives.</p>
                            <p className="text-slate-600 text-[10px] uppercase font-bold tracking-widest mt-1">Waiting for class selection...</p>
                        </div>
                    )}
                </Section>

                {/* Transportation Section */}
                <Section title="Transportation & School Bus">
                    <div className="flex flex-col md:flex-row gap-6 p-1">
                        <div className="flex-1">
                            <label className="flex items-center gap-3 cursor-pointer group mb-4">
                                <div onClick={() => setForm(p => ({ ...p, bus_route: p.bus_route ? '' : 'placeholder' }))}
                                    className={`w-12 h-6 rounded-full transition-all relative flex items-center px-1 ${form.bus_route ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white transition-all shadow-sm ${form.bus_route ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">School Bus Facility</span>
                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Enable to assign a route</span>
                                </div>
                            </label>

                            {!!form.bus_route && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 overflow-hidden">
                                    <Field label="Select Route & Package" required>
                                        <div className="relative">
                                            <select 
                                                value={form.bus_route === 'placeholder' ? '' : form.bus_route}
                                                onChange={e => setForm(p => ({ ...p, bus_route: e.target.value }))}
                                                className={`w-full bg-slate-800 border ${errors.bus_route ? 'border-rose-500/50' : 'border-slate-700'} rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-indigo-500 transition-all appearance-none`}
                                                required
                                            >
                                                <option value="">Choose a route...</option>
                                                {busRoutes.map(r => (
                                                    <option key={r.id} value={r.id}>{r.name} — Rs. {r.price}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                <ChevronDown size={14} />
                                            </div>
                                        </div>
                                        {err('bus_route')}
                                    </Field>
                                    
                                    {busRoutes.find(r => String(r.id) === String(form.bus_route)) && (
                                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-start gap-3">
                                            <Bus size={18} className="text-indigo-500 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-bold text-indigo-300">Route: {busRoutes.find(r => String(r.id) === String(form.bus_route)).name}</p>
                                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                                    {busRoutes.find(r => String(r.id) === String(form.bus_route)).description || 'Standard school transportation route with fixed stops.'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                        <div className="md:w-1/3 bg-slate-950/20 border border-slate-800/50 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-4 border border-slate-700 group-hover:bg-indigo-600 transition-all">
                                <Bus size={24} />
                            </div>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Transport</h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                Route selection automatically includes transport fees in monthly billing cycles.
                            </p>
                        </div>
                    </div>
                </Section>

                {/* Parent / Guardian */}
                <Section title="Parent & Guardian Details">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Field label="Father Name">
                            <Input value={form.father_name} onChange={set('father_name')} placeholder="Father's name" />
                        </Field>
                        <Field label="Father Phone">
                            <Input value={form.father_phone} onChange={set('father_phone')} placeholder="98XXXXXXXX" />
                        </Field>
                        <Field label="Father Occupation">
                            <Input value={form.father_occupation} onChange={set('father_occupation')} placeholder="Occupation" />
                        </Field>
                        <div />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <Field label="Mother Name">
                            <Input value={form.mother_name} onChange={set('mother_name')} placeholder="Mother's name" />
                        </Field>
                        <Field label="Mother Phone">
                            <Input value={form.mother_phone} onChange={set('mother_phone')} placeholder="98XXXXXXXX" />
                        </Field>
                        <Field label="Mother Occupation">
                            <Input value={form.mother_occupation} onChange={set('mother_occupation')} placeholder="Occupation" />
                        </Field>
                        <div />
                    </div>

                    {/* Guardian is */}
                    <div className="mt-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Guardian Is <span className="text-red-400">*</span>
                        </p>
                        <div className="flex gap-6">
                            {['father','mother','other'].map(g => (
                                <label key={g} className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="guardian_is" value={g}
                                        checked={form.guardian_is === g} onChange={set('guardian_is')}
                                        className="accent-indigo-500" />
                                    <span className="text-sm text-slate-300 capitalize">{g}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <Field label="Guardian Name" required>
                            <Input required value={form.guardian_name} onChange={set('guardian_name')} placeholder="Guardian name" />
                            {err('guardian_name')}
                        </Field>
                        <Field label="Guardian Phone" required>
                            <Input required value={form.guardian_phone} onChange={set('guardian_phone')} placeholder="98XXXXXXXX" />
                            {err('guardian_phone')}
                        </Field>
                        <Field label="Guardian Relation">
                            <Input value={form.guardian_relation} onChange={set('guardian_relation')} placeholder="e.g. Uncle" />
                        </Field>
                        <Field label="Guardian Email">
                            <Input type="email" value={form.guardian_email} onChange={set('guardian_email')} placeholder="guardian@email.com" />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <Field label="Guardian Occupation">
                            <Input value={form.guardian_occupation} onChange={set('guardian_occupation')} placeholder="Occupation" />
                        </Field>
                        <div className="col-span-2">
                            <Field label="Guardian Address">
                                <Input value={form.guardian_address} onChange={set('guardian_address')} placeholder="Address" />
                            </Field>
                        </div>
                    </div>
                </Section>

                {/* Address */}
                <Section title="Student Address Details" defaultOpen={false}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Current Address">
                            <Textarea value={form.current_address} onChange={set('current_address')} placeholder="Current address" />
                        </Field>
                        <Field label="Permanent Address">
                            <Textarea value={form.permanent_address} onChange={set('permanent_address')} placeholder="Permanent address" />
                        </Field>
                    </div>
                </Section>

                {/* Miscellaneous */}
                <Section title="Miscellaneous Details" defaultOpen={false}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="National Identification Number">
                            <Input value={form.national_id} onChange={set('national_id')} placeholder="National ID" />
                        </Field>
                        <Field label="Local Identification Number">
                            <Input value={form.local_id} onChange={set('local_id')} placeholder="Local ID" />
                        </Field>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <Field label="Previous School Details">
                            <Textarea value={form.previous_school} onChange={set('previous_school')} placeholder="Previous school name and details" />
                        </Field>
                        <Field label="Note">
                            <Textarea value={form.note} onChange={set('note')} placeholder="Any additional notes" />
                        </Field>
                    </div>
                </Section>

            </form>
        </div>
    );
};

export default StudentAdmissionForm;
