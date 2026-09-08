import { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, limit, orderBy, Timestamp } from 'firebase/firestore';
import { Bell, AlertTriangle, FileText, UserCheck, X, CheckCircle2, Share, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { registerFCMToken, subscribeForegroundMessages } from '../lib/fcm';

interface NotificationItem {
  id: string;
  type: '영업일보' | '컴플레인' | '면접일지' | '시간대매출';
  title: string;
  body: string;
  timeStr: string;
  writer: string;
}

// Check iOS device detection and PWA standalone mode
const checkIsIos = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const checkIsStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
};

// Web Audio API Synthesizer Chime for Mobile & Desktop
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    // Cheerful harmonic chime: D5 (587Hz) -> A5 (880Hz) -> D6 (1174Hz)
    const now = ctx.currentTime;
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.setValueAtTime(880.00, now + 0.12);
    osc1.frequency.setValueAtTime(1174.66, now + 0.24);

    osc2.frequency.setValueAtTime(587.33 * 2, now);
    osc2.frequency.setValueAtTime(880.00 * 2, now + 0.12);
    osc2.frequency.setValueAtTime(1174.66 * 2, now + 0.24);

    gainNode.gain.setValueAtTime(0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.8);
  } catch (e) {
    console.warn('Audio chime notification error:', e);
  }
};

// Device Vibration for Mobile (Android supported)
const triggerVibration = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 300]);
    } catch (e) {
      // ignore
    }
  }
};

