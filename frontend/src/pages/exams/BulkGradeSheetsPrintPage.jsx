import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { GradeSheetContent } from '../../components/exams/GradeSheet';
import { Loader2 } from 'lucide-react';

export default function BulkGradeSheetsPrintPage() {
    const { examId, classId } = useParams();
    const [searchParams] = useSearchParams();
    const sectionName = searchParams.get('section') || '';
    const className = searchParams.get('className') || '';

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBulkData = async () => {
            try {
                // Fetch basic data
                const [examRes, schoolRes] = await Promise.all([
                    api.get(`/exams/${examId}/`),
                    api.get('/tenants/current/')
                ]);

                const currentExam = examRes.data;
                const filteredRoutines = (currentExam.routines || []).filter(r => 
                    String(r.class_obj) === String(classId)
                );

                // Fetch students and marks for this class/exam
                // Prioritize class_name for filtering since Student model uses CharField for class
                let studentUrl = `/students/?class_name=${encodeURIComponent(className)}`;
                if (sectionName && sectionName !== 'All') {
                    studentUrl += `&section=${encodeURIComponent(sectionName)}`;
                }

                const [studRes, markRes] = await Promise.all([
                    api.get(studentUrl),
                    api.get(`/mark-ledgers/?exam=${examId}&class_id=${classId}`)
                ]);

                // Group marks
                const grid = {};
                const markData = markRes.data.results || markRes.data;
                if (Array.isArray(markData)) {
                    markData.forEach(m => {
                        if (!grid[m.student]) grid[m.student] = {};
                        grid[m.student][m.routine] = { marks: m.marks_obtained, isAbsent: m.is_absent };
                    });
                }

                setData({
                    exam: currentExam,
                    students: studRes.data.results || studRes.data,
                    routines: filteredRoutines,
                    gridData: grid,
                    schoolInfo: {
                        name: schoolRes.data.name,
                        logo: schoolRes.data.logo,
                        address: schoolRes.data.address
                    }
                });
            } catch (err) {
                console.error("Bulk print fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBulkData();
    }, [examId, classId, sectionName, className]);

    // Auto-print effect
    useEffect(() => {
        if (!loading && data?.students?.length > 0) {
            const timer = setTimeout(() => {
                window.print();
            }, 1000); // Slightly longer for bulk to ensure all images load
            return () => clearTimeout(timer);
        }
    }, [loading, data]);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
            <Loader2 className="text-violet-600 animate-spin" size={56} />
            <div className="text-center">
                <p className="text-slate-800 font-black uppercase tracking-[0.3em] text-sm">Synchronizing Data...</p>
                <p className="text-slate-400 font-bold mt-2 text-xs">Preparing bulk certificates for high-fidelity printing</p>
            </div>
        </div>
    );

    if (!data || !data.students?.length) return <div className="p-20 text-slate-500 font-black text-center uppercase tracking-widest">No matching student records found for this selection.</div>;

    return (
        <div className="bg-white min-h-screen flex flex-col items-center print:block">
            <div id="bulk-print-section" className="w-full flex flex-col items-center print:block">
                {data.students.map((student, index) => (
                    <div key={student.id} className="relative shadow-2xl print:shadow-none mb-12 print:mb-0">
                        <GradeSheetContent 
                            student={student} 
                            exam={data.exam} 
                            routines={data.routines} 
                            gridData={{ [student.id]: data.gridData[student.id] }} 
                            schoolInfo={data.schoolInfo} 
                        />
                        
                        {/* Page Indicator (Screen Only) */}
                        <div className="absolute -left-12 top-0 h-full flex flex-col items-center justify-start py-8 print:hidden">
                            <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded rotate-180 [writing-mode:vertical-lr] tracking-widest shadow-lg">Certificate {index + 1}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="fixed bottom-8 right-8 print:hidden flex flex-col items-center gap-3">
                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest bg-white/80 px-4 py-1 rounded-full shadow-sm">{data.students.length} Certificates Ready</p>
                <button 
                    onClick={() => window.print()}
                    className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-2xl hover:bg-indigo-500 transition-all flex items-center gap-3 active:scale-95 group"
                >
                    Manual Print All
                </button>
            </div>

            {/* Global Print Resets for Bulk */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0; padding: 0; background: white !important; }
                    
                    /* Force strict flow for bulk pages */
                    html, body, #root { 
                        height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                        display: block !important;
                    }

                    #bulk-print-section { 
                        display: block !important;
                        width: 210mm !important;
                        margin: 0 auto !important;
                    }

                    .grade-sheet-container {
                        display: block !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        position: relative !important;
                        border: none !important;
                        padding: 6mm !important;
                        box-sizing: border-box !important;
                    }

                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            ` }} />
        </div>
    );
}
