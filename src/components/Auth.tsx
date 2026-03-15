"use client";

import React, { useState } from 'react';
import { Mail, Lock, User, ChevronRight, AlertTriangle, X, Eye, EyeOff } from 'lucide-react';
import './Auth.css';


interface AuthProps {
  onAuthenticated: (user: any, token: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = mode === 'register'
        ? { username, email, password }
        : { email, password };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      localStorage.setItem('token', data.token);
      onAuthenticated(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="auth-container animate-fade-in">
        <div className="auth-hero">
          <h1 className="text-gradient">A-MATH</h1>
          <p>Mathematical Crossword Board Game</p>
        </div>

        <div className="auth-card glass-panel">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(null); }}
            >
              เข้าสู่ระบบ
            </button>
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(null); }}
            >
              สมัครสมาชิก
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <div className="auth-input-group">
                <User size={18} className="auth-input-icon" />
                <input
                  type="text"
                  placeholder="ชื่อผู้ใช้ (3-20 ตัวอักษร)"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="auth-input"
                  required
                  minLength={3}
                  maxLength={20}
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="auth-input-group">
              <Mail size={18} className="auth-input-icon" />
              <input
                type="email"
                placeholder="อีเมล"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="auth-input"
                required
                disabled={isLoading}
              />
            </div>

            <div className="auth-input-group">
              <Lock size={18} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="auth-input"
                required
                minLength={6}
                disabled={isLoading}
              />
              <div className='justify-end items-center'>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={isLoading}>
              {isLoading ? (
                <div className="auth-spinner" />
              ) : (
                <>
                  {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? (
              <>ยังไม่มีบัญชี? <button onClick={() => { setMode('register'); setError(null); }}>สมัครเลย</button></>
            ) : (
              <>มีบัญชีแล้ว? <button onClick={() => { setMode('login'); setError(null); }}>เข้าสู่ระบบ</button></>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="auth-error animate-slide-up">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}
    </>
  );
};

export default Auth;
