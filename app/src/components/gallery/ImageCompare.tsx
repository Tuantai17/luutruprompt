"use client";

import { useState, useEffect, useRef, MouseEvent, TouchEvent } from "react";
import { type ImageRecord } from "@/lib/db";
import { X, Columns, Sliders, Info, Sparkles } from "lucide-react";
import { formatFileSize } from "@/lib/utils";

interface ImageCompareProps {
  imageA: ImageRecord;
  imageB: ImageRecord;
  onClose: () => void;
}

const ImageCompare = ({ imageA, imageB, onClose }: ImageCompareProps) => {
  const [mode, setMode] = useState<"slider" | "side-by-side">("slider");
  const [sliderPos, setSliderPos] = useState(50); // percentage (0-100)
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    if (imageA.imageData) {
      const url = URL.createObjectURL(imageA.imageData);
      setUrlA(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageA]);

  useEffect(() => {
    if (imageB.imageData) {
      const url = URL.createObjectURL(imageB.imageData);
      setUrlB(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageB]);

  // Handle slider movement
  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setSliderPos(percentage);
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  // Helper to highlight differences
  const renderCompareRow = (label: string, valA: string | number | undefined, valB: string | number | undefined) => {
    const isDifferent = String(valA).trim() !== String(valB).trim();
    return (
      <tr 
        style={{ 
          borderBottom: "1px solid var(--border-primary)",
          background: isDifferent ? "rgba(139,92,246,0.06)" : "transparent"
        }}
      >
        <td 
          style={{ 
            padding: "10px 12px", 
            fontSize: 12, 
            color: "var(--text-muted)", 
            fontWeight: 600, 
            width: "120px",
            textTransform: "uppercase" 
          }}
        >
          {label}
        </td>
        <td 
          style={{ 
            padding: "10px 12px", 
            fontSize: 13, 
            color: isDifferent ? "var(--accent-pink)" : "var(--text-secondary)",
            borderRight: "1px solid var(--border-primary)",
            wordBreak: "break-all"
          }}
        >
          {valA || "-"}
        </td>
        <td 
          style={{ 
            padding: "10px 12px", 
            fontSize: 13, 
            color: isDifferent ? "var(--accent-cyan)" : "var(--text-secondary)",
            wordBreak: "break-all"
          }}
        >
          {valB || "-"}
        </td>
      </tr>
    );
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, padding: 20 }}>
      <div
        className="glass-card animate-scaleIn"
        style={{
          width: "100%",
          maxWidth: 1280,
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--border-primary)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(15,23,42,0.6)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={20} style={{ color: "var(--accent-purple)" }} />
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>
              So sánh ảnh AI
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* View mode buttons */}
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
                onClick={() => setMode("slider")}
                className="btn-icon"
                style={{
                  borderRadius: 0,
                  width: 36,
                  height: 36,
                  background: mode === "slider" ? "rgba(139,92,246,0.18)" : "transparent",
                  color: mode === "slider" ? "var(--accent-purple)" : "var(--text-muted)",
                }}
                title="Kéo trượt (Slider)"
              >
                <Sliders size={16} />
              </button>
              <button
                onClick={() => setMode("side-by-side")}
                className="btn-icon"
                style={{
                  borderRadius: 0,
                  width: 36,
                  height: 36,
                  background: mode === "side-by-side" ? "rgba(139,92,246,0.18)" : "transparent",
                  color: mode === "side-by-side" ? "var(--accent-purple)" : "var(--text-muted)",
                }}
                title="Song song (Side-by-side)"
              >
                <Columns size={16} />
              </button>
            </div>

            <button className="btn-icon" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
          
          {/* Visual Display */}
          <div 
            style={{ 
              height: "48vh", 
              background: "var(--bg-tertiary)", 
              borderBottom: "1px solid var(--border-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
              padding: 16
            }}
          >
            {mode === "side-by-side" ? (
              // --- SIDE BY SIDE MODE ---
              <div 
                style={{ 
                  display: "grid", 
                  gridTemplateColumns: "1fr 1fr", 
                  width: "100%", 
                  height: "100%", 
                  gap: 16 
                }}
              >
                {/* Image A */}
                <div style={{ position: "relative", height: "100%", display: "flex", justifyContent: "center" }}>
                  <img 
                    src={urlA} 
                    alt={imageA.title} 
                    style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", borderRadius: "var(--radius-md)" }}
                  />
                  <div 
                    style={{ 
                      position: "absolute", 
                      left: 12, 
                      top: 12, 
                      background: "rgba(139,92,246,0.85)", 
                      color: "white", 
                      padding: "4px 8px", 
                      borderRadius: "var(--radius-sm)",
                      fontSize: 11,
                      fontWeight: 600
                    }}
                  >
                    ẢNH A (Trái)
                  </div>
                </div>

                {/* Image B */}
                <div style={{ position: "relative", height: "100%", display: "flex", justifyContent: "center" }}>
                  <img 
                    src={urlB} 
                    alt={imageB.title} 
                    style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", borderRadius: "var(--radius-md)" }}
                  />
                  <div 
                    style={{ 
                      position: "absolute", 
                      right: 12, 
                      top: 12, 
                      background: "rgba(6,182,212,0.85)", 
                      color: "white", 
                      padding: "4px 8px", 
                      borderRadius: "var(--radius-sm)",
                      fontSize: 11,
                      fontWeight: 600
                    }}
                  >
                    ẢNH B (Phải)
                  </div>
                </div>
              </div>
            ) : (
              // --- SLIDER MODE ---
              <div 
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                style={{ 
                  position: "relative", 
                  width: "100%", 
                  maxWidth: "750px", 
                  height: "100%", 
                  userSelect: "none",
                  cursor: isDragging.current ? "ew-resize" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {/* Shared Image Frame wrapper */}
                <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", display: "flex", justifyContent: "center" }}>
                  
                  {/* Under layer: Image A (Left side) */}
                  <img 
                    src={urlA} 
                    alt={imageA.title}
                    style={{ 
                      height: "100%", 
                      width: "100%", 
                      objectFit: "contain",
                      pointerEvents: "none",
                      borderRadius: "var(--radius-md)"
                    }}
                  />
                  <div 
                    style={{ 
                      position: "absolute", 
                      left: 12, 
                      top: 12, 
                      background: "rgba(139,92,246,0.85)", 
                      color: "white", 
                      padding: "4px 8px", 
                      borderRadius: "var(--radius-sm)",
                      fontSize: 11,
                      fontWeight: 600,
                      zIndex: 3
                    }}
                  >
                    ẢNH A (Trái)
                  </div>

                  {/* Over layer: Image B (Right side clip) */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      clipPath: `inset(0 0 0 ${sliderPos}%)`,
                      display: "flex",
                      justifyContent: "center",
                      pointerEvents: "none"
                    }}
                  >
                    <img 
                      src={urlB} 
                      alt={imageB.title}
                      style={{ 
                        height: "100%", 
                        width: "100%", 
                        objectFit: "contain",
                        borderRadius: "var(--radius-md)"
                      }}
                    />
                  </div>
                  <div 
                    style={{ 
                      position: "absolute", 
                      right: 12, 
                      top: 12, 
                      background: "rgba(6,182,212,0.85)", 
                      color: "white", 
                      padding: "4px 8px", 
                      borderRadius: "var(--radius-sm)",
                      fontSize: 11,
                      fontWeight: 600,
                      zIndex: 3
                    }}
                  >
                    ẢNH B (Phải)
                  </div>

                  {/* Slider Control Line */}
                  <div
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: `${sliderPos}%`,
                      width: "4px",
                      background: "white",
                      boxShadow: "0 0 10px rgba(0,0,0,0.5)",
                      cursor: "ew-resize",
                      zIndex: 5,
                      transform: "translateX(-50%)",
                    }}
                  >
                    {/* Handle controller button */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "white",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--bg-card)"
                      }}
                    >
                      <Sliders size={18} style={{ transform: "rotate(90deg)" }} />
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Metadata Comparison Table */}
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Info size={18} style={{ color: "var(--accent-purple)" }} />
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>So sánh thông số chi tiết</h3>
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 6 }}>
                (Các hàng có nền màu tím thể hiện sự khác biệt giữa hai ảnh)
              </span>
            </div>

            <div 
              style={{ 
                overflowX: "auto", 
                border: "1px solid var(--border-primary)", 
                borderRadius: "var(--radius-md)",
                background: "rgba(15,23,42,0.2)"
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(15,23,42,0.8)", borderBottom: "1px solid var(--border-primary)" }}>
                    <th style={{ padding: "12px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Thuộc tính</th>
                    <th style={{ padding: "12px", fontSize: 13, fontWeight: 600, color: "var(--accent-purple)", borderRight: "1px solid var(--border-primary)" }}>
                      Ảnh A ({imageA.title || "Untitled"})
                    </th>
                    <th style={{ padding: "12px", fontSize: 13, fontWeight: 600, color: "var(--accent-cyan)" }}>
                      Ảnh B ({imageB.title || "Untitled"})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {renderCompareRow("Prompt", imageA.prompt, imageB.prompt)}
                  {renderCompareRow("Negative Prompt", imageA.negativePrompt, imageB.negativePrompt)}
                  {renderCompareRow("Model AI", imageA.model, imageB.model)}
                  {renderCompareRow("LoRA", imageA.lora, imageB.lora)}
                  {renderCompareRow("Seed", imageA.seed, imageB.seed)}
                  {renderCompareRow("Sampler", imageA.sampler, imageB.sampler)}
                  {renderCompareRow("CFG Scale", imageA.cfgScale, imageB.cfgScale)}
                  {renderCompareRow("Steps", imageA.steps, imageB.steps)}
                  {renderCompareRow("Creator", imageA.creator, imageB.creator)}
                  {renderCompareRow("Kích thước", `${imageA.width}x${imageA.height}`, `${imageB.width}x${imageB.height}`)}
                  {renderCompareRow("Dung lượng", formatFileSize(imageA.fileSize), formatFileSize(imageB.fileSize))}
                  {renderCompareRow("Ghi chú", imageA.note, imageB.note)}
                  {renderCompareRow("Thẻ (Tags)", imageA.tags?.join(", "), imageB.tags?.join(", "))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ImageCompare;
