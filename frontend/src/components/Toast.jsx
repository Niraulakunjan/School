import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const show = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <ToastContext.Provider value={show}>
            {children}
            <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div key={t.id}
                            initial={{ opacity: 0, y: 16, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-semibold min-w-[260px] max-w-sm ${
                                t.type === 'success'
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}
                        >
                            {t.type === 'success'
                                ? <CheckCircle2 size={16} className="shrink-0" />
                                : <XCircle size={16} className="shrink-0" />
                            }
                            <span className="flex-1">{t.message}</span>
                            <button onClick={() => remove(t.id)} className="text-current opacity-50 hover:opacity-100 transition-opacity">
                                <X size={14} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
