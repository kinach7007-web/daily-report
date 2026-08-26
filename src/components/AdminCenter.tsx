import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  Settings,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CalendarDays,
  Layers,
  Sparkles,
  Users,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { getBusinessDate } from './DailyReport';
import UserManagement from './UserManagement';
import MonthlyReportList from './MonthlyReportList';

interface WeekdayItem {
  key: number;
  name: string;
  short: string;
  textColor: string;
  badgeClass: string;
  count: number;
  lunch: number;
  dinner: number;
  night: number;
  total: number;
  avgTotal: number;
  avgLunch: number;
  avgDinner: number;
  avgNight: number;
}

export default function AdminCenter() {
  const [adminSection, setAdminSection] = useState<'stats' | 'reports' | 'users'>('stats');
  const currentBusinessDate = getBusinessDate();
  const [bYear, bMonth] = currentBusinessDate.split('-').map(Number);
  const currentYear = bYear || new Date().getFullYear();
  const currentMonth = bMonth || (new Date().getMonth() + 1);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [viewMode, setViewMode] = useState<'month' | 'year' | 'matrix' | 'timeslot'>('month');

  const [reportsHistory, setReportsHistory] = useState<any[]>([]);

  const parseAmount = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const clean = String(val).replace(/[^0-9.-]+/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const loadHistory = () => {
    const saved = localStorage.getItem('dailyReportsHistory');
    if (saved) {
      try {
        setReportsHistory(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    loadHistory();
    const handleStorage = () => loadHistory();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const WEEKDAYS = [
    { key: 1, name: '월요일', short: '월', textColor: 'text-gray-800', badgeClass: 'bg-gray-100 text-gray-700' },
    { key: 2, name: '화요일', short: '화', textColor: 'text-gray-800', badgeClass: 'bg-gray-100 text-gray-700' },
    { key: 3, name: '수요일', short: '수', textColor: 'text-gray-800', badgeClass: 'bg-gray-100 text-gray-700' },
    { key: 4, name: '목요일', short: '목', textColor: 'text-gray-800', badgeClass: 'bg-gray-100 text-gray-700' },
    { key: 5, name: '금요일', short: '금', textColor: 'text-indigo-600 font-bold', badgeClass: 'bg-indigo-50 text-indigo-700' },
    { key: 6, name: '토요일', short: '토', textColor: 'text-blue-600 font-bold', badgeClass: 'bg-blue-50 text-blue-700' },
    { key: 0, name: '일요일', short: '일', textColor: 'text-rose-600 font-bold', badgeClass: 'bg-rose-50 text-rose-700' },
  ];

  const calculateWeekdayData = (sourceReports: any[]) => {
    let grandLunch = 0;
    let grandDinner = 0;
    let grandNight = 0;
    let grandTotal = 0;
    let grandRecordedDays = 0;

    const list: WeekdayItem[] = WEEKDAYS.map(w => {
      let count = 0;
      let lunch = 0;
      let dinner = 0;
      let night = 0;

      sourceReports.forEach(r => {
        if (!r.date) return;
        const [y, m, d] = r.date.split('-').map(Number);
        if (!y || !m || !d) return;
        const dow = new Date(y, m - 1, d).getDay();
        if (dow === w.key) {
          const l = parseAmount(r.sales?.lunch?.amount || r.lunchSales?.amount);
          const dn = parseAmount(r.sales?.dinner?.amount || r.dinnerSales?.amount);
          const nt = parseAmount(r.sales?.night?.amount || r.nightSales?.amount);
          const tot = l + dn + nt;
          if (tot > 0) {
            count += 1;
            lunch += l;
            dinner += dn;
            night += nt;
          }
        }
      });

      const total = lunch + dinner + night;
      const avgTotal = count > 0 ? Math.round(total / count) : 0;
      const avgLunch = count > 0 ? Math.round(lunch / count) : 0;
      const avgDinner = count > 0 ? Math.round(dinner / count) : 0;
      const avgNight = count > 0 ? Math.round(night / count) : 0;

      grandLunch += lunch;
      grandDinner += dinner;
      grandNight += night;
      grandTotal += total;
      grandRecordedDays += count;

      return {
        ...w,
        count,
        lunch,
        dinner,
        night,
        total,
        avgTotal,
        avgLunch,
        avgDinner,
        avgNight,
      };
    });

    const grandAvg = grandRecordedDays > 0 ? Math.round(grandTotal / grandRecordedDays) : 0;
    const grandAvgLunch = grandRecordedDays > 0 ? Math.round(grandLunch / grandRecordedDays) : 0;
    const grandAvgDinner = grandRecordedDays > 0 ? Math.round(grandDinner / grandRecordedDays) : 0;
    const grandAvgNight = grandRecordedDays > 0 ? Math.round(grandNight / grandRecordedDays) : 0;

    let maxTotalDay = list[0];
    let maxAvgDay = list[0];
    list.forEach(item => {
      if (item.total > (maxTotalDay?.total || 0)) maxTotalDay = item;
      if (item.avgTotal > (maxAvgDay?.avgTotal || 0)) maxAvgDay = item;
    });

    return {
      list,
      grandLunch,
      grandDinner,
      grandNight,
      grandTotal,
      grandRecordedDays,
      grandAvg,
      grandAvgLunch,
      grandAvgDinner,
      grandAvgNight,
      maxTotalDay,
      maxAvgDay,
    };
  };

  const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const monthlyReports = reportsHistory.filter(r => r.date && r.date.startsWith(monthPrefix));
  const monthStats = calculateWeekdayData(monthlyReports);

  const yearlyReports = reportsHistory.filter(r => r.date && r.date.startsWith(`${selectedYear}-`));
  const yearStats = calculateWeekdayData(yearlyReports);

  const activeStats = viewMode === 'month' ? monthStats : yearStats;
  const isAnnual = viewMode === 'year';

  const handlePrev = () => {
    if (viewMode === 'month') {
      if (selectedMonth === 1) {
        setSelectedYear(y => y - 1);
        setSelectedMonth(12);
      } else {
        setSelectedMonth(m => m - 1);
      }
    } else {
      setSelectedYear(y => y - 1);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      if (selectedMonth === 12) {
        setSelectedYear(y => y + 1);
        setSelectedMonth(1);
      } else {
        setSelectedMonth(m => m + 1);
      }
    } else {
      setSelectedYear(y => y + 1);
    }
  };

  const handleReset = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  // Time slot heatmap color
  const getHeatmapColor = (value: number) => {
    if (value >= 1200000) return 'bg-rose-500 text-white';
    if (value >= 800000) return 'bg-rose-300 text-rose-900';
    if (value >= 400000) return 'bg-rose-100 text-rose-800';
    if (value === 0) return 'bg-gray-50 text-gray-400 border border-dashed border-gray-200';
    return 'bg-white text-gray-700 border border-rose-100';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Main Section Switcher */}
      <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          onClick={() => setAdminSection('stats')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
            adminSection === 'stats'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>경영 통계 분석</span>
        </button>

        <button
          onClick={() => setAdminSection('reports')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
            adminSection === 'reports'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>월별 영업일보 리포트</span>
        </button>

        <button
          onClick={() => setAdminSection('users')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
            adminSection === 'users'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>사용자(직원) 계정 관리</span>
        </button>
      </div>

      {adminSection === 'reports' ? (
        <MonthlyReportList />
      ) : adminSection === 'users' ? (
        <UserManagement />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-indigo-600 rounded-xl shadow-md shadow-indigo-200">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">관리자 센터 경영 분석</h2>
                <p className="text-xs text-gray-500">요일별 매출 합계 & 평균 분석 및 1년 단위 연간 패턴 통계</p>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-white p-1 rounded-xl border border-gray-200/80 shadow-2xs">
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'month' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  월간 요일별 분석
                </button>
                <button
                  onClick={() => setViewMode('year')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'year' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  1년 단위 연간 분석
                </button>
                <button
                  onClick={() => setViewMode('matrix')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'matrix' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  1년 매트릭스 (1~12월)
                </button>
                <button
                  onClick={() => setViewMode('timeslot')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'timeslot' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  시간대별 히트맵
                </button>
              </div>

              {/* Navigator */}
              <div className="flex items-center gap-0.5 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs">
                <button
                  onClick={handlePrev}
                  className="p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-lg transition-colors"
                  title="이전"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="text-xs font-bold text-gray-800 px-2 whitespace-nowrap">
                  {viewMode === 'month' ? `${selectedYear}년 ${selectedMonth}월` : `${selectedYear}년`}
                </span>

                <button
                  onClick={handleNext}
                  className="p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-lg transition-colors"
                  title="다음"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {(selectedYear !== currentYear || (viewMode === 'month' && selectedMonth !== currentMonth)) && (
                  <button
                    onClick={handleReset}
                    className="ml-1 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[11px] font-bold flex items-center gap-0.5 transition-colors"
                    title="현재 기준 복귀"
                  >
                    <RotateCcw className="w-3 h-3" />
                    현재
                  </button>
                )}
              </div>
            </div>
          </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs relative overflow-hidden">
          <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            최고 매출 요일
          </div>
          <div className="text-base font-black text-gray-800">
            {activeStats.maxTotalDay?.total > 0 ? activeStats.maxTotalDay.name : '-'}
          </div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
            {activeStats.maxTotalDay?.total > 0 
              ? `${(activeStats.maxTotalDay.total / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원`
              : '0원'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs relative overflow-hidden">
          <div className="text-[11px] font-bold text-blue-600 flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5" />
            최고 1일 평균 요일
          </div>
          <div className="text-base font-black text-gray-800">
            {activeStats.maxAvgDay?.avgTotal > 0 ? activeStats.maxAvgDay.name : '-'}
          </div>
          <div className="text-[11px] text-blue-600 font-semibold mt-0.5">
            {activeStats.maxAvgDay?.avgTotal > 0 
              ? `일평균 ${(activeStats.maxAvgDay.avgTotal / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원`
              : '0원'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs relative overflow-hidden">
          <div className="text-[11px] font-bold text-violet-600 flex items-center gap-1.5 mb-1">
            <CalendarDays className="w-3.5 h-3.5" />
            영업 기록일수
          </div>
          <div className="text-base font-black text-gray-800">
            {activeStats.grandRecordedDays}일
          </div>
          <div className="text-[11px] text-violet-600 font-semibold mt-0.5">
            전체 일평균 {(activeStats.grandAvg / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs relative overflow-hidden">
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            {isAnnual ? '연간 누적 총 매출' : `${selectedMonth}월 누적 총 매출`}
          </div>
          <div className="text-base font-black text-gray-800">
            {(activeStats.grandTotal / 10000).toLocaleString(undefined, { maximumFractionDigits: 0 })}만원
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {activeStats.grandTotal.toLocaleString()}원
          </div>
        </div>
      </div>

      {/* Main Table: Weekday Breakdown (Month or 1-Year) */}
      {(viewMode === 'month' || viewMode === 'year') && (
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-2xs border border-gray-100">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-gray-800 text-sm md:text-base">
                {viewMode === 'month' ? `${selectedYear}년 ${selectedMonth}월 요일별 매출 합계 & 평균표` : `${selectedYear}년 1년 단위 요일별 매출 합계 & 평균표`}
              </h3>
            </div>
            <span className="text-[11px] text-gray-400 font-medium">
              (단위: 만원 / 원)
            </span>
          </div>

          <div className="overflow-x-auto border border-gray-200/70 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-2.5 py-2.5 font-bold text-center whitespace-nowrap">요일</th>
                  <th className="px-2.5 py-2.5 font-bold text-center whitespace-nowrap">영업일수</th>
                  <th className="px-2.5 py-2.5 font-bold text-right whitespace-nowrap">점심 합계 (평균)</th>
                  <th className="px-2.5 py-2.5 font-bold text-right whitespace-nowrap">저녁 합계 (평균)</th>
                  <th className="px-2.5 py-2.5 font-bold text-right whitespace-nowrap">야간 합계 (평균)</th>
                  <th className="px-2.5 py-2.5 font-bold text-right whitespace-nowrap bg-indigo-50/60 text-indigo-900">
                    {isAnnual ? '연간 요일별 합계 매출' : '월간 요일별 합계 매출'}
                  </th>
                  <th className="px-2.5 py-2.5 font-bold text-right whitespace-nowrap bg-blue-50/60 text-blue-900">
                    요일별 1일 평균 매출
                  </th>
                  <th className="px-2.5 py-2.5 font-bold text-center whitespace-nowrap">매출 비중</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {activeStats.list.map(item => {
                  const share = activeStats.grandTotal > 0 
                    ? ((item.total / activeStats.grandTotal) * 100).toFixed(1) 
                    : '0.0';
                  const isMax = activeStats.maxTotalDay?.key === item.key && item.total > 0;

                  return (
                    <tr key={item.key} className={`hover:bg-gray-50/80 transition-colors ${isMax ? 'bg-indigo-50/20' : ''}`}>
                      <td className="px-2.5 py-2.5 text-center font-bold whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${item.badgeClass}`}>
                          {item.name}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 text-center text-gray-600 font-medium whitespace-nowrap text-xs">
                        {item.count > 0 ? `${item.count}일` : '-'}
                      </td>
                      <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                        <div className="font-semibold text-gray-800 text-xs">
                          {item.lunch > 0 ? `${(item.lunch / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원` : '-'}
                        </div>
                        {item.count > 0 && item.lunch > 0 && (
                          <div className="text-[10px] text-gray-400">
                            평균 {(item.avgLunch / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만
                          </div>
                        )}
                      </td>
                      <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                        <div className="font-semibold text-gray-800 text-xs">
                          {item.dinner > 0 ? `${(item.dinner / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원` : '-'}
                        </div>
                        {item.count > 0 && item.dinner > 0 && (
                          <div className="text-[10px] text-gray-400">
                            평균 {(item.avgDinner / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만
                          </div>
                        )}
                      </td>
                      <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                        <div className="font-semibold text-gray-800 text-xs">
                          {item.night > 0 ? `${(item.night / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원` : '-'}
                        </div>
                        {item.count > 0 && item.night > 0 && (
                          <div className="text-[10px] text-gray-400">
                            평균 {(item.avgNight / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만
                          </div>
                        )}
                      </td>
                      <td className="px-2.5 py-2.5 text-right whitespace-nowrap bg-indigo-50/30">
                        <div className="font-bold text-indigo-700 text-xs">
                          {item.total > 0 ? `${(item.total / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원` : '0원'}
                        </div>
                        <div className="text-[10px] text-indigo-500">
                          {item.total > 0 ? `${item.total.toLocaleString()}원` : ''}
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5 text-right whitespace-nowrap bg-blue-50/30">
                        <div className="font-bold text-blue-700 text-xs">
                          {item.count > 0 ? `${(item.avgTotal / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원` : '-'}
                        </div>
                        {item.count > 0 && (
                          <div className="text-[10px] text-blue-500">
                            {item.avgTotal.toLocaleString()}원/일
                          </div>
                        )}
                      </td>
                      <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <span className="font-semibold text-gray-700 text-xs">{share}%</span>
                          <div className="w-10 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-indigo-500 h-full rounded-full" 
                              style={{ width: `${Math.min(100, Number(share) * 3)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs">
                <tr>
                  <td className="px-2.5 py-2.5 text-center text-gray-900 font-bold">
                    전체 합계
                  </td>
                  <td className="px-2.5 py-2.5 text-center text-gray-900 font-bold">
                    {activeStats.grandRecordedDays}일
                  </td>
                  <td className="px-2.5 py-2.5 text-right text-gray-900 font-bold">
                    {(activeStats.grandLunch / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원
                  </td>
                  <td className="px-2.5 py-2.5 text-right text-gray-900 font-bold">
                    {(activeStats.grandDinner / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원
                  </td>
                  <td className="px-2.5 py-2.5 text-right text-gray-900 font-bold">
                    {(activeStats.grandNight / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원
                  </td>
                  <td className="px-2.5 py-2.5 text-right text-indigo-800 bg-indigo-100/60 font-bold text-xs">
                    {(activeStats.grandTotal / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원
                  </td>
                  <td className="px-2.5 py-2.5 text-right text-blue-800 bg-blue-100/60 font-bold text-xs">
                    {(activeStats.grandAvg / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원
                  </td>
                  <td className="px-2.5 py-2.5 text-center text-gray-900 font-bold">
                    100.0%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 1-Year Matrix View (1월 ~ 12월 x 요일별) */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-2xs border border-gray-100">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-gray-800 text-sm md:text-base">
                {selectedYear}년 연간 월별 × 요일별 매출 종합 매트릭스
              </h3>
            </div>
            <span className="text-[11px] text-gray-400 font-medium">
              (각 칸: 요일 총매출 / 요일 일평균)
            </span>
          </div>

          <div className="overflow-x-auto border border-gray-200/70 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-2 py-2.5 font-bold text-center whitespace-nowrap">월</th>
                  {WEEKDAYS.map(w => (
                    <th key={w.key} className="px-2 py-2.5 font-bold text-right whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] ${w.badgeClass}`}>
                        {w.short}요일
                      </span>
                    </th>
                  ))}
                  <th className="px-2 py-2.5 font-bold text-right whitespace-nowrap bg-indigo-50/60 text-indigo-900">
                    월 총합계
                  </th>
                  <th className="px-2 py-2.5 font-bold text-right whitespace-nowrap bg-blue-50/60 text-blue-900">
                    월 일평균
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                  const mPrefix = `${selectedYear}-${String(m).padStart(2, '0')}`;
                  const mReports = reportsHistory.filter(r => r.date && r.date.startsWith(mPrefix));
                  const mData = calculateWeekdayData(mReports);
                  const isCurrentM = selectedYear === currentYear && m === currentMonth;

                  return (
                    <tr key={m} className={`hover:bg-gray-50/80 transition-colors ${isCurrentM ? 'bg-indigo-50/20' : ''}`}>
                      <td className="px-2 py-2 text-center font-bold text-gray-900 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${isCurrentM ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                          {m}월
                        </span>
                      </td>
                      {mData.list.map(w => (
                        <td key={w.key} className="px-2 py-2 text-right whitespace-nowrap">
                          {w.total > 0 ? (
                            <div>
                              <div className="font-semibold text-gray-800 text-xs">
                                {(w.total / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만
                              </div>
                              <div className="text-[10px] text-gray-400">
                                평균 {(w.avgTotal / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-right whitespace-nowrap bg-indigo-50/30 font-bold text-indigo-700 text-xs">
                        {mData.grandTotal > 0 ? `${(mData.grandTotal / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원` : '-'}
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap bg-blue-50/30 font-bold text-blue-700 text-xs">
                        {mData.grandRecordedDays > 0 ? `${(mData.grandAvg / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs">
                <tr>
                  <td className="px-2 py-2.5 text-center text-gray-900 font-bold">
                    {selectedYear}년 연간 합계
                  </td>
                  {yearStats.list.map(w => (
                    <td key={w.key} className="px-2 py-2.5 text-right font-bold text-gray-900 whitespace-nowrap">
                      <div>{(w.total / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만</div>
                      <div className="text-[10px] text-indigo-600 font-medium">평균 {(w.avgTotal / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만</div>
                    </td>
                  ))}
                  <td className="px-2 py-2.5 text-right text-indigo-800 bg-indigo-100/60 font-bold text-xs whitespace-nowrap">
                    {(yearStats.grandTotal / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원
                  </td>
                  <td className="px-2 py-2.5 text-right text-blue-800 bg-blue-100/60 font-bold text-xs whitespace-nowrap">
                    {(yearStats.grandAvg / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Time Slot Heatmap View */}
      {viewMode === 'timeslot' && (
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-2xs border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2 text-rose-500">
              <Clock className="w-4 h-4" />
              <h3 className="font-bold text-gray-800 text-sm md:text-base">
                {selectedYear}년 요일별 × 시간대(점심·저녁·야간) 평균 매출 매트릭스
              </h3>
            </div>
            {/* Heatmap Legend */}
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
              <span>매출 규모:</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 border border-gray-200 text-gray-400">0원</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">40만+</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-300 text-rose-900 font-semibold">80만+</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold">120만+</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200/70 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-3 py-2.5 font-bold text-center whitespace-nowrap bg-gray-100/70 text-gray-800 w-28">
                    시간대 / 요일
                  </th>
                  {WEEKDAYS.map((w) => (
                    <th key={w.key} className="px-2 py-2.5 font-bold text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${w.badgeClass}`}>
                        {w.name}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-bold text-center whitespace-nowrap bg-indigo-50/70 text-indigo-900 w-24">
                    시간대 평균
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {/* 1. 점심 */}
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2 bg-gray-50/40 text-gray-800 font-bold whitespace-nowrap">
                    <div className="text-xs">점심 타임</div>
                    <div className="text-[10px] text-gray-400 font-normal">11:00 ~ 15:00</div>
                  </td>
                  {yearStats.list.map((w) => (
                    <td key={w.key} className="p-1.5 text-center">
                      <div className={`
                        py-1.5 px-2 rounded-lg flex flex-col items-center justify-center transition-all hover:scale-[1.02]
                        ${getHeatmapColor(w.avgLunch)}
                      `}>
                        <span className="text-[11px] font-bold leading-tight">
                          {w.avgLunch > 0 ? `${(w.avgLunch / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만` : '-'}
                        </span>
                        {w.avgLunch > 0 && (
                          <span className="text-[9px] opacity-75 font-normal leading-tight">
                            누적 {(w.lunch / 10000).toLocaleString(undefined, { maximumFractionDigits: 0 })}만
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right bg-indigo-50/20 font-bold text-indigo-700 whitespace-nowrap">
                    <div className="text-xs">
                      {yearStats.grandAvgLunch > 0 ? `${(yearStats.grandAvgLunch / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원` : '-'}
                    </div>
                    <div className="text-[9px] text-indigo-400 font-normal">
                      누적 {(yearStats.grandLunch / 10000).toLocaleString(undefined, { maximumFractionDigits: 0 })}만
                    </div>
                  </td>
                </tr>

                {/* 2. 저녁 */}
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2 bg-gray-50/40 text-gray-800 font-bold whitespace-nowrap">
                    <div className="text-xs">저녁 타임</div>
                    <div className="text-[10px] text-gray-400 font-normal">17:00 ~ 22:00</div>
                  </td>
                  {yearStats.list.map((w) => (
                    <td key={w.key} className="p-1.5 text-center">
                      <div className={`
                        py-1.5 px-2 rounded-lg flex flex-col items-center justify-center transition-all hover:scale-[1.02]
                        ${getHeatmapColor(w.avgDinner)}
                      `}>
                        <span className="text-[11px] font-bold leading-tight">
                          {w.avgDinner > 0 ? `${(w.avgDinner / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만` : '-'}
                        </span>
                        {w.avgDinner > 0 && (
                          <span className="text-[9px] opacity-75 font-normal leading-tight">
                            누적 {(w.dinner / 10000).toLocaleString(undefined, { maximumFractionDigits: 0 })}만
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right bg-indigo-50/20 font-bold text-indigo-700 whitespace-nowrap">
                    <div className="text-xs">
                      {yearStats.grandAvgDinner > 0 ? `${(yearStats.grandAvgDinner / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원` : '-'}
                    </div>
                    <div className="text-[9px] text-indigo-400 font-normal">
                      누적 {(yearStats.grandDinner / 10000).toLocaleString(undefined, { maximumFractionDigits: 0 })}만
                    </div>
                  </td>
                </tr>

                {/* 3. 야간 */}
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2 bg-gray-50/40 text-gray-800 font-bold whitespace-nowrap">
                    <div className="text-xs">야간 타임</div>
                    <div className="text-[10px] text-gray-400 font-normal">22:00 ~ 익일</div>
                  </td>
                  {yearStats.list.map((w) => (
                    <td key={w.key} className="p-1.5 text-center">
                      <div className={`
                        py-1.5 px-2 rounded-lg flex flex-col items-center justify-center transition-all hover:scale-[1.02]
                        ${getHeatmapColor(w.avgNight)}
                      `}>
                        <span className="text-[11px] font-bold leading-tight">
                          {w.avgNight > 0 ? `${(w.avgNight / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만` : '-'}
                        </span>
                        {w.avgNight > 0 && (
                          <span className="text-[9px] opacity-75 font-normal leading-tight">
                            누적 {(w.night / 10000).toLocaleString(undefined, { maximumFractionDigits: 0 })}만
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right bg-indigo-50/20 font-bold text-indigo-700 whitespace-nowrap">
                    <div className="text-xs">
                      {yearStats.grandAvgNight > 0 ? `${(yearStats.grandAvgNight / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원` : '-'}
                    </div>
                    <div className="text-[9px] text-indigo-400 font-normal">
                      누적 {(yearStats.grandNight / 10000).toLocaleString(undefined, { maximumFractionDigits: 0 })}만
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs">
                <tr>
                  <td className="px-3 py-2.5 text-center text-gray-900 font-bold bg-gray-100/80 whitespace-nowrap">
                    요일별 1일 평균
                  </td>
                  {yearStats.list.map((w) => (
                    <td key={w.key} className="px-2 py-2 text-center font-bold text-blue-700 bg-blue-50/30 whitespace-nowrap">
                      <div className="text-xs font-black">
                        {w.count > 0 ? `${(w.avgTotal / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원` : '-'}
                      </div>
                      <div className="text-[9px] text-gray-400 font-normal">
                        ({w.count}일)
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right text-blue-900 bg-blue-100/60 font-black text-xs whitespace-nowrap">
                    {(yearStats.grandAvg / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Insight Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-2xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform">
            <TrendingDown className="w-20 h-20 text-rose-500" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-1.5 text-rose-500 font-bold mb-2 text-xs">
              <TrendingDown className="w-4 h-4" />
              <span>핵심 모니터링 포인트 (보완 필요)</span>
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1.5">
              {activeStats.list.reduce((min, cur) => (cur.total < min.total && cur.total > 0 ? cur : min), activeStats.list[0])?.name || '주초'} 시간대 분석
            </h3>
            <p className="text-gray-500 leading-relaxed text-xs">
              매출 비중이 상대적으로 낮은 요일 및 시간대에는 타임 할인이나 타겟 프로모션을 통하여 객수를 유치하고, 인력 배치를 유연하게 조율하는 것이 효과적입니다.
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-2xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-20 h-20 text-indigo-500" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-1.5 text-indigo-600 font-bold mb-2 text-xs">
              <TrendingUp className="w-4 h-4" />
              <span>피크 타임 & 매출 견인 요일</span>
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1.5">
              {activeStats.maxTotalDay?.name || '금/토요일'} 피크 집중 운영
            </h3>
            <p className="text-gray-500 leading-relaxed text-xs">
              {activeStats.maxTotalDay?.name || '주말'}은 전체 매출의 큰 비중을 차지하므로, 피크 시간대(저녁/야간) 식자재 전처리 및 홀 인력을 집중 투입하여 회전율을 극대화하는 전략이 권장됩니다.
            </p>
          </div>
        </div>
      </div>

        <div className="bg-gray-50 p-4 rounded-2xl flex items-start gap-3 border border-gray-100">
          <div className="p-1.5 bg-white rounded-lg shadow-2xs">
            <Info className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            이 대시보드는 실제 영업일보 저장 내역을 실시간으로 집계하여 월별, 연간 단위의 요일별 매출 합계와 1일 평균 매출 추이를 분석합니다. 상단의 필터를 통해 월간, 1년 단위 연간, 연간 매트릭스, 시간대별 히트맵으로 자유롭게 전환하여 조회하실 수 있습니다.
          </p>
        </div>
      </>
    )}
  </div>
);
}

