import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Khởi tạo Supabase client mặc định
const supabaseClient = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : createClient(supabaseUrl, supabaseAnonKey);

// Cloudinary Credentials
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = !!(cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudinaryCloudName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret,
  });
}

// Trích xuất public_id từ Cloudinary URL
function getCloudinaryPublicId(url: string): string | null {
  if (!url || !url.includes("cloudinary.com")) return null;

  const uploadIndex = url.indexOf("/upload/");
  if (uploadIndex === -1) return null;

  let pathAfterUpload = url.substring(uploadIndex + "/upload/".length);

  // Bỏ phần version (ví dụ: v12345678/) nếu có
  const versionMatch = pathAfterUpload.match(/^v\d+\//);
  if (versionMatch) {
    pathAfterUpload = pathAfterUpload.substring(versionMatch[0].length);
  }

  // Bỏ phần extension ở cuối (ví dụ: .mp4 hoặc .jpg)
  const lastDotIndex = pathAfterUpload.lastIndexOf(".");
  if (lastDotIndex !== -1) {
    pathAfterUpload = pathAfterUpload.substring(0, lastDotIndex);
  }

  return pathAfterUpload;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Phân quyền và nhận thông tin User
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    // Khởi tạo Supabase client theo token của user để tôn trọng RLS
    const client = token && token !== "undefined"
      ? createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        })
      : supabaseClient;

    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Không thể xác thực người dùng hoặc phiên đăng nhập đã hết hạn." }, { status: 401 });
    }

    // 2. Nhận payload
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Định dạng JSON không hợp lệ." }, { status: 400 });
    }

    const { id } = body;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID prompt cần xóa không được để trống và phải là chuỗi." }, { status: 400 });
    }

    // 3. Lấy thông tin prompt để kiểm tra loại video và lấy link Cloudinary
    console.log(`[Delete API] Đang truy vấn prompt ID: ${id} cho user: ${user.id}`);
    const { data: prompts, error: fetchError } = await client
      .from("prompts")
      .select("*")
      .eq("id", id);

    const prompt = prompts && prompts.length > 0 ? prompts[0] : null;

    if (fetchError || !prompt) {
      return NextResponse.json({ error: `Không tìm thấy video hoặc bạn không có quyền xóa: ${fetchError?.message || "Không tồn tại"}` }, { status: 404 });
    }

    let deletedCloudinaryCount = 0;

    // 4. Nếu prompt thuộc loại video, parse notes để lấy metadata
    if (prompt.type === "video" && prompt.notes) {
      try {
        const trimmed = prompt.notes.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          const parsedNotes = JSON.parse(trimmed);
          const metadata = parsedNotes.videoMetadata;

          if (metadata) {
            const videoUrl = metadata.videoUrl;
            const thumbnailUrl = metadata.thumbnailUrl;

            const videoPublicId = getCloudinaryPublicId(videoUrl);
            const thumbPublicId = getCloudinaryPublicId(thumbnailUrl);

            if (isCloudinaryConfigured) {
              // Xóa video trên Cloudinary
              if (videoPublicId) {
                console.log(`[Delete API] Đang xóa video trên Cloudinary với public_id: ${videoPublicId}`);
                const videoDelResult = await cloudinary.uploader.destroy(videoPublicId, { resource_type: "video" });
                console.log(`[Delete API] Kết quả xóa video Cloudinary:`, videoDelResult);
                if (videoDelResult.result === "ok") {
                  deletedCloudinaryCount++;
                }
              }

              // Xóa thumbnail trên Cloudinary
              if (thumbPublicId && !thumbnailUrl.includes("unsplash.com")) {
                console.log(`[Delete API] Đang xóa thumbnail trên Cloudinary với public_id: ${thumbPublicId}`);
                const thumbDelResult = await cloudinary.uploader.destroy(thumbPublicId, { resource_type: "image" });
                console.log(`[Delete API] Kết quả xóa thumbnail Cloudinary:`, thumbDelResult);
                if (thumbDelResult.result === "ok") {
                  deletedCloudinaryCount++;
                }
              }
            } else {
              console.warn("[Delete API] Cloudinary chưa được cấu hình, bỏ qua việc xóa file Cloudinary.");
            }
          }
        }
      } catch (parseErr) {
        console.error("[Delete API] Lỗi khi phân tích cú pháp metadata video từ cột notes:", parseErr);
      }
    }

    // 5. Thực hiện xóa bản ghi trong database Supabase
    console.log(`[Delete API] Đang xóa bản ghi prompt trong database: ${id}`);
    const { error: deleteError } = await client
      .from("prompts")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[Delete API] Lỗi khi xóa bản ghi prompt trong database:", deleteError);
      return NextResponse.json({ error: `Không thể xóa bản ghi khỏi database: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Xóa video thành công. Đã dọn dẹp ${deletedCloudinaryCount} file trên Cloudinary.`,
    });

  } catch (error: any) {
    console.error("[Delete API] Lỗi hệ thống:", error);
    return NextResponse.json(
      { error: `Lỗi hệ thống khi xử lý yêu cầu xóa: ${error.message || "Không xác định"}` },
      { status: 500 }
    );
  }
}
