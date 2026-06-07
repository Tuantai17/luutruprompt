/**
 * ChatGPT Automation Engine - Playwright
 *
 * Điều khiển trình duyệt để tự động tạo ảnh trên ChatGPT.
 * ⚠️ Đây là cách sử dụng không chính thức, có thể bị chặn.
 */

import { chromium, Browser, BrowserContext, Page } from "playwright";
import { SELECTORS, CHATGPT_URLS, TIMEOUTS } from "./selectors";
import * as fs from "fs";
import * as path from "path";

export interface AutomationResult {
  success: boolean;
  imageUrl?: string;
  imageBuffer?: Buffer;
  error?: string;
  screenshot?: string;
}

export interface AutomationCallbacks {
  onLog: (level: "info" | "success" | "warning" | "error", message: string) => void;
  onStatusChange: (status: string) => void;
}

export class ChatGPTAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private callbacks: AutomationCallbacks;

  // Thư mục lưu trữ session cookies
  private userDataDir: string;

  constructor(callbacks: AutomationCallbacks, userDataDir?: string) {
    this.callbacks = callbacks;
    this.userDataDir = userDataDir || path.join(process.cwd(), ".automation-data");
  }

  private log(level: "info" | "success" | "warning" | "error", message: string) {
    this.callbacks.onLog(level, message);
    console.log(`[ChatGPT-Auto] [${level.toUpperCase()}] ${message}`);
  }

  /**
   * Khởi tạo trình duyệt Playwright
   */
  async initialize(): Promise<void> {
    this.log("info", "🚀 Đang khởi tạo trình duyệt...");

    try {
      // Tạo thư mục lưu trữ session nếu chưa có
      if (!fs.existsSync(this.userDataDir)) {
        fs.mkdirSync(this.userDataDir, { recursive: true });
      }

      this.browser = await chromium.launch({
        headless: false, // Hiển thị trình duyệt để user quan sát
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          "--disable-features=IsolateOrigins,site-per-process",
        ],
      });

      // Tạo context với persistent cookies
      const cookiePath = path.join(this.userDataDir, "cookies.json");
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        locale: "vi-VN",
      });

      // Load cookies cũ nếu có
      if (fs.existsSync(cookiePath)) {
        try {
          const cookies = JSON.parse(fs.readFileSync(cookiePath, "utf-8"));
          await this.context.addCookies(cookies);
          this.log("info", "📦 Đã tải session cookies cũ");
        } catch {
          this.log("warning", "⚠️ Không thể tải cookies cũ, sẽ đăng nhập lại");
        }
      }

      this.page = await this.context.newPage();
      this.log("success", "✅ Trình duyệt đã sẵn sàng");
    } catch (error: any) {
      this.log("error", `❌ Lỗi khởi tạo trình duyệt: ${error.message}`);
      throw error;
    }
  }

  /**
   * Kiểm tra đã đăng nhập ChatGPT chưa
   */
  async isLoggedIn(): Promise<boolean> {
    if (!this.page) throw new Error("Browser chưa được khởi tạo");

    try {
      this.log("info", "🔍 Kiểm tra trạng thái đăng nhập...");
      await this.page.goto(CHATGPT_URLS.HOME, {
        waitUntil: "domcontentloaded",
        timeout: TIMEOUTS.PAGE_LOAD,
      });

      // Đợi trang load xong
      await this.page.waitForTimeout(3000);

      // Kiểm tra có user menu không → đã đăng nhập
      const userMenu = await this.page.$(SELECTORS.USER_MENU);

      if (userMenu) {
        this.log("success", "✅ Đã đăng nhập ChatGPT (tìm thấy user menu)");
        return true;
      }

      // Kiểm tra có nút login → chưa đăng nhập
      const loginBtn = await this.page.$(SELECTORS.LOGIN_BUTTON);
      if (loginBtn) {
        this.log("warning", "⚠️ Chưa đăng nhập ChatGPT (tìm thấy nút đăng nhập)");
        return false;
      }

      // Nếu URL chứa auth → chưa đăng nhập
      const currentUrl = this.page.url();
      if (currentUrl.includes("auth") || currentUrl.includes("login")) {
        this.log("warning", "⚠️ Đang ở trang đăng nhập");
        return false;
      }

      this.log("info", "ℹ️ Không tìm thấy user menu, mặc định coi là chưa đăng nhập");
      return false;
    } catch (error: any) {
      this.log("error", `❌ Lỗi kiểm tra đăng nhập: ${error.message}`);
      return false;
    }
  }

  /**
   * Mở khóa tương tác trên trang (loại bỏ pointer-events: none của Radix UI nếu có)
   */
  private async unlockInteractions(): Promise<void> {
    if (!this.page) return;
    try {
      await this.page.evaluate(() => {
        if (document.body) {
          document.body.style.pointerEvents = 'auto';
          document.body.style.removeProperty('pointer-events');
          document.body.removeAttribute('data-scroll-locked');
        }
        const html = document.documentElement;
        if (html) {
          html.style.pointerEvents = 'auto';
          html.style.removeProperty('pointer-events');
        }
      });
    } catch {
      // Bỏ qua nếu lỗi
    }
  }

  /**
   * Đăng nhập ChatGPT
   */
  async login(loginMethod: "email" | "google", email?: string, password?: string): Promise<void> {
    if (!this.page) throw new Error("Browser chưa được khởi tạo");

    this.log("info", `🔐 Bắt đầu đăng nhập ChatGPT bằng ${loginMethod === "google" ? "Google" : "Email"}...`);
    this.callbacks.onStatusChange("Đang đăng nhập...");

    try {
      // Bước 1: Truy cập thẳng trang login
      this.log("info", "🌐 Đang truy cập trang đăng nhập ChatGPT...");
      await this.page.goto(CHATGPT_URLS.LOGIN, {
        waitUntil: "domcontentloaded",
        timeout: TIMEOUTS.PAGE_LOAD,
      });
      await this.page.waitForTimeout(3000);

      // Giải phóng khóa tương tác trước khi tìm nút
      await this.unlockInteractions();

      // Tìm và click nút Login nếu có (sử dụng force: true và bọc try-catch phòng trường hợp bị che khuất)
      const loginBtn = await this.page.$(SELECTORS.LOGIN_BUTTON);
      if (loginBtn) {
        try {
          this.log("info", "🖱 Thử nhấp vào nút đăng nhập...");
          await loginBtn.click({ force: true, timeout: 5000 });
          await this.page.waitForTimeout(3000);
        } catch (err: any) {
          this.log("warning", `⚠️ Bỏ qua lỗi click nút đăng nhập: ${err.message}`);
        }
      }

      // Giải phóng khóa tương tác
      await this.unlockInteractions();

      if (loginMethod === "google") {
        this.log("info", "🔵 Đang nhấp chọn Tiếp tục với Google...");
        await this.page.waitForSelector(SELECTORS.LOGIN_GOOGLE_BUTTON, {
          timeout: TIMEOUTS.ELEMENT_VISIBLE,
        });
        const googleBtn = await this.page.$(SELECTORS.LOGIN_GOOGLE_BUTTON);
        if (googleBtn) {
          await googleBtn.click({ force: true });
        } else {
          throw new Error("Không tìm thấy nút đăng nhập Google");
        }

        this.log("warning", "👉 VUI LÒNG TỰ THỰC HIỆN ĐĂNG NHẬP GOOGLE TRÊN TRÌNH DUYỆT ĐANG MỞ...");
        this.callbacks.onStatusChange("Vui lòng đăng nhập Google trên trình duyệt...");

        // Chờ đăng nhập thành công bằng cách kiểm tra sự xuất hiện của CHAT_INPUT
        // Tăng timeout lên 120 giây (2 phút) để người dùng kịp thao tác
        await this.page.waitForSelector(SELECTORS.CHAT_INPUT, {
          timeout: 120_000,
        });
      } else {
        if (!email || !password) {
          throw new Error("Thiếu tài khoản hoặc mật khẩu đăng nhập");
        }

        // Bước 2: Điền email
        this.log("info", "📧 Đang điền email...");
        await this.page.waitForSelector(SELECTORS.LOGIN_EMAIL_INPUT, {
          timeout: TIMEOUTS.ELEMENT_VISIBLE,
        });
        
        await this.unlockInteractions();
        await this.page.fill(SELECTORS.LOGIN_EMAIL_INPUT, email);
        await this.page.waitForTimeout(500);

        // Click Continue
        const continueBtn = await this.page.$(SELECTORS.LOGIN_CONTINUE_BUTTON);
        if (continueBtn) {
          await this.unlockInteractions();
          await continueBtn.click({ force: true });
          await this.page.waitForTimeout(4000); // Tăng thời gian chờ để trang kịp chuyển hướng
        }

        // TỰ ĐỘNG PHÁT HIỆN CHUYỂN HƯỚNG SANG GOOGLE LOGIN
        const currentUrl = this.page.url();
        if (currentUrl.includes("accounts.google.com") || currentUrl.includes("google")) {
          this.log("warning", "🚨 Phát hiện trang đăng nhập Google! Tự động chuyển đổi sang chế độ đăng nhập Google thủ công...");
          this.callbacks.onStatusChange("Vui lòng đăng nhập Google trên trình duyệt...");
          
          // Chờ đăng nhập thành công bằng cách kiểm tra sự xuất hiện của CHAT_INPUT (2 phút)
          await this.page.waitForSelector(SELECTORS.CHAT_INPUT, {
            timeout: 120_000,
          });
          return; // Kết thúc hàm login thành công
        }

        // Bước 3: Điền password
        this.log("info", "🔑 Đang điền mật khẩu...");
        await this.page.waitForSelector(SELECTORS.LOGIN_PASSWORD_INPUT, {
          timeout: TIMEOUTS.ELEMENT_VISIBLE,
        });
        
        await this.unlockInteractions();
        await this.page.fill(SELECTORS.LOGIN_PASSWORD_INPUT, password);
        await this.page.waitForTimeout(500);

        // Click Submit
        const submitBtn = await this.page.$(SELECTORS.LOGIN_SUBMIT_BUTTON);
        if (submitBtn) {
          await this.unlockInteractions();
          await submitBtn.click({ force: true });
        }

        // Bước 4: Chờ đăng nhập thành công
        this.log("info", "⏳ Đang chờ đăng nhập hoàn tất...");
        await this.page.waitForSelector(SELECTORS.CHAT_INPUT, {
          timeout: TIMEOUTS.LOGIN_COMPLETE,
        });
      }

      // Lưu cookies
      await this.saveCookies();

      this.log("success", "✅ Đăng nhập thành công!");
      this.callbacks.onStatusChange("Đã đăng nhập");
    } catch (error: any) {
      // Chụp screenshot lỗi
      await this.takeErrorScreenshot("login-error");
      this.log("error", `❌ Đăng nhập thất bại: ${error.message}`);
      throw new Error(`Đăng nhập thất bại: ${error.message}`);
    }
  }

  /**
   * Chọn chế độ Create Image
   */
  async selectCreateImageMode(): Promise<void> {
    if (!this.page) throw new Error("Browser chưa được khởi tạo");

    this.log("info", '🎨 Đang chọn chế độ "Create Image"...');
    this.callbacks.onStatusChange("Chọn Create Image...");

    try {
      // Cách 1: Click nút "+" để mở menu
      const plusBtn = await this.page.$(SELECTORS.PLUS_BUTTON);
      if (plusBtn) {
        await plusBtn.click();
        await this.page.waitForTimeout(1000);
      }

      // Cách 2: Tìm và click "Create Image"
      const createImageBtn = await this.page.$(SELECTORS.CREATE_IMAGE_OPTION);
      if (createImageBtn) {
        await createImageBtn.click();
        await this.page.waitForTimeout(1500);
        this.log("success", '✅ Đã chọn "Create Image"');
        return;
      }

      // Cách 3: Thử click trực tiếp bằng text
      try {
        await this.page.click('text="Create image"', { timeout: 3000 });
        await this.page.waitForTimeout(1500);
        this.log("success", '✅ Đã chọn "Create Image" (text match)');
        return;
      } catch {
        // Thử tiếng Việt
        try {
          await this.page.click('text="Tạo hình ảnh"', { timeout: 3000 });
          await this.page.waitForTimeout(1500);
          this.log("success", '✅ Đã chọn "Tạo hình ảnh"');
          return;
        } catch {
          this.log("warning", '⚠️ Không tìm thấy nút "Create Image", sẽ gửi prompt trực tiếp');
        }
      }
    } catch (error: any) {
      this.log("warning", `⚠️ Không thể chọn Create Image mode: ${error.message}`);
    }
  }

  /**
   * Tạo ảnh: upload ảnh tham chiếu + gửi prompt
   */
  async createImage(imagePath: string, prompt: string): Promise<AutomationResult> {
    if (!this.page) throw new Error("Browser chưa được khởi tạo");

    this.log("info", "🎨 Bắt đầu tạo ảnh...");
    this.callbacks.onStatusChange("Đang tạo ảnh...");

    try {
      // Bước 1: Upload ảnh tham chiếu
      if (imagePath) {
        this.log("info", "📤 Đang upload ảnh tham chiếu...");
        await this.uploadImage(imagePath);
        await this.page.waitForTimeout(2000);
      }

      // Bước 2: Nhập prompt
      this.log("info", "✍️ Đang nhập prompt...");
      await this.typePrompt(prompt);
      await this.page.waitForTimeout(1000);

      // Bước 3: Gửi prompt
      this.log("info", "📨 Đang gửi prompt...");
      await this.sendPrompt();

      // Bước 4: Chờ ảnh được tạo
      this.log("info", "⏳ Đang chờ ChatGPT tạo ảnh (tối đa 5 phút)...");
      this.callbacks.onStatusChange("Đang chờ ChatGPT tạo ảnh...");
      const imageUrl = await this.waitForGeneratedImage();

      if (!imageUrl) {
        throw new Error("Không tìm thấy ảnh kết quả sau thời gian chờ");
      }

      // Bước 5: Download ảnh
      this.log("info", "⬇️ Đang tải ảnh kết quả...");
      const imageBuffer = await this.downloadImage(imageUrl);

      // Lưu cookies để session sống lâu hơn
      await this.saveCookies();

      this.log("success", "✅ Tạo ảnh thành công!");
      this.callbacks.onStatusChange("Tạo ảnh thành công");

      return {
        success: true,
        imageUrl,
        imageBuffer,
      };
    } catch (error: any) {
      await this.takeErrorScreenshot("create-image-error");
      this.log("error", `❌ Tạo ảnh thất bại: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Upload ảnh tham chiếu vào ChatGPT
   */
  private async uploadImage(imagePath: string): Promise<void> {
    if (!this.page) return;

    try {
      // Tìm file input (có thể ẩn)
      const fileInput = await this.page.$(SELECTORS.FILE_INPUT);

      if (fileInput) {
        await fileInput.setInputFiles(imagePath);
        this.log("success", "✅ Đã upload ảnh tham chiếu");
      } else {
        // Thử click nút attachment trước
        const attachBtn = await this.page.$(SELECTORS.ATTACHMENT_BUTTON);
        if (attachBtn) {
          await attachBtn.click();
          await this.page.waitForTimeout(1000);

          // Sau khi click, tìm file input
          const fileInputAfter = await this.page.$(SELECTORS.FILE_INPUT);
          if (fileInputAfter) {
            await fileInputAfter.setInputFiles(imagePath);
            this.log("success", "✅ Đã upload ảnh tham chiếu (qua attachment button)");
          }
        } else {
          this.log("warning", "⚠️ Không tìm thấy cách upload ảnh, bỏ qua");
        }
      }

      // Chờ upload hoàn tất
      await this.page.waitForTimeout(3000);
    } catch (error: any) {
      this.log("warning", `⚠️ Lỗi upload ảnh: ${error.message}`);
    }
  }

  /**
   * Nhập prompt vào text area
   */
  private async typePrompt(prompt: string): Promise<void> {
    if (!this.page) return;

    await this.page.waitForSelector(SELECTORS.CHAT_INPUT, {
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    });

    // Dùng fill hoặc type tùy loại element
    const chatInput = await this.page.$(SELECTORS.CHAT_INPUT);
    if (!chatInput) throw new Error("Không tìm thấy chat input");

    const tagName = await chatInput.evaluate((el) => el.tagName.toLowerCase());

    if (tagName === "textarea" || tagName === "input") {
      await this.page.fill(SELECTORS.CHAT_INPUT, prompt);
    } else {
      // ContentEditable div
      await chatInput.click();
      await this.page.keyboard.type(prompt, { delay: 10 });
    }
  }

  /**
   * Gửi prompt (click Send hoặc Enter)
   */
  private async sendPrompt(): Promise<void> {
    if (!this.page) return;

    try {
      // Thử click nút Send
      const sendBtn = await this.page.$(SELECTORS.SEND_BUTTON);
      if (sendBtn) {
        const isEnabled = await sendBtn.isEnabled();
        if (isEnabled) {
          await sendBtn.click();
          return;
        }
      }
    } catch {
      // Fallback: Enter
    }

    // Fallback: Nhấn Enter
    await this.page.keyboard.press("Enter");
  }

  /**
   * Chờ ảnh được tạo xong
   */
  private async waitForGeneratedImage(): Promise<string | null> {
    if (!this.page) return null;

    const startTime = Date.now();
    const timeout = TIMEOUTS.IMAGE_GENERATION;

    while (Date.now() - startTime < timeout) {
      await this.page.waitForTimeout(5000); // Poll mỗi 5 giây

      // Tìm ảnh được tạo
      const images = await this.page.$$(SELECTORS.GENERATED_IMAGE);
      if (images.length > 0) {
        // Lấy ảnh cuối cùng (mới nhất)
        const lastImage = images[images.length - 1];
        const src = await lastImage.getAttribute("src");
        if (src) {
          this.log("success", `✅ Đã tìm thấy ảnh kết quả`);
          return src;
        }
      }

      // Tìm tất cả ảnh trong response cuối cùng
      const allImgs = await this.page.$$("img");
      for (const img of allImgs.reverse()) {
        const src = await img.getAttribute("src");
        const alt = await img.getAttribute("alt");
        if (
          src &&
          (src.includes("oaidalleapiprodscus") ||
            src.includes("dalle") ||
            src.includes("generated") ||
            (alt && alt.toLowerCase().includes("generated")))
        ) {
          this.log("success", "✅ Đã tìm thấy ảnh DALL-E");
          return src;
        }
      }

      // Log tiến trình
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (elapsed % 30 === 0) {
        this.log("info", `⏳ Đã chờ ${elapsed}s...`);
      }
    }

    this.log("error", "❌ Timeout: Không tìm thấy ảnh sau 5 phút");
    return null;
  }

  /**
   * Download ảnh từ URL
   */
  async downloadImage(url: string): Promise<Buffer> {
    if (!this.page) throw new Error("Browser chưa được khởi tạo");

    try {
      const response = await this.page.context().request.get(url);
      return Buffer.from(await response.body());
    } catch (error: any) {
      this.log("warning", `⚠️ Lỗi download trực tiếp, thử fetch: ${error.message}`);

      // Fallback: dùng fetch trong browser context
      const buffer = await this.page.evaluate(async (imgUrl: string) => {
        const res = await fetch(imgUrl);
        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();
        return Array.from(new Uint8Array(arrayBuffer));
      }, url);

      return Buffer.from(buffer);
    }
  }

  /**
   * Lưu cookies để tái sử dụng session
   */
  private async saveCookies(): Promise<void> {
    if (!this.context) return;

    try {
      const cookies = await this.context.cookies();
      const cookiePath = path.join(this.userDataDir, "cookies.json");
      fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
    } catch (error: any) {
      this.log("warning", `⚠️ Không thể lưu cookies: ${error.message}`);
    }
  }

  /**
   * Chụp screenshot lỗi để debug
   */
  private async takeErrorScreenshot(name: string): Promise<string | undefined> {
    if (!this.page) return undefined;

    try {
      const screenshotDir = path.join(this.userDataDir, "screenshots");
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      const filePath = path.join(
        screenshotDir,
        `${name}-${Date.now()}.png`
      );
      await this.page.screenshot({ path: filePath, fullPage: true });
      this.log("info", `📸 Screenshot lỗi đã lưu: ${filePath}`);
      return filePath;
    } catch {
      return undefined;
    }
  }

  /**
   * Đóng trình duyệt
   */
  async cleanup(): Promise<void> {
    this.log("info", "🧹 Đang đóng trình duyệt...");

    try {
      await this.saveCookies();
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();

      this.page = null;
      this.context = null;
      this.browser = null;

      this.log("success", "✅ Đã đóng trình duyệt");
    } catch (error: any) {
      this.log("error", `❌ Lỗi đóng trình duyệt: ${error.message}`);
    }
  }
}
