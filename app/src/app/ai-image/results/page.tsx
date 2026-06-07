"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Image as ImageIcon,
  Sparkles,
  Wand2,
  ExternalLink,
  XCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface ImageJob {
  id: string;
  image_path: string;
  prompt: string;
  status: string;
  result_image_path: string | null;
  chatgpt_image_url: string | null;
  created_at: string;
  updated_at: string;
  retry_count: number;
  error_message: string | null;
}

const ResultsPage = () => {
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<ImageJob | null>(null);
  const [filter, setFilter] = useState<"all" | "SUCCESS" | "FAILED">("all");

  const getAuthToken = async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const fetchJobs = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch("/api/ai-image/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.jobs) {
        // Chỉ hiện jobs đã hoàn thành hoặc thất bại
        setJobs(
          data.jobs.filter(
            (j: ImageJob) => j.status === "SUCCESS" || j.status === "FAILED"
          )
        );
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filteredJobs =
    filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  const successCount = jobs.filter((j) => j.status === "SUCCESS").length;
  const failedCount = jobs.filter((j) => j.status === "FAILED").length;

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/ai-image"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--accent-purple)",
            textDecoration: "none",
            marginBottom: 12,
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} /> Quay lại Automation
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, #10b981, #059669)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
              <span className="gradient-text">Kết quả tạo ảnh</span>
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              {successCount} ảnh thành công, {failedCount} thất bại
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
          }}
        >
          {[
            { key: "all", label: `Tất cả (${jobs.length})` },
            { key: "SUCCESS", label: `Thành công (${successCount})` },
            { key: "FAILED", label: `Thất bại (${failedCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid",
                borderColor:
                  filter === tab.key
                    ? "var(--accent-purple)"
                    : "var(--border-primary)",
                background:
                  filter === tab.key
                    ? "rgba(139, 92, 246, 0.12)"
                    : "transparent",
                color:
                  filter === tab.key
                    ? "var(--accent-purple)"
                    : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div
          style={{
            padding: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <Loader2
            size={20}
            className="animate-spin"
            style={{ color: "var(--accent-purple)" }}
          />
          <span style={{ color: "var(--text-muted)" }}>Đang tải...</span>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div
          className="glass-card"
          style={{ padding: 48, textAlign: "center" }}
        >
          <Wand2
            size={48}
            style={{
              color: "var(--accent-purple)",
              opacity: 0.3,
              marginBottom: 12,
            }}
          />
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: 4,
            }}
          >
            Chưa có kết quả nào
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Chạy automation để tạo ảnh AI
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="glass-card glass-card-hover"
              style={{
                padding: 0,
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onClick={() => setSelectedJob(job)}
            >
              {/* Image Compare */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: job.image_path ? "1fr 1fr" : "1fr",
                  height: 200,
                }}
              >
                {/* Reference Image */}
                {job.image_path && (
                  <div
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      borderRight: "1px solid var(--border-primary)",
                    }}
                  >
                    <img
                      src={job.image_path}
                      alt="Ảnh gốc"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 6,
                        left: 6,
                        background: "rgba(0,0,0,0.7)",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 10,
                        color: "white",
                        fontWeight: 600,
                      }}
                    >
                      Ảnh gốc
                    </div>
                  </div>
                )}

                {/* Result Image */}
                <div style={{ position: "relative", overflow: "hidden" }}>
                  {job.status === "SUCCESS" && job.result_image_path ? (
                    <>
                      <img
                        src={job.result_image_path}
                        alt="Kết quả"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: 6,
                          right: 6,
                          background: "rgba(16, 185, 129, 0.85)",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 10,
                          color: "white",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <CheckCircle size={10} /> Kết quả AI
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(239, 68, 68, 0.05)",
                      }}
                    >
                      <XCircle
                        size={32}
                        style={{ color: "var(--accent-red)", opacity: 0.5 }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--accent-red)",
                          marginTop: 6,
                        }}
                      >
                        Thất bại
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: 14 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-primary)",
                    fontWeight: 500,
                    lineHeight: 1.4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                  title={job.prompt}
                >
                  {job.prompt}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 8,
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} />
                    {new Date(job.created_at).toLocaleString("vi-VN")}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color:
                        job.status === "SUCCESS"
                          ? "var(--accent-green)"
                          : "var(--accent-red)",
                      fontWeight: 600,
                    }}
                  >
                    {job.status === "SUCCESS" ? (
                      <CheckCircle size={12} />
                    ) : (
                      <XCircle size={12} />
                    )}
                    {job.status === "SUCCESS" ? "Thành công" : "Thất bại"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox / Detail Modal */}
      {selectedJob && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: 900,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--text-primary)",
                }}
              >
                Chi tiết kết quả
              </h2>
              <button
                onClick={() => setSelectedJob(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 20,
                }}
              >
                ✕
              </button>
            </div>

            {/* Images Compare */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  selectedJob.image_path ? "1fr 1fr" : "1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {selectedJob.image_path && (
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Ảnh tham chiếu
                  </div>
                  <img
                    src={selectedJob.image_path}
                    alt="Ảnh gốc"
                    style={{
                      width: "100%",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-primary)",
                    }}
                  />
                </div>
              )}

              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Ảnh kết quả AI
                </div>
                {selectedJob.result_image_path ? (
                  <img
                    src={selectedJob.result_image_path}
                    alt="Kết quả"
                    style={{
                      width: "100%",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-primary)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: 200,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--bg-tertiary)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Không có ảnh kết quả
                  </div>
                )}
              </div>
            </div>

            {/* Prompt */}
            <div
              style={{
                background: "var(--bg-tertiary)",
                padding: 14,
                borderRadius: "var(--radius-md)",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Prompt
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                  lineHeight: 1.6,
                }}
              >
                {selectedJob.prompt}
              </div>
            </div>

            {/* Meta */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  background: "var(--bg-tertiary)",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Trạng thái
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color:
                      selectedJob.status === "SUCCESS"
                        ? "var(--accent-green)"
                        : "var(--accent-red)",
                  }}
                >
                  {selectedJob.status === "SUCCESS"
                    ? "✅ Thành công"
                    : "❌ Thất bại"}
                </div>
              </div>
              <div
                style={{
                  background: "var(--bg-tertiary)",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Thời gian tạo
                </div>
                <div style={{ fontSize: 13 }}>
                  {new Date(selectedJob.created_at).toLocaleString("vi-VN")}
                </div>
              </div>
              <div
                style={{
                  background: "var(--bg-tertiary)",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Retry
                </div>
                <div style={{ fontSize: 13 }}>
                  {selectedJob.retry_count} lần
                </div>
              </div>
            </div>

            {/* Error */}
            {selectedJob.error_message && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "var(--radius-md)",
                  padding: 12,
                  marginBottom: 12,
                  fontSize: 12,
                  color: "var(--accent-red)",
                }}
              >
                ⚠️ {selectedJob.error_message}
              </div>
            )}

            {/* Download */}
            {selectedJob.result_image_path && (
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href={selectedJob.result_image_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "10px",
                    background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                    color: "white",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  <ExternalLink size={16} /> Mở ảnh gốc
                </a>
                <a
                  href={selectedJob.result_image_path}
                  download={`ai-image-${selectedJob.id}.png`}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "10px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-primary)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  <Download size={16} /> Tải về
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
