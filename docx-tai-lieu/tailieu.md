Nếu mục tiêu của bạn là xây dựng một **Vũ hội AI** (quản lý ảnh + nhắc nhở + workflow AI) giống như các ảnh bạn chụp màn hình, thì mình khuyên không nên làm kiểu "upload ảnh rồi ghi chú thủ công" đơn thuần.

Nên thiết kế thành một hệ thống như sau:

# Mục tiêu

Tạo web app cho phép:

### Quản lý ảnh AI

* Tải lên nh
* Mỗi ảnh có:
* Nhắc nhở
* Nhắc nhở tiêu cực
* Mô hình
* LoRA
* Hạt giống
* Bộ lấy mẫu
* Người sáng tạo
* thẻ
* Ghi chú / Bình luận

### Quản lý quy trình làm việc

* Lưu quy trình làm việc nhanh chóng
* Lưu nhắc tạo ảnh
* Lưu nhắc tạo video
* Lưu nhắc chatbot

### Nhập dữ liệu

* Excel (.xlsx)
* CSV
* Từ (.docx)
* TXT
* JSON

### Tìm kiếm

* Tìm kiếm lời nhắc toàn văn
* Tìm kiếm theo thẻ
* Tìm kiếm theo mô hình
* Tìm kiếm theo người sáng tạo

### Thư viện ảnh

* Phòng trưng bày Masonry
* Thư viện lưới
* Xem trước hộp đèn
* So sánh 2 ảnh

### Tính năng AI

* Ảnh OCR
* Trích prompt từ ảnh
* Tự động gắn thẻ
* Tìm kiếm ngữ nghĩa b

---

# Công nghệ S

## Mặt trận

<pre class="overflow-visible! px-0!" data-start="964" data-end="1033"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Next.js 15</span><br/><span>TypeScript</span><br/><span>TailwindCSS</span><br/><span>Shadcn/UI</span><br/><span>TanStack Query</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

## Phần phụ trợ

<pre class="overflow-visible! px-0!" data-start="1047" data-end="1092"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>NestJS</span><br/><span>PostgreSQL</span><br/><span>Prisma ORM</span><br/><span>Redis</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

## Lưu trữ

<pre class="overflow-visible! px-0!" data-start="1106" data-end="1141"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>MinIO</span><br/><span>hoặc</span><br/><span>Cloudflare R2</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

## Tìm kiếm

<pre class="overflow-visible! px-0!" data-start="1154" data-end="1173"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>pgvector</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

## Xác thực

<pre class="overflow-visible! px-0!" data-start="1194" data-end="1224"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Clerk</span><br/><span>hoặc</span><br/><span>NextAuth</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

---

# Thiết kế cơ sở dữ liệu

## Nhắc nhở

<pre class="overflow-visible! px-0!" data-start="1261" data-end="1342"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class="relative"><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Prompt</span><br/><span class="ͼt">------</span><br/><span>id</span><br/><span>title</span><br/><span>content</span><br/><span>type</span><br/><span>creator</span><br/><span>tags</span><br/><span>created_at</span><br/><span>updated_at</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

---

## Hình Ảnh

<pre class="overflow-visible! px-0!" data-start="1359" data-end="1448"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class="relative"><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Image</span><br/><span class="ͼt">-----</span><br/><span>id</span><br/><span>title</span><br/><span>image_url</span><br/><span>thumbnail_url</span><br/><span>prompt_id</span><br/><span>creator</span><br/><span>note</span><br/><span>created_at</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

---

## Bình luận

<pre class="overflow-visible! px-0!" data-start="1467" data-end="1524"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class="relative"><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Comment</span><br/><span class="ͼt">-------</span><br/><span>id</span><br/><span>image_id</span><br/><span>content</span><br/><span>created_at</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

---

## Thẻ

<pre class="overflow-visible! px-0!" data-start="1539" data-end="1565"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class="relative"><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Tag</span><br/><span class="ͼt">---</span><br/><span>id</span><br/><span>name</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

---

## Thẻ hình ảnh

<pre class="overflow-visible! px-0!" data-start="1585" data-end="1611"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class="relative"><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>image_id</span><br/><span>tag_id</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

---

# Các chức năng chính

## Tải ảnh lên

<pre class="overflow-visible! px-0!" data-start="1656" data-end="1706"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Drag & Drop</span><br/><br/><span>PNG</span><br/><span>JPG</span><br/><span>WEBP</span><br/><br/><span>Multi Upload</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

---

## Tải lên Excel

Ví dụ:

| Hình Ảnh | Nhắc nhở         | Thẻ             |
| ---------- | ------------------ | ---------------- |
| image1.png | ban công cô gái | Phim hoạt hình |
| image2.png | Phố điện ảnh   | Thực tế        |

Import vào DB tự động.

---

## Tải lên Word

Word chứa:

