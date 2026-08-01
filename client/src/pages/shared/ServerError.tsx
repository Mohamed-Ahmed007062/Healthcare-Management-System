import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/button';

export const ServerError: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
        <h1 className="text-8xl font-black font-heading text-danger-500 animate-pulse">
          500
        </h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
            Server Error
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Oops! Something went wrong on our end. Please try again later or contact our support team.
          </p>
        </div>
        <div className="pt-2">
          <Link to="/">
            <Button variant="outline" className="w-full">
              Back to Safety
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServerError;
