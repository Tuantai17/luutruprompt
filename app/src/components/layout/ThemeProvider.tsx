"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

// HACK: React 19 cảnh báo lỗi khi gặp thẻ <script> bên trong component hoặc render ngoài main document (do next-themes tiêm script để tránh chớp theme).
// Đồng thời, ta cũng lọc bỏ các cảnh báo hydration mismatch do Extension trình duyệt tự động tiêm thuộc tính (như bis_skin_checked) để tránh hiện overlay đỏ.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const errorMsg = typeof args[0] === "string" ? args[0] : "";
    if (
      errorMsg.includes("Encountered a script tag while rendering React component") ||
      errorMsg.includes("Cannot render a sync or defer <script> outside the main document") ||
      errorMsg.includes("bis_skin_checked") ||
      errorMsg.includes("hydration-error") ||
      errorMsg.includes("Hydration failed") ||
      errorMsg.includes("A tree hydrated but some attributes")
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

// Component phụ giúp đồng bộ class của thẻ html với theme state của next-themes trên client-side (khắc phục lỗi lifecycle của next-themes với React 19)
function ThemeSync() {
  const { theme, resolvedTheme } = useTheme();

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const activeTheme = theme === "system" ? resolvedTheme : theme;
    const root = document.documentElement;

    if (activeTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (activeTheme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [theme, resolvedTheme]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSync />
      {children}
    </NextThemesProvider>
  );
}

