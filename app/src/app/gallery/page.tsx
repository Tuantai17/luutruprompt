"use client";

import { useEffect, useState, useCallback } from "react";
import { db, deleteImage, type ImageRecord } from "@/lib/db";
import { useAppStore } from "@/lib/store";
import {
  Images,
  Grid3X3,
  LayoutGrid,
  Upload,
  Heart,
  Trash2,
  Eye,
  Sliders,
  Filter,
  SortDesc,
  Check,
  X,
  Copy,
} from "lucide-react";
import UploadModal from "@/components/gallery/UploadModal";
import Lightbox from "@/components/gallery/Lightbox";
import ImageCompare from "@/components/gallery/ImageCompare";

const GalleryPage = () => {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  // --- Compare Mode States ---
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [compareImages, setCompareImages] = useState<[ImageRecord, ImageRecord] | null>(null);

  const {
    galleryView,
    setGalleryView,
    uploadModalOpen,
    setUploadModalOpen,
  } = useAppStore();

  const loadImages = useCallback(async () => {
    const imgs = await db.images.orderBy("createdAt").reverse().toArray();
    setImages(imgs);
  }, []);

  useEffect(() => {
    setMounted(true);
    loadImages();
  }, [loadImages]);

  const handleDelete = async (id: string) => {
    await deleteImage(id);
    setLightboxId(null);
    loadImages();
  };

  const handleSelectCompare = (id: string) => {
    setSelectedCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 2) {
        // Replace the second selection
        return [prev[0], id];
      }
      return [...prev, id];
    });
  };

  const handleStartCompare = () => {
    if (selectedCompareIds.length !== 2) return;
    const imgA = images.find((img) => img.id === selectedCompareIds[0]);
    const imgB = images.find((img) => img.id === selectedCompareIds[1]);
    if (imgA && imgB) {
      setCompareImages([imgA, imgB]);
    }
  };

  const handleCancelCompareMode = () => {
    setIsCompareMode(false);
    setSelectedCompareIds([]);
  };

  if (!mounted) return null;

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: isCompareMode ? 80 : 20 }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            <span className="gradient-text">Thư viện ảnh</span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            {images.length} ảnh trong bộ sưu tập
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* View toggle */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-tertiary)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-primary)",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setGalleryView("masonry")}
              className="btn-icon"
              style={{
                borderRadius: 0,
                background:
                  galleryView === "masonry"
                    ? "rgba(139,92,246,0.15)"
                    : "transparent",
                color:
                  galleryView === "masonry"
                    ? "var(--accent-purple)"
                    : "var(--text-muted)",
              }}
              title="Masonry"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setGalleryView("grid")}
              className="btn-icon"
              style={{
                borderRadius: 0,
                background:
                  galleryView === "grid"
                    ? "rgba(139,92,246,0.15)"
                    : "transparent",
                color:
                  galleryView === "grid"
                    ? "var(--accent-purple)"
                    : "var(--text-muted)",
              }}
              title="Grid"
            >
              <Grid3X3 size={16} />
            </button>
          </div>

          {/* Compare trigger button */}
          <button
            className="btn-secondary"
            style={{
              padding: "8px 12px",
              background: isCompareMode ? "rgba(139,92,246,0.15)" : "transparent",
              color: isCompareMode ? "var(--accent-purple)" : "var(--text-secondary)",
              borderColor: isCompareMode ? "var(--accent-purple)" : "var(--border-primary)",
            }}
            onClick={() => {
              setIsCompareMode(!isCompareMode);
              setSelectedCompareIds([]);
            }}
          >
            <Sliders size={14} />
            <span style={{ fontSize: 13 }}>So sánh</span>
          </button>

          <button className="btn-secondary" style={{ padding: "8px 12px" }}>
            <Filter size={14} />
            <span style={{ fontSize: 13 }}>Lọc</span>
          </button>

          <button className="btn-secondary" style={{ padding: "8px 12px" }}>
            <SortDesc size={14} />
            <span style={{ fontSize: 13 }}>Sắp xếp</span>
          </button>

          <button
            className="btn-primary"
            onClick={() => setUploadModalOpen(true)}
          >
            <Upload size={16} />
            Tải lên
          </button>
        </div>
      </div>

      {/* Gallery */}
      {images.length === 0 ? (
        <div className="empty-state" style={{ minHeight: 400 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "var(--radius-full)",
              background: "rgba(139,92,246,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Images size={36} style={{ color: "var(--accent-purple)" }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>
            Thư viện trống
          </h3>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 14,
              maxWidth: 400,
            }}
          >
            Bắt đầu bằng cách tải ảnh AI lên. Hỗ trợ kéo thả và nhiều ảnh
            cùng lúc.
          </p>
          <button
            className="btn-primary"
            onClick={() => setUploadModalOpen(true)}
          >
            <Upload size={16} />
            Tải ảnh đầu tiên
          </button>
        </div>
      ) : galleryView === "masonry" ? (
        <div className="masonry-grid">
          {images.map((img, idx) => (
            <ImageCard
              key={img.id}
              image={img}
              onClick={() => setLightboxId(img.id)}
              onDelete={() => handleDelete(img.id)}
              isCompareMode={isCompareMode}
              isSelected={selectedCompareIds.includes(img.id)}
              onSelectCompare={() => handleSelectCompare(img.id)}
              style={{ animationDelay: `${idx * 0.05}s` }}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {images.map((img, idx) => (
            <ImageCard
              key={img.id}
              image={img}
              onClick={() => setLightboxId(img.id)}
              onDelete={() => handleDelete(img.id)}
              isCompareMode={isCompareMode}
              isSelected={selectedCompareIds.includes(img.id)}
              onSelectCompare={() => handleSelectCompare(img.id)}
              gridMode
              style={{ animationDelay: `${idx * 0.05}s` }}
            />
          ))}
        </div>
      )}

      {/* Floating Compare Action Bar */}
      {isCompareMode && (
        <div
          className="glass-card animate-scaleIn"
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            maxWidth: 580,
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 100,
            border: "1px solid var(--accent-purple)",
            boxShadow: "0 10px 30px rgba(139,92,246,0.25)",
            background: "rgba(15,23,42,0.85)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "rgba(139,92,246,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-purple)",
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {selectedCompareIds.length}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500 }}>
              Đang chọn ảnh để so sánh (tối đa 2 ảnh)
            </span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn-secondary"
              onClick={handleCancelCompareMode}
              style={{ padding: "8px 16px" }}
            >
              Hủy
            </button>
            <button
              className="btn-primary"
              disabled={selectedCompareIds.length !== 2}
              onClick={handleStartCompare}
              style={{
                padding: "8px 16px",
                opacity: selectedCompareIds.length === 2 ? 1 : 0.5,
                cursor: selectedCompareIds.length === 2 ? "pointer" : "not-allowed",
              }}
            >
              So sánh ngay
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onComplete={loadImages}
      />

      {/* Lightbox */}
      {lightboxId && (
        <Lightbox
          images={images}
          currentId={lightboxId}
          onClose={() => setLightboxId(null)}
          onDelete={handleDelete}
          onUpdate={loadImages}
        />
      )}

      {/* Image Compare Modal */}
      {compareImages && (
        <ImageCompare
          imageA={compareImages[0]}
          imageB={compareImages[1]}
          onClose={() => setCompareImages(null)}
        />
      )}
    </div>
  );
};

// ===== Image Card =====
const ImageCard = ({
  image,
  onClick,
  onDelete,
  gridMode,
  style,
  isCompareMode,
  isSelected,
  onSelectCompare,
}: {
  image: ImageRecord;
  onClick: () => void;
  onDelete: () => void;
  gridMode?: boolean;
  style?: React.CSSProperties;
  isCompareMode?: boolean;
  isSelected?: boolean;
  onSelectCompare?: () => void;
}) => {
  const [thumbUrl, setThumbUrl] = useState<string>("");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const blob = image.thumbnailData || image.imageData;
    if (blob) {
      const url = URL.createObjectURL(blob);
      setThumbUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [image]);

  const handleCardClick = () => {
    if (isCompareMode && onSelectCompare) {
      onSelectCompare();
    } else {
      onClick();
    }
  };

  return (
    <div
      className="glass-card animate-fadeIn"
      style={{
        opacity: 0,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        border: isSelected ? "2px solid var(--accent-purple)" : "1px solid var(--border-primary)",
        boxShadow: isSelected ? "0 0 15px rgba(139,92,246,0.3)" : "none",
        ...style,
      }}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
      onClick={handleCardClick}
    >
      {/* Image */}
      <div
        style={{
          aspectRatio: gridMode ? "1" : undefined,
          background: "var(--bg-tertiary)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt={image.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "transform var(--transition-slow)",
            }}
            onMouseEnter={(e) => {
              if (!isCompareMode) {
                e.currentTarget.style.transform = "scale(1.06)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isCompareMode) {
                e.currentTarget.style.transform = "scale(1)";
              }
            }}
          />
        )}

        {/* Compare Checkbox Badge */}
        {isCompareMode && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: isSelected ? "var(--accent-purple)" : "rgba(15,23,42,0.6)",
              border: `2px solid ${isSelected ? "var(--accent-cyan)" : "rgba(255,255,255,0.6)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
              transition: "all var(--transition-fast)",
            }}
          >
            {isSelected && <Check size={12} color="white" strokeWidth={3} />}
          </div>
        )}

        {/* Hover overlay (only show when not in compare mode) */}
        {!isCompareMode && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
              opacity: showMenu ? 1 : 0,
              transition: "opacity var(--transition-fast)",
              display: "flex",
              alignItems: "flex-end",
              padding: 10,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="btn-icon"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "white",
                  width: 30,
                  height: 30,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                <Eye size={14} />
              </button>
              <button
                className="btn-icon"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "white",
                  width: 30,
                  height: 30,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Heart size={14} />
              </button>
              <button
                className="btn-icon"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "white",
                  width: 30,
                  height: 30,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Container with Prompt and Quick Copy */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1
            }}
            title={image.title || "Untitled"}
          >
            {image.title || "Untitled"}
          </div>
          
        {/* Prompt Section */}
        {image.prompt && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Prompt</span>
              {!isCompareMode && <QuickCopyButton text={image.prompt} />}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-primary)",
                lineHeight: 1.4,
                fontFamily: "Consolas, Monaco, monospace",
                background: "rgba(10,10,15,0.45)",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid rgba(255,255,255,0.03)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxHeight: "36px",
                wordBreak: "break-all"
              }}
              title={image.prompt}
            >
              {image.prompt}
            </div>
          </div>
        )}

        {/* Negative Prompt Section */}
        {image.negativePrompt && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Negative Prompt</span>
              {!isCompareMode && <QuickCopyButton text={image.negativePrompt} />}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                lineHeight: 1.4,
                fontFamily: "Consolas, Monaco, monospace",
                background: "rgba(10,10,15,0.45)",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid rgba(255,255,255,0.03)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxHeight: "36px",
                wordBreak: "break-all"
              }}
              title={image.negativePrompt}
            >
              {image.negativePrompt}
            </div>
          </div>
        )}

        {/* Tags */}
        {image.tags && image.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
            {image.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="tag"
                style={{ fontSize: 9, padding: "2px 6px", background: "rgba(139,92,246,0.08)", color: "#c4b5fd" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== Quick Copy Helper Component for Cards =====
const QuickCopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop opening lightbox
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.05)"}`,
        color: copied ? "var(--accent-green)" : "var(--text-muted)",
        cursor: "pointer",
        width: 24,
        height: 24,
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        flexShrink: 0,
        outline: "none"
      }}
      title="Sao chép Prompt nhanh"
    >
      {copied ? (
        <Check size={11} strokeWidth={3.5} style={{ color: "var(--accent-green)" }} />
      ) : (
        <Copy size={10} />
      )}
    </button>
  );
};

export default GalleryPage;
