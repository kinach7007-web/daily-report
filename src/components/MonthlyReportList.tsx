import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { DailyReportRecord } from '../types';
import DailyReportViewer from './DailyReportViewer';
import { 
  Calendar, 
  CalendarDays, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Search, 
  TrendingUp, 
  Users, 
  Gift, 
  Star, 
  Trash2, 
  Eye, 
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  CalendarRange
} from 'lucide-react';

export default function MonthlyReportList() {
  const [reports, setReports] = useState<DailyReportRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<DailyReportRecord | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  // Sync from localStorage & Firestore
  useEffect(() => {
    // 1. Initial load from localStorage
    try {
      const localData: DailyReportRecord[] = JSON.parse(localStorage.getItem('dailyReportsHistory') || '[]');
      setReports(localData);
    } catch (e) {
      console.error('Local storage parse error:', e);
    }

    // 2. Realtime listener from Firestore dailyReports
    let unsubscribe = () => {};
    try {
      const reportsRef = collection(db, 'dailyReports');
      unsubscribe = onSnapshot(reportsRef, (snapshot) => {
        const firestoreList: DailyReportRecord[] = [];
        snapshot.forEach((docSnap) => {
          firestoreList.push({
            id: docSnap.id,
            ...(docSnap.data() as any)
          });
        });

        if (firestoreList.length > 0) {
          // Merge local + firestore (prefer firestore if conflict, ensure unique dates)
          const localData: DailyReportRecord[] = JSON.parse(localStorage.getItem('dailyReportsHistory') || '[]');
          const combinedMap = new Map<string, DailyReportRecord>();
          
          localData.forEach(r => combinedMap.set(r.date, r));
          firestoreList.forEach(r => combinedMap.set(r.date, r));

          const merged = Array.from(combinedMap.values()).sort((a, b) => b.date.localeCompare(a.date));
          setReports(merged);
          localStorage.setItem('dailyReportsHistory', JSON.stringify(merged));
        }
      }, (err) => {
        console.warn('Firestore dailyReports sync note:', err);
      });
    } catch (err) {
      console.warn('Firestore dailyReports listener error:', err);
    }

    const handleStorageChange = () => {
      try {
        const localData: DailyReportRecord[] = JSON.parse(localStorage.getItem('dailyReportsHistory') || '[]');
        setReports(localData);
      } catch (e) {}
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const parseNum = (v: any) => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    const clean = String(v).replace(/[^0-9.-]+/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
  };

  // Filter reports
  const filteredReports = reports.filter(r => {
    if (!r.date) return false;
    if (selectedYear !== 'all' && !r.date.startsWith(selectedYear)) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchDate = r.date.includes(term);
      const matchWriter = (r.writer || '').toLowerCase().includes(term);
      const matchDay = (r.dayOfWeek || '').toLowerCase().includes(term);
      return matchDate || matchWriter || matchDay;
    }
    return true;
  });

  // Group by Month (YYYY-MM)
  const groupedByMonth: Record<string, DailyReportRecord[]> = {};
  filteredReports.forEach(report => {
    const monthKey = report.date.substring(0, 7); // e.g. "2026-08"
    if (!groupedByMonth[monthKey]) {
      groupedByMonth[monthKey] = [];
    }
    groupedByMonth[monthKey].push(report);
  });

  // Sort month keys descending (newest month first)
  const sortedMonthKeys = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

  // Extract available years for filter
  const availableYears = Array.from(new Set(reports.map(r => r.date?.substring(0, 4)).filter(Boolean))).sort().reverse();

  const toggleMonthCollapse = (monthKey: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  // Delete report
  const handleDeleteReport = async (report: DailyReportRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`[${report.date}] 일일 영업일보 리포트를 정말로 삭제하시겠습니까?`)) {
      return;
    }

    try {
      // 1. Delete from Firestore if exists
      if (report.id || report.date) {
        await deleteDoc(doc(db, 'dailyReports', report.id || report.date));
      }
    } catch (e) {
      console.warn('Firestore doc delete note:', e);
    }

    // 2. Remove from localStorage
    const updated = reports.filter(r => r.date !== report.date);
    setReports(updated);
    localStorage.setItem('dailyReportsHistory', JSON.stringify(updated));
  };

  const getDayOfWeekBadge = (dateStr: string, explicitDay?: string) => {
    let dayStr = explicitDay;
    if (!dayStr) {
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      try {
        const d = new Date(dateStr + 'T00:00:00');
        dayStr = days[d.getDay()];
      } catch {
        dayStr = '';
      }
    }

    if (dayStr === '일') return <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[11px]">일요일</span>;
    if (dayStr === '토') return <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">토요일</span>;
    if (dayStr === '금') return <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">금요일</span>;
    return <span className="text-gray-700 font-medium bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">{dayStr ? `${dayStr}요일` : ''}</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shadow-sm">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-black text-gray-800">월별 영업일보 리포트 보관함</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              영업일보 대시보드에서 저장된 일일 결산 데이터를 월별로 분류하여 조회하고 상세 리포트를 확인할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-rose-50/80 border border-rose-100 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700">
          <CheckCircle2 className="w-4 h-4 text-rose-600" />
          <span>보관된 총 리포트: {reports.length}건</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="날짜 (예: 2026-08-25), 작성자 검색..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all"
          />
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
            <CalendarRange className="w-3.5 h-3.5" />
            연도:
          </span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white cursor-pointer"
          >
            <option value="all">전체 연도</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>

          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              검색 초기화
            </button>
          )}
        </div>
      </div>

      {/* Monthly Report Groups */}
      {sortedMonthKeys.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-2xs">
          <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-3xl mx-auto flex items-center justify-center mb-3">
            <FileText className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-gray-700">저장된 영업일보 리포트가 없습니다</h4>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            [영업 일보] 탭에서 오늘의 영업 현황을 입력한 후 상단의 [저장] 버튼을 누르면 이곳에 월별로 자동 정리됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMonthKeys.map((monthKey) => {
            const monthReports = groupedByMonth[monthKey];
            const isCollapsed = Boolean(collapsedMonths[monthKey]);

            // Calculate Monthly Totals for header
            const [y, m] = monthKey.split('-');
            const monthTotalSales = monthReports.reduce((acc, r) => acc + (r.sales?.totalAmount || 0), 0);
            const monthTotalCount = monthReports.reduce((acc, r) => acc + (r.sales?.totalCount || 0), 0);

            return (
              <div key={monthKey} className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
                
                {/* Month Group Header */}
                <div
                  onClick={() => toggleMonthCollapse(monthKey)}
                  className="p-4 sm:p-5 bg-gradient-to-r from-gray-50 to-white hover:bg-gray-100/70 border-b border-gray-100 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-gray-900">
                          {y}년 {parseInt(m, 10)}월
                        </h4>
                        <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-[11px] font-black">
                          총 {monthReports.length}일 기록
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        월간 누적 매출: <strong className="text-blue-600 font-black">{monthTotalSales.toLocaleString()}원</strong> ({monthTotalCount.toLocaleString()}건)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
                    >
                      {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Month Group Items List */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-100">
                    {monthReports.map((report) => {
                      const totalAmt = report.sales?.totalAmount || 0;
                      const totalCnt = report.sales?.totalCount || 0;
                      const avgTicket = totalCnt > 0 ? Math.round(totalAmt / totalCnt) : 0;

                      // Reviews
                      const revKindness = parseNum(report.reviews?.kindness?.count);
                      const revDelicious = parseNum(report.reviews?.delicious?.count);
                      const revNormal = parseNum(report.reviews?.normal?.count);
                      const revUncomfortable = parseNum(report.reviews?.uncomfortable?.count);
                      const totalRev = revKindness + revDelicious + revNormal + revUncomfortable;

                      // Discounts
                      const discMkt = parseNum(report.discount?.marketing?.amount);
                      const discEvt = parseNum(report.discount?.event?.amount);
                      const discOth = parseNum(report.discount?.other?.amount);
                      const totalDisc = discMkt + discEvt + discOth;

                      return (
                        <div
                          key={report.date}
                          onClick={() => setSelectedReport(report)}
                          className="p-4 hover:bg-rose-50/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer group"
                        >
                          {/* Left: Date, Day badge, Writer */}
                          <div className="flex items-center gap-3.5 min-w-[200px]">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200/80 group-hover:bg-rose-50 group-hover:border-rose-200 text-gray-600 group-hover:text-rose-600 flex items-center justify-center transition-colors shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-black text-gray-900 group-hover:text-rose-600 transition-colors">
                                  {report.date}
                                </span>
                                {getDayOfWeekBadge(report.date, report.dayOfWeek)}
                              </div>
                              <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                                작성자: <span className="text-gray-700 font-semibold">{report.writer || '영업담당자'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Middle: Sales & Time Slot breakdown badges */}
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/70 text-right">
                              <span className="text-[10px] font-bold text-gray-400 block">총 매출 실적</span>
                              <span className="text-sm font-black text-blue-600">{totalAmt.toLocaleString()}원</span>
                              <span className="text-[10px] text-gray-500 ml-1">({totalCnt}건)</span>
                            </div>

                            <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/70 text-right">
                              <span className="text-[10px] font-bold text-gray-400 block">평균 객단가</span>
                              <span className="text-xs font-bold text-amber-700">{avgTicket.toLocaleString()}원</span>
                            </div>

                            {totalDisc > 0 && (
                              <div className="bg-rose-50/60 px-2.5 py-1.5 rounded-xl border border-rose-100 text-right">
                                <span className="text-[10px] font-bold text-rose-500 block">할인/서비스</span>
                                <span className="text-xs font-bold text-rose-700">{totalDisc.toLocaleString()}원</span>
                              </div>
                            )}

                            {totalRev > 0 && (
                              <div className="flex items-center gap-1 text-[11px] bg-yellow-50/80 px-2.5 py-1.5 rounded-xl border border-yellow-200/80 text-yellow-800 font-bold">
                                <Star className="w-3.5 h-3.5 text-yellow-600 fill-yellow-500" />
                                <span>리뷰 {totalRev}건</span>
                                {revUncomfortable > 0 && (
                                  <span className="ml-1 text-rose-600 font-bold">(불편 {revUncomfortable})</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center justify-end gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReport(report);
                              }}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>리포트 보기</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteReport(report, e)}
                              className="p-1.5 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                              title="리포트 삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Daily Report Detail Modal */}
      {selectedReport && (
        <DailyReportViewer
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

    </div>
  );
}
