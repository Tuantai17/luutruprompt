"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import {
  LayoutDashboard,
  Images,
  BookOpen,
  Video,
  Workflow,
  FileUp,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Heart,
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/gallery", icon: Images, label: "Thư viện ảnh" },
  { href: "/prompts", icon: BookOpen, label: "Prompt Library" },
  { href: "/video-prompts", icon: Video, label: "Video Prompt" },
  { href: "/workflows", icon: Workflow, label: "Workflow" },
  { href: "/import", icon: FileUp, label: "Nhập dữ liệu" },
  { href: "/search", icon: Search, label: "Tìm kiếm" },
  { href: "/favorites", icon: Heart, label: "Yêu thích" },
  { href: "/settings", icon: Settings, label: "Cài đặt" },
];

const Sidebar = () => {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore();

  useEffect(() => {
    // Thu gọn sidebar khi ở màn hình mobile lúc mới load
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  // Tự động thu gọn sidebar trên mobile khi chuyển trang
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [pathname, setSidebarOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-mobile-overlay"
          onClick={toggleSidebar}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 35,
          }}
        />
      )}

      <aside
        className={`sidebar ${!sidebarOpen ? "sidebar-collapsed" : ""} ${sidebarOpen ? "sidebar-mobile-open" : ""}`}
        style={{ width: sidebarOpen ? "var(--sidebar-width)" : "var(--sidebar-collapsed)" }}
      >
        {/* Logo */}
        <div
          style={{
            padding: sidebarOpen ? "20px 20px 16px" : "20px 0 16px",
            borderBottom: "1px solid var(--border-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarOpen ? "space-between" : "center",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-md)",
                background: "var(--gradient-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} color="white" />
            </div>
            {sidebarOpen && (
              <span
                className="gradient-text"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                PromptVault
              </span>
            )}
          </Link>

          {sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="btn-icon"
              title="Thu gọn sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: "12px 8px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            overflowY: "auto",
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: sidebarOpen ? "10px 14px" : "10px 0",
                  borderRadius: "var(--radius-md)",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  background: isActive
                    ? "rgba(139, 92, 246, 0.12)"
                    : "transparent",
                  borderLeft: isActive
                    ? "3px solid var(--accent-purple)"
                    : "3px solid transparent",
                  transition: "all var(--transition-fast)",
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--bg-tertiary)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                <Icon
                  size={20}
                  style={{
                    flexShrink: 0,
                    color: isActive ? "var(--accent-purple)" : "inherit",
                  }}
                />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse button (when collapsed) */}
        {!sidebarOpen && (
          <div
            style={{
              padding: "12px",
              borderTop: "1px solid var(--border-primary)",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <button
              onClick={toggleSidebar}
              className="btn-icon"
              title="Mở rộng sidebar"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Footer */}
        {sidebarOpen && (
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--border-primary)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={12} style={{ color: "var(--accent-purple)" }} />
              PromptVault v1.0
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
