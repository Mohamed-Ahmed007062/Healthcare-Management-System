import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';

export const AppShell: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
      {/* Top Header */}
      <Topbar />

      {/* Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppShell;
