import React, { useState, useEffect } from 'react';
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
  CalendarDays
} from 'lucide-react';

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
      btn: 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100',
    },
    rose: {
      icon: 'text-rose-500',
      btn: 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100',
    },
    amber: {
      icon: 'text-amber-500',
      btn: 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-100',
    },
  }[colorScheme];

  return (
    <div className="flex flex-col items-center sm:items-end gap-1">
      <div className="flex items-center gap-1 bg-gray-50/80 p-1 rounded-2xl border border-gray-200/80">
        <button 
          onClick={handlePrev}
          className="p-1.5 text-gray-500 hover:bg-white hover:text-gray-800 rounded-xl transition-all shadow-none hover:shadow-sm"
          title="이전 달"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="relative flex items-center px-2.5 py-1 bg-white rounded-xl shadow-xs border border-gray-100">
          <Calendar className={`w-3.5 h-3.5 ${colorClasses.icon} mr-1.5`} />
          <span className="text-xs font-bold text-gray-800 whitespace-nowrap">
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
          className="p-1.5 text-gray-500 hover:bg-white hover:text-gray-800 rounded-xl transition-all shadow-none hover:shadow-sm"
          title="다음 달"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {!isCurrent && (
        <button
          onClick={handleReset}
          className={`w-full justify-center px-2.5 py-1 ${colorClasses.btn} rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all border shadow-xs animate-in fade-in slide-in-from-top-1`}
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
  }, []);

  const getReportForDate = (dateStr: string) => {
    return reportsHistory.find(r => r.date === dateStr);
  };
  
  const parseAmount = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseInt(val.toString().replace(/,/g, '')) || 0;
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-200">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">월간 매출 및 리뷰 통계</h2>
            <p className="text-sm text-gray-500">대시보드별로 원하는 연월을 각각 넘겨보며 통계를 조회할 수 있습니다.</p>
          </div>
        </div>
      </div>

      {/* 1. Monthly Revenue Calendar */}
      <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-xl">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-800">{revMonth}월 매출 현황 (점심·저녁·야간)</h3>
              <p className="text-xs text-gray-400 mt-0.5">{revYear}년 {revMonth}월 작성 기준</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-start sm:items-center gap-3 self-start lg:self-auto">
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
              reportsHistory.filter(r => r.date && r.date.startsWith(revMonthPrefix)).forEach(report => {
                const l = parseAmount(report.sales?.lunch?.amount || report.lunchSales?.amount);
                const d = parseAmount(report.sales?.dinner?.amount || report.dinnerSales?.amount);
                const n = parseAmount(report.sales?.night?.amount || report.nightSales?.amount);
                mTotal += (l + d + n);
              });
              
              return (
                <div className="flex items-center gap-2 sm:gap-4 px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100">
                  <span className="text-xs font-bold text-blue-600">{revMonth}월 누적 매출</span>
                  <span className="text-lg sm:text-2xl font-black text-blue-700">{(mTotal/10000).toFixed(0)}<span className="text-xs sm:text-sm ml-1 font-bold">만원</span></span>
                </div>
              );
            })()}
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
          {days.map((d) => (
            <div key={d} className={`bg-gray-50 py-3 text-center text-xs font-black uppercase tracking-widest ${
              d === '토' ? 'text-blue-500' : d === '일' ? 'text-rose-500' : 'text-gray-400'
            }`}>
              {d}
            </div>
          ))}
          
          {(() => {
            const cells = [];
            
            for (let i = 0; i < revFirstDayOfWeek; i++) {
              cells.push(<div key={`empty-rev-${i}`} className="bg-white h-28 md:h-36" />);
            }
            
            for (let day = 1; day <= revDaysInMonth; day++) {
              const date = new Date(revYear, revMonth - 1, day);
              const dateStr = `${revYear}-${String(revMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
              const isToday = isRevCurrentMonth && day === currentDay;
              
              const report = getReportForDate(dateStr);
              const lunch = parseAmount(report?.sales?.lunch?.amount || report?.lunchSales?.amount);
              const dinner = parseAmount(report?.sales?.dinner?.amount || report?.dinnerSales?.amount);
              const night = parseAmount(report?.sales?.night?.amount || report?.nightSales?.amount);
              const total = lunch + dinner + night;

              cells.push(
                <div key={day} className={`bg-white p-2 h-28 md:h-36 flex flex-col gap-1.5 transition-all hover:bg-gray-50/50 ${isToday ? 'ring-2 ring-inset ring-blue-500 bg-blue-50/20' : ''}`}>
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-black ${
                      dayName === '토' ? 'text-blue-500' : dayName === '일' ? 'text-rose-500' : 'text-gray-700'
                    }`}>
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] bg-blue-500 text-white font-bold px-1.5 py-0.5 rounded-full">오늘</span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1 flex-grow justify-center">
                    {total > 0 ? (
                      <>
                        <div className="flex items-center justify-between bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          <span className="text-[9px] font-bold text-blue-600">점심</span>
                          <span className="text-[10px] font-black text-blue-700">{(lunch/10000).toFixed(1)}만</span>
                        </div>
                        <div className="flex items-center justify-between bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                          <span className="text-[9px] font-bold text-indigo-600">저녁</span>
                          <span className="text-[10px] font-black text-indigo-700">{(dinner/10000).toFixed(1)}만</span>
                        </div>
                        <div className="flex items-center justify-between bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                          <span className="text-[9px] font-bold text-violet-600">야간</span>
                          <span className="text-[10px] font-black text-violet-700">{(night/10000).toFixed(1)}만</span>
                        </div>
                        <div className="flex items-center justify-between bg-blue-600 px-1.5 py-1 rounded shadow-sm mt-0.5">
                          <span className="text-[9px] font-bold text-white">총 매출</span>
                          <span className="text-[10px] font-black text-white">{(total/10000).toFixed(1)}만</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full opacity-10">
                        <Star className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto pt-1.5 border-t border-gray-50 flex justify-end items-center">
                    <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">Live Sync</span>
                  </div>
                </div>
              );
            }
            
            return cells;
          })()}
        </div>
      </div>

      {/* 2. Monthly Discount & Service Status Calendar */}
      <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500 rounded-xl">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-800">{discMonth}월 할인 및 서비스 현황</h3>
              <p className="text-xs text-gray-400 mt-0.5">{discYear}년 {discMonth}월 작성 기준</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-start sm:items-center gap-3 self-start lg:self-auto">
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
                <div className="flex items-center gap-2 sm:gap-4 px-4 py-2 bg-rose-50/30 rounded-2xl border border-rose-100">
                  <div className="flex flex-col items-center px-2">
                    <span className="text-[10px] font-bold text-emerald-500 mb-0.5">마케팅</span>
                    <span className="text-sm font-black text-emerald-700">{(mMark/10000).toFixed(1)}만</span>
                  </div>
                  <div className="w-px h-6 bg-rose-100"></div>
                  <div className="flex flex-col items-center px-2">
                    <span className="text-[10px] font-bold text-blue-500 mb-0.5">이벤트</span>
                    <span className="text-sm font-black text-blue-700">{(mEvent/10000).toFixed(1)}만</span>
                  </div>
                  <div className="w-px h-6 bg-rose-100"></div>
                  <div className="flex flex-col items-center px-2">
                    <span className="text-[10px] font-bold text-gray-400 mb-0.5">기타</span>
                    <span className="text-sm font-black text-gray-900">{(mOther/10000).toFixed(1)}만</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
          {days.map((d) => (
            <div key={d} className={`bg-gray-50 py-3 text-center text-xs font-black uppercase tracking-widest ${
              d === '토' ? 'text-blue-500' : d === '일' ? 'text-rose-500' : 'text-gray-400'
            }`}>
              {d}
            </div>
          ))}
          
          {(() => {
            const cells = [];
            
            for (let i = 0; i < discFirstDayOfWeek; i++) {
              cells.push(<div key={`empty-discount-${i}`} className="bg-white h-28 md:h-36" />);
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

              cells.push(
                <div key={day} className={`bg-white p-2 h-28 md:h-36 flex flex-col gap-1.5 transition-all hover:bg-gray-50/50 ${isToday ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/20' : ''}`}>
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-black ${
                      dayName === '토' ? 'text-blue-500' : dayName === '일' ? 'text-rose-500' : 'text-gray-700'
                    }`}>
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-full">오늘</span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1 flex-grow justify-center">
                    {total > 0 ? (
                      <>
                        {mark > 0 && (
                          <div className="flex items-center justify-between bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            <span className="text-[9px] font-bold text-emerald-600">마케팅</span>
                            <span className="text-[10px] font-black text-emerald-700">{mark >= 10000 ? (mark/10000).toFixed(1) + '만' : mark.toLocaleString()}</span>
                          </div>
                        )}
                        {event > 0 && (
                          <div className="flex items-center justify-between bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            <span className="text-[9px] font-bold text-blue-600">이벤트</span>
                            <span className="text-[10px] font-black text-blue-700">{event >= 10000 ? (event/10000).toFixed(1) + '만' : event.toLocaleString()}</span>
                          </div>
                        )}
                        {other > 0 && (
                          <div className="flex items-center justify-between bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                            <span className="text-[9px] font-bold text-gray-500">기타</span>
                            <span className="text-[10px] font-black text-gray-600">{other >= 10000 ? (other/10000).toFixed(1) + '만' : other.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between bg-rose-500 px-1.5 py-1 rounded shadow-sm mt-0.5">
                          <div className="flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 text-rose-100" />
                            <span className="text-[9px] font-bold text-white">합계</span>
                          </div>
                          <span className="text-[10px] font-black text-white">{total >= 10000 ? (total/10000).toFixed(1) + '만' : total.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full opacity-10">
                        <Gift className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto pt-1.5 border-t border-gray-50 flex justify-end items-center">
                    <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">Discount Sync</span>
                  </div>
                </div>
              );
            }
            
            return cells;
          })()}
        </div>
      </div>

      {/* 3. Monthly Review Status Calendar */}
      <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-xl">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-800">{revwMonth}월 리뷰 현황 (긍정·불편·합계)</h3>
              <p className="text-xs text-gray-400 mt-0.5">{revwYear}년 {revwMonth}월 작성 기준</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-start sm:items-center gap-3 self-start lg:self-auto">
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
                <div className="flex items-center gap-2 sm:gap-4 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex flex-col items-center px-2">
                    <span className="text-[10px] font-bold text-blue-500 mb-0.5">긍정</span>
                    <span className="text-sm font-black text-blue-700">{monthlyPos}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-200"></div>
                  <div className="flex flex-col items-center px-2">
                    <span className="text-[10px] font-bold text-red-500 mb-0.5">불편</span>
                    <span className="text-sm font-black text-red-700">{monthlyUnc}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-200"></div>
                  <div className="flex flex-col items-center px-2">
                    <span className="text-[10px] font-bold text-gray-400 mb-0.5">총 리뷰</span>
                    <span className="text-sm font-black text-gray-900">{monthlyPos + monthlyUnc}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
          {days.map((d) => (
            <div key={d} className={`bg-gray-50 py-3 text-center text-xs font-black uppercase tracking-widest ${
              d === '토' ? 'text-blue-500' : d === '일' ? 'text-rose-500' : 'text-gray-400'
            }`}>
              {d}
            </div>
          ))}
          
          {(() => {
            const cells = [];
            
            for (let i = 0; i < revwFirstDayOfWeek; i++) {
              cells.push(<div key={`empty-review-${i}`} className="bg-white h-28 md:h-36" />);
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
 
              cells.push(
                <div key={day} className={`bg-white p-2 h-28 md:h-36 flex flex-col gap-1.5 transition-all hover:bg-gray-50/50 ${isToday ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/20' : ''}`}>
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-black ${
                      dayName === '토' ? 'text-blue-500' : dayName === '일' ? 'text-rose-500' : 'text-gray-700'
                    }`}>
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-full">오늘</span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1 flex-grow justify-center">
                    {total > 0 ? (
                      <>
                        <div className="flex items-center justify-between bg-blue-50 px-1.5 py-1 rounded border border-blue-100">
                          <div className="flex items-center gap-1">
                            <Smile className="w-2.5 h-2.5 text-blue-500" />
                            <span className="text-[9px] font-bold text-blue-600">긍정</span>
                          </div>
                          <span className="text-[10px] font-black text-blue-700">{positive}</span>
                        </div>
                        <div className="flex items-center justify-between bg-red-50 px-1.5 py-1 rounded border border-red-100">
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5 text-red-500" />
                            <span className="text-[9px] font-bold text-red-600">불편</span>
                          </div>
                          <span className="text-[10px] font-black text-red-700">{uncomfortable}</span>
                        </div>
                        <div className="flex items-center justify-between bg-gray-900 px-1.5 py-1 rounded shadow-sm mt-0.5">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5 text-gray-400" />
                            <span className="text-[9px] font-bold text-white">총 리뷰</span>
                          </div>
                          <span className="text-[10px] font-black text-white">{total}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full opacity-10">
                        <MessageSquare className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto pt-1.5 border-t border-gray-50 flex justify-end items-center">
                    <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">Sync Active</span>
                  </div>
                </div>
              );
            }
            
            return cells;
          })()}
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-3xl flex items-start gap-4">
        <div className="p-2 bg-white rounded-xl shadow-sm">
          <Info className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          각 대시보드 우측 상단의 월간 탐색기(이전/다음 달 및 연월 선택)를 통해 <strong>매출</strong>, <strong>할인/서비스</strong>, <strong>리뷰</strong> 현황을 서로 다른 연월로 독립하여 비교 및 조회할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
