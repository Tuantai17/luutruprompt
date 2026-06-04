import { create } from "zustand";
import { supabase } from "./supabaseClient";

export interface SyncNotification {
  show: boolean;
  type: "success" | "error";
  message: string;
  totalCount: number;
  successCount: number;
  downloadedVideosCount?: number;
  downloadedImagesCount?: number;
  failedCount: number;
  duplicateCount: number;
}

interface DriveSyncState {
  isSyncing: boolean;
  syncLogs: string[];
  autoSyncEnabled: boolean;
  folderId: string;
  syncStatus: { status: "idle" | "success" | "error"; message: string } | null;
  notification: SyncNotification | null;
  lastSyncTime: number;

  setSyncLogs: (logs: string[]) => void;
  setAutoSyncEnabled: (enabled: boolean) => void;
  setFolderId: (id: string) => void;
  setSyncStatus: (status: { status: "idle" | "success" | "error"; message: string } | null) => void;
  setNotification: (notification: SyncNotification | null) => void;
  handleDriveSync: (isAuto?: boolean) => Promise<void>;
}

export const useDriveSyncStore = create<DriveSyncState>((set, get) => ({
  isSyncing: false,
  syncLogs: [],
  autoSyncEnabled: false,
  folderId: "1WS-Ts0AiofSYK-1tqZeRId02SRSwUdh9",
  syncStatus: null,
  notification: null,
  lastSyncTime: 0,

  setSyncLogs: (logs) => set({ syncLogs: logs }),
  setAutoSyncEnabled: (enabled) => set({ autoSyncEnabled: enabled }),
  setFolderId: (id) => set({ folderId: id }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setNotification: (notification) => set({ notification }),

  handleDriveSync: async (isAuto = false) => {
    const { isSyncing } = get();
    if (isSyncing) return;
    set({ isSyncing: true });

    let pollingInterval: NodeJS.Timeout | null = null;

    if (!isAuto) {
      set({
        syncLogs: [`[${new Date().toLocaleTimeString()}] 🚀 Bắt đầu quét thư mục Google Drive...`],
        syncStatus: { status: "idle", message: "Đang tiến hành đồng bộ..." },
      });

      // Bắt đầu polling logs thời gian thực từ server
      pollingInterval = setInterval(async () => {
        try {
          const res = await fetch("/api/video/drive-sync");
          if (res.ok) {
            const data = await res.json();
            if (data.logs && data.logs.length > 0) {
              set({ syncLogs: data.logs });
            }
          }
        } catch (e) {
          console.error("Polling logs error:", e);
        }
      }, 1500);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/video/drive-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Lỗi đồng bộ.");
      }

      const total = data.totalCount || 0;
      const success = data.downloadedCount || 0;
      const successVideos = data.downloadedVideosCount || 0;
      const successImages = data.downloadedImagesCount || 0;
      const failed = data.failedCount || 0;
      const duplicate = data.duplicateCount || 0;

      // Cập nhật timestamp đồng bộ nếu có tải video thành công
      if (success > 0) {
        set({ lastSyncTime: Date.now() });
      }

      // Xử lý logs
      if (data.logs && data.logs.length > 0) {
        if (isAuto) {
          // Chỉ thêm log tự động nếu có tải thành công hoặc có link xử lý
          if (success > 0 || failed > 0) {
            set((s) => ({
              syncLogs: [
                ...s.syncLogs,
                `[${new Date().toLocaleTimeString()}] (Auto-Sync) Đồng bộ hoàn tất: Tải thành công ${success} video, lỗi ${failed} link.`,
                ...data.logs,
              ],
            }));
          }
        } else {
          set({ syncLogs: data.logs });
        }
      } else {
        if (!isAuto) {
          set((s) => ({
            syncLogs: [...s.syncLogs, `[${new Date().toLocaleTimeString()}] Đồng bộ hoàn tất: Không phát hiện tệp tin mới.`],
          }));
        }
      }

      // Cập nhật sync status trên UI Downloader
      if (!isAuto) {
        set({
          syncStatus: {
            status: "success",
            message: data.message || `Đồng bộ hoàn tất. Đã tải thành công ${success} video.`,
          },
        });
      }

      // Chỉ kích hoạt hiển thị Toast nổi góc phải nếu có link thực tế được quét/tải hoặc là chạy thủ công
      if (!isAuto || total > 0) {
        set({
          notification: {
            show: true,
            type: "success",
            message: `Đồng bộ Drive hoàn tất!`,
            totalCount: total,
            successCount: success,
            downloadedVideosCount: successVideos,
            downloadedImagesCount: successImages,
            failedCount: failed,
            duplicateCount: duplicate,
          },
        });
      }

    } catch (err: any) {
      const errMsg = err.message || "Lỗi kết nối API";
      if (!isAuto) {
        set((s) => ({
          syncLogs: [...s.syncLogs, `❌ [LỖI] ${errMsg}`],
          syncStatus: { status: "error", message: `Đồng bộ thất bại: ${errMsg}` },
        }));
      }
      
      set({
        notification: {
          show: true,
          type: "error",
          message: `Lỗi đồng bộ Drive: ${errMsg}`,
          totalCount: 0,
          successCount: 0,
          failedCount: 0,
          duplicateCount: 0,
        },
      });
    } finally {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      set({ isSyncing: false });
    }
  },
}));
