import React, { useEffect } from 'react';
import { Sparkles, Heart, Trophy, Flame, PartyPopper } from 'lucide-react';

interface CheerModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedDate?: string;
}

export default function CheerModal({ isOpen, onClose, savedDate }: CheerModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    // Auto-close after 3.5 seconds if user doesn't click
    const timer = setTimeout(() => {
      onClose();
    }, 3500);

    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Decorative Floating Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/5 w-4 h-4 bg-rose-400 rounded-full animate-ping opacity-75" style={{ animationDuration: '1.2s' }} />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-amber-400 rounded-full animate-ping opacity-75" style={{ animationDuration: '1.5s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-4 h-4 bg-blue-400 rounded-full animate-ping opacity-75" style={{ animationDuration: '1.8s' }} />
        <div className="absolute top-1/2 right-1/6 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-75" style={{ animationDuration: '1.4s' }} />
      </div>

      {/* Main Cheer Card */}
      <div 
        className="relative bg-white rounded-3xl shadow-2xl border-2 border-rose-100 max-w-md w-full p-6 sm:p-8 text-center overflow-hidden transform animate-in zoom-in-90 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top celebratory gradient ribbon */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-rose-300 via-amber-200 to-rose-400 rounded-full blur-2xl opacity-40 pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-gradient-to-tr from-blue-300 via-indigo-200 to-purple-400 rounded-full blur-2xl opacity-40 pointer-events-none" />

        {/* Animated Cheer Graphic / Icon Badge */}
        <div className="relative mx-auto mb-5 w-24 h-24 flex items-center justify-center">
          {/* Pulsing Aura Rings */}
          <div className="absolute inset-0 rounded-full bg-rose-200/50 animate-ping opacity-60" style={{ animationDuration: '1.8s' }} />
          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-rose-400 to-amber-400 animate-pulse opacity-80" />
          
          {/* Center Trophy / Cheer Icon with Bounce */}
          <div className="relative w-20 h-20 bg-white rounded-full shadow-lg border-2 border-rose-200 flex items-center justify-center text-rose-500 animate-bounce">
            <span className="text-4xl select-none transform hover:scale-125 transition-transform">
              🔥
            </span>
          </div>

          {/* Orbiting mini badges */}
          <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-1.5 rounded-full shadow-md animate-bounce" style={{ animationDelay: '0.15s' }}>
            <Sparkles className="w-4 h-4 fill-white" />
          </div>
          <div className="absolute -bottom-1 -left-1 bg-rose-500 text-white p-1.5 rounded-full shadow-md animate-bounce" style={{ animationDelay: '0.3s' }}>
            <Heart className="w-4 h-4 fill-white" />
          </div>
        </div>

        {/* Subtitle Date Badge */}
        {savedDate && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-xs font-extrabold mb-3">
            <PartyPopper className="w-3.5 h-3.5" />
            <span>{savedDate} 영업일보 마감 완료</span>
          </div>
        )}

        {/* Big Catchphrase */}
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-snug">
          수고 하셨습니다!
        </h3>
        
        {/* Animated "오늘 하루도 화이팅!" */}
        <div className="mt-1 flex items-center justify-center gap-2">
          <p className="text-lg sm:text-xl font-black bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 bg-clip-text text-transparent animate-pulse">
            오늘 하루도 화이팅! 💪✨
          </p>
        </div>

        {/* Friendly Body Message */}
        <p className="text-xs sm:text-sm text-gray-500 mt-3 font-medium leading-relaxed">
          오늘 입력하신 모든 영업 실적과 점검 데이터가<br />
          안전하게 저장 및 결산 리포트로 생성되었습니다.
        </p>

        {/* Action Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-6 bg-gradient-to-r from-rose-500 via-rose-600 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white text-sm font-black rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>확인 (화이팅!)</span>
            <Flame className="w-4 h-4 fill-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
