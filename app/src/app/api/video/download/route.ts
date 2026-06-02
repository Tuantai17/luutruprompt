import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";

// Lấy thông tin Supabase credentials từ môi trường
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

// Lấy thông tin Cloudflare R2 credentials từ môi trường
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const r2PublicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || "";

const isR2Configured = !!(r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName && r2PublicUrl);

// Lấy thông tin Cloudinary credentials từ môi trường
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
        thumbnailUrl: null, // Cobalt không trả về thumbnail trực tiếp ổn định
        creator: "Cobalt Downloader",
        duration: 0,
      };
    } else if (data.status === "picker" && data.picker && data.picker.length > 0) {
      // Dành cho dạng album ảnh hoặc nhiều video trên TikTok/Instagram
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
    console.error("Cobalt API failed:", error.message);
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
        videoUrl: data.play, // Link video không logo
        title: data.title || "TikTok Video",
        thumbnailUrl: data.cover, // Ảnh bìa video
        creator: data.author?.nickname || data.author?.unique_id || "TikTok Creator",
        duration: data.duration || 0,
      };
    }
    throw new Error(resJson.msg || "TikWM API returned error code");
  } catch (error: any) {
    console.error("TikWM API failed:", error.message);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Phân quyền và nhận thông tin User
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    let user = null;
    let serverSupabase = createClient(supabaseUrl, supabaseAnonKey);

    if (token && token !== "undefined") {
      serverSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });
      const { data } = await serverSupabase.auth.getUser();
      user = data.user;
    }

    if (!user) {
      return NextResponse.json(
        { error: "Bạn cần đăng nhập để sử dụng tính năng tải video và lưu trữ." },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 2. Lấy URL từ Body
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "Địa chỉ liên kết URL không được để trống." }, { status: 400 });
    }

    const platform = getPlatform(url);

    // 3. Thực hiện tải metadata và link video trực tiếp
    let videoData = null;

    if (platform === "tiktok") {
      // Đối với TikTok, ưu tiên TikWM vì độ ổn định cực cao
      videoData = await downloadViaTikWM(url);
      if (!videoData) {
        // Fallback sang Cobalt
        videoData = await downloadViaCobalt(url);
      }
    } else {
      // Đối với các nền tảng khác (Facebook, Instagram, Youtube...) dùng Cobalt
      videoData = await downloadViaCobalt(url);
    }

    if (!videoData || !videoData.videoUrl) {
      return NextResponse.json(
        { error: "Không thể lấy liên kết tải video từ đường dẫn này. Hãy chắc chắn video công khai và thử lại sau." },
        { status: 422 }
      );
    }

    // 4. Tải file video thực tế về Server-side dưới dạng Buffer để lưu trữ lên Supabase Storage
    console.log("Tải file video về server từ:", videoData.videoUrl);
    const videoFetchResponse = await fetch(videoData.videoUrl);
    if (!videoFetchResponse.ok) {
      return NextResponse.json(
        { error: "Không thể kết nối để tải file video gốc từ máy chủ đích." },
        { status: 502 }
      );
    }

    const videoBuffer = await videoFetchResponse.arrayBuffer();
    const videoSize = videoBuffer.byteLength;
    
    // Giới hạn kích thước video để tránh quá tải Storage (ví dụ tối đa 30MB)
    const MAX_SIZE = 30 * 1024 * 1024;
    if (videoSize > MAX_SIZE) {
      return NextResponse.json(
        { error: "Dung lượng video quá lớn (vượt quá 30MB). Không thể lưu trữ lên hệ thống cloud." },
        { status: 413 }
      );
    }

    // 5. Upload video lên Storage (Ưu tiên Cloudinary, tiếp đến Cloudflare R2, và mặc định Supabase Storage)
    const videoId = crypto.randomUUID();
    const videoPath = `videos/${userId}/${videoId}.mp4`;
    
    let savedVideoUrl = "";
    
    if (isCloudinaryConfigured) {
      try {
        console.log("Đang upload video lên Cloudinary...");
        savedVideoUrl = await uploadToCloudinary(videoBuffer, `videos/${userId}`, "video");
      } catch (cloudinaryErr: any) {
        console.error("Cloudinary video upload failed, falling back to Supabase:", cloudinaryErr);
        // Fallback to Supabase
        const { error: videoUploadError } = await serverSupabase.storage
          .from("images")
          .upload(videoPath, videoBuffer, {
            contentType: "video/mp4",
            upsert: true,
          });
        if (videoUploadError) throw videoUploadError;
        const { data: videoUrlData } = serverSupabase.storage
          .from("images")
          .getPublicUrl(videoPath);
        savedVideoUrl = videoUrlData.publicUrl;
      }
    } else if (isR2Configured) {
      try {
        console.log("Đang upload video lên Cloudflare R2:", videoPath);
        savedVideoUrl = await uploadToR2(videoPath, videoBuffer, "video/mp4");
      } catch (r2Err: any) {
        console.error("R2 Upload Error, falling back to Supabase:", r2Err);
        // Fallback to Supabase
        const { error: videoUploadError } = await serverSupabase.storage
          .from("images")
          .upload(videoPath, videoBuffer, {
            contentType: "video/mp4",
            upsert: true,
          });
        if (videoUploadError) throw videoUploadError;
        const { data: videoUrlData } = serverSupabase.storage
          .from("images")
          .getPublicUrl(videoPath);
        savedVideoUrl = videoUrlData.publicUrl;
      }
    } else {
      console.log("Đang upload video lên Supabase Storage (mặc định):", videoPath);
      const { error: videoUploadError } = await serverSupabase.storage
        .from("images")
        .upload(videoPath, videoBuffer, {
          contentType: "video/mp4",
          upsert: true,
        });

      if (videoUploadError) {
        console.error("Storage Video Upload Error:", videoUploadError);
        return NextResponse.json(
          { error: `Lỗi upload video lên Cloud: ${videoUploadError.message}` },
          { status: 500 }
        );
      }

      const { data: videoUrlData } = serverSupabase.storage
        .from("images")
        .getPublicUrl(videoPath);
      savedVideoUrl = videoUrlData.publicUrl;
    }

    // 6. Xử lý tải Thumbnail và upload lên Storage (nếu có thumbnail từ API gốc)
    let savedThumbnailUrl = "";
    if (videoData.thumbnailUrl) {
      try {
        console.log("Tải ảnh bìa thumbnail từ:", videoData.thumbnailUrl);
        const thumbResponse = await fetch(videoData.thumbnailUrl);
        if (thumbResponse.ok) {
          const thumbBuffer = await thumbResponse.arrayBuffer();
          const thumbPath = `videos/${userId}/thumbs/${videoId}.jpg`;

          if (isCloudinaryConfigured) {
            try {
              console.log("Upload thumbnail lên Cloudinary...");
              savedThumbnailUrl = await uploadToCloudinary(thumbBuffer, `videos/${userId}/thumbs`, "image");
            } catch (cloudinaryThumbErr) {
              console.error("Cloudinary thumbnail upload failed, falling back to Supabase:", cloudinaryThumbErr);
              const { error: thumbError } = await serverSupabase.storage
                .from("images")
                .upload(thumbPath, thumbBuffer, {
                  contentType: "image/jpeg",
                  upsert: true,
                });
              if (!thumbError) {
                const { data: thumbUrlData } = serverSupabase.storage
                  .from("images")
                  .getPublicUrl(thumbPath);
                savedThumbnailUrl = thumbUrlData.publicUrl;
              }
            }
          } else if (isR2Configured) {
            try {
              console.log("Upload thumbnail lên Cloudflare R2:", thumbPath);
              savedThumbnailUrl = await uploadToR2(thumbPath, thumbBuffer, "image/jpeg");
            } catch (r2ThumbErr) {
              console.error("R2 Thumbnail Upload Error, falling back to Supabase:", r2ThumbErr);
              const { error: thumbError } = await serverSupabase.storage
                .from("images")
                .upload(thumbPath, thumbBuffer, {
                  contentType: "image/jpeg",
                  upsert: true,
                });
              if (!thumbError) {
                const { data: thumbUrlData } = serverSupabase.storage
                  .from("images")
                  .getPublicUrl(thumbPath);
                savedThumbnailUrl = thumbUrlData.publicUrl;
              }
            }
          } else {
            console.log("Upload thumbnail lên Supabase Storage:", thumbPath);
            const { error: thumbError } = await serverSupabase.storage
              .from("images")
              .upload(thumbPath, thumbBuffer, {
                contentType: "image/jpeg",
                upsert: true,
              });

            if (!thumbError) {
              const { data: thumbUrlData } = serverSupabase.storage
                .from("images")
                .getPublicUrl(thumbPath);
              savedThumbnailUrl = thumbUrlData.publicUrl;
            }
          }
        }
      } catch (thumbErr) {
        console.error("Failed to save video thumbnail to storage:", thumbErr);
      }
    }

    // Trả kết quả về cho client để hiển thị preview và sẵn sàng lưu vào db
    return NextResponse.json({
      success: true,
      id: videoId,
      title: videoData.title,
      videoUrl: savedVideoUrl,
      thumbnailUrl: savedThumbnailUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500", // placeholder
      originUrl: url,
      creator: videoData.creator || "Tác giả video",
      platform: platform,
      duration: videoData.duration || 0,
    });

  } catch (error: any) {
    console.error("Video download API error:", error);
    return NextResponse.json(
      { error: `Đã xảy ra lỗi hệ thống: ${error.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
