import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import { GradeSheetContent } from '../../components/exams/GradeSheet';
import { Loader2 } from 'lucide-react';

export default function GradeSheetPrintPage() {
    const { examId, studentId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [examRes, studentRes, marksRes, schoolRes] = await Promise.all([
                    api.get(`/exams/${examId}/`),
                    api.get(`/students/${studentId}/`),
                    api.get(`/mark-ledgers/?exam=${examId}&student=${studentId}`),
                    api.get('/tenants/current/')
                ]);

                // Format grid data for the component
                const grid = {};
                const markData = marksRes.data.results || marksRes.data;
                if (Array.isArray(markData)) {
                    markData.forEach(m => {
                        if (!grid[m.student]) grid[m.student] = {};
                        grid[m.student][m.routine] = { marks: m.marks_obtained, isAbsent: m.is_absent };
                    });
                }

                setData({
                    exam: examRes.data,
                    student: studentRes.data,
                    routines: (examRes.data.routines || []).filter(r => String(r.class_obj) === String(studentRes.data.class_id)),
                    gridData: grid,
                    schoolInfo: {
                        name: schoolRes.data.name,
                        logo: schoolRes.data.logo,
                        address: schoolRes.data.address
                    }
                });
            } catch (err) {
                console.error("Print fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [examId, studentId]);

    // Auto-print effect
    useEffect(() => {
        if (!loading && data) {
            // Small timeout to ensure fonts and styles are fully applied
            const timer = setTimeout(() => {
                window.print();
                // Optional: window.close() can be problematic but professional if user agrees
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [loading, data]);

    if (loading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
            <Loader2 className="text-indigo-600 animate-spin" size={40} />
            <p className="text-slate-500 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Preparing Grade Sheet...</p>
        </div>
    );

    if (!data) return <div className="p-8 text-red-500 font-bold text-center">Failed to load certificate data.</div>;

    return (
        <div className="bg-white min-h-screen flex flex-col items-center print:block">
            <div id="print-section" className="print:block">
                <GradeSheetContent 
                    student={data.student}
                    exam={data.exam}
                    routines={data.routines}
                    gridData={data.gridData}
                    schoolInfo={data.schoolInfo}
                />
            </div>

            {/* Print Help for user who might have blocks */}
            <div className="fixed bottom-8 right-8 print:hidden">
                <button 
                    onClick={() => window.print()}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-2xl hover:bg-indigo-500 transition-all flex items-center gap-3 active:scale-95"
                >
                    Manual Print
                </button>
            </div>

            {/* Global Print Resets - Replicated for isolation */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0; padding: 0; background: white; }
                    #print-section { 
                        position: fixed !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        width: 210mm !important;
                        height: 297mm !important;
                        visibility: visible !important;
                        display: block !important;
                    }
                    .grade-sheet-container {
                        width: 210mm !important;
                        height: 297mm !important;
                        padding: 6mm !important;
                        box-sizing: border-box !important;
                        display: block !important;
                    }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            ` }} />
        </div>
    );
}
