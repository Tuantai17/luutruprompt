"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/components/layout/AuthProvider";
import {
  Search,
  Menu,
  Upload,
  Bell,
  Plus,
  LogOut,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

const Header = () => {
  const {
    sidebarOpen,
    toggleSidebar,
    searchQuery,
    setSearchQuery,
    setUploadModalOpen,
  } = useAppStore();

  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const firstLetter = user?.email ? user.email.charAt(0).toUpperCase() : "U";
  const userPrefix = user?.email ? user.email.split("@")[0] : "User";

  return (
    <header
      style={{
        height: "var(--header-height)",
        borderBottom: "1px solid var(--border-primary)",
        background: "var(--bg-secondary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 30,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Left side */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
        {/* Mobile menu button */}
        <button
          onClick={toggleSidebar}
          className="btn-icon mobile-menu-btn"
          style={{ flexShrink: 0 }}
          title="Menu"
        >
          <Menu size={20} />
        </button>

        {/* Search bar */}
        <div
          className="header-search-container"
          style={{
            position: "relative",
            width: "380px",
            maxWidth: "50vw",
            transition: "all var(--transition-base)",
          }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{
              paddingLeft: 36,
              height: 40,
              fontSize: 13,
              background: "var(--bg-tertiary)",
              textOverflow: "ellipsis",
            }}
          />
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="btn-primary"
          style={{ padding: "8px 12px", fontSize: 13 }}
          title="Tải ảnh/prompt lên"
        >
          <Plus size={16} style={{ flexShrink: 0 }} />
          <span className="btn-upload-text">Tải lên</span>
        </button>

        <button className="btn-icon header-hide-mobile" title="Upload nhanh">
          <Upload size={18} />
        </button>

        <button className="btn-icon header-hide-mobile" title="Thông báo">
          <Bell size={18} />
        </button>

        {/* Theme Switcher */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="btn-icon"
            title="Chuyển chế độ Sáng/Tối"
            style={{ position: "relative" }}
          >
            {mounted && theme === "dark" ? (
              <Moon size={18} style={{ color: "var(--accent-purple)" }} />
            ) : mounted && theme === "light" ? (
              <Sun size={18} style={{ color: "var(--accent-amber)" }} />
            ) : (
              <Monitor size={18} />
            )}
          </button>

          {showThemeMenu && (
            <>
              {/* Overlay click to close */}
              <div
                onClick={() => setShowThemeMenu(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 40,
                }}
              />
              <div
                className="glass-card animate-scaleIn"
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 8,
                  width: 140,
                  padding: 4,
                  zIndex: 50,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  border: "1px solid var(--border-primary)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {[
                  { value: "light", label: "☀️ Sáng" },
                  { value: "dark", label: "🌙 Tối" },
                  { value: "system", label: "💻 Hệ thống" },
                ].map((item) => {
                  const isActive = theme === item.value;
                  return (
                    <button
                      key={item.value}
                      onClick={() => {
                        setTheme(item.value);
                        setShowThemeMenu(false);
                      }}
                      className="btn-ghost"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: 12.5,
                        justifyContent: "flex-start",
                        borderRadius: "var(--radius-sm)",
                        background: isActive ? "var(--bg-tertiary)" : "transparent",
                        color: isActive ? "var(--accent-purple)" : "var(--text-primary)",
                        fontWeight: isActive ? 600 : 500,
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* User Profile & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "4px", borderLeft: "1px solid var(--border-primary)", paddingLeft: "12px", flexShrink: 0 }}>
          <div className="user-text-container" style={{ flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "90px" }} title={user?.email || ""}>
              {userPrefix}
            </span>
            <button
              onClick={() => signOut()}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-pink)",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
                outline: "none",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}
              title="Đăng xuất tài khoản"
            >
              <LogOut size={10} /> Thoát
            </button>
          </div>

          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--radius-full)",
              background: "var(--gradient-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "white",
              cursor: "default",
              boxShadow: "0 0 10px rgba(139, 92, 246, 0.4)",
              flexShrink: 0,
            }}
            title={user?.email || "User"}
          >
            {firstLetter}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
