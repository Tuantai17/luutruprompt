"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createWorkflow, db, type Workflow, type WorkflowType } from "@/lib/db";
import {
  BadgeCheck,
  Bell,
  Boxes,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Copy,
  Crown,
  Download,
  Eye,
  FileText,
  FolderInput,
  Gauge,
  Grid2X2,
  Image as ImageIcon,
  Layers,
  Maximize,
  MessageSquare,
  Minimize,
  MoreHorizontal,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  Share2,
  Sparkles,
  Star,
  Upload,
  WandSparkles,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type WorkflowGraph = {
  provider: "Google Flow" | "ChatGPT" | "Gemini" | "Grok";
  runMode: "sequential" | "parallel";
  nodes: Array<{
    id: string;
    kind: "image" | "prompt" | "generate-image" | "generate-video";
    title: string;
    prompt?: string;
    asset?: string;
    output?: string;
  }>;
  edges: Array<{ from: string; to: string; port: "image" | "text" | "video" }>;
};

type WorkflowTemplate = {
  id: string;
  title: string;
  description: string;
  type: WorkflowType;
  category: string;
  nodes: number;
  users: number;
  rating: number;
  image: string;
  tags: string[];
  workflow: WorkflowGraph;
};

const elevatorWorkflow: WorkflowGraph = {
  provider: "Google Flow",
  runMode: "sequential",
  nodes: [
    { id: "image-01", kind: "image", title: "Image", asset: "/workflow-assets/workflow-source.svg" },
    { id: "outfit-01", kind: "image", title: "Outfit", asset: "/workflow-assets/workflow-outfit.svg" },
    {
      id: "prompt-image",
      kind: "prompt",
      title: "Prompt - Image",
      prompt:
        "IMAGE 01 - realistic mirror selfie reference, girl standing inside an elevator, soft lighting, natural outfit details.",
    },
    { id: "flow-image", kind: "generate-image", title: "Flow - Image Generate", asset: "/workflow-assets/workflow-elevator.svg", output: "NaNa Banana 2" },
    {
      id: "prompt-video-01",
      kind: "prompt",
      title: "Prompt - Video 01",
      prompt:
        "Create a realistic selfie video. Use elevator lighting, grey outfit styling, natural camera motion, and cinematic framing.",
    },
    {
      id: "prompt-video-02",
      kind: "prompt",
      title: "Prompt - Video 02",
      prompt:
        "The subject walks closer to camera with a final flash transition and consistent outfit details.",
    },
    { id: "flow-video-01", kind: "generate-video", title: "Flow - Video Generate 01", asset: "/workflow-assets/workflow-elevator.svg", output: "Video - Final Flash - 10s" },
    { id: "flow-video-02", kind: "generate-video", title: "Flow - Video Generate 2", asset: "/workflow-assets/workflow-street.svg", output: "Video - Final Flash - 10s" },
  ],
  edges: [
    { from: "image-01", to: "flow-image", port: "image" },
    { from: "outfit-01", to: "flow-image", port: "image" },
    { from: "prompt-image", to: "flow-image", port: "text" },
    { from: "flow-image", to: "flow-video-01", port: "image" },
    { from: "flow-image", to: "flow-video-02", port: "image" },
    { from: "prompt-video-01", to: "flow-video-01", port: "text" },
    { from: "prompt-video-02", to: "flow-video-02", port: "text" },
  ],
};

const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "wl-elevator-outfit",
    title: "WL - Elevator Arrival / First Outfit Check",
    description: "Image-to-video workflow có ảnh gốc, outfit reference, prompt image và 2 nhánh video output.",
    type: "flux",
    category: "Video Generation",
    nodes: 8,
    users: 64,
    rating: 5,
    image: "/workflow-assets/workflow-elevator.svg",
    tags: ["Video Generation", "Outfit", "Google Flow"],
    workflow: elevatorWorkflow,
  },
  {
    id: "wl-street-style",
    title: "WL - Street Style",
    description: "Template street style với prompt refinement, nhánh image generate và video generate.",
    type: "flux",
    category: "Video Generation",
    nodes: 6,
    users: 18,
    rating: 5,
    image: "/workflow-assets/workflow-street.svg",
    tags: ["Video Generation", "Fashion", "Prompt"],
    workflow: {
      ...elevatorWorkflow,
      nodes: elevatorWorkflow.nodes.map((node) =>
        node.id === "flow-image" || node.id.startsWith("flow-video")
          ? { ...node, asset: "/workflow-assets/workflow-street.svg" }
          : node,
      ),
    },
  },
  {
    id: "wl-image-check",
    title: "WL - Image Review / Prompt Split",
    description: "Workflow ngắn để lưu ảnh tham chiếu, prompt, metadata và output image.",
    type: "comfyui",
    category: "Image Generation",
    nodes: 5,
    users: 42,
    rating: 4.8,
    image: "/workflow-assets/workflow-source.svg",
    tags: ["Image", "Prompt", "Template"],
    workflow: {
      ...elevatorWorkflow,
      nodes: elevatorWorkflow.nodes.slice(0, 5),
      edges: elevatorWorkflow.edges.slice(0, 4),
    },
  },
];

const typeConfig: Record<WorkflowType, { label: string; color: string }> = {
  comfyui: { label: "ComfyUI", color: "#8b5cf6" },
  automatic1111: { label: "A1111", color: "#06b6d4" },
  flux: { label: "Flux", color: "#bfff00" },
  other: { label: "Khác", color: "#f59e0b" },
};

const tabs = [
  { id: "gen", label: "Gen", icon: Sparkles },
  { id: "workflow", label: "Workflow", icon: WandSparkles },
  { id: "prompts", label: "Prompts", icon: Copy },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "images", label: "", icon: ImageIcon },
  { id: "history", label: "", icon: RotateCcw },
  { id: "docs", label: "", icon: FileText },
];

const googleFlowUrl =
  "https://labs.google/fx/vi/tools/flow/project/9161baf1-7f60-4624-b92f-d223b2e5d61";

