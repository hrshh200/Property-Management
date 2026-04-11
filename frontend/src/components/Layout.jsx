import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-indigo-150">
      <Sidebar />
      <main className="relative flex-1 overflow-auto">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 h-[26rem] w-[26rem] rounded-full bg-blue-400/20 blur-3xl animate-blob" />
          <div className="absolute bottom-0 left-0 h-[24rem] w-[24rem] rounded-full bg-purple-400/20 blur-3xl animate-blob-delay" />
        </div>
        <div className="relative p-6 lg:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
