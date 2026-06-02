import { createClient } from "@supabase/supabase-js";

// Sử dụng fallback URL hợp lệ để tránh lỗi crash khi build tĩnh trên Vercel nếu chưa cấu hình Env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("⚠️ [Supabase] URL hoặc Anon Key đang bị trống! Hãy chắc chắn bạn đã cấu hình Environment Variables trên Vercel hoặc file .env.local.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
