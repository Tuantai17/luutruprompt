import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ [Supabase] URL hoặc Anon Key đang bị trống! Hãy chắc chắn bạn đã tạo file .env.local và KHỞI ĐỘNG LẠI Next.js dev server (npm run dev).");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
