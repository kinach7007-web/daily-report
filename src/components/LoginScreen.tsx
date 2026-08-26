import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(username, password);
    if (!result.success) {
      setError(result.message || '로그인에 실패하였습니다.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-950/40 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-8 relative">
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-3xl mx-auto flex items-center justify-center shadow-md shadow-rose-100/50 mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">뼈반집 영업 관리 시스템</h1>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              직원 및 운영자 전용 로그인
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 font-semibold animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 relative">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
                아이디
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="아이디를 입력하세요"
                  required
                  autoFocus
                  className="w-full bg-gray-50/80 border border-gray-200/90 rounded-2xl pl-10 pr-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
                비밀번호
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  className="w-full bg-gray-50/80 border border-gray-200/90 rounded-2xl pl-10 pr-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 text-sm transition-all transform active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? '로그인 확인 중...' : '로그인'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer Notice */}
          <div className="mt-8 pt-5 border-t border-gray-100/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>계정 발급 및 비밀번호 문의는 대표 운영자에게 문의하세요.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
