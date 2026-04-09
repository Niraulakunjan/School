import React from 'react';
import { Printer, X, GraduationCap, ShieldCheck, Award, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Reusable Pure Visual Content for Individual or Bulk Use (Diamond Redesign)
// Reusable Pure Visual Content for Individual or Bulk Use (Traditional Redesign)
export const GradeSheetContent = ({ student, exam, routines, gridData, schoolInfo }) => {
    if (!student || !exam) return null;

    const schoolName = schoolInfo?.name || 'Udayasi English Secondary School';
    const schoolLogo = schoolInfo?.logo;
    const schoolAddress = schoolInfo?.address || 'Institutional Road, Metropolis';

    const getGradeInfo = (obtained, full, pass) => {
        if (!obtained && obtained !== 0) return { gp: '—', g: '—' };
        const num = parseFloat(obtained);
        const pct = (num / full) * 100;
        let gp, g;
        if (pct >= 90) { gp = '4.0'; g = 'A+'; }
        else if (pct >= 80) { gp = '3.6'; g = 'A'; }
        else if (pct >= 70) { gp = '3.2'; g = 'B+'; }
        else if (pct >= 60) { gp = '2.8'; g = 'B'; }
        else if (pct >= 50) { gp = '2.4'; g = 'C+'; }
        else if (pct >= 40) { gp = '2.0'; g = 'C'; }
        else if (pct >= 35) { gp = '1.6'; g = 'D'; }
        else { gp = '0.0'; g = 'NG'; }
        return { gp, g };
    };

    let totalGradePoints = 0;
    let totalCredits = 0;
    
    const tableRows = [];
    routines.forEach(r => {
        const cell = gridData?.[student.id]?.[r.id];
        const credit = parseFloat(r.credit_hours || 0);
        
        // Final Grade (composite)
        const totalInfo = getGradeInfo(cell?.marks, r.effective_full_marks, r.effective_pass_marks);
        if (totalInfo.gp !== '—') { 
            totalGradePoints += parseFloat(totalInfo.gp) * credit; 
            totalCredits += credit; 
        }

        if (r.has_practical) {
            // Split into TH and IN rows to match traditional style
            const thInfo = getGradeInfo(cell?.theory_marks, r.theory_full_marks, r.theory_pass_marks);
            const inInfo = getGradeInfo(cell?.practical_marks, r.practical_full_marks, r.practical_pass_marks);
            
            tableRows.push({
                code: r.subject_code || '—',
                name: `${r.subject_name} (TH)`,
                credit: (credit * 0.75).toFixed(2),
                gp: thInfo.gp,
                grade: thInfo.g,
                fg: totalInfo.g,
                remarks: cell?.isAbsent ? 'ABS' : ''
            });
            tableRows.push({
                code: '', // Typically related but distinct code
                name: `${r.subject_name} (IN)`,
                credit: (credit * 0.25).toFixed(2),
                gp: inInfo.gp,
                grade: inInfo.g,
                fg: '',
                remarks: ''
            });
        } else {
            tableRows.push({
                code: r.subject_code || '—',
                name: r.subject_name,
                credit: credit.toFixed(2),
                gp: totalInfo.gp,
                grade: totalInfo.g,
                fg: totalInfo.g,
                remarks: cell?.isAbsent ? 'ABS' : ''
            });
        }
    });

    const overallGPA = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';

    const academicYearBS = exam.financial_year_name?.split('/')[0] || (new Date().getFullYear() + 57).toString();
    const academicYearAD = (parseInt(academicYearBS) - 57).toString();

    return (
        <div className="grade-sheet-container bg-white w-[210mm] h-[297mm] p-6 relative text-black mb-4 print:mb-0 box-border overflow-hidden" style={{ pageBreakAfter: 'always', fontFamily: '"Times New Roman", Times, serif' }}>
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none select-none">
                {schoolLogo ? <img src={schoolLogo} alt="" className="w-1/2 opacity-50 grayscale" /> : <GraduationCap size={400} />}
            </div>

            {/* Main Content Border */}
            <div className="h-full w-full border-2 border-black p-8 flex flex-col relative z-10 box-border">
                {/* Header Information */}
                <div className="flex flex-col items-center mb-6 text-center">
                    <div className="absolute top-2 right-8 w-24 h-24 border border-black/20 rounded-full flex items-center justify-center opacity-10">
                        {schoolLogo ? <img src={schoolLogo} alt="Logo" className="w-16 h-16 object-contain" /> : <GraduationCap size={40} />}
                    </div>
                    
                    <h1 className="text-3xl font-bold uppercase mb-1">{schoolName}</h1>
                    <h2 className="text-lg font-bold uppercase mb-1">BOARD EXAMINATION {academicYearBS}</h2>
                    <h3 className="text-2xl font-bold uppercase underline decoration-double underline-offset-4">GRADE SHEET</h3>
                </div>

                {/* Student Personal Info Blocks */}
                <div className="space-y-3 mb-6 text-[13px]">
                    <div className="flex items-end gap-2">
                        <span className="uppercase whitespace-nowrap">THE GRADE(S) SECURED BY</span>
                        <div className="flex-1 border-b border-black font-bold px-2 text-center uppercase">{student.first_name} {student.last_name}</div>
                    </div>
                    
                    <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5 flex items-end gap-2">
                            <span className="uppercase whitespace-nowrap">DATE OF BIRTH</span>
                            <div className="flex-1 border-b border-black font-bold px-1 text-center">{student.date_of_birth_bs || '—'}</div>
                            <span className="uppercase">B.S.</span>
                        </div>
                        <div className="col-span-1 flex items-end justify-center"> ( </div>
                        <div className="col-span-5 flex items-end gap-2">
                            <div className="flex-1 border-b border-black font-bold px-1 text-center">{student.date_of_birth || '—'}</div>
                            <span className="uppercase whitespace-nowrap">A.D. )</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-4 flex items-end gap-2">
                            <span className="uppercase whitespace-nowrap">REGISTRATION NO.</span>
                            <div className="flex-1 border-b border-black font-bold px-1 text-center">{student.registration_number || '—'}</div>
                        </div>
                        <div className="col-span-4 flex items-end gap-2">
                            <span className="uppercase whitespace-nowrap">SYMBOL NO.</span>
                            <div className="flex-1 border-b border-black font-bold px-1 text-center">{student.symbol_number || student.roll_number || '—'}</div>
                        </div>
                        <div className="col-span-4 flex items-end gap-2">
                            <span className="uppercase whitespace-nowrap">GRADE</span>
                            <div className="flex-1 border-b border-black font-bold px-1 text-center uppercase">{student.class_name || '—'}</div>
                        </div>
                    </div>

                    <div className="flex items-end gap-2">
                        <span className="uppercase whitespace-nowrap">IN THE BOARD EXAMINATION {student.class_name || '—'} CONDUCTED IN</span>
                        <div className="flex-1 border-b border-black font-bold px-2 text-center">{academicYearBS}</div>
                        <span className="uppercase">B.S. (</span>
                        <div className="w-16 border-b border-black font-bold text-center">{academicYearAD}</div>
                        <span className="uppercase">A.D. )</span>
                    </div>
                    <div className="uppercase">ARE GIVEN BELOW</div>
                </div>

                {/* Result Table */}
                <div className="mb-4">
                    <table className="w-full border-2 border-black border-collapse text-[11px]">
                        <thead>
                            <tr className="border-b-2 border-black align-middle">
                                <th className="border-r border-black p-1 w-16 uppercase">Subject Code</th>
                                <th className="border-r border-black p-1 text-left uppercase">Subject</th>
                                <th className="border-r border-black p-1 w-20 uppercase leading-tight">Credit Hour (CR)</th>
                                <th className="border-r border-black p-1 w-20 uppercase leading-tight">Grade Point (GP)</th>
                                <th className="border-r border-black p-1 w-16 uppercase">Grade</th>
                                <th className="border-r border-black p-1 w-16 uppercase leading-tight">Final Grade (FG)</th>
                                <th className="p-1 w-24 uppercase">Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableRows.map((row, i) => (
                                <tr key={i} className="border-b border-black/30 h-8">
                                    <td className="border-r border-black text-center p-1">{row.code}</td>
                                    <td className="border-r border-black px-2 py-1 uppercase">{row.name}</td>
                                    <td className="border-r border-black text-center p-1 font-bold">{row.credit}</td>
                                    <td className="border-r border-black text-center p-1 font-bold">{row.gp}</td>
                                    <td className="border-r border-black text-center p-1 font-bold">{row.grade}</td>
                                    <td className="border-r border-black text-center p-1 font-bold text-sm italic">{row.fg}</td>
                                    <td className="text-center p-1 uppercase text-[9px]">{row.remarks}</td>
                                </tr>
                            ))}
                            {/* Fill empty rows to maintain consistency */}
                            {[...Array(Math.max(0, 10 - tableRows.length))].map((_, i) => (
                                <tr key={`empty-${i}`} className="border-b border-black/30 h-8">
                                    <td className="border-r border-black" />
                                    <td className="border-r border-black" />
                                    <td className="border-r border-black" />
                                    <td className="border-r border-black" />
                                    <td className="border-r border-black" />
                                    <td className="border-r border-black" />
                                    <td />
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {/* GPA Row */}
                    <div className="border-2 border-black border-t-0 p-1.5 text-center font-bold text-sm uppercase">
                        GRADE POINT AVERAGE (GPA) = {overallGPA}
                    </div>
                </div>

                {/* Extra Credit Section */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold uppercase mb-1">EXTRA CREDIT SUBJECT</h3>
                    <div className="grid grid-cols-7 border border-black h-8">
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="border-r border-black last:border-0" />
                        ))}
                    </div>
                </div>

                {/* Footer / Legend */}
                <div className="flex-1" />
                
                <div className="grid grid-cols-3 gap-8 items-end text-[11px] mb-8 font-bold">
                    <div className="text-center">
                        <span className="uppercase">Prepared By</span>
                        <div className="mt-8 border-t border-black border-dashed pt-1" />
                    </div>
                    <div className="text-center">
                        <span className="uppercase">Checked By</span>
                        <div className="mt-8 border-t border-black border-dashed pt-1" />
                    </div>
                    <div className="text-center">
                        <span className="uppercase">Head Teacher / Campus Chief</span>
                        <div className="mt-8 border-t border-black border-dashed pt-1" />
                    </div>
                </div>

                <div className="text-[10px] space-y-1">
                    <div className="flex gap-4">
                        <span className="uppercase">Date of Issue:</span>
                        <span className="font-bold border-b border-black px-2">{new Date().toISOString().split('T')[0]}</span>
                    </div>
                    <div className="pt-2 text-[9px] text-zinc-600 font-bold italic leading-tight uppercase">
                        <p>NOTE: ONE CREDIT HOUR EQUALS TO 32 WORKING HOURS</p>
                        <p>INTERNAL(IN): THIS COVERS THE PARTICIPATION, PRACTICAL/PROJECT WORKS, COMMUNITY WORKS, INTERNSHIP, PRESENTATIONS, TERMINAL EXAMINATIONS.</p>
                        <p>THEORY(TH): THIS COVERS WRITTEN EXTERNAL EXAMINATION.</p>
                        <div className="flex gap-12 mt-2">
                            <span>ABS = ABSENT</span>
                            <span>W = WITHHELD</span>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .grade-sheet-container { padding: 0 !important; }
                    @page { size: A4; margin: 10mm; }
                    .grade-sheet-container { box-shadow: none !important; border: none !important; }
                }
            ` }} />
        </div>
    );
};

const GradeSheet = ({ student, exam, routines, gridData, schoolInfo, onClose }) => {
    if (!student || !exam) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl p-4 overflow-y-auto print:p-0 print:bg-white">
            <div id="print-section" className="bg-white shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative print:shadow-none print:m-0 print:border-0 origin-top animate-in zoom-in-95 duration-500">
                <div className="absolute top-8 right-[-100px] flex flex-col items-center gap-4 print:hidden z-[10]">
                    <motion.button whileHover={{ scale: 1.1, x: 5 }} onClick={() => window.print()} className="w-16 h-16 bg-white text-slate-950 rounded-full flex items-center justify-center shadow-2xl border border-white/20"><Printer size={24} /></motion.button>
                    <motion.button whileHover={{ scale: 1.1, x: 5 }} onClick={onClose} className="w-16 h-16 bg-slate-900/50 backdrop-blur-xl text-white/50 hover:text-white rounded-full flex items-center justify-center shadow-2xl"><X size={24} /></motion.button>
                </div>
                <GradeSheetContent student={student} exam={exam} routines={routines} gridData={gridData} schoolInfo={schoolInfo} />
            </div>
        </div>
    );
};

export default GradeSheet;
