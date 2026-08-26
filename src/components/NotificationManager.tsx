import { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, limit, orderBy, Timestamp } from 'firebase/firestore';
import { Bell, AlertTriangle, FileText, UserCheck, X, CheckCircle2 } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: '영업일보' | '컴플레인' | '면접일지';
  title: string;
  body: string;
  timeStr: string;
  writer: string;
}

export default function NotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [sessionStartTime] = useState(Timestamp.now());
  const [activeToasts, setActiveToasts] = useState<NotificationItem[]>([]);
  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    return localStorage.getItem('notificationBannerDismissed') === 'true';
  });

  // Track initial load to avoid back-firing existing reports
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Listen for new entries in 'reports' collection created after this session began
    const q = query(
      collection(db, 'reports'),
      where('createdAt', '>', sessionStartTime),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Prevent notifications on very first snapshot if not needed
        if (isInitialMount.current) {
          isInitialMount.current = false;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const reportType = data.type as string;

            // STRICT FILTER: Only trigger on the 3 requested events:
            // 1. 영업일보 대시보드 저장
            // 2. 새 컴플레인 등록 저장
            // 3. 면접일지 저장
            if (reportType !== '영업일보' && reportType !== '컴플레인' && reportType !== '면접일지') {
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
              notifTitle = '📊 [영업일보] 대시보드 저장 알림';
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
            }

            // 1. Trigger Desktop / Browser Push Notification if supported & granted
            showDesktopNotification(notifTitle, notifBody);

            // 2. Trigger In-App Real-time Floating Toast
            const newToast: NotificationItem = {
              id: `${change.doc.id}-${Date.now()}`,
              type: reportType,
              title: notifTitle,
              body: notifBody,
              timeStr: nowTimeStr,
              writer: data.writer || ''
            };

            setActiveToasts((prev) => [newToast, ...prev.slice(0, 4)]);

            // Auto dismiss toast after 6 seconds
            setTimeout(() => {
              setActiveToasts((prev) => prev.filter((item) => item.id !== newToast.id));
            }, 6000);
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
        showDesktopNotification(
          '알림 설정 완료',
          '영업일보, 컴플레인, 면접일지 등록 시 실시간 알림을 받아보실 수 있습니다.'
        );
      }
    } catch (e) {
      console.warn('Notification permission request error:', e);
    }
  };

  const showDesktopNotification = (title: string, body: string) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: 'https://placehold.co/192x192/E11D48/white?text=Ppyeo'
        });
      } catch (e) {
        console.warn('Desktop notification show error:', e);
      }
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
      {/* Real-time In-App Floating Toasts Container (Top Right) */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {activeToasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-top-3 fade-in duration-300 transition-all ${
              toast.type === '영업일보'
                ? 'bg-white/95 border-blue-200 text-gray-900 shadow-blue-500/10'
                : toast.type === '컴플레인'
                ? 'bg-white/95 border-rose-300 text-gray-900 shadow-rose-500/15'
                : 'bg-white/95 border-emerald-200 text-gray-900 shadow-emerald-500/10'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                  toast.type === '영업일보'
                    ? 'bg-blue-100 text-blue-600'
                    : toast.type === '컴플레인'
                    ? 'bg-rose-100 text-rose-600 animate-pulse'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {toast.type === '영업일보' && <FileText className="w-5 h-5" />}
                {toast.type === '컴플레인' && <AlertTriangle className="w-5 h-5" />}
                {toast.type === '면접일지' && <UserCheck className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      toast.type === '영업일보'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : toast.type === '컴플레인'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
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
                className="text-gray-400 hover:text-gray-600 p-1 -mr-1 -mt-1 rounded-lg hover:bg-gray-100 transition-colors"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Permission Enable Banner (Bottom Right) if not granted and not dismissed */}
      {permission !== 'granted' && !isBannerDismissed && typeof Notification !== 'undefined' && (
        <div className="fixed bottom-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-rose-100 p-4 max-w-sm flex items-start gap-3.5">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bell className="w-5 h-5 text-rose-500 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900">실시간 알림 켜기</h4>
                <button
                  type="button"
                  onClick={dismissBanner}
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
                  title="닫기"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-gray-500 leading-tight mt-1">
                <span className="font-semibold text-gray-700">영업일보 마감</span>,{' '}
                <span className="font-semibold text-rose-600">새 컴플레인</span>,{' '}
                <span className="font-semibold text-emerald-600">면접일지</span> 저장 시 실시간 알림을 보냅니다.
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
  );
}
