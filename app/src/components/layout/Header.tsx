"use client";

import { useAppStore } from "@/lib/store";
import {
  Search,
  Menu,
  Upload,
  Bell,
  Plus,
} from "lucide-react";

const Header = () => {
  const {
    sidebarOpen,
    toggleSidebar,
    searchQuery,
    setSearchQuery,
    setUploadModalOpen,
  } = useAppStore();

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

        {/* Avatar */}
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
            fontWeight: 600,
            color: "white",
            cursor: "pointer",
            marginLeft: 4,
          }}
        >
          A
        </div>
      </div>
    </header>
  );
};

export default Header;
