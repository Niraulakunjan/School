import React from 'react';
import { Printer, X } from 'lucide-react';
import { GradeSheetContent } from './GradeSheet';

const BulkGradeSheets = ({ students, exam, routines, gridData, schoolInfo, onClose }) => {
    if (!students || students.length === 0 || !exam) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div id="bulk-print-section-wrapper" className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95 backdrop-blur-xl print:bg-white print:backdrop-blur-none transition-all duration-500">
            {/* Header Control Bar */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 print:hidden print-hidden">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black text-white tracking-tight">Bulk Certificates</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{students.length} Students Selected • {exam.name}</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handlePrint} 
                        className="flex items-center gap-2.5 bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-black text-sm transition-all shadow-xl shadow-violet-500/20 active:scale-95 group"
                    >
                        <Printer size={18} className="group-hover:rotate-12 transition-transform" /> 
                        Print All Certificates
                    </button>
                    <button 
                        onClick={onClose} 
                        className="bg-slate-800/50 text-slate-400 p-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition-all border border-slate-700/50"
                    >
                        <X size={22} />
                    </button>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-8 print:p-0 flex flex-col items-center gap-12 print:gap-0 custom-scrollbar">
                <div id="bulk-print-section" className="flex flex-col items-center w-full print:block">
                    {students.map((student, index) => (
                        <div key={student.id} className="relative shadow-2xl print:shadow-none mb-12 print:mb-0">
                            <GradeSheetContent 
                                student={student} 
                                exam={exam} 
                                routines={routines} 
                                gridData={gridData} 
                                schoolInfo={schoolInfo} 
                            />
                            
                            {/* Page Indicator for screen view */}
                            <div className="absolute -left-12 top-0 h-full flex flex-col items-center justify-start py-8 print:hidden">
                                <span className="bg-slate-800 text-slate-400 text-[10px] font-black px-2 py-1 rounded rotate-180 [writing-mode:vertical-lr] tracking-widest border border-slate-700 uppercase">Page {index + 1}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Global Print-Only Styles for Bulk */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    /* Aggressively hide all system UI */
                    aside, 
                    header, 
                    nav,
                    #sidebar-portal,
                    #topbar-portal,
                    #topbar-actions-portal,
                    .print-hidden {
                        display: none !important;
                        height: 0 !important;
                        width: 0 !important;
                        overflow: hidden !important;
                        visibility: hidden !important;
                    }

                    /* Reset the entire layout structure to allow full-page flow */
                    html, body, #root, [class*="app-container"], [class*="flex"], [class*="main-content"], [class*="layout"] {
                        height: auto !important;
                        min-height: 100% !important;
                        overflow: visible !important;
                        position: static !important;
                        display: block !important;
                        background: white !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        transform: none !important;
                    }

                    /* Ensure the bulk print section is the only visible relative/block */
                    #bulk-print-section-wrapper {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        display: block !important;
                        visibility: visible !important;
                        z-index: 9999 !important;
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    #bulk-print-section { 
                        display: block !important;
                        width: 210mm !important;
                        margin: 0 auto !important;
                        padding: 0 !important;
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
                        visibility: visible !important;
                    }

                    @page {
                        size: A4;
                        margin: 0;
                    }
                }
            ` }} />
        </div>
    );
};

export default BulkGradeSheets;
