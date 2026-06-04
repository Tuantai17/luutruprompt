import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";
import { google } from "googleapis";
import { parseImageBufferMetadata } from "@/lib/metadataExtractor";

// Lấy thông tin cấu hình từ môi trường
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Khởi tạo Supabase Client
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

// Bộ nhớ đệm lưu logs tạm thời của tiến trình đồng bộ đang hoạt động
let activeSyncLogs: string[] = [];
let isSyncActive = false;

export async function GET(request: NextRequest) {
  return NextResponse.json({
    active: isSyncActive,
    logs: activeSyncLogs,
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

// Trích xuất các URL video từ nội dung văn bản
function parseUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex) || [];
  return matches
    .map((url) => url.replace(/[.,;'")<>\]\[}{]+$/g, "")) // chỉ xóa ký tự đặc biệt ở CUỐI link
    .map((url) => url.replace(/\.txt$/i, "")) // loại bỏ .txt ở cuối nếu có (từ tên file Drive)
    .filter((url) => {
      const lowercase = url.toLowerCase();
      return (
        lowercase.includes("tiktok.com") ||
        lowercase.includes("vt.tiktok") ||
        lowercase.includes("facebook.com") ||
        lowercase.includes("fb.watch") ||
        lowercase.includes("fb.com") ||
        lowercase.includes("instagram.com") ||
        lowercase.includes("youtube.com") ||
        lowercase.includes("youtu.be") ||
        lowercase.includes("twitter.com") ||
        lowercase.includes("x.com")
      );
    });
}

// Hàm đọc kích thước ảnh từ binary header (PNG/JPEG)
function getImageDimensions(buffer: Buffer, ext: string): { width: number; height: number } {
  try {
    if (ext === "png" && buffer.length >= 24) {
      // PNG width is at offset 16-19, height is at 20-23
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    if ((ext === "jpg" || ext === "jpeg") && buffer.length >= 4) {
      let offset = 2;
      while (offset + 4 < buffer.length) {
        // Read marker
        const marker = buffer.readUInt16BE(offset);
        offset += 2;
        
        // SOF0 (Start Of Frame 0) marker is 0xFFC0, SOF2 is 0xFFC2
        if (marker === 0xFFC0 || marker === 0xFFC2) {
          if (offset + 7 <= buffer.length) {
            // Height is at offset + 3 (2 bytes), width is at offset + 5 (2 bytes)
            const height = buffer.readUInt16BE(offset + 3);
            const width = buffer.readUInt16BE(offset + 5);
            return { width, height };
          }
          break;
        }
        
        // Read segment length and skip it
        const length = buffer.readUInt16BE(offset);
        if (length < 2) {
          break; // Tránh lặp vô hạn nếu length = 0 hoặc không hợp lệ
        }
        offset += length;
      }
    }
  } catch (e) {
    console.error("Failed to get image dimensions:", e);
  }
  return { width: 0, height: 0 };
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
    console.error("Cobalt API failed in Drive Sync:", error.message);
    return null;
  }
}

// Cố gắng lấy video TikTok qua TikWM API
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
    console.error("TikWM API failed in Drive Sync:", error.message);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const syncLogs: string[] = [];
  
  // Khởi động trạng thái đồng bộ và reset logs toàn cục để client polling
  isSyncActive = true;
  activeSyncLogs = [];

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    const logLine = `[${time}] ${msg}`;
    console.log(`[Drive Sync] ${logLine}`);
    syncLogs.push(logLine);
    activeSyncLogs.push(logLine);
  };

  try {
    // 1. Phân quyền và nhận thông tin User
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    let userId = process.env.INBOX_DEFAULT_USER_ID; // Fallback mặc định

    if (token && token !== "undefined") {
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data } = await tempSupabase.auth.getUser();
      if (data.user) {
        userId = data.user.id;
      }
    }

    if (!userId) {
      isSyncActive = false;
      return NextResponse.json(
        { error: "Không tìm thấy User ID hợp lệ. Vui lòng đăng nhập hoặc cấu hình INBOX_DEFAULT_USER_ID." },
        { status: 400 }
      );
    }

    // 2. Kiểm tra Google Drive Credentials
    const serviceAccountKeyStr = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!serviceAccountKeyStr) {
      isSyncActive = false;
      return NextResponse.json(
        { error: "Chưa cấu hình khóa dịch vụ Google Service Account (GOOGLE_SERVICE_ACCOUNT_KEY) trong .env.local." },
        { status: 500 }
      );
    }

    if (!folderId) {
      isSyncActive = false;
      return NextResponse.json(
        { error: "Chưa cấu hình Google Drive Folder ID (GOOGLE_DRIVE_FOLDER_ID) trong .env.local." },
        { status: 500 }
      );
    }

    addLog("Đang kết nối Google Drive API...");
    
    let serviceAccountKey;
    try {
      serviceAccountKey = JSON.parse(serviceAccountKeyStr);
    } catch (parseErr: any) {
      isSyncActive = false;
      console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY. Raw value starts with:", serviceAccountKeyStr.substring(0, 50));
      return NextResponse.json(
        { error: `Lỗi phân tích JSON khóa Service Account. Hãy đảm bảo GOOGLE_SERVICE_ACCOUNT_KEY trong .env.local là JSON hợp lệ trên 1 dòng duy nhất. Chi tiết: ${parseErr.message}`, logs: syncLogs },
        { status: 500 }
      );
    }

    let auth;
    try {
      auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: ["https://www.googleapis.com/auth/drive"],
      });
    } catch (authErr: any) {
      isSyncActive = false;
      return NextResponse.json(
        { error: `Lỗi khởi tạo Google Auth: ${authErr.message}`, logs: syncLogs },
        { status: 500 }
      );
    }
    
    const drive = google.drive({ version: "v3", auth: auth as any });

    // 3. Quét tìm danh sách file trong thư mục
    addLog(`Đang quét thư mục Drive có ID: ${folderId}`);
    let files: any[] = [];
    try {
      const filesListResponse = await drive.files.list({
        q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name, mimeType)",
      });
      files = (filesListResponse.data as any).files || [];
    } catch (driveErr: any) {
      const errMsg = driveErr.message || "Unknown Drive API error";
      isSyncActive = false;
      if (errMsg.includes("File not found") || driveErr.code === 404) {
        addLog(`❌ Không tìm thấy thư mục Drive. Hãy chắc chắn bạn đã chia sẻ thư mục với email Service Account.`);
        return NextResponse.json(
          {
            error: `Không tìm thấy thư mục Google Drive (ID: ${folderId}). Nguyên nhân phổ biến: Bạn chưa chia sẻ thư mục đó với email Service Account: ${serviceAccountKey.client_email}. Hãy mở Google Drive → Click phải vào thư mục → Chia sẻ → Dán email trên → Chọn quyền "Người chỉnh sửa" → Gửi.`,
            logs: syncLogs,
          },
          { status: 403 }
        );
      }
      throw driveErr; // Re-throw các lỗi khác
    }
    addLog(`Tìm thấy ${files.length} file mới trên Drive.`);

    if (files.length === 0) {
      isSyncActive = false;
      return NextResponse.json({
        success: true,
        message: "Không có tệp tin nào cần đồng bộ trên Google Drive.",
        logs: syncLogs,
        downloadedCount: 0,
      });
    }

    let totalDownloaded = 0;
    let downloadedVideosCount = 0;
    let downloadedImagesCount = 0;
    let totalUrlsCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;

    // 4. Xử lý từng file
    for (const file of files) {
      const fileId = file.id;
      const fileName = file.name;
      const fileMime = file.mimeType || "unknown";
      addLog(`Đang xử lý file: "${fileName}" (MIME: ${fileMime}, ID: ${fileId})`);

      try {
        // Tải nội dung tệp tin Drive dưới dạng ArrayBuffer
        const fileContentResponse = await drive.files.get(
          { fileId: fileId!, alt: "media" },
          { responseType: "arraybuffer" }
        );

        const fileBuffer = Buffer.from(fileContentResponse.data as ArrayBuffer);
        const isImage = fileMime.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(fileName);

        if (isImage) {
          addLog(`Đang xử lý ảnh: "${fileName}"...`);
          // 1. Trích xuất metadata từ ArrayBuffer gốc của ảnh
          const meta = parseImageBufferMetadata(fileContentResponse.data as ArrayBuffer, fileName);
          
          // 2. Lấy kích thước ảnh
          const ext = fileName.toLowerCase().split(".").pop() || "png";
          const dimensions = getImageDimensions(fileBuffer, ext);
          
          // 3. Upload ảnh lên Supabase Storage (hoặc Cloudinary/R2 nếu được config)
          const imageId = crypto.randomUUID();
          const imagePath = `${userId}/${imageId}.${ext}`;
          const cleanContentType = isImage ? fileMime : `image/${ext}`;
          let savedImageUrl = "";

          // Thử upload lên Cloudinary hoặc R2 trước, nếu không được thì fallback Supabase Storage
          if (isCloudinaryConfigured) {
            try {
              savedImageUrl = await uploadToCloudinary(fileBuffer, `images/${userId}`, "image");
            } catch (cloudinaryErr: any) {
              addLog(`⚠️ Cloudinary upload lỗi: ${cloudinaryErr.message}. Fallback sang Supabase Storage.`);
              const { error: uploadError } = await supabaseClient.storage.from("images").upload(imagePath, fileBuffer, { contentType: cleanContentType, upsert: true });
              if (uploadError) throw uploadError;
              const { data: urlData } = supabaseClient.storage.from("images").getPublicUrl(imagePath);
              savedImageUrl = urlData.publicUrl;
            }
          } else if (isR2Configured) {
            try {
              savedImageUrl = await uploadToR2(imagePath, fileBuffer, cleanContentType);
            } catch (r2Err: any) {
              addLog(`⚠️ R2 upload lỗi: ${r2Err.message}. Fallback sang Supabase Storage.`);
              const { error: uploadError } = await supabaseClient.storage.from("images").upload(imagePath, fileBuffer, { contentType: cleanContentType, upsert: true });
              if (uploadError) throw uploadError;
              const { data: urlData } = supabaseClient.storage.from("images").getPublicUrl(imagePath);
              savedImageUrl = urlData.publicUrl;
            }
          } else {
            const { error: uploadError } = await supabaseClient.storage.from("images").upload(imagePath, fileBuffer, { contentType: cleanContentType, upsert: true });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabaseClient.storage.from("images").getPublicUrl(imagePath);
            savedImageUrl = urlData.publicUrl;
          }

          // 4. Lưu ảnh vào Supabase Database bảng `images`
          const title = fileName.replace(/\.[^/.]+$/, "");
          const now = new Date().toISOString();
          
          const { error: dbError } = await supabaseClient.from("images").insert({
            id: imageId,
            title: title,
            imageUrl: savedImageUrl,
            thumbnailUrl: savedImageUrl, // dùng luôn ảnh gốc làm thumbnail
            promptId: null,
            prompt: meta.prompt || "",
            negativePrompt: meta.negativePrompt || "",
            model: meta.model || "Drive Sync",
            lora: meta.lora || "",
            seed: meta.seed || "",
            sampler: meta.sampler || "",
            cfgScale: meta.cfgScale !== undefined ? meta.cfgScale : 7,
            steps: meta.steps !== undefined ? meta.steps : 20,
            creator: meta.creator || "Drive Sync",
            note: `Đồng bộ từ file Google Drive "${fileName}"`,
            width: dimensions.width,
            height: dimensions.height,
            fileSize: fileBuffer.byteLength,
            format: ext,
            tags: ["DriveSync", ...(meta.tags || [])],
            isFavorite: false,
            createdAt: now,
            user_id: userId,
          });

          if (dbError) {
            addLog(`⚠️ Lưu database ảnh thất bại: ${dbError.message}`);
            failedCount++;
          } else {
            addLog(`✅ Thành công! Đã thêm ảnh "${fileName}" vào thư viện.`);
            downloadedImagesCount++;
            totalDownloaded++;
            totalUrlsCount++; // Cộng vào tổng tệp xử lý
          }

        } else {
          // Xử lý file text link video như cũ
          const content = fileBuffer.toString("utf-8");

          // Trích xuất URL từ cả nội dung file VÀ tên file
          const contentUrls = parseUrls(content);
          const fileNameUrls = parseUrls(fileName || "");
          
          // Gộp và loại trùng
          const allUrlsSet = new Set([...contentUrls, ...fileNameUrls]);
          const urls = Array.from(allUrlsSet);
          totalUrlsCount += urls.length;
          
          addLog(`Tìm thấy ${urls.length} link video trong file "${fileName}".`);

          // Định nghĩa hàm xử lý song song cho từng URL
          const processUrl = async (url: string) => {
            const addUrlLog = (msg: string) => {
              const time = new Date().toLocaleTimeString();
              const logLine = `[${time}] [Link: ${url.substring(0, 35)}...] ${msg}`;
              console.log(`[Drive Sync] ${logLine}`);
              syncLogs.push(logLine);
              activeSyncLogs.push(logLine); // Đẩy trực tiếp để client polling
            };

            try {
              // Kiểm tra trùng lặp tránh tải lặp
              addUrlLog(`🔍 Đang kiểm tra trùng lặp...`);
              const { data: duplicateCheck } = await supabaseClient
                .from("prompts")
                .select("id, notes")
                .eq("user_id", userId)
                .eq("type", "video")
                .like("notes", `%${url}%`);

              let isDuplicate = false;
              if (duplicateCheck && duplicateCheck.length > 0) {
                for (const record of duplicateCheck) {
                  try {
                    if (record.notes) {
                      const parsedNotes = JSON.parse(record.notes);
                      if (parsedNotes.videoMetadata?.originUrl === url) {
                        isDuplicate = true;
                        break;
                      }
                    }
                  } catch {
                    if (record.notes && record.notes.includes(url)) {
                      isDuplicate = true;
                      break;
                    }
                  }
                }
              }

              if (isDuplicate) {
                addUrlLog(`⏭️ Bỏ qua - Video đã tồn tại trong thư viện.`);
                return { success: false, duplicate: true, failed: false };
              }

              addUrlLog(`🚀 Đang phân tích thông tin video...`);
              const platform = getPlatform(url);
              let videoData = null;

              if (platform === "tiktok") {
                videoData = await downloadViaTikWM(url);
                if (!videoData) videoData = await downloadViaCobalt(url);
              } else {
                videoData = await downloadViaCobalt(url);
              }

              if (!videoData || !videoData.videoUrl) {
                addUrlLog(`⚠️ Bỏ qua - Không thể phân tích link video.`);
                return { success: false, duplicate: false, failed: true };
              }

              addUrlLog(`📥 Đang tải file video gốc từ nguồn...`);
              const videoFetchResponse = await fetch(videoData.videoUrl);
              if (!videoFetchResponse.ok) {
                addUrlLog(`⚠️ Thất bại khi fetch file video gốc.`);
                return { success: false, duplicate: false, failed: true };
              }

              const videoBuffer = await videoFetchResponse.arrayBuffer();
              const videoSize = videoBuffer.byteLength;
              
              if (videoSize > 30 * 1024 * 1024) {
                addUrlLog(`⚠️ Bỏ qua - Dung lượng video (${(videoSize / 1024 / 1024).toFixed(1)}MB) vượt quá giới hạn 30MB.`);
                return { success: false, duplicate: false, failed: true };
              }

              addUrlLog(`☁️ Đang upload video lên Cloud Storage...`);
              const videoId = crypto.randomUUID();
              const videoPath = `videos/${userId}/${videoId}.mp4`;
              let savedVideoUrl = "";

              if (isCloudinaryConfigured) {
                try {
                  savedVideoUrl = await uploadToCloudinary(videoBuffer, `videos/${userId}`, "video");
                } catch {
                  const { error: uploadError } = await supabaseClient.storage.from("images").upload(videoPath, videoBuffer, { contentType: "video/mp4", upsert: true });
                  if (uploadError) throw uploadError;
                  const { data: urlData } = supabaseClient.storage.from("images").getPublicUrl(videoPath);
                  savedVideoUrl = urlData.publicUrl;
                }
              } else if (isR2Configured) {
                try {
                  savedVideoUrl = await uploadToR2(videoPath, videoBuffer, "video/mp4");
                } catch {
                  const { error: uploadError } = await supabaseClient.storage.from("images").upload(videoPath, videoBuffer, { contentType: "video/mp4", upsert: true });
                  if (uploadError) throw uploadError;
                  const { data: urlData } = supabaseClient.storage.from("images").getPublicUrl(videoPath);
                  savedVideoUrl = urlData.publicUrl;
                }
              } else {
                const { error: uploadError } = await supabaseClient.storage.from("images").upload(videoPath, videoBuffer, { contentType: "video/mp4", upsert: true });
                if (uploadError) throw uploadError;
                const { data: urlData } = supabaseClient.storage.from("images").getPublicUrl(videoPath);
                savedVideoUrl = urlData.publicUrl;
              }

              // Tải & Upload Thumbnail
              let savedThumbnailUrl = "";
              if (videoData.thumbnailUrl) {
                addUrlLog(`🖼️ Đang tải và upload ảnh thu nhỏ (thumbnail)...`);
                try {
                  const thumbResponse = await fetch(videoData.thumbnailUrl);
                  if (thumbResponse.ok) {
                    const thumbBuffer = await thumbResponse.arrayBuffer();
                    const thumbPath = `videos/${userId}/thumbs/${videoId}.jpg`;

                    if (isCloudinaryConfigured) {
                      try {
                        savedThumbnailUrl = await uploadToCloudinary(thumbBuffer, `videos/${userId}/thumbs`, "image");
                      } catch {
                        const { error: thumbError } = await supabaseClient.storage.from("images").upload(thumbPath, thumbBuffer, { contentType: "image/jpeg", upsert: true });
                        if (!thumbError) {
                          const { data: thumbUrlData } = supabaseClient.storage.from("images").getPublicUrl(thumbPath);
                          savedThumbnailUrl = thumbUrlData.publicUrl;
                        }
                      }
                    } else if (isR2Configured) {
                      try {
                        savedThumbnailUrl = await uploadToR2(thumbPath, thumbBuffer, "image/jpeg");
                      } catch {
                        const { error: thumbError } = await supabaseClient.storage.from("images").upload(thumbPath, thumbBuffer, { contentType: "image/jpeg", upsert: true });
                        if (!thumbError) {
                          const { data: thumbUrlData } = supabaseClient.storage.from("images").getPublicUrl(thumbPath);
                          savedThumbnailUrl = thumbUrlData.publicUrl;
                        }
                      }
                    } else {
                      const { error: thumbError } = await supabaseClient.storage.from("images").upload(thumbPath, thumbBuffer, { contentType: "image/jpeg", upsert: true });
                      if (!thumbError) {
                        const { data: thumbUrlData } = supabaseClient.storage.from("images").getPublicUrl(thumbPath);
                        savedThumbnailUrl = thumbUrlData.publicUrl;
                      }
                    }
                  }
                } catch (thumbErr) {
                  console.error("Fail to sync thumb:", thumbErr);
                }
              }

              addUrlLog(`💾 Đang ghi nhận thông tin video vào Database...`);
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
              const finalNotes = JSON.stringify({ notes: `Đồng bộ từ file Google Drive "${fileName}"`, videoMetadata });

              const { error: dbError } = await supabaseClient.from("prompts").insert({
                id: videoId,
                title: videoData.title || `Video Drive Sync - ${videoData.creator}`,
                content: "Đồng bộ tự động từ Google Drive",
                negativePrompt: "",
                type: "video",
                model: "Drive Sync",
                lora: "",
                seed: "",
                sampler: "",
                cfgScale: 0,
                steps: 0,
                creator: videoData.creator,
                tags: ["SnapSave", "DriveSync", platform],
                notes: finalNotes,
                isFavorite: false,
                createdAt: now,
                updatedAt: now,
                user_id: userId,
              });

              if (dbError) {
                addUrlLog(`⚠️ Lưu database thất bại: ${dbError.message}`);
                return { success: false, duplicate: false, failed: true };
              }

              addUrlLog(`✅ Thành công! Video đã sẵn sàng trong thư viện.`);
              return { success: true, duplicate: false, failed: false };

            } catch (urlErr: any) {
              addUrlLog(`❌ Lỗi khi xử lý link: ${urlErr.message}`);
              return { success: false, duplicate: false, failed: true };
            }
          };

          // Chạy song song toàn bộ URL của file
          const results = await Promise.all(urls.map(processUrl));
          
          // Tổng hợp kết quả đếm
          for (const res of results) {
            if (res.success) {
              downloadedVideosCount++;
              totalDownloaded++;
            }
            else if (res.duplicate) duplicateCount++;
            else if (res.failed) failedCount++;
          }
        }

        // Xóa tệp tin trên Google Drive sau khi xử lý thành công
        addLog(`Đang tiến hành xóa file "${fileName}" trên Drive để dọn dẹp...`);
        try {
          await drive.files.delete({ fileId: fileId! });
          addLog(`Đã xóa file "${fileName}" thành công.`);
        } catch (deleteErr: any) {
          addLog(`⚠️ Không thể xóa file "${fileName}": ${deleteErr.message}. Hãy kiểm tra Service Account có quyền Editor trên thư mục.`);
        }

      } catch (fileErr: any) {
        addLog(`❌ Gặp lỗi khi xử lý file "${fileName}": ${fileErr.message}`);
      }
    }

    addLog(`Đồng bộ Google Drive hoàn tất. Tổng số tệp đã tải về/nhập: ${totalDownloaded}`);
    isSyncActive = false;

    return NextResponse.json({
      success: true,
      message: `Đồng bộ hoàn tất. Phát hiện ${totalUrlsCount} link/tệp ảnh. Đã tải thành công ${downloadedVideosCount} video và ${downloadedImagesCount} ảnh, lỗi ${failedCount} tệp, bỏ qua ${duplicateCount} tệp trùng.`,
      logs: syncLogs,
      totalCount: totalUrlsCount,
      downloadedCount: totalDownloaded,
      downloadedVideosCount: downloadedVideosCount,
      downloadedImagesCount: downloadedImagesCount,
      failedCount: failedCount,
      duplicateCount: duplicateCount,
    });

  } catch (error: any) {
    isSyncActive = false;
    addLog(`❌ Lỗi hệ thống: ${error.message || "Unknown error"}`);
    return NextResponse.json(
      { error: `Lỗi hệ thống khi đồng bộ Drive: ${error.message || "Unknown error"}`, logs: syncLogs },
      { status: 500 }
    );
  }
}
