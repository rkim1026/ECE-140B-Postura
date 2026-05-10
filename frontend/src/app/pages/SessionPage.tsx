import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Play,
  Pause,
  Square,
  Bell,
  Clock,
  AlertCircle,
  CheckCircle2,
  Dumbbell,
  Vibrate,
  ChevronRight,
  Target,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import type { PostureState } from "../context/AppContext";

const DURATION_OPTIONS = [15, 30, 45, 60] as const;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const postureSequence: PostureState[] = [
  "good", "good", "good", "leaning", "good", "good", "severe",
  "good", "good", "good", "leaning", "leaning", "good", "good",
];

export default function SessionPage() {
  const navigate = useNavigate();
  const {
    sessionStatus,
    sessionData,
    sessionSettings,
    currentPosture,
    isCalibrated,
    baselineDistance,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    updateSessionSettings,
    updateSessionData,
    updateCurrentPosture,
    calibratePosture,
  } = useApp();

  const [selectedMinutes, setSelectedMinutes] = useState<number>(30);
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60);
  const [elapsed, setElapsed] = useState(0);
  const [showCalibrationSuccess, setShowCalibrationSuccess] = useState(false);

  const postureIndexRef = useRef(0);
  const tickRef = useRef(0);
  const elapsedRef = useRef(0);
  const goodRef = useRef(0);
  const leanRef = useRef(0);
  const severeRef = useRef(0);
  const alertsRef = useRef(0);
  const currentPostureRef = useRef<PostureState>("good");

  // Keep currentPostureRef in sync with context
  useEffect(() => {
    currentPostureRef.current = currentPosture;
  }, [currentPosture]);

  const totalDuration = (useCustom ? parseInt(customMinutes) || 30 : selectedMinutes) * 60;

  useEffect(() => {
    if (sessionStatus === "active") {
      const interval = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);

        setTimeRemaining((t) => {
          if (t <= 1) {
            endSession();
            return 0;
          }
          return t - 1;
        });

        // Update per-posture counters
        const p = currentPostureRef.current;
        if (p === "good") goodRef.current += 1;
        else if (p === "leaning") leanRef.current += 1;
        else if (p === "severe") {
          severeRef.current += 1;
          if (severeRef.current % 30 === 0) alertsRef.current += 1;
        }

        // Simulate posture changes every 8 seconds
        tickRef.current += 1;
        if (tickRef.current % 8 === 0) {
          const newPosture =
            postureSequence[postureIndexRef.current % postureSequence.length];
          postureIndexRef.current += 1;
          updateCurrentPosture(newPosture);
          if (newPosture === "severe") alertsRef.current += 1;
        }

        updateSessionData({
          goodPostureTime: goodRef.current,
          leaningTime: leanRef.current,
          severeTime: severeRef.current,
          totalTime: elapsedRef.current,
          alerts: alertsRef.current,
          score: Math.round(
            (goodRef.current / Math.max(elapsedRef.current, 1)) * 100
          ),
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sessionStatus]);

  const handleStart = () => {
    const dur =
      (useCustom ? parseInt(customMinutes) || 30 : selectedMinutes) * 60;
    setTimeRemaining(dur);
    setElapsed(0);
    elapsedRef.current = 0;
    goodRef.current = 0;
    leanRef.current = 0;
    severeRef.current = 0;
    alertsRef.current = 0;
    postureIndexRef.current = 0;
    tickRef.current = 0;
    startSession();
  };

  const handleEnd = () => {
    endSession();
    navigate("/summary");
  };

  const handleCalibrate = () => {
    calibratePosture();
    setShowCalibrationSuccess(true);
    setTimeout(() => setShowCalibrationSuccess(false), 4000);
  };

  const progressPercent =
    elapsed > 0 ? Math.min((elapsed / totalDuration) * 100, 100) : 0;

  const postureConfig = {
    good: {
      label: "Good Posture",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      dot: "bg-emerald-400",
      icon: CheckCircle2,
    },
    leaning: {
      label: "Leaning Forward",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      dot: "bg-amber-400",
      icon: AlertCircle,
    },
    severe: {
      label: "Severe Slouching",
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      dot: "bg-red-400",
      icon: AlertCircle,
    },
  };

  const pc = postureConfig[currentPosture];
  const PostureIcon = pc.icon;
  const isRunning = sessionStatus === "active" || sessionStatus === "paused";

  return (
    <div
      className="min-h-full bg-slate-50 p-4 lg:p-7 pb-28 lg:pb-7"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Work Session</h1>
        <p className="text-sm text-slate-500 mt-1">
          Set your session duration and start tracking.
        </p>
      </div>

      {/* Calibration Success Message */}
      {showCalibrationSuccess && (
        <div className="mb-5 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-700">Calibration Successful!</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Baseline posture distance saved: {baselineDistance}cm. You're ready to start tracking.
            </p>
          </div>
        </div>
      )}

      {/* Calibration Card - Show when idle and not calibrated */}
      {sessionStatus === "idle" && !isCalibrated && (
        <div className="mb-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl border border-blue-400 shadow-lg p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Target size={24} className="text-white" />
            </div>
            <div className="flex-1 text-white">
              <h3 className="font-bold text-lg mb-1">Calibrate Your Posture</h3>
              <p className="text-sm text-blue-100">
                Sit in your ideal posture and press the button below to set your baseline. This helps the sensor accurately detect when you slouch.
              </p>
            </div>
          </div>

          {/* Visual Posture Guide */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold text-white mb-3">Posture States Guide:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <PostureGuide
                icon={CheckCircle2}
                label="Good Posture"
                description="Back straight, shoulders back"
                color="emerald"
              />
              <PostureGuide
                icon={TrendingDown}
                label="Leaning"
                description="Slight forward lean detected"
                color="amber"
              />
              <PostureGuide
                icon={AlertCircle}
                label="Severe Slouching"
                description="Poor posture, high deviation"
                color="red"
              />
            </div>
          </div>

          <button
            onClick={handleCalibrate}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-white hover:bg-blue-50 text-blue-600 rounded-xl font-semibold shadow-md transition-all"
          >
            <Target size={16} /> Calibrate Good Posture
          </button>
        </div>
      )}

      {/* Calibration Status - Show when calibrated */}
      {sessionStatus === "idle" && isCalibrated && (
        <div className="mb-5 flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={16} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-700">
              Posture calibrated
            </p>
            <p className="text-xs text-blue-500">
              Baseline: {baselineDistance}cm
            </p>
          </div>
          <button
            onClick={handleCalibrate}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all"
          >
            Recalibrate
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Timer & Controls */}
        <div className="space-y-4">
          {/* Timer Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 flex flex-col items-center">
              {/* Circular Timer */}
              <div className="relative w-52 h-52 mb-5">
                <svg width="208" height="208" className="-rotate-90">
                  <circle
                    cx="104"
                    cy="104"
                    r="90"
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="10"
                  />
                  <circle
                    cx="104"
                    cy="104"
                    r="90"
                    fill="none"
                    stroke={
                      sessionStatus === "active"
                        ? "#3B82F6"
                        : sessionStatus === "paused"
                        ? "#F59E0B"
                        : "#E2E8F0"
                    }
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 90}
                    strokeDashoffset={
                      2 * Math.PI * 90 * (1 - progressPercent / 100)
                    }
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {isRunning ? (
                    <>
                      <span className="text-4xl font-bold text-slate-800 tabular-nums">
                        {formatCountdown(timeRemaining)}
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        remaining
                      </span>
                      <span className="text-xs text-blue-500 font-semibold mt-1">
                        {Math.round(progressPercent)}% done
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock size={28} className="text-slate-300 mb-1" />
                      <span className="text-2xl font-bold text-slate-800">
                        {useCustom
                          ? parseInt(customMinutes) || 30
                          : selectedMinutes}
                        m
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        duration
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Elapsed stats */}
              {isRunning && (
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="text-center">
                    <p className="text-slate-400 text-xs">Elapsed</p>
                    <p className="font-semibold text-slate-700 tabular-nums">
                      {formatElapsed(elapsed)}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-slate-100" />
                  <div className="text-center">
                    <p className="text-slate-400 text-xs">Status</p>
                    <p
                      className={`font-semibold capitalize ${
                        sessionStatus === "active"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {sessionStatus}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-slate-100" />
                  <div className="text-center">
                    <p className="text-slate-400 text-xs">Alerts</p>
                    <p className="font-semibold text-slate-700">
                      {sessionData.alerts}
                    </p>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-3">
                {!isRunning ? (
                  <button
                    onClick={handleStart}
                    className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl font-semibold shadow-md shadow-blue-200 transition-all"
                  >
                    <Play size={16} fill="white" /> Start Session
                  </button>
                ) : (
                  <>
                    {sessionStatus === "active" ? (
                      <button
                        onClick={pauseSession}
                        className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-md shadow-amber-200 transition-all"
                      >
                        <Pause size={16} fill="white" /> Pause
                      </button>
                    ) : (
                      <button
                        onClick={resumeSession}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold shadow-md shadow-blue-200 transition-all"
                      >
                        <Play size={16} fill="white" /> Resume
                      </button>
                    )}
                    <button
                      onClick={handleEnd}
                      className="flex items-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 rounded-xl font-semibold transition-all"
                    >
                      <Square size={15} fill="currentColor" /> End
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {isRunning && (
              <div className="px-6 pb-4">
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-1000"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Live Posture Status */}
          {isRunning && (
            <div className={`rounded-2xl border p-4 ${pc.bg} ${pc.border}`}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${pc.bg} border ${pc.border} flex items-center justify-center`}
                >
                  <PostureIcon size={18} className={pc.color} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">
                    Current Posture
                  </p>
                  <p className={`font-semibold ${pc.color}`}>{pc.label}</p>
                </div>
                <div
                  className={`w-2.5 h-2.5 rounded-full ${pc.dot} animate-pulse`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Settings */}
        <div className="space-y-4">
          {/* Duration Selector */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Clock size={15} className="text-blue-500" />
              Session Duration
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {DURATION_OPTIONS.map((min) => (
                <button
                  key={min}
                  onClick={() => {
                    setSelectedMinutes(min);
                    setUseCustom(false);
                  }}
                  disabled={isRunning}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    !useCustom && selectedMinutes === min
                      ? "bg-blue-500 text-white shadow-md shadow-blue-200"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  } disabled:opacity-50`}
                >
                  {min}m
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUseCustom(!useCustom)}
                disabled={isRunning}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                  useCustom
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-400 hover:text-slate-600"
                } disabled:opacity-50`}
              >
                Custom
              </button>
              {useCustom && (
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="number"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    placeholder="e.g. 90"
                    min={1}
                    max={240}
                    disabled={isRunning}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300/50 disabled:opacity-50"
                  />
                  <span className="text-sm text-slate-500">min</span>
                </div>
              )}
            </div>
          </div>

          {/* Toggle Settings */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Bell size={15} className="text-blue-500" />
              Session Settings
            </h3>
            <div className="space-y-3">
              <ToggleRow
                icon={Vibrate}
                label="Vibration / Buzzer Alerts"
                description="Haptic feedback on bad posture"
                enabled={sessionSettings.buzzerEnabled}
                onChange={(v) => updateSessionSettings({ buzzerEnabled: v })}
              />
              <ToggleRow
                icon={Bell}
                label="End-of-Session Reminder"
                description="Notify when time is up"
                enabled={sessionSettings.endReminderEnabled}
                onChange={(v) =>
                  updateSessionSettings({ endReminderEnabled: v })
                }
              />
              <ToggleRow
                icon={Dumbbell}
                label="Exercise Suggestions"
                description="Show stretches after session"
                enabled={sessionSettings.exerciseSuggestionsEnabled}
                onChange={(v) =>
                  updateSessionSettings({ exerciseSuggestionsEnabled: v })
                }
              />
            </div>
          </div>

          {/* Posture Tips */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
            <h3 className="font-semibold text-sm mb-2">💡 Posture Tips</h3>
            <ul className="space-y-1.5 text-xs text-blue-100">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                Keep your back straight and shoulders back
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                Screen should be at eye level, ~50cm away
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                Feet flat on the floor, knees at 90°
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                Take a 5-min break every 30 minutes
              </li>
            </ul>
          </div>

          {/* Navigate to summary if session ended */}
          {sessionStatus === "ended" && (
            <button
              onClick={() => navigate("/summary")}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl font-semibold text-sm shadow-md shadow-emerald-200 transition-all"
            >
              View Session Summary <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  enabled,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          enabled ? "bg-blue-50" : "bg-slate-50"
        }`}
      >
        <Icon
          size={15}
          className={enabled ? "text-blue-500" : "text-slate-400"}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 font-medium truncate">{label}</p>
        <p className="text-xs text-slate-400 truncate">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
          enabled ? "bg-blue-500" : "bg-slate-200"
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
            enabled ? "left-5" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function PostureGuide({
  icon: Icon,
  label,
  description,
  color,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  color: "emerald" | "amber" | "red";
}) {
  const colorClasses = {
    emerald: {
      bg: "bg-emerald-100/20",
      text: "text-emerald-100",
      icon: "text-emerald-300",
    },
    amber: {
      bg: "bg-amber-100/20",
      text: "text-amber-100",
      icon: "text-amber-300",
    },
    red: {
      bg: "bg-red-100/20",
      text: "text-red-100",
      icon: "text-red-300",
    },
  };

  const classes = colorClasses[color];

  return (
    <div className={`${classes.bg} backdrop-blur-sm rounded-lg p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={classes.icon} />
        <p className="text-xs font-semibold text-white">{label}</p>
      </div>
      <p className={`text-xs ${classes.text}`}>{description}</p>
    </div>
  );
}
