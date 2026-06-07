import { create } from "zustand";

export interface AutomationConfig {
  delayBetweenJobs: number;   // phút
  delayAfterSend: number;     // giây
  maxRetries: number;
  restAfterNJobs: number;
  restDurationMinutes: number;
}

export interface AutomationLog {
  id: string;
  timestamp: Date;
  level: "info" | "success" | "warning" | "error";
  message: string;
  jobId?: string;
}

interface AutomationState {
  // Trạng thái chạy
  isRunning: boolean;
  isPaused: boolean;
  currentJobId: string | null;
  completedCount: number;
  totalSelected: number;

  // Log
  logs: AutomationLog[];

  // Cấu hình
  config: AutomationConfig;

  // ChatGPT credentials
  chatgptEmail: string;
  chatgptPassword: string;
  chatgptLoginMethod: "email" | "google";

  // Selected job IDs
  selectedJobIds: Set<string>;

  // Actions
  setRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;
  setCurrentJobId: (id: string | null) => void;
  setCompletedCount: (count: number) => void;
  setTotalSelected: (count: number) => void;
  incrementCompleted: () => void;

  addLog: (log: Omit<AutomationLog, "id" | "timestamp">) => void;
  clearLogs: () => void;

  setConfig: (config: Partial<AutomationConfig>) => void;

  setChatGPTCredentials: (email: string, password: string) => void;
  setChatGPTLoginMethod: (method: "email" | "google") => void;

  toggleJobSelection: (id: string) => void;
  selectAllJobs: (ids: string[]) => void;
  deselectAllJobs: () => void;
  setSelectedJobIds: (ids: Set<string>) => void;

  resetAutomation: () => void;
}

const DEFAULT_CONFIG: AutomationConfig = {
  delayBetweenJobs: 5,
  delayAfterSend: 60,
  maxRetries: 3,
  restAfterNJobs: 5,
  restDurationMinutes: 30,
};

export const useAutomationStore = create<AutomationState>((set) => ({
  isRunning: false,
  isPaused: false,
  currentJobId: null,
  completedCount: 0,
  totalSelected: 0,

  logs: [],

  config: { ...DEFAULT_CONFIG },

  chatgptEmail: "",
  chatgptPassword: "",
  chatgptLoginMethod: "email",

  selectedJobIds: new Set<string>(),

  setRunning: (running) => set({ isRunning: running }),
  setPaused: (paused) => set({ isPaused: paused }),
  setCurrentJobId: (id) => set({ currentJobId: id }),
  setCompletedCount: (count) => set({ completedCount: count }),
  setTotalSelected: (count) => set({ totalSelected: count }),
  incrementCompleted: () =>
    set((state) => ({ completedCount: state.completedCount + 1 })),

  addLog: (log) =>
    set((state) => ({
      logs: [
        {
          ...log,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
        ...state.logs,
      ].slice(0, 200), // Giới hạn 200 log
    })),

  clearLogs: () => set({ logs: [] }),

  setConfig: (config) =>
    set((state) => ({
      config: { ...state.config, ...config },
    })),

  setChatGPTCredentials: (email, password) =>
    set({ chatgptEmail: email, chatgptPassword: password }),
  setChatGPTLoginMethod: (method) =>
    set({ chatgptLoginMethod: method }),

  toggleJobSelection: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedJobIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedJobIds: newSet };
    }),

  selectAllJobs: (ids) => set({ selectedJobIds: new Set(ids) }),

  deselectAllJobs: () => set({ selectedJobIds: new Set() }),

  setSelectedJobIds: (ids) => set({ selectedJobIds: ids }),

  resetAutomation: () =>
    set({
      isRunning: false,
      isPaused: false,
      currentJobId: null,
      completedCount: 0,
      totalSelected: 0,
    }),
}));
