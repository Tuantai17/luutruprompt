"use client";

import { useAppStore } from "@/lib/store";
import { useAuth } from "@/components/layout/AuthProvider";
import {
  Search,
  Menu,
  Upload,
  Bell,
  Plus,
  LogOut,
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
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Mobile menu button */}
        <button
          onClick={toggleSidebar}
          className="btn-icon"
          style={{ display: sidebarOpen ? "none" : "flex" }}
          title="Menu"
        >
          <Menu size={20} />
        </button>

        {/* Search bar */}
        <div
          style={{
            position: "relative",
            width: "380px",
            maxWidth: "50vw",
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
            placeholder="Tìm kiếm prompt, ảnh, workflow..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{
              paddingLeft: 36,
              height: 40,
              fontSize: 13,
              background: "var(--bg-tertiary)",
            }}
          />
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="btn-primary"
          style={{ padding: "8px 16px", fontSize: 13 }}
        >
          <Plus size={16} />
          <span>Tải lên</span>
        </button>

        <button className="btn-icon" title="Upload nhanh">
          <Upload size={18} />
        </button>

        <button className="btn-icon" title="Thông báo">
          <Bell size={18} />
        </button>

        {/* User Profile & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "12px", borderLeft: "1px solid var(--border-primary)", paddingLeft: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100px" }} title={user?.email || ""}>
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
