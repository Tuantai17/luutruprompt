/**
 * API Route: Automation Settings
 * GET  - Lấy cấu hình automation
 * POST - Lưu cấu hình automation
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

/**
 * GET /api/ai-image/settings - Lấy cấu hình
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("automation_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const settings = {
    chatgpt_email: data?.chatgpt_email || "",
    chatgpt_password: data?.chatgpt_password || "",
    delay_between_jobs: data?.delay_between_jobs ?? 5,
    delay_after_send: data?.delay_after_send ?? 60,
    max_retries: data?.max_retries ?? 3,
    rest_after_n_jobs: data?.rest_after_n_jobs ?? 5,
    rest_duration_minutes: data?.rest_duration_minutes ?? 30,
    login_method: data?.login_method || "email",
  };

  return NextResponse.json({ settings });
}

/**
 * POST /api/ai-image/settings - Lưu/cập nhật cấu hình
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const settingsData = {
    chatgpt_email: body.chatgpt_email,
    chatgpt_password: body.chatgpt_password,
    delay_between_jobs: body.delay_between_jobs ?? 5,
    delay_after_send: body.delay_after_send ?? 60,
    max_retries: body.max_retries ?? 3,
    rest_after_n_jobs: body.rest_after_n_jobs ?? 5,
    rest_duration_minutes: body.rest_duration_minutes ?? 30,
    login_method: body.login_method ?? "email",
    updated_at: new Date().toISOString(),
  };

  // Upsert: tạo mới hoặc cập nhật
  const { data: existing } = await supabaseAdmin
    .from("automation_settings")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from("automation_settings")
      .update(settingsData)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabaseAdmin
      .from("automation_settings")
      .insert({
        user_id: user.id,
        ...settingsData,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
