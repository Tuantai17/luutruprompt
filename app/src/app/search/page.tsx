"use client";

import { useEffect, useState, useCallback } from "react";
import { db, type Prompt, type ImageRecord } from "@/lib/db";
import Fuse from "fuse.js";
import {
  Search as SearchIcon,
  BookOpen,
  Images,
  Workflow,
  Filter,
  X,
  Copy,
  Eye,
  ImageIcon,
  Video,
  MessageSquare,
} from "lucide-react";
import { truncateText, formatDate } from "@/lib/utils";
import Link from "next/link";

type SearchCategory = "all" | "prompts" | "images";

interface SearchResult {
  type: "prompt" | "image";
  id: string;
  title: string;
  content: string;
  tags: string[];
  model?: string;
  creator?: string;
  createdAt: Date;
}

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allData, setAllData] = useState<SearchResult[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loadData = async () => {
      const [prompts, images] = await Promise.all([
        db.prompts.toArray(),
        db.images.toArray(),
      ]);

      const data: SearchResult[] = [
        ...prompts.map((p) => ({
          type: "prompt" as const,
          id: p.id,
          title: p.title,
          content: p.content,
          tags: p.tags,
          model: p.model,
          creator: p.creator,
          createdAt: p.createdAt,
        })),
        ...images.map((img) => ({
          type: "image" as const,
          id: img.id,
          title: img.title,
          content: img.prompt,
          tags: img.tags,
          model: img.model,
          creator: img.creator,
          createdAt: img.createdAt,
        })),
      ];
      setAllData(data);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let filtered = allData;
    if (category !== "all") {
      const type = category === "prompts" ? "prompt" : "image";
      filtered = allData.filter((d) => d.type === type);
    }

    const fuse = new Fuse(filtered, {
      keys: ["title", "content", "tags", "model", "creator"],
      threshold: 0.3,
      includeScore: true,
    });

    const searchResults = fuse.search(query).map((r) => r.item);
    setResults(searchResults);
  }, [query, category, allData]);

  if (!mounted) return null;

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          <span className="gradient-text">Tìm kiếm</span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Tìm kiếm prompt, ảnh theo nội dung, tag, model, creator.
        </p>
      </div>

      {/* Search Bar */}
      <div
        style={{
          position: "relative",
          marginBottom: 16,
        }}
      >
        <SearchIcon
          size={20}
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
          }}
        />
        <input
          type="text"
          placeholder="Nhập từ khóa tìm kiếm..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-field"
          style={{
            paddingLeft: 44,
            height: 52,
            fontSize: 16,
            borderRadius: "var(--radius-lg)",
          }}
          autoFocus
        />
        {query && (
          <button
            className="btn-icon"
            onClick={() => setQuery("")}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(
          [
            { key: "all", label: "Tất cả", icon: Filter },
            { key: "prompts", label: "Prompt", icon: BookOpen },
            { key: "images", label: "Ảnh", icon: Images },
          ] as const
        ).map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              className={category === cat.key ? "btn-primary" : "btn-secondary"}
              onClick={() => setCategory(cat.key)}
              style={{ padding: "8px 16px", fontSize: 13 }}
            >
              <Icon size={14} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {query && (
        <div style={{ marginBottom: 16, fontSize: 14, color: "var(--text-secondary)" }}>
          {results.length} kết quả cho &quot;{query}&quot;
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {results.map((result) => (
          <div
            key={result.id}
            className="glass-card glass-card-hover"
            style={{ padding: 16 }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-sm)",
                  background:
                    result.type === "prompt"
                      ? "rgba(139,92,246,0.15)"
                      : "rgba(6,182,212,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {result.type === "prompt" ? (
                  <BookOpen
                    size={16}
                    style={{ color: "var(--accent-purple)" }}
                  />
                ) : (
                  <Images size={16} style={{ color: "var(--accent-cyan)" }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {result.title || "Untitled"}
                  </h3>
                  <span
                    className={result.type === "prompt" ? "tag" : "tag tag-cyan"}
                    style={{ fontSize: 10, padding: "1px 6px" }}
                  >
                    {result.type === "prompt" ? "Prompt" : "Ảnh"}
                  </span>
                </div>

                {result.content && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      marginBottom: 8,
                    }}
                  >
                    {truncateText(result.content, 150)}
                  </p>
                )}

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {result.model && (
                    <span className="tag tag-cyan" style={{ fontSize: 10, padding: "1px 6px" }}>
                      {result.model}
                    </span>
                  )}
                  {result.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag" style={{ fontSize: 10, padding: "1px 6px" }}>
                      {tag}
                    </span>
                  ))}
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
                    {formatDate(result.createdAt)}
                  </span>
                </div>
              </div>

              <button
                className="btn-icon"
                onClick={() => {
                  if (result.content) navigator.clipboard.writeText(result.content);
                }}
                title="Copy"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {query && results.length === 0 && (
        <div className="empty-state" style={{ minHeight: 200 }}>
          <SearchIcon size={36} style={{ color: "var(--text-muted)" }} />
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>
            Không tìm thấy kết quả
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Thử tìm kiếm với từ khóa khác.
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
