"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { createPrompt, createImage, type PromptType } from "@/lib/db";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import {
  FileUp,
  FileSpreadsheet,
  FileText,
  FileJson,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  X,
  FileType,
} from "lucide-react";

type ImportType = "excel" | "csv" | "word" | "txt" | "json";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const importTypes: {
  type: ImportType;
  label: string;
  icon: typeof FileSpreadsheet;
  accept: Record<string, string[]>;
  description: string;
  color: string;
}[] = [
  {
    type: "excel",
    label: "Excel (.xlsx)",
    icon: FileSpreadsheet,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    description: "Import prompt từ file Excel với các cột: Title, Prompt, Negative, Model, Tags...",
    color: "var(--accent-green)",
  },
  {
    type: "csv",
    label: "CSV",
    icon: FileText,
    accept: { "text/csv": [".csv"] },
    description: "Import từ file CSV với cùng định dạng cột như Excel.",
    color: "var(--accent-cyan)",
  },
  {
    type: "word",
    label: "Word (.docx)",
    icon: FileType,
    accept: {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    description: "Parse prompt từ file Word. Format: Prompt: ... / Negative: ... / Model: ...",
    color: "var(--accent-blue)",
  },
  {
    type: "txt",
    label: "TXT",
    icon: FileText,
    accept: { "text/plain": [".txt"] },
    description: "Import từ file text. Mỗi dòng hoặc mỗi block là một prompt.",
    color: "var(--accent-amber)",
  },
  {
    type: "json",
    label: "JSON",
    icon: FileJson,
    accept: { "application/json": [".json"] },
    description: "Import từ file JSON. Hỗ trợ array of objects hoặc object.",
    color: "var(--accent-purple)",
  },
];

const ImportPage = () => {
  const [selectedType, setSelectedType] = useState<ImportType>("excel");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const currentType = importTypes.find((t) => t.type === selectedType)!;

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setImporting(true);
      setResult(null);

      const file = acceptedFiles[0];
      let importResult: ImportResult = { success: 0, failed: 0, errors: [] };

      try {
        switch (selectedType) {
          case "excel":
            importResult = await importExcel(file);
            break;
          case "csv":
            importResult = await importCSV(file);
            break;
          case "txt":
            importResult = await importTXT(file);
            break;
          case "json":
            importResult = await importJSON(file);
            break;
          case "word":
            importResult = await importWord(file);
            break;
        }
      } catch (err) {
        importResult.errors.push(`Lỗi: ${err instanceof Error ? err.message : "Unknown"}`);
      }

      setResult(importResult);
      setImporting(false);
    },
    [selectedType],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: currentType.accept,
    multiple: false,
  });

  const Icon = currentType.icon;

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          <span className="gradient-text">Nhập dữ liệu</span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Import prompt và dữ liệu từ các định dạng file khác nhau.
        </p>
      </div>

      {/* Type selector */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {importTypes.map((item) => {
          const TypeIcon = item.icon;
          const isActive = selectedType === item.type;
          return (
            <button
              key={item.type}
              onClick={() => {
                setSelectedType(item.type);
                setResult(null);
              }}
              className={isActive ? "btn-primary" : "btn-secondary"}
              style={{ padding: "8px 16px", fontSize: 13 }}
            >
              <TypeIcon size={16} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Description */}
      <div
        className="glass-card"
        style={{ padding: 16, marginBottom: 20 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 14,
            color: "var(--text-secondary)",
          }}
        >
          <Icon size={20} style={{ color: currentType.color, flexShrink: 0 }} />
          {currentType.description}
        </div>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`upload-zone ${isDragActive ? "upload-zone-active" : ""}`}
        style={{ marginBottom: 24 }}
      >
        <input {...getInputProps()} />
        {importing ? (
          <>
            <Loader2
              size={40}
              style={{
                color: "var(--accent-purple)",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ fontWeight: 600 }}>Đang xử lý file...</p>
          </>
        ) : (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "var(--radius-full)",
                background: `${currentType.color}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Upload size={28} style={{ color: currentType.color }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                {isDragActive
                  ? "Thả file vào đây..."
                  : `Kéo thả file ${currentType.label} hoặc click để chọn`}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Tối đa 10MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Result */}
      {result && (
        <div
          className="glass-card animate-scaleIn"
          style={{ padding: 20 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {result.errors.length === 0 ? (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-full)",
                  background: "rgba(16,185,129,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={20} style={{ color: "var(--accent-green)" }} />
              </div>
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-full)",
                  background: "rgba(245,158,11,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertCircle
                  size={20}
                  style={{ color: "var(--accent-amber)" }}
                />
              </div>
            )}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Kết quả Import</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Thành công: {result.success} • Lỗi: {result.failed}
              </p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "var(--radius-md)",
                padding: 12,
                fontSize: 13,
                color: "var(--accent-red)",
              }}
            >
              {result.errors.map((err, i) => (
                <div key={i} style={{ marginBottom: i < result.errors.length - 1 ? 4 : 0 }}>
                  • {err}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Format Guide */}
      <div
        className="glass-card"
        style={{ padding: 20, marginTop: 24 }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
          📋 Hướng dẫn định dạng
        </h3>

        {selectedType === "excel" || selectedType === "csv" ? (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            <p>Cần các cột (header row đầu tiên):</p>
            <div
              style={{
                background: "var(--bg-tertiary)",
                padding: 12,
                borderRadius: "var(--radius-sm)",
                marginTop: 8,
                fontFamily: "monospace",
                fontSize: 12,
              }}
            >
              Title | Prompt | Negative | Model | LoRA | Seed | Sampler | Creator | Tags
            </div>
            <p style={{ marginTop: 8 }}>
              • Cột <strong>Prompt</strong> là bắt buộc
              <br />
              • Tags phân cách bằng dấu phẩy: &quot;anime, portrait, cinematic&quot;
            </p>
          </div>
        ) : selectedType === "json" ? (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            <p>Hỗ trợ JSON array:</p>
            <div
              style={{
                background: "var(--bg-tertiary)",
                padding: 12,
                borderRadius: "var(--radius-sm)",
                marginTop: 8,
                fontFamily: "monospace",
                fontSize: 12,
                whiteSpace: "pre",
              }}
            >
              {`[
  {
    "title": "...",
    "prompt": "...",
    "negative": "...",
    "model": "...",
    "tags": ["tag1", "tag2"]
  }
]`}
            </div>
          </div>
        ) : selectedType === "txt" ? (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            <p>Mỗi block cách nhau bằng dòng trống. Format:</p>
            <div
              style={{
                background: "var(--bg-tertiary)",
                padding: 12,
                borderRadius: "var(--radius-sm)",
                marginTop: 8,
                fontFamily: "monospace",
                fontSize: 12,
                whiteSpace: "pre",
              }}
            >
              {`Prompt: a beautiful girl...
Negative: bad quality...
Model: SDXL
Tags: portrait, anime`}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            <p>File Word sẽ được parse tự động. Format:</p>
            <div
              style={{
                background: "var(--bg-tertiary)",
                padding: 12,
                borderRadius: "var(--radius-sm)",
                marginTop: 8,
                fontFamily: "monospace",
                fontSize: 12,
                whiteSpace: "pre",
              }}
            >
              {`Prompt: ...
Negative: ...
Model: ...
Tags: ...

(dòng trống để tách prompt tiếp theo)`}
            </div>
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

// ===== Import Functions =====
async function importExcel(file: File): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, errors: [] };
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

  for (const row of rows) {
    try {
      const prompt = row["Prompt"] || row["prompt"] || row["Content"] || row["content"];
      if (!prompt) {
        result.failed++;
        result.errors.push(`Dòng thiếu cột Prompt`);
        continue;
      }

      const tags = (row["Tags"] || row["tags"] || "")
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);

      await createPrompt({
        title: row["Title"] || row["title"] || prompt.slice(0, 50),
        content: prompt,
        negativePrompt: row["Negative"] || row["negative"] || row["NegativePrompt"] || "",
        type: "image" as PromptType,
        model: row["Model"] || row["model"] || "",
        lora: row["LoRA"] || row["lora"] || "",
        seed: row["Seed"] || row["seed"] || "",
        sampler: row["Sampler"] || row["sampler"] || "",
        cfgScale: Number(row["CFG"] || row["cfgScale"] || 7),
        steps: Number(row["Steps"] || row["steps"] || 20),
        creator: row["Creator"] || row["creator"] || "",
        tags,
        notes: row["Notes"] || row["notes"] || "",
        isFavorite: false,
      });
      result.success++;
    } catch {
      result.failed++;
    }
  }
  return result;
}

async function importCSV(file: File): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, errors: [] };
  const text = await file.text();

  return new Promise((resolve) => {
    Papa.parse(text, {
      header: true,
      complete: async (parsed) => {
        for (const row of parsed.data as Record<string, string>[]) {
          try {
            const prompt = row["Prompt"] || row["prompt"] || row["Content"];
            if (!prompt) {
              result.failed++;
              continue;
            }

            const tags = (row["Tags"] || row["tags"] || "")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);

            await createPrompt({
              title: row["Title"] || row["title"] || prompt.slice(0, 50),
              content: prompt,
              negativePrompt: row["Negative"] || row["negative"] || "",
              type: "image",
              model: row["Model"] || row["model"] || "",
              lora: row["LoRA"] || row["lora"] || "",
              seed: row["Seed"] || row["seed"] || "",
              sampler: row["Sampler"] || row["sampler"] || "",
              cfgScale: Number(row["CFG"] || 7),
              steps: Number(row["Steps"] || 20),
              creator: row["Creator"] || row["creator"] || "",
              tags,
              notes: "",
              isFavorite: false,
            });
            result.success++;
          } catch {
            result.failed++;
          }
        }
        resolve(result);
      },
    });
  });
}

async function importTXT(file: File): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, errors: [] };
  const text = await file.text();
  const blocks = text.split(/\n\s*\n/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    try {
      const lines = trimmed.split("\n");
      const data: Record<string, string> = {};

      for (const line of lines) {
        const match = line.match(/^(Prompt|Negative|Model|LoRA|Seed|Sampler|Tags|Creator|Title):\s*(.+)/i);
        if (match) {
          data[match[1].toLowerCase()] = match[2].trim();
        }
      }

      const promptContent = data["prompt"] || trimmed;
      const tags = (data["tags"] || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await createPrompt({
        title: data["title"] || promptContent.slice(0, 50),
        content: promptContent,
        negativePrompt: data["negative"] || "",
        type: "image",
        model: data["model"] || "",
        lora: data["lora"] || "",
        seed: data["seed"] || "",
        sampler: data["sampler"] || "",
        cfgScale: 7,
        steps: 20,
        creator: data["creator"] || "",
        tags,
        notes: "",
        isFavorite: false,
      });
      result.success++;
    } catch {
      result.failed++;
    }
  }
  return result;
}

async function importJSON(file: File): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, errors: [] };
  const text = await file.text();
  const json = JSON.parse(text);
  const items = Array.isArray(json) ? json : [json];

  for (const item of items) {
    try {
      const prompt = item.prompt || item.content || item.Prompt;
      if (!prompt) {
        result.failed++;
        continue;
      }

      const tags = Array.isArray(item.tags)
        ? item.tags
        : typeof item.tags === "string"
          ? item.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : [];

      await createPrompt({
        title: item.title || item.Title || prompt.slice(0, 50),
        content: prompt,
        negativePrompt: item.negative || item.negativePrompt || item.Negative || "",
        type: item.type || "image",
        model: item.model || item.Model || "",
        lora: item.lora || item.LoRA || "",
        seed: item.seed || item.Seed || "",
        sampler: item.sampler || item.Sampler || "",
        cfgScale: Number(item.cfgScale || item.cfg || 7),
        steps: Number(item.steps || item.Steps || 20),
        creator: item.creator || item.Creator || "",
        tags,
        notes: item.notes || "",
        isFavorite: false,
      });
      result.success++;
    } catch {
      result.failed++;
    }
  }
  return result;
}

async function importWord(file: File): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, errors: [] };

  try {
    const mammoth = await import("mammoth");
    const buffer = await file.arrayBuffer();
    const { value: text } = await mammoth.extractRawText({ arrayBuffer: buffer });

    const blocks = text.split(/\n\s*\n/);
    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;

      const lines = trimmed.split("\n");
      const data: Record<string, string> = {};

      for (const line of lines) {
        const match = line.match(/^(Prompt|Negative|Model|LoRA|Seed|Sampler|Tags|Creator|Title):\s*(.+)/i);
        if (match) {
          data[match[1].toLowerCase()] = match[2].trim();
        }
      }

      const promptContent = data["prompt"] || trimmed;
      if (promptContent.length < 5) continue;

      const tags = (data["tags"] || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await createPrompt({
        title: data["title"] || promptContent.slice(0, 50),
        content: promptContent,
        negativePrompt: data["negative"] || "",
        type: "image",
        model: data["model"] || "",
        lora: data["lora"] || "",
        seed: data["seed"] || "",
        sampler: data["sampler"] || "",
        cfgScale: 7,
        steps: 20,
        creator: data["creator"] || "",
        tags,
        notes: "",
        isFavorite: false,
      });
      result.success++;
    }
  } catch (err) {
    result.errors.push(`Lỗi đọc file Word: ${err instanceof Error ? err.message : "Unknown"}`);
  }

  return result;
}

export default ImportPage;
