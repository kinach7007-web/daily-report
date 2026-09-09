import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Save, 
  Info, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Filter,
  Send,
  Copy,
  Check,
  X,
  MessageSquareQuote,
  Edit2,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { getBusinessDate } from './DailyReport';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, setDoc, onSnapshot, Timestamp, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { dispatchBackgroundPushToAll } from '../lib/pushDispatcher';

export default function InterviewLog() {
  const { currentUser } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  // Preview & Copy Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Current year & month for default filter
  const todayBusiness = getBusinessDate();
  const [todayY, todayM] = todayBusiness.split('-').map(Number);
  const [selectedYear, setSelectedYear] = useState<number>(todayY || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(todayM || new Date().getMonth() + 1);
  const [showAllMonths, setShowAllMonths] = useState<boolean>(false);

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('interviewDraft');
    return saved ? JSON.parse(saved) : {
      interviewer: '',
      applicant: '',
      gender: '',
      birthYear: '',
      phone: '',
      dept: '',
      type: '',
      shift: '',
      q1: '', // 장기근무성
      q2: '', // 지원자 기본태도 1 (인성/예의)
      q3: '', // 지원자 기본태도 2 (근태)
      q4: '', // 팀워크 / 조화성
      q5: '', // 서비스 마인드 (친절도)
      q6: '', // 퇴사시 변수
      q7: '', // 출근 가능 일정
      salaryDay: '',
      salaryNight: '',
      evaluation: ''
    };
  });

  React.useEffect(() => {
    localStorage.setItem('interviewDraft', JSON.stringify(formData));
  }, [formData]);

  React.useEffect(() => {
    // 1. Initial load from localStorage
    const saved = localStorage.getItem('interviewsList');
    if (saved) {
      try {
        setInterviews(JSON.parse(saved));
      } catch (e) {}
    }

    // 2. Realtime listener from Firestore
    try {
      const q = collection(db, 'interviews');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const firestoreList: any[] = [];
        snapshot.forEach((docSnap) => {
          firestoreList.push({ id: docSnap.id, ...docSnap.data() });
        });

        firestoreList.sort((a, b) => {
          const dateA = a.date || '';
          const dateB = b.date || '';
          return dateB.localeCompare(dateA);
        });
        setInterviews(firestoreList);
        localStorage.setItem('interviewsList', JSON.stringify(firestoreList));
      }, (error) => {
        console.warn('Interview Firestore sync note:', error);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Interview sync error:', e);
    }
  }, []);

  const handlePrevMonth = () => {
    setShowAllMonths(false);
    if (selectedMonth === 1) {
      setSelectedYear(y => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    setShowAllMonths(false);
    if (selectedMonth === 12) {
      setSelectedYear(y => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handleResetMonth = () => {
    setShowAllMonths(false);
    setSelectedYear(todayY || new Date().getFullYear());
    setSelectedMonth(todayM || new Date().getMonth() + 1);
  };

  const filteredInterviews = useMemo(() => {
    if (showAllMonths) return interviews;
    const targetPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    return interviews.filter(item => {
      const itemDate = item.date || (item.id ? new Date(item.id).toISOString().slice(0, 10) : '');
      return itemDate.startsWith(targetPrefix);
    });
  }, [interviews, selectedYear, selectedMonth, showAllMonths]);

  
  const handleEdit = (item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentUser.role !== 'admin') {
      alert('관리자만 수정할 수 있습니다.');
      return;
    }
    setFormData(item);
    setEditingId(item.id || item.applicant);
    setIsFormOpen(true);
    setSelectedInterview(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser.role !== 'admin') {
      alert('관리자만 삭제할 수 있습니다.');
      return;
    }
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'interviews', String(id)));
      setSelectedInterview(null);
      setToastMessage('삭제되었습니다.');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (e) {
      console.error(e);
      alert('삭제 실패');
    }
  };

  const handleSave = async () => {
    if (!formData.applicant) {
      setToastMessage('지원자 성함은 필수 입력 사항입니다.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    
    const newInterview = { 
      ...formData, 
      id: Date.now(),
      date: getBusinessDate()
    };

    // 1. Sync to Firestore collection first
    try {
      await setDoc(doc(db, 'interviews', String(Date.now())), newInterview);
    } catch (e: any) {
      console.error('Interview DB write error:', e);
      alert('클라우드 데이터베이스 저장에 실패했습니다. 네트워크 상태를 확인해주세요: ' + (e?.message || e));
      return;
    }

    const updatedInterviews = [newInterview, ...interviews];
    setInterviews(updatedInterviews);
    localStorage.setItem('interviewsList', JSON.stringify(updatedInterviews));
    
    setFormData({
      interviewer: '', applicant: '', gender: '', birthYear: '', phone: '',
      dept: '', type: '', shift: '', q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '',
      salaryDay: '', salaryNight: '', evaluation: ''
    });
    localStorage.removeItem('interviewDraft');
    setIsFormOpen(false);
    setEditingId(null);
    setToastMessage('면접 기록이 클라우드에 안전하게 저장되었습니다.');
    setTimeout(() => setToastMessage(''), 3000);

    // Sync notification
    try {
      const author = currentUser ? `${currentUser.name} (${currentUser.role})` : (formData.interviewer || '면접관');
      const notifTitle = '👥 [면접일지] 면접일지 저장 알림';
      const notifBody = `${author}님이 지원자 [${formData.applicant}]님의 면접일지를 저장했습니다.`;

      await addDoc(collection(db, 'reports'), {
        writer: author,
        type: '면접일지',
        title: '면접일지 저장',
        date: getBusinessDate(),
        applicant: formData.applicant,
        dept: formData.dept || '지원자',
        evaluation: formData.evaluation || '',
        createdAt: Timestamp.now()
      });

      // Background Web Push to all devices (await delivery to server)
      await dispatchBackgroundPushToAll({
        title: notifTitle,
        body: notifBody,
        type: '면접일지',
        tag: `interview-${Date.now()}`
      }).catch((e) => console.warn('Background push dispatch error:', e));
    } catch (e) {
      console.error('Interview real-time notification failed:', e);
    }
  };

  // Build KakaoTalk text for Interview Log
  const buildInterviewReportText = (item: any) => {
    const lines: string[] = [];
    lines.push('[뼈반집 신규 면접 결과 보고]');
    lines.push(`■ 면접일자: ${item.date || (item.id ? new Date(item.id).toLocaleDateString('ko-KR') : '-')}`);
    const genderBirth = [item.gender, item.birthYear ? `${item.birthYear}년생` : ''].filter(Boolean).join(', ');
    lines.push(`■ 지원자: ${item.applicant || '-'}${genderBirth ? ` (${genderBirth})` : ''}`);
    lines.push(`■ 연락처: ${item.phone || '-'}`);
    lines.push(`■ 지원분야: ${item.dept || '-'} / ${item.type || '-'}${item.shift ? ` (${item.shift})` : ''}`);
    lines.push(`■ 면접관: ${item.interviewer || '-'}`);
    lines.push('');
    lines.push('[면접 체크리스트]');
    lines.push(`▶ 장기근무성: ${item.q1 || '-'}`);
    lines.push(`▶ 기본태도 1 (인성/예의): ${item.q2 || '-'}`);
    lines.push(`▶ 기본태도 2 (근태): ${item.q3 || '-'}`);
    lines.push(`▶ 팀워크 / 조화성: ${item.q4 || '-'}`);
    lines.push(`▶ 서비스 마인드: ${item.q5 || '-'}`);
    lines.push(`▶ 퇴사시 변수: ${item.q6 || '-'}`);
    lines.push(`▶ 출근 가능 일정: ${item.q7 || '-'}`);
    lines.push('');
    lines.push('[급여 안내 및 최종 평가]');
    lines.push(`■ 주간 급여: ${item.salaryDay ? `${item.salaryDay}만원` : '-'}`);
    lines.push(`■ 야간 급여: ${item.salaryNight ? `${item.salaryNight}만원` : '-'}`);
    lines.push(`■ 최종 평가: ${item.evaluation || '미평가'}`);
    return lines.join('\n');
  };

  const openPreviewModal = (item: any) => {
    setModalTitle(`면접일지 카톡문 미리보기 (${item.applicant ? `${item.applicant} 지원자` : '면접기록'})`);
    setModalContent(buildInterviewReportText(item));
    setIsCopied(false);
    setIsModalOpen(true);
  };

  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(modalContent).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(() => {
        fallbackCopy(modalContent);
      });
    } else {
      fallbackCopy(modalContent);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      console.warn('Fallback copy failed:', e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 relative">
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}
      {selectedInterview ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedInterview(null)}
                className="text-gray-500 hover:text-gray-800 transition-colors cursor-pointer font-medium text-sm"
              >
                ← 뒤로 가기
              </button>
              <h3 className="font-semibold text-gray-800">면접 기록 상세 내용</h3>
            </div>
            <button
              type="button"
              onClick={() => openPreviewModal(selectedInterview)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>카톡문 복사</span>
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 mb-1">지원자</p>
                <p className="font-medium text-gray-800">{selectedInterview.applicant} ({selectedInterview.gender || '-'}, {selectedInterview.birthYear || '-'})</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">연락처</p>
                <p className="font-medium text-gray-800">{selectedInterview.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">지원 분야</p>
                <p className="font-medium text-gray-800">{selectedInterview.dept || '-'} / {selectedInterview.type || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">면접관</p>
                <p className="font-medium text-gray-800">{selectedInterview.interviewer || '-'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-gray-800 border-b pb-2">면접 체크리스트 답변</h4>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-bold text-indigo-800 mb-1">장기근무성</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedInterview.q1 || '작성된 내용이 없습니다.'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-bold text-indigo-800 mb-1">지원자 기본태도 1 (인성/예의)</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedInterview.q2 || '작성된 내용이 없습니다.'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-bold text-indigo-800 mb-1">지원자 기본태도 2 (근태)</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedInterview.q3 || '작성된 내용이 없습니다.'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-bold text-indigo-800 mb-1">팀워크 / 조화성</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedInterview.q4 || '작성된 내용이 없습니다.'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-bold text-indigo-800 mb-1">서비스 마인드 (친절도)</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedInterview.q5 || '작성된 내용이 없습니다.'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-bold text-indigo-800 mb-1">퇴사시 변수</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedInterview.q6 || '작성된 내용이 없습니다.'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-bold text-indigo-800 mb-1">출근 가능 일정</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedInterview.q7 || '작성된 내용이 없습니다.'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-gray-800 mb-2">급여 안내</h4>
                <p className="text-sm text-gray-700">주간: {selectedInterview.salaryDay || '-'} 만원</p>
                <p className="text-sm text-gray-700">야간: {selectedInterview.salaryNight || '-'} 만원</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-gray-800 mb-2">최종 평가</h4>
                <p className="text-sm font-bold text-rose-600">{selectedInterview.evaluation || '-'}</p>
              </div>
            </div>

            {currentUser.role === 'admin' && selectedInterview && (
              <div className="flex gap-2 w-full mt-4">
                <button
                  onClick={() => handleEdit(selectedInterview)}
                  className="flex-1 py-3 bg-stone-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-stone-900 shadow-sm transition-all"
                >
                  <Edit2 className="w-4 h-4" /> 수정 (관리자)
                </button>
                <button
                  onClick={(e) => handleDelete(selectedInterview.id, e)}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-700 shadow-sm transition-all"
                >
                  <Trash2 className="w-4 h-4" /> 삭제 (관리자)
                </button>
              </div>
            )}
            {currentUser.role !== 'admin' && (
              <div className="p-3 mt-4 rounded-xl border bg-stone-50 border-stone-200 text-stone-600 flex items-start gap-2.5 text-xs">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-stone-400" />
                <span>등록된 일지는 관리자만 수정 및 삭제가 가능합니다. 일반 직원은 수정이 잠겨있으며, 관리자 권한으로만 수정/삭제가 가능합니다.</span>
              </div>
            )}
          </div>
        </div>
      ) : (

        <>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 sm:gap-0 pt-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">면접 일지</h2>
          <p className="text-sm text-gray-500 mt-1">면접 환경을 배려하고 편안한 분위기를 조성해주세요.</p>
        </div>
        <button 
          onClick={() => { setIsFormOpen(!isFormOpen); if(isFormOpen) setEditingId(null); }}
          className="w-full sm:w-auto bg-rose-400 hover:bg-rose-500 text-white px-4 py-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm font-bold"
        >
          {isFormOpen ? '목록 보기' : <><Plus className="w-4 h-4" /> 새 면접 기록</>}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex gap-2 sm:gap-3 text-blue-800">
        <Info className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs sm:text-base font-bold mb-1">★ 면접을 보기 전 면접 환경 배려하기!!</p>
          <ul className="text-[10px] sm:text-sm space-y-1 list-disc list-inside">
            <li>편안한 분위기 조성 / 면접자로 하여금 입사하지 않더라도 우리 매장이 좋은 기억에 남게 해주세요.</li>
            <li>물 또는 커피를 제공하고 타인의 방해를 받지 않는 회의실에서 편안하게 면접 볼 수 있도록 해주세요.</li>
          </ul>
        </div>
      </div>

      {isFormOpen ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">신규 면접 기록</h3>
            <button onClick={handleSave} className="bg-rose-400 hover:bg-rose-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm shadow-sm">
              <Save className="w-4 h-4" />
              저장
            </button>
          </div>
          
          <div className="p-6 space-y-8">
            {/* 기본 정보 */}
            <section>
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">지원자 기본 정보</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">면접관 성함</label>
                  <input type="text" value={formData.interviewer} onChange={e => setFormData({...formData, interviewer: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">지원자 성함</label>
                  <input type="text" value={formData.applicant} onChange={e => setFormData({...formData, applicant: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
                  <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="">선택</option>
                    <option value="남">남</option>
                    <option value="여">여</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">출생년도</label>
                  <input type="text" value={formData.birthYear} onChange={e => setFormData({...formData, birthYear: e.target.value})} placeholder="예: 1995" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="010-0000-0000" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </section>

            {/* 지원 분야 */}
            <section>
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">지원 분야</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">홀/주방 지원유무</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2"><input type="radio" name="dept" checked={formData.dept === '홀'} onChange={() => setFormData({...formData, dept: '홀'})} className="w-4 h-4 text-blue-600" /> 홀</label>
                    <label className="flex items-center gap-2"><input type="radio" name="dept" checked={formData.dept === '주방'} onChange={() => setFormData({...formData, dept: '주방'})} className="w-4 h-4 text-blue-600" /> 주방</label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">직원/알바 지원유무</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2"><input type="radio" name="type" checked={formData.type === '직원'} onChange={() => setFormData({...formData, type: '직원'})} className="w-4 h-4 text-blue-600" /> 직원</label>
                    <label className="flex items-center gap-2"><input type="radio" name="type" checked={formData.type === '알바'} onChange={() => setFormData({...formData, type: '알바'})} className="w-4 h-4 text-blue-600" /> 알바</label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">근무조 (주/야간, 평일/주말)</label>
                  <input type="text" value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})} placeholder="예: 주간 평일 오전" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </section>

            {/* 면접 체크리스트 */}
            <section>
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">면접 체크리스트 및 답변</h4>
              <div className="space-y-6">
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-1/3">
                      <h5 className="font-bold text-gray-800">장기근무성</h5>
                      <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                        <li>근무기간 (얼마나 다닐지 예상)</li>
                        <li>그만둔 이유 (사장/직원 과의 관계성)</li>
                        <li>과거 알바 근무 내용 전부 확인</li>
                        <li>전에 일했던 곳 중 바쁘거나 힘든 환경에서 일한 경험? (매출액/바쁜환경)</li>
                        <li>출퇴근 하는데 얼마나 걸리나요?</li>
                      </ul>
                    </div>
                    <div className="md:w-2/3">
                      <textarea value={formData.q1} onChange={e => setFormData({...formData, q1: e.target.value})} className="w-full h-full min-h-[120px] border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-y bg-white" placeholder="답변을 작성해주세요..."></textarea>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-1/3">
                      <h5 className="font-bold text-gray-800">지원자 기본태도 1 (인성/예의)</h5>
                      <p className="text-sm text-gray-600 mt-2">회사 대표님이 인성, 인사성을 가장 중요시 여기시는데 함께 일하는 사람들에게 예의와 인성을 갖추는 편이셨는지요?</p>
                    </div>
                    <div className="md:w-2/3">
                      <textarea value={formData.q2} onChange={e => setFormData({...formData, q2: e.target.value})} className="w-full h-full min-h-[80px] border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-y bg-white" placeholder="답변을 작성해주세요..."></textarea>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-1/3">
                      <h5 className="font-bold text-gray-800">지원자 기본태도 2 (근태)</h5>
                      <p className="text-sm text-gray-600 mt-2">회사 대표님이 출근 근태를 중요시 여기시는데 이전 근무지에서 출근은 잘하셨었나요? 지각한 적은 없었나요?</p>
                    </div>
                    <div className="md:w-2/3">
                      <textarea value={formData.q3} onChange={e => setFormData({...formData, q3: e.target.value})} className="w-full h-full min-h-[80px] border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-y bg-white" placeholder="답변을 작성해주세요..."></textarea>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-1/3">
                      <h5 className="font-bold text-gray-800">팀워크 / 조화성</h5>
                      <p className="text-sm text-gray-600 mt-2">전에 일하실때 함께 일하는 사람들과 조화롭게 일하는 편이셨나요? 자기 주장이 강하신 편이신지 여쭤봐도 될까요?</p>
                    </div>
                    <div className="md:w-2/3">
                      <textarea value={formData.q4} onChange={e => setFormData({...formData, q4: e.target.value})} className="w-full h-full min-h-[80px] border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-y bg-white" placeholder="답변을 작성해주세요..."></textarea>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-1/3">
                      <h5 className="font-bold text-gray-800">서비스 마인드 (친절도)</h5>
                      <p className="text-sm text-gray-600 mt-2">식당은 서비스업이고 많은 손님을 응대하는게 기본인데 손님들한테 인사를 잘하고 친절하게 응대하는 편이였나요?</p>
                    </div>
                    <div className="md:w-2/3">
                      <textarea value={formData.q5} onChange={e => setFormData({...formData, q5: e.target.value})} className="w-full h-full min-h-[80px] border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-y bg-white" placeholder="답변을 작성해주세요..."></textarea>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-1/3">
                      <h5 className="font-bold text-gray-800">퇴사시 변수</h5>
                      <p className="text-sm text-gray-600 mt-2">갑자기 개인 사정으로 일을 그만둘때 사전 조율을 하는 편인가요? (예고없이 관두는 편인지 대체인력 채용시 기다리는 편인지 확인)</p>
                    </div>
                    <div className="md:w-2/3">
                      <textarea value={formData.q6} onChange={e => setFormData({...formData, q6: e.target.value})} className="w-full h-full min-h-[80px] border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-y bg-white" placeholder="답변을 작성해주세요..."></textarea>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="md:w-1/3">
                      <h5 className="font-bold text-gray-800">출근 가능 일정</h5>
                    </div>
                    <div className="md:w-2/3">
                      <input type="text" value={formData.q7} onChange={e => setFormData({...formData, q7: e.target.value})} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white" placeholder="출근은 언제부터 가능한가요?" />
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* 최종 평가 및 안내 */}
            <section className="border-t pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold text-gray-800 mb-3">면접 후 안내사항</h4>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">▶ 주간 직원 급여 안내:</span>
                      <input type="text" value={formData.salaryDay} onChange={e => setFormData({...formData, salaryDay: e.target.value})} className="border border-gray-300 rounded px-2 py-1 w-24 text-sm" placeholder="만원" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">▶ 야간 직원 급여 안내:</span>
                      <input type="text" value={formData.salaryNight} onChange={e => setFormData({...formData, salaryNight: e.target.value})} className="border border-gray-300 rounded px-2 py-1 w-24 text-sm" placeholder="만원" />
                    </div>
                    <p className="text-sm font-medium text-blue-700 mt-2">▶ 면접결과 발표 일정 안내 : 면접후 3일이내로 연락드립니다.</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-bold text-gray-800 mb-3">최종 평가 (추천 여부)</h4>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="space-y-3">
                      {['매우 추천', '추천', '보통', '부적합'].map(level => (
                        <label key={level} className="flex items-center justify-between p-2 hover:bg-white rounded cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                          <span className="font-medium text-gray-700">{level}</span>
                          <input type="radio" name="evaluation" checked={formData.evaluation === level} onChange={() => setFormData({...formData, evaluation: level})} className="w-5 h-5 text-blue-600" />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>


            {currentUser.role === 'admin' && selectedInterview && (
              <div className="flex gap-2 w-full mt-4">
                <button
                  onClick={() => handleEdit(selectedInterview)}
                  className="flex-1 py-3 bg-stone-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-stone-900 shadow-sm transition-all"
                >
                  <Edit2 className="w-4 h-4" /> 수정 (관리자)
                </button>
                <button
                  onClick={(e) => handleDelete(selectedInterview.id, e)}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-700 shadow-sm transition-all"
                >
                  <Trash2 className="w-4 h-4" /> 삭제 (관리자)
                </button>
              </div>
            )}
            {currentUser.role !== 'admin' && (
              <div className="p-3 mt-4 rounded-xl border bg-stone-50 border-stone-200 text-stone-600 flex items-start gap-2.5 text-xs">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-stone-400" />
                <span>등록된 일지는 관리자만 수정 및 삭제가 가능합니다. 일반 직원은 수정이 잠겨있으며, 관리자 권한으로만 수정/삭제가 가능합니다.</span>
              </div>
            )}
          </div>
        </div>
      ) : (

        <div className="space-y-4">
          {/* 월별 필터 바 */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-50/80 p-1 rounded-xl border border-gray-200">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1.5 text-gray-500 hover:bg-white hover:text-gray-800 rounded-lg transition-all"
                  title="이전 달"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="relative flex items-center px-2.5 py-1 bg-white rounded-lg shadow-xs border border-gray-100">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500 mr-1.5" />
                  <span className="text-xs font-bold text-gray-800 whitespace-nowrap">
                    {selectedYear}년 {selectedMonth}월
                  </span>
                  <input 
                    type="month"
                    value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [y, m] = e.target.value.split('-').map(Number);
                      setSelectedYear(y);
                      setSelectedMonth(m);
                      setShowAllMonths(false);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="월 선택"
                  />
                </div>

                <button 
                  onClick={handleNextMonth}
                  className="p-1.5 text-gray-500 hover:bg-white hover:text-gray-800 rounded-lg transition-all"
                  title="다음 달"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {(!showAllMonths && (selectedYear !== todayY || selectedMonth !== todayM)) && (
                <button
                  onClick={handleResetMonth}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors border border-indigo-100"
                >
                  <RotateCcw className="w-3 h-3" />
                  당월({todayM}월)
                </button>
              )}

              <button
                onClick={() => setShowAllMonths(!showAllMonths)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border ${
                  showAllMonths 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                }`}
              >
                <Filter className="w-3 h-3" />
                {showAllMonths ? '전체 기간 조회 중' : '전체 기간 보기'}
              </button>
            </div>

            <div className="text-xs text-gray-500 font-medium self-end sm:self-center">
              {showAllMonths ? '전체' : `${selectedYear}년 ${selectedMonth}월`} 면접 기록: <strong className="text-indigo-600 font-bold">{filteredInterviews.length}</strong>건
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 border-b">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-4 text-[10px] sm:text-sm font-semibold whitespace-nowrap text-center">면접 일자</th>
                    <th className="px-1 sm:px-4 py-2 sm:py-4 text-[10px] sm:text-sm font-semibold whitespace-nowrap text-center">지원자</th>
                    <th className="px-1 sm:px-4 py-2 sm:py-4 text-[10px] sm:text-sm font-semibold whitespace-nowrap text-center">지원 분야</th>
                    <th className="px-1 sm:px-4 py-2 sm:py-4 text-[10px] sm:text-sm font-semibold whitespace-nowrap text-center">연락처</th>
                    <th className="px-1 sm:px-4 py-2 sm:py-4 text-[10px] sm:text-sm font-semibold whitespace-nowrap text-center">면접관</th>
                    <th className="px-1 sm:px-4 py-2 sm:py-4 text-[10px] sm:text-sm font-semibold whitespace-nowrap text-center">최종 평가</th>
                    <th className="px-1 sm:px-4 py-2 sm:py-4 text-[10px] sm:text-sm font-semibold whitespace-nowrap text-center">카톡보고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInterviews.length > 0 ? filteredInterviews.map((interview, idx) => (
                    <tr key={interview.id || idx} onClick={() => setSelectedInterview(interview)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center text-gray-600 whitespace-nowrap">
                        {interview.date || (interview.id ? new Date(interview.id).toLocaleDateString('ko-KR') : '-')}
                      </td>
                      <td className="px-1 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 text-[11px] sm:text-sm text-center whitespace-nowrap">{interview.applicant}</td>
                      <td className="px-1 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center whitespace-nowrap">{interview.dept} / {interview.type}</td>
                      <td className="px-1 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center whitespace-nowrap">{interview.phone}</td>
                      <td className="px-1 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center whitespace-nowrap">{interview.interviewer}</td>
                      <td className="px-1 sm:px-4 py-2 sm:py-3 text-center whitespace-nowrap">
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium ${
                          interview.evaluation === '매우 추천' ? 'bg-green-100 text-green-700' :
                          interview.evaluation === '추천' ? 'bg-blue-100 text-blue-700' :
                          interview.evaluation === '부적합' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {interview.evaluation || '미평가'}
                        </span>
                      </td>
                      <td className="px-1 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openPreviewModal(interview)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs shadow-indigo-200 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>보고</span>
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-1 sm:px-4 py-8 text-center text-gray-500 text-[11px] sm:text-sm" colSpan={7}>
                        {showAllMonths ? '등록된 면접 기록이 없습니다.' : `${selectedYear}년 ${selectedMonth}월에 등록된 면접 기록이 없습니다.`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* 미리보기 & 카톡 복사 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-gray-800">{modalTitle}</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans text-xs text-gray-700 leading-relaxed bg-gray-50/80 p-4 rounded-2xl border border-gray-200/70 select-all font-mono">
                {modalContent}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                {isCopied && (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>클립보드에 복사되었습니다!</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  닫기
                </button>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? '복사완료' : '카톡문 복사하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