export default function NotificationManager() {
  const { currentUser } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  // Start with a slight buffer (last 5 seconds) to avoid clock skew
  const [sessionStartTime] = useState(() => Timestamp.fromMillis(Date.now() - 5000));
  const [activeToasts, setActiveToasts] = useState<NotificationItem[]>([]);
  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    return localStorage.getItem('notificationBannerDismissed') === 'true';
  });

  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const isInitialMount = useRef(true);

  // Detect iOS and Standalone status
  useEffect(() => {
    setIsIos(checkIsIos());
    setIsStandalone(checkIsStandalone());
  }, []);

  // Auto register/sync FCM Token when permission is granted and user is logged in
  useEffect(() => {
    if (permission === 'granted') {
      registerFCMToken(currentUser).catch((err) => {
        console.warn('[FCM] Auto-registration notice:', err);
      });
    }
  }, [permission, currentUser]);

  // Subscribe to FCM foreground messages
  useEffect(() => {
    let unsubscribeFCM: (() => void) | null = null;
    subscribeForegroundMessages((payload) => {
      if (payload.title) {
        playNotificationSound();
        triggerVibration();
      }
    }).then((unsub) => {
      unsubscribeFCM = unsub;
    });

    return () => {
      if (unsubscribeFCM) unsubscribeFCM();
    };
  }, []);

  // Pre-unlock AudioContext on first user touch/interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        }
      } catch (e) {}
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
    };

    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    window.addEventListener('click', handleFirstInteraction, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
    };
  }, []);

  // Update permission status on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    // Listen for new entries in 'reports' collection created after this session began
    const q = query(
      collection(db, 'reports'),
      where('createdAt', '>', sessionStartTime),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (isInitialMount.current) {
          isInitialMount.current = false;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const docId = change.doc.id;
            if (seenIdsRef.current.has(docId)) {
              return;
            }
            seenIdsRef.current.add(docId);

            const data = change.doc.data();
            const reportType = data.type as string;

            // STRICT FILTER: Trigger on:
            // 1. 영업일보 대시보드 저장
            // 2. 새 컴플레인 등록 저장
            // 3. 면접일지 저장
            // 4. 시간대별 매출 확정 및 수정
            if (reportType !== '영업일보' && reportType !== '컴플레인' && reportType !== '면접일지' && reportType !== '시간대매출') {
              return;
            }

            const nowTimeStr = new Date().toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });

            let notifTitle = '';
            let notifBody = '';

            if (reportType === '영업일보') {
              notifTitle = '📊 [영업일보] 대시보드 마감 알림';
              const salesFormatted = data.totalSales ? `${Number(data.totalSales).toLocaleString()}원` : '매출 확인';
              notifBody = `${data.writer || '영업담당자'}님이 ${data.date || '오늘'} 영업일보를 마감·저장했습니다. (총매출: ${salesFormatted})`;
            } else if (reportType === '컴플레인') {
              notifTitle = '🚨 [컴플레인] 새 컴플레인 등록 알림';
              const problemSummary = data.problem 
                ? (data.problem.length > 30 ? data.problem.slice(0, 30) + '...' : data.problem) 
                : '';
              notifBody = `${data.writer || '담당자'}님이 [${data.category || '고객 클레임'}] 새 컴플레인을 등록했습니다.${problemSummary ? ` "${problemSummary}"` : ''}`;
            } else if (reportType === '면접일지') {
              notifTitle = '👥 [면접일지] 면접일지 저장 알림';
              notifBody = `${data.writer || '면접관'}님이 지원자 [${data.applicant || '지원자'}]님의 면접일지를 저장했습니다.`;
            } else if (reportType === '시간대매출') {
              const actionName = data.actionType || '확정';
              const slot = data.slotName || '시간대';
              notifTitle = `💰 [${slot}] 매출 ${actionName} 알림`;
              notifBody = data.message || `${data.writer || '담당자'}님이 ${slot} 매출을 [${actionName}]했습니다.`;
            }

            // 1. Play Sound & Vibration on all platforms (Mobile & Desktop)
            playNotificationSound();
            triggerVibration();

            // 2. Trigger Mobile (ServiceWorker) or Desktop Push Notification
            dispatchSystemNotification(notifTitle, notifBody);

            // 3. Trigger In-App Real-time Floating Toast
            const newToast: NotificationItem = {
              id: `${docId}-${Date.now()}`,
              type: reportType,
              title: notifTitle,
              body: notifBody,
              timeStr: nowTimeStr,
              writer: data.writer || ''
            };

            setActiveToasts((prev) => [newToast, ...prev.slice(0, 4)]);

            // Auto dismiss toast after 8 seconds
            setTimeout(() => {
              setActiveToasts((prev) => prev.filter((item) => item.id !== newToast.id));
            }, 8000);
          }
        });
      },
      (error) => {
        console.warn('Firestore onSnapshot notification listener notice:', error);
      }
    );

    return () => unsubscribe();
  }, [sessionStartTime]);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        playNotificationSound();
        triggerVibration();
        await registerFCMToken(currentUser);
        dispatchSystemNotification(
          '🔔 실시간 알림이 활성화되었습니다',
          '영업일보 마감, 컴플레인, 면접일지 등록 시 실시간으로 알림을 전송합니다.'
        );
      }
    } catch (e) {
      console.warn('Notification permission request error:', e);
    }
  };

  // Mobile-compatible notification dispatcher (Uses ServiceWorker registration on Android/iOS, falls back to Notification API)
  const dispatchSystemNotification = async (title: string, body: string) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    // 1. Try Service Worker showNotification (Mandatory for Android Chrome & iOS PWA)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: `notif-${Date.now()}`,
            data: window.location.href,
            vibrate: [200, 100, 200, 100, 200],
            renotify: true,
            requireInteraction: false
          } as NotificationOptions);
          return;
        }
      } catch (swErr) {
        console.warn('Service Worker showNotification attempt failed, falling back to postMessage or Notification API:', swErr);
        
        // Try postMessage to active service worker controller
        if (navigator.serviceWorker.controller) {
          try {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              title,
              options: {
                body,
                tag: `notif-${Date.now()}`,
                data: window.location.href
              }
            });
            return;
          } catch (postErr) {
            console.warn('Service Worker postMessage error:', postErr);
          }
        }
      }
    }

    // 2. Fallback to desktop Notification constructor (if supported on desktop)
    try {
      new Notification(title, {
        body,
        icon: '/icon-192.png'
      });
    } catch (e) {
      console.warn('Desktop Notification constructor error:', e);
    }
  };

  const removeToast = (id: string) => {
    setActiveToasts((prev) => prev.filter((item) => item.id !== id));
  };

  const dismissBanner = () => {
    setIsBannerDismissed(true);
    localStorage.setItem('notificationBannerDismissed', 'true');
  };

  return (
    <>
      {/* Real-time In-App Floating Toasts Container (Responsive: Top full-width on mobile, top-right on desktop) */}
      <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 z-[99999] flex flex-col gap-2.5 max-w-sm sm:w-96 pointer-events-none">
        {activeToasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-top-4 fade-in duration-300 transition-all ${
              toast.type === '영업일보'
                ? 'bg-white/95 border-blue-200 text-gray-900 shadow-blue-500/15 ring-1 ring-blue-500/20'
                : toast.type === '컴플레인'
                ? 'bg-white/95 border-rose-300 text-gray-900 shadow-rose-500/20 ring-1 ring-rose-500/30'
                : toast.type === '시간대매출'
                ? 'bg-white/95 border-amber-300 text-gray-900 shadow-amber-500/20 ring-1 ring-amber-500/30'
                : 'bg-white/95 border-emerald-200 text-gray-900 shadow-emerald-500/15 ring-1 ring-emerald-500/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                  toast.type === '영업일보'
                    ? 'bg-blue-100 text-blue-600'
                    : toast.type === '컴플레인'
                    ? 'bg-rose-100 text-rose-600 animate-pulse'
                    : toast.type === '시간대매출'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {toast.type === '영업일보' && <FileText className="w-5 h-5" />}
                {toast.type === '컴플레인' && <AlertTriangle className="w-5 h-5" />}
                {toast.type === '면접일지' && <UserCheck className="w-5 h-5" />}
                {toast.type === '시간대매출' && <DollarSign className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      toast.type === '영업일보'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : toast.type === '컴플레인'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : toast.type === '시간대매출'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {toast.type}
                  </span>
                  <span className="text-[11px] font-medium text-gray-400">{toast.timeStr}</span>
                </div>

                <p className="text-xs font-bold text-gray-900 leading-snug">{toast.title}</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-3">{toast.body}</p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 p-1 -mr-1 -mt-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Permission & iOS Setup Banner (Bottom full-width on mobile, bottom-right on desktop) */}
      {!isBannerDismissed && (
        <>
          {/* Case A: iOS Safari not installed as PWA */}
          {isIos && !isStandalone && (
            <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-rose-200 p-4 max-w-sm sm:w-96 flex items-start gap-3.5">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Share className="w-5 h-5 text-rose-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <span>아이폰 실시간 알림 안내</span>
                    </h4>
                    <button
                      type="button"
                      onClick={dismissBanner}
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
                      title="닫기"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-tight mt-1">
                    iOS(아이폰)에서 알림을 받으시려면 하단 <span className="font-bold text-rose-600">공유 [↑]</span> 버튼을 누른 후 <span className="font-bold text-gray-900">[홈 화면에 추가]</span>하여 앱으로 실행해 주세요.
                  </p>
                  <div className="mt-2.5 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={dismissBanner}
                      className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                    >
                      확인했습니다
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Case B: Android, Desktop, or iOS PWA Standalone with permission not granted */}
          {(!isIos || isStandalone) && permission !== 'granted' && typeof Notification !== 'undefined' && (
            <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-rose-200 p-4 max-w-sm sm:w-96 flex items-start gap-3.5">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bell className="w-5 h-5 text-rose-500 animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <span>실시간 마감 알림 켜기</span>
                    </h4>
                    <button
                      type="button"
                      onClick={dismissBanner}
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
                      title="닫기"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-tight mt-1">
                    <span className="font-semibold text-gray-700">영업일보 마감</span>,{' '}
                    <span className="font-semibold text-amber-700">시간대별 매출 확정/수정</span>,{' '}
                    <span className="font-semibold text-rose-600">컴플레인</span>,{' '}
                    <span className="font-semibold text-emerald-600">면접일지</span> 저장 시 실시간 알림음과 배너를 받습니다.
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={requestPermission}
                      className="flex-1 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>알림 허용</span>
                    </button>
                    <button
                      type="button"
                      onClick={dismissBanner}
                      className="px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                    >
                      나중에
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

