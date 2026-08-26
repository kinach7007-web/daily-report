import React, { useState } from 'react';
import { DailyReportRecord } from '../types';
import { 
  X, 
  TrendingUp, 
  Gift, 
  Star, 
  CheckSquare, 
  Calendar, 
  User, 
  Clock, 
  Copy, 
  Check, 
  Printer, 
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  MessageSquare
} from 'lucide-react';

interface DailyReportViewerProps {
  report: DailyReportRecord;
  onClose: () => void;
}

export default function DailyReportViewer({ report, onClose }: DailyReportViewerProps) {
  const [copied, setCopied] = useState(false);

  const parseNum = (v: any) => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    const clean = String(v).replace(/[^0-9.-]+/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
  };

  // Sales data
  const lunchAmt = parseNum(report.sales?.lunch?.amount);
  const lunchCnt = parseNum(report.sales?.lunch?.count);
  
  const rawDinnerAmt = parseNum(report.sales?.dinner?.amount);
  const rawDinnerCnt = parseNum(report.sales?.dinner?.count);
  const netDinnerAmt = report.sales?.netDinnerAmount !== undefined 
    ? report.sales.netDinnerAmount 
    : Math.max(0, rawDinnerAmt - lunchAmt);
  const netDinnerCnt = report.sales?.netDinnerCount !== undefined
    ? report.sales.netDinnerCount
    : Math.max(0, rawDinnerCnt - lunchCnt);

  const rawNightAmt = parseNum(report.sales?.night?.amount);
  const rawNightCnt = parseNum(report.sales?.night?.count);
  const netNightAmt = report.sales?.netNightAmount !== undefined
    ? report.sales.netNightAmount
    : Math.max(0, rawNightAmt - rawDinnerAmt);
  const netNightCnt = report.sales?.netNightCount !== undefined
    ? report.sales.netNightCount
    : Math.max(0, rawNightCnt - rawDinnerCnt);

  const totalAmount = report.sales?.totalAmount || (lunchAmt + netDinnerAmt + netNightAmt);
  const totalCount = report.sales?.totalCount || (lunchCnt + netDinnerCnt + netNightCnt);
  const avgTicket = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;

  // Discounts data
  const mktAmt = parseNum(report.discount?.marketing?.amount);
  const mktCnt = parseNum(report.discount?.marketing?.count);
  const evtAmt = parseNum(report.discount?.event?.amount);
  const evtCnt = parseNum(report.discount?.event?.count);
  const othAmt = parseNum(report.discount?.other?.amount);
  const othCnt = parseNum(report.discount?.other?.count);
  const totalDiscAmt = mktAmt + evtAmt + othAmt;
  const totalDiscCnt = mktCnt + evtCnt + othCnt;

  // Reviews data
  const revKindness = parseNum(report.reviews?.kindness?.count);
  const revDelicious = parseNum(report.reviews?.delicious?.count);
  const revNormal = parseNum(report.reviews?.normal?.count);
  const revUncomfortable = parseNum(report.reviews?.uncomfortable?.count);
  const totalReviews = report.reviews?.totalReviews !== undefined 
    ? report.reviews.totalReviews 
    : (revKindness + revDelicious + revNormal + revUncomfortable);

  const revDetails = report.reviews?.details || {
    service: '0',
    facility: '0',
    food: '0',
    other: '0',
    note: ''
  };

  // Day of week calculation
  const getDayOfWeek = (dateStr: string) => {
    if (report.dayOfWeek) return report.dayOfWeek;
    try {
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const d = new Date(dateStr + 'T00:00:00');
      return days[d.getDay()] || '';
    } catch {
      return '';
    }
  };

  const dayOfWeekStr = getDayOfWeek(report.date);

  // Copy structured text summary for KakaoTalk / Messenger
  const handleCopySummary = () => {
    const text = `📋 [뼈반집 일일 영업 리포트]
📅 영업일자: ${report.date} (${dayOfWeekStr}요일)
👤 작성자: ${report.writer || '영업담당자'}

━━━━━━━━━━━━━━━━━━━
💰 [1. 매출 현황]
• 총 매출액: ${totalAmount.toLocaleString()}원 (${totalCount.toLocaleString()}건)
• 평균 객단가: ${avgTicket.toLocaleString()}원
• 점심(15:00): ${lunchAmt.toLocaleString()}원 / ${lunchCnt}건
• 저녁(22:00): ${netDinnerAmt.toLocaleString()}원 / ${netDinnerCnt}건
• 야간(10:00): ${netNightAmt.toLocaleString()}원 / ${netNightCnt}건

━━━━━━━━━━━━━━━━━━━
🎁 [2. 할인 및 서비스 현황]
• 총 서비스 금액: ${totalDiscAmt.toLocaleString()}원 (${totalDiscCnt}건)
• 마케팅: ${mktAmt.toLocaleString()}원 (${mktCnt}건)
• 이벤트: ${evtAmt.toLocaleString()}원 (${evtCnt}건)
• 기타: ${othAmt.toLocaleString()}원 (${othCnt}건)
${report.discount?.other?.note ? `• 특이사항: ${report.discount.other.note}` : ''}

━━━━━━━━━━━━━━━━━━━
⭐ [3. 리뷰 관리]
• 총 리뷰: ${totalReviews}건
• 친절: ${revKindness}건 | 맛있음: ${revDelicious}건 | 보통: ${revNormal}건 | 불편: ${revUncomfortable}건
${revUncomfortable > 0 ? `• 불편 상세: 서비스 ${revDetails.service}건, 매장시설 ${revDetails.facility}건, 음식 ${revDetails.food}건, 기타 ${revDetails.other}건` : ''}
${revDetails.note ? `• 대책 및 개선: ${revDetails.note}` : ''}

━━━━━━━━━━━━━━━━━━━
❄️ [4. 냉장고 온도 체크]
• 주방1: ${report.fridgeTemps?.kitchen1 || '-'}°C | 주방2: ${report.fridgeTemps?.kitchen2 || '-'}°C
• 홀1: ${report.fridgeTemps?.hall1 || '-'}°C | 홀2: ${report.fridgeTemps?.hall2 || '-'}°C
• 음료: ${report.fridgeTemps?.drink || '-'}°C | 주류: ${report.fridgeTemps?.alcohol || '-'}°C
• 창고1: ${report.fridgeTemps?.storage1 || '-'}°C | 창고2: ${report.fridgeTemps?.storage2 || '-'}°C
`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 md:p-6 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-rose-400 font-black shadow-inner">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-rose-500 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
                  영업 일보 리포트
                </span>
                <span className="text-gray-300 text-xs font-semibold">
                  {report.date} ({dayOfWeekStr})
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-white mt-0.5 tracking-tight">
                {report.date} 일일 영업 결산 보고서
              </h2>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-xs font-bold text-gray-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title="리포트 텍스트 복사 (카톡 공유용)"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? '복사 완료!' : '요약 복사'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-gray-200 hover:text-white transition-colors cursor-pointer"
              title="인쇄"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-rose-500/80 rounded-xl text-gray-300 hover:text-white transition-all cursor-pointer"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info Meta Strip */}
        <div className="bg-gray-50 border-b border-gray-200/80 px-6 py-2.5 flex flex-wrap items-center justify-between text-xs text-gray-600 gap-3 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-medium">
              <User className="w-3.5 h-3.5 text-gray-400" />
              작성자: <strong className="text-gray-900">{report.writer || '영업담당자'}</strong>
            </span>
            {report.savedAt && (
              <span className="flex items-center gap-1 font-medium text-gray-500">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                저장일시: {report.savedAt}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
              <ShieldCheck className="w-3 h-3" />
              마감 데이터 확정
            </span>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/50">
          
          {/* Top KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-2xs">
              <span className="text-[11px] font-bold text-blue-600 block mb-1">총 영업 매출액</span>
              <div className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                {totalAmount.toLocaleString()}<span className="text-sm font-bold text-gray-500 ml-0.5">원</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-2xs">
              <span className="text-[11px] font-bold text-indigo-600 block mb-1">총 결제 건수 (고객수)</span>
              <div className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                {totalCount.toLocaleString()}<span className="text-sm font-bold text-gray-500 ml-0.5">건</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-600 block mb-1">평균 객단가</span>
              <div className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                {avgTicket.toLocaleString()}<span className="text-sm font-bold text-gray-500 ml-0.5">원</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-600 block mb-1">할인/서비스 총액</span>
              <div className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                {totalDiscAmt.toLocaleString()}<span className="text-sm font-bold text-gray-500 ml-0.5">원</span>
              </div>
            </div>
          </div>

          {/* Section 1: 매출 현황 (Sales Table) */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm md:text-base">1. 시간대별 매출 상세 실적</h3>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 text-[11px]">
                  <tr>
                    <th className="px-4 py-3">시간대 구분</th>
                    <th className="px-4 py-3 text-right">실적 매출액</th>
                    <th className="px-4 py-3 text-right">실적 건수</th>
                    <th className="px-4 py-3 text-right">매출 비중</th>
                    <th className="px-4 py-3 text-right">시간대 객단가</th>
                    <th className="px-4 py-3 text-right text-gray-400">누적 입력값</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  <tr>
                    <td className="px-4 py-3 font-bold text-amber-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      점심 매출 (15:00)
                    </td>
                    <td className="px-4 py-3 text-right font-black text-gray-900">
                      {lunchAmt.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">
                      {lunchCnt}건
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {totalAmount > 0 ? ((lunchAmt / totalAmount) * 100).toFixed(1) + '%' : '0%'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {lunchCnt > 0 ? Math.round(lunchAmt / lunchCnt).toLocaleString() + '원' : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {report.sales?.lunch?.amount || '0'}원 / {report.sales?.lunch?.count || '0'}건
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-3 font-bold text-indigo-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      저녁 매출 (22:00)
                    </td>
                    <td className="px-4 py-3 text-right font-black text-gray-900">
                      {netDinnerAmt.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">
                      {netDinnerCnt}건
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {totalAmount > 0 ? ((netDinnerAmt / totalAmount) * 100).toFixed(1) + '%' : '0%'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {netDinnerCnt > 0 ? Math.round(netDinnerAmt / netDinnerCnt).toLocaleString() + '원' : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {report.sales?.dinner?.amount || '0'}원 / {report.sales?.dinner?.count || '0'}건
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-3 font-bold text-purple-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      야간 매출 (10:00)
                    </td>
                    <td className="px-4 py-3 text-right font-black text-gray-900">
                      {netNightAmt.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">
                      {netNightCnt}건
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {totalAmount > 0 ? ((netNightAmt / totalAmount) * 100).toFixed(1) + '%' : '0%'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {netNightCnt > 0 ? Math.round(netNightAmt / netNightCnt).toLocaleString() + '원' : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {report.sales?.night?.amount || '0'}원 / {report.sales?.night?.count || '0'}건
                    </td>
                  </tr>

                  <tr className="bg-gray-50/80 font-black text-gray-900 border-t-2 border-gray-200">
                    <td className="px-4 py-3 text-indigo-900">
                      일일 총 합계
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 text-sm font-black">
                      {totalAmount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-black">
                      {totalCount}건
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      100.0%
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700 font-bold">
                      {avgTicket.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-[11px]">
                      최종마감 합계
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: 할인 및 서비스 현황 (Discounts) */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Gift className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm md:text-base">2. 할인 및 서비스 지원 내역</h3>
              </div>
              <div className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-xl border border-rose-100">
                총 서비스 금액: {totalDiscAmt.toLocaleString()}원 ({totalDiscCnt}건)
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-emerald-700 block mb-1">
                  마케팅 (블로거/인플루언서)
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-black text-gray-900">{mktAmt.toLocaleString()}원</span>
                  <span className="text-xs font-bold text-gray-500">{mktCnt}건</span>
                </div>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-blue-700 block mb-1">
                  이벤트 서비스
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-black text-gray-900">{evtAmt.toLocaleString()}원</span>
                  <span className="text-xs font-bold text-gray-500">{evtCnt}건</span>
                </div>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-purple-700 block mb-1">
                  기타 서비스
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-black text-gray-900">{othAmt.toLocaleString()}원</span>
                  <span className="text-xs font-bold text-gray-500">{othCnt}건</span>
                </div>
              </div>
            </div>

            {report.discount?.other?.note && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs">
                <span className="font-bold text-amber-800 block mb-1">서비스 관련 특이사항:</span>
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{report.discount.other.note}</p>
              </div>
            )}
          </div>

          {/* Section 3: 리뷰 관리 (Reviews) */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-yellow-50 text-yellow-600 rounded-lg">
                  <Star className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm md:text-base">3. 고객 리뷰 및 만족도</h3>
              </div>
              <div className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                총 리뷰 수: {totalReviews}건
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-center">
                <span className="text-[11px] font-bold text-emerald-800 block mb-0.5">친절</span>
                <span className="text-xl font-black text-emerald-700">{revKindness}</span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">
                  {totalReviews > 0 ? ((revKindness / totalReviews) * 100).toFixed(0) + '%' : '0%'}
                </span>
              </div>

              <div className="p-3 bg-orange-50/70 border border-orange-200/80 rounded-xl text-center">
                <span className="text-[11px] font-bold text-orange-800 block mb-0.5">맛있음</span>
                <span className="text-xl font-black text-orange-700">{revDelicious}</span>
                <span className="text-[10px] text-orange-600 block mt-0.5">
                  {totalReviews > 0 ? ((revDelicious / totalReviews) * 100).toFixed(0) + '%' : '0%'}
                </span>
              </div>

              <div className="p-3 bg-gray-100/70 border border-gray-200 rounded-xl text-center">
                <span className="text-[11px] font-bold text-gray-700 block mb-0.5">보통</span>
                <span className="text-xl font-black text-gray-800">{revNormal}</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  {totalReviews > 0 ? ((revNormal / totalReviews) * 100).toFixed(0) + '%' : '0%'}
                </span>
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl text-center">
                <span className="text-[11px] font-bold text-rose-800 block mb-0.5">불편</span>
                <span className="text-xl font-black text-rose-700">{revUncomfortable}</span>
                <span className="text-[10px] text-rose-600 block mt-0.5">
                  {totalReviews > 0 ? ((revUncomfortable / totalReviews) * 100).toFixed(0) + '%' : '0%'}
                </span>
              </div>
            </div>

            {/* 불편 리뷰 세부 항목 */}
            <div className="p-4 bg-rose-50/40 border border-rose-100 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  불편 리뷰 세부 분류 (총 {revUncomfortable}건)
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-lg border border-rose-100">
                  <span className="text-[10px] text-gray-500 block">서비스</span>
                  <span className="font-bold text-gray-900">{revDetails.service || '0'}건</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-rose-100">
                  <span className="text-[10px] text-gray-500 block">매장시설</span>
                  <span className="font-bold text-gray-900">{revDetails.facility || '0'}건</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-rose-100">
                  <span className="text-[10px] text-gray-500 block">음식</span>
                  <span className="font-bold text-gray-900">{revDetails.food || '0'}건</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-rose-100">
                  <span className="text-[10px] text-gray-500 block">기타</span>
                  <span className="font-bold text-gray-900">{revDetails.other || '0'}건</span>
                </div>
              </div>

              {revDetails.note && (
                <div className="pt-2 border-t border-rose-100">
                  <span className="text-[11px] font-bold text-rose-900 block mb-1">불편 리뷰 대책 및 조치사항:</span>
                  <p className="text-xs text-gray-800 bg-white p-3 rounded-xl border border-rose-100 whitespace-pre-wrap leading-relaxed">
                    {revDetails.note}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: 냉장고 온도 체크 (Fridge Temps) */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                <CheckSquare className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm md:text-base">4. 매장 냉장고 및 냉동고 온도 점검</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { key: 'kitchen1', label: '주방 1번' },
                { key: 'kitchen2', label: '주방 2번' },
                { key: 'hall1', label: '홀 1번' },
                { key: 'hall2', label: '홀 2번' },
                { key: 'drink', label: '음료 냉장고' },
                { key: 'alcohol', label: '주류 냉장고' },
                { key: 'storage1', label: '창고 1번' },
                { key: 'storage2', label: '창고 2번' },
              ].map((item) => {
                const tempVal = report.fridgeTemps ? (report.fridgeTemps as any)[item.key] : '';
                return (
                  <div key={item.key} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600">{item.label}</span>
                    <span className="text-sm font-black text-teal-700">
                      {tempVal ? `${tempVal}°C` : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-gray-200 p-4 px-6 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500 font-medium">
            영업일: <strong className="text-gray-800">{report.date}</strong> | 리포트 상태: 정상 저장됨
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
}