<pre class="overflow-visible! px-0!" data-start="1937" data-end="1986"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Prompt:</span><br/><span>...</span><br/><br/><span>Negative:</span><br/><span>...</span><br/><br/><span>Model:</span><br/><span>...</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

Parser tự động.

---

# Giao diện

<pre class="overflow-visible! px-0!" data-start="2023" data-end="2177"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Dashboard</span><br/><span>│</span><br/><span>├── Gallery</span><br/><span>│</span><br/><span>├── Prompt Library</span><br/><span>│</span><br/><span>├── Video Prompt</span><br/><span>│</span><br/><span>├── Workflow</span><br/><span>│</span><br/><span>├── Import Excel</span><br/><span>│</span><br/><span>├── Import Word</span><br/><span>│</span><br/><span>├── Search</span><br/><span>│</span><br/><span>└── Settings</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

---

# Prompt cho Antigravity

Bạn có thể đưa nguyên khối dưới đây vào Antigravity:

<pre class="overflow-visible! px-0!" data-start="2264" data-end="3626"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Build a full-stack AI Prompt Asset Management Platform.</span><br/><br/><span>Tech Stack:</span><br/><span>- Next.js 15 App Router</span><br/><span>- TypeScript</span><br/><span>- TailwindCSS</span><br/><span>- Shadcn UI</span><br/><span>- NestJS Backend</span><br/><span>- PostgreSQL</span><br/><span>- Prisma ORM</span><br/><span>- Redis</span><br/><span>- MinIO Storage</span><br/><span>- pgvector for semantic search</span><br/><br/><span>Features:</span><br/><br/><span>1. Authentication</span><br/><span>- Email login</span><br/><span>- Google login</span><br/><span>- Role system</span><br/><br/><span>2. Image Management</span><br/><span>- Upload single image</span><br/><span>- Upload multiple images</span><br/><span>- Drag and drop upload</span><br/><span>- Image preview</span><br/><span>- Lightbox viewer</span><br/><span>- Gallery grid</span><br/><span>- Masonry layout</span><br/><br/><span>3. Prompt Management</span><br/><span>- Create prompt</span><br/><span>- Edit prompt</span><br/><span>- Delete prompt</span><br/><span>- Categorize prompt</span><br/><span>- Prompt version history</span><br/><span>- Tag system</span><br/><br/><span>4. Image Metadata</span><br/><span>- Prompt</span><br/><span>- Negative Prompt</span><br/><span>- Model</span><br/><span>- LoRA</span><br/><span>- Seed</span><br/><span>- Sampler</span><br/><span>- CFG Scale</span><br/><span>- Steps</span><br/><span>- Creator</span><br/><span>- Notes</span><br/><br/><span>5. Comment System</span><br/><span>- Add comments on images</span><br/><span>- Edit comments</span><br/><span>- Delete comments</span><br/><span>- Thread comments</span><br/><br/><span>6. File Import</span><br/><span>- Excel (.xlsx)</span><br/><span>- CSV</span><br/><span>- Word (.docx)</span><br/><span>- TXT</span><br/><span>- JSON</span><br/><br/><span>7. Search</span><br/><span>- Full text search</span><br/><span>- Tag search</span><br/><span>- Model search</span><br/><span>- Creator search</span><br/><span>- Semantic search using pgvector</span><br/><br/><span>8. Storage</span><br/><span>- Store original image</span><br/><span>- Store thumbnail</span><br/><span>- Store imported files</span><br/><br/><span>9. Dashboard</span><br/><span>- Total prompts</span><br/><span>- Total images</span><br/><span>- Total workflows</span><br/><span>- Recent uploads</span><br/><br/><span>10. Responsive UI</span><br/><span>- Desktop</span><br/><span>- Tablet</span><br/><span>- Mobile</span><br/><br/><span>Generate:</span><br/><span>- Database schema</span><br/><span>- Prisma models</span><br/><span>- REST API</span><br/><span>- Frontend pages</span><br/><span>- Upload service</span><br/><span>- Search service</span><br/><span>- Import service</span><br/><span>- Docker setup</span><br/><span>- Production deployment configuration</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

# Nâng cấp đáng làm thêm

Nếu muốn dùng lâu dài cho việc tạo AI Image/Video thì thêm:

<pre class="overflow-visible! px-0!" data-start="3715" data-end="3974"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>- Prompt chaining</span><br/><span>- Workflow templates</span><br/><span>- AI-generated tags</span><br/><span>- Prompt similarity search</span><br/><span>- Stable Diffusion metadata extractor</span><br/><span>- ComfyUI workflow parser</span><br/><span>- Flux metadata parser</span><br/><span>- Video prompt library</span><br/><span>- Favorite system</span><br/><span>- Collection system</span><br/><span>- Team sharing</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

Phiên bản này đủ mạnh để thay thế việc lưu nhắc bằng Facebook, Google Sheet và thư mục ảnh rời rạc, đồng thời có thể mở rộng thành SaaS sau này.
