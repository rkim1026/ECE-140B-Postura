import { useState } from "react";
import {
  User,
  Wifi,
  WifiOff,
  Bell,
  Target,
  Settings,
  History,
  ChevronRight,
  Check,
  Battery,
  Signal,
  Info,
  Edit3,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const pastSessions = [
  { date: "Today", duration: "2h 54m", score: 82, good: 77 },
  { date: "Yesterday", duration: "1h 45m", score: 75, good: 71 },
  { date: "Mon, Apr 27", duration: "3h 10m", score: 88, good: 85 },
  { date: "Sun, Apr 26", duration: "2h 20m", score: 65, good: 58 },
  { date: "Sat, Apr 25", duration: "1h 05m", score: 91, good: 90 },
];

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85
      ? "bg-emerald-100 text-emerald-700"
      : score >= 70
      ? "bg-blue-100 text-blue-700"
      : score >= 55
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {score}
    </span>
  );
}

export default function ProfilePage() {
  const { user } = useApp();
  const [deviceConnected] = useState(true);
  const [alertFrequency, setAlertFrequency] = useState<"low" | "medium" | "high">("medium");
  const [dailyGoal, setDailyGoal] = useState(75);
  const [showHistory, setShowHistory] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editUniversity, setEditUniversity] = useState(user.university);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setEditingProfile(false);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div
      className="min-h-full bg-slate-50 p-4 lg:p-7 pb-28 lg:pb-7"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Profile & Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account and device preferences.</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
          <Check size={16} /> Settings saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column */}
        <div className="space-y-4">
          {/* User Profile */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User size={15} className="text-blue-500" />
                <h3 className="text-sm font-semibold text-slate-700">Profile</h3>
              </div>
              <button
                onClick={() => setEditingProfile(!editingProfile)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
              >
                <Edit3 size={14} />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
                {user.initials}
              </div>
              {editingProfile ? (
                <div className="flex-1 space-y-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300/50"
                  />
                  <input
                    value={editUniversity}
                    onChange={(e) => setEditUniversity(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300/50"
                  />
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-slate-800">{editName}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{editUniversity}</p>
                </div>
              )}
            </div>

            {editingProfile && (
              <button
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all"
              >
                <Check size={14} /> Save Changes
              </button>
            )}

            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
              <StatMini label="Sessions" value="47" />
              <StatMini label="Avg Score" value="79" />
              <StatMini label="Best Streak" value="8 days" />
            </div>
          </div>

          {/* Device Status */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wifi size={15} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-slate-700">Device Connection</h3>
            </div>
            <div
              className={`flex items-center gap-3 p-4 rounded-xl border ${
                deviceConnected
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  deviceConnected ? "bg-emerald-100" : "bg-red-100"
                }`}
              >
                {deviceConnected ? (
                  <Wifi size={18} className="text-emerald-600" />
                ) : (
                  <WifiOff size={18} className="text-red-500" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`font-semibold text-sm ${
                    deviceConnected ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  ESP32 Postura Sensor
                </p>
                <p
                  className={`text-xs ${
                    deviceConnected ? "text-emerald-500" : "text-red-400"
                  }`}
                >
                  {deviceConnected ? "Connected via Bluetooth" : "Device not found"}
                </p>
              </div>
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  deviceConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                }`}
              />
            </div>

            {deviceConnected && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                <DeviceInfo icon={<Battery size={12} />} label="Battery" value="87%" />
                <DeviceInfo icon={<Signal size={12} />} label="Signal" value="Strong" />
                <DeviceInfo icon={<Info size={12} />} label="Firmware" value="v2.1.4" />
              </div>
            )}

            <button
              className={`w-full mt-3 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                deviceConnected
                  ? "border-slate-200 text-slate-500 hover:bg-slate-50"
                  : "border-blue-200 text-blue-500 bg-blue-50 hover:bg-blue-100"
              }`}
            >
              {deviceConnected ? "Disconnect Device" : "Scan for Device"}
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Alert Frequency */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={15} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-slate-700">Alert Frequency</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setAlertFrequency(freq)}
                  className={`py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                    alertFrequency === freq
                      ? "bg-blue-500 text-white shadow-md shadow-blue-200"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2.5">
              {alertFrequency === "low"
                ? "Alerts every 15 minutes of bad posture."
                : alertFrequency === "medium"
                ? "Alerts every 5 minutes of bad posture."
                : "Immediate alerts on bad posture detection."}
            </p>
          </div>

          {/* Daily Goal */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target size={15} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-slate-700">Daily Posture Goal</h3>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500">Good Posture Target</span>
                  <span className="text-sm font-semibold text-blue-600">{dailyGoal}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-xl">
              <Target size={14} className="text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-600">
                You're aiming for{" "}
                <span className="font-semibold">{dailyGoal}%</span> good posture
                each day.{" "}
                {dailyGoal <= 75 ? "That's a great starting goal!" : "Ambitious — you've got this!"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Past Sessions */}
      <div className="mt-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History size={15} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-700">Past Sessions</h3>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-xs text-blue-500 font-medium hover:text-blue-700"
          >
            {showHistory ? "Hide" : "View all"}
            <ChevronRight size={12} className={`transition-transform ${showHistory ? "rotate-90" : ""}`} />
          </button>
        </div>

        <div className="space-y-2">
          {(showHistory ? pastSessions : pastSessions.slice(0, 3)).map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center flex-shrink-0">
                <History size={14} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">{s.date}</p>
                <p className="text-xs text-slate-400">{s.duration} session · {s.good}% good posture</p>
              </div>
              <ScoreBadge score={s.score} />
              <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-5">
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl font-semibold shadow-md shadow-blue-200 transition-all"
        >
          <Check size={16} /> Save All Settings
        </button>
      </div>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-2 bg-slate-50 rounded-xl">
      <p className="text-base font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function DeviceInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 bg-slate-50 rounded-xl">
      <div className="text-slate-400">{icon}</div>
      <p className="text-xs font-semibold text-slate-700">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
