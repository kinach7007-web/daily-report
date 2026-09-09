import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Save, 
  AlertCircle, 
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

export default function ComplaintLog() {
  const { currentUser } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
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
    const saved = localStorage.getItem('complaintDraft');
    return saved ? JSON.parse(saved) : {
      date: getBusinessDate(),
      time: '',
      table: '',
      manager: '',
      category: '',
      step3: '',
      problem: '',
      step1Action: '',
      step2Action: '',
      step3Action: '',
      improvementPlan: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('complaintDraft', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    // 1. Initial load from localStorage
    const saved = localStorage.getItem('complaintsList');
    if (saved) {
      try {
        setComplaints(JSON.parse(saved));
      } catch (e) {}
    }

    // 2. Realtime listener from Firestore
    try {
      const q = collection(db, 'complaints');
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
        setComplaints(firestoreList);
        localStorage.setItem('complaintsList', JSON.stringify(firestoreList));
      }, (error) => {
        console.warn('Complaint Firestore sync note:', error);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Complaint sync error:', e);
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

  const filteredComplaints = useMemo(() => {
    if (showAllMonths) return complaints;
    const targetPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    return complaints.filter(item => {
      const itemDate = item.date || (item.id ? new Date(item.id).toISOString().slice(0, 10) : '');
      return itemDate.startsWith(targetPrefix);
    });
  }, [complaints, selectedYear, selectedMonth, showAllMonths]);

  
  const handleEdit = (item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentUser.role !== 'admin') {
      alert('관리자만 수정할 수 있습니다.');
      return;
    }
    setFormData(item);
    setEditingId(item.id || item.date);
    setIsFormOpen(true);
    setSelectedComplaint(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser.role !== 'admin') {
      alert('관리자만 삭제할 수 있습니다.');
      return;
    }
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'complaints', String(id)));
      setSelectedComplaint(null);
      setToastMessage('삭제되었습니다.');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (e) {
      console.error(e);
      alert('삭제 실패');
    }
  };

  const handleSave = async () => {
    if (!formData.date || !formData.problem) {
      setToastMessage('날짜와 문제점은 필수 입력 사항입니다.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    
    const docId = editingId || String(Date.now());
    const newComplaint = { ...formData, id: docId };

    // 1. Sync to Firestore collection first
    try {
      await setDoc(doc(db, 'complaints', docId), newComplaint);
    } catch (e: any) {
      console.error('Complaint DB write error:', e);
      alert('클라우드 데이터베이스 저장에 실패했습니다. 네트워크 상태를 확인해주세요: ' + (e?.message || e));
      return;
    }

    const updatedComplaints = [newComplaint, ...complaints];
    setComplaints(updatedComplaints);
    localStorage.setItem('complaintsList', JSON.stringify(updatedComplaints));
    
    setFormData({
      date: getBusinessDate(),
      time: '',
      table: '',
      manager: '',
      category: '',
      step3: '',
      problem: '',
      step1Action: '',
      step2Action: '',
      step3Action: '',
      improvementPlan: ''
    });
    localStorage.removeItem('complaintDraft');
    setIsFormOpen(false);
    setEditingId(null);
    setToastMessage('컴플레인이 클라우드에 안전하게 저장되었습니다.');
    setTimeout(() => setToastMessage(''), 3000);

    // Sync notification
    try {
      const author = currentUser ? `${currentUser.name} (${currentUser.role})` : (formData.manager || '담당자');
      const problemSummary = formData.problem.length > 30 ? formData.problem.slice(0, 30) + '...' : formData.problem;
      const notifTitle = '🚨 [컴플레인] 새 컴플레인 등록 알림';
      const notifBody = `${author}님이 [${formData.category || '고객 클레임'}] 새 컴플레인을 등록했습니다. "${problemSummary}"`;

      await addDoc(collection(db, 'reports'), {
        writer: author,
        type: '컴플레인',
        title: '새 컴플레인 등록',
        date: formData.date,
        time: formData.time || '',
        table: formData.table || '',
        category: formData.category || '고객 클레임',
        problem: formData.problem,
        createdAt: Timestamp.now()
      });

      // Background Web Push to all devices (await delivery to server)
      await dispatchBackgroundPushToAll({
        title: notifTitle,
        body: notifBody,
        type: '컴플레인',
        tag: `complaint-${Date.now()}`
      }).catch((e) => console.warn('Background push dispatch error:', e));
    } catch (e) {
      console.error('Complaint real-time notification failed:', e);
    }
  };

  // Build KakaoTalk text for Complaint
  const buildComplaintReportText = (c: any) => {
    const lines: string[] = [];
    lines.push('[뼈반집 컴플레인 접수 및 대응 보고]');
    lines.push(`■ 일시: ${c.date || '-'} ${c.time || ''}`.trim());
    lines.push(`■ 테이블: ${c.table || '-'}`);
    lines.push(`■ 담당자: ${c.manager || '-'}`);
    lines.push(`■ 항목: ${c.category || '-'} (3단계 준수: ${c.step3 || '-'})`);
    lines.push('');
    lines.push('[문제점 (클레임 내용)]');
    lines.push(c.problem || '-');
    lines.push('');
    lines.push('[대응 및 조치 내용]');
    lines.push(`▶ 1단계 (최초 대응): ${c.step1Action || '-'}`);
    lines.push(`▶ 2단계 (책임자 대응): ${c.step2Action || '-'}`);
    lines.push(`▶ 3단계 (카운터 대응): ${c.step3Action || '-'}`);
    if (c.improvementPlan) {
      lines.push('');
      lines.push('[앞으로 개선방향]');
      lines.push(c.improvementPlan);
    }
    return lines.join('\n');
  };

  const openPreviewModal = (c: any) => {
    setModalTitle(`컴플레인 카톡문 미리보기 (${c.date || ''} ${c.table ? `${c.table}` : ''})`.trim());
    setModalContent(buildComplaintReportText(c));
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
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}
      {selectedComplaint ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedComplaint(null)}
                className="text-gray-500 hover:text-gray-800 transition-colors cursor-pointer font-medium text-sm"
              >
                ← 뒤로 가기
              </button>
              <h3 className="font-semibold text-gray-800">컴플레인 상세 내용</h3>
            </div>
            <button
              type="button"
              onClick={() => openPreviewModal(selectedComplaint)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>카톡문 복사</span>
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 mb-1">날짜/시간</p>
                <p className="font-medium text-gray-800">{selectedComplaint.date} {selectedComplaint.time}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">테이블</p>
                <p className="font-medium text-gray-800">{selectedComplaint.table || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">담당자</p>
                <p className="font-medium text-gray-800">{selectedComplaint.manager || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">항목 / 3단계 준수</p>
                <p className="font-medium text-gray-800">{selectedComplaint.category || '-'} / {selectedComplaint.step3 || '-'}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-800 mb-2">문제점 (클레임 내용)</h4>
              <div className="bg-red-50 p-4 rounded-lg text-red-900 whitespace-pre-wrap text-sm">
                {selectedComplaint.problem}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-gray-800">대처 내용</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-bold text-blue-800 mb-1">▶ 1단계 대응자 (클레임 최초 대응자)</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedComplaint.step1Action || '작성된 내용이 없습니다.'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-bold text-blue-800 mb-1">▶ 2단계 대응자 (책임자가 재차 대응)</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedComplaint.step2Action || '작성된 내용이 없습니다.'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-bold text-blue-800 mb-1">▶ 3단계 카운터 대응자</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedComplaint.step3Action || '작성된 내용이 없습니다.'}</p>
              </div>
            </div>

            {selectedComplaint.improvementPlan && (
              <div>
                <h4 className="font-bold text-gray-800 mb-2">앞으로 개선방향</h4>
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg text-emerald-950 whitespace-pre-wrap text-sm">
                  {selectedComplaint.improvementPlan}
                </div>
              </div>
            )}

            {currentUser.role === 'admin' && selectedComplaint && (
              <div className="flex gap-2 w-full mt-4">
                <button
                  onClick={() => handleEdit(selectedComplaint)}
                  className="flex-1 py-3 bg-stone-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-stone-900 shadow-sm transition-all"
                >
                  <Edit2 className="w-4 h-4" /> 수정 (관리자)
                </button>
                <button
                  onClick={(e) => handleDelete(selectedComplaint.id, e)}
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 sm:gap-0">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">고객 컴플레인 관리표</h2>
              <p className="text-sm text-gray-500 mt-1">불평 고객은 우리에게 너무나 소중한 고객임을 잊지 말아야 합니다.</p>
            </div>
            <button 
              onClick={() => { setIsFormOpen(!isFormOpen); if(isFormOpen) setEditingId(null); }}
              className="w-full sm:w-auto bg-rose-400 hover:bg-rose-500 text-white px-4 py-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm font-bold"
            >
              {isFormOpen ? '목록 보기' : <><Plus className="w-4 h-4" /> 새 컴플레인 등록</>}
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">★★★ 클레임/컴플레인 대응 3단계 매뉴얼</p>
              <p className="text-sm">최초 접수자 테이블 1차 사과 ▶ 관리자 2차 사과 및 해결 ▶ 카운터 3차 사과 및 재발방지약속</p>
              <p className="text-sm mt-1 font-medium">아주 사소한 내용이라도 꼭 적어주세요!!! 컴플레인/클레임 응대능력이 우리의 경쟁력입니다.</p>
            </div>
          </div>

          {isFormOpen ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">신규 컴플레인 작성</h3>
                <button onClick={handleSave} className="bg-rose-400 hover:bg-rose-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm shadow-sm">
                  <Save className="w-4 h-4" />
                  저장
                </button>
              </div>
              
              <div className="p-6 space-y-8">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">날짜</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">시간</label>
                <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">테이블</label>
                <input type="text" value={formData.table} onChange={e => setFormData({...formData, table: e.target.value})} placeholder="예: 5T" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">담당자</label>
                <input type="text" value={formData.manager} onChange={e => setFormData({...formData, manager: e.target.value})} placeholder="담당자 이름" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            {/* 클레임 항목 & 3단계 실시여부 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">클레임 항목</label>
                <div className="flex gap-4">
                  {['음식', '서비스', '위생', '기타'].map(item => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="category" checked={formData.category === item} onChange={() => setFormData({...formData, category: item})} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">클레임대응 3단계 실시여부</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="step3" checked={formData.step3 === 'O'} onChange={() => setFormData({...formData, step3: 'O'})} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                    <span>준수 (O)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="step3" checked={formData.step3 === 'X'} onChange={() => setFormData({...formData, step3: 'X'})} className="w-4 h-4 text-red-600 focus:ring-red-500" />
                    <span>미준수 (X)</span>
                  </label>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* 클레임 내용 */}
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">문제점 (클레임 내용)</label>
              <textarea 
                value={formData.problem} onChange={e => setFormData({...formData, problem: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-3 min-h-[100px] focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                placeholder="고객이 제기한 문제점을 상세히 적어주세요. (예: 순대국에서 머리카락 나와서 손님이 많이 화나심)"
              ></textarea>
            </div>

            {/* 대처 내용 */}
            <div className="space-y-4">
              <label className="block text-base font-semibold text-gray-800">어떻게 대처하였나요?</label>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-bold text-blue-800 mb-2">▶ 1단계 대응자 (클레임 최초 대응자)</label>
                <textarea 
                  value={formData.step1Action} onChange={e => setFormData({...formData, step1Action: e.target.value})}
                  className="w-full border border-gray-300 rounded-md p-3 min-h-[80px] focus:ring-2 focus:ring-blue-500 outline-none resize-y bg-white"
                  placeholder="예: 손님한테 정말 죄송하다고 말씀드렸습니다. 주방에서 위생모를 모두 착용하고 있는데 실수가 있었던 것 같다고 말씀드리고..."
                ></textarea>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-bold text-blue-800 mb-2">▶ 2단계 대응자 (책임자가 재차 대응)</label>
                <textarea 
                  value={formData.step2Action} onChange={e => setFormData({...formData, step2Action: e.target.value})}
                  className="w-full border border-gray-300 rounded-md p-3 min-h-[80px] focus:ring-2 focus:ring-blue-500 outline-none resize-y bg-white"
                  placeholder="예: 매장 홀 책임자 OOO 대리가 음식을 가져다 드리며 재차 죄송하다는 언급을 드렸습니다."
                ></textarea>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-bold text-blue-800 mb-2">▶ 3단계 카운터 대응자</label>
                <textarea 
                  value={formData.step3Action} onChange={e => setFormData({...formData, step3Action: e.target.value})}
                  className="w-full border border-gray-300 rounded-md p-3 min-h-[80px] focus:ring-2 focus:ring-blue-500 outline-none resize-y bg-white"
                  placeholder="예: 손님 나가실 때 다시 한 번 죄송하단 말씀과 함께 다음에 사용하실 수 있는 상품권 1만원 발급해드렸고..."
                ></textarea>
              </div>
            </div>

            {/* 앞으로 개선방향 */}
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">앞으로 개선방향</label>
              <textarea 
                value={formData.improvementPlan || ''} 
                onChange={e => setFormData({...formData, improvementPlan: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-3 min-h-[100px] focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                placeholder="예 : 클레임 또는 사건발생의 차단 방법이나 재발방지 대책에 대하여 작성해주시면 됩니다!"
              ></textarea>
            </div>


            {currentUser.role === 'admin' && selectedComplaint && (
              <div className="flex gap-2 w-full mt-4">
                <button
                  onClick={() => handleEdit(selectedComplaint)}
                  className="flex-1 py-3 bg-stone-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-stone-900 shadow-sm transition-all"
                >
                  <Edit2 className="w-4 h-4" /> 수정 (관리자)
                </button>
                <button
                  onClick={(e) => handleDelete(selectedComplaint.id, e)}
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
                  <Calendar className="w-3.5 h-3.5 text-amber-500 mr-1.5" />
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
                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors border border-amber-200"
                >
                  <RotateCcw className="w-3 h-3" />
                  당월({todayM}월)
                </button>
              )}

              <button
                onClick={() => setShowAllMonths(!showAllMonths)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border ${
                  showAllMonths 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                }`}
              >
                <Filter className="w-3 h-3" />
                {showAllMonths ? '전체 기간 조회 중' : '전체 기간 보기'}
              </button>
            </div>

            <div className="text-xs text-gray-500 font-medium self-end sm:self-center">
              {showAllMonths ? '전체' : `${selectedYear}년 ${selectedMonth}월`} 컴플레인 접수: <strong className="text-amber-600 font-bold">{filteredComplaints.length}</strong>건
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 border-b">
                  <tr>
                    <th className="px-1 sm:px-4 py-2 sm:py-4 text-[9px] sm:text-sm font-semibold whitespace-nowrap tracking-tighter sm:tracking-normal text-center">날짜/시간</th>
                    <th className="px-1 sm:px-4 py-2 sm:py-4 text-[9px] sm:text-sm font-semibold whitespace-nowrap tracking-tighter sm:tracking-normal text-center">테이블</th>
                    <th className="px-1 sm:px-4 py-2 sm:py-4 text-[9px] sm:text-sm font-semibold whitespace-nowrap tracking-tighter sm:tracking-normal text-center">항목</th>
                    <th className="px-1 sm:px-4 py-2 sm:py-4 text-[9px] sm:text-sm font-semibold whitespace-nowrap tracking-tighter sm:tracking-normal">문제점 요약</th>
                    <th className="px-1 sm:px-4 py-2 sm:py-4 text-[9px] sm:text-sm font-semibold whitespace-nowrap tracking-tighter sm:tracking-normal text-center">3단계 준수</th>
                    <th className="px-1 sm:px-4 py-2 sm:py-4 text-[9px] sm:text-sm font-semibold whitespace-nowrap tracking-tighter sm:tracking-normal text-center">담당자</th>
                    <th className="px-1 sm:px-4 py-2 sm:py-4 text-[9px] sm:text-sm font-semibold whitespace-nowrap tracking-tighter sm:tracking-normal text-center">카톡보고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredComplaints.length > 0 ? filteredComplaints.map((c, i) => (
                    <tr key={c.id || i} onClick={() => setSelectedComplaint(c)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-1 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-center">
                        <div className="font-medium text-gray-900 text-[10px] sm:text-sm">{c.date}</div>
                        <div className="text-gray-500 text-[9px] sm:text-xs">{c.time}</div>
                      </td>
                      <td className="px-1 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm whitespace-nowrap text-center">{c.table}</td>
                      <td className="px-1 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-center">
                        {c.category && (
                          <span className={`px-1 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium ${
                            c.category === '위생' ? 'bg-red-100 text-red-700' :
                            c.category === '서비스' ? 'bg-orange-100 text-orange-700' :
                            c.category === '음식' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {c.category}
                          </span>
                        )}
                      </td>
                      <td className="px-1 sm:px-4 py-2 sm:py-3 truncate max-w-[80px] sm:max-w-[200px] text-[10px] sm:text-sm">{c.problem}</td>
                      <td className="px-1 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm whitespace-nowrap text-center">
                        {c.step3 === 'O' ? <span className="text-blue-600 font-bold">O</span> : 
                         c.step3 === 'X' ? <span className="text-red-600 font-bold">X</span> : '-'}
                      </td>
                      <td className="px-1 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm whitespace-nowrap text-center">{c.manager}</td>
                      <td className="px-1 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openPreviewModal(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs shadow-amber-200 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>보고</span>
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-4 py-8 text-center text-gray-500 text-[11px] sm:text-sm" colSpan={7}>
                        {showAllMonths ? '등록된 컴플레인 내역이 없습니다.' : `${selectedYear}년 ${selectedMonth}월에 등록된 컴플레인 내역이 없습니다.`}
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
                <MessageSquareQuote className="w-4 h-4 text-rose-600" />
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
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
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
