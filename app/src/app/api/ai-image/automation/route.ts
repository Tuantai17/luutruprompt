/**
 * API Route: Chạy Automation
 * POST /api/ai-image/automation
 *
 * Endpoint khởi chạy Playwright automation để tạo ảnh qua ChatGPT.
 * ⚠️ Chỉ chạy trên server local (không chạy trên Vercel/serverless).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runAutomationQueue, QueueConfig } from "@/lib/automation/queue-runner";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const getUserFromRequest = async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;
  return user;
};

// Biến global lưu trạng thái automation đang chạy
let automationRunning = false;
let automationShouldStop = false;
let automationShouldPause = false;

/**
 * POST /api/ai-image/automation
 *
 * Body:
 * {
 *   action: "start" | "pause" | "resume" | "stop",
 *   selectedJobIds?: string[],
 *   config?: QueueConfig,
 *   credentials?: { email: string, password: string }
 * }
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  switch (action) {
    case "start": {
      if (automationRunning) {
        return NextResponse.json(
          { error: "Automation đang chạy, vui lòng dừng trước khi chạy lại" },
          { status: 400 }
        );
      }

      const { selectedJobIds, config, credentials } = body;

      if (!selectedJobIds || selectedJobIds.length === 0) {
        return NextResponse.json(
          { error: "Chưa chọn job nào để chạy" },
          { status: 400 }
        );
      }

      const loginMethod = credentials?.loginMethod || "email";

      if (loginMethod === "email" && (!credentials?.email || !credentials?.password)) {
        return NextResponse.json(
          { error: "Cần cấu hình email/password ChatGPT khi chọn đăng nhập bằng Email" },
          { status: 400 }
        );
      }

      // Đặt trạng thái
      automationRunning = true;
      automationShouldStop = false;
      automationShouldPause = false;

      const queueConfig: QueueConfig = {
        delayBetweenJobs: config?.delayBetweenJobs ?? 5,
        delayAfterSend: config?.delayAfterSend ?? 60,
        maxRetries: config?.maxRetries ?? 3,
        restAfterNJobs: config?.restAfterNJobs ?? 5,
        restDurationMinutes: config?.restDurationMinutes ?? 30,
      };

      // Chạy automation ở background (không chờ response)
      runAutomationQueue(
        selectedJobIds,
        queueConfig,
        credentials,
        {
          onLog: (level, message) => {
            console.log(`[Automation] [${level}] ${message}`);
          },
          onJobStart: (jobId) => {
            console.log(`[Automation] Job started: ${jobId}`);
          },
          onJobComplete: (jobId, success) => {
            console.log(`[Automation] Job ${jobId}: ${success ? "SUCCESS" : "FAILED"}`);
          },
          onProgress: (completed, total) => {
            console.log(`[Automation] Progress: ${completed}/${total}`);
          },
          onStatusChange: (status) => {
            console.log(`[Automation] Status: ${status}`);
          },
          onFinished: () => {
            automationRunning = false;
            console.log("[Automation] Finished");
          },
          shouldStop: () => automationShouldStop,
          shouldPause: () => automationShouldPause,
        },
        user.id
      ).catch((error) => {
        console.error("[Automation] Fatal error:", error);
        automationRunning = false;
      });

      return NextResponse.json({
        success: true,
        message: "Automation đã bắt đầu",
        jobCount: selectedJobIds.length,
      });
    }

    case "pause": {
      automationShouldPause = true;
      return NextResponse.json({ success: true, message: "Đã tạm dừng" });
    }

    case "resume": {
      automationShouldPause = false;
      return NextResponse.json({ success: true, message: "Đã tiếp tục" });
    }

    case "stop": {
      automationShouldStop = true;
      automationShouldPause = false;
      return NextResponse.json({ success: true, message: "Đã dừng automation" });
    }

    case "status": {
      return NextResponse.json({
        running: automationRunning,
        paused: automationShouldPause,
        stopped: automationShouldStop,
      });
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}
