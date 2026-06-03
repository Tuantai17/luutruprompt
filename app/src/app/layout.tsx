import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { AuthProvider } from "@/components/layout/AuthProvider";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

export const metadata: Metadata = {
  title: "PromptVault - AI Prompt Asset Management",
  description:
    "Nền tảng quản lý ảnh AI, prompt, workflow. Thay thế việc lưu prompt rời rạc trên Facebook, Google Sheet.",
  keywords: [
    "AI",
    "prompt",
    "stable diffusion",
    "midjourney",
    "comfyui",
    "image management",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={true}
      disableTransitionOnChange
    >
      <html lang="vi" suppressHydrationWarning data-scroll-behavior="smooth">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
            rel="stylesheet"
          />
        </head>
        <body suppressHydrationWarning>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </body>
      </html>
    </ThemeProvider>
  );
}
