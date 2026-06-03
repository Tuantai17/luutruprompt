# PROMPT NÂNG CẤP CHỨC NĂNG AUTO SYNC GOOGLE DRIVE KHÔNG TRÙNG LẶP CHO SNAPSAVE DOWNLOADER

> **Dành cho**: Cursor AI / Claude Code
> **Mục tiêu**: Nâng cấp tính năng đồng bộ tự động từ Google Drive, giữ nguyên file trên Drive (không xóa), chỉ tải link mới thêm vào (dựa trên MD5 checksum của file và kiểm tra trùng lặp URL trong database), tích hợp hàng đợi BullMQ/Redis (hoặc Cron Engine) và xây dựng giao diện Dashboard theo dõi trực quan.

---

## 1. Bối cảnh dự án hiện tại (Context)
Bạn đang làm việc trên một dự án Next.js (App Router, TypeScript) tích hợp Supabase. Hãy đọc kỹ cấu trúc dự án hiện có trước khi thực hiện:
- **Cơ sở dữ liệu**: Supabase. Client được cấu hình tại `@/lib/supabaseClient` (`src/lib/supabaseClient.ts`) và các helper DB tại `src/lib/db.ts`.
- **API đồng bộ Drive hiện tại**: Nằm tại `src/app/api/video/drive-sync/route.ts`. API này hiện đang:
  - Sử dụng Google Service Account (`GOOGLE_SERVICE_ACCOUNT_KEY` và `GOOGLE_DRIVE_FOLDER_ID` cấu hình trong `.env.local`) để quét file `.txt` trong thư mục `/tiktok`.
  - Đọc nội dung file, parse ra URL video (TikTok, Facebook, Instagram, YouTube).
  - Tải video bằng `downloadViaTikWM` hoặc `downloadViaCobalt`.
  - Tải video buffer và upload lên Storage (Cloudinary / Cloudflare R2 / Supabase Storage).
  - Lưu bản ghi video vào bảng `prompts` với `type = 'video'`.
  - **LƯU Ý QUAN TRỌNG**: Hiện tại logic đang **XÓA** file `.txt` trên Google Drive sau khi tải xong (`drive.files.delete`). Chúng ta cần **loại bỏ hành vi xóa này** và đổi thành cơ chế so khớp MD5 checksum.
- **Giao diện hiện tại**: Nằm tại `src/app/downloader/page.tsx`. Có tab "Đồng bộ Google Drive" thực hiện gọi API `/api/video/drive-sync` thủ công hoặc chạy `setInterval` mỗi 30 giây ở client.

---

## 2. Các yêu cầu nâng cấp chi tiết

### YÊU CẦU 1: Cập nhật Schema Cơ sở dữ liệu (Supabase)
Tạo 2 bảng database mới trên Supabase để phục vụ cho việc chống tải trùng lặp:

1. **Bảng `processed_drive_files`**: Theo dõi các file txt trên Google Drive để tránh quét lại nếu không đổi.
   - `file_id` (text, PRIMARY KEY): ID file trên Google Drive.
   - `file_name` (text): Tên file.
   - `md5_checksum` (text): Checksum MD5 của file từ Google Drive API metadata để nhận biết file có thay đổi nội dung hay không.
   - `processed_at` (timestamp with time zone, default: `now()`): Thời gian xử lý gần nhất.
   - `user_id` (uuid, nullable): Liên kết với user sở hữu (lấy từ auth hoặc mặc định).

2. **Bảng `download_tasks`**: Quản lý trạng thái tải của từng URL.
   - `id` (uuid, PRIMARY KEY, default: `gen_random_uuid()`): ID tác vụ.
   - `source_url` (text, UNIQUE): URL video nguồn (TikTok, Facebook, v.v.).
   - `platform` (text): Nền tảng (tiktok, facebook, instagram, youtube, twitter, other).
   - `status` (text): Trạng thái (`pending`, `processing`, `success`, `failed`).
   - `error_message` (text, nullable): Lưu chi tiết lỗi nếu tải thất bại.
   - `downloaded_at` (timestamp with time zone, nullable): Thời điểm tải thành công.
   - `created_at` (timestamp with time zone, default: `now()`).
   - `user_id` (uuid, nullable): ID người dùng thực hiện.

