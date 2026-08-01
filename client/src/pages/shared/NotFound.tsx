import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/button';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
        <h1 className="text-8xl font-black font-heading text-brand-600 dark:text-brand-500 animate-pulse">
          404
        </h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
            Page Not Found
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
          </p>
        </div>
        <div className="pt-2">
          <Link to="/dashboard">
            <Button variant="default" className="w-full">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
