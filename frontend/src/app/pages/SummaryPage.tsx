import { useNavigate } from "react-router";
import type { ReactNode } from "react";
import {
  Trophy,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  Star,
} from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { useApp } from "../context/AppContext";

function formatTime(seconds: number): string {
  if (seconds === 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Demo session data for summary display
const DEMO_SESSION = {
  goodPostureTime: 2520, // 42m
  leaningTime: 540,     // 9m
  severeTime: 120,      // 2m
  totalTime: 3180,      // 53m
  alerts: 4,
  score: 82,
};

const exercises = [
  {
    id: 1,
    name: "Neck Stretch",
    duration: "30 sec each side",
    emoji: "🧘",
    description: "Tilt your head slowly side to side, ear towards shoulder.",
    color: "bg-blue-50 border-blue-100",
    textColor: "text-blue-600",
  },
  {
    id: 2,
    name: "Shoulder Rolls",
    duration: "10 reps",
    emoji: "🔄",
    description: "Roll shoulders backwards in large circles to release tension.",
    color: "bg-emerald-50 border-emerald-100",
    textColor: "text-emerald-600",
  },
  {
    id: 3,
    name: "Back Extension",
    duration: "3 × 10 sec",
    emoji: "🏃",
    description: "Hands on lower back, gently arch backwards to open the chest.",
    color: "bg-purple-50 border-purple-100",
    textColor: "text-purple-600",
  },
  {
    id: 4,
    name: "Wrist Stretch",
    duration: "20 sec each",
    emoji: "🙏",
    description: "Extend arm, pull fingers back gently with opposite hand.",
    color: "bg-amber-50 border-amber-100",
    textColor: "text-amber-600",
  },
];

function getFeedbackMessage(score: number): string {
  if (score >= 90) return "Outstanding! You maintained near-perfect posture the entire session. Keep it up!";
  if (score >= 75) return "Great job staying upright for most of your session! A few slouching moments — keep improving!";
  if (score >= 60) return "Good effort! Try to be more mindful of your posture, especially after the 30-minute mark.";
  return "Your posture needs some work. Try shorter sessions and take more breaks to build the habit.";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Great";
  if (score >= 60) return "Good";
  return "Needs Work";
}

function getScoreColor(score: number): { text: string; bg: string; ring: string } {
  if (score >= 90) return { text: "text-emerald-600", bg: "from-emerald-400 to-teal-500", ring: "#10B981" };
  if (score >= 75) return { text: "text-blue-600", bg: "from-blue-400 to-blue-500", ring: "#3B82F6" };
  if (score >= 60) return { text: "text-amber-600", bg: "from-amber-400 to-amber-500", ring: "#F59E0B" };
  return { text: "text-red-600", bg: "from-red-400 to-red-500", ring: "#EF4444" };
}

export default function SummaryPage() {
  const navigate = useNavigate();
  const { sessionData, sessionStatus } = useApp();

  // Use real session data if session was ended, else demo data
  const data =
    sessionStatus === "ended" && sessionData.totalTime > 0
      ? {
          ...sessionData,
          score: Math.round(
            (sessionData.goodPostureTime / Math.max(sessionData.totalTime, 1)) * 100
          ),
        }
      : DEMO_SESSION;

  const goodPercent = data.totalTime > 0 ? Math.round((data.goodPostureTime / data.totalTime) * 100) : 79;
  const leanPercent = data.totalTime > 0 ? Math.round((data.leaningTime / data.totalTime) * 100) : 17;
  const severePercent = data.totalTime > 0 ? Math.round((data.severeTime / data.totalTime) * 100) : 4;
  const score = data.score || 82;

  const sc = getScoreColor(score);

  const radialData = [{ value: score, fill: sc.ring }];

  return (
    <div
      className="min-h-full bg-slate-50 p-4 lg:p-7 pb-28 lg:pb-7"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Session Summary</h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={() => navigate("/session")}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-200 transition-all"
        >
          <RefreshCw size={14} /> New Session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score & Main Stats */}
        <div className="lg:col-span-1 space-y-4">
          {/* Score Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center">
            <div className="relative w-44 h-44 mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="70%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={90 - 360 * (score / 100)}
                  data={radialData}
                >
                  <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "#F1F5F9" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-slate-800">{score}</span>
                <span className="text-xs text-slate-400">out of 100</span>
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-semibold mb-2 bg-gradient-to-r ${sc.bg} text-white shadow`}
            >
              {getScoreLabel(score)}
            </div>
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={14}
                  className={i <= Math.round(score / 20) ? "text-amber-400 fill-amber-400" : "text-slate-200"}
                />
              ))}
            </div>
            <p className="text-center text-sm text-slate-600 leading-relaxed">
              {getFeedbackMessage(score)}
            </p>
          </div>

          {/* Session Duration */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-slate-700">Session Details</h3>
            </div>
            <div className="space-y-2.5">
              <DetailRow
                label="Total Duration"
                value={formatTime(data.totalTime)}
                icon="⏱️"
              />
              <DetailRow
                label="Posture Alerts"
                value={`${data.alerts} alerts`}
                icon="🔔"
              />
              <DetailRow
                label="Best Streak"
                value="24 min"
                icon="🔥"
              />
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Posture Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-blue-500" />
              Posture Breakdown
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <PostureCard
                label="Good Posture"
                value={formatTime(data.goodPostureTime)}
                percent={goodPercent}
                color="emerald"
                icon={<CheckCircle size={16} className="text-emerald-500" />}
              />
              <PostureCard
                label="Leaning"
                value={formatTime(data.leaningTime)}
                percent={leanPercent}
                color="amber"
                icon={<AlertTriangle size={16} className="text-amber-500" />}
              />
              <PostureCard
                label="Severe Slouch"
                value={formatTime(data.severeTime)}
                percent={severePercent}
                color="red"
                icon={<AlertTriangle size={16} className="text-red-500" />}
              />
            </div>

            {/* Visual bar breakdown */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-slate-500">Posture Distribution</p>
                <p className="text-xs text-slate-400">{formatTime(data.totalTime)} total</p>
              </div>
              <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                <div
                  className="bg-emerald-400 transition-all"
                  style={{ width: `${goodPercent}%` }}
                  title={`Good: ${goodPercent}%`}
                />
                <div
                  className="bg-amber-400 transition-all"
                  style={{ width: `${leanPercent}%` }}
                  title={`Leaning: ${leanPercent}%`}
                />
                <div
                  className="bg-red-400 transition-all"
                  style={{ width: `${severePercent}%` }}
                  title={`Severe: ${severePercent}%`}
                />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <LegendItem color="bg-emerald-400" label={`Good (${goodPercent}%)`} />
                <LegendItem color="bg-amber-400" label={`Leaning (${leanPercent}%)`} />
                <LegendItem color="bg-red-400" label={`Severe (${severePercent}%)`} />
              </div>
            </div>
          </div>

          {/* Recommended Exercises */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                🏃 Recommended Stretches
              </h3>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                4 exercises
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {exercises.map((ex) => (
                <div
                  key={ex.id}
                  className={`rounded-xl border p-3.5 ${ex.color}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">{ex.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={`text-sm font-semibold ${ex.textColor}`}>
                          {ex.name}
                        </p>
                        <span className="text-xs text-slate-400 flex-shrink-0 bg-white/60 px-2 py-0.5 rounded-full">
                          {ex.duration}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {ex.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/session")}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3.5 rounded-xl font-semibold text-sm shadow-md shadow-blue-200 transition-all"
            >
              <RefreshCw size={15} /> Start New Session
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 py-3.5 rounded-xl font-semibold text-sm transition-all"
            >
              View Dashboard <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function PostureCard({
  label,
  value,
  percent,
  color,
  icon,
}: {
  label: string;
  value: string;
  percent: number;
  color: "emerald" | "amber" | "red";
  icon: ReactNode;
}) {
  const colorMap = {
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", bar: "bg-emerald-400", text: "text-emerald-600" },
    amber: { bg: "bg-amber-50", border: "border-amber-100", bar: "bg-amber-400", text: "text-amber-600" },
    red: { bg: "bg-red-50", border: "border-red-100", bar: "bg-red-400", text: "text-red-600" },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-xl border p-3 ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold ${c.text} mb-1`}>{value}</p>
      <div className="flex items-center gap-1">
        <div className="flex-1 bg-white/60 rounded-full h-1">
          <div
            className={`h-1 rounded-full ${c.bar}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs text-slate-400">{percent}%</span>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}