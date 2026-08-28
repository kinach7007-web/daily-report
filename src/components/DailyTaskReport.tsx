import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ClipboardList, 
  Sun, 
  Moon, 
  RotateCcw, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  X, 
  Sparkles,
  User,
  Calendar,
  DollarSign,
  Users2,
  ListTodo,
  ShieldCheck,
  Flame,
  Lightbulb,
  MessageSquareQuote
} from 'lucide-react';

const STORE_KEY = 'ppyeobanjip-daily-report-draft';

const getTodayLabel = () => {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}.${d.getDate()}(${days[d.getDay()]})`;
};

const getActiveBusinessDateLabel = () => {
  const active = localStorage.getItem('activeReportDate');
  if (active) {
    try {
      const parts = active.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m - 1, d);
        if (!isNaN(dateObj.getTime())) {
          const days = ['일', '월', '화', '수', '목', '금', '토'];
          return `${m}.${d}(${days[dateObj.getDay()]})`;
        }
      }
    } catch (e) {}
  }
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${now.getMonth() + 1}.${now.getDate()}(${days[now.getDay()]})`;
};

export default function DailyTaskReport() {
  const { currentUser } = useAuth();

  // --- Open Report State ---
  const [openDate, setOpenDate] = useState(() => getActiveBusinessDateLabel());
  const [openWriter, setOpenWriter] = useState(() => currentUser?.name || '');
  const [openNight, setOpenNight] = useState('');
  const [openDelivery, setOpenDelivery] = useState('');
  const [openTotal, setOpenTotal] = useState('');

  const [openAttNormal, setOpenAttNormal] = useState(true);
  const [openAttCount, setOpenAttCount] = useState('');
  const [openAttReason, setOpenAttReason] = useState('');
  const [openAttNote, setOpenAttNote] = useState(true);
  const [openAttNoteText, setOpenAttNoteText] = useState('');

  const [openTaskPlan, setOpenTaskPlan] = useState('');
  const [openHygieneNote, setOpenHygieneNote] = useState('');

  const [openIssueNone, setOpenIssueNone] = useState(true);
  const [openIssueText, setOpenIssueText] = useState('');

  const [openFacilityNone, setOpenFacilityNone] = useState(true);
  const [openFacilityText, setOpenFacilityText] = useState('');
  const [openFacility2None, setOpenFacility2None] = useState(true);
  const [openFacility2Text, setOpenFacility2Text] = useState('');

  const [openEtc, setOpenEtc] = useState('');

  // --- Close Report State ---
  const [closeDate, setCloseDate] = useState(() => getActiveBusinessDateLabel());
  const [closeWriter, setCloseWriter] = useState(() => currentUser?.name || '');
  const [closeLunch, setCloseLunch] = useState('');
  const [closeDayDelivery, setCloseDayDelivery] = useState('');
  const [closeDayTotal, setCloseDayTotal] = useState('');

  const [closeAttNormal, setCloseAttNormal] = useState(true);
  const [closeAttCount, setCloseAttCount] = useState('');
  const [closeAttReason, setCloseAttReason] = useState('');
  const [closeHandoverOk, setCloseHandoverOk] = useState(true);
  const [closeHandoverText, setCloseHandoverText] = useState('');

  const [closeTaskOk, setCloseTaskOk] = useState(true);
  const [closeTaskText, setCloseTaskText] = useState('');

  const [closeHygieneNote, setCloseHygieneNote] = useState('');

  const [closeNoteText, setCloseNoteText] = useState('');

  const [closeRequest, setCloseRequest] = useState('');

  // --- Modal & Toast State ---
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const openSectionRef = useRef<HTMLDivElement>(null);
  const closeSectionRef = useRef<HTMLDivElement>(null);

  // Restore from localStorage
  useEffect(() => {
    try {
      const activeLabel = getActiveBusinessDateLabel();
      setOpenDate(activeLabel);
      setCloseDate(activeLabel);

      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.openDate) setOpenDate(data.openDate);
        if (data.openWriter) setOpenWriter(data.openWriter);
        if (data.openNight) setOpenNight(data.openNight);
        if (data.openDelivery) setOpenDelivery(data.openDelivery);
        if (data.openTotal) setOpenTotal(data.openTotal);

        if (data.openAttNormal !== undefined) setOpenAttNormal(data.openAttNormal);
        if (data.openAttCount) setOpenAttCount(data.openAttCount);
        if (data.openAttReason) setOpenAttReason(data.openAttReason);
        if (data.openAttNote !== undefined) setOpenAttNote(data.openAttNote);
        if (data.openAttNoteText) setOpenAttNoteText(data.openAttNoteText);

        if (data.openTaskPlan) setOpenTaskPlan(data.openTaskPlan);
        else if (data.openBoneNote || data.openBanchanNote || data.openExtraNote) {
          const parts = [
            data.openBoneNote ? `뼈작업: ${data.openBoneNote}` : '',
            data.openBanchanNote ? `부재료: ${data.openBanchanNote}` : '',
            data.openExtraNote ? `포션작업: ${data.openExtraNote}` : ''
          ].filter(Boolean);
          setOpenTaskPlan(parts.join(' / '));
        }

        if (data.openHygieneNote) setOpenHygieneNote(data.openHygieneNote);

        if (data.openIssueNone !== undefined) setOpenIssueNone(data.openIssueNone);
        if (data.openIssueText) setOpenIssueText(data.openIssueText);

        if (data.openFacilityNone !== undefined) setOpenFacilityNone(data.openFacilityNone);
        if (data.openFacilityText) setOpenFacilityText(data.openFacilityText);
        if (data.openFacility2None !== undefined) setOpenFacility2None(data.openFacility2None);
        if (data.openFacility2Text) setOpenFacility2Text(data.openFacility2Text);

        if (data.openEtc) setOpenEtc(data.openEtc);

        if (data.closeDate) setCloseDate(data.closeDate);
        if (data.closeWriter) setCloseWriter(data.closeWriter);
        if (data.closeLunch) setCloseLunch(data.closeLunch);
        if (data.closeDayDelivery) setCloseDayDelivery(data.closeDayDelivery);
        if (data.closeDayTotal) setCloseDayTotal(data.closeDayTotal);

        if (data.closeAttNormal !== undefined) setCloseAttNormal(data.closeAttNormal);
        if (data.closeAttCount) setCloseAttCount(data.closeAttCount);
        if (data.closeAttReason) setCloseAttReason(data.closeAttReason);
        if (data.closeHandoverOk !== undefined) setCloseHandoverOk(data.closeHandoverOk);
        if (data.closeHandoverText) setCloseHandoverText(data.closeHandoverText);

        if (data.closeTaskOk !== undefined) setCloseTaskOk(data.closeTaskOk);
        if (data.closeTaskText) setCloseTaskText(data.closeTaskText);

        if (data.closeHygieneNote) setCloseHygieneNote(data.closeHygieneNote);
        if (data.closeNoteText) setCloseNoteText(data.closeNoteText);
        if (data.closeRequest) setCloseRequest(data.closeRequest);
      }
    } catch (e) {
      console.warn('Failed to load draft:', e);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.name) {
      setOpenWriter(prev => prev ? prev : currentUser.name);
      setCloseWriter(prev => prev ? prev : currentUser.name);
    }
  }, [currentUser]);

  // Save to localStorage
  const saveDraft = () => {
    try {
      const data = {
        openDate, openWriter, openNight, openDelivery, openTotal,
        openAttNormal, openAttCount, openAttReason, openAttNote, openAttNoteText,
        openTaskPlan, openHygieneNote,
        openIssueNone, openIssueText, openFacilityNone, openFacilityText,
        openFacility2None, openFacility2Text, openEtc,
        closeDate, closeWriter, closeLunch, closeDayDelivery, closeDayTotal,
        closeAttNormal, closeAttCount, closeAttReason, closeHandoverOk, closeHandoverText,
        closeTaskOk, closeTaskText, closeHygieneNote, closeNoteText, closeRequest
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save draft:', e);
    }
  };

  useEffect(() => {
    saveDraft();
  }, [
    openDate, openWriter, openNight, openDelivery, openTotal,
    openAttNormal, openAttCount, openAttReason, openAttNote, openAttNoteText,
    openTaskPlan, openHygieneNote,
    openIssueNone, openIssueText, openFacilityNone, openFacilityText,
    openFacility2None, openFacility2Text, openEtc,
    closeDate, closeWriter, closeLunch, closeDayDelivery, closeDayTotal,
    closeAttNormal, closeAttCount, closeAttReason, closeHandoverOk, closeHandoverText,
    closeTaskOk, closeTaskText, closeHygieneNote, closeNoteText, closeRequest
  ]);

  // Reset Handlers
  const handleResetOpen = () => {
    setOpenDate(getActiveBusinessDateLabel());
    setOpenWriter(currentUser?.name || '');
    setOpenNight('');
    setOpenDelivery('');
    setOpenTotal('');
    setOpenAttNormal(true);
    setOpenAttCount('');
    setOpenAttReason('');
    setOpenAttNote(true);
    setOpenAttNoteText('');
    setOpenTaskPlan('');
    setOpenHygieneNote('');
    setOpenIssueNone(true);
    setOpenIssueText('');
    setOpenFacilityNone(true);
    setOpenFacilityText('');
    setOpenFacility2None(true);
    setOpenFacility2Text('');
    setOpenEtc('');
    setToastMessage('오픈보고 작성 내용이 초기화되었습니다.');
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleResetClose = () => {
    setCloseDate(getActiveBusinessDateLabel());
    setCloseWriter(currentUser?.name || '');
    setCloseLunch('');
    setCloseDayDelivery('');
    setCloseDayTotal('');
    setCloseAttNormal(true);
    setCloseAttCount('');
    setCloseAttReason('');
    setCloseHandoverOk(true);
    setCloseHandoverText('');
    setCloseTaskOk(true);
    setCloseTaskText('');
    setCloseHygieneNote('');
    setCloseNoteText('');
    setCloseRequest('');
    setToastMessage('마감보고 작성 내용이 초기화되었습니다.');
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Build Report Strings
  const buildOpenReportText = () => {
    const lines: string[] = [];
    lines.push(`[뼈반집 부평본점 오픈보고] ${openDate || getTodayLabel()}${openWriter ? ` / 작성자 ${openWriter}` : ''}`);
    lines.push('');
    lines.push('1. 전일 실적');
    lines.push(`야간매출 ${openNight || '-'}만원 / 야간배달 ${openDelivery || '-'}만원 / 총합매출 ${openTotal || '-'}만원`);
    lines.push('');
    lines.push('2. 팀원·근태');
    if (openAttNormal) {
      lines.push('전원 정상출근');
    } else {
      lines.push(`결근/조퇴 ${openAttCount || '-'}명 (사유: ${openAttReason || '-'})`);
    }
    if (!openAttNote) {
      lines.push(`특이사항: ${openAttNoteText || '-'}`);
    }
    lines.push('');
    lines.push('3. 금일 작업 계획');
    lines.push(openTaskPlan || '-');
    lines.push('');
    lines.push('4. 재료상태 (겉절이 , 우거지 기타)');
    lines.push(openHygieneNote || '-');
    lines.push('');
    lines.push('5. 이슈·사고');
    lines.push(openIssueNone ? '없음' : (openIssueText || '있음 (내용 미기재)'));
    lines.push('');
    lines.push('6. 설비·에너지');
    lines.push(`에너지: ${openFacilityNone ? '특이사항 없음' : (openFacilityText || '특이사항 있음')}`);
    lines.push(`설비: ${openFacility2None ? '특이사항 없음' : (openFacility2Text || '특이사항 있음')}`);
    if (openEtc) {
      lines.push('');
      lines.push('7. 금일 방향성 및 기타 특이사항');
      lines.push(openEtc);
    }
    return lines.join('\n');
  };

  const buildCloseReportText = () => {
    const lines: string[] = [];
    lines.push(`[뼈반집 부평본점 마감보고] ${closeDate || getTodayLabel()}${closeWriter ? ` / 작성자 ${closeWriter}` : ''}`);
    lines.push('');
    lines.push('1. 주간 실적');
    lines.push(`점심매출 ${closeLunch || '-'}만원 / 주간배달 ${closeDayDelivery || '-'}만원 / 주간매출 ${closeDayTotal || '-'}만원`);
    lines.push('');
    lines.push('2. 마감 및 인수인계');
    if (closeAttNormal) {
      lines.push('전원 정상출근');
    } else {
      lines.push(`결근/조퇴 ${closeAttCount || '-'}명 (사유: ${closeAttReason || '-'})`);
    }
    if (!closeHandoverOk) {
      lines.push(`인수인계 특이사항: ${closeHandoverText || '-'}`);
    }
    lines.push('');
    lines.push('3. 금일 작업 특이사항');
    lines.push(closeTaskOk ? '계획한 작업 모두 완료' : (closeTaskText || '미완료 작업 있음 (내용 미기재)'));
    lines.push('');
    lines.push('4. 재료상태 (겉절이 , 우거지 기타)');
    lines.push(closeHygieneNote || '-');
    lines.push('');
    lines.push('5. 금일 방향성에 결과 및 특이사항');
    lines.push(closeNoteText || '-');
    if (closeRequest) {
      lines.push('');
      lines.push('6. 요청사항');
      lines.push(closeRequest);
    }
    return lines.join('\n');
  };

  const openPreviewModal = (title: string, content: string) => {
    setModalTitle(title);
    setModalContent(content);
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

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Status Chip Calculations
  const isOpenAttendanceOk = openAttNormal && openAttNote;
  const isOpenIssueOk = openIssueNone;
  const isOpenFacilityOk = openFacilityNone && openFacility2None;

  const isCloseHandoverOk = closeAttNormal && closeHandoverOk;
  const isCloseTaskStatusOk = closeTaskOk;

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-500 pb-16">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-rose-100/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-md shadow-rose-200">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider text-rose-600 uppercase">Daily Reports</span>
              <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">뼈반집 부평본점 일일보고</h2>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">오픈보고와 마감보고를 한 페이지에서 신속하게 작성합니다.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollToSection(openSectionRef)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60 flex items-center gap-1.5 transition-all"
            >
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              오픈보고로 이동
            </button>
            <button
              onClick={() => scrollToSection(closeSectionRef)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200/60 flex items-center gap-1.5 transition-all"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
              마감보고로 이동
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. 오픈보고 섹션 */}
      {/* ========================================================================= */}
      <div ref={openSectionRef} className="space-y-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
            <Sun className="w-4 h-4" />
          </div>
          <h3 className="text-base md:text-lg font-black text-gray-800">오픈보고</h3>
          <div className="h-px bg-gray-200 flex-1 ml-2" />
        </div>

        {/* Date & Writer Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
            <label className="block text-[11px] font-bold text-gray-500 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-rose-500" /> 날짜
            </label>
            <input
              type="text"
              value={openDate}
              onChange={(e) => setOpenDate(e.target.value)}
              placeholder="예: 8.25(화)"
              className="w-full bg-gray-50/60 border border-gray-200/90 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
            />
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
            <label className="block text-[11px] font-bold text-gray-500 mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-rose-500" /> 작성자
            </label>
            <input
              type="text"
              value={openWriter}
              onChange={(e) => setOpenWriter(e.target.value)}
              placeholder="작성자 이름"
              className="w-full bg-gray-50/60 border border-gray-200/90 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* 01. 전일 실적 */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md">01</span>
            <h4 className="text-xs md:text-sm font-bold text-gray-800">전일 실적</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">야간매출</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={openNight}
                  onChange={(e) => setOpenNight(e.target.value)}
                  placeholder="0"
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl pl-3 pr-10 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-medium">만원</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">야간배달</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={openDelivery}
                  onChange={(e) => setOpenDelivery(e.target.value)}
                  placeholder="0"
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl pl-3 pr-10 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-medium">만원</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">총합매출</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={openTotal}
                  onChange={(e) => setOpenTotal(e.target.value)}
                  placeholder="0"
                  className="w-full bg-rose-50/40 border border-rose-200/80 rounded-xl pl-3 pr-10 py-2 text-xs font-black text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-rose-500 font-bold">만원</span>
              </div>
            </div>
          </div>
        </div>

        {/* 02. 팀원·근태 */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md">02</span>
              <h4 className="text-xs md:text-sm font-bold text-gray-800">팀원·근태</h4>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              isOpenAttendanceOk ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'
            }`}>
              {isOpenAttendanceOk ? '이상없음' : '확인필요'}
            </span>
          </div>

          <div className="space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={openAttNormal}
                onChange={(e) => setOpenAttNormal(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-400 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-700">전원 정상출근</span>
            </label>

            {!openAttNormal && (
              <div className="pl-6 pt-1 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500">결근/조퇴</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={openAttCount}
                    onChange={(e) => setOpenAttCount(e.target.value)}
                    placeholder="0"
                    className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                  <span className="text-xs text-gray-500">명 · 사유</span>
                  <input
                    type="text"
                    value={openAttReason}
                    onChange={(e) => setOpenAttReason(e.target.value)}
                    placeholder="예: 이모님 개인사정 조퇴"
                    className="flex-1 min-w-[140px] bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={openAttNote}
                onChange={(e) => setOpenAttNote(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-400 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-700">근태 특이사항 없음 (휴무 교체 등)</span>
            </label>

            {!openAttNote && (
              <div className="pl-6 pt-1 animate-in fade-in">
                <textarea
                  value={openAttNoteText}
                  onChange={(e) => setOpenAttNoteText(e.target.value)}
                  placeholder="예: 화/수 휴무 OOO ↔ OOO 교체"
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* 03. 금일 작업 계획 */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md">03</span>
            <h4 className="text-xs md:text-sm font-bold text-gray-800">금일 작업 계획</h4>
          </div>
          <textarea
            value={openTaskPlan}
            onChange={(e) => setOpenTaskPlan(e.target.value)}
            placeholder="금일 작업 계획을 입력해주세요 (예: 뼈작업 예상량, 부재료 준비, 추가 포션 등)"
            rows={3}
            className="w-full bg-gray-50/70 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white resize-none"
          />
        </div>

        {/* 04. 재료상태 (겉절이 , 우거지 기타) */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md">04</span>
            <h4 className="text-xs md:text-sm font-bold text-gray-800">재료상태 (겉절이 , 우거지 기타)</h4>
          </div>
          <textarea
            value={openHygieneNote}
            onChange={(e) => setOpenHygieneNote(e.target.value)}
            placeholder="예 : 겉절이 상태 , 우거지 질김정도 , 기타 등등"
            rows={2}
            className="w-full bg-gray-50/70 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white resize-none"
          />
        </div>

        {/* 05. 이슈·사고 */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md">05</span>
              <h4 className="text-xs md:text-sm font-bold text-gray-800">이슈·사고</h4>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              isOpenIssueOk ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
            }`}>
              {isOpenIssueOk ? '없음' : '있음'}
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={openIssueNone}
              onChange={(e) => setOpenIssueNone(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-400 cursor-pointer"
            />
            <span className="text-xs font-semibold text-gray-700">전일 이슈·사고 없음</span>
          </label>

          {!openIssueNone && (
            <div className="pl-6 pt-1 animate-in fade-in">
              <textarea
                value={openIssueText}
                onChange={(e) => setOpenIssueText(e.target.value)}
                placeholder="내용 + 원인 + 조치사항&#10;예: 야간 배달실수 — 빌지 미확인 → 포장 시 전표 재확인 절차 공유"
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
              />
            </div>
          )}
        </div>

        {/* 06. 설비·에너지 */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md">06</span>
              <h4 className="text-xs md:text-sm font-bold text-gray-800">설비·에너지</h4>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              isOpenFacilityOk ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'
            }`}>
              {isOpenFacilityOk ? '특이사항 없음' : '특이사항 있음'}
            </span>
          </div>

          <div className="space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={openFacilityNone}
                onChange={(e) => setOpenFacilityNone(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-400 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-700">에너지 특이사항 없음</span>
            </label>

            {!openFacilityNone && (
              <div className="pl-6 pt-1 animate-in fade-in">
                <textarea
                  value={openFacilityText}
                  onChange={(e) => setOpenFacilityText(e.target.value)}
                  placeholder="예: 오늘 폭염 예상, 홀 10~15시 풀가동 후 조정"
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white resize-none"
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={openFacility2None}
                onChange={(e) => setOpenFacility2None(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-400 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-700">설비 특이사항 없음</span>
            </label>

            {!openFacility2None && (
              <div className="pl-6 pt-1 animate-in fade-in">
                <textarea
                  value={openFacility2Text}
                  onChange={(e) => setOpenFacility2Text(e.target.value)}
                  placeholder="예: 냉장고 소음, 후드 고장 등 수리 필요 사항"
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* 07. 금일 방향성 및 기타 특이사항 */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md">07</span>
            <h4 className="text-xs md:text-sm font-bold text-gray-800">금일 방향성 및 기타 특이사항</h4>
          </div>
          <textarea
            value={openEtc}
            onChange={(e) => setOpenEtc(e.target.value)}
            placeholder="날씨가 선선해 고객 유입이 많을것으로 예상됩니다. 고객 서비스에 유념하겠습니다. (예상답변)"
            rows={2}
            className="w-full bg-gray-50/70 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white resize-none"
          />
        </div>

        {/* Open Report Actions */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            onClick={() => openPreviewModal('오픈보고 카톡문 미리보기', buildOpenReportText())}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-200 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>오픈보고</span>
          </button>
          <button
            onClick={handleResetOpen}
            className="px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
            <span>초기화</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 마감보고 섹션 */}
      {/* ========================================================================= */}
      <div ref={closeSectionRef} className="space-y-4 pt-6">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
            <Moon className="w-4 h-4" />
          </div>
          <h3 className="text-base md:text-lg font-black text-gray-800">마감보고</h3>
          <div className="h-px bg-gray-200 flex-1 ml-2" />
        </div>

        {/* Date & Writer Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
            <label className="block text-[11px] font-bold text-gray-500 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-500" /> 날짜
            </label>
            <input
              type="text"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              placeholder="예: 8.26(수)"
              className="w-full bg-gray-50/60 border border-gray-200/90 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
            />
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
            <label className="block text-[11px] font-bold text-gray-500 mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-indigo-500" /> 작성자
            </label>
            <input
              type="text"
              value={closeWriter}
              onChange={(e) => setCloseWriter(e.target.value)}
              placeholder="작성자 이름"
              className="w-full bg-gray-50/60 border border-gray-200/90 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* 01. 주간 실적 */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">01</span>
            <h4 className="text-xs md:text-sm font-bold text-gray-800">주간 실적</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">점심매출</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={closeLunch}
                  onChange={(e) => setCloseLunch(e.target.value)}
                  placeholder="0"
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl pl-3 pr-10 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-medium">만원</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">주간배달</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={closeDayDelivery}
                  onChange={(e) => setCloseDayDelivery(e.target.value)}
                  placeholder="0"
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-xl pl-3 pr-10 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-medium">만원</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">주간매출</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={closeDayTotal}
                  onChange={(e) => setCloseDayTotal(e.target.value)}
                  placeholder="0"
                  className="w-full bg-indigo-50/40 border border-indigo-200/80 rounded-xl pl-3 pr-10 py-2 text-xs font-black text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-indigo-500 font-bold">만원</span>
              </div>
            </div>
          </div>
        </div>

        {/* 02. 마감 및 인수인계 */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">02</span>
              <h4 className="text-xs md:text-sm font-bold text-gray-800">마감 및 인수인계</h4>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              isCloseHandoverOk ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'
            }`}>
              {isCloseHandoverOk ? '이상없음' : '확인필요'}
            </span>
          </div>

          <div className="space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={closeAttNormal}
                onChange={(e) => setCloseAttNormal(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-700">전원 정상출근</span>
            </label>

            {!closeAttNormal && (
              <div className="pl-6 pt-1 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500">결근/조퇴</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={closeAttCount}
                    onChange={(e) => setCloseAttCount(e.target.value)}
                    placeholder="0"
                    className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <span className="text-xs text-gray-500">명 · 사유</span>
                  <input
                    type="text"
                    value={closeAttReason}
                    onChange={(e) => setCloseAttReason(e.target.value)}
                    placeholder="예: 이모님 개인사정 조퇴"
                    className="flex-1 min-w-[140px] bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={closeHandoverOk}
                onChange={(e) => setCloseHandoverOk(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-700">인수인계 및 특이사항 없음</span>
            </label>

            {!closeHandoverOk && (
              <div className="pl-6 pt-1 animate-in fade-in">
                <textarea
                  value={closeHandoverText}
                  onChange={(e) => setCloseHandoverText(e.target.value)}
                  placeholder="인계 시 확인이 필요한 내용"
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* 03. 금일 작업 특이사항 */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">03</span>
              <h4 className="text-xs md:text-sm font-bold text-gray-800">금일 작업 특이사항</h4>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              isCloseTaskStatusOk ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'
            }`}>
              {isCloseTaskStatusOk ? '완료' : '미완료 있음'}
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={closeTaskOk}
              onChange={(e) => setCloseTaskOk(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400 cursor-pointer"
            />
            <span className="text-xs font-semibold text-gray-700">계획한 작업 모두 완료</span>
          </label>

          {!closeTaskOk && (
            <div className="pl-6 pt-1 animate-in fade-in">
              <textarea
                value={closeTaskText}
                onChange={(e) => setCloseTaskText(e.target.value)}
                placeholder="미완료 작업 + 사유 + 야간 인계 내용&#10;예: 저녁 매출 높아 내장탕 포션 못함 → 야간 인계, 우거지 삶기 추가"
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white"
              />
            </div>
          )}
        </div>

        {/* 04. 재료상태 (겉절이 , 우거지 기타) */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">04</span>
            <h4 className="text-xs md:text-sm font-bold text-gray-800">재료상태 (겉절이 , 우거지 기타)</h4>
          </div>
          <textarea
            value={closeHygieneNote}
            onChange={(e) => setCloseHygieneNote(e.target.value)}
            placeholder="예 : 겉절이 상태 , 우거지 질김정도 , 기타 등등"
            rows={2}
            className="w-full bg-gray-50/70 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white resize-none"
          />
        </div>

        {/* 05. 금일 방향성에 결과 및 특이사항 */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">05</span>
            <h4 className="text-xs md:text-sm font-bold text-gray-800">금일 방향성에 결과 및 특이사항</h4>
          </div>
          <textarea
            value={closeNoteText}
            onChange={(e) => setCloseNoteText(e.target.value)}
            placeholder={"하루 예측 방향성에 대한 고찰 및 의견\n예 : 홀 싱크대 청소 못함(점심 매출 바빠서) -> 금주 내 완료"}
            rows={3}
            className="w-full bg-gray-50/70 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white resize-none"
          />
        </div>

        {/* 06. 요청사항 */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">06</span>
            <h4 className="text-xs md:text-sm font-bold text-gray-800">요청사항</h4>
          </div>
          <textarea
            value={closeRequest}
            onChange={(e) => setCloseRequest(e.target.value)}
            placeholder="포장용기, 수세미, 라면 등 필요한 소모품이나 전달할 내용"
            rows={2}
            className="w-full bg-gray-50/70 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white resize-none"
          />
        </div>

        {/* Close Report Actions */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            onClick={() => openPreviewModal('마감보고 카톡문 미리보기', buildCloseReportText())}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>마감보고</span>
          </button>
          <button
            onClick={handleResetClose}
            className="px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
            <span>초기화</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 미리보기 & 카톡 복사 모달 */}
      {/* ========================================================================= */}
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
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  닫기
                </button>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 flex items-center gap-1.5 transition-all active:scale-95"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? '복사완료' : '카톡문 복사하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900/90 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50 animate-in fade-in slide-in-from-bottom-3 backdrop-blur-xs flex items-center gap-2">
          <RotateCcw className="w-3.5 h-3.5 text-rose-400 animate-spin" style={{ animationDuration: '0.6s', animationIterationCount: 1 }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
