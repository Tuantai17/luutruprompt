# Hướng Dẫn Cấu Hình API Inbox Tải Video Từ Điện Thoại

Tài liệu này hướng dẫn cách cấu hình phím tắt trên điện thoại Android hoặc iOS để khi lướt TikTok/Facebook/Instagram, bạn chỉ cần bấm nút **Chia sẻ** -> Chọn Phím tắt là video sẽ được tự động tải và lưu vào Cloud Storage, tạo bản ghi trong thư viện cơ sở dữ liệu trên máy tính.

---

## 1. Yêu Cầu Chuẩn Bị Trên Server (Máy Tính/VPS)

Đảm bảo bạn đã cấu hình các biến sau trong file `app/.env.local`:
- `INBOX_API_KEY`: Đặt khóa bảo mật của bạn (ví dụ: `promptvault_inbox_secret_key_2026`).
- `INBOX_DEFAULT_USER_ID`: UUID tài khoản Supabase của bạn (có thể lấy nhanh và copy tại tab **Kết nối điện thoại** trên giao diện website).
- *(Khuyên dùng)* `SUPABASE_SERVICE_ROLE_KEY`: Nếu bạn deploy lên môi trường có bật RLS (Row Level Security), hãy thêm key này vào `.env.local` để backend có quyền ghi trực tiếp bản ghi mà không bị chặn.

---

## 2. Hướng Dẫn Cấu Hình Trên Android (Sử Dụng HTTP Shortcuts)

**HTTP Shortcuts** là ứng dụng miễn phí và mạnh mẽ nhất trên Android để gửi request HTTP trực tiếp từ menu chia sẻ.

### Các bước cài đặt:
1. **Tải ứng dụng**: Lên CH Play và cài đặt ứng dụng **HTTP Shortcuts** (của tác giả Roland Lihlak).
2. **Tạo Shortcut mới**:
   - Mở ứng dụng, nhấn biểu tượng dấu **`+`** ở góc dưới cùng bên phải.
   - Chọn **Create New Shortcut**.
3. **Cấu hình thông tin cơ bản**:
   - **Shortcut Name**: Đặt tên (ví dụ: `Tải về PromptVault` hoặc `SnapSave Downloader`).
   - **Icon**: Chọn icon tùy thích.
4. **Cấu hình Request**:
   - **Method**: Chọn `POST`.
   - **URL**: Nhập địa chỉ API Inbox của bạn.
     - *Ví dụ chạy local cùng mạng Wifi*: `http://<IP_MÁY_TÍNH_CỦA_BẠN>:3000/api/video/inbox` (VD: `http://192.168.1.15:3000/api/video/inbox`).
     - *Ví dụ chạy public qua Ngrok/Cloudflare Tunnel hoặc VPS*: `https://domain-cua-ban.com/api/video/inbox`.
5. **Cấu hình Headers**:
   - Vào mục **Headers**, nhấn **`+`** để thêm header xác thực:
     - **Key**: `x-api-key`
     - **Value**: Nhập giá trị trùng với `INBOX_API_KEY` trong file `.env.local` của bạn (Mặc định là `promptvault_inbox_secret_key_2026`).
   - Thêm header định dạng dữ liệu:
     - **Key**: `Content-Type`
     - **Value**: `application/json`
6. **Cấu hình Request Body**:
   - Vào mục **Body**.
   - Chọn **Request Body Type** là `Custom Text (JSON, XML...)`.
   - Nhập nội dung JSON sau:
     ```json
     {
       "url": "{trigger_value}"
     }
     ```
     *(Trong đó `{trigger_value}` là biến đặc biệt của app để tự động lấy liên kết khi bạn bấm chia sẻ).*
7. **Cấu hình menu Chia sẻ (Share menu)**:
   - Vào mục **Share & Execute**.
   - Bật tùy chọn **Show in Share Menu** (hoặc *Accept shared files/text*).
   - Chọn kiểu dữ liệu chấp nhận là **Text / URL**.
8. **Lưu lại**: Nhấn dấu tích ở góc trên bên phải để lưu shortcut.

**Cách dùng**: Mở TikTok/Facebook -> Nhấn **Chia sẻ** -> Chọn **HTTP Shortcuts** -> Chọn Shortcut vừa tạo. Hệ thống sẽ tải video ngầm và bạn sẽ nhận được thông báo phản hồi thành công trên điện thoại!

---

## 3. Hướng Dẫn Cấu Hinh Trên iOS (Sử Dụng Ứng Dụng Phím Tắt Mặc Định)

Ứng dụng **Phím tắt (Shortcuts)** có sẵn trên mọi thiết bị iOS (iPhone/iPad).

### Các bước cài đặt:
1. Mở ứng dụng **Phím tắt (Shortcuts)** trên iPhone.
2. Nhấn biểu tượng dấu **`+`** ở góc trên bên phải để tạo phím tắt mới.
3. Đặt tên phím tắt ở trên cùng (ví dụ: `Gửi Video SnapSave`).
4. Bật chế độ xuất hiện trong menu chia sẻ:
   - Nhấn vào chữ **`i`** (Chi tiết phím tắt) ở thanh công cụ dưới cùng.
   - Bật tùy chọn **Trong Bảng Chia Sẻ (Show in Share Sheet)**.
   - Ở khối trên cùng, thiết lập: *Phím tắt này nhận **Phần đầu vào của Bảng chia sẻ** nếu **Không có đầu vào** -> **Tiếp tục**.*
   - Nhấn vào chữ **Phần đầu vào của Bảng chia sẻ** và chọn chỉ nhận **URL** và **Văn bản** để tối ưu hóa menu chia sẻ.
5. Thêm các hành động (Actions):
   - **Hành động 1: Lấy URL từ đầu vào**:
     - Tìm kiếm hành động "Lấy URL từ đầu vào" (Get URLs from Input) và thêm vào.
   - **Hành động 2: Lấy nội dung của URL (Get Contents of URL)**:
     - Thêm hành động "Lấy nội dung của URL".
     - Nhấn vào URL đích và nhập địa chỉ API Inbox của bạn (VD: `http://192.168.1.15:3000/api/video/inbox` hoặc domain VPS của bạn).
     - Nhấn vào **Hiển thị thêm (Show More)** để cấu hình:
       - **Phương thức (Method)**: `POST`
       - **Đầu trang (Headers)**: Nhấn **Thêm đầu trang mới**:
         - **Khóa (Key)**: `x-api-key`
         - **Giá trị (Value)**: Nhập API Key bảo mật của bạn.
       - **Yêu cầu nội dung (Request Body)**: Chọn **JSON**. Nhấn **Thêm trường mới**:
         - Loại trường: **Văn bản (Text)**.
         - **Khóa (Key)**: `url`
         - **Giá trị (Value)**: Chọn biến **URL** (đầu ra của hành động 1).
6. **Hành động 3: Hiển thị kết quả**:
   - Thêm hành động "Hiển thị kết quả" (Show Result) và gắn đầu vào là kết quả của hành động 2 để bạn biết video đã tải thành công hay chưa.
7. Nhấn **Xong** ở góc trên bên phải để lưu.

**Cách dùng**: Mở video TikTok -> Chọn **Chia sẻ** -> Chọn **Chia sẻ lên...** -> Chọn phím tắt **Gửi Video SnapSave**. Điện thoại sẽ chạy và thông báo kết quả trả về từ API!