const WorkflowsPage = () => {
  const [savedWorkflows, setSavedWorkflows] = useState<Workflow[]>([]);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<WorkflowType | "all">("all");
  const [activeSubtab, setActiveSubtab] = useState<"templates" | "workflows" | "shared">("templates");
  const [activeTemplate, setActiveTemplate] = useState<WorkflowTemplate>(workflowTemplates[0]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const loadWorkflows = useCallback(async () => {
    const all = await db.workflows.orderBy("createdAt").reverse().toArray();
    setSavedWorkflows(all);
  }, []);

  useEffect(() => {
    setMounted(true);
    loadWorkflows();
  }, [loadWorkflows]);

  const filteredTemplates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return workflowTemplates.filter((template) => {
      const matchesType = filterType === "all" || template.type === filterType;
      const matchesSearch = query
        ? [template.title, template.description, template.category, ...template.tags].join(" ").toLowerCase().includes(query)
        : true;
      return matchesType && matchesSearch;
    });
  }, [filterType, searchTerm]);

  const templatePayload = (template: WorkflowTemplate) => ({
    title: template.title,
    description: template.description,
    type: template.type,
    category: template.category,
    tags: template.tags,
    workflow: template.workflow,
  });

  const saveTemplate = async (template: WorkflowTemplate) => {
    setSaving(true);
    try {
      await createWorkflow({
        title: template.title,
        description: template.description,
        content: JSON.stringify(templatePayload(template), null, 2),
        type: template.type,
        creator: "TobyFlow",
        tags: template.tags,
        isFavorite: false,
      });
      await loadWorkflows();
      setNotice("Đã lưu workflow vào danh sách.");
    } finally {
      setSaving(false);
    }
  };

  const copyTemplate = async (template: WorkflowTemplate) => {
    await navigator.clipboard.writeText(JSON.stringify(templatePayload(template), null, 2));
    setNotice("Đã copy JSON workflow template.");
  };

  const importWorkflow = async () => {
    const parsed = JSON.parse(importText);
    await createWorkflow({
      title: parsed.title || "Imported Workflow",
      description: parsed.description || "Workflow imported from JSON.",
      content: JSON.stringify(parsed, null, 2),
      type: (parsed.type || "other") as WorkflowType,
      creator: "Imported",
      tags: Array.isArray(parsed.tags) ? parsed.tags : ["Imported"],
      isFavorite: false,
    });
    setImportOpen(false);
    setImportText("");
    setNotice("Đã import workflow JSON.");
    await loadWorkflows();
  };

  if (!mounted) return null;

  return (
    <div id="workflow-clone" className="workflow-page-shell">
      <style>{workflowPageStyles}</style>

      <div className="toby-panel">
        <header className="toby-header">
          <div className="brand-group">
            <div className="toby-logo">
              <Sparkles size={24} fill="currentColor" />
            </div>
            <div>
              <div className="brand-name">
                TobyFlow <span>FREE</span>
              </div>
              <div className="workflow-date">
                <Sparkles size={14} fill="currentColor" />
                18:46 25 thg 5
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          <div className="header-tools">
            <button className="icon-tool active" title="Workflow"><BadgeCheck size={18} /></button>
            <button className="icon-tool" title="Tài liệu"><ClipboardList size={18} /></button>
            <button className="icon-tool" title="Ngôn ngữ"><Gauge size={18} /></button>
            <button className="icon-tool" title="Cài đặt"><Settings size={18} /></button>
            <button className="icon-tool" title="Thông báo"><Bell size={18} /></button>
            <button className="status-dot" title="Trạng thái" />
          </div>
        </header>

        <nav className="main-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={tab.id === "workflow" ? "tab active" : "tab"}>
                <Icon size={19} />
                {tab.label && <span>{tab.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="source-toolbar">
          <button className="toolbar-btn" onClick={() => setActiveSubtab("workflows")} title="Tìm kiếm"><Search size={15} /></button>
          <button className="toolbar-btn" onClick={loadWorkflows} title="Tải lại"><RotateCcw size={15} /></button>
          <button className="toolbar-btn" onClick={() => setImportOpen(true)} title="Nhập workflow"><Upload size={15} /></button>
          <button className="toolbar-btn run-all" onClick={() => setRunnerOpen(true)}><Play size={15} fill="currentColor" />Chạy tất cả</button>
          <button className="toolbar-btn create-btn" onClick={() => setEditorOpen(true)}><Plus size={15} />Thêm</button>
        </div>

        <div className="sub-tabs">
          <button className={activeSubtab === "templates" ? "sub-tab active" : "sub-tab"} onClick={() => setActiveSubtab("templates")}><ClipboardList size={18} />Templates</button>
          <button className={activeSubtab === "workflows" ? "sub-tab active" : "sub-tab"} onClick={() => setActiveSubtab("workflows")}><Boxes size={18} />Workflows</button>
          <button className={activeSubtab === "shared" ? "sub-tab active" : "sub-tab"} onClick={() => setActiveSubtab("shared")}><Share2 size={18} />Được chia sẻ</button>
        </div>

        <div className="search-row">
          <div className="template-search">
            <Search size={20} />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm kiếm template..." />
          </div>
          <select value={filterType} onChange={(event) => setFilterType(event.target.value as WorkflowType | "all")} className="type-select">
            <option value="all">Tất cả</option>
            <option value="flux">Flux</option>
            <option value="comfyui">ComfyUI</option>
            <option value="automatic1111">A1111</option>
            <option value="other">Khác</option>
          </select>
        </div>

        {notice && <div className="wf-notice">{notice}</div>}

        {activeSubtab === "templates" && (
          <section className="template-grid">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={activeTemplate.id === template.id}
                saving={saving}
                onPreview={() => {
                  setActiveTemplate(template);
                  setEditorOpen(true);
                }}
                onCopy={() => copyTemplate(template)}
                onSave={() => saveTemplate(template)}
                onUse={() => {
                  setActiveTemplate(template);
                  setRunnerOpen(true);
                }}
              />
            ))}
          </section>
        )}

        {activeSubtab === "workflows" && (
          <section className="workflow-list-view">
            {savedWorkflows.length === 0 ? (
              <div className="workflow-empty-state">
                <Boxes size={46} />
                <p>Chưa có workflow nào</p>
                <button className="use-action" onClick={() => setActiveSubtab("templates")}>Tạo workflow đầu tiên</button>
              </div>
            ) : (
              savedWorkflows.map((workflow) => (
                <article key={workflow.id} className="saved-workflow-card">
                  <div>
                    <h3>{workflow.title || "Untitled"}</h3>
                    <p>{workflow.description}</p>
                    <span>{typeConfig[workflow.type]?.label || "Workflow"}</span>
                  </div>
                  <button className="ghost-action" onClick={() => navigator.clipboard.writeText(workflow.content)}>
                    <Copy size={15} />Copy JSON
                  </button>
                </article>
              ))
            )}
          </section>
        )}

        {activeSubtab === "shared" && (
          <section className="workflow-list-view">
            <div className="workflow-empty-state">
              <Share2 size={46} />
              <p>Chưa có workflow được chia sẻ.</p>
              <span>Source extension có module SharedWorkflowOverlay.js, có thể nối API chia sẻ sau.</span>
            </div>
          </section>
        )}

        <footer className="toby-footer">
          <button className="upgrade-btn"><Crown size={16} fill="currentColor" />Nâng cấp</button>
          <div className="footer-stats">
            <span><CheckSquare size={16} />Download</span>
            <span><CheckSquare size={16} />Retry</span>
            <span><MessageSquare size={16} /><b>0/200</b></span>
            <span><CheckSquare size={16} /><b>0/2</b></span>
            <span><Grid2X2 size={16} /><b>2/2</b></span>
          </div>
        </footer>
      </div>

      <aside className="workflow-side">
        <div className="side-card">
          <div className="side-card-title"><Layers size={17} />Workflows đã lưu</div>
          <p>{savedWorkflows.length} workflow trong tài khoản của bạn.</p>
          <div className="saved-list">
            {savedWorkflows.slice(0, 4).map((workflow) => (
              <div key={workflow.id} className="saved-item">
                <span>{workflow.title || "Untitled"}</span>
                <small>{typeConfig[workflow.type]?.label || "Workflow"}</small>
              </div>
            ))}
            {savedWorkflows.length === 0 && <div className="saved-empty">Bấm Save ở template để lưu workflow mẫu vào Supabase.</div>}
          </div>
        </div>

        <div className="side-card">
          <div className="side-card-title"><FolderInput size={17} />Chi tiết clone từ source</div>
          <ol className="deploy-steps">
            <li>Tab chính: Gen, Workflows, Prompts, Tasks.</li>
            <li>Workflow toolbar: search, reload, import, run all, add.</li>
            <li>Subtab: Templates, Workflows, Được chia sẻ.</li>
            <li>Module gốc: WorkflowTab, WorkflowTemplateList, WorkflowEditor, DiagramCanvas.</li>
          </ol>
        </div>
      </aside>

      {editorOpen && (
        <WorkflowEditor
          template={activeTemplate}
          saving={saving}
          onClose={() => setEditorOpen(false)}
          onSave={() => {
            setEditorOpen(false);
            setRunnerOpen(true);
          }}
        />
      )}

      {runnerOpen && (
        <FlowRunner
          template={activeTemplate}
          saving={saving}
          onClose={() => setRunnerOpen(false)}
          onPreview={() => setEditorOpen(true)}
          onSave={() => saveTemplate(activeTemplate)}
        />
      )}

      {importOpen && (
        <div className="editor-overlay">
          <div className="import-modal">
            <div className="import-header">
              <strong>Nhập workflow JSON</strong>
              <button className="close-editor" onClick={() => setImportOpen(false)}>Đóng</button>
            </div>
            <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste JSON workflow template ở đây..." />
            <button className="use-editor" onClick={importWorkflow} disabled={!importText.trim()}><Upload size={18} />Import</button>
          </div>
        </div>
      )}
    </div>
  );
};

