"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/components/layout/AuthProvider";
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
  LogOut,
  Download,
  Film,
  Wand2,
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/gallery", icon: Images, label: "Thư viện ảnh" },
  { href: "/prompts", icon: BookOpen, label: "Prompt Library" },
  { href: "/video-prompts", icon: Video, label: "Video Prompt" },
  { href: "/downloader", icon: Download, label: "SnapSave" },
  { href: "/videos", icon: Film, label: "Lưu trữ Video" },
  { href: "/workflows", icon: Workflow, label: "Workflow" },
  { href: "/import", icon: FileUp, label: "Nhập dữ liệu" },
  { href: "/ai-image", icon: Wand2, label: "Tạo ảnh AI" },
  { href: "/search", icon: Search, label: "Tìm kiếm" },
  { href: "/favorites", icon: Heart, label: "Yêu thích" },
  { href: "/settings", icon: Settings, label: "Cài đặt" },
];

const Sidebar = () => {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore();
  const { user, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const firstLetter = user?.email ? user.email.charAt(0).toUpperCase() : "U";
  const userPrefix = user?.email ? user.email.split("@")[0] : "User";

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
                prefetch={false}
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

        {/* User Info & Sign Out inside Sidebar for Mobile/Tablet convenience */}
        {sidebarOpen && user && (
          <div
            className="sidebar-user-footer"
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border-primary)",
              background: "rgba(255, 255, 255, 0.02)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--radius-full)",
                  background: "var(--gradient-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "white",
                  flexShrink: 0,
                }}
              >
                {firstLetter}
              </div>
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }} title={user.email || ""}>
                  {userPrefix}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }} title={user.email || ""}>
                  {user.email}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => signOut()}
              className="btn-icon"
              style={{ width: 30, height: 30, color: "var(--accent-pink)", flexShrink: 0 }}
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        {/* Footer */}
        {sidebarOpen && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--border-primary)",
              fontSize: 12,
              color: "var(--text-muted)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={12} style={{ color: "var(--accent-purple)" }} />
              PromptVault v1.0
            </div>
            {mounted && typeof window !== "undefined" && (
              <div style={{ fontSize: 9, color: "var(--accent-pink)", marginTop: 4, wordBreak: "break-all" }}>
                HTML: "{document.documentElement.className}" | Body: "{document.body.className}" | BG: "{window.getComputedStyle(document.body).backgroundColor}"
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
