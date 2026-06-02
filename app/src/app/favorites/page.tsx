"use client";

import { useEffect, useState, useCallback } from "react";
import { db, type Prompt, type ImageRecord } from "@/lib/db";
import { formatDate, truncateText } from "@/lib/utils";
import {
  Heart,
  BookOpen,
  Images,
  Copy,
  Trash2,
  Star,
  ImageIcon,
  Video,
  MessageSquare,
  Workflow,
} from "lucide-react";

const FavoritesPage = () => {
  const [favPrompts, setFavPrompts] = useState<Prompt[]>([]);
  const [favImages, setFavImages] = useState<ImageRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"prompts" | "images">("prompts");

  const loadData = useCallback(async () => {
    const prompts = await db.prompts
      .filter((p) => p.isFavorite)
      .toArray();
    const images = await db.images
      .filter((img) => img.isFavorite)
      .toArray();
    setFavPrompts(prompts);
    setFavImages(images);
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  const toggleFavPrompt = async (id: string) => {
    const prompt = await db.prompts.get(id);
    if (prompt) {
      await db.prompts.update(id, { isFavorite: !prompt.isFavorite });
      loadData();
    }
  };

  const toggleFavImage = async (id: string) => {
    const img = await db.images.get(id);
    if (img) {
      await db.images.update(id, { isFavorite: !img.isFavorite });
      loadData();
    }
  };

  if (!mounted) return null;

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          <span className="gradient-text-warm">Yêu thích</span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          {favPrompts.length} prompt • {favImages.length} ảnh yêu thích
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        <button
          className={tab === "prompts" ? "btn-primary" : "btn-secondary"}
          onClick={() => setTab("prompts")}
          style={{ padding: "8px 16px", fontSize: 13 }}
        >
          <BookOpen size={14} />
          Prompt ({favPrompts.length})
        </button>
        <button
          className={tab === "images" ? "btn-primary" : "btn-secondary"}
          onClick={() => setTab("images")}
          style={{ padding: "8px 16px", fontSize: 13 }}
        >
          <Images size={14} />
          Ảnh ({favImages.length})
        </button>
      </div>

      {tab === "prompts" ? (
        favPrompts.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 200 }}>
            <Heart size={36} style={{ color: "var(--text-muted)" }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Chưa có prompt yêu thích</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              Đánh dấu yêu thích prompt trong Prompt Library.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {favPrompts.map((prompt) => (
              <div key={prompt.id} className="glass-card glass-card-hover" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <Star size={16} fill="var(--accent-amber)" style={{ color: "var(--accent-amber)" }} />
                  <h3 style={{ fontSize: 15, fontWeight: 600, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {prompt.title}
                  </h3>
                  <button className="btn-icon" onClick={() => toggleFavPrompt(prompt.id)} title="Bỏ yêu thích">
                    <Heart size={14} fill="var(--accent-red)" style={{ color: "var(--accent-red)" }} />
                  </button>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, background: "var(--bg-tertiary)", padding: "8px 10px", borderRadius: "var(--radius-sm)", marginBottom: 8 }}>
                  {truncateText(prompt.content, 150)}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(prompt.content)}>
                    <Copy size={14} /> Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        favImages.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 200 }}>
            <Heart size={36} style={{ color: "var(--text-muted)" }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Chưa có ảnh yêu thích</h3>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {favImages.map((img) => (
              <FavImageCard key={img.id} image={img} onToggle={() => toggleFavImage(img.id)} />
            ))}
          </div>
        )
      )}
    </div>
  );
};

const FavImageCard = ({ image, onToggle }: { image: ImageRecord; onToggle: () => void }) => {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const blob = image.thumbnailData || image.imageData;
    if (blob) {
      if (typeof blob === "string") {
        setUrl(blob);
      } else {
        const u = URL.createObjectURL(blob);
        setUrl(u);
        return () => URL.revokeObjectURL(u);
      }
    }
  }, [image]);

  return (
    <div className="glass-card glass-card-hover" style={{ overflow: "hidden" }}>
      <div style={{ aspectRatio: "1", background: "var(--bg-tertiary)", overflow: "hidden", position: "relative" }}>
        {url && <img src={url} alt={image.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <button
          onClick={onToggle}
          className="btn-icon"
          style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", color: "var(--accent-red)", width: 30, height: 30 }}
        >
          <Heart size={14} fill="var(--accent-red)" />
        </button>
      </div>
      <div style={{ padding: "8px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {image.title || "Untitled"}
        </div>
      </div>
    </div>
  );
};

export default FavoritesPage;