const TemplateCard = ({
  template,
  selected,
  saving,
  onPreview,
  onCopy,
  onSave,
  onUse,
}: {
  template: WorkflowTemplate;
  selected: boolean;
  saving: boolean;
  onPreview: () => void;
  onCopy: () => void;
  onSave: () => void;
  onUse: () => void;
}) => (
  <article className={selected ? "template-card selected" : "template-card"}>
    <button className="template-image" onClick={onPreview}>
      <img src={template.image} alt={template.title} />
      <span className="preview-pill"><Eye size={14} />Preview</span>
    </button>
    <div className="template-body">
      <h3>{template.title}</h3>
      <p>{template.description}</p>
      <div className="template-meta">
        <span>{template.category}</span>
        <span><Boxes size={14} />{template.nodes} nodes</span>
      </div>
      <div className="template-bottom">
        <span className="users-count"><Layers size={15} />{template.users}</span>
        <span className="rating">
          {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={15} fill="currentColor" />)}
          {template.rating.toFixed(2)}
        </span>
      </div>
      <div className="card-actions">
        <button className="ghost-action" onClick={onCopy}><Copy size={15} />Copy JSON</button>
        <button className="ghost-action" onClick={onSave} disabled={saving}><Save size={15} />Save</button>
        <button className="use-action" onClick={onUse}><Copy size={15} />Sử dụng</button>
      </div>
    </div>
  </article>
);

