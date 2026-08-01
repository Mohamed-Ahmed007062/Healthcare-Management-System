import React from 'react';
import { Toaster as SonnerToaster } from 'sonner';

/**
 * Global toast notification system wrapper.
 * Integrates sonner to match our premium aesthetic.
 */
export const Toaster: React.FC = () => {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        className: 'font-sans rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-lg',
        style: {
          fontFamily: "var(--font-sans)",
        },
      }}
      closeButton
      richColors
    />
  );
};

export default Toaster;