*Hãy tạo file script SQL hoặc thực hiện migration trực tiếp trên Supabase.*

---

### YÊU CẦU 2: Thuật toán quét và đồng bộ Drive nâng cấp (Sync Engine Logic)
Sửa đổi file `src/app/api/video/drive-sync/route.ts` để triển khai logic sau:
1. **Quét Drive**: Lấy thông tin metadata của các file txt trong thư mục (bao gồm `id`, `name`, `mimeType`, và quan trọng là `md5Checksum`).
2. **Kiểm tra File**: Với mỗi file, truy vấn bảng `processed_drive_files` bằng `file_id`.
   - **Nếu chưa tồn tại**: Tiến hành đọc nội dung file -> Parse danh sách URL -> Lọc URL mới -> Gửi URL vào hàng đợi xử lý -> Lưu bản ghi mới vào `processed_drive_files`.
   - **Nếu đã tồn tại**: So sánh `md5Checksum` hiện tại từ Drive với `md5_checksum` đã lưu trong database:
     - *Nếu trùng khớp*: Bỏ qua file hoàn toàn (không đọc nội dung).
     - *Nếu khác biệt* (người dùng đã cập nhật file txt, ví dụ thêm link mới): Đọc nội dung file -> Parse danh sách URL -> Lọc URL mới -> Gửi URL vào hàng đợi xử lý -> Cập nhật `md5_checksum` và `processed_at` trong `processed_drive_files`.
3. **Lọc URL mới và chống trùng (Duplicate Control)**:
   - Với mỗi URL tìm thấy trong file txt, kiểm tra trong bảng `download_tasks`.
   - Nếu URL đã tồn tại với `status = 'success'`, bỏ qua hoàn toàn.
   - Nếu URL chưa tồn tại (hoặc đã có nhưng trạng thái là `failed` / `pending`):
     - Thêm/Cập nhật URL vào bảng `download_tasks` với trạng thái `pending`.
     - Đưa URL này vào hàng đợi tải (Queue) để xử lý.
4. **KHÔNG XÓA FILE TRÊN DRIVE**: Loại bỏ hoàn toàn khối lệnh `drive.files.delete`.

---

### YÊU CẦU 3: Thiết lập Background Worker với BullMQ & Redis
Để hệ thống hoạt động ổn định và tự động hoàn toàn ở server, hãy thiết lập hàng đợi BullMQ:
1. **Cài đặt các thư viện**: Thêm `bullmq` và `ioredis` vào dự án Next.js (cập nhật `package.json`).
2. **Cấu hình Redis Connection**: Tạo file `src/lib/redis.ts` cấu hình kết nối tới Redis (sử dụng biến môi trường `REDIS_URL` hoặc cấu hình host/port).
3. **Thiết lập Queue & Worker**:
   - **Queue**: Tạo `videoQueue` để quản lý các tác vụ tải video.
   - **Worker**: Tạo một worker xử lý tác vụ tải video (đọc URL từ queue, gọi logic download/upload hiện có, cập nhật bảng `prompts` khi thành công, đồng thời cập nhật `status = 'success'` hoặc `'failed'` và `error_message` vào bảng `download_tasks`).
4. **Tạo Worker Script chạy ngầm độc lập**:
   - Viết một script Node.js/TypeScript chạy ngầm (ví dụ: `src/workers/driveSyncWorker.ts`).
   - Script này sẽ:
     1. Khởi động BullMQ Worker để lắng nghe và tải video từ Redis.
     2. Thiết lập một cron loop chạy mỗi 30 giây (sử dụng `setInterval` hoặc cron library) để tự động gọi logic quét Drive (gọi API route `/api/video/drive-sync` hoặc chạy trực tiếp hàm quét trong code).
   - Thêm câu lệnh khởi chạy worker này vào `package.json` (ví dụ: `"worker": "ts-node src/workers/driveSyncWorker.ts"` hoặc `"worker": "node dist/workers/driveSyncWorker.js"` tùy môi trường build).
