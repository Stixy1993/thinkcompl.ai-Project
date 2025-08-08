"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { HiHome, HiFolderOpen, HiChartBar, HiDocumentText, HiPhotograph, HiPencilAlt, HiClipboardList, HiClipboardCheck, HiCheckCircle, HiTruck, HiClipboardCopy, HiOfficeBuilding, HiBadgeCheck, HiChevronLeft, HiChevronRight, HiUserGroup, HiLogout } from "react-icons/hi";
import { FaCog } from "react-icons/fa";
import { HiOutlineSearch } from "react-icons/hi";
import { useState, useRef, useEffect } from "react";
import LightbulbCheckAnimated from "@/components/LightbulbCheckAnimated";
import { useAuth } from "@/lib/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import { logoutUser } from "@/lib/firebase/firebaseUtils";
import ChatWidget from "@/components/ChatWidget";

const navItems = [
  { label: "Dashboard", icon: HiHome, href: "/dashboard" },
  { label: "Projects", icon: HiFolderOpen, href: "/dashboard/projects" },
  { label: "Trackers", icon: HiChartBar, href: "/dashboard/trackers" },
  { label: "Documents", icon: HiDocumentText, href: "/dashboard/documents" },
  { label: "Markups", icon: HiPencilAlt, href: "/dashboard/markups" },
  { label: "Inspection Test Plans", icon: HiClipboardList, href: "/dashboard/inspection-test-plans" },
  { label: "Inspection Test Reports", icon: HiClipboardCheck, href: "/dashboard/inspection-test-reports" },
  { label: "Punch Lists", icon: HiCheckCircle, href: "/dashboard/punch-lists" },
  { label: "Procurement Tracker", icon: HiTruck, href: "/dashboard/procurement-tracker" },
  { label: "Delivery Acknowledgements", icon: HiClipboardCopy, href: "/dashboard/delivery-acknowledgements" },
  { label: "Factory Acceptance Tests", icon: HiOfficeBuilding, href: "/dashboard/factory-acceptance-tests" },
  { label: "Calibration & Licenses", icon: HiBadgeCheck, href: "/dashboard/calibration-licenses" },
  { label: "Team Members", icon: HiUserGroup, href: "/dashboard/team-members" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    if (inputRef.current) {
      inputRef.current.focus();
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen bg-blue-400 overflow-hidden">
      {/* Sidebar - Fixed */}
      <aside
        className={`fixed left-0 top-0 bottom-0 flex flex-col pt-6 pb-0 px-2 shadow-lg bg-white border-r border-gray-200 transition-all duration-200 z-30 ${collapsed ? "w-14" : "w-48 px-4"}`}
      >
        {/* Compl.ai Logo at the top of the sidebar, positioned against the left border */}
        <div className="flex items-center h-10 -mt-4 mb-4 transition-all duration-200">
          <div className={`flex items-center gap-2 ${collapsed ? "justify-center w-full" : ""}`}>
            <Image
              src="/Compl.ai Logo Black.svg"
              alt="Compl.ai Logo Black"
              width={36}
              height={36}
              priority
              className="flex-shrink-0"
            />
            {!collapsed && (
              <span className="text-lg font-bold text-gray-800">Menu</span>
            )}
          </div>
        </div>
        
        {/* Navigation items - take up available space */}
        <nav className="flex-1 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === "Dashboard" 
              ? pathname === "/dashboard" 
              : pathname.startsWith(item.href || "");
            return (
              <div key={item.label} className="relative group">
                {item.href ? (
                  <Link href={item.href} legacyBehavior>
                    <a className={`w-full flex items-center px-2 py-2 rounded-lg text-left text-gray-700 hover:bg-blue-200 transition ${isActive ? "bg-blue-200 font-semibold text-blue-700" : ""} ${collapsed ? "justify-center" : ""}`}>
                      <div className="flex items-center w-full">
                        <div className={`flex items-center justify-center flex-shrink-0 ${collapsed ? "w-full" : "w-8"}`}>
                          <Icon className={`w-8 h-8 ${isActive ? "text-blue-700" : "text-blue-500"}`} />
                        </div>
                        {!collapsed && <span className="text-sm ml-2">{item.label}</span>}
                      </div>
                    </a>
                  </Link>
                ) : (
                  <button
                    className={`w-full flex items-center px-2 py-2 rounded-lg text-left text-gray-700 hover:bg-blue-200 transition ${isActive ? "bg-blue-200 font-semibold text-blue-700" : ""} ${collapsed ? "justify-center" : ""}`}
                    disabled={item.label !== "Dashboard"}
                  >
                    <div className="flex items-center w-full">
                      <div className={`flex items-center justify-center flex-shrink-0 ${collapsed ? "w-full" : "w-8"}`}>
                        <Icon className={`w-8 h-8 ${isActive ? "text-blue-700" : "text-blue-500"}`} />
                      </div>
                      {!collapsed && <span className="text-sm ml-2">{item.label}</span>}
                    </div>
                  </button>
                )}
                {collapsed && (
                  <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1 rounded bg-gray-800/80 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 transition-opacity duration-200">
                    {item.label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
        
        {/* Collapse toggle - always at bottom */}
        <div className="flex-shrink-0 pt-2 pb-2 mt-auto border-t border-gray-200 relative group">
          <button
            className="w-full flex items-center justify-center bg-blue-200 hover:bg-blue-300 text-blue-700 rounded-lg p-2 shadow transition"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            suppressHydrationWarning
          >
            {collapsed ? <HiChevronRight className="text-2xl" /> : <HiChevronLeft className="text-2xl" />}
          </button>
          {/* Tooltip for collapse button */}
          <span className="absolute left-full top-0 -translate-y-1/2 ml-2 px-3 py-1 rounded bg-gray-800/80 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 transition-opacity duration-200 shadow-lg">
            {collapsed ? "Expand menu" : "Collapse menu"}
          </span>
        </div>
      </aside>

      {/* Main content area - with margin to account for fixed sidebar */}
      <div className={`flex-1 flex flex-col ${collapsed ? "ml-14" : "ml-48"} transition-all duration-200`}>
        {/* Header - Fixed */}
        <header className="fixed top-0 right-0 left-0 flex items-center justify-between px-4 py-2 bg-blue-500 shadow-md z-20" style={{ left: collapsed ? '3.5rem' : '12rem', right: '14px' }}>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-white">thinkcompl<span className="text-blue-200">.ai</span></span>
          </div>
          <div className="flex items-center gap-2">
            {/* Stylish Search Icon and Animated Search Box */}
            <div className="relative flex items-center group" ref={searchRef}>
              <button
                className={`flex items-center justify-center text-white text-2xl transition-all duration-200 rounded-full hover:bg-blue-400 hover:shadow-lg focus:outline-none ${searchOpen ? 'bg-blue-400 shadow-lg' : ''}`}
                style={{ width: 40, height: 40 }}
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Open search"
                suppressHydrationWarning
              >
                <HiOutlineSearch />
              </button>
              {/* Tooltip for Search */}
              <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 px-3 py-1 rounded bg-gray-800/80 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 transition-opacity duration-200 shadow-lg">Search</span>
              <div
                className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center transition-all duration-300 ${searchOpen ? 'w-64 opacity-100 ml-2' : 'w-0 opacity-0 ml-0'} overflow-hidden`}
                style={{ zIndex: 20 }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-5 py-2 bg-white text-gray-900 border-none shadow-lg rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 text-base transition-all duration-300"
                  style={{ minWidth: searchOpen ? 200 : 0 }}
                />
              </div>
            </div>
            <div className="relative group">
              <button
                className={
                  `flex items-center justify-center text-white text-xl transition-all duration-200 rounded-full hover:bg-blue-400 hover:shadow-lg focus:outline-none`
                }
                style={{ width: 40, height: 40 }}
                aria-label="Settings"
                suppressHydrationWarning
              >
                <FaCog />
              </button>
              {/* Tooltip for Settings */}
              <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 px-3 py-1 rounded bg-gray-800/80 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 transition-opacity duration-200 shadow-lg">Settings</span>
            </div>
            {user && user.photoURL ? (
              <div 
                className="relative group flex items-center gap-2 px-2 py-1 rounded-full transition-all duration-200 hover:bg-blue-400/80 hover:shadow-lg cursor-pointer" 
                ref={profileRef}
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <Image
                  src={user.photoURL}
                  alt="Profile"
                  width={36}
                  height={36}
                  className="rounded-full border-2 border-blue-200"
                />
                {/* Tooltip for Profile */}
                <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 px-3 py-1 rounded bg-gray-800/80 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 transition-opacity duration-200 shadow-lg">Profile</span>
                <span className="text-white font-medium">{user.displayName}</span>
                
                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
                    <Link href="/dashboard/profile" className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 rounded-t-lg transition-colors">
                      <div className="flex items-center gap-2">
                        <HiUserGroup className="w-4 h-4" />
                        Profile Details
                      </div>
                    </Link>
                    <div className="border-t border-gray-100"></div>
                    <button 
                      className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-lg transition-colors"
                      onClick={() => {
                        logoutUser();
                        router.push('/signin');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <HiLogout className="w-4 h-4" />
                        Logout
                      </div>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-white font-medium">Not signed in</span>
            )}
          </div>
        </header>

        {/* Main content area - Scrollable */}
        <div className="flex-1 overflow-y-scroll pt-16 custom-scrollbar">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </div>
      </div>
      
      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
} 