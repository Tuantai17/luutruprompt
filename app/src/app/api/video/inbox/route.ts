import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";

// Lấy thông tin cấu hình từ môi trường
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Khởi tạo Supabase Client (sử dụng Service Role Key nếu có để bypass RLS ở phía server)
const supabaseClient = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : createClient(supabaseUrl, supabaseAnonKey);

// Cloudflare R2 Credentials
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const r2PublicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || "";

const isR2Configured = !!(r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName && r2PublicUrl);

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

let s3Client: S3Client | null = null;
if (isR2Configured) {
  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId!,
      secretAccessKey: r2SecretAccessKey!,
    },
  });
}

// Hàm upload buffer lên Cloudflare R2
async function uploadToR2(key: string, buffer: ArrayBuffer | Buffer, contentType: string): Promise<string> {
  if (!s3Client || !r2BucketName) {
    throw new Error("R2 Client is not configured");
  }
  const uploadBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer);
  const command = new PutObjectCommand({
    Bucket: r2BucketName,
    Key: key,
    Body: uploadBuffer,
    ContentType: contentType,
  });
  await s3Client.send(command);
  const cleanPublicUrl = r2PublicUrl.endsWith("/") ? r2PublicUrl.slice(0, -1) : r2PublicUrl;
  return `${cleanPublicUrl}/${key}`;
}

// Hàm upload buffer lên Cloudinary
async function uploadToCloudinary(buffer: ArrayBuffer | Buffer, folder: string, resourceType: "video" | "image"): Promise<string> {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured");
  }
  const uploadBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer);
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Upload result is undefined"));
        resolve(result.secure_url);
      }
    );
    uploadStream.end(uploadBuffer);
  });
}

// Hàm xác định loại nền tảng dựa trên URL
function getPlatform(url: string): string {
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.includes("tiktok.com")) return "tiktok";
  if (lowercaseUrl.includes("facebook.com") || lowercaseUrl.includes("fb.watch") || lowercaseUrl.includes("fb.com")) return "facebook";
  if (lowercaseUrl.includes("instagram.com")) return "instagram";
  if (lowercaseUrl.includes("youtube.com") || lowercaseUrl.includes("youtu.be")) return "youtube";
  if (lowercaseUrl.includes("twitter.com") || lowercaseUrl.includes("x.com")) return "twitter";
  return "other";
}

