import React, { useRef, useEffect, useState } from 'react';
import { X, Printer, Download, MapPin, Phone, Mail, Landmark, ShieldCheck, Component } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../../api/axios';

const PaySlipModal = ({ slip, onClose }) => {
    const printRef = useRef();
    const [school, setSchool] = useState(null);
    const [payrollSettings, setPayrollSettings] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [schRes, payRes] = await Promise.all([
                    axios.get('/school-settings/'),
                    axios.get('/payroll-settings/')
                ]);
                const schData = Array.isArray(schRes.data) ? schRes.data[0] : schRes.data;
                setSchool(schData);
                setPayrollSettings(payRes.data);
            } catch (err) {
                console.error("Failed to fetch slip settings", err);
            }
        };
        fetchData();
    }, []);

    const handlePrint = () => {
        const content = printRef.current.innerHTML;
        const win = window.open('', '', 'height=800,width=1000');
        win.document.write('<html><head><title>Pay Slip - ' + slip.staff_name + '</title>');
        win.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">');
        win.document.write('<style>@media print { body { -webkit-print-color-adjust: exact; } .print-shadow { box-shadow: none !important; border: 1px solid #e2e8f0 !important; } }</style>');
        win.document.write('</head><body class="bg-white p-10 font-sans">');
        win.document.write(content);
        win.document.write('</body></html>');
        setTimeout(() => {
            win.print();
            win.close();
        }, 800);
    };

    if (!slip) return null;

    // Helper to categorize allowances
    const allAllowances = slip.allowances || {};
    const compConfig = (payrollSettings?.salary_components || []).reduce((acc, c) => ({ ...acc, [c.id]: c.type }), {});
    
    const customAdditions = Object.entries(allAllowances).filter(([id]) => compConfig[id] !== 'deduction');
    const customDeductions = Object.entries(allAllowances).filter(([id]) => compConfig[id] === 'deduction');

    const totalEarnings = parseFloat(slip.total_earnings || 0);
    const totalDeductions = parseFloat(slip.total_deductions || 0);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-5xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col max-h-[92vh]"
                >
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-slate-800 shrink-0 bg-slate-900/50 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                                <Landmark size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">Salary Disbursement Slip</h3>
                                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em]">{slip.month} {slip.year} • Official Record</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handlePrint}
                                className="flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-2.5 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/25 active:scale-95">
                                <Printer size={16} /> Print Document
                            </button>
                            <button onClick={onClose}
                                className="p-2.5 rounded-xl hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all border border-transparent hover:border-rose-500/20">
                                <X size={22} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Preview Area */}
                    <div className="p-10 overflow-y-auto bg-slate-950 scrollbar-hide flex justify-center">
                        {/* Printable Document Box */}
                        <div ref={printRef} className="bg-white text-slate-900 p-12 w-full max-w-[850px] shadow-2xl rounded-sm border border-slate-100 print-shadow">
                            
                            {/* Decorative Top Border */}
                            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 mb-10"></div>

                            {/* Header Section */}
                            <div className="flex justify-between items-start mb-12">
                                <div className="flex items-center gap-6">
                                    {school?.logo ? (
                                        <img src={school.logo} alt="Logo" className="w-20 h-20 object-contain" />
                                    ) : (
                                        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white font-black text-3xl shadow-xl ring-8 ring-indigo-50">
                                            {school?.school_name?.[0] || 'S'}
                                        </div>
                                    )}
                                    <div>
                                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-2">{school?.school_name || "Sajilo School"}</h1>
                                        <div className="space-y-1">
                                            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"><MapPin size={12} className="text-indigo-500" /> {school?.address || "Kathmandu, Nepal"}</p>
                                            <p className="text-slate-500 text-[11px] font-medium flex items-center gap-4">
                                                <span className="flex items-center gap-1.5"><Phone size={12} className="text-indigo-500" /> {school?.phone || "+977 XXX-XXXXXXX"}</span>
                                                <span className="flex items-center gap-1.5"><Mail size={12} className="text-indigo-500" /> {school?.email || "info@school.edu"}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="inline-block px-4 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded mb-3">Pay Slip</div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Billing Period</p>
                                    <p className="text-lg font-black text-indigo-600 uppercase tracking-tight">{slip.month} {slip.year}</p>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-3 gap-0 mb-12 border-y border-slate-100 py-8">
                                <div className="px-6 border-r border-slate-100">
                                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mb-1.5">Employee Details</p>
                                    <h4 className="text-slate-900 font-black text-base leading-tight mb-1">{slip.staff_name}</h4>
                                    <p className="text-indigo-600 text-[11px] font-bold uppercase tracking-wide">{slip.post || 'Staff'}</p>
                                </div>
                                <div className="px-6 border-r border-slate-100">
                                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mb-1.5">Employment ID</p>
                                    <p className="text-slate-800 font-mono font-bold text-sm tracking-tighter">#{String(slip.staff).padStart(5, '0')}</p>
                                </div>
                                <div className="px-6">
                                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mb-1.5">Disbursement Date</p>
                                    <p className="text-slate-800 font-bold text-sm">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                            </div>

                            {/* Tables Container */}
                            <div className="grid grid-cols-2 gap-16 mb-12">
                                {/* Earnings column */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4 border-b-2 border-emerald-500 pb-2">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600"><Component size={14} /></div>
                                        <h3 className="text-emerald-900 text-[11px] uppercase font-black tracking-widest">Earnings & Benefits</h3>
                                    </div>
                                    <div className="space-y-3.5">
                                        <div className="flex justify-between text-[13px] group">
                                            <span className="text-slate-500 font-medium">Basic Pay</span>
                                            <span className="font-bold text-slate-900">Rs. {parseFloat(slip.basic_salary || 0).toLocaleString()}</span>
                                        </div>
                                        {customAdditions.map(([name, val], i) => (
                                            <div key={i} className="flex justify-between text-[13px]">
                                                <span className="text-slate-500 font-medium">{name.replace(/_/g, ' ')}</span>
                                                <span className="font-bold text-slate-900">Rs. {parseFloat(val || 0).toLocaleString()}</span>
                                            </div>
                                        ))}
                                        {/* Automated additions if any */}
                                        {parseFloat(slip.pf_add || 0) > 0 && (
                                            <div className="flex justify-between text-[13px]">
                                                <span className="text-slate-500 font-medium">PF Employer Cont.</span>
                                                <span className="font-bold text-slate-900">Rs. {parseFloat(slip.pf_add).toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="pt-4 border-t border-slate-100 flex justify-between text-base font-black text-emerald-600">
                                            <span className="uppercase text-[10px] tracking-widest pt-1">Gross Earnings</span>
                                            <span>Rs. {totalEarnings.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Deductions column */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4 border-b-2 border-rose-500 pb-2">
                                        <div className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600"><ShieldCheck size={14} /></div>
                                        <h3 className="text-rose-900 text-[11px] uppercase font-black tracking-widest">Deductions</h3>
                                    </div>
                                    <div className="space-y-3.5">
                                        {customDeductions.map(([name, val], i) => (
                                            <div key={i} className="flex justify-between text-[13px]">
                                                <span className="text-slate-500 font-medium">{name.replace(/_/g, ' ')}</span>
                                                <span className="font-bold text-rose-600">Rs. {parseFloat(val || 0).toLocaleString()}</span>
                                            </div>
                                        ))}
                                        {[
                                            { l: 'Professional Tax', v: slip.payroll_tax },
                                            { l: 'Income Tax (TDS)', v: slip.salary_tax },
                                            { l: 'Advance Repayment', v: slip.advance_less },
                                            { l: 'Fine / Miss Charge', v: slip.miss_charge },
                                            { l: 'Absent Deductions', v: slip.absent_less },
                                        ].filter(item => parseFloat(item.v || 0) > 0).map((item, i) => (
                                            <div key={i} className="flex justify-between text-[13px]">
                                                <span className="text-slate-500 font-medium">{item.l}</span>
                                                <span className="font-bold text-rose-600">Rs. {parseFloat(item.v).toLocaleString()}</span>
                                            </div>
                                        ))}
                                        <div className="pt-4 border-t border-slate-100 flex justify-between text-base font-black text-rose-600">
                                            <span className="uppercase text-[10px] tracking-widest pt-1">Total Deductions</span>
                                            <span>- Rs. {totalDeductions.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Net Payable - The Hero View */}
                            <div className="relative mb-12">
                                <div className="absolute inset-0 bg-indigo-600 rounded-3xl transform -rotate-1 opacity-5"></div>
                                <div className="relative bg-slate-900 text-white rounded-[1.5rem] p-10 flex justify-between items-center overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                    <div className="z-10">
                                        <p className="text-[10px] uppercase font-black tracking-[0.3em] text-indigo-400 mb-2">Net Take Home Salary</p>
                                        <p className="text-5xl font-black tracking-tighter shadow-sm">
                                            <span className="text-2xl font-light text-slate-400 mr-2">Rs.</span>
                                            {parseFloat(slip.net_salary || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="z-10 text-right border-l border-white/10 pl-10">
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3 italic">Verified Signature</p>
                                        <div className="h-12 w-32 border-b-2 border-indigo-500/50 mb-2 flex items-end justify-center">
                                           <span className="text-[10px] font-mono text-indigo-400/80 uppercase tracking-widest">Digital Auth</span>
                                        </div>
                                        <p className="text-[9px] font-black uppercase text-white tracking-widest">Office of Register</p>
                                    </div>
                                </div>
                            </div>

                            {/* Terms & Footer */}
                            <div className="grid grid-cols-2 gap-10 mt-16 pt-10 border-t border-slate-100">
                                <div className="space-y-2">
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes & Policies</h5>
                                    <p className="text-[9px] text-slate-500 leading-relaxed font-medium">This document provides a summary of earnings and deductions for the specified period. Taxes are calculated as per regional regulations. For any discrepancies, please contact the accounts department within 7 business days.</p>
                                </div>
                                <div className="flex flex-col items-end justify-end gap-1">
                                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-[0.2em]">{school?.school_name || "Sajilo School"} Management System</p>
                                    <p className="text-[8px] text-slate-300 font-mono">HASH::{slip.id}-{Date.now()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PaySlipModal;
