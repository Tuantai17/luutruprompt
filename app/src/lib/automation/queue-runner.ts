/**
 * Queue Runner - Chạy tuần tự các job tạo ảnh
 *
 * Xử lý hàng đợi job theo thứ tự:
 * 1. Lấy job WAITING tiếp theo
 * 2. Chạy automation ChatGPT
 * 3. Lưu kết quả
 * 4. Chờ delay
 * 5. Nghỉ ngơi nếu đạt ngưỡng
 * 6. Lặp lại
 */

import { ChatGPTAutomation, AutomationResult } from "./chatgpt-automation";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface QueueConfig {
  delayBetweenJobs: number;   // phút
  delayAfterSend: number;     // giây
  maxRetries: number;
  restAfterNJobs: number;
  restDurationMinutes: number;
}

export interface JobData {
  id: string;
  image_path: string;
  prompt: string;
  retry_count: number;
}

export interface QueueCallbacks {
  onLog: (level: "info" | "success" | "warning" | "error", message: string) => void;
  onJobStart: (jobId: string) => void;
  onJobComplete: (jobId: string, success: boolean) => void;
  onProgress: (completed: number, total: number) => void;
  onStatusChange: (status: string) => void;
  onFinished: () => void;
  shouldStop: () => boolean;
  shouldPause: () => boolean;
}

/**
 * Hàm sleep có thể hủy
 */
const cancellableSleep = async (
  ms: number,
  checkCancel: () => boolean,
  onLog?: (msg: string) => void,
  label?: string
): Promise<boolean> => {
  const interval = 5000; // Check mỗi 5 giây
  let elapsed = 0;

  while (elapsed < ms) {
    if (checkCancel()) return false;
    await new Promise((resolve) => setTimeout(resolve, Math.min(interval, ms - elapsed)));
    elapsed += interval;

    if (onLog && label && elapsed % 30000 === 0) {
      const remaining = Math.ceil((ms - elapsed) / 1000);
      onLog(`⏳ ${label}: còn ${remaining}s...`);
    }
  }
  return true;
};

/**
 * Chạy queue automation
 */
