import { useState, useId } from "react";
import { useNavigate } from "react-router";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Zap,
  ChevronRight,
  Calendar,
  Activity,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useApp } from "../context/AppContext";

const postureLineData = [
  { time: "9:00", score: 92 },
  { time: "9:15", score: 88 },
  { time: "9:30", score: 75 },
  { time: "9:45", score: 68 },
  { time: "10:00", score: 42 },
  { time: "10:15", score: 78 },
  { time: "10:30", score: 85 },
  { time: "10:45", score: 91 },
  { time: "11:00", score: 80 },
  { time: "11:15", score: 85 },
  { time: "11:30", score: 62 },
  { time: "11:45", score: 90 },
];

const recentAlerts = [
  {
    id: 1,
    type: "severe",
    message: "Severe slouching detected",
    time: "11:34 AM",
    icon: AlertTriangle,
  },
  {
    id: 2,
    type: "warning",
    message: "Leaning forward for 5+ minutes",
    time: "11:12 AM",
    icon: TrendingUp,
  },
  {
    id: 3,
    type: "success",
    message: "30-min good posture streak!",
    time: "10:48 AM",
    icon: CheckCircle,
  },
  {
    id: 4,
    type: "severe",
    message: "Severe slouching detected",
    time: "10:02 AM",
    icon: AlertTriangle,
  },
  {
    id: 5,
    type: "info",
    message: "Session started",
    time: "9:00 AM",
    icon: Activity,
  },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function CircularProgress({ percentage }: { percentage: number }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = (percentage / 100) * circumference;
  const gradientId = useId();

  return (
    <div className="relative flex items-center justify-center w-44 h-44">
      <svg width="176" height="176" className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop key="stop1" offset="0%" stopColor="#10B981" />
            <stop key="stop2" offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
        <circle
          cx="88"
          cy="88"
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="12"
        />
        <circle
          cx="88"
          cy="88"
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-slate-800">{percentage}%</span>
        <span className="text-xs text-slate-500 font-medium mt-0.5">Good Posture</span>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const score = payload[0].value;
    const color =
      score >= 75 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444";
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold" style={{ color }}>
          Score: {score}
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, dayStats, sessionStatus } = useApp();
  const [activeTab, setActiveTab] = useState<"today" | "week">("today");
  const areaGradientId = useId();

  const goodPercent = Math.round(
    (dayStats.goodPostureTime / dayStats.totalTime) * 100
  );
  const leanPercent = Math.round(
    (dayStats.leaningTime / dayStats.totalTime) * 100
  );
  const severePercent = Math.round(
    (dayStats.severeTime / dayStats.totalTime) * 100
  );

  const getHour = () => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  };

  return (
    <div
      className="min-h-full bg-slate-50 p-4 lg:p-7 pb-24 lg:pb-7"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-slate-500 mb-0.5">Good {getHour()}!</p>
          <h1 className="text-2xl font-bold text-slate-800">
            {user.name.split(" ")[0]} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              sessionStatus === "active"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                sessionStatus === "active"
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-slate-400"
              }`}
            />
            {sessionStatus === "active" ? "Session Active" : "No Session"}
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
            <Calendar size={12} />
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Good Posture"
          value={formatTime(dayStats.goodPostureTime)}
          color="emerald"
          icon="🟢"
          percent={goodPercent}
        />
        <StatCard
          label="Leaning"
          value={formatTime(dayStats.leaningTime)}
          color="amber"
          icon="🟡"
          percent={leanPercent}
        />
        <StatCard
          label="Severe Slouch"
          value={formatTime(dayStats.severeTime)}
          color="red"
          icon="🔴"
          percent={severePercent}
        />
        <StatCard
          label="Total Session"
          value={formatTime(dayStats.totalTime)}
          color="blue"
          icon="⏱️"
          percent={100}
          showPercent={false}
        />
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Circular Progress */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-4">
            <h3 className="text-sm font-semibold text-slate-700">
              Today's Score
            </h3>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
              Great
            </span>
          </div>
          <CircularProgress percentage={goodPercent} />
          <div className="w-full mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                Good Posture
              </span>
              <span className="font-semibold text-slate-700">{goodPercent}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                Leaning
              </span>
              <span className="font-semibold text-slate-700">{leanPercent}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                Severe
              </span>
              <span className="font-semibold text-slate-700">{severePercent}%</span>
            </div>
          </div>
        </div>

        {/* Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">
              Posture Quality Over Time
            </h3>
            <div className="flex gap-1.5">
              {(["today", "week"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeTab === t
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={postureLineData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop key="stop1" offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop key="stop2" offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#3B82F6"
                strokeWidth={2.5}
                fill={`url(#${areaGradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: "#3B82F6", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-8 h-0.5 bg-blue-400 rounded" />
              Posture Score
            </div>
            <div className="text-xs text-slate-400">
              Avg:{" "}
              <span className="text-slate-600 font-semibold">79.8</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts + CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Alerts */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-700">
                Recent Alerts
              </h3>
              <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                {dayStats.alerts} today
              </span>
            </div>
            <button className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {recentAlerts.map((alert) => {
              const Icon = alert.icon;
              const colors = {
                severe: {
                  bg: "bg-red-50",
                  text: "text-red-500",
                  border: "border-red-100",
                },
                warning: {
                  bg: "bg-amber-50",
                  text: "text-amber-500",
                  border: "border-amber-100",
                },
                success: {
                  bg: "bg-emerald-50",
                  text: "text-emerald-500",
                  border: "border-emerald-100",
                },
                info: {
                  bg: "bg-blue-50",
                  text: "text-blue-400",
                  border: "border-blue-100",
                },
              };
              const c = colors[alert.type as keyof typeof colors];
              return (
                <div
                  key={alert.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${c.bg} ${c.border}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon size={14} className={c.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 font-medium truncate">
                      {alert.message}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {alert.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-200">
            <Zap size={20} className="mb-3 text-blue-200" />
            <h3 className="font-semibold mb-1">Start a Session</h3>
            <p className="text-xs text-blue-200 mb-4">
              Begin tracking your posture in real-time.
            </p>
            <button
              onClick={() => navigate("/session")}
              className="w-full bg-white text-blue-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
            >
              Start Now <ChevronRight size={14} />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-700">
                Weekly Streak
              </h3>
            </div>
            <div className="flex items-end gap-1 mb-2">
              {[65, 78, 82, 71, 88, 91, goodPercent].map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm ${
                      i === 6
                        ? "bg-blue-500"
                        : v >= 75
                        ? "bg-emerald-300"
                        : "bg-amber-300"
                    }`}
                    style={{ height: `${(v / 100) * 48}px` }}
                  />
                  <span className="text-xs text-slate-400">
                    {["M", "T", "W", "T", "F", "S", "T"][i]}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              🔥 <span className="font-semibold text-slate-700">5-day</span>{" "}
              streak!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
  percent,
  showPercent = true,
}: {
  label: string;
  value: string;
  color: "emerald" | "amber" | "red" | "blue";
  icon: string;
  percent: number;
  showPercent?: boolean;
}) {
  const colorMap = {
    emerald: {
      text: "text-emerald-600",
      bar: "bg-emerald-400",
    },
    amber: {
      text: "text-amber-600",
      bar: "bg-amber-400",
    },
    red: {
      text: "text-red-600",
      bar: "bg-red-400",
    },
    blue: {
      text: "text-blue-600",
      bar: "bg-blue-400",
    },
  };
  const c = colorMap[color];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg">{icon}</span>
        {showPercent && (
          <span className={`text-xs font-semibold ${c.text}`}>{percent}%</span>
        )}
      </div>
      <p className="text-xl font-bold text-slate-800 mb-0.5">{value}</p>
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      {showPercent && (
        <div className="w-full bg-slate-100 rounded-full h-1">
          <div
            className={`h-1 rounded-full ${c.bar} transition-all duration-700`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