const FlowRunner = ({
  template,
  saving,
  onClose,
  onPreview,
  onSave,
}: {
  template: WorkflowTemplate;
  saving: boolean;
  onClose: () => void;
  onPreview: () => void;
  onSave: () => void;
}) => {
  const promptNodes = template.workflow.nodes.filter((node) => node.kind === "prompt");
  const mediaNodes = template.workflow.nodes.filter((node) => node.kind === "image");
  const outputNodes = template.workflow.nodes.filter((node) => node.kind.includes("generate"));
  const [flowUrl, setFlowUrl] = useState(googleFlowUrl);
  const [promptValues, setPromptValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(promptNodes.map((node) => [node.id, node.prompt || ""])),
  );
  const [mediaValues, setMediaValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(mediaNodes.map((node) => [node.id, node.asset || ""])),
  );
  const [customSaving, setCustomSaving] = useState(false);

  const customizedNodes = template.workflow.nodes.map((node) => {
    if (node.kind === "prompt") {
      return { ...node, prompt: promptValues[node.id] || "" };
    }
    if (node.kind === "image") {
      return { ...node, asset: mediaValues[node.id] || "" };
    }
    return node;
  });

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    alert(`Đã copy: ${label}`);
  };

  const copyWorkflowJson = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(
        {
          title: template.title,
          provider: template.workflow.provider,
          runMode: template.workflow.runMode,
          nodes: customizedNodes,
          edges: template.workflow.edges,
        },
        null,
        2,
      ),
    );
    alert("Đã copy JSON workflow đã tùy chỉnh.");
  };

  const openFlowAndCopyFirstPrompt = async () => {
    const firstPrompt = promptNodes[0];
    if (firstPrompt) {
      await navigator.clipboard.writeText(promptValues[firstPrompt.id] || "");
    }
    window.open(flowUrl, "_blank", "noopener,noreferrer");
    alert(firstPrompt ? `Đã mở Flow và copy prompt đầu tiên: ${firstPrompt.title}` : "Đã mở Flow.");
  };

  const saveCustomizedWorkflow = async () => {
    setCustomSaving(true);
    try {
      await createWorkflow({
        title: template.title,
        description: `${template.description} Customized runner data.`,
        content: JSON.stringify(
          {
            title: template.title,
            provider: template.workflow.provider,
            runMode: template.workflow.runMode,
            flowUrl,
            nodes: customizedNodes,
            edges: template.workflow.edges,
          },
          null,
          2,
        ),
        type: template.type,
        creator: "TobyFlow Runner",
        tags: [...template.tags, "Customized"],
        isFavorite: false,
      });
      alert("Đã lưu workflow với dữ liệu đã tùy chỉnh.");
    } finally {
      setCustomSaving(false);
    }
  };

  return (
    <div className="editor-overlay">
      <div className="flow-runner-modal">
        <div className="flow-runner-header">
          <div>
            <span className="runner-kicker">Run workflow in Google Flow</span>
            <h2>{template.title}</h2>
          </div>
          <button className="close-editor" onClick={onClose}>Đóng</button>
        </div>

        <div className="runner-flow-url">
          <label>Flow project URL</label>
          <input value={flowUrl} onChange={(event) => setFlowUrl(event.target.value)} />
        </div>

        <div className="runner-actions">
          <a className="open-flow-btn" href={flowUrl} target="_blank" rel="noreferrer">
            <Play size={18} fill="currentColor" />
            Mở Google Flow
          </a>
          <button className="open-flow-btn" onClick={openFlowAndCopyFirstPrompt}>
            <Copy size={18} />
            Mở Flow + copy prompt đầu
          </button>
          <button className="ghost-action" onClick={onPreview}>
            <Eye size={16} />
            Xem canvas
          </button>
          <button className="ghost-action" onClick={copyWorkflowJson}>
            <Copy size={16} />
            Copy JSON
          </button>
          <button className="ghost-action" onClick={saveCustomizedWorkflow} disabled={saving || customSaving}>
            <Save size={16} />
            {customSaving ? "Đang lưu" : "Lưu bản tùy chỉnh"}
          </button>
        </div>

        <div className="runner-grid">
          <section className="runner-panel">
            <h3>1. Tùy chỉnh media đưa vào Flow</h3>
            <p>Điền URL ảnh hoặc mở asset tham chiếu, sau đó đưa vào Google Flow theo đúng thứ tự node.</p>
            <div className="runner-list">
              {mediaNodes.map((node, index) => (
                <div key={node.id} className="runner-node-row">
                  <img src={mediaValues[node.id]} alt={node.title} />
                  <div>
                    <strong>{index + 1}. {node.title}</strong>
                    <input
                      value={mediaValues[node.id] || ""}
                      onChange={(event) =>
                        setMediaValues((current) => ({ ...current, [node.id]: event.target.value }))
                      }
                    />
                  </div>
                  <a className="mini-link" href={mediaValues[node.id]} target="_blank" rel="noreferrer">Mở ảnh</a>
                </div>
              ))}
            </div>
          </section>

          <section className="runner-panel">
            <h3>2. Tùy chỉnh prompt và copy vào Flow</h3>
            <p>Sửa prompt ngay tại đây trước khi copy sang node tương ứng trong Google Flow.</p>
            <div className="runner-list">
              {promptNodes.map((node, index) => (
                <div key={node.id} className="runner-prompt-row">
                  <div>
                    <strong>{index + 1}. {node.title}</strong>
                    <textarea
                      value={promptValues[node.id] || ""}
                      onChange={(event) =>
                        setPromptValues((current) => ({ ...current, [node.id]: event.target.value }))
                      }
                    />
                  </div>
                  <button className="use-action" onClick={() => copyText(promptValues[node.id] || "", node.title)}>
                    <Copy size={15} />
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="runner-panel runner-panel-wide">
            <h3>3. Thứ tự thao tác theo workflow</h3>
            <div className="runner-steps">
              {template.workflow.nodes.map((node, index) => (
                <div key={node.id} className="runner-step">
                  <span>{index + 1}</span>
                  <div>
                    <strong>{node.title}</strong>
                    <small>{node.kind} - {node.id}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="runner-panel">
            <h3>4. Output mong đợi</h3>
            <div className="runner-list">
              {outputNodes.map((node) => (
                <div key={node.id} className="runner-output-row">
                  <strong>{node.title}</strong>
                  <span>{node.output || node.kind}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="runner-note">
          Runner này cho phép tùy chỉnh dữ liệu, mở Flow và copy đúng prompt/node. Nếu muốn tự động click/upload/submit trong Google Flow như extension Toby Flow, cần thêm Chrome extension content script chạy trên domain labs.google.
        </div>
      </div>
    </div>
  );
};

const WorkflowEditor = ({
  template,
  saving,
  onClose,
  onSave,
}: {
  template: WorkflowTemplate;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) => (
  <div className="editor-overlay">
    <div className="editor-window">
      <header className="editor-titlebar">
        <div className="editor-title">
          <div className="toby-logo small"><Sparkles size={17} fill="currentColor" /></div>
          <strong>{template.title}</strong>
        </div>
        <div className="editor-actions">
          <button className="preview-mode"><Eye size={18} />Preview Mode</button>
          <span className="run-stat"><Zap size={20} />Runs <b>0/15</b></span>
          <span className="node-stat"><Boxes size={20} />Nodes <b>{template.nodes}/5</b></span>
          <button className="upgrade-btn compact"><Crown size={15} fill="currentColor" />Nâng cấp</button>
          <button className="demo-btn"><Play size={17} fill="currentColor" />Xem video demo</button>
          <button className="close-editor" onClick={onClose}>Đóng</button>
          <button className="use-editor" onClick={onSave} disabled={saving}><Copy size={18} />{saving ? "Đang lưu" : "Sử dụng"}</button>
        </div>
      </header>

      <div className="canvas">
        <div className="canvas-brand">
          <div className="toby-logo"><Sparkles size={22} fill="currentColor" /></div>
          <strong>TobyFlow</strong>
          <span>FREE</span>
        </div>

        <svg className="connector-layer" viewBox="0 0 1200 620">
          <path d="M350 260 C455 260 470 250 560 250" />
          <path d="M355 470 C470 430 470 300 560 300" />
          <path d="M700 250 C820 240 830 175 920 175" />
          <path d="M700 250 C820 300 835 395 920 405" />
          <path d="M710 430 C820 440 825 410 920 405" />
          <path d="M700 300 C815 365 815 190 920 175" />
        </svg>

        <WorkflowNode className="node image-node node-a" label="Image" image={nodeAsset(template, "image-01", "/workflow-assets/workflow-source.svg")} footer="1 ảnh" />
        <WorkflowNode className="node image-node node-b" label="Outfit" image={nodeAsset(template, "outfit-01", "/workflow-assets/workflow-outfit.svg")} footer="1 ảnh" />
        <TextNode className="node prompt-node node-c" label="Prompt - Image" content={nodePrompt(template, "prompt-image")} />
        <WorkflowNode className="node image-node node-d" label="Flow - Image Generate" image={template.image} footer="Image" provider={template.workflow.provider} />
        <TextNode className="node prompt-node node-e" label="Prompt - Video 01" content={nodePrompt(template, "prompt-video-01")} />
        <TextNode className="node prompt-node node-f" label="Prompt - Video 02" content={nodePrompt(template, "prompt-video-02")} />
        <WorkflowNode className="node video-node node-g" label="Flow - Video Generate 01" image={nodeAsset(template, "flow-video-01", "/workflow-assets/workflow-elevator.svg")} footer="Video - Final Flash - 10s" provider={template.workflow.provider} />
        <WorkflowNode className="node video-node node-h" label="Flow - Video Generate 2" image={nodeAsset(template, "flow-video-02", "/workflow-assets/workflow-street.svg")} footer="Video - Final Flash - 10s" provider={template.workflow.provider} />

        <div className="floating-toolbar">
          <button title="Fit"><Maximize size={22} /></button>
          <button title="Download"><Download size={22} /></button>
        </div>
        <div className="zoom-toolbar">
          <button title="Zoom in"><ZoomIn size={20} /></button>
          <span>30%</span>
          <button title="Zoom out"><ZoomOut size={20} /></button>
          <button title="Reset"><RotateCcw size={20} /></button>
        </div>
        <button className="center-btn"><Minimize size={18} />Cân giữa</button>
      </div>
    </div>
  </div>
);

const nodeAsset = (template: WorkflowTemplate, id: string, fallback: string) =>
  template.workflow.nodes.find((node) => node.id === id)?.asset || fallback;

const nodePrompt = (template: WorkflowTemplate, id: string) =>
  template.workflow.nodes.find((node) => node.id === id)?.prompt || "";

const WorkflowNode = ({
  className,
  label,
  image,
  footer,
  provider,
}: {
  className: string;
  label: string;
  image: string;
  footer: string;
  provider?: string;
}) => (
  <div className={className}>
    {provider && <div className="provider-badge">{provider}</div>}
    <div className="node-header"><ImageIcon size={13} />{label}<MoreHorizontal size={13} /></div>
    <img src={image} alt={label} />
    <div className="node-footer">{footer}</div>
    <span className="port left">I</span>
    <span className="port right">O</span>
  </div>
);

const TextNode = ({ className, label, content }: { className: string; label: string; content: string }) => (
  <div className={className}>
    <div className="node-header"><FileText size={13} />{label}<MoreHorizontal size={13} /></div>
    <p>{content}</p>
    <span className="plain-chip">Plain</span>
    <span className="port left">T</span>
    <span className="port right">T</span>
  </div>
);

const workflowPageStyles = `
#workflow-clone.workflow-page-shell{display:grid!important;grid-template-columns:minmax(0,1fr) 300px;gap:20px;max-width:1480px;margin:0 auto}
#workflow-clone .toby-panel,#workflow-clone .side-card{background:#171717;border:1px solid #2a2a2f;border-radius:8px;box-shadow:0 18px 50px rgba(0,0,0,.35)}
#workflow-clone .toby-panel{min-height:calc(100vh - 112px);overflow:hidden;display:flex;flex-direction:column}
#workflow-clone .toby-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px 10px;border-bottom:1px solid #28282d}
#workflow-clone .brand-group,#workflow-clone .header-tools,#workflow-clone .editor-title,#workflow-clone .editor-actions,#workflow-clone .template-meta,#workflow-clone .template-bottom,#workflow-clone .card-actions,#workflow-clone .footer-stats,#workflow-clone .side-card-title,#workflow-clone .source-toolbar{display:flex;align-items:center}
#workflow-clone .brand-group{gap:12px}
#workflow-clone .toby-logo{width:38px;height:38px;border-radius:50%;color:#efff96;background:radial-gradient(circle at 35% 30%,#f6ffcd,#bfff00 45%,#77b900);display:inline-flex;align-items:center;justify-content:center;box-shadow:0 0 18px rgba(191,255,0,.34);flex:0 0 auto}
#workflow-clone .toby-logo.small{width:26px;height:26px}
#workflow-clone .brand-name{font-size:18px;font-weight:800;color:#f5f5f5;display:flex;align-items:center;gap:8px}
#workflow-clone .brand-name span,#workflow-clone .canvas-brand span{font-size:11px;color:#fff;background:#8d93a4;border-radius:5px;padding:3px 7px;font-weight:800}
#workflow-clone .workflow-date{margin-top:10px;min-width:280px;height:38px;border:1px solid #303036;border-radius:8px;color:#dedee5;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 12px;background:#19191c}
#workflow-clone button{font-family:inherit;cursor:pointer}
#workflow-clone .header-tools{gap:13px}
#workflow-clone .icon-tool,#workflow-clone .status-dot,#workflow-clone .tab,#workflow-clone .sub-tab,#workflow-clone .ghost-action,#workflow-clone .use-action,#workflow-clone .editor-actions button,#workflow-clone .floating-toolbar button,#workflow-clone .zoom-toolbar button,#workflow-clone .center-btn,#workflow-clone .toolbar-btn{border:0}
#workflow-clone .icon-tool{color:#9b9ba7;background:transparent;padding:6px;border-radius:6px;display:inline-flex}
#workflow-clone .icon-tool.active{color:#bfff00;outline:2px solid #bfff00}
#workflow-clone .status-dot{width:9px;height:9px;border-radius:50%;background:#a36b08}
#workflow-clone .main-tabs{display:flex;align-items:center;gap:22px;padding:14px 20px 12px;border-bottom:1px solid #25252a;overflow-x:auto}
#workflow-clone .tab{color:#9898a3;background:transparent;display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:700;white-space:nowrap}
#workflow-clone .tab.active{color:#bfff00}
#workflow-clone .source-toolbar{justify-content:space-between;gap:8px;padding:14px 20px 0;flex-wrap:wrap}
#workflow-clone .toolbar-btn{min-height:34px;display:inline-flex;align-items:center;gap:7px;color:#d8d8df;background:#232327;border:1px solid #34343a;border-radius:7px;padding:0 12px;font-weight:800}
#workflow-clone .toolbar-btn.create-btn{color:#111;background:#bfff00}
#workflow-clone .sub-tabs{display:flex;gap:10px;padding:18px 20px 12px;overflow-x:auto}
#workflow-clone .sub-tab{display:inline-flex;align-items:center;gap:8px;min-height:46px;padding:0 16px;border-radius:8px;color:#9d9da8;background:transparent;font-size:16px}
#workflow-clone .sub-tab.active{background:#303033;color:#f3f3f5;font-weight:800}
#workflow-clone .search-row{display:grid;grid-template-columns:minmax(220px,1fr) 150px;gap:12px;padding:0 20px 12px}
#workflow-clone .template-search{height:48px;border:1px solid #2d2d32;border-radius:8px;background:#141415;display:flex;align-items:center;gap:10px;padding:0 14px;color:#777780}
#workflow-clone .template-search input{width:100%;border:0;outline:0;color:#f5f5f5;background:transparent;font:inherit}
#workflow-clone .type-select{height:48px;border-radius:999px;border:1px solid #2d2d32;background:#151516;color:#f5f5f5;padding:0 16px;outline:0;font:inherit}
#workflow-clone .wf-notice{margin:0 20px 14px;padding:10px 12px;border:1px solid rgba(191,255,0,.25);border-radius:7px;background:rgba(191,255,0,.08);color:#dfff7b;font-size:13px}
#workflow-clone .template-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;padding:0 20px 22px;flex:1}
#workflow-clone .template-card,#workflow-clone .saved-workflow-card{background:#292929;border:1px solid #3b3b3f;border-radius:8px;overflow:hidden;transition:border-color 160ms ease,transform 160ms ease}
#workflow-clone .template-card:hover,#workflow-clone .template-card.selected{border-color:rgba(191,255,0,.55);transform:translateY(-2px)}
#workflow-clone .template-image{position:relative;display:block;width:100%;aspect-ratio:16/9;overflow:hidden;background:#111;border:0}
#workflow-clone .template-image img{width:100%;height:100%;object-fit:cover;object-position:center;opacity:.9}
#workflow-clone .preview-pill{position:absolute;right:12px;top:12px;display:inline-flex;align-items:center;gap:6px;color:#fff;background:rgba(0,0,0,.62);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:7px 10px;font-size:12px;font-weight:700}
#workflow-clone .template-body{padding:14px 16px 16px}
#workflow-clone .template-body h3,#workflow-clone .saved-workflow-card h3{font-size:18px;line-height:1.25;margin-bottom:8px;color:#f5f5f5}
#workflow-clone .template-body p,#workflow-clone .saved-workflow-card p{color:#a8a8b2;line-height:1.45;font-size:13px;min-height:42px}
#workflow-clone .template-meta{gap:8px;margin-top:12px;color:#9c9ca5;font-size:13px}
#workflow-clone .template-meta span{display:inline-flex;align-items:center;gap:5px;border-radius:6px;background:#33333a;padding:5px 8px}
#workflow-clone .template-bottom{justify-content:space-between;margin-top:14px;color:#9c9ca5}
#workflow-clone .users-count,#workflow-clone .rating{display:inline-flex;align-items:center;gap:5px}
#workflow-clone .rating{color:#ffb21a}
#workflow-clone .card-actions{justify-content:flex-end;gap:8px;margin-top:14px;flex-wrap:wrap}
#workflow-clone .ghost-action,#workflow-clone .use-action{display:inline-flex;align-items:center;gap:7px;min-height:36px;border-radius:7px;padding:0 12px;font-weight:800}
#workflow-clone .ghost-action{color:#d8d8df;background:#202024}
#workflow-clone .use-action{color:#111;background:#bfff00}
#workflow-clone .workflow-list-view{padding:0 20px 22px;display:flex;flex-direction:column;gap:12px;flex:1}
#workflow-clone .saved-workflow-card{padding:16px;display:flex;justify-content:space-between;gap:12px;align-items:center}
#workflow-clone .saved-workflow-card span{color:#bfff00;font-size:12px}
#workflow-clone .workflow-empty-state{min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#a8a8b2;text-align:center;background:#141415;border:1px dashed #33333a;border-radius:8px}
#workflow-clone .toby-footer{min-height:62px;border-top:1px solid #28282d;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 20px}
#workflow-clone .upgrade-btn{display:inline-flex;align-items:center;gap:7px;color:#111;background:linear-gradient(90deg,#ffc400,#ff7b22);border:0;border-radius:999px;min-height:34px;padding:0 14px;font-weight:800}
#workflow-clone .upgrade-btn.compact{border-radius:8px}
#workflow-clone .footer-stats{flex-wrap:wrap;justify-content:flex-end;gap:14px;color:#9d9da8;font-size:13px}
#workflow-clone .footer-stats span{display:inline-flex;align-items:center;gap:5px}
#workflow-clone .footer-stats svg{color:#31c96b}
#workflow-clone .workflow-side{display:flex;flex-direction:column;gap:16px}
#workflow-clone .side-card{padding:18px}
#workflow-clone .side-card-title{gap:8px;font-weight:800;color:#f5f5f5}
#workflow-clone .side-card p,#workflow-clone .deploy-steps,#workflow-clone .saved-empty{color:#a0a0ac;font-size:13px;line-height:1.5;margin-top:10px}
#workflow-clone .saved-list{margin-top:14px;display:flex;flex-direction:column;gap:8px}
#workflow-clone .saved-item{background:#202024;border:1px solid #303036;border-radius:7px;padding:10px}
#workflow-clone .saved-item span,#workflow-clone .saved-item small{display:block}
#workflow-clone .saved-item span{color:#f1f1f4;font-size:13px;font-weight:700}
#workflow-clone .saved-item small{margin-top:3px;color:#9d9da7}
#workflow-clone .deploy-steps{padding-left:18px}
#workflow-clone .deploy-steps li+li{margin-top:7px}
#workflow-clone .editor-overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:80;padding:18px;display:flex}
#workflow-clone .editor-window{width:min(100%,1720px);margin:auto;height:min(900px,calc(100vh - 36px));background:#111;border:1px solid #424247;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,.7)}
#workflow-clone .editor-titlebar{min-height:78px;background:#151515;border-bottom:1px solid #333338;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:12px 22px}
#workflow-clone .editor-title{min-width:260px;gap:10px;font-size:21px}
#workflow-clone .editor-actions{justify-content:flex-end;gap:13px;flex-wrap:wrap}
#workflow-clone .preview-mode,#workflow-clone .demo-btn,#workflow-clone .close-editor{min-height:42px;display:inline-flex;align-items:center;gap:8px;color:#d8d8e5;background:#171719;border:1px solid #373741!important;border-radius:7px;padding:0 16px;font-weight:800}
#workflow-clone .preview-mode{color:#9287ff;background:#242145;border-color:#565093!important}
#workflow-clone .demo-btn svg{color:#ff1f1f}
#workflow-clone .run-stat,#workflow-clone .node-stat{display:inline-flex;align-items:center;gap:7px;color:#aaaab5}
#workflow-clone .run-stat b,#workflow-clone .node-stat b{color:#fff}
#workflow-clone .node-stat b{color:#ff6464}
#workflow-clone .use-editor{min-height:48px;border-radius:8px;color:#111;background:#bfff00;display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:0 22px;font-weight:900;border:0}
#workflow-clone .canvas{position:relative;flex:1;overflow:hidden;background-color:#15161d;background-image:radial-gradient(#2c2e3c 1px,transparent 1px);background-size:24px 24px}
#workflow-clone .canvas::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(19,21,31,.2),rgba(0,0,0,.4));pointer-events:none}
#workflow-clone .canvas-brand{position:absolute;left:20px;top:20px;z-index:2;display:flex;align-items:center;gap:10px;height:62px;padding:0 18px;border:1px solid #494956;border-radius:8px;background:#33333e}
#workflow-clone .connector-layer{position:absolute;inset:0;width:100%;height:100%;z-index:1}
#workflow-clone .connector-layer path{fill:none;stroke:#5560b9;stroke-width:3;opacity:.8}
#workflow-clone .node{position:absolute;z-index:3;width:164px;border:1px solid #4a4a57;border-radius:6px;background:#1d1d25;box-shadow:0 12px 28px rgba(0,0,0,.4)}
#workflow-clone .image-node img,#workflow-clone .video-node img{display:block;width:calc(100% - 8px);height:206px;margin:4px;object-fit:cover;border-radius:4px;background:#101014}
#workflow-clone .video-node{width:178px}
#workflow-clone .video-node img{height:250px}
#workflow-clone .prompt-node{width:210px;padding-bottom:8px}
#workflow-clone .prompt-node p{font-size:9px;line-height:1.45;color:#dfdfe8;padding:10px 12px 6px}
#workflow-clone .plain-chip,#workflow-clone .node-footer{color:#a9a9b4;font-size:9px;padding:0 8px 6px}
#workflow-clone .node-header{height:24px;padding:0 7px;border-bottom:1px solid #383842;display:flex;align-items:center;justify-content:space-between;gap:6px;color:#e8e8ef;font-size:9px;font-weight:800}
#workflow-clone .provider-badge{position:absolute;top:-22px;left:0;color:#dfefff;font-size:9px;font-weight:800}
#workflow-clone .port{position:absolute;width:17px;height:17px;border-radius:50%;border:1px solid #777b9d;background:#343954;color:#d7d8ff;display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;top:50%}
#workflow-clone .port.left{left:-9px}
#workflow-clone .port.right{right:-9px}
#workflow-clone .node-a{left:31%;top:25%}
#workflow-clone .node-b{left:31%;top:58%}
#workflow-clone .node-c{left:31%;top:77%}
#workflow-clone .node-d{left:50%;top:25%}
#workflow-clone .node-e{left:50.5%;top:59%}
#workflow-clone .node-f{left:50.5%;top:76%}
#workflow-clone .node-g{left:68%;top:16%}
#workflow-clone .node-h{left:68.5%;top:57%}
#workflow-clone .floating-toolbar,#workflow-clone .zoom-toolbar,#workflow-clone .center-btn{position:absolute;z-index:4;background:rgba(18,18,20,.94);border:1px solid #34343a;border-radius:10px}
#workflow-clone .floating-toolbar{left:20px;top:44%;display:flex;flex-direction:column;padding:12px;gap:16px}
#workflow-clone .floating-toolbar button,#workflow-clone .zoom-toolbar button{color:#aaaab4;background:transparent;display:inline-flex}
#workflow-clone .zoom-toolbar{left:20px;bottom:20px;height:54px;display:flex;align-items:center;gap:18px;padding:0 18px;color:#a9a9c0}
#workflow-clone .center-btn{left:50%;bottom:22px;transform:translateX(-50%);height:50px;padding:0 20px;color:#efeff4;background:rgba(31,31,32,.94);display:inline-flex;align-items:center;gap:9px;font-weight:800;font-size:18px}
#workflow-clone .import-modal{width:min(720px,100%);margin:auto;background:#171717;border:1px solid #33333a;border-radius:8px;padding:18px;display:flex;flex-direction:column;gap:14px}
#workflow-clone .import-header{display:flex;align-items:center;justify-content:space-between}
#workflow-clone .import-modal textarea{width:100%;min-height:320px;resize:vertical;background:#101014;color:#f5f5f5;border:1px solid #34343a;border-radius:7px;padding:12px;font:12px ui-monospace,SFMono-Regular,Consolas,monospace}
#workflow-clone .flow-runner-modal{width:min(1180px,100%);max-height:calc(100vh - 36px);overflow:auto;margin:auto;background:#171717;border:1px solid #3a3a42;border-radius:8px;padding:20px;display:flex;flex-direction:column;gap:16px;box-shadow:0 24px 80px rgba(0,0,0,.7)}
#workflow-clone .flow-runner-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid #2d2d32;padding-bottom:14px}
#workflow-clone .flow-runner-header h2{font-size:22px;line-height:1.25;margin:4px 0 0;color:#f5f5f5}
#workflow-clone .runner-kicker{color:#bfff00;font-size:12px;font-weight:800;text-transform:uppercase}
#workflow-clone .runner-flow-url{display:flex;flex-direction:column;gap:7px}
#workflow-clone .runner-flow-url label{color:#a8a8b2;font-size:12px;font-weight:800;text-transform:uppercase}
#workflow-clone .runner-flow-url input{width:100%;height:42px;background:#101014;color:#f5f5f5;border:1px solid #34343a;border-radius:7px;padding:0 12px;font:13px ui-monospace,SFMono-Regular,Consolas,monospace}
#workflow-clone .runner-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
#workflow-clone .open-flow-btn{min-height:42px;display:inline-flex;align-items:center;gap:8px;color:#111;background:#bfff00;border-radius:8px;padding:0 16px;font-weight:900;text-decoration:none}
#workflow-clone .runner-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
#workflow-clone .runner-panel{background:#202024;border:1px solid #33333a;border-radius:8px;padding:14px}
#workflow-clone .runner-panel-wide{grid-column:1 / -1}
#workflow-clone .runner-panel h3{font-size:16px;color:#f5f5f5;margin-bottom:8px}
#workflow-clone .runner-panel>p{color:#a8a8b2;font-size:13px;line-height:1.5;margin-bottom:12px}
#workflow-clone .runner-list{display:flex;flex-direction:column;gap:10px}
#workflow-clone .runner-node-row,#workflow-clone .runner-prompt-row,#workflow-clone .runner-output-row{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#161619;border:1px solid #303036;border-radius:7px;padding:10px}
#workflow-clone .runner-node-row img{width:64px;height:64px;border-radius:6px;object-fit:cover;background:#111}
#workflow-clone .runner-node-row div,#workflow-clone .runner-prompt-row div{flex:1;min-width:0}
#workflow-clone .runner-node-row strong,#workflow-clone .runner-prompt-row strong,#workflow-clone .runner-output-row strong{display:block;color:#f1f1f4;font-size:13px}
#workflow-clone .runner-node-row span,#workflow-clone .runner-output-row span{display:block;color:#9d9da7;font-size:12px;margin-top:3px}
#workflow-clone .runner-prompt-row p{color:#c9c9d2;font-size:12px;line-height:1.45;margin-top:5px}
#workflow-clone .runner-node-row input{width:100%;height:32px;background:#101014;color:#f5f5f5;border:1px solid #34343a;border-radius:6px;padding:0 8px;margin-top:6px;font-size:12px}
#workflow-clone .runner-prompt-row textarea{width:100%;min-height:92px;background:#101014;color:#f5f5f5;border:1px solid #34343a;border-radius:6px;padding:9px;margin-top:8px;resize:vertical;font-size:12px;line-height:1.45}
#workflow-clone .mini-link{color:#bfff00;text-decoration:none;font-size:12px;font-weight:800}
#workflow-clone .runner-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
#workflow-clone .runner-step{display:flex;align-items:center;gap:10px;background:#161619;border:1px solid #303036;border-radius:7px;padding:10px}
#workflow-clone .runner-step>span{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#bfff00;color:#111;font-weight:900;flex:0 0 auto}
#workflow-clone .runner-step strong{display:block;color:#f1f1f4;font-size:12px}
#workflow-clone .runner-step small{display:block;color:#9d9da7;font-size:11px;margin-top:3px}
#workflow-clone .runner-note{color:#ffd166;background:rgba(255,209,102,.08);border:1px solid rgba(255,209,102,.24);border-radius:7px;padding:10px 12px;font-size:13px;line-height:1.5}
@media (max-width:1240px){#workflow-clone.workflow-page-shell{grid-template-columns:1fr}#workflow-clone .workflow-side{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}#workflow-clone .editor-titlebar{align-items:flex-start;flex-direction:column}}
@media (max-width:860px){#workflow-clone .template-grid,#workflow-clone .workflow-side,#workflow-clone .runner-grid{grid-template-columns:1fr}#workflow-clone .runner-steps{grid-template-columns:1fr}#workflow-clone .search-row{grid-template-columns:1fr}#workflow-clone .toby-header,#workflow-clone .toby-footer{align-items:flex-start;flex-direction:column}#workflow-clone .workflow-date{min-width:0;width:min(100%,300px)}#workflow-clone .editor-overlay{padding:0}#workflow-clone .editor-window{height:100vh;border-radius:0}#workflow-clone .canvas{min-width:1060px;overflow:auto}}
`;

export default WorkflowsPage;