5. **Giải pháp fallback gọn nhẹ (Không cần Redis VPS)**: Nếu người dùng không cài đặt Redis/BullMQ, hãy cung cấp thêm tùy chọn tích hợp Cron Job gọi API Route `/api/video/drive-sync` định kỳ thông qua các bên thứ ba như Vercel Cron, Upstash QStash hoặc cron-job.org để kích hoạt tiến trình chạy ngầm.

---

### YÊU CẦU 4: Nâng cấp Giao diện Dashboard quản lý Đồng bộ
Nâng cấp tab "Đồng bộ Google Drive" trong file `src/app/downloader/page.tsx` thành một giao diện quản trị chuyên nghiệp:
1. **Khối Thống kê (Stats Grid)**:
   - **Tổng số file Drive đã xử lý**: Lấy số lượng bản ghi từ bảng `processed_drive_files`.
   - **Tổng số URL phát hiện**: Lấy tổng số lượng bản ghi từ bảng `download_tasks`.
   - **Tải thành công**: Tổng số task có `status = 'success'`.
   - **Lỗi / Thất bại**: Tổng số task có `status = 'failed'`.
   - **Đã bỏ qua (Trùng lặp)**: Tổng số URL không cần tải lại do đã có trong DB.
2. **Giao diện Real-time Worker Status**:
   - Hiển thị trạng thái của Worker (Đang chạy / Ngoại tuyến / Đang quét Drive...).
   - Hiển thị thời gian quét Drive lần cuối (Last Sync Time).
   - Nút "Đồng bộ ngay" (Sync Now) để người dùng có thể kích hoạt quét Drive ngay lập tức bằng tay mà không cần đợi 30 giây.
3. **Bảng Lịch sử Tải video (Download Tasks Table)**:
   - Hiển thị danh sách 10 - 20 URL gần nhất đang được xử lý trong bảng `download_tasks`.
   - Các cột: Nguồn (URL), Nền tảng (Icon tương ứng), Trạng thái (Badge: `Đang chờ`, `Đang tải`, `Thành công`, `Lỗi`), Chi tiết lỗi (nếu có), Thời gian tạo.
   - Hỗ trợ phân trang hoặc cuộn tải thêm.

---

## 3. Quy chuẩn viết Code
- **TypeScript**: Viết code production-ready, khai báo Type đầy đủ.
- **Supabase**: Sử dụng đúng Supabase Client có sẵn. Bảo đảm phân quyền `user_id` chính xác theo từng tài khoản người dùng đăng nhập.
- **Error Handling**: Thêm khối `try-catch`, ghi log lỗi chi tiết lên console hoặc bảng log và cập nhật trạng thái lỗi vào database để dễ dàng debug.
- **Retry Logic**: Đối với việc gọi các API tải video (`Cobalt`, `TikWM`), hãy thực hiện cơ chế tự động thử lại (retry) 2-3 lần nếu gặp lỗi mạng tạm thời trước khi đánh dấu là thất bại.
- **Aesthetics & UX**: Sử dụng Tailwind CSS phù hợp với thiết kế tối, huyền ảo (glassmorphic, gradient ấm áp) sẵn có của trang SnapSave Downloader. Sử dụng các Icon đẹp mắt từ `lucide-react`.

---

*Hãy tiến hành cập nhật mã nguồn theo các yêu cầu trên. Hãy thực hiện từng bước một: nâng cấp DB schema -> cập nhật API Route -> thiết lập Worker/Queue -> nâng cấp React Dashboard UI.*