// Cố gắng lấy video qua Cobalt API
async function downloadViaCobalt(url: string) {
  try {
    const response = await fetch("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        url: url,
        vCodec: "h264",
        vQuality: "720",
        isAudioOnly: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cobalt API returned status ${response.status}`);
    }

    const data = await response.json();
    if (data.status === "redirect" || data.status === "stream") {
      return {
        videoUrl: data.url,
        title: data.text || "Video Downloaded via Cobalt",
        thumbnailUrl: null,
        creator: "Cobalt Downloader",
        duration: 0,
      };
    } else if (data.status === "picker" && data.picker && data.picker.length > 0) {
      const firstItem = data.picker[0];
      return {
        videoUrl: firstItem.url,
        title: data.text || "Video Item from Album",
        thumbnailUrl: firstItem.thumb || null,
        creator: "Cobalt Downloader",
        duration: 0,
      };
    }
    
    throw new Error(data.text || "Cobalt did not return a valid download link.");
  } catch (error: any) {
    console.error("Cobalt API failed in Inbox API:", error.message);
    return null;
  }
}

// Cố gắng lấy video TikTok qua TikWM API (Dành riêng cho TikTok, cực kỳ ổn định)
async function downloadViaTikWM(url: string) {
  try {
    const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error(`TikWM returned status ${response.status}`);
    }

    const resJson = await response.json();
    if (resJson.code === 0 && resJson.data) {
      const data = resJson.data;
      return {
        videoUrl: data.play,
        title: data.title || "TikTok Video",
        thumbnailUrl: data.cover,
        creator: data.author?.nickname || data.author?.unique_id || "TikTok Creator",
        duration: data.duration || 0,
      };
    }
    throw new Error(resJson.msg || "TikWM API returned error code");
  } catch (error: any) {
    console.error("TikWM API failed in Inbox API:", error.message);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Kiểm tra API Key tĩnh để xác thực quyền truy cập
    const authHeaderApiKey = request.headers.get("x-api-key");
    const queryApiKey = request.nextUrl.searchParams.get("key");
    const apiKey = authHeaderApiKey || queryApiKey;
    
    const configuredApiKey = process.env.INBOX_API_KEY;
    if (!configuredApiKey) {
      return NextResponse.json(
        { error: "Inbox API chưa được cấu hình khóa bảo mật (INBOX_API_KEY) trên máy chủ." },
        { status: 500 }
      );
    }

    if (apiKey !== configuredApiKey) {
      return NextResponse.json(
        { error: "Khóa bảo mật API Key không hợp lệ. Vui lòng kiểm tra lại cấu hình." },
        { status: 401 }
      );
    }

    // 2. Xác định User ID nhận video
    const userId = process.env.INBOX_DEFAULT_USER_ID;
    if (!userId) {
      return NextResponse.json(
        { error: "Inbox API chưa được cấu hình User ID mặc định (INBOX_DEFAULT_USER_ID) trên máy chủ." },
        { status: 500 }
      );
    }

    // 3. Lấy URL từ Body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Định dạng JSON yêu cầu gửi lên không hợp lệ." }, { status: 400 });
    }

    const { url } = body;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Địa chỉ liên kết 'url' không được để trống và phải là một chuỗi." }, { status: 400 });
    }

    const platform = getPlatform(url);

    // 4. Phân tích link video
    let videoData = null;
    if (platform === "tiktok") {
      videoData = await downloadViaTikWM(url);
      if (!videoData) {
        videoData = await downloadViaCobalt(url);
      }
    } else {
      videoData = await downloadViaCobalt(url);
    }

    if (!videoData || !videoData.videoUrl) {
      return NextResponse.json(
        { error: "Không thể lấy liên kết tải video từ đường dẫn này. Hãy chắc chắn video công khai." },
        { status: 422 }
      );
    }

    // 5. Tải file video gốc về server
    console.log("[Inbox API] Đang tải file video về server từ:", videoData.videoUrl);
    const videoFetchResponse = await fetch(videoData.videoUrl);
    if (!videoFetchResponse.ok) {
      return NextResponse.json(
        { error: "Không thể kết nối để tải file video gốc từ máy chủ đích." },
        { status: 502 }
      );
    }

    const videoBuffer = await videoFetchResponse.arrayBuffer();
    const videoSize = videoBuffer.byteLength;
    
    // Giới hạn 30MB
    const MAX_SIZE = 30 * 1024 * 1024;
    if (videoSize > MAX_SIZE) {
      return NextResponse.json(
        { error: "Dung lượng video vượt quá giới hạn cho phép (30MB)." },
        { status: 413 }
      );
    }

    // 6. Upload video lên Cloud Storage
    const videoId = crypto.randomUUID();
    const videoPath = `videos/${userId}/${videoId}.mp4`;
    let savedVideoUrl = "";

    if (isCloudinaryConfigured) {
      try {
        console.log("[Inbox API] Uploading video to Cloudinary...");
        savedVideoUrl = await uploadToCloudinary(videoBuffer, `videos/${userId}`, "video");
      } catch (cloudinaryErr: any) {
        console.error("[Inbox API] Cloudinary failed, falling back to Supabase:", cloudinaryErr);
        const { error: videoUploadError } = await supabaseClient.storage
          .from("images")
          .upload(videoPath, videoBuffer, {
            contentType: "video/mp4",
            upsert: true,
          });
        if (videoUploadError) throw videoUploadError;
        const { data: videoUrlData } = supabaseClient.storage.from("images").getPublicUrl(videoPath);
        savedVideoUrl = videoUrlData.publicUrl;
      }
    } else if (isR2Configured) {
      try {
        console.log("[Inbox API] Uploading video to R2:", videoPath);
        savedVideoUrl = await uploadToR2(videoPath, videoBuffer, "video/mp4");
      } catch (r2Err: any) {
        console.error("[Inbox API] R2 failed, falling back to Supabase:", r2Err);
        const { error: videoUploadError } = await supabaseClient.storage
          .from("images")
          .upload(videoPath, videoBuffer, {
            contentType: "video/mp4",
            upsert: true,
          });
        if (videoUploadError) throw videoUploadError;
        const { data: videoUrlData } = supabaseClient.storage.from("images").getPublicUrl(videoPath);
        savedVideoUrl = videoUrlData.publicUrl;
      }
    } else {
      console.log("[Inbox API] Uploading video to Supabase Storage:", videoPath);
      const { error: videoUploadError } = await supabaseClient.storage
        .from("images")
        .upload(videoPath, videoBuffer, {
          contentType: "video/mp4",
          upsert: true,
        });
      if (videoUploadError) throw videoUploadError;
      const { data: videoUrlData } = supabaseClient.storage.from("images").getPublicUrl(videoPath);
      savedVideoUrl = videoUrlData.publicUrl;
    }

    // 7. Tải Thumbnail và upload
    let savedThumbnailUrl = "";
    if (videoData.thumbnailUrl) {
      try {
        console.log("[Inbox API] Đang tải thumbnail từ:", videoData.thumbnailUrl);
        const thumbResponse = await fetch(videoData.thumbnailUrl);
        if (thumbResponse.ok) {
          const thumbBuffer = await thumbResponse.arrayBuffer();
          const thumbPath = `videos/${userId}/thumbs/${videoId}.jpg`;

          if (isCloudinaryConfigured) {
            try {
              savedThumbnailUrl = await uploadToCloudinary(thumbBuffer, `videos/${userId}/thumbs`, "image");
            } catch (cloudinaryThumbErr) {
              console.error("[Inbox API] Cloudinary thumbnail upload failed:", cloudinaryThumbErr);
              const { error: thumbError } = await supabaseClient.storage
                .from("images")
                .upload(thumbPath, thumbBuffer, {
                  contentType: "image/jpeg",
                  upsert: true,
                });
              if (!thumbError) {
                const { data: thumbUrlData } = supabaseClient.storage.from("images").getPublicUrl(thumbPath);
                savedThumbnailUrl = thumbUrlData.publicUrl;
              }
            }
          } else if (isR2Configured) {
            try {
              savedThumbnailUrl = await uploadToR2(thumbPath, thumbBuffer, "image/jpeg");
            } catch (r2ThumbErr) {
              console.error("[Inbox API] R2 thumbnail upload failed:", r2ThumbErr);
              const { error: thumbError } = await supabaseClient.storage
                .from("images")
                .upload(thumbPath, thumbBuffer, {
                  contentType: "image/jpeg",
                  upsert: true,
                });
              if (!thumbError) {
                const { data: thumbUrlData } = supabaseClient.storage.from("images").getPublicUrl(thumbPath);
                savedThumbnailUrl = thumbUrlData.publicUrl;
              }
            }
          } else {
            const { error: thumbError } = await supabaseClient.storage
              .from("images")
              .upload(thumbPath, thumbBuffer, {
                contentType: "image/jpeg",
                upsert: true,
              });
            if (!thumbError) {
              const { data: thumbUrlData } = supabaseClient.storage.from("images").getPublicUrl(thumbPath);
              savedThumbnailUrl = thumbUrlData.publicUrl;
            }
          }
        }
      } catch (thumbErr) {
        console.error("[Inbox API] Failed to download/save thumbnail:", thumbErr);
      }
    }

    // 8. Lưu bản ghi vào Supabase Database (bảng prompts với type = video)
    console.log("[Inbox API] Đang lưu video vào database cho user:", userId);
    const now = new Date().toISOString();
    const videoMetadata = {
      id: videoId,
      videoUrl: savedVideoUrl,
      thumbnailUrl: savedThumbnailUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500",
      originUrl: url,
      platform: platform,
      duration: videoData.duration || 0,
      creator: videoData.creator,
    };
    
    const finalNotes = JSON.stringify({ 
      notes: "Tải từ điện thoại qua API Inbox", 
      videoMetadata 
    });

    const { error: dbError } = await supabaseClient.from("prompts").insert({
      id: videoId,
      title: videoData.title || `Video SnapSave - ${videoData.creator}`,
      content: "Tải xuống tự động qua công cụ SnapSave Downloader (API Inbox)",
      negativePrompt: "",
      type: "video",
      model: "SnapSave Inbox",
      lora: "",
      seed: "",
      sampler: "",
      cfgScale: 0,
      steps: 0,
      creator: videoData.creator,
      tags: ["SnapSave", "Inbox", platform],
      notes: finalNotes,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      user_id: userId,
    });

    if (dbError) {
      console.error("[Inbox API] Supabase Database Insert Error:", dbError);
      // Nếu lỗi DB, vẫn trả về link video đã lưu trữ thành công để không mất công upload
      return NextResponse.json({
        success: false,
        error: `Video đã được tải và lưu trữ thành công lên Storage nhưng không thể tạo bản ghi trong Database: ${dbError.message}`,
        videoUrl: savedVideoUrl,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: videoId,
      title: videoData.title,
      videoUrl: savedVideoUrl,
      thumbnailUrl: videoMetadata.thumbnailUrl,
      originUrl: url,
      creator: videoData.creator,
      platform: platform,
      duration: videoData.duration || 0,
    });

  } catch (error: any) {
    console.error("[Inbox API] General System Error:", error);
    return NextResponse.json(
      { error: `Lỗi hệ thống khi xử lý Inbox: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
