import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = () => (
  <div className="flex h-screen bg-slate-950 overflow-hidden">
    <Sidebar />
    <div className="flex flex-col flex-1 overflow-hidden">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
        <Outlet />
      </main>
    </div>
  </div>
);

export default DashboardLayout;
