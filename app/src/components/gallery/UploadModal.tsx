"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { createImage } from "@/lib/db";
import { extractMetadata, type ExtractedMetadata } from "@/lib/metadataExtractor";
import { Upload, X, Check, Loader2, ImageIcon, Sparkles } from "lucide-react";

interface UploadFile {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  title: string;
  metadata?: Partial<ExtractedMetadata>;
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const UploadModal = ({ open, onClose, onComplete }: UploadModalProps) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
      title: file.name.replace(/\.[^.]+$/, ""),
    }));
    
    // Cập nhật state list files trước
    setFiles((prev) => {
      const updatedList = [...prev, ...newFiles];
      
      // Chạy trích xuất metadata không đồng bộ
      newFiles.forEach((fileObj, idx) => {
        extractMetadata(fileObj.file).then((meta) => {
          if (meta && Object.keys(meta).length > 0) {
            setFiles((currentFiles) => {
              // Tìm đúng file trong danh sách hiện tại dựa trên tên file và size
              return currentFiles.map((f) => {
                if (f.file.name === fileObj.file.name && f.file.size === fileObj.file.size) {
                  return { ...f, metadata: meta };
                }
                return f;
              });
            });
          }
        });
      });

      return updatedList;
    });
  }, []);

  const handleDownloadFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;

    setFetchingUrl(true);
    setUrlError("");

    try {
      const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(trimmed)}`);
      if (!response.ok) {
        throw new Error("Không thể tải ảnh từ URL này. Vui lòng thử URL khác.");
      }

      const blob = await response.blob();
      const contentType = blob.type || "image/jpeg";
      const extension = contentType.split("/")[1] || "jpg";
      
      let filename = "url-image-" + Date.now();
      try {
        const urlObj = new URL(trimmed);
        const pathname = urlObj.pathname;
        const base = pathname.substring(pathname.lastIndexOf("/") + 1);
        if (base && base.includes(".")) {
          filename = base.split(".")[0];
        }
      } catch {}

      const file = new File([blob], `${filename}.${extension}`, { type: contentType });
      
      const fileObj: UploadFile = {
        file,
        preview: URL.createObjectURL(file),
        status: "pending" as const,
        title: filename,
      };

      setFiles((prev) => [...prev, fileObj]);
      setImageUrlInput("");

      // Extract metadata
      extractMetadata(file).then((meta) => {
        if (meta && Object.keys(meta).length > 0) {
          setFiles((currentFiles) => {
            return currentFiles.map((f) => {
              if (f.file.name === file.name && f.file.size === file.size) {
                return { ...f, metadata: meta };
              }
              return f;
            });
          });
        }
      });
    } catch (err: any) {
      setUrlError(err.message || "Có lỗi xảy ra khi tải ảnh.");
    } finally {
      setFetchingUrl(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateTitle = (index: number, title: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, title } : f)),
    );
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading" } : f,
        ),
      );

      try {
        const file = files[i].file;
        const meta = files[i].metadata || {};

        // Tạo thumbnail
        let thumbnailBlob: Blob | null = null;
        try {
          const compressed = await imageCompression(file, {
            maxSizeMB: 0.1,
            maxWidthOrHeight: 400,
            useWebWorker: true,
          });
          thumbnailBlob = compressed;
        } catch {
          thumbnailBlob = null;
        }

        // Lấy kích thước ảnh
        const dimensions = await getImageDimensions(file);

        await createImage({
          title: files[i].title,
          imageData: file,
          thumbnailData: thumbnailBlob,
          promptId: null,
          prompt: meta.prompt || "",
          negativePrompt: meta.negativePrompt || "",
          model: meta.model || "",
          lora: meta.lora || "",
          seed: meta.seed || "",
          sampler: meta.sampler || "",
          cfgScale: meta.cfgScale !== undefined ? meta.cfgScale : 7,
          steps: meta.steps !== undefined ? meta.steps : 20,
          creator: meta.creator || "",
          note: "",
          width: dimensions.width,
          height: dimensions.height,
          fileSize: file.size,
          format: file.type.split("/")[1] || "unknown",
          tags: meta.tags || [],
          isFavorite: false,
        });

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "done" } : f,
          ),
        );
      } catch {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error" } : f,
          ),
        );
      }
    }

    setUploading(false);
    setTimeout(() => {
      onComplete();
      onClose();
      setFiles([]);
    }, 800);
  };

  const handleClose = () => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 680, padding: 0 }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-primary)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>
            <span className="gradient-text">Tải ảnh lên</span>
          </h2>
          <button className="btn-icon" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`upload-zone ${isDragActive ? "upload-zone-active" : ""}`}
            style={{ marginBottom: files.length > 0 ? 20 : 0 }}
          >
            <input {...getInputProps()} />
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--radius-full)",
                background: "rgba(139,92,246,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Upload
                size={24}
                style={{
                  color: isDragActive
                    ? "var(--accent-cyan)"
                    : "var(--accent-purple)",
                }}
              />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                {isDragActive
                  ? "Thả ảnh vào đây..."
                  : "Kéo thả ảnh hoặc click để chọn"}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Hỗ trợ PNG, JPG, WEBP • Nhiều ảnh cùng lúc
              </p>
            </div>
          </div>

          {/* OR Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "16px 0",
              color: "var(--text-muted)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "var(--border-primary)" }} />
            <span>HOẶC NHẬP URL HÌNH ẢNH</span>
            <div style={{ flex: 1, height: "1px", background: "var(--border-primary)" }} />
          </div>

          {/* URL Input Form */}
          <form
            onSubmit={handleDownloadFromUrl}
            style={{
              display: "flex",
              gap: 8,
              marginBottom: files.length > 0 || urlError ? 12 : 0,
            }}
          >
            <input
              type="text"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="Dán địa chỉ hình ảnh (URL) vào đây..."
              className="input-field"
              style={{
                flex: 1,
                height: 40,
                fontSize: 13,
              }}
              disabled={fetchingUrl || uploading}
            />
            <button
              type="submit"
              className="btn-primary"
              style={{
                height: 40,
                padding: "0 16px",
                whiteSpace: "nowrap",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 100,
                justifyContent: "center",
              }}
              disabled={fetchingUrl || !imageUrlInput.trim() || uploading}
            >
              {fetchingUrl ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Đang tải...
                </>
              ) : (
                "Tải xuống"
              )}
            </button>
          </form>

          {urlError && (
            <p
              style={{
                fontSize: 12,
                color: "var(--accent-red)",
                marginTop: 0,
                marginBottom: files.length > 0 ? 20 : 0,
                fontWeight: 500,
              }}
            >
              ⚠️ {urlError}
            </p>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {files.map((f, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-primary)",
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "var(--radius-sm)",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "var(--bg-card)",
                    }}
                  >
                    <img
                      src={f.preview}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>

                  {/* Title input & Metadata preview */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    <input
                      type="text"
                      value={f.title}
                      onChange={(e) => updateTitle(idx, e.target.value)}
                      className="input-field"
                      style={{
                        width: "100%",
                        height: 34,
                        fontSize: 13,
                        background: "var(--bg-card)",
                      }}
                      placeholder="Tiêu đề ảnh..."
                      disabled={uploading}
                    />
                    {f.metadata && Object.keys(f.metadata).length > 0 && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--accent-cyan)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontWeight: 500,
                        }}
                      >
                        <Sparkles size={12} style={{ color: "var(--accent-cyan)" }} />
                        <span>
                          {f.metadata.prompt
                            ? `Tự động nhận diện: ${f.metadata.prompt.substring(0, 40)}${f.metadata.prompt.length > 40 ? "..." : ""}`
                            : "Đã trích xuất thông số ảnh AI"}
                          {f.metadata.model ? ` [${f.metadata.model}]` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status / Remove */}
                  {f.status === "done" ? (
                    <Check
                      size={18}
                      style={{ color: "var(--accent-green)", flexShrink: 0 }}
                    />
                  ) : f.status === "uploading" ? (
                    <Loader2
                      size={18}
                      style={{
                        color: "var(--accent-purple)",
                        flexShrink: 0,
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  ) : f.status === "error" ? (
                    <X
                      size={18}
                      style={{ color: "var(--accent-red)", flexShrink: 0 }}
                    />
                  ) : (
                    <button
                      className="btn-icon"
                      onClick={() => removeFile(idx)}
                      style={{ flexShrink: 0 }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {files.length > 0 && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--border-primary)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              <ImageIcon
                size={14}
                style={{ display: "inline", marginRight: 4 }}
              />
              {files.length} ảnh được chọn
            </span>
            <button
              className="btn-primary"
              onClick={handleUpload}
              disabled={uploading}
              style={{ opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? (
                <>
                  <Loader2
                    size={16}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  Đang tải lên...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Tải lên tất cả
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

// Helper: lấy kích thước ảnh
const getImageDimensions = (
  file: File,
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = URL.createObjectURL(file);
  });
};

export default UploadModal;
