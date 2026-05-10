import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  Play,
  BarChart3,
  User,
  Wifi,
  WifiOff,
  Menu,
  X,
  Activity,
  LogOut,
} from "lucide-react";
import { useApp } from "../../context/AppContext";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/session", label: "Work Session", icon: Play },
  { path: "/summary", label: "Summary", icon: BarChart3 },
  { path: "/profile", label: "Profile", icon: User },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useApp();
  const [deviceConnected] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate("/");
  };

  const NavLink = ({
    item,
    mobile = false,
  }: {
    item: (typeof navItems)[0];
    mobile?: boolean;
  }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    if (mobile) {
      return (
        <button
          onClick={() => {
            navigate(item.path);
            setSidebarOpen(false);
          }}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
            isActive
              ? "text-blue-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
          <span className="text-xs">{item.label}</span>
        </button>
      );
    }

    return (
      <button
        onClick={() => {
          navigate(item.path);
          setSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
          isActive
            ? "bg-blue-50 text-blue-600"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        }`}
      >
        <Icon
          size={18}
          strokeWidth={isActive ? 2.5 : 2}
          className={isActive ? "text-blue-600" : ""}
        />
        <span className={`text-sm ${isActive ? "font-semibold" : ""}`}>
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-slate-100 shadow-sm flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
            <Activity size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-slate-800 tracking-tight">
            Postura
          </span>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
              {user.initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        {/* Device Status */}
        <div className="px-4 py-4 border-t border-slate-100">
          <div
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${
              deviceConnected ? "bg-emerald-50" : "bg-red-50"
            }`}
          >
            {deviceConnected ? (
              <Wifi size={15} className="text-emerald-500 flex-shrink-0" />
            ) : (
              <WifiOff size={15} className="text-red-400 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p
                className={`text-xs font-semibold ${
                  deviceConnected ? "text-emerald-700" : "text-red-600"
                }`}
              >
                ESP32 Sensor
              </p>
              <p
                className={`text-xs ${
                  deviceConnected ? "text-emerald-500" : "text-red-400"
                }`}
              >
                {deviceConnected ? "Connected" : "Disconnected"}
              </p>
            </div>
            <div
              className={`w-2 h-2 rounded-full ml-auto flex-shrink-0 ${
                deviceConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
              }`}
            />
          </div>
          <button
            onClick={handleSignOut}
            className="w-full mt-3 flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all text-left"
          >
            <LogOut size={15} />
            <span className="text-xs">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
              <Activity size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-base font-bold text-slate-800 tracking-tight">
              Postura
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-50"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute top-0 left-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 mt-14">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
                {user.initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => (
                <NavLink key={item.path} item={item} />
              ))}
            </nav>
            <div className="px-4 py-4 border-t border-slate-100">
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-emerald-50">
                <Wifi size={15} className="text-emerald-500" />
                <div>
                  <p className="text-xs font-semibold text-emerald-700">ESP32 Sensor</p>
                  <p className="text-xs text-emerald-500">Connected</p>
                </div>
                <div className="w-2 h-2 rounded-full ml-auto bg-emerald-400 animate-pulse" />
              </div>
              <button
                onClick={handleSignOut}
                className="w-full mt-3 flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
              >
                <LogOut size={15} />
                <span className="text-xs">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto lg:pt-0 pt-14">
          <Outlet />
        </div>

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-lg z-30">
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map((item) => (
              <NavLink key={item.path} item={item} mobile />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
