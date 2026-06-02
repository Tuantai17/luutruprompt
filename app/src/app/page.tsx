"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db, type ImageRecord } from "@/lib/db";
import {
  Images,
  BookOpen,
  Workflow,
  Tag,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";

interface Stats {
  promptCount: number;
  imageCount: number;
  workflowCount: number;
  tagCount: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    promptCount: 0,
    imageCount: 0,
    workflowCount: 0,
    tagCount: 0,
  });
  const [recentImages, setRecentImages] = useState<ImageRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const { setUploadModalOpen } = useAppStore();

  useEffect(() => {
    setMounted(true);
    const loadData = async () => {
      const [promptCount, imageCount, workflowCount, tagCount] =
        await Promise.all([
          db.prompts.count(),
          db.images.count(),
          db.workflows.count(),
          db.tags.count(),
        ]);
      setStats({ promptCount, imageCount, workflowCount, tagCount });

      const images = await db.images
        .orderBy("createdAt")
        .reverse()
        .limit(8)
        .toArray();
      setRecentImages(images);
    };
    loadData();
  }, []);

  if (!mounted) return null;

  const statCards = [
    {
      label: "Tổng Prompt",
      value: stats.promptCount,
      icon: BookOpen,
      color: "var(--accent-purple)",
      gradient: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))",
      href: "/prompts",
    },
    {
      label: "Tổng Ảnh",
      value: stats.imageCount,
      icon: Images,
      color: "var(--accent-cyan)",
      gradient: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))",
      href: "/gallery",
    },
    {
      label: "Workflow",
      value: stats.workflowCount,
      icon: Workflow,
      color: "var(--accent-pink)",
      gradient: "linear-gradient(135deg, rgba(244,114,182,0.15), rgba(244,114,182,0.05))",
      href: "/workflows",
    },
    {
      label: "Thẻ Tags",
      value: stats.tagCount,
      icon: Tag,
      color: "var(--accent-green)",
      gradient: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))",
      href: "/prompts",
    },
  ];

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* Welcome Section */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Sparkles size={28} style={{ color: "var(--accent-purple)" }} />
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            <span className="gradient-text">PromptVault</span> Dashboard
          </h1>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, marginLeft: 40 }}>
          Quản lý ảnh AI, prompt và workflow của bạn tại một nơi.
        </p>
      </div>

      {/* Stats Grid */}
      <div
        className="stagger-children"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className="stat-card animate-fadeIn"
                style={{
                  opacity: 0,
                  background: card.gradient,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "var(--radius-md)",
                      background: `${card.color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={22} style={{ color: card.color }} />
                  </div>
                  <TrendingUp
                    size={16}
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    marginBottom: 4,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {card.value}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    fontWeight: 500,
                  }}
                >
                  {card.label}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {/* Upload Card */}
        <div
          className="glass-card glass-card-hover"
          style={{
            padding: 24,
            cursor: "pointer",
          }}
          onClick={() => setUploadModalOpen(true)}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "var(--radius-lg)",
                background: "var(--gradient-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Upload size={24} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Tải ảnh lên
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                Kéo thả hoặc chọn file PNG, JPG, WEBP
              </p>
            </div>
            <ArrowRight
              size={20}
              style={{ color: "var(--text-muted)" }}
            />
          </div>
        </div>

        {/* Quick Add Prompt */}
        <Link href="/prompts" style={{ textDecoration: "none", color: "inherit" }}>
          <div
            className="glass-card glass-card-hover"
            style={{ padding: 24, cursor: "pointer", height: "100%" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--gradient-warm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap size={24} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                  Thêm Prompt
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Tạo prompt mới cho ảnh, video, chatbot
                </p>
              </div>
              <ArrowRight size={20} style={{ color: "var(--text-muted)" }} />
            </div>
          </div>
        </Link>

        {/* Import */}
        <Link href="/import" style={{ textDecoration: "none", color: "inherit" }}>
          <div
            className="glass-card glass-card-hover"
            style={{ padding: 24, cursor: "pointer", height: "100%" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--gradient-cool)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={24} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                  Nhập dữ liệu
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Import từ Excel, CSV, Word, JSON
                </p>
              </div>
              <ArrowRight size={20} style={{ color: "var(--text-muted)" }} />
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Images */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Clock size={18} style={{ color: "var(--accent-purple)" }} />
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Tải lên gần đây</h2>
          </div>
          <Link
            href="/gallery"
            style={{
              color: "var(--accent-purple)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>

        {recentImages.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 240 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "var(--radius-full)",
                background: "rgba(139,92,246,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Images size={28} style={{ color: "var(--accent-purple)" }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Chưa có ảnh nào</h3>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 14,
                maxWidth: 360,
              }}
            >
              Bắt đầu bằng cách tải ảnh AI lên hoặc import từ file Excel, Word.
            </p>
            <button
              className="btn-primary"
              onClick={() => setUploadModalOpen(true)}
            >
              <Upload size={16} />
              Tải ảnh đầu tiên
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {recentImages.map((img) => (
              <RecentImageCard key={img.id} image={img} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const RecentImageCard = ({ image }: { image: ImageRecord }) => {
  const [thumbUrl, setThumbUrl] = useState<string>("");

  useEffect(() => {
    const blob = image.thumbnailData || image.imageData;
    if (blob) {
      const url = URL.createObjectURL(blob);
      setThumbUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [image]);

  return (
    <div
      className="glass-card glass-card-hover"
      style={{ overflow: "hidden", cursor: "pointer" }}
    >
      <div
        style={{
          aspectRatio: "1",
          background: "var(--bg-tertiary)",
          overflow: "hidden",
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
              transition: "transform var(--transition-slow)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          />
        )}
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {image.title || "Untitled"}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          {formatDate(image.createdAt)}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
