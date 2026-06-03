"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Lock, Mail, Eye, EyeOff, Sparkles, UserPlus, LogIn } from "lucide-react";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Form states
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  useEffect(() => {
    setMounted(true);

    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMsg("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMsg("Mật khẩu phải chứa ít nhất 6 ký tự.");
      return;
    }

    setAuthLoading(true);
    setErrorMsg("");
    setInfoMsg("");

    try {
      if (isSignUp) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
        });

        if (error) throw error;

        if (data.user && data.session === null) {
          // Email confirmation might be enabled
          setInfoMsg("🎉 Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác nhận tài khoản (hoặc đăng nhập ngay nếu đã tắt xác thực email).");
        } else {
          setInfoMsg("🎉 Đăng ký thành công và đã tự động đăng nhập!");
        }
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });

        if (error) throw error;
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Đã xảy ra lỗi trong quá trình xác thực.");
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
  };

  const renderLoading = () => (
    <div suppressHydrationWarning className="auth-bg" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div suppressHydrationWarning className="loader-container">
        <Loader2 className="loader-spinner" size={48} />
        <div suppressHydrationWarning className="loader-text">Đang kết nối hệ thống dữ liệu...</div>
      </div>
      <style jsx global>{`
        .auth-bg {
          background: radial-gradient(circle at 50% 50%, #151128 0%, #0b0914 100%);
          position: relative;
          overflow: hidden;
        }
        .loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 32px 48px;
          border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
          animation: pulse 2s infinite ease-in-out;
        }
        .loader-spinner {
          color: #8b5cf6;
          animation: spin 1.2s linear infinite;
          filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.6));
        }
        .loader-text {
          color: #a78bfa;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.02); opacity: 1; }
        }
      `}</style>
    </div>
  );

  if (!mounted || loading) {
    return renderLoading();
  }

  if (!user) {
    // Beautiful Glassmorphic Login/Register screen
    return (
      <div className="auth-bg">
        {/* Animated Light Orbs in Background */}
        <div className="orb orb-purple" />
        <div className="orb orb-cyan" />

        <div className="auth-card-container">
          <div className="auth-card">
            {/* Header */}
            <div className="auth-header">
              <div className="logo-glow">
                <Sparkles size={28} className="logo-icon" />
              </div>
              <h1 className="auth-title">
                <span className="gradient-text">PromptVault</span>
              </h1>
              <p className="auth-subtitle">
                {isSignUp ? "Tạo tài khoản lưu trữ prompt trực tuyến" : "Đăng nhập để đồng bộ thư viện prompt của bạn"}
              </p>
            </div>

            {/* Error & Success Messages */}
            {errorMsg && <div className="msg msg-error">⚠️ {errorMsg}</div>}
            {infoMsg && <div className="msg msg-info">✨ {infoMsg}</div>}

            {/* Form */}
            <form onSubmit={handleAuth} className="auth-form">
              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="auth-input"
                    disabled={authLoading}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label">Mật khẩu</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="******"
                    className="auth-input"
                    disabled={authLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="btn-show-password"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" className="btn-auth-submit" disabled={authLoading}>
                {authLoading ? (
                  <Loader2 className="btn-spinner" size={18} />
                ) : isSignUp ? (
                  <>
                    <UserPlus size={18} />
                    <span>Đăng ký ngay</span>
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>Đăng nhập</span>
                  </>
                )}
              </button>
            </form>

            {/* Toggle switch between login / signup */}
            <div className="auth-switch">
              {isSignUp ? (
                <p>
                  Đã có tài khoản?{" "}
                  <button onClick={() => { setIsSignUp(false); setErrorMsg(""); setInfoMsg(""); }} className="btn-toggle-mode">
                    Đăng nhập
                  </button>
                </p>
              ) : (
                <p>
                  Chưa có tài khoản?{" "}
                  <button onClick={() => { setIsSignUp(true); setErrorMsg(""); setInfoMsg(""); }} className="btn-toggle-mode">
                    Tạo tài khoản mới
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

        <style jsx global>{`
          .auth-bg {
            background: radial-gradient(circle at 50% 50%, #151128 0%, #08070f 100%);
            min-height: 100vh;
            width: 100%;
            display: flex;
            align-items: center;
            justifyContent: center;
            position: relative;
            overflow: hidden;
            font-family: 'Inter', sans-serif;
            padding: 20px;
          }
          /* Background Light Orbs */
          .orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(100px);
            opacity: 0.15;
            pointer-events: none;
            animation: float 10s infinite alternate ease-in-out;
          }
          .orb-purple {
            width: 400px;
            height: 400px;
            background: #8b5cf6;
            top: 10%;
            left: 15%;
          }
          .orb-cyan {
            width: 450px;
            height: 450px;
            background: #06b6d4;
            bottom: 10%;
            right: 15%;
            animation-delay: -5s;
          }
          @keyframes float {
            0% { transform: translateY(0) scale(1); }
            100% { transform: translateY(30px) scale(1.1); }
          }

          /* Container */
          .auth-card-container {
            width: 100%;
            max-width: 440px;
            z-index: 10;
          }
          .auth-card {
            background: rgba(20, 18, 33, 0.45);
            backdrop-filter: blur(30px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          /* Header */
          .auth-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .logo-glow {
            width: 60px;
            height: 60px;
            background: rgba(139, 92, 246, 0.15);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justifyContent: center;
            border: 1px solid rgba(139, 92, 246, 0.25);
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
            margin-bottom: 16px;
          }
          .logo-icon {
            color: #c4b5fd;
            filter: drop-shadow(0 0 4px #8b5cf6);
          }
          .auth-title {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.03em;
            margin-bottom: 8px;
          }
          .auth-subtitle {
            font-size: 13.5px;
            color: #94a3b8;
            line-height: 1.5;
          }

          /* Input Form */
          .auth-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .form-label {
            font-size: 12px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
          }
          .input-icon {
            position: absolute;
            left: 14px;
            color: #64748b;
            pointer-events: none;
            transition: color 0.2s ease;
          }
          .auth-input {
            width: 100%;
            height: 44px;
            background: rgba(10, 8, 16, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 0 44px;
            color: white;
            font-size: 14.5px;
            transition: all 0.25s ease;
            outline: none;
          }
          .auth-input:focus {
            border-color: #8b5cf6;
            box-shadow: 0 0 12px rgba(139, 92, 246, 0.2);
            background: rgba(10, 8, 16, 0.85);
          }
          .auth-input:focus + .input-icon {
            color: #c4b5fd;
          }
          .btn-show-password {
            position: absolute;
            right: 14px;
            background: none;
            border: none;
            color: #64748b;
            cursor: pointer;
            display: flex;
            align-items: center;
            padding: 0;
            transition: color 0.2s ease;
            outline: none;
          }
          .btn-show-password:hover {
            color: #c4b5fd;
          }

          /* Messages */
          .msg {
            font-size: 13px;
            padding: 10px 14px;
            border-radius: 8px;
            line-height: 1.5;
            font-weight: 500;
          }
          .msg-error {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.25);
            color: #fca5a5;
          }
          .msg-info {
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.22);
            color: #6ee7b7;
          }

          /* Submit Button */
          .btn-auth-submit {
            height: 46px;
            background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
            border: none;
            border-radius: 12px;
            color: white;
            font-size: 15px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            cursor: pointer;
            box-shadow: 0 10px 20px rgba(139, 92, 246, 0.25);
            transition: all 0.25s ease;
            outline: none;
            margin-top: 8px;
          }
          .btn-auth-submit:hover:not(:disabled) {
            transform: translateY(-1.5px);
            box-shadow: 0 12px 24px rgba(139, 92, 246, 0.4);
            filter: brightness(1.1);
          }
          .btn-auth-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .btn-spinner {
            animation: spin 1s linear infinite;
          }

          /* Mode Switch */
          .auth-switch {
            text-align: center;
            font-size: 13px;
            color: #94a3b8;
          }
          .btn-toggle-mode {
            background: none;
            border: none;
            color: #a78bfa;
            font-weight: 600;
            cursor: pointer;
            padding: 0;
            margin-left: 4px;
            text-decoration: underline;
            transition: color 0.2s ease;
            outline: none;
          }
          .btn-toggle-mode:hover {
            color: #c4b5fd;
          }
        `}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
