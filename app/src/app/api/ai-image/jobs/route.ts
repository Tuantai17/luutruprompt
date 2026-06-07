/**
 * API Route: Quản lý Image Jobs
 * GET  - Lấy danh sách jobs
 * POST - Tạo job mới
 * DELETE - Xóa nhiều jobs
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

/**
 * Helper: Lấy user ID từ Authorization header
 */
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

/**
 * GET /api/ai-image/jobs - Lấy danh sách jobs
 */
export async function GET(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình trong .env.local! Vui lòng restart lại npm run dev sau khi cấu hình.");
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("image_jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: data || [] });
}

/**
 * POST /api/ai-image/jobs - Tạo job mới
 * Body: { image_path: string, prompt: string } hoặc array
 */
export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình trong .env.local! Vui lòng restart lại npm run dev sau khi cấu hình.");
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Hỗ trợ tạo 1 hoặc nhiều jobs
  const jobs = Array.isArray(body) ? body : [body];

  const rows = jobs.map((job) => ({
    id: crypto.randomUUID(),
    user_id: user.id,
    image_path: job.image_path,
    prompt: job.prompt,
    status: "WAITING",
    retry_count: 0,
    max_retries: 3,
  }));

  const { data, error } = await supabaseAdmin
    .from("image_jobs")
    .insert(rows)
    .select();

  if (error) {
    let errMsg = error.message;
    if (errMsg.includes("violates row-level security policy")) {
      errMsg += " (Gợi ý: Backend đang thiếu SUPABASE_SERVICE_ROLE_KEY hoặc bạn chưa khởi động lại dev server sau khi thêm key này vào file .env.local)";
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }

  return NextResponse.json({ jobs: data }, { status: 201 });
}

/**
 * DELETE /api/ai-image/jobs - Xóa nhiều jobs
 * Body: { ids: string[] }
 */
export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const ids = body.ids as string[];

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Missing ids array" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("image_jobs")
    .delete()
    .eq("user_id", user.id)
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: ids.length });
}
