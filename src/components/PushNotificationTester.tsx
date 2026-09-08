import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { registerFCMToken } from '../lib/fcm';
import { dispatchBackgroundPushToAll } from '../lib/pushDispatcher';
import { useAuth } from '../context/AuthContext';
import { 
  Bell, 
  Send, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  ShieldAlert, 
  Radio, 
  Sparkles,
  Info,
  Clock
} from 'lucide-react';

interface RegisteredDevice {
  id: string;
  token: string;
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
  const [serverHealth, setServerHealth] = useState<{ status?: string; adminPushReady?: boolean; timestamp?: string } | null>(null);

  // Test push form
  const [testTitle, setTestTitle] = useState('🔔 [테스트] 뼈반집 백그라운드 푸시 알림');
  const [testBody, setTestBody] = useState('화면이 꺼져 있거나 잠금화면인 상태에서도 이 알림 배너와 소리가 도착해야 정상입니다.');
  const [testResult, setTestResult] = useState<{ successCount?: number; failureCount?: number; details?: any; mode?: string } | null>(null);
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
    } catch (e) {
      console.error('Failed to fetch FCM devices:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Check server health and Firebase Admin state
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

  // Register current device token explicitly
  const handleRegisterCurrentDevice = async () => {
    setRegisterStatus('등록 중...');
    try {
      const token = await registerFCMToken(currentUser);
      if (token) {
        setRegisterStatus('✅ 현재 기기가 푸시 수신 기기로 등록되었습니다!');
        await fetchDevices();
      } else {
        setRegisterStatus('❌ 브라우저 알림 권한이 거부되었거나 지원되지 않습니다. 아이폰 설정 > 알림 및 Safari 설정을 확인해주세요.');
      }
    } catch (err: any) {
      setRegisterStatus(`❌ 등록 오류: ${err?.message || err}`);
    }
  };

  // Dispatch background push test
  const handleSendTestPush = async () => {
    if (devices.length === 0) {
      alert('등록된 수신 기기 토큰이 없습니다. 먼저 하단의 [내 기기 푸시 토큰 즉시 등록하기]를 눌러주세요.');
      return;
    }

    setIsSending(true);
    setTestResult(null);

    try {
      const res = await dispatchBackgroundPushToAll({
        title: testTitle.trim() || '🔔 뼈반집 테스트 알림',
        body: testBody.trim() || '잠금화면 수신 테스트',
        type: '테스트',
        tag: `test-push-${Date.now()}`
      });

      setTestResult(res);
    } catch (err: any) {
      setTestResult({ details: err?.message || '발송 실패' });
    } finally {
      setIsSending(false);
    }
  };

  // Delete device token
  const handleDeleteDevice = async (id: string) => {
    if (!confirm('해당 기기 토큰을 목록에서 삭제하시겠습니까?')) return;
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
              <h3 className="text-base font-black text-gray-800">모바일 백그라운드 & 잠금화면 푸시 진단 센터</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                화면 꺼짐(잠금화면) 및 앱 종료 상태에서 알림이 울리지 않는 원인을 실시간으로 진단하고 테스트합니다.
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
            <span className="text-xs text-gray-500 font-bold">서버 FCM Admin v1 엔진</span>
            <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
              serverHealth?.adminPushReady 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-100 text-rose-800 border border-rose-200'
            }`}>
              {serverHealth?.adminPushReady ? '✅ 정상 활성화' : '⚠️ 미연동 (Service Account)'}
            </span>
          </div>

          <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-bold">현재 등록된 수신 기기수</span>
            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200">
              {devices.length}대 연결됨
            </span>
          </div>

          <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-bold">브라우저 알림 권한</span>
            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
              {typeof Notification !== 'undefined' ? Notification.permission : '미지원'}
            </span>
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
              휴대폰 화면을 끈(잠금화면) 상태로 만든 뒤, 아래 발송 버튼을 눌러 실제 기기로 알림이 배너로 뜨는지 테스트해 보세요.
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

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={handleRegisterCurrentDevice}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>이 기기 푸시 토큰 즉시 등록/갱신</span>
          </button>

          <button
            onClick={handleSendTestPush}
            disabled={isSending || devices.length === 0}
            className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-rose-200 disabled:opacity-50"
          >
            <Send className={`w-4 h-4 ${isSending ? 'animate-bounce' : ''}`} />
            <span>{isSending ? '전체 기기로 발송 중...' : '잠금화면 알림 즉시 발송'}</span>
          </button>
        </div>

        {registerStatus && (
          <div className="p-3 bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 border border-gray-200">
            {registerStatus}
          </div>
        )}

        {testResult && (
          <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>발송 완료 결과</span>
            </div>
            <p className="text-gray-700">
              총 {devices.length}대 중 <strong>성공: {testResult.successCount || 0}건</strong>, 실패: {testResult.failureCount || 0}건
            </p>
            <p className="text-[11px] text-gray-500">
              * 기기 화면이 꺼져 있을 때 애플(APNs)/구글(FCM)을 통해 수초 내로 잠금화면 배너가 표시됩니다.
            </p>
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
              <h4 className="font-bold text-gray-800 text-sm md:text-base">푸시 알림 수신 등록 기기 목록 ({devices.length})</h4>
              <p className="text-xs text-gray-500">
                실제 푸시 알림 신호가 전송되는 사용자 및 스마트폰 기기들의 토큰 목록입니다.
              </p>
            </div>
          </div>
        </div>

        {devices.length === 0 ? (
          <div className="py-8 text-center bg-gray-50/70 rounded-2xl border border-dashed border-gray-200 space-y-2">
            <Smartphone className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-xs font-bold text-gray-500">등록된 수신 기기가 없습니다.</p>
            <p className="text-[11px] text-gray-400">
              휴대폰에서 뼈반집 앱을 열고 알림 허용을 누르거나 위의 [이 기기 푸시 토큰 즉시 등록] 버튼을 눌러주세요.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/90 text-gray-600 font-bold border-b border-gray-100">
                <tr>
                  <th className="px-3.5 py-3 rounded-l-xl">사용자 / 이름</th>
                  <th className="px-3.5 py-3">플랫폼</th>
                  <th className="px-3.5 py-3">기기 토큰 ID</th>
                  <th className="px-3.5 py-3 text-center">상태</th>
                  <th className="px-3.5 py-3 text-center rounded-r-xl">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {devices.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-3.5 py-3 font-bold text-gray-800">
                      {d.userName || '알 수 없음'}
                      <span className="text-[10px] text-gray-400 font-normal ml-1">({d.userRole || '직원'})</span>
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
                        {d.platform || '스마트폰'}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-gray-400 font-mono text-[10px]">
                      {d.id.slice(-20)}...
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        수신 대기 중
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* iPhone Guide Note */}
      <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed space-y-1">
          <p className="font-bold">아이폰(iOS) 잠금화면 알림 주의사항:</p>
          <p>
            1. 아이폰 Safari 자체에서는 화면 꺼짐 시 푸시 수신이 차단됩니다. 반드시 <strong>[공유] → [홈 화면에 추가]</strong>로 설치된 독립 앱으로 1회 실행 후 알림 허용을 승인해야 합니다.
          </p>
          <p>
            2. 아이폰 <strong>[설정] → [알림] → [뼈반집]</strong>에서 '잠금화면', '알림 센터', '배너'가 모두 켜져 있어야 화면이 꺼진 상태에서 화면이 켜지며 배너가 뜹니다.
          </p>
        </div>
      </div>
    </div>
  );
}
