import React, { useState, useEffect, useRef } from 'react';
import NepaliDate from 'nepali-date-converter';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { adToBS as utilAdToBS, bsToAD as utilBsToAD, BS_MONTHS } from '../utils/dateUtils';

// Full BS calendar days per month (year 2000–2090)
// Source: official BS calendar data
const BS_DAYS = {
    2060:[30,32,31,32,31,30,30,30,29,30,29,31],
    2061:[31,31,32,31,31,31,30,29,30,29,30,30],
    2062:[31,31,32,32,31,30,30,29,30,29,30,30],
    2063:[31,32,31,32,31,30,30,30,29,29,30,31],
    2064:[30,32,31,32,31,30,30,30,29,30,29,31],
    2065:[31,31,32,31,31,31,30,29,30,29,30,30],
    2066:[31,31,32,32,31,30,30,29,30,29,30,30],
    2067:[31,32,31,32,31,30,30,30,29,29,30,31],
    2068:[30,32,31,32,31,30,30,30,29,30,29,31],
    2069:[31,31,32,31,31,31,30,29,30,29,30,30],
    2070:[31,31,32,32,31,30,30,29,30,29,30,30],
    2071:[31,32,31,32,31,30,30,30,29,29,30,31],
    2072:[30,32,31,32,31,30,30,30,29,30,29,31],
    2073:[31,31,32,31,31,31,30,29,30,29,30,30],
    2074:[31,31,32,32,31,30,30,29,30,29,30,30],
    2075:[31,32,31,32,31,30,30,30,29,29,30,31],
    2076:[30,32,31,32,31,30,30,30,29,30,29,31],
    2077:[31,31,32,31,31,31,30,29,30,29,30,30],
    2078:[31,31,32,32,31,30,30,29,30,29,30,30],
    2079:[31,32,31,32,31,30,30,30,29,29,30,31],
    2080:[30,32,31,32,31,30,30,30,29,30,29,31],
    2081:[31,31,32,31,31,31,30,29,30,29,30,30],
    2082:[31,31,32,32,31,30,30,29,30,29,30,30],
    2083:[31,32,31,32,31,30,30,30,29,29,30,31],
    2084:[30,32,31,32,31,30,30,30,29,30,29,31],
    2085:[31,31,32,31,31,31,30,29,30,29,30,30],
    2086:[31,31,32,32,31,30,30,29,30,29,30,30],
    2087:[31,32,31,32,31,30,30,30,29,29,30,31],
    2088:[30,32,31,32,31,30,30,30,29,30,29,31],
    2089:[31,31,32,31,31,31,30,29,30,29,30,30],
    2090:[31,31,32,32,31,30,30,29,30,29,30,30],
};

const BS_START = 2060;
const BS_END   = 2090;

function getDays(year, month) {
    return (BS_DAYS[year] && BS_DAYS[year][month - 1]) || 30;
}

function adToBS(adStr) {
    const res = utilAdToBS(adStr);
    if (!res) return null;
    const [y, m, d] = res.split('-').map(Number);
    return { year: y, month: m, day: d };
}

function bsToAD(year, month, day) {
    return utilBsToAD(`${year}-${month}-${day}`);
}


// NepaliDatePicker
// valueBS  — BS string "YYYY-MM-DD"
// onChange — callback with both (adDate, bsDate)
// maxToday — if true, disables future BS dates
// hideAD   — if true, hides the AD preview text
const NepaliDatePicker = ({ valueBS, onChange, required, maxToday = false, hideAD = false }) => {
    const today      = new NepaliDate(new Date());
    const todayYear  = today.getYear();
    const todayMonth = today.getMonth() + 1;
    const todayDay   = today.getDate();

    const [year,  setYear]  = useState('');
    const [month, setMonth] = useState('');
    const [day,   setDay]   = useState('');

    useEffect(() => {
        if (valueBS) {
            const [y, m, d] = valueBS.split('-').map(v => v.replace(/^0+/, ''));
            setYear(y || '');
            setMonth(m || '');
            setDay(d || '');
        }
    }, [valueBS]);

    const numYear  = parseInt(year);
    const numMonth = parseInt(month);
    const numDay   = parseInt(day);

    const maxDayInMonth = (numYear && numMonth) ? getDays(numYear, numMonth) : 32;

    // For maxToday: cap year list, month list, day list
    const yearEnd  = maxToday ? todayYear  : BS_END;
    const monthEnd = (maxToday && numYear === todayYear) ? todayMonth : 12;
    const dayEnd   = (maxToday && numYear === todayYear && numMonth === todayMonth) ? todayDay : maxDayInMonth;

    const emit = (y, m, d) => {
        const ny = parseInt(y), nm = parseInt(m), nd = parseInt(d);
        if (ny >= BS_START && ny <= BS_END && nm >= 1 && nm <= 12 && nd >= 1 && nd <= 32) {
            const bsStr = `${ny}-${String(nm).padStart(2,'0')}-${String(nd).padStart(2,'0')}`;
            const adStr = bsToAD(ny, nm, nd);
            onChange(adStr, bsStr);
        }
    };

    const handleYear = (v) => {
        setYear(v);
        if (v.length === 4) emit(v, month, day);
    };

    const handleMonth = (v) => {
        setMonth(v);
        emit(year, v, day);
    };

    const handleDay = (v) => {
        setDay(v);
        emit(year, month, v);
    };

    const cls = "bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all";
    const selCls = cls + " appearance-none";

    const adPreview = (numYear && numMonth && numDay && numDay <= maxDayInMonth) ? bsToAD(numYear, numMonth, numDay) : '';

    return (
        <div className="space-y-1">
            <div className="flex gap-2">
                {/* Year — typeable input */}
                <input
                    type="number"
                    value={year}
                    onChange={e => handleYear(e.target.value)}
                    min={BS_START} max={yearEnd}
                    placeholder="YYYY"
                    className={cls + " w-24"}
                    required={required}
                />

                {/* Month — select */}
                <select value={month} onChange={e => handleMonth(e.target.value)} className={selCls + " flex-1"}>
                    <option value="">Month</option>
                    {Array.from({ length: monthEnd }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{BS_MONTHS[m - 1]}</option>
                    ))}
                </select>

                {/* Day — typeable input */}
                <input
                    type="number"
                    value={day}
                    onChange={e => handleDay(e.target.value)}
                    min={1} max={dayEnd}
                    placeholder="DD"
                    className={cls + " w-20"}
                    required={required}
                />
            </div>

            {!hideAD && adPreview && numDay >= 1 && numDay <= maxDayInMonth && (
                <p className="text-[11px] text-slate-500 pl-1 tracking-tight">AD Equivalent: {adPreview}</p>
            )}
        </div>
    );
};

export default NepaliDatePicker;
