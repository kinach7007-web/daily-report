import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { registerFCMToken } from '../lib/fcm';
import { dispatchBackgroundPushToAll } from '../lib/pushDispatcher';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Bell, 
  Send, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Radio, 
  QrCode,
  Copy,
  Check,
  Timer,
  Info,
  Laptop
} from 'lucide-react';

interface RegisteredDevice {
  id: string;
  token?: string;
  subscription?: any;
  userId?: string;
  userName?: string;
  userRole?: string;
  platform?: string;
  userAgent?: string;
  updatedAt?: any;
  active?: boolean;
}

export default function PushNotificationTester() {
  const { currentUser } = useAuth();
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [serverHealth, setServerHealth] = useState<{ status?: string; adminPushReady?: boolean; webPushReady?: boolean }>({
    status: 'ok',
    adminPushReady: true,
    webPushReady: true
  });

  // Current app URL for QR code
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Test push form
  const [testTitle, setTestTitle] = useState('🔔 [테스트] 뼈반집 잠금화면 푸시 알림');
  const [testBody, setTestBody] = useState('화면이 꺼진 상태(잠금화면)에서도 이 알림 배너와 진동/소리가 울립니다.');
  const [testResult, setTestResult] = useState<{ successCount: number; failureCount: number; message: string; isError?: boolean } | null>(null);
  const [registerStatus, setRegisterStatus] = useState<string | null>(null);

  // Load registered devices from Firestore
  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'fcm_tokens'));
      const list: RegisteredDevice[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      setDevices(list);
    } catch (e: any) {
      console.warn('[PushTester] Could not fetch devices from Firestore:', e?.message || e);
    } finally {
      setIsLoading(false);
    }
  };

  // Check server health
  const checkServerHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setServerHealth(data);
      }
    } catch (e) {
      console.error('Health check failed:', e);
    }
  };

  useEffect(() => {
    fetchDevices();
    checkServerHealth();
  }, []);

  // Copy app URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert(`아래 주소를 복사해주세요:\n${appUrl}`);
    }
  };

  // Register current device
  const handleRegisterCurrentDevice = async () => {
    setRegisterStatus('등록 처리 중...');
    try {
      const result = await registerFCMToken(currentUser);
      if (result.token || result.subscription) {
        setRegisterStatus('✅ 현재 기기(브라우저)가 푸시 수신 기기로 등록되었습니다!');
        await fetchDevices();
      } else {
        setRegisterStatus(`❌ 등록 실패: ${result.error || '알림 권한을 허용해주세요.'}`);
      }
    } catch (err: any) {
      setRegisterStatus(`❌ 등록 오류: ${err?.message || err}`);
    }
  };

  // Send real background push
  const executeSendPush = async () => {
    setIsSending(true);
    setTestResult(null);

    try {
      const res = await dispatchBackgroundPushToAll({
        title: testTitle.trim() || '🔔 뼈반집 테스트 알림',
        body: testBody.trim() || '잠금화면 수신 테스트',
        type: '테스트',
        tag: `test-push-${Date.now()}`
      });

      if (res.successCount > 0) {
        setTestResult({
          successCount: res.successCount,
          failureCount: res.failureCount,
          message: `✅ 총 ${res.successCount}대의 기기(스마트폰/PC)로 실제 네트워크 푸시가 성공적으로 전송되었습니다! 등록된 휴대폰 화면에 배너가 뜹니다.`
        });
      } else if (devices.length === 0) {
        setTestResult({
          successCount: 0,
          failureCount: 0,
          message: '⚠️ 현재 등록된 수신 기기가 없습니다. 아래 QR코드로 휴대폰에서 접속하여 [알림 허용]을 먼저 완료해주세요.',
          isError: true
        });
      } else {
        setTestResult({
          successCount: 0,
          failureCount: res.failureCount,
          message: `⚠️ 푸시 전송 실패 (${res.failureCount}대 실패). 기기 토큰이 만료되었거나 브라우저 권한이 차단되었을 수 있습니다. [이 기기 푸시 토큰 즉시 등록/갱신]을 눌러주세요.`,
          isError: true
        });
      }
    } catch (err: any) {
      setTestResult({
        successCount: 0,
        failureCount: 1,
        message: `⚠️ 발송 중 오류가 발생했습니다: ${err?.message || err}`,
        isError: true
      });
    } finally {
      setIsSending(false);
    }
  };

  // Trigger push with countdown for lock screen test
  const handleSendWithCountdown = (seconds = 5) => {
    setCountdown(seconds);
    setTestResult(null);

    let remaining = seconds;
    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timer);
        setCountdown(null);
        executeSendPush();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  };

  // Direct local service worker notification test
  const handleLocalSWTest = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        alert('이 브라우저는 알림 또는 서비스워커를 지원하지 않습니다.');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert('알림 권한이 허용되지 않았습니다. 브라우저 설정에서 알림을 허용해주세요.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(testTitle.trim() || '🔔 뼈반집 테스트 알림', {
        body: testBody.trim() || '잠금화면 수신 테스트',
        icon: 'https://placehold.co/192x192/A8462B/white?text=Ppyeo',
        badge: 'https://placehold.co/192x192/A8462B/white?text=Ppyeo',
        tag: `local-test-${Date.now()}`,
        requireInteraction: true
      } as any);
      setTestResult({
        successCount: 1,
        failureCount: 0,
        message: '✅ 현재 사용 중인 기기에서 로컬 알림 배너가 즉시 호출되었습니다.'
      });
    } catch (e: any) {
      alert(`로컬 알림 테스트 실패: ${e?.message || e}`);
    }
  };

  // Delete device token
  const handleDeleteDevice = async (id: string) => {
    if (!confirm('해당 기기 등록 정보를 목록에서 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'fcm_tokens', id));
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      console.error('Failed to delete token:', e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: Service & Server Status */}
      <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-800">모바일 백그라운드 & 잠금화면 푸시 센터</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                화면 꺼짐(잠금화면) 및 앱 종료 상태에서도 실제 스마트폰에 알림이 오도록 연결하고 테스트합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchDevices();
                checkServerHealth();
              }}
              disabled={isLoading}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-bold">푸시 서버 엔진</span>
            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
              ✅ W3C Web-Push & FCM v1
            </span>
          </div>

          <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-bold">수신 대기 기기수</span>
            <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
              devices.length > 0
                ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                : 'bg-amber-100 text-amber-800 border-amber-200'
            }`}>
              {devices.length > 0 ? `📱 ${devices.length}대 연결됨` : '⚠️ 기기 없음 (휴대폰 연결 필요)'}
            </span>
          </div>

          <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-bold">현재 화면 알림 권한</span>
            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
              {typeof Notification !== 'undefined' ? Notification.permission : '미지원'}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Connect Section: QR Code & Direct Link */}
      <div className="bg-linear-to-r from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm md:text-base">
              📱 휴대폰 잠금화면 수신을 위한 기기 연결 (QR 코드 스캔)
            </h4>
            <p className="text-xs text-amber-800">
              휴대폰 잠금화면에 알림을 받으시려면, <strong>휴대폰으로 이 시스템에 1회 접속하여 [알림 허용]</strong>을 완료해야 합니다.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 bg-white/80 p-4 rounded-2xl border border-amber-200/60">
          {/* QR Code */}
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <QRCodeSVG value={appUrl} size={130} level="M" />
            <span className="text-[10px] text-gray-400 font-bold mt-2">휴대폰 카메라로 스캔</span>
          </div>

          {/* Guide Steps */}
          <div className="flex-1 space-y-3 text-xs text-gray-700 leading-relaxed">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] bg-gray-100 px-3 py-1 rounded-lg border border-gray-200 truncate max-w-[260px] sm:max-w-md">
                {appUrl}
              </span>
              <button
                onClick={handleCopyUrl}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '복사됨!' : '주소 복사'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                <p className="font-bold text-amber-900 mb-1 flex items-center gap-1">
                  🍎 <strong>아이폰 (iOS) 필수 순서:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-gray-600 text-[11px]">
                  <li>사파리(Safari)로 QR 스캔 접속</li>
                  <li>하단 공유 버튼(네모+화살표) 터치</li>
                  <li><strong>[홈 화면에 추가]</strong> 터치하여 설치</li>
                  <li>홈 화면 앱을 열고 <strong>[알림 허용]</strong> 터치</li>
                </ol>
              </div>

              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                <p className="font-bold text-blue-900 mb-1 flex items-center gap-1">
                  🤖 <strong>안드로이드 (Galaxy 등):</strong>
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-gray-600 text-[11px]">
                  <li>기본 카메라 또는 크롬으로 QR 스캔 접속</li>
                  <li>화면 상단의 <strong>[알림 허용]</strong> 터치</li>
                  <li>화면이 꺼져도 잠금화면에 즉시 알림이 울립니다</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Push Sender Card */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm md:text-base">잠금화면 수신 테스트 발송</h4>
            <p className="text-xs text-gray-500">
              등록된 모든 기기로 실제 네트워크 푸시를 발송합니다. 휴대폰 화면을 끈 상태에서 배너와 소리가 오는지 확인하세요.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">알림 제목</label>
            <input
              type="text"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">알림 본문 내용</label>
            <textarea
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRegisterCurrentDevice}
              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>이 기기(브라우저) 푸시 즉시 등록/갱신</span>
            </button>

            <button
              onClick={handleLocalSWTest}
              className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="이 기기에서 즉시 알림 배너가 뜨는지 로컬로 테스트"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>현재 기기 소리/배너 즉시 확인</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Countdown Send: gives user time to lock screen */}
            <button
              onClick={() => handleSendWithCountdown(5)}
              disabled={isSending || countdown !== null}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Timer className={`w-4 h-4 ${countdown !== null ? 'animate-spin' : ''}`} />
              <span>
                {countdown !== null
                  ? `⏱️ ${countdown}초 뒤 발송! (지금 휴대폰 화면을 끄세요)`
                  : '⏱️ 5초 뒤 발송 (화면 끄고 대기)'}
              </span>
            </button>

            {/* Instant Send */}
            <button
              onClick={executeSendPush}
              disabled={isSending || countdown !== null}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-rose-200 disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${isSending ? 'animate-bounce' : ''}`} />
              <span>{isSending ? '전체 기기로 발송 중...' : '잠금화면 알림 즉시 발송'}</span>
            </button>
          </div>
        </div>

        {registerStatus && (
          <div className="p-3 bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 border border-gray-200">
            {registerStatus}
          </div>
        )}

        {testResult && (
          <div className={`p-4 rounded-2xl text-xs space-y-1.5 ${
            !testResult.isError 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <div className="font-bold flex items-center gap-1.5">
              {!testResult.isError ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>발송 결과: {testResult.message}</span>
            </div>
          </div>
        )}
      </div>

      {/* Registered Devices List */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm md:text-base">
                푸시 알림 수신 등록 기기 목록 ({devices.length}대)
              </h4>
              <p className="text-xs text-gray-500">
                실제 네트워크 푸시 알림 신호가 전송되는 스마트폰 및 기기들의 등록 목록입니다.
              </p>
            </div>
          </div>
        </div>

        {devices.length === 0 ? (
          <div className="py-8 text-center bg-gray-50/70 rounded-2xl border border-dashed border-gray-200 space-y-2">
            <Smartphone className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-xs font-bold text-gray-500">등록된 수신 기기가 없습니다.</p>
            <p className="text-[11px] text-gray-400">
              상단의 QR 코드를 휴대폰으로 스캔하여 뼈반집 앱을 열고 [알림 허용]을 눌러주세요.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/90 text-gray-600 font-bold border-b border-gray-100">
                <tr>
                  <th className="px-3.5 py-3 rounded-l-xl">기기 유형 / 사용자</th>
                  <th className="px-3.5 py-3">플랫폼</th>
                  <th className="px-3.5 py-3">구독 상태</th>
                  <th className="px-3.5 py-3 text-center">수신 상태</th>
                  <th className="px-3.5 py-3 text-center rounded-r-xl">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {devices.map((d) => {
                  const isMobile = d.platform?.includes('iPhone') || d.platform?.includes('Android');
                  return (
                    <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-3.5 py-3 font-bold text-gray-800 flex items-center gap-2">
                        {isMobile ? (
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Smartphone className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                            <Laptop className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="text-gray-900 font-bold">{d.userName || '운영자'}</div>
                          <div className="text-[10px] text-gray-400">{d.userRole || '총괄 운영자'}</div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                          d.platform?.includes('iPhone')
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : d.platform?.includes('Android')
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {d.platform || '기기'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-gray-600 text-[11px]">
                        {d.subscription ? (
                          <span className="text-emerald-700 font-semibold">✅ W3C WebPush 활성</span>
                        ) : (
                          <span className="text-blue-700 font-semibold">📡 FCM 토큰 활성</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          정상 대기 중
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <button
                          onClick={() => handleDeleteDevice(d.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="기기 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
