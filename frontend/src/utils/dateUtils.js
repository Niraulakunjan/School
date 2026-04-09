import NepaliDate from 'nepali-date-converter';

export const BS_MONTHS = [
    'Baisakh', 'Jestha', 'Ashadh', 'Shrawan',
    'Bhadra', 'Ashwin', 'Kartik', 'Mangsir',
    'Poush', 'Magh', 'Falgun', 'Chaitra'
];

export function adToBS(adStr) {
    if (!adStr) return '';
    try {
        const [y, m, d] = adStr.split('-').map(Number);
        const nd = new NepaliDate(new Date(y, m - 1, d));
        return `${nd.getYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
    } catch { return ''; }
}

export function bsToAD(bsStr) {
    if (!bsStr) return '';
    try {
        const parts = bsStr.split('-').map(Number);
        if (parts.length !== 3) return '';
        const [y, m, d] = parts;
        const nd = new NepaliDate(y, m - 1, d);
        const ad = nd.toJsDate();
        return `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}`;
    } catch { return ''; }
}
