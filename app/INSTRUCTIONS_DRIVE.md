# Hướng Dẫn Chi Tiết Cấu Hình Đồng Bộ Google Drive (Drive Sync Engine)

Để hệ thống tự động quét thư mục `tiktok` trên Google Drive của bạn, đọc nội dung file `.txt` và tải video về, bạn cần cấu hình tài khoản dịch vụ của Google (Google Service Account). Dưới đây là hướng dẫn chi tiết từng bước một.

---

## BƯỚC 1: TẠO GOOGLE CLOUD PROJECT
1. Truy cập vào **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Đăng nhập bằng tài khoản Google của bạn.
3. Ở thanh công cụ trên cùng, nhấp vào ô chọn dự án (hoặc danh sách dự án hiện tại) và chọn **Dự án mới (New Project)**.
4. Đặt tên cho dự án (ví dụ: `PromptVault-Drive-Sync`) và nhấn **Tạo (Create)**. Chờ vài giây để Google tạo xong dự án.

---

## BƯỚC 2: BẬT GOOGLE DRIVE API
1. Đảm bảo bạn đã chọn đúng dự án vừa tạo ở trên cùng.
2. Nhấp vào biểu tượng **Menu (3 gạch ngang ở góc trái)** -> chọn **API & Dịch vụ (APIs & Services)** -> **Thư viện (Library)**.
3. Trong thanh tìm kiếm, nhập từ khóa `Google Drive API` và nhấn Enter.
4. Nhấp chọn kết quả **Google Drive API**.
5. Nhấn nút **Bật (Enable)** để kích hoạt API cho dự án của bạn.

---

## BƯỚC 3: TẠO SERVICE ACCOUNT (TÀI KHOẢN DỊCH VỤ)
Tài khoản dịch vụ hoạt động như một "người dùng bot" đại diện cho server của bạn để truy cập vào Google Drive.
1. Nhấp vào **Menu** -> chọn **IAM & Quản trị (IAM & Admin)** -> **Tài khoản dịch vụ (Service Accounts)**.
2. Nhấp vào nút **Tạo tài khoản dịch vụ (Create Service Account)** ở thanh công cụ trên cùng.
3. Điền các thông tin:
   - **Tên tài khoản dịch vụ (Service account name)**: Nhập `drive-sync-bot`
   - **Mô tả tài khoản dịch vụ**: `Bot tự động đồng bộ video từ Drive về PromptVault`
4. Nhấn **Tạo và tiếp tục (Create and Continue)**.
5. Phần gán vai trò quyền hạn (Role), chọn vai trò là **Chủ sở hữu (Owner)** hoặc **Người trình biên tập (Editor)**.
6. Nhấn **Tiếp tục** rồi nhấn **Xong (Done)** ở cuối cùng.

---

## BƯỚC 4: TẠO VÀ TẢI MÃ KHÓA JSON (JSON KEY)
1. Trong danh sách tài khoản dịch vụ vừa tạo, bạn sẽ thấy một địa chỉ email dạng: `drive-sync-bot@<project-id>.iam.gserviceaccount.com`. **Hãy copy lại địa chỉ email này.**
2. Nhấp chuột vào email đó để xem chi tiết.
3. Chuyển sang tab **Khóa (Keys)** ở thanh menu phía trên.
4. Nhấp vào nút **Thêm khóa (Add Key)** -> chọn **Tạo khóa mới (Create new key)**.
5. Chọn định dạng khóa là **JSON** (mặc định) và nhấn **Tạo (Create)**.
6. Một tệp tin `.json` chứa mã khóa bảo mật sẽ tự động được tải xuống máy tính của bạn.

---

## BƯỚC 5: CHIA SẺ THƯ MỤC GOOGLE DRIVE CHO SERVICE ACCOUNT
Google Drive có tính bảo mật cao, do đó bạn phải cho phép "tài khoản bot" này truy cập vào thư mục của bạn.
1. Mở trang **[Google Drive](https://drive.google.com/)** của bạn trên trình duyệt.
2. Tìm đến thư mục `tiktok` mà bạn dùng để upload file link (Dựa trên ảnh chụp màn hình của bạn là thư mục `tiktok` có ID `1WS-Ts0AiofSYK-1tqZeRId02SRSwUdh9`).
3. Nhấp chuột phải vào thư mục này -> Chọn **Chia sẻ (Share)** -> **Chia sẻ (Share)**.
4. Dán địa chỉ email của Service Account bạn đã copy ở **Bước 4 (Mục 1)** vào ô mời thành viên.
5. Đặt vai trò là **Người chỉnh sửa (Editor)** để bot có quyền xóa file `.txt` sau khi đã tải xong video.
6. Bỏ chọn *Gửi thông báo cho mọi người* (để tránh lỗi nếu có) và nhấn **Gửi (Send)** hoặc **Chia sẻ (Share)**.

---

## BƯỚC 6: CẬP NHẬT CẤU HÌNH VÀO DỰ ÁN
1. Mở file [app/.env.local](file:///e:/LuuTru-anh-prompt/app/.env.local) trong mã nguồn của bạn.
2. Tìm đến dòng `GOOGLE_SERVICE_ACCOUNT_KEY=`.
3. Mở file `.json` bạn đã tải về ở **Bước 4** bằng Notepad hoặc VS Code. Copy **toàn bộ nội dung** trong file đó (tất cả các dấu ngoặc nhọn `{...}`).
4. Dán vào sau dấu `=` trong biến môi trường dưới dạng chuỗi có bao quanh bởi dấu nháy đơn `'`:
   ```env
   GOOGLE_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": "...", ...}'
   ```
   *(Việc sử dụng dấu nháy đơn `'` bao quanh giúp Node.js hiểu đúng các ký tự xuống dòng `\n` bên trong mã khóa Private Key của Google).*
5. Điền ID thư mục Drive của bạn:
   ```env
   GOOGLE_DRIVE_FOLDER_ID=1WS-Ts0AiofSYK-1tqZeRId02SRSwUdh9
   ```
6. Điền User ID Supabase của bạn (có thể lấy nhanh bằng cách bấm nút Copy trên giao diện Tab **Đồng bộ Google Drive**):
   ```env
   INBOX_DEFAULT_USER_ID=your-supabase-user-uuid
   ```
7. Khởi động lại Server dự án (`npm run dev`) để thay đổi có hiệu lực.

Chúc bạn cấu hình thành công! Mọi tiến trình chạy sẽ được hiển thị trực quan ở bảng Live Logs trên giao diện web.