export const runAutomationQueue = async (
  selectedJobIds: string[],
  config: QueueConfig,
  credentials: { email?: string; password?: string; loginMethod?: "email" | "google" },
  callbacks: QueueCallbacks,
  userId: string
): Promise<void> => {
  const { onLog: originalOnLog, onJobStart, onJobComplete, onProgress, onStatusChange, onFinished, shouldStop, shouldPause } = callbacks;

  const logDir = path.join(process.cwd(), ".automation-data");
  const logFilePath = path.join(logDir, "automation.log");

  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.writeFileSync(logFilePath, `=== LƯỢT CHẠY MỚI: ${new Date().toLocaleString("vi-VN")} ===\n`);
  } catch (err) {
    console.error("Không thể khởi tạo file log:", err);
  }

  const writeLogToFile = (level: string, message: string) => {
    try {
      const time = new Date().toLocaleTimeString("vi-VN");
      fs.appendFileSync(logFilePath, `[${time}] [${level.toUpperCase()}] ${message}\n`);
    } catch (err) {
      console.error("Lỗi ghi file log:", err);
    }
  };

  const onLog = (level: "info" | "success" | "warning" | "error", message: string) => {
    writeLogToFile(level, message);
    originalOnLog(level, message);
  };

  let automation: ChatGPTAutomation | null = null;
  let completedCount = 0;
  const totalJobs = selectedJobIds.length;

  onLog("info", `🚀 Bắt đầu automation: ${totalJobs} jobs`);
  onLog("info", `⚙️ Cấu hình: delay=${config.delayBetweenJobs}m, retry=${config.maxRetries}, nghỉ=${config.restAfterNJobs} jobs/${config.restDurationMinutes}m`);

  try {
    // 1. Khởi tạo browser
    automation = new ChatGPTAutomation(
      {
        onLog: (level, msg) => onLog(level, msg),
        onStatusChange: (status) => onStatusChange(status),
      }
    );
    await automation.initialize();

    // 2. Kiểm tra + đăng nhập
    const loggedIn = await automation.isLoggedIn();
    if (!loggedIn) {
      const loginMethod = credentials.loginMethod || "email";
      if (loginMethod === "email" && (!credentials.email || !credentials.password)) {
        throw new Error("Cần cấu hình email/password ChatGPT trong phần Cài đặt");
      }
      await automation.login(loginMethod, credentials.email, credentials.password);
    }

    // 3. Chọn chế độ Create Image
    await automation.selectCreateImageMode();

    // 4. Xử lý từng job
    for (let i = 0; i < selectedJobIds.length; i++) {
      // Kiểm tra dừng
      if (shouldStop()) {
        onLog("warning", "⏹ Automation đã bị dừng bởi người dùng");
        break;
      }

      // Kiểm tra tạm dừng
      while (shouldPause()) {
        onLog("info", "⏸ Automation đang tạm dừng...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
        if (shouldStop()) break;
      }
      if (shouldStop()) break;

      const jobId = selectedJobIds[i];

      // Lấy thông tin job từ DB
      const { data: job, error: jobError } = await supabase
        .from("image_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", userId)
        .maybeSingle();

      if (jobError || !job) {
        onLog("error", `❌ Không tìm thấy job ${jobId}`);
        continue;
      }

      // Bỏ qua job đã thành công
      if (job.status === "SUCCESS") {
        onLog("info", `⏭ Bỏ qua job ${jobId} (đã thành công)`);
        continue;
      }

      // Bắt đầu job
      onJobStart(jobId);
      onLog("info", `📋 Job ${i + 1}/${totalJobs}: "${job.prompt.substring(0, 50)}..."`);

      // Cập nhật status = RUNNING
      await supabase
        .from("image_jobs")
        .update({ status: "RUNNING", updated_at: new Date().toISOString() })
        .eq("id", jobId);

      // Chạy automation
      const result: AutomationResult = await automation.createImage(
        job.image_path,
        job.prompt
      );

      if (result.success && result.imageBuffer) {
        // Upload ảnh kết quả lên Supabase Storage
        const fileName = `${userId}/ai-generated/${jobId}-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, result.imageBuffer, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          onLog("error", `❌ Lỗi upload ảnh kết quả: ${uploadError.message}`);
          await supabase
            .from("image_jobs")
            .update({
              status: "FAILED",
              error_message: `Upload failed: ${uploadError.message}`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", jobId);
          onJobComplete(jobId, false);
        } else {
          // Lấy public URL
          const { data: urlData } = supabase.storage
            .from("images")
            .getPublicUrl(fileName);

          await supabase
            .from("image_jobs")
            .update({
              status: "SUCCESS",
              chatgpt_image_url: result.imageUrl || null,
              result_image_path: urlData.publicUrl,
              updated_at: new Date().toISOString(),
            })
            .eq("id", jobId);

          onLog("success", `✅ Job ${i + 1} hoàn thành!`);
          onJobComplete(jobId, true);
          completedCount++;
        }
      } else {
        // Thất bại - kiểm tra retry
        const newRetryCount = (job.retry_count || 0) + 1;

        if (newRetryCount < config.maxRetries) {
          await supabase
            .from("image_jobs")
            .update({
              status: "WAITING",
              retry_count: newRetryCount,
              error_message: result.error || "Unknown error",
              updated_at: new Date().toISOString(),
            })
            .eq("id", jobId);
          onLog("warning", `⚠️ Job ${i + 1} thất bại, sẽ retry (${newRetryCount}/${config.maxRetries})`);
        } else {
          await supabase
            .from("image_jobs")
            .update({
              status: "FAILED",
              retry_count: newRetryCount,
              error_message: result.error || "Max retries exceeded",
              updated_at: new Date().toISOString(),
            })
            .eq("id", jobId);
          onLog("error", `❌ Job ${i + 1} thất bại vĩnh viễn sau ${newRetryCount} lần thử`);
        }
        onJobComplete(jobId, false);
      }

      onProgress(completedCount, totalJobs);

      // Nghỉ ngơi nếu đạt ngưỡng
      if (
        config.restAfterNJobs > 0 &&
        completedCount > 0 &&
        completedCount % config.restAfterNJobs === 0 &&
        i < selectedJobIds.length - 1
      ) {
        const restMs = config.restDurationMinutes * 60 * 1000;
        onLog("info", `😴 Nghỉ ngơi ${config.restDurationMinutes} phút (đã chạy ${completedCount} jobs)...`);
        onStatusChange(`Nghỉ ngơi ${config.restDurationMinutes} phút...`);

        const continued = await cancellableSleep(
          restMs,
          shouldStop,
          (msg) => onLog("info", msg),
          "Nghỉ ngơi"
        );
        if (!continued) break;
      }
      // Delay giữa các job
      else if (i < selectedJobIds.length - 1) {
        const delayMs = config.delayBetweenJobs * 60 * 1000;
        onLog("info", `⏰ Chờ ${config.delayBetweenJobs} phút trước job tiếp theo...`);
        onStatusChange(`Chờ ${config.delayBetweenJobs} phút...`);

        const continued = await cancellableSleep(
          delayMs,
          shouldStop,
          (msg) => onLog("info", msg),
          "Delay"
        );
        if (!continued) break;
      }
    }
  } catch (error: any) {
    onLog("error", `❌ Lỗi nghiêm trọng: ${error.message}`);
  } finally {
    // Cleanup
    if (automation) {
      await automation.cleanup();
    }
    onLog("info", `🏁 Automation kết thúc: ${completedCount}/${totalJobs} jobs thành công`);
    onFinished();
  }
};
