/**
 * CSS Selectors cho ChatGPT UI
 *
 * ⚠️ QUAN TRỌNG: ChatGPT có thể thay đổi UI bất cứ lúc nào.
 * Khi automation bị lỗi, kiểm tra và cập nhật selectors tại đây.
 *
 * Cập nhật lần cuối: 2026-06-07
 */

export const SELECTORS = {
  // ===== Login Page =====
  LOGIN_EMAIL_INPUT: 'input[name="email"], input[type="email"]',
  LOGIN_CONTINUE_BUTTON: 'button[type="submit"], button._button-login-id',
  LOGIN_PASSWORD_INPUT: 'input[name="password"], input[type="password"]',
  LOGIN_SUBMIT_BUTTON: 'button[type="submit"], button._button-login-password',
  LOGIN_GOOGLE_BUTTON: 'button:has-text("Continue with Google"), button:has-text("Tiếp tục với Google"), a:has-text("Continue with Google"), a:has-text("Tiếp tục với Google"), button:has-text("Google")',

  // ===== Main Chat Interface =====
  CHAT_INPUT: "#prompt-textarea, [contenteditable='true']",
  SEND_BUTTON:
    'button[data-testid="send-button"], button[aria-label="Send prompt"]',
  ATTACHMENT_BUTTON:
    'button[aria-label="Attach files"], button[data-testid="attachment-button"]',
  FILE_INPUT: 'input[type="file"]',

  // ===== Create Image Mode =====
  PLUS_BUTTON: 'button[aria-label="Open menu"], button.text-token-text-primary',
  CREATE_IMAGE_OPTION:
    '[data-testid="create-image"], [role="menuitem"]:has-text("Create image"), [role="menuitem"]:has-text("Tạo hình ảnh")',

  // ===== Generated Image =====
  GENERATED_IMAGE:
    'img[alt*="Generated"], img[data-testid="generated-image"], .dalle-image img',
  IMAGE_DOWNLOAD_BUTTON:
    'button[aria-label="Download"], a[download], button:has-text("Download")',

  // ===== Loading/Processing States =====
  LOADING_INDICATOR:
    '[data-testid="loading"], .result-streaming, [class*="typing"]',
  GENERATING_TEXT: 'text=/Generating|Creating|Đang tạo/i',

  // ===== Navigation & Auth State =====
  USER_MENU: '[data-testid="profile-button"], button[aria-label="Open profile menu"], button[aria-label*="hồ sơ"], button[aria-label*="profile"]',
  LOGIN_BUTTON:
    'a[href*="auth"], button[data-testid*="login"], a[data-testid*="login"], button:has-text("Log in"), button:has-text("Đăng nhập"), button:has-text("Sign in"), a:has-text("Log in"), a:has-text("Đăng nhập")',
  CHAT_LIST: 'nav[aria-label="Chat history"]',

  // ===== Error Messages =====
  ERROR_MESSAGE:
    '[data-testid="error-message"], .text-red-500, [class*="error"]',
} as const;

/**
 * URLs ChatGPT
 */
export const CHATGPT_URLS = {
  HOME: "https://chatgpt.com",
  LOGIN: "https://chatgpt.com/auth/login",
  AUTH0_LOGIN: "https://auth0.openai.com",
} as const;

/**
 * Timeouts (ms)
 */
export const TIMEOUTS = {
  PAGE_LOAD: 30_000,
  LOGIN_COMPLETE: 60_000,
  IMAGE_GENERATION: 300_000, // 5 phút
  FILE_UPLOAD: 30_000,
  ELEMENT_VISIBLE: 10_000,
  NAVIGATION: 15_000,
} as const;
