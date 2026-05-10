import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

export type PostureState = "good" | "leaning" | "severe";
export type SessionStatus =
  | "idle"
  | "active"
  | "paused"
  | "ended";

export interface User {
  name: string;
  email: string;
  initials: string;
  university: string;
}

export interface SessionData {
  goodPostureTime: number; // seconds
  leaningTime: number;
  severeTime: number;
  totalTime: number;
  alerts: number;
  score: number;
}

export interface SessionSettings {
  buzzerEnabled: boolean;
  endReminderEnabled: boolean;
  exerciseSuggestionsEnabled: boolean;
}

export interface DayStats {
  goodPostureTime: number;
  leaningTime: number;
  severeTime: number;
  totalTime: number;
  alerts: number;
}

interface AppContextType {
  isAuthenticated: boolean;
  user: User;
  sessionStatus: SessionStatus;
  currentPosture: PostureState;
  sessionData: SessionData;
  sessionSettings: SessionSettings;
  dayStats: DayStats;
  isCalibrated: boolean;
  baselineDistance: number | null;
  signIn: (email: string) => void;
  signOut: () => void;
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  updateSessionSettings: (
    settings: Partial<SessionSettings>,
  ) => void;
  updateSessionData: (data: Partial<SessionData>) => void;
  updateCurrentPosture: (posture: PostureState) => void;
  calibratePosture: () => void;
}

const defaultUser: User = {
  name: "Aden Tan",
  email: "adt006@ucsd.edu",
  initials: "AT",
  university: "UCSD",
};

const defaultSessionData: SessionData = {
  goodPostureTime: 0,
  leaningTime: 0,
  severeTime: 0,
  totalTime: 0,
  alerts: 0,
  score: 0,
};

const defaultDayStats: DayStats = {
  goodPostureTime: 8040, // 2h 14m
  leaningTime: 1920, // 32m
  severeTime: 480, // 8m
  totalTime: 10440, // 2h 54m
  alerts: 5,
};

const AppContext = createContext<AppContextType | undefined>(
  undefined,
);

export function AppProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user] = useState<User>(defaultUser);
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("idle");
  const [currentPosture, setCurrentPosture] =
    useState<PostureState>("good");
  const [sessionData, setSessionData] = useState<SessionData>(
    defaultSessionData,
  );
  const [sessionSettings, setSessionSettings] =
    useState<SessionSettings>({
      buzzerEnabled: true,
      endReminderEnabled: true,
      exerciseSuggestionsEnabled: true,
    });
  const [dayStats] = useState<DayStats>(defaultDayStats);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [baselineDistance, setBaselineDistance] = useState<
    number | null
  >(null);

  const signIn = (_email: string) => {
    setIsAuthenticated(true);
  };

  const signOut = () => {
    setIsAuthenticated(false);
    setSessionStatus("idle");
    setSessionData(defaultSessionData);
  };

  const startSession = () => {
    setSessionStatus("active");
    setSessionData(defaultSessionData);
  };

  const pauseSession = () => {
    setSessionStatus("paused");
  };

  const resumeSession = () => {
    setSessionStatus("active");
  };

  const endSession = () => {
    setSessionStatus("ended");
  };

  const updateSessionSettings = (
    settings: Partial<SessionSettings>,
  ) => {
    setSessionSettings((prev) => ({ ...prev, ...settings }));
  };

  const updateSessionData = (data: Partial<SessionData>) => {
    setSessionData((prev) => ({ ...prev, ...data }));
  };

  const updateCurrentPosture = (posture: PostureState) => {
    setCurrentPosture(posture);
  };

  const calibratePosture = () => {
    // Simulate capturing baseline distance from sensor
    const simulatedDistance =
      Math.floor(Math.random() * 20) + 40; // 40-60cm
    setBaselineDistance(simulatedDistance);
    setIsCalibrated(true);
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        user,
        sessionStatus,
        currentPosture,
        sessionData,
        sessionSettings,
        dayStats,
        isCalibrated,
        baselineDistance,
        signIn,
        signOut,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        updateSessionSettings,
        updateSessionData,
        updateCurrentPosture,
        calibratePosture,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useApp must be used within AppProvider");
  return context;
}