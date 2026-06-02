"use client";

import { useAppStore } from "@/lib/store";
import Sidebar from "./Sidebar";
import Header from "./Header";

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { sidebarOpen } = useAppStore();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div
        className={`main-content ${!sidebarOpen ? "main-content-expanded" : ""}`}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          transition: "margin-left var(--transition-base)",
        }}
      >
        <Header />
        <main
          style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
