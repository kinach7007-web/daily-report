import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query } from 'firebase/firestore';
import { 
  Calendar, 
  Info, 
  MessageSquare, 
  Star, 
  Smile, 
  Utensils, 
  Meh, 
  AlertCircle, 
  Gift, 
  BadgePercent, 
  Zap, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  BarChart3,
  TrendingUp,
  Clock,
  Layers,
  CalendarDays,
  LayoutGrid,
  ListFilter,
  X,
  ArrowRight,
  Eye,
  DollarSign
} from 'lucide-react';
import DailyReportViewer from './DailyReportViewer';

interface MonthState {
  year: number;
  month: number;
}

function MonthNavigator({
  year,
  month,
  currentYear,
  currentMonth,
  onChange,
  colorScheme = 'blue',
}: {
  year: number;
  month: number;
  currentYear: number;
  currentMonth: number;
  onChange: (y: number, m: number) => void;
  colorScheme?: 'blue' | 'rose' | 'amber';
}) {
  const isCurrent = year === currentYear && month === currentMonth;

  const handlePrev = () => {
    if (month === 1) {
      onChange(year - 1, 12);
    } else {
      onChange(year, month - 1);
    }
  };

  const handleNext = () => {
    if (month === 12) {
      onChange(year + 1, 1);
    } else {
      onChange(year, month + 1);
    }
  };

  const handleReset = () => {
    onChange(currentYear, currentMonth);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [y, m] = e.target.value.split('-').map(Number);
    if (y && m) {
      onChange(y, m);
    }
  };

  const colorClasses = {
    blue: {
      icon: 'text-blue-500',
      btn: 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200',
    },
    rose: {
      icon: 'text-rose-500',
      btn: 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200',
    },
    amber: {
      icon: 'text-amber-500',
      btn: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200',
    },
  }[colorScheme];

  return (
    <div className="flex flex-col items-stretch sm:items-end gap-1.5 w-full sm:w-auto">
      <div className="flex items-center justify-between sm:justify-end gap-1.5 bg-gray-100/90 p-1 rounded-2xl border border-gray-200">
        <button 
          onClick={handlePrev}
          className="p-2 sm:p-1.5 text-gray-600 hover:bg-white hover:text-gray-900 rounded-xl transition-all shadow-none hover:shadow-xs active:scale-95"
          title="이전 달"
          aria-label="이전 달"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="relative flex items-center justify-center px-3 py-1.5 bg-white rounded-xl shadow-xs border border-gray-200/80 flex-1 sm:flex-initial">
          <Calendar className={`w-4 h-4 ${colorClasses.icon} mr-1.5 shrink-0`} />
          <span className="text-xs sm:text-sm font-black text-gray-900 whitespace-nowrap">
            {year}년 {month}월
          </span>
          <input 
            type="month"
            value={`${year}-${String(month).padStart(2, '0')}`}
            onChange={handleInputChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title="월 선택"
          />
        </div>

        <button 
          onClick={handleNext}
          className="p-2 sm:p-1.5 text-gray-600 hover:bg-white hover:text-gray-900 rounded-xl transition-all shadow-none hover:shadow-xs active:scale-95"
          title="다음 달"
          aria-label="다음 달"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {!isCurrent && (
        <button
          onClick={handleReset}
          className={`w-full justify-center px-2.5 py-1 ${colorClasses.btn} rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all border shadow-2xs active:scale-95`}
          title={`당월(${currentMonth}월)로 돌아가기`}
        >
          <RotateCcw className="w-3 h-3" />
          당월({currentMonth}월)로 새로고침
        </button>
      )}
    </div>
  );
}

export default function SalesStats() {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const [reportsHistory, setReportsHistory] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    dateStr: string;
    dayName: string;
    report: any | null;
  } | null>(null);

  // View mode: 'calendar' | 'list'
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  // Individual month states for each dashboard
  const [revenueDate, setRevenueDate] = useState<MonthState>({ year: currentYear, month: currentMonth });
  const [discountDate, setDiscountDate] = useState<MonthState>({ year: currentYear, month: currentMonth });
  const [reviewDate, setReviewDate] = useState<MonthState>({ year: currentYear, month: currentMonth });

  const loadHistory = () => {
    const saved = localStorage.getItem('dailyReportsHistory');
    if (saved) {
      try {
        setReportsHistory(JSON.parse(saved));
      } catch (e) {
        setReportsHistory([]);
      }
    } else {
      setReportsHistory([]);
    }
  };

  useEffect(() => {
    loadHistory();

    const handleStorage = () => loadHistory();
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const getReportForDate = (dateStr: string) => {
    return reportsHistory.find(r => r.date === dateStr);
  };
  
  const parseAmount = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseInt(val.toString().replace(/,/g, '')) || 0;
  };

  const getReportLunchAmount = (report: any) => {
    if (!report) return 0;
    return parseAmount(report.sales?.lunch?.amount || report.lunchSales?.amount);
  };

  const getReportDinnerAmount = (report: any) => {
    if (!report) return 0;
    if (report.sales?.netDinnerAmount !== undefined && report.sales?.netDinnerAmount !== null) {
      return parseAmount(report.sales.netDinnerAmount);
    }
    const lunchAmt = getReportLunchAmount(report);
    const rawDinner = parseAmount(report.sales?.dinner?.amount || report.dinnerSales?.amount);
    return Math.max(0, rawDinner - lunchAmt);
  };

  const getReportNightAmount = (report: any) => {
    if (!report) return 0;
    if (report.sales?.netNightAmount !== undefined && report.sales?.netNightAmount !== null) {
      return parseAmount(report.sales.netNightAmount);
    }
    const rawDinner = parseAmount(report.sales?.dinner?.amount || report.dinnerSales?.amount);
    const rawNight = parseAmount(report.sales?.night?.amount || report.nightSales?.amount);
    return Math.max(0, rawNight - rawDinner);
  };

  const getReportTotalAmount = (report: any) => {
    if (!report) return 0;
    if (report.sales?.totalAmount !== undefined && report.sales?.totalAmount !== null && report.sales?.totalAmount !== '') {
      return parseAmount(report.sales.totalAmount);
    }
    const l = getReportLunchAmount(report);
    const netD = getReportDinnerAmount(report);
    const netN = getReportNightAmount(report);
    return l + netD + netN;
  };

  const handleCellClick = (dateStr: string, dayName: string, report: any | null) => {
    if (report) {
      setSelectedReport(report);
    } else {
      setSelectedDayDetail({ dateStr, dayName, report });
    }
  };

  // 1. Revenue Calculations
  const revYear = revenueDate.year;
  const revMonth = revenueDate.month;
  const revDaysInMonth = new Date(revYear, revMonth, 0).getDate();
  const revFirstDayOfWeek = new Date(revYear, revMonth - 1, 1).getDay();
  const revMonthPrefix = `${revYear}-${String(revMonth).padStart(2, '0')}`;
  const isRevCurrentMonth = revYear === currentYear && revMonth === currentMonth;

  // 2. Discount Calculations
  const discYear = discountDate.year;
  const discMonth = discountDate.month;
  const discDaysInMonth = new Date(discYear, discMonth, 0).getDate();
  const discFirstDayOfWeek = new Date(discYear, discMonth - 1, 1).getDay();
  const discMonthPrefix = `${discYear}-${String(discMonth).padStart(2, '0')}`;
  const isDiscCurrentMonth = discYear === currentYear && discMonth === currentMonth;

  // 3. Review Calculations
  const revwYear = reviewDate.year;
  const revwMonth = reviewDate.month;
  const revwDaysInMonth = new Date(revwYear, revwMonth, 0).getDate();
  const revwFirstDayOfWeek = new Date(revwYear, revwMonth - 1, 1).getDay();
  const revwMonthPrefix = `${revwYear}-${String(revwMonth).padStart(2, '0')}`;
  const isRevwCurrentMonth = revwYear === currentYear && revwMonth === currentMonth;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-16">
      
      {/* Header Banner & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 bg-blue-600 rounded-2xl shadow-md shadow-blue-200 text-white shrink-0">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-gray-900">월간 매출 및 통계 대시보드</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              모바일 및 PC 환경에서 날짜별 매출, 할인/서비스, 리뷰 내역을 한눈에 조회합니다.
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              viewMode === 'calendar'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>달력형 보기</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              viewMode === 'list'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>목록형 보기</span>
          </button>
        </div>
      </div>

      {/* 1. Monthly Revenue Section */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-6 md:p-8 border border-gray-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-blue-600 text-white rounded-2xl shrink-0 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">{revMonth}월 매출 현황 (점심·저녁·야간)</h3>
              <p className="text-xs text-gray-500 mt-0.5">{revYear}년 {revMonth}월 영업 데이터</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <MonthNavigator 
              year={revYear}
              month={revMonth}
              currentYear={currentYear}
              currentMonth={currentMonth}
              onChange={(y, m) => setRevenueDate({ year: y, month: m })}
              colorScheme="blue"
            />

            {(() => {
              let mTotal = 0;
              let recordedDays = 0;
              reportsHistory.filter(r => r.date && r.date.startsWith(revMonthPrefix)).forEach(report => {
                const sum = getReportTotalAmount(report);
                mTotal += sum;
                if (sum > 0) recordedDays++;
              });
              
              return (
                <div className="flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50/70 rounded-2xl border border-blue-200/80">
                  <div>
                    <span className="text-[11px] font-bold text-blue-700 block">{revMonth}월 누적 매출</span>
                    <span className="text-[10px] text-blue-500 font-semibold">{recordedDays}일 등록</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black text-blue-800">
                      {(mTotal / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-xs sm:text-sm ml-1 font-black text-blue-700">만원</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {viewMode === 'calendar' ? (
          /* Calendar Grid */
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 bg-gray-100 p-1 sm:p-1.5 rounded-2xl border border-gray-200">
            {days.map((d) => (
              <div key={d} className={`bg-gray-50/90 py-2 text-center text-[11px] sm:text-xs font-black rounded-lg ${
                d === '토' ? 'text-blue-600' : d === '일' ? 'text-rose-600' : 'text-gray-700'
              }`}>
                {d}
              </div>
            ))}
            
            {(() => {
              const cells = [];
              
              for (let i = 0; i < revFirstDayOfWeek; i++) {
                cells.push(<div key={`empty-rev-${i}`} className="bg-gray-50/40 rounded-xl min-h-[70px] sm:h-28 md:h-36" />);
              }
              
              for (let day = 1; day <= revDaysInMonth; day++) {
                const date = new Date(revYear, revMonth - 1, day);
                const dateStr = `${revYear}-${String(revMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                const isToday = isRevCurrentMonth && day === currentDay;
                
                const report = getReportForDate(dateStr);
                const lunch = getReportLunchAmount(report);
                const dinner = getReportDinnerAmount(report);
                const night = getReportNightAmount(report);
                const total = getReportTotalAmount(report);
                const hasData = total > 0 || Boolean(report);

                cells.push(
                  <div 
                    key={day} 
                    onClick={() => handleCellClick(dateStr, dayName, report)}
                    className={`bg-white p-1 sm:p-2 rounded-xl min-h-[76px] sm:h-28 md:h-36 flex flex-col justify-between transition-all cursor-pointer select-none border ${
                      isToday 
                        ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/30' 
                        : hasData 
                          ? 'border-gray-200/90 hover:border-blue-300 hover:shadow-xs' 
                          : 'border-gray-100 hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Top: Date & Badge */}
                    <div className="flex justify-between items-center">
                      <span className={`text-xs sm:text-sm font-black ${
                        dayName === '토' ? 'text-blue-600' : dayName === '일' ? 'text-rose-600' : 'text-gray-900'
                      }`}>
                        {day}
                      </span>
                      {isToday && (
                        <span className="text-[9px] bg-blue-600 text-white font-black px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full">
                          오늘
                        </span>
                      )}
                    </div>
                    
                    {/* Middle: Content */}
                    <div className="my-auto flex flex-col justify-center">
                      {total > 0 ? (
                        <>
                          {/* Mobile View: High-contrast large summary */}
                          <div className="sm:hidden flex flex-col items-center justify-center py-0.5">
                            <span className="text-[11px] font-black text-blue-700 leading-tight">
                              {(total / 10000).toFixed(1)}<span className="text-[9px] font-bold">만</span>
                            </span>
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {lunch > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="점심" />}
                              {dinner > 0 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="저녁" />}
                              {night > 0 && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title="야간" />}
                            </div>
                          </div>

                          {/* Tablet/Desktop View: Detailed Rows */}
                          <div className="hidden sm:flex flex-col gap-1">
                            <div className="flex items-center justify-between bg-blue-50/90 px-1.5 py-0.5 rounded border border-blue-100 text-[10px]">
                              <span className="font-bold text-blue-700">점심</span>
                              <span className="font-black text-blue-800">{(lunch/10000).toFixed(1)}만</span>
                            </div>
                            <div className="flex items-center justify-between bg-indigo-50/90 px-1.5 py-0.5 rounded border border-indigo-100 text-[10px]">
                              <span className="font-bold text-indigo-700">저녁</span>
                              <span className="font-black text-indigo-800">{(dinner/10000).toFixed(1)}만</span>
                            </div>
                            {night > 0 && (
                              <div className="flex items-center justify-between bg-purple-50/90 px-1.5 py-0.5 rounded border border-purple-100 text-[10px]">
                                <span className="font-bold text-purple-700">야간</span>
                                <span className="font-black text-purple-800">{(night/10000).toFixed(1)}만</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between bg-blue-600 px-1.5 py-0.5 rounded shadow-2xs text-[10px]">
                              <span className="font-bold text-white">합계</span>
                              <span className="font-black text-white">{(total/10000).toFixed(1)}만</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-2 opacity-15">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Bottom Indicator */}
                    <div className="pt-0.5 text-right hidden sm:block">
                      {hasData && (
                        <span className="text-[8px] font-bold text-gray-400">상세보기</span>
                      )}
                    </div>
                  </div>
                );
              }
              
              return cells;
            })()}
          </div>
        ) : (
          /* List Mode */
          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {Array.from({ length: revDaysInMonth }, (_, i) => i + 1).map((day) => {
              const date = new Date(revYear, revMonth - 1, day);
              const dateStr = `${revYear}-${String(revMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
              const isToday = isRevCurrentMonth && day === currentDay;
              const report = getReportForDate(dateStr);
              const lunch = getReportLunchAmount(report);
              const dinner = getReportDinnerAmount(report);
              const night = getReportNightAmount(report);
              const total = getReportTotalAmount(report);

              if (total === 0 && !report) return null;

              return (
                <div 
                  key={day}
                  onClick={() => handleCellClick(dateStr, dayName, report)}
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50/40 rounded-2xl border border-gray-200/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                      dayName === '토' ? 'bg-blue-100 text-blue-700' : dayName === '일' ? 'bg-rose-100 text-rose-700' : 'bg-gray-200/80 text-gray-800'
                    }`}>
                      {day}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900">{dateStr} ({dayName})</span>
                        {isToday && <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[9px] font-bold">오늘</span>}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        점심: {lunch.toLocaleString()}원 | 저녁: {dinner.toLocaleString()}원 {night > 0 ? `| 야간: ${night.toLocaleString()}원` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-blue-700">{total.toLocaleString()}원</span>
                    <span className="text-[10px] text-gray-400 block">리포트 보기 →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Monthly Discount & Service Status Calendar */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-6 md:p-8 border border-gray-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-rose-500 text-white rounded-2xl shrink-0 shadow-xs">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">{discMonth}월 할인 및 서비스 현황</h3>
              <p className="text-xs text-gray-500 mt-0.5">{discYear}년 {discMonth}월 할인 프로모션 내역</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <MonthNavigator 
              year={discYear}
              month={discMonth}
              currentYear={currentYear}
              currentMonth={currentMonth}
              onChange={(y, m) => setDiscountDate({ year: y, month: m })}
              colorScheme="rose"
            />

            {(() => {
              let mMark = 0;
              let mEvent = 0;
              let mOther = 0;
              
              reportsHistory.filter(r => r.date && r.date.startsWith(discMonthPrefix)).forEach(report => {
                const disc = report.discount;
                if (disc) {
                  mMark += parseAmount(disc.marketing?.amount);
                  mEvent += parseAmount(disc.event?.amount);
                  mOther += parseAmount(disc.other?.amount);
                }
              });
              
              return (
                <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 px-3 sm:px-4 py-2.5 bg-rose-50/60 rounded-2xl border border-rose-200/80">
                  <div className="flex flex-col items-center px-1 sm:px-2">
                    <span className="text-[10px] font-bold text-emerald-600">마케팅</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-800">{(mMark/10000).toFixed(1)}만</span>
                  </div>
                  <div className="w-px h-6 bg-rose-200"></div>
                  <div className="flex flex-col items-center px-1 sm:px-2">
                    <span className="text-[10px] font-bold text-blue-600">이벤트</span>
                    <span className="text-xs sm:text-sm font-black text-blue-800">{(mEvent/10000).toFixed(1)}만</span>
                  </div>
                  <div className="w-px h-6 bg-rose-200"></div>
                  <div className="flex flex-col items-center px-1 sm:px-2">
                    <span className="text-[10px] font-bold text-gray-600">기타</span>
                    <span className="text-xs sm:text-sm font-black text-gray-900">{(mOther/10000).toFixed(1)}만</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 bg-gray-100 p-1 sm:p-1.5 rounded-2xl border border-gray-200">
          {days.map((d) => (
            <div key={d} className={`bg-gray-50/90 py-2 text-center text-[11px] sm:text-xs font-black rounded-lg ${
              d === '토' ? 'text-blue-600' : d === '일' ? 'text-rose-600' : 'text-gray-700'
            }`}>
              {d}
            </div>
          ))}
          
          {(() => {
            const cells = [];
            
            for (let i = 0; i < discFirstDayOfWeek; i++) {
              cells.push(<div key={`empty-discount-${i}`} className="bg-gray-50/40 rounded-xl min-h-[70px] sm:h-28 md:h-36" />);
            }
            
            for (let day = 1; day <= discDaysInMonth; day++) {
              const date = new Date(discYear, discMonth - 1, day);
              const dateStr = `${discYear}-${String(discMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
              const isToday = isDiscCurrentMonth && day === currentDay;
              
              const report = getReportForDate(dateStr);
              const disc = report?.discount;

              const mark = parseAmount(disc?.marketing?.amount);
              const event = parseAmount(disc?.event?.amount);
              const other = parseAmount(disc?.other?.amount);
              const total = mark + event + other;
              const hasData = total > 0 || Boolean(report);

              cells.push(
                <div 
                  key={day} 
                  onClick={() => handleCellClick(dateStr, dayName, report)}
                  className={`bg-white p-1 sm:p-2 rounded-xl min-h-[76px] sm:h-28 md:h-36 flex flex-col justify-between transition-all cursor-pointer select-none border ${
                    isToday 
                      ? 'ring-2 ring-rose-500 border-rose-400 bg-rose-50/30' 
                      : hasData 
                        ? 'border-gray-200/90 hover:border-rose-300 hover:shadow-xs' 
                        : 'border-gray-100 hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-xs sm:text-sm font-black ${
                      dayName === '토' ? 'text-blue-600' : dayName === '일' ? 'text-rose-600' : 'text-gray-900'
                    }`}>
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] bg-rose-500 text-white font-black px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full">
                        오늘
                      </span>
                    )}
                  </div>
                  
                  <div className="my-auto flex flex-col justify-center">
                    {total > 0 ? (
                      <>
                        {/* Mobile View */}
                        <div className="sm:hidden flex flex-col items-center justify-center py-0.5">
                          <span className="text-[11px] font-black text-rose-600 leading-tight">
                            {(total / 10000).toFixed(1)}<span className="text-[9px] font-bold">만</span>
                          </span>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {mark > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="마케팅" />}
                            {event > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="이벤트" />}
                            {other > 0 && <span className="w-1.5 h-1.5 rounded-full bg-gray-500" title="기타" />}
                          </div>
                        </div>

                        {/* Desktop View */}
                        <div className="hidden sm:flex flex-col gap-1">
                          {mark > 0 && (
                            <div className="flex items-center justify-between bg-emerald-50/90 px-1.5 py-0.5 rounded border border-emerald-100 text-[10px]">
                              <span className="font-bold text-emerald-700">마케팅</span>
                              <span className="font-black text-emerald-800">{(mark/10000).toFixed(1)}만</span>
                            </div>
                          )}
                          {event > 0 && (
                            <div className="flex items-center justify-between bg-blue-50/90 px-1.5 py-0.5 rounded border border-blue-100 text-[10px]">
                              <span className="font-bold text-blue-700">이벤트</span>
                              <span className="font-black text-blue-800">{(event/10000).toFixed(1)}만</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between bg-rose-500 px-1.5 py-0.5 rounded shadow-2xs text-[10px]">
                            <span className="font-bold text-white">할인합계</span>
                            <span className="font-black text-white">{(total/10000).toFixed(1)}만</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2 opacity-15">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="pt-0.5 text-right hidden sm:block">
                    {hasData && (
                      <span className="text-[8px] font-bold text-gray-400">상세보기</span>
                    )}
                  </div>
                </div>
              );
            }
            
            return cells;
          })()}
        </div>
      </div>

      {/* 3. Monthly Review Status Calendar */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-6 md:p-8 border border-gray-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-amber-500 text-white rounded-2xl shrink-0 shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">{revwMonth}월 리뷰 현황 (긍정·불편·합계)</h3>
              <p className="text-xs text-gray-500 mt-0.5">{revwYear}년 {revwMonth}월 고객 피드백 종합</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <MonthNavigator 
              year={revwYear}
              month={revwMonth}
              currentYear={currentYear}
              currentMonth={currentMonth}
              onChange={(y, m) => setReviewDate({ year: y, month: m })}
              colorScheme="amber"
            />

            {(() => {
              let monthlyPos = 0;
              let monthlyUnc = 0;
              
              reportsHistory.filter(r => r.date && r.date.startsWith(revwMonthPrefix)).forEach(report => {
                const reviews = report.reviews;
                if (reviews) {
                  const k = parseInt(reviews.kindness?.count || '0');
                  const d = parseInt(reviews.delicious?.count || '0');
                  const n = parseInt(reviews.normal?.count || '0');
                  const u = parseInt(reviews.uncomfortable?.count || '0');
                  monthlyPos += (k + d + n);
                  monthlyUnc += u;
                }
              });
              
              return (
                <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 px-3 sm:px-4 py-2.5 bg-amber-50/60 rounded-2xl border border-amber-200/80">
                  <div className="flex flex-col items-center px-1 sm:px-2">
                    <span className="text-[10px] font-bold text-blue-600">긍정 리뷰</span>
                    <span className="text-xs sm:text-sm font-black text-blue-800">{monthlyPos}건</span>
                  </div>
                  <div className="w-px h-6 bg-amber-200"></div>
                  <div className="flex flex-col items-center px-1 sm:px-2">
                    <span className="text-[10px] font-bold text-red-600">불편 접수</span>
                    <span className="text-xs sm:text-sm font-black text-red-700">{monthlyUnc}건</span>
                  </div>
                  <div className="w-px h-6 bg-amber-200"></div>
                  <div className="flex flex-col items-center px-1 sm:px-2">
                    <span className="text-[10px] font-bold text-gray-600">총 리뷰</span>
                    <span className="text-xs sm:text-sm font-black text-gray-900">{monthlyPos + monthlyUnc}건</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 bg-gray-100 p-1 sm:p-1.5 rounded-2xl border border-gray-200">
          {days.map((d) => (
            <div key={d} className={`bg-gray-50/90 py-2 text-center text-[11px] sm:text-xs font-black rounded-lg ${
              d === '토' ? 'text-blue-600' : d === '일' ? 'text-rose-600' : 'text-gray-700'
            }`}>
              {d}
            </div>
          ))}
          
          {(() => {
            const cells = [];
            
            for (let i = 0; i < revwFirstDayOfWeek; i++) {
              cells.push(<div key={`empty-review-${i}`} className="bg-gray-50/40 rounded-xl min-h-[70px] sm:h-28 md:h-36" />);
            }
            
            for (let day = 1; day <= revwDaysInMonth; day++) {
              const date = new Date(revwYear, revwMonth - 1, day);
              const dateStr = `${revwYear}-${String(revwMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
              const isToday = isRevwCurrentMonth && day === currentDay;
              
              const report = getReportForDate(dateStr);
              const reviews = report?.reviews;

              const k = parseInt(reviews?.kindness?.count || '0');
              const d = parseInt(reviews?.delicious?.count || '0');
              const n = parseInt(reviews?.normal?.count || '0');
              const u = parseInt(reviews?.uncomfortable?.count || '0');
              
              const positive = k + d + n;
              const uncomfortable = u;
              const total = positive + uncomfortable;
              const hasData = total > 0 || Boolean(report);

              cells.push(
                <div 
                  key={day} 
                  onClick={() => handleCellClick(dateStr, dayName, report)}
                  className={`bg-white p-1 sm:p-2 rounded-xl min-h-[76px] sm:h-28 md:h-36 flex flex-col justify-between transition-all cursor-pointer select-none border ${
                    isToday 
                      ? 'ring-2 ring-amber-500 border-amber-400 bg-amber-50/30' 
                      : hasData 
                        ? 'border-gray-200/90 hover:border-amber-300 hover:shadow-xs' 
                        : 'border-gray-100 hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-xs sm:text-sm font-black ${
                      dayName === '토' ? 'text-blue-600' : dayName === '일' ? 'text-rose-600' : 'text-gray-900'
                    }`}>
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] bg-amber-500 text-white font-black px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full">
                        오늘
                      </span>
                    )}
                  </div>
                  
                  <div className="my-auto flex flex-col justify-center">
                    {total > 0 ? (
                      <>
                        {/* Mobile View */}
                        <div className="sm:hidden flex flex-col items-center justify-center py-0.5">
                          <span className="text-[11px] font-black text-gray-900 leading-tight">
                            총 {total}건
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {positive > 0 && (
                              <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1 rounded">
                                +{positive}
                              </span>
                            )}
                            {uncomfortable > 0 && (
                              <span className="text-[9px] font-black text-red-600 bg-red-50 px-1 rounded">
                                -{uncomfortable}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Desktop View */}
                        <div className="hidden sm:flex flex-col gap-1">
                          <div className="flex items-center justify-between bg-blue-50/90 px-1.5 py-0.5 rounded border border-blue-100 text-[10px]">
                            <span className="font-bold text-blue-700">긍정</span>
                            <span className="font-black text-blue-800">{positive}건</span>
                          </div>
                          {uncomfortable > 0 && (
                            <div className="flex items-center justify-between bg-red-50/90 px-1.5 py-0.5 rounded border border-red-100 text-[10px]">
                              <span className="font-bold text-red-700">불편</span>
                              <span className="font-black text-red-800">{uncomfortable}건</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between bg-gray-900 px-1.5 py-0.5 rounded shadow-2xs text-[10px]">
                            <span className="font-bold text-white">총 리뷰</span>
                            <span className="font-black text-white">{total}건</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2 opacity-15">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="pt-0.5 text-right hidden sm:block">
                    {hasData && (
                      <span className="text-[8px] font-bold text-gray-400">상세보기</span>
                    )}
                  </div>
                </div>
              );
            }
            
            return cells;
          })()}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl flex items-start gap-3 border border-gray-200">
        <div className="p-2 bg-white rounded-xl shadow-2xs shrink-0">
          <Info className="w-4 h-4 text-gray-500" />
        </div>
        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
          달력의 각 날짜 칸을 터치/클릭하시면 해당 일자의 <strong>상세 결산 내역(점심·저녁·야간 매출, 할인/서비스, 피드백 등)</strong>을 팝업으로 편리하게 확인하실 수 있습니다.
        </p>
      </div>

      {/* Full Report Modal if clicked on day with report */}
      {selectedReport && (
        <DailyReportViewer
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

      {/* Simple Day Detail Modal if no full report exists */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h4 className="text-base font-black text-gray-900">
                  {selectedDayDetail.dateStr} ({selectedDayDetail.dayName})
                </h4>
              </div>
              <button 
                onClick={() => setSelectedDayDetail(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 text-center text-gray-500 text-xs">
              <p>해당 일자에 등록된 상세 영업일보가 없습니다.</p>
              <p className="mt-1 text-gray-400">[영업 일보] 탭에서 결산 리포트를 작성할 수 있습니다.</p>
            </div>

            <button
              onClick={() => setSelectedDayDetail(null)}
              className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold"
            >
              닫기
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
