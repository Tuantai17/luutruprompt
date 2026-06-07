import { supabase } from "./supabaseClient";

// ===== Types =====
export type JobStatus = "WAITING" | "RUNNING" | "SUCCESS" | "FAILED" | "PAUSED";

export interface ImageJob {
  id: string;
  user_id: string;
  image_path: string;
  prompt: string;
  status: JobStatus;
  chatgpt_image_url: string | null;
  result_image_path: string | null;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationSettings {
  id: string;
  user_id: string;
  chatgpt_email: string | null;
  chatgpt_password: string | null;
  delay_between_jobs: number;
  delay_after_send: number;
  max_retries: number;
  rest_after_n_jobs: number;
  rest_duration_minutes: number;
}

// ===== Helper =====
const getUserId = async (): Promise<string | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
};

// ===== Image Jobs CRUD =====
export const imageJobsDb = {
  /**
   * Lấy tất cả jobs của user hiện tại
   */
  getAll: async (): Promise<ImageJob[]> => {
    const userId = await getUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from("image_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching image jobs:", error);
      throw error;
    }
    return data || [];
  },

  /**
   * Lấy 1 job theo ID
   */
  getById: async (id: string): Promise<ImageJob | null> => {
    const userId = await getUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from("image_jobs")
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching image job:", error);
      return null;
    }
    return data;
  },

  /**
   * Tạo job mới
   */
  create: async (
    data: Pick<ImageJob, "image_path" | "prompt">
  ): Promise<string> => {
    const userId = await getUserId();
    if (!userId) throw new Error("Chưa đăng nhập");

    const id = crypto.randomUUID();
    const { error } = await supabase.from("image_jobs").insert({
      id,
      user_id: userId,
      image_path: data.image_path,
      prompt: data.prompt,
      status: "WAITING",
      retry_count: 0,
      max_retries: 3,
    });

    if (error) throw error;
    return id;
  },

  /**
   * Tạo nhiều jobs cùng lúc
   */
  createBatch: async (
    jobs: Pick<ImageJob, "image_path" | "prompt">[]
  ): Promise<string[]> => {
    const userId = await getUserId();
    if (!userId) throw new Error("Chưa đăng nhập");

    const ids = jobs.map(() => crypto.randomUUID());
    const rows = jobs.map((job, i) => ({
      id: ids[i],
      user_id: userId,
      image_path: job.image_path,
      prompt: job.prompt,
      status: "WAITING" as JobStatus,
      retry_count: 0,
      max_retries: 3,
    }));

    const { error } = await supabase.from("image_jobs").insert(rows);
    if (error) throw error;
    return ids;
  },

  /**
   * Cập nhật job
   */
  update: async (
    id: string,
    updates: Partial<
      Pick<
        ImageJob,
        | "status"
        | "chatgpt_image_url"
        | "result_image_path"
        | "retry_count"
        | "error_message"
      >
    >
  ): Promise<void> => {
    const userId = await getUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("image_jobs")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Xóa job
   */
  delete: async (id: string): Promise<void> => {
    const userId = await getUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("image_jobs")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Xóa nhiều jobs
   */
  deleteBatch: async (ids: string[]): Promise<void> => {
    const userId = await getUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("image_jobs")
      .delete()
      .eq("user_id", userId)
      .in("id", ids);

    if (error) throw error;
  },

  /**
   * Lấy job WAITING tiếp theo (theo thứ tự created_at)
   */
  getNextWaiting: async (): Promise<ImageJob | null> => {
    const userId = await getUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from("image_jobs")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "WAITING")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching next waiting job:", error);
      return null;
    }
    return data;
  },

  /**
   * Thống kê jobs theo trạng thái
   */
  getStats: async (): Promise<Record<JobStatus, number>> => {
    const userId = await getUserId();
    const stats: Record<JobStatus, number> = {
      WAITING: 0,
      RUNNING: 0,
      SUCCESS: 0,
      FAILED: 0,
      PAUSED: 0,
    };
    if (!userId) return stats;

    const { data, error } = await supabase
      .from("image_jobs")
      .select("status")
      .eq("user_id", userId);

    if (error || !data) return stats;

    data.forEach((row) => {
      const s = row.status as JobStatus;
      if (stats[s] !== undefined) stats[s]++;
    });

    return stats;
  },

  /**
   * Đặt lại tất cả job RUNNING/PAUSED về WAITING (reset khi restart)
   */
  resetStuckJobs: async (): Promise<void> => {
    const userId = await getUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("image_jobs")
      .update({ status: "WAITING", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("status", ["RUNNING", "PAUSED"]);

    if (error) console.error("Error resetting stuck jobs:", error);
  },
};

// ===== Automation Settings CRUD =====
export const automationSettingsDb = {
  /**
   * Lấy cấu hình automation của user
   */
  get: async (): Promise<AutomationSettings | null> => {
    const userId = await getUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from("automation_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching automation settings:", error);
      return null;
    }
    return data;
  },

  /**
   * Lưu/cập nhật cấu hình automation
   */
  save: async (
    settings: Partial<
      Omit<AutomationSettings, "id" | "user_id">
    >
  ): Promise<void> => {
    const userId = await getUserId();
    if (!userId) throw new Error("Chưa đăng nhập");

    const existing = await automationSettingsDb.get();

    if (existing) {
      const { error } = await supabase
        .from("automation_settings")
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("automation_settings").insert({
        user_id: userId,
        ...settings,
      });

      if (error) throw error;
    }
  },
};
