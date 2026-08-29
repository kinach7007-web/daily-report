import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, setDoc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { DailyReportRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import CheerModal from './CheerModal';
import { 
  Save, 
  Megaphone, 
  TrendingUp, 
  Package, 
  Wrench, 
  Star, 
  UserPlus, 
  CheckSquare,
  Calendar,
  Gift,
  Edit2,
  CheckCircle2
} from 'lucide-react';

// Reusable card wrapper
export const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col ${className}`}>
    {children}
  </div>
);

export const getTodayKST = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date()); // returns YYYY-MM-DD
};

export const getBusinessDate = () => {
  const active = localStorage.getItem('activeReportDate');
  if (active) {
    return active;
  }
  const today = getTodayKST();
  localStorage.setItem('activeReportDate', today);
  return today;
};

export default function DailyReport() {
  const { currentUser } = useAuth();
  const [currentBusinessDate, setCurrentBusinessDate] = useState<string>(() => getBusinessDate());
  const selectedDate = currentBusinessDate;

  // Load state from draft or dailyReportsHistory for specific date only
  const loadStateForDate = (date: string) => {
    let draft: any = null;
    const draftStr = localStorage.getItem(`daily_report_draft_${date}`);
    if (draftStr) {
      try {
        draft = JSON.parse(draftStr);
      } catch (e) {}
    }

    const savedReports: DailyReportRecord[] = JSON.parse(localStorage.getItem('dailyReportsHistory') || '[]');
    const record = savedReports.find(r => r.date === date);

    // If both exist, merge smartly: Confirmed sections or non-empty sections from saved record take precedence if draft is empty/unlocked
    const lunch = (record?.sales?.lunch?.isLocked ? record.sales.lunch : draft?.lunchSales) || record?.sales?.lunch || { amount: '', count: '', isLocked: false };
    const dinner = (record?.sales?.dinner?.isLocked ? record.sales.dinner : draft?.dinnerSales) || record?.sales?.dinner || { amount: '', count: '', isLocked: false };
    const night = (record?.sales?.night?.isLocked ? record.sales.night : draft?.nightSales) || record?.sales?.night || { amount: '', count: '', isLocked: false };

    const reviewKindness = (record?.reviews?.kindness?.isLocked ? record.reviews.kindness : draft?.reviewKindness) || record?.reviews?.kindness || { count: '', isLocked: false };
    const reviewDelicious = (record?.reviews?.delicious?.isLocked ? record.reviews.delicious : draft?.reviewDelicious) || record?.reviews?.delicious || { count: '', isLocked: false };
    const reviewNormal = (record?.reviews?.normal?.isLocked ? record.reviews.normal : draft?.reviewNormal) || record?.reviews?.normal || { count: '', isLocked: false };
    const reviewUncomfortable = (record?.reviews?.uncomfortable?.isLocked ? record.reviews.uncomfortable : draft?.reviewUncomfortable) || record?.reviews?.uncomfortable || { count: '', isLocked: false };
    const reviewDetails = (record?.reviews?.details?.isLocked ? record.reviews.details : draft?.reviewDetails) || record?.reviews?.details || { service: '', facility: '', food: '', other: '', note: '', isLocked: false };
    const isReviewsLocked = record?.reviews?.details?.isLocked ?? draft?.isReviewsLocked ?? false;

    const fridgeTemps = (record?.fridgeTemps?.isLocked ? record.fridgeTemps : draft?.fridgeTemps) || record?.fridgeTemps || { kitchen1: '', kitchen2: '', hall1: '', hall2: '', drink: '', alcohol: '', storage1: '', storage2: '', isLocked: false };
    const discountStatus = (record?.discount?.isLocked ? record.discount : draft?.discountStatus) || record?.discount || {
      marketing: { amount: '', count: '' },
      event: { amount: '', count: '' },
      other: { amount: '', count: '', note: '' },
      isLocked: false
    };

    if (draft || record) {
      return {
        lunchSales: lunch,
        dinnerSales: dinner,
        nightSales: night,
        reviewKindness,
        reviewDelicious,
        reviewNormal,
        reviewUncomfortable,
        reviewDetails,
        isReviewsLocked,
        fridgeTemps,
        discountStatus
      };
    }

    return null;
  };

  const initialValues = loadStateForDate(selectedDate);

  const [lunchSales, setLunchSales] = useState(initialValues?.lunchSales || { amount: '', count: '', isLocked: false });
  const [dinnerSales, setDinnerSales] = useState(initialValues?.dinnerSales || { amount: '', count: '', isLocked: false });
  const [nightSales, setNightSales] = useState(initialValues?.nightSales || { amount: '', count: '', isLocked: false });

  const [reviewKindness, setReviewKindness] = useState(initialValues?.reviewKindness || { count: '', isLocked: false });
  const [reviewDelicious, setReviewDelicious] = useState(initialValues?.reviewDelicious || { count: '', isLocked: false });
  const [reviewNormal, setReviewNormal] = useState(initialValues?.reviewNormal || { count: '', isLocked: false });
  const [reviewUncomfortable, setReviewUncomfortable] = useState(initialValues?.reviewUncomfortable || { count: '', isLocked: false });
  const [reviewDetails, setReviewDetails] = useState(initialValues?.reviewDetails || {
    service: '', facility: '', food: '', other: '', note: '', isLocked: false
  });

  const [isReviewsLocked, setIsReviewsLocked] = useState(initialValues?.isReviewsLocked || false);

  const [fridgeTemps, setFridgeTemps] = useState(initialValues?.fridgeTemps || {
    kitchen1: '', kitchen2: '', hall1: '', hall2: '', drink: '', alcohol: '', storage1: '', storage2: '', isLocked: false
  });

  const [discountStatus, setDiscountStatus] = useState(initialValues?.discountStatus || {
    marketing: { amount: '', count: '' },
    event: { amount: '', count: '' },
    other: { amount: '', count: '', note: '' },
    isLocked: false
  });

  const [toastMessage, setToastMessage] = useState('');
  const [showCheerModal, setShowCheerModal] = useState(false);
  const [lastSavedDate, setLastSavedDate] = useState('');

  const [touchStartY, setTouchStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const parseAmount = (val: string) => parseInt((val || '').replace(/[^0-9]/g, ''), 10) || 0;
  
  // Calculate net values for cumulative inputs
  const netDinnerAmount = Math.max(0, parseAmount(dinnerSales.amount) - parseAmount(lunchSales.amount));
  const netDinnerCount = Math.max(0, parseAmount(dinnerSales.count) - parseAmount(lunchSales.count));
  const netNightAmount = Math.max(0, parseAmount(nightSales.amount) - parseAmount(dinnerSales.amount));
  const netNightCount = Math.max(0, parseAmount(nightSales.count) - parseAmount(dinnerSales.count));

  const totalAmount = parseAmount(lunchSales.amount) + netDinnerAmount + netNightAmount;
  const totalCount = parseAmount(lunchSales.count) + netDinnerCount + netNightCount;

  const totalReviews = parseAmount(reviewKindness.count) + 
                       parseAmount(reviewDelicious.count) + 
                       parseAmount(reviewNormal.count) + 
                       parseAmount(reviewUncomfortable.count);

  const formatNumber = (val: string) => {
    const num = (val || '').replace(/[^0-9]/g, '');
    return num ? Number(num).toLocaleString() : '';
  };

  const isRemoteUpdateRef = useRef(false);
  const isInitializedFromCloudRef = useRef(false);

  // Real-time Firestore synchronization listener for selectedDate
  const fetchCloudData = async (force = false) => {
    try {
      const docRef = doc(db, 'dailyReports', selectedDate);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const record = docSnap.data() as DailyReportRecord;
        if (record && record.sales) {
          const savedReports: DailyReportRecord[] = JSON.parse(localStorage.getItem('dailyReportsHistory') || '[]');
          const idx = savedReports.findIndex(r => r.date === selectedDate);
          if (idx >= 0) {
            savedReports[idx] = record;
          } else {
            savedReports.unshift(record);
          }
          localStorage.setItem('dailyReportsHistory', JSON.stringify(savedReports));
          window.dispatchEvent(new Event('storage'));

          // Update form state with latest cloud record
          isRemoteUpdateRef.current = true;
          if (record.sales?.lunch) {
            setLunchSales(prev => (record.sales.lunch.isLocked || !prev.isLocked || force) ? record.sales.lunch : prev);
          }
          if (record.sales?.dinner) {
            setDinnerSales(prev => (record.sales.dinner.isLocked || !prev.isLocked || force) ? record.sales.dinner : prev);
          }
          if (record.sales?.night) {
            setNightSales(prev => (record.sales.night.isLocked || !prev.isLocked || force) ? record.sales.night : prev);
          }
          if (record.reviews) {
            const isServerReviewsLocked = record.reviews.details?.isLocked;
            if (record.reviews.kindness) setReviewKindness(prev => (isServerReviewsLocked || !prev.isLocked || force) ? record.reviews.kindness : prev);
            if (record.reviews.delicious) setReviewDelicious(prev => (isServerReviewsLocked || !prev.isLocked || force) ? record.reviews.delicious : prev);
            if (record.reviews.normal) setReviewNormal(prev => (isServerReviewsLocked || !prev.isLocked || force) ? record.reviews.normal : prev);
            if (record.reviews.uncomfortable) setReviewUncomfortable(prev => (isServerReviewsLocked || !prev.isLocked || force) ? record.reviews.uncomfortable : prev);
            if (record.reviews.details) {
              setReviewDetails(prev => (isServerReviewsLocked || !prev.isLocked || force) ? record.reviews.details : prev);
              setIsReviewsLocked(isServerReviewsLocked || false);
            }
          }
          if (record.fridgeTemps) {
            setFridgeTemps(prev => (record.fridgeTemps?.isLocked || !prev.isLocked || force) ? record.fridgeTemps : prev);
          }
          if (record.discount) {
            setDiscountStatus(prev => (record.discount?.isLocked || !prev.isLocked || force) ? record.discount : prev);
          }
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 300);
        }
      }
    } catch (e) {
      console.error("Manual fetch cloud data error:", e);
    } finally {
      isInitializedFromCloudRef.current = true;
    }
  };

  // Real-time synchronization listener for system business status (active business date & closing across all users)
  useEffect(() => {
    try {
      const statusDocRef = doc(db, 'system', 'businessStatus');
      const unsubscribeStatus = onSnapshot(statusDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.activeBusinessDate) {
            const newActiveDate = data.activeBusinessDate;
            const currentActiveInStorage = localStorage.getItem('activeReportDate');
            
            if (currentActiveInStorage !== newActiveDate || currentBusinessDate !== newActiveDate) {
              localStorage.setItem('activeReportDate', newActiveDate);
              window.dispatchEvent(new Event('storage'));
              setCurrentBusinessDate(newActiveDate);

              if (data.lastClosedDate) {
                setToastMessage(`📢 ${data.closedBy || '영업담당자'}님이 ${data.lastClosedDate} 영업을 마감하여 ${newActiveDate} 영업일로 전환되었습니다.`);
                setTimeout(() => setToastMessage(''), 5000);
              }
            }
          }
        }
      }, (err) => {
        console.warn('System businessStatus sync note:', err);
      });
      return () => {
        unsubscribeStatus();
      };
    } catch (e) {
      console.warn('System businessStatus listener setup error:', e);
    }
  }, [currentBusinessDate]);

  // Real-time synchronization listener for all daily reports across users
  useEffect(() => {
    try {
      const reportsRef = collection(db, 'dailyReports');
      const unsubscribeAll = onSnapshot(reportsRef, (snapshot) => {
        const firestoreList: DailyReportRecord[] = [];
        snapshot.forEach((docSnap) => {
          firestoreList.push({
            id: docSnap.id,
            ...(docSnap.data() as any)
          });
        });
        if (firestoreList.length > 0) {
          const localData: DailyReportRecord[] = JSON.parse(localStorage.getItem('dailyReportsHistory') || '[]');
          const combinedMap = new Map<string, DailyReportRecord>();
          localData.forEach(r => combinedMap.set(r.date, r));
          firestoreList.forEach(r => combinedMap.set(r.date, r));
          const merged = Array.from(combinedMap.values()).sort((a, b) => b.date.localeCompare(a.date));
          localStorage.setItem('dailyReportsHistory', JSON.stringify(merged));
          window.dispatchEvent(new Event('storage'));
        }
      }, (err) => {
        console.warn('Global dailyReports sync note:', err);
      });
      return () => {
        unsubscribeAll();
      };
    } catch (e) {
      console.warn('Global dailyReports sync error:', e);
    }
  }, []);

  // On-demand fetch cloud data for selectedDate when changing date or manual sync
  useEffect(() => {
    isInitializedFromCloudRef.current = false;
    fetchCloudData(false);
    const docRef = doc(db, 'dailyReports', selectedDate);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      isInitializedFromCloudRef.current = true;
      if (docSnap.exists()) {
        const record = docSnap.data() as DailyReportRecord;
        if (record && record.sales) {
          // Update history list safely in background
          const savedReports: DailyReportRecord[] = JSON.parse(localStorage.getItem('dailyReportsHistory') || '[]');
          const idx = savedReports.findIndex(r => r.date === selectedDate);
          if (idx >= 0) {
            savedReports[idx] = record;
          } else {
            savedReports.unshift(record);
          }
          localStorage.setItem('dailyReportsHistory', JSON.stringify(savedReports));
          window.dispatchEvent(new Event('storage'));

          // Smart section-by-section sync:
          // If a section is locked/confirmed on the server, or if the local section is unlocked and not actively being typed in, update it!
          isRemoteUpdateRef.current = true;
          
          if (record.sales?.lunch) {
            setLunchSales(prev => (record.sales.lunch.isLocked || !prev.isLocked) ? record.sales.lunch : prev);
          }
          if (record.sales?.dinner) {
            setDinnerSales(prev => (record.sales.dinner.isLocked || !prev.isLocked) ? record.sales.dinner : prev);
          }
          if (record.sales?.night) {
            setNightSales(prev => (record.sales.night.isLocked || !prev.isLocked) ? record.sales.night : prev);
          }
          if (record.reviews) {
            const isServerReviewsLocked = record.reviews.details?.isLocked;
            if (record.reviews.kindness) setReviewKindness(prev => (isServerReviewsLocked || !prev.isLocked) ? record.reviews.kindness : prev);
            if (record.reviews.delicious) setReviewDelicious(prev => (isServerReviewsLocked || !prev.isLocked) ? record.reviews.delicious : prev);
            if (record.reviews.normal) setReviewNormal(prev => (isServerReviewsLocked || !prev.isLocked) ? record.reviews.normal : prev);
            if (record.reviews.uncomfortable) setReviewUncomfortable(prev => (isServerReviewsLocked || !prev.isLocked) ? record.reviews.uncomfortable : prev);
            if (record.reviews.details) {
              setReviewDetails(prev => (isServerReviewsLocked || !prev.isLocked) ? record.reviews.details : prev);
              setIsReviewsLocked(isServerReviewsLocked || false);
            }
          }
          if (record.fridgeTemps) {
            setFridgeTemps(prev => (record.fridgeTemps?.isLocked || !prev.isLocked) ? record.fridgeTemps : prev);
          }
          if (record.discount) {
            setDiscountStatus(prev => (record.discount?.isLocked || !prev.isLocked) ? record.discount : prev);
          }

          // Update the local draft file to stay consistent
          const mergedStateObj = {
            lunchSales: record.sales?.lunch || lunchSales,
            dinnerSales: record.sales?.dinner || dinnerSales,
            nightSales: record.sales?.night || nightSales,
            reviewKindness: record.reviews?.kindness || reviewKindness,
            reviewDelicious: record.reviews?.delicious || reviewDelicious,
            reviewNormal: record.reviews?.normal || reviewNormal,
            reviewUncomfortable: record.reviews?.uncomfortable || reviewUncomfortable,
            reviewDetails: record.reviews?.details || reviewDetails,
            isReviewsLocked: record.reviews?.details?.isLocked ?? isReviewsLocked,
            fridgeTemps: record.fridgeTemps || fridgeTemps,
            discountStatus: record.discount || discountStatus
          };
          localStorage.setItem(`daily_report_draft_${selectedDate}`, JSON.stringify(mergedStateObj));

          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 300);
        }
      }
    }, (error) => {
      console.error("DailyReport real-time sync error:", error);
    });

    return () => {
      unsubscribe();
    };
  }, [selectedDate]);

  // When date changes from outside, sync fields to that date
  useEffect(() => {
    if (isRemoteUpdateRef.current) return;
    const vals = loadStateForDate(selectedDate);
    if (vals) {
      setLunchSales(vals.lunchSales);
      setDinnerSales(vals.dinnerSales);
      setNightSales(vals.nightSales);
      setReviewKindness(vals.reviewKindness);
      setReviewDelicious(vals.reviewDelicious);
      setReviewNormal(vals.reviewNormal);
      setReviewUncomfortable(vals.reviewUncomfortable);
      setReviewDetails(vals.reviewDetails);
      setIsReviewsLocked(vals.isReviewsLocked);
      setFridgeTemps(vals.fridgeTemps);
      setDiscountStatus(vals.discountStatus);
    } else {
      const initSales = { amount: '', count: '', isLocked: false };
      setLunchSales(initSales);
      setDinnerSales(initSales);
      setNightSales(initSales);
      setReviewKindness({ count: '', isLocked: false });
      setReviewDelicious({ count: '', isLocked: false });
      setReviewNormal({ count: '', isLocked: false });
      setReviewUncomfortable({ count: '', isLocked: false });
      setReviewDetails({ service: '', facility: '', food: '', other: '', note: '', isLocked: false });
      setIsReviewsLocked(false);
      setFridgeTemps({ kitchen1: '', kitchen2: '', hall1: '', hall2: '', drink: '', alcohol: '', storage1: '', storage2: '', isLocked: false });
      setDiscountStatus({
        marketing: { amount: '', count: '' },
        event: { amount: '', count: '' },
        other: { amount: '', count: '', note: '' },
        isLocked: false
      });
    }
  }, [selectedDate]);

  // Helper to build the current complete report object
  const buildCurrentReportObject = (overrides?: {
    lunch?: typeof lunchSales;
    dinner?: typeof dinnerSales;
    night?: typeof nightSales;
    reviews?: {
      kindness: typeof reviewKindness;
      delicious: typeof reviewDelicious;
      normal: typeof reviewNormal;
      uncomfortable: typeof reviewUncomfortable;
      details: typeof reviewDetails;
      isLocked?: boolean;
    };
    discount?: typeof discountStatus;
    fridgeTemps?: typeof fridgeTemps;
  }): DailyReportRecord => {
    const today = selectedDate;
    const authorName = currentUser ? `${currentUser.name} (${currentUser.role})` : '영업담당자';
    const nowTimeStr = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const daysKor = ['일', '월', '화', '수', '목', '금', '토'];
    const [curYear, curMon, curDay] = today.split('-').map(Number);
    const targetKorDay = daysKor[new Date(curYear, curMon - 1, curDay).getDay()] || '월';

    const currentLunch = overrides?.lunch || lunchSales;
    const currentDinner = overrides?.dinner || dinnerSales;
    const currentNight = overrides?.night || nightSales;
    const currentDiscount = overrides?.discount || discountStatus;
    const currentFridge = overrides?.fridgeTemps || fridgeTemps;
    
    const curNetDinnerAmt = Math.max(0, parseAmount(currentDinner.amount) - parseAmount(currentLunch.amount));
    const curNetDinnerCnt = Math.max(0, parseAmount(currentDinner.count) - parseAmount(currentLunch.count));
    const curNetNightAmt = Math.max(0, parseAmount(currentNight.amount) - parseAmount(currentDinner.amount));
    const curNetNightCnt = Math.max(0, parseAmount(currentNight.count) - parseAmount(currentDinner.count));

    const curTotalAmount = parseAmount(currentLunch.amount) + curNetDinnerAmt + curNetNightAmt;
    const curTotalCount = parseAmount(currentLunch.count) + curNetDinnerCnt + curNetNightCnt;

    const currentReviews = overrides?.reviews ? {
      kindness: overrides.reviews.kindness,
      delicious: overrides.reviews.delicious,
      normal: overrides.reviews.normal,
      uncomfortable: overrides.reviews.uncomfortable,
      details: { ...overrides.reviews.details, isLocked: overrides.reviews.isLocked ?? isReviewsLocked },
      totalReviews: parseAmount(overrides.reviews.kindness.count) + 
                    parseAmount(overrides.reviews.delicious.count) + 
                    parseAmount(overrides.reviews.normal.count) + 
                    parseAmount(overrides.reviews.uncomfortable.count)
    } : {
      kindness: reviewKindness,
      delicious: reviewDelicious,
      normal: reviewNormal,
      uncomfortable: reviewUncomfortable,
      details: { ...reviewDetails, isLocked: isReviewsLocked },
      totalReviews
    };

    return {
      id: today,
      date: today,
      dayOfWeek: targetKorDay,
      writer: authorName,
      savedAt: nowTimeStr,
      sales: {
        lunch: currentLunch,
        dinner: currentDinner,
        night: currentNight,
        netDinnerAmount: curNetDinnerAmt,
        netDinnerCount: curNetDinnerCnt,
        netNightAmount: curNetNightAmt,
        netNightCount: curNetNightCnt,
        totalAmount: curTotalAmount,
        totalCount: curTotalCount,
        avgTicket: curTotalCount > 0 ? Math.round(curTotalAmount / curTotalCount) : 0
      },
      reviews: currentReviews,
      discount: currentDiscount,
      fridgeTemps: currentFridge
    };
  };

  // Explicit Save Handler called ONLY when user clicks [확정], [수정], [확인], [전체 확정]
  const saveConfirmedSection = async (
    reportPayload: DailyReportRecord,
    message: string
  ) => {
    try {
      const today = selectedDate;

      // 1. Update dailyReportsHistory for instant reflected charts & calendar
      const savedReports: DailyReportRecord[] = JSON.parse(localStorage.getItem('dailyReportsHistory') || '[]');
      const idx = savedReports.findIndex(r => r.date === today);
      if (idx >= 0) {
        savedReports[idx] = {
          ...savedReports[idx],
          ...reportPayload,
          sales: { ...savedReports[idx].sales, ...reportPayload.sales },
          reviews: { ...savedReports[idx].reviews, ...reportPayload.reviews },
          discount: { ...savedReports[idx].discount, ...reportPayload.discount },
          fridgeTemps: { ...savedReports[idx].fridgeTemps, ...reportPayload.fridgeTemps }
        };
      } else {
        savedReports.unshift(reportPayload);
      }
      localStorage.setItem('dailyReportsHistory', JSON.stringify(savedReports));
      window.dispatchEvent(new Event('storage'));

      // 2. Keep local draft updated with newest state
      const stateObj = {
        lunchSales: reportPayload.sales.lunch,
        dinnerSales: reportPayload.sales.dinner,
        nightSales: reportPayload.sales.night,
        reviewKindness: reportPayload.reviews.kindness,
        reviewDelicious: reportPayload.reviews.delicious,
        reviewNormal: reportPayload.reviews.normal,
        reviewUncomfortable: reportPayload.reviews.uncomfortable,
        reviewDetails: reportPayload.reviews.details,
        isReviewsLocked: reportPayload.reviews.details?.isLocked || false,
        fridgeTemps: reportPayload.fridgeTemps,
        discountStatus: reportPayload.discount
      };
      localStorage.setItem(`daily_report_draft_${today}`, JSON.stringify(stateObj));

      // 3. Save to Firestore DB explicitly
      await setDoc(doc(db, 'dailyReports', today), {
        ...reportPayload,
        updatedAt: Timestamp.now()
      }, { merge: true });

      setToastMessage(message);
      setTimeout(() => setToastMessage(''), 2500);
    } catch (err) {
      console.error('Error saving confirmed section:', err);
      setToastMessage('저장 중 문제가 발생했습니다.');
      setTimeout(() => setToastMessage(''), 2500);
    }
  };

  // Keep draft updated locally only (for browser refresh safety, without calling cloud or overwriting history)
  useEffect(() => {
    if (isRemoteUpdateRef.current) return;
    const stateObj = {
      lunchSales,
      dinnerSales,
      nightSales,
      reviewKindness,
      reviewDelicious,
      reviewNormal,
      reviewUncomfortable,
      reviewDetails,
      isReviewsLocked,
      fridgeTemps,
      discountStatus
    };
    localStorage.setItem(`daily_report_draft_${selectedDate}`, JSON.stringify(stateObj));
  }, [lunchSales, dinnerSales, nightSales, reviewKindness, reviewDelicious, reviewNormal, reviewUncomfortable, reviewDetails, isReviewsLocked, fridgeTemps, discountStatus, selectedDate]);



  const handleSaveDailyReport = async () => {
    const today = selectedDate;
    
    // Get all un-saved complaints, interviews, checklist
    const allComplaints = JSON.parse(localStorage.getItem('complaintsList') || '[]');
    const allInterviews = JSON.parse(localStorage.getItem('interviewsList') || '[]');
    const newHireChecklist = JSON.parse(localStorage.getItem('newHireChecklist') || '[]');
    const adminChecklist = JSON.parse(localStorage.getItem('adminChecklist') || '[]');
    const improvementsList = JSON.parse(localStorage.getItem('improvementsList') || '[]');
    const announcements = JSON.parse(localStorage.getItem('announcements') || '{"text":""}');
    const inventory = JSON.parse(localStorage.getItem('inventory') || '{}');

    // Track Weekly Checklist Progress
    const getMostRecentResetTime = () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const resetTime = new Date(now);
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      resetTime.setDate(now.getDate() + diffToMonday);
      resetTime.setHours(12, 0, 0, 0);
      if (now.getTime() < resetTime.getTime()) {
        resetTime.setDate(resetTime.getDate() - 7);
      }
      return resetTime.getTime();
    };

    let weeklyTracker = { lastResetTime: getMostRecentResetTime(), tasks: {} as Record<string, string[]> };
    const savedWeeklyStr = localStorage.getItem('weeklyLowSalesTracker');
    if (savedWeeklyStr) {
      try {
        const parsed = JSON.parse(savedWeeklyStr);
        if (parsed.lastResetTime === getMostRecentResetTime()) {
          weeklyTracker = parsed;
        }
      } catch (e) {}
    }

    const daysKor = ['일', '월', '화', '수', '목', '금', '토'];
    const todayKorStr = daysKor[new Date().getDay()];

    const lowSalesItems = adminChecklist.filter((item: any) => item.category === '점심 100만원 이하 요일별 체크리스트' && item.checked);
    lowSalesItems.forEach((item: any) => {
      if (!weeklyTracker.tasks[item.task]) {
        weeklyTracker.tasks[item.task] = [];
      }
      if (!weeklyTracker.tasks[item.task].includes(todayKorStr)) {
        weeklyTracker.tasks[item.task].push(todayKorStr);
      }
    });
    localStorage.setItem('weeklyLowSalesTracker', JSON.stringify(weeklyTracker));

    const [curYear, curMon, curDay] = today.split('-').map(Number);
    const dateObj = new Date(curYear, curMon - 1, curDay);
    const targetKorDay = daysKor[dateObj.getDay()] || todayKorStr;
    const authorName = currentUser ? `${currentUser.name} (${currentUser.role})` : '영업담당자';
    const nowTimeStr = new Date().toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const reportData: DailyReportRecord = {
      id: today,
      date: today,
      dayOfWeek: targetKorDay,
      writer: authorName,
      savedAt: nowTimeStr,
      isConfirmed: true,
      sales: { 
        lunch: { ...lunchSales, isLocked: true }, 
        dinner: { ...dinnerSales, isLocked: true }, 
        night: { ...nightSales, isLocked: true },
        netDinnerAmount,
        netDinnerCount,
        netNightAmount,
        netNightCount,
        totalAmount, 
        totalCount,
        avgTicket: totalCount > 0 ? Math.round(totalAmount / totalCount) : 0
      },
      improvements: improvementsList,
      reviews: { 
        kindness: { ...reviewKindness, isLocked: true }, 
        delicious: { ...reviewDelicious, isLocked: true }, 
        normal: { ...reviewNormal, isLocked: true }, 
        uncomfortable: { ...reviewUncomfortable, isLocked: true }, 
        details: { ...reviewDetails, isLocked: true },
        totalReviews
      },
      discount: { ...discountStatus, isLocked: true },
      fridgeTemps: { ...fridgeTemps, isLocked: true },
      announcements: announcements.text,
      complaints: allComplaints,
      interviews: allInterviews,
      inventory,
      newHireChecklist,
      adminChecklist
    };

    const savedReports = JSON.parse(localStorage.getItem('dailyReportsHistory') || '[]');
    const existingIndex = savedReports.findIndex((r: any) => r.date === today);
    
    if (existingIndex >= 0) {
      const existing = savedReports[existingIndex];
      // Merge sales 
      const mergedSales = {
          lunch: reportData.sales.lunch.amount ? reportData.sales.lunch : existing.sales.lunch,
          dinner: reportData.sales.dinner.amount ? reportData.sales.dinner : existing.sales.dinner,
          night: reportData.sales.night.amount ? reportData.sales.night : existing.sales.night,
          netDinnerAmount: reportData.sales.netDinnerAmount || existing.sales.netDinnerAmount || 0,
          netDinnerCount: reportData.sales.netDinnerCount || existing.sales.netDinnerCount || 0,
          netNightAmount: reportData.sales.netNightAmount || existing.sales.netNightAmount || 0,
          netNightCount: reportData.sales.netNightCount || existing.sales.netNightCount || 0,
          totalAmount: reportData.sales.totalAmount || existing.sales.totalAmount,
          totalCount: reportData.sales.totalCount || existing.sales.totalCount,
          avgTicket: reportData.sales.avgTicket || existing.sales.avgTicket || 0
      };

      // Merge Reviews
      const mergedReviews = {
          kindness: reportData.reviews.kindness.count ? reportData.reviews.kindness : existing.reviews.kindness,
          delicious: reportData.reviews.delicious.count ? reportData.reviews.delicious : existing.reviews.delicious,
          normal: reportData.reviews.normal.count ? reportData.reviews.normal : existing.reviews.normal,
          uncomfortable: reportData.reviews.uncomfortable.count ? reportData.reviews.uncomfortable : existing.reviews.uncomfortable,
          details: reportData.reviews.details.note ? reportData.reviews.details : existing.reviews.details,
          totalReviews: reportData.reviews.totalReviews || existing.reviews.totalReviews || 0
      };

      const mergedFridgeTemps = Object.values(reportData.fridgeTemps).some(v => v) ? reportData.fridgeTemps : (existing.fridgeTemps || fridgeTemps);
      const mergedDiscount = (reportData.discount.marketing.amount || reportData.discount.event.amount || reportData.discount.other.amount) ? reportData.discount : (existing.discount || discountStatus);
      const mergedAnnounce = reportData.announcements || existing.announcements;
      const mergedInventory = Object.values(reportData.inventory).some(v => v) ? reportData.inventory : existing.inventory;
      
      const uniqueArrayMerge = (arr1: any[], arr2: any[]) => {
        return [...arr1, ...arr2].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      };

      savedReports[existingIndex] = {
         id: today,
         date: today,
         dayOfWeek: targetKorDay,
         writer: authorName,
         savedAt: nowTimeStr,
         sales: mergedSales,
         improvements: uniqueArrayMerge(existing.improvements || [], reportData.improvements || []),
         reviews: mergedReviews,
         discount: mergedDiscount,
         fridgeTemps: mergedFridgeTemps,
         announcements: mergedAnnounce,
         complaints: uniqueArrayMerge(existing.complaints || [], reportData.complaints || []),
         interviews: uniqueArrayMerge(existing.interviews || [], reportData.interviews || []),
         inventory: mergedInventory,
         newHireChecklist: reportData.newHireChecklist.some((h:any) => h.name) ? reportData.newHireChecklist : (existing.newHireChecklist || []),
         adminChecklist: reportData.adminChecklist.length > 0 ? reportData.adminChecklist : (existing.adminChecklist || [])
      };
    } else {
      savedReports.unshift(reportData);
    }
    
    // Save report to localStorage
    localStorage.setItem('dailyReportsHistory', JSON.stringify(savedReports));
    window.dispatchEvent(new Event('storage'));

    // Calculate next day (e.g., 2026-08-25 -> 2026-08-26)
    const [currY, currM, currD] = today.split('-').map(Number);
    const targetDateObj = new Date(currY, currM - 1, currD);
    targetDateObj.setDate(targetDateObj.getDate() + 1);
    const nextY = targetDateObj.getFullYear();
    const nextM = String(targetDateObj.getMonth() + 1).padStart(2, '0');
    const nextD = String(targetDateObj.getDate()).padStart(2, '0');
    const nextDateStr = `${nextY}-${nextM}-${nextD}`;

    // Set next business date
    localStorage.setItem('activeReportDate', nextDateStr);

    // Reset all daily working input fields for the new day
    const initSales = { amount: '', count: '', isLocked: false };
    setLunchSales(initSales);
    setDinnerSales(initSales);
    setNightSales(initSales);

    const initReviews = { count: '', isLocked: false };
    setReviewKindness(initReviews);
    setReviewDelicious(initReviews);
    setReviewNormal(initReviews);
    setReviewUncomfortable(initReviews);

    const initReviewDetails = { service: '', facility: '', food: '', other: '', note: '', isLocked: false };
    setReviewDetails(initReviewDetails);
    setIsReviewsLocked(false);

    const initFridgeTemps = { kitchen1: '', kitchen2: '', hall1: '', hall2: '', drink: '', alcohol: '', storage1: '', storage2: '', isLocked: false };
    setFridgeTemps(initFridgeTemps);

    const initDiscount = {
      marketing: { amount: '', count: '' },
      event: { amount: '', count: '' },
      other: { amount: '', count: '', note: '' },
      isLocked: false
    };
    setDiscountStatus(initDiscount);

    // Update active state in component
    setCurrentBusinessDate(nextDateStr);

    // INITIAL_CHECKLIST structure for reset
    const INITIAL_CHECKLIST = [
      { id: 1, category: '일일 관리자 체크리스트', task: '겉절이 익힘정도 확인', checked: false },
      { id: 2, category: '일일 관리자 체크리스트', task: '오전 출근후 밥상태확인(말라붙은밥)', checked: false },
      { id: 3, category: '일일 관리자 체크리스트', task: '뼈상태확인(냉동뼈 변질여부)', checked: false },
      { id: 4, category: '일일 관리자 체크리스트', task: '냉장고 야채 신선도 확인', checked: false },
      { id: 5, category: '일일 관리자 체크리스트', task: '팀원 근태 확인', checked: false },
      { id: 6, category: '점심 100만원 이하 요일별 체크리스트', task: '하수구 청소', checked: false },
      { id: 7, category: '점심 100만원 이하 요일별 체크리스트', task: '주방 벽면다이 & 세척기 맞은편 다이 청소', checked: false },
      { id: 8, category: '점심 100만원 이하 요일별 체크리스트', task: '물통 설거지', checked: false },
      { id: 9, category: '점심 100만원 이하 요일별 체크리스트', task: '바닥 누른때 제거', checked: false },
    ];
    localStorage.setItem('adminChecklist', JSON.stringify(INITIAL_CHECKLIST));

    setLastSavedDate(today);
    setShowCheerModal(true);

    // Sync to Firestore for persistence & notifications
    try {
      await setDoc(doc(db, 'dailyReports', today), reportData, { merge: true });
      await addDoc(collection(db, 'reports'), {
        writer: authorName,
        type: '영업일보',
        title: '영업일보 대시보드 마감',
        date: today,
        totalSales: reportData.sales.totalAmount,
        totalCount: reportData.sales.totalCount,
        createdAt: Timestamp.now()
      });

      // Update global store business status in Firestore to instantly transition all connected users/devices
      await setDoc(doc(db, 'system', 'businessStatus'), {
        activeBusinessDate: nextDateStr,
        lastClosedDate: today,
        lastClosedAt: Timestamp.now(),
        closedBy: authorName
      }, { merge: true });

      localStorage.removeItem(`daily_report_draft_${today}`);
    } catch (e) {
      console.error('Firestore sync failed', e);
    }
  };

  return (
    <div 
      className="space-y-6 animate-in fade-in duration-500 pb-10 relative select-none"
      onTouchStart={(e) => {
        if (window.scrollY === 0) {
          setTouchStartY(e.touches[0].clientY);
        }
      }}
      onTouchMove={(e) => {
        if (window.scrollY === 0 && touchStartY > 0) {
          const currentY = e.touches[0].clientY;
          const diff = currentY - touchStartY;
          if (diff > 0) {
            setPullDistance(Math.min(diff * 0.4, 100));
          }
        }
      }}
      onTouchEnd={async () => {
        if (pullDistance > 50 && !isRefreshing) {
          setIsRefreshing(true);
          await fetchCloudData();
          setToastMessage('🔄 클라우드 최신 데이터를 동기화했습니다!');
          setTimeout(() => setToastMessage(''), 3000);
          setIsRefreshing(false);
        }
        setTouchStartY(0);
        setPullDistance(0);
      }}
    >
      {/* Pull to Refresh Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="flex items-center justify-center text-xs font-semibold text-gray-500 transition-all overflow-hidden"
          style={{ height: `${isRefreshing ? 40 : pullDistance}px` }}
        >
          <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full shadow-sm border border-gray-200">
            <span className={`inline-block ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
            <span>{isRefreshing ? '클라우드 동기화 중...' : pullDistance > 50 ? '놓아서 새로고침' : '아래로 내려서 동기화'}</span>
          </div>
        </div>
      )}

      {/* Celebration Cheer Modal */}
      <CheerModal
        isOpen={showCheerModal}
        onClose={() => setShowCheerModal(false)}
        savedDate={lastSavedDate}
      />

      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">영업 일보 대시보드</h2>
          <p className="text-sm text-gray-500 mt-1">오늘 하루의 영업 현황을 한눈에 파악하고 관리하세요.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 md:flex-none">
            <Calendar className="w-4 h-4 text-gray-500 mr-2" />
            <input 
              type="date" 
              className="bg-transparent border-none outline-none text-sm font-medium text-gray-700 w-full cursor-pointer" 
              value={currentBusinessDate}
              onChange={(e) => {
                const newDate = e.target.value;
                if (newDate) {
                  setCurrentBusinessDate(newDate);
                  localStorage.setItem('activeReportDate', newDate);
                  window.dispatchEvent(new Event('storage'));
                }
              }}
              title="영업일 선택"
            />
          </div>
          <button 
            onClick={() => {
              const today = getTodayKST();
              setCurrentBusinessDate(today);
              localStorage.setItem('activeReportDate', today);
              window.dispatchEvent(new Event('storage'));
            }}
            className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors whitespace-nowrap"
            title="오늘 날짜로 이동"
          >
            오늘
          </button>
          <div>
            <button onClick={handleSaveDailyReport} className="bg-rose-400 hover:bg-rose-500 text-white px-5 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md font-medium whitespace-nowrap">
              <Save className="w-4 h-4" />
              마감
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 1. 매출 현황 (Sales) */}
        <Card className="lg:col-span-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
              매출 현황
            </h3>
            <div className="text-right flex gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">총 건수</p>
                <p className="text-xl font-black text-gray-700 tracking-tight">
                  {totalCount > 0 ? totalCount.toLocaleString() + '건' : '0건'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">총 매출액</p>
                <p className="text-xl font-black text-blue-600 tracking-tight">
                  {totalAmount > 0 ? totalAmount.toLocaleString() + '원' : '0원'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Lunch Input */}
            <div className={`p-4 rounded-2xl border transition-all ${lunchSales.isLocked ? 'bg-white border-blue-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> 점심 매출 (15:00)
                </h4>
                {lunchSales.isLocked ? (
                  <button 
                    onClick={() => {
                      const newLunch = { ...lunchSales, isLocked: false };
                      setLunchSales(newLunch);
                      const payload = buildCurrentReportObject({ lunch: newLunch });
                      saveConfirmedSection(payload, '점심 매출이 수정 모드로 전환되었습니다.');
                    }} 
                    className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                  >
                    수정
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      const newLunch = { ...lunchSales, isLocked: true };
                      setLunchSales(newLunch);
                      const payload = buildCurrentReportObject({ lunch: newLunch });
                      saveConfirmedSection(payload, '점심 매출이 확정 및 저장되었습니다.');
                    }} 
                    className="text-[10px] bg-rose-400 text-white px-2.5 py-1 rounded-lg hover:bg-rose-500 transition-colors font-semibold shadow-sm"
                  >
                    확정
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 w-12">매출액</label>
                  {lunchSales.isLocked ? (
                    <p className="text-sm font-bold text-gray-800 px-1 w-28 text-right">{lunchSales.amount || '0'}원</p>
                  ) : (
                    <input type="text" className="w-28 bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-right" placeholder="0원" value={lunchSales.amount} onChange={e => setLunchSales({...lunchSales, amount: formatNumber(e.target.value)})} />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 w-12">건수</label>
                  {lunchSales.isLocked ? (
                    <p className="text-sm font-bold text-gray-800 px-1 w-28 text-right">{lunchSales.count || '0'}건</p>
                  ) : (
                    <input type="text" className="w-28 bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-right" placeholder="0건" value={lunchSales.count} onChange={e => setLunchSales({...lunchSales, count: formatNumber(e.target.value)})} />
                  )}
                </div>
              </div>
            </div>

            {/* Dinner Input */}
            <div className={`p-4 rounded-2xl border transition-all ${dinnerSales.isLocked ? 'bg-white border-blue-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span> 저녁 매출 (22:00)
                </h4>
                {dinnerSales.isLocked ? (
                  <button 
                    onClick={() => {
                      const newDinner = { ...dinnerSales, isLocked: false };
                      setDinnerSales(newDinner);
                      const payload = buildCurrentReportObject({ dinner: newDinner });
                      saveConfirmedSection(payload, '저녁 매출이 수정 모드로 전환되었습니다.');
                    }} 
                    className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                  >
                    수정
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      const newDinner = { ...dinnerSales, isLocked: true };
                      setDinnerSales(newDinner);
                      const payload = buildCurrentReportObject({ dinner: newDinner });
                      saveConfirmedSection(payload, '저녁 매출이 확정 및 저장되었습니다.');
                    }} 
                    className="text-[10px] bg-rose-400 text-white px-2.5 py-1 rounded-lg hover:bg-rose-500 transition-colors font-semibold shadow-sm"
                  >
                    확정
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 w-12">매출액</label>
                  {dinnerSales.isLocked ? (
                    <p className="text-sm font-bold text-indigo-600 px-1 w-28 text-right">{netDinnerAmount.toLocaleString()}원</p>
                  ) : (
                    <div className="flex flex-col items-end">
                      <input type="text" className="w-28 bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-right" placeholder="누적 매출" value={dinnerSales.amount} onChange={e => setDinnerSales({...dinnerSales, amount: formatNumber(e.target.value)})} />
                      {dinnerSales.amount && <span className="text-[10px] text-gray-400 mt-0.5">실적: {netDinnerAmount.toLocaleString()}원</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 w-12">건수</label>
                  {dinnerSales.isLocked ? (
                    <p className="text-sm font-bold text-indigo-600 px-1 w-28 text-right">{netDinnerCount.toLocaleString()}건</p>
                  ) : (
                    <div className="flex flex-col items-end">
                      <input type="text" className="w-28 bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-right" placeholder="누적 건수" value={dinnerSales.count} onChange={e => setDinnerSales({...dinnerSales, count: formatNumber(e.target.value)})} />
                      {dinnerSales.count && <span className="text-[10px] text-gray-400 mt-0.5">실적: {netDinnerCount.toLocaleString()}건</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Night Input */}
            <div className={`p-4 rounded-2xl border transition-all ${nightSales.isLocked ? 'bg-white border-blue-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span> 야간 매출 (10:00)
                </h4>
                {nightSales.isLocked ? (
                  <button 
                    onClick={() => {
                      const newNight = { ...nightSales, isLocked: false };
                      setNightSales(newNight);
                      const payload = buildCurrentReportObject({ night: newNight });
                      saveConfirmedSection(payload, '야간 매출이 수정 모드로 전환되었습니다.');
                    }} 
                    className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                  >
                    수정
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      const newNight = { ...nightSales, isLocked: true };
                      setNightSales(newNight);
                      const payload = buildCurrentReportObject({ night: newNight });
                      saveConfirmedSection(payload, '야간 매출이 확정 및 저장되었습니다.');
                    }} 
                    className="text-[10px] bg-rose-400 text-white px-2.5 py-1 rounded-lg hover:bg-rose-500 transition-colors font-semibold shadow-sm"
                  >
                    확정
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 w-12">매출액</label>
                  {nightSales.isLocked ? (
                    <p className="text-sm font-bold text-purple-600 px-1 w-28 text-right">{netNightAmount.toLocaleString()}원</p>
                  ) : (
                    <div className="flex flex-col items-end">
                      <input type="text" className="w-28 bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-right" placeholder="누적 매출" value={nightSales.amount} onChange={e => setNightSales({...nightSales, amount: formatNumber(e.target.value)})} />
                      {nightSales.amount && <span className="text-[10px] text-gray-400 mt-0.5">실적: {netNightAmount.toLocaleString()}원</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 w-12">건수</label>
                  {nightSales.isLocked ? (
                    <p className="text-sm font-bold text-purple-600 px-1 w-28 text-right">{netNightCount.toLocaleString()}건</p>
                  ) : (
                    <div className="flex flex-col items-end">
                      <input type="text" className="w-28 bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-right" placeholder="누적 건수" value={nightSales.count} onChange={e => setNightSales({...nightSales, count: formatNumber(e.target.value)})} />
                      {nightSales.count && <span className="text-[10px] text-gray-400 mt-0.5">실적: {netNightCount.toLocaleString()}건</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 2. 할인 및 서비스 현황 (Discounts) */}
        <Card className="lg:col-span-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="p-2 bg-rose-50 rounded-lg"><Gift className="w-5 h-5 text-rose-600" /></div>
              할인 및 서비스 현황
            </h3>
            <div className="flex items-center gap-2">
              {discountStatus.isLocked ? (
                <button 
                  onClick={() => {
                    const newDiscount = { ...discountStatus, isLocked: false };
                    setDiscountStatus(newDiscount);
                    const payload = buildCurrentReportObject({ discount: newDiscount });
                    saveConfirmedSection(payload, '할인 및 서비스 현황이 수정 모드로 전환되었습니다.');
                  }} 
                  className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                >
                  수정
                </button>
              ) : (
                <button 
                  onClick={() => {
                    const newDiscount = { ...discountStatus, isLocked: true };
                    setDiscountStatus(newDiscount);
                    const payload = buildCurrentReportObject({ discount: newDiscount });
                    saveConfirmedSection(payload, '할인 및 서비스 현황이 확정 및 저장되었습니다.');
                  }} 
                  className="text-xs bg-rose-400 text-white px-3 py-1.5 rounded-lg hover:bg-rose-500 transition-colors font-semibold shadow-sm"
                >
                  확정
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Marketing */}
            <div className={`p-4 rounded-2xl border transition-all ${discountStatus.isLocked ? 'bg-white border-rose-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
              <div className="mb-3">
                <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> 마케팅 (블로거/인플루언서)
                </h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 w-16">서비스 금액</label>
                  {discountStatus.isLocked ? (
                    <p className="text-sm font-bold text-gray-800 px-1 w-28 text-right">{discountStatus.marketing.amount || '0'}원</p>
                  ) : (
                    <input type="text" className="w-28 bg-white border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-right" placeholder="0원" value={discountStatus.marketing.amount} onChange={e => setDiscountStatus({...discountStatus, marketing: {...discountStatus.marketing, amount: formatNumber(e.target.value)}})} />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 w-16">건수</label>
                  {discountStatus.isLocked ? (
                    <p className="text-sm font-bold text-gray-800 px-1 w-28 text-right">{discountStatus.marketing.count || '0'}건</p>
                  ) : (
                    <input type="text" className="w-28 bg-white border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-right" placeholder="0건" value={discountStatus.marketing.count} onChange={e => setDiscountStatus({...discountStatus, marketing: {...discountStatus.marketing, count: formatNumber(e.target.value)}})} />
                  )}
                </div>
              </div>
            </div>

            {/* Event */}
            <div className={`p-4 rounded-2xl border transition-all ${discountStatus.isLocked ? 'bg-white border-rose-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
              <div className="mb-3">
                <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span> 이벤트
                </h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 w-16">서비스 금액</label>
                  {discountStatus.isLocked ? (
                    <p className="text-sm font-bold text-gray-800 px-1 w-28 text-right">{discountStatus.event.amount || '0'}원</p>
                  ) : (
                    <input type="text" className="w-28 bg-white border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-right" placeholder="0원" value={discountStatus.event.amount} onChange={e => setDiscountStatus({...discountStatus, event: {...discountStatus.event, amount: formatNumber(e.target.value)}})} />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 w-16">건수</label>
                  {discountStatus.isLocked ? (
                    <p className="text-sm font-bold text-gray-800 px-1 w-28 text-right">{discountStatus.event.count || '0'}건</p>
                  ) : (
                    <input type="text" className="w-28 bg-white border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-right" placeholder="0건" value={discountStatus.event.count} onChange={e => setDiscountStatus({...discountStatus, event: {...discountStatus.event, count: formatNumber(e.target.value)}})} />
                  )}
                </div>
              </div>
            </div>

            {/* Other Services */}
            <div className={`p-4 rounded-2xl border transition-all ${discountStatus.isLocked ? 'bg-white border-rose-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
              <div className="mb-3">
                <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span> 기타 서비스
                </h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 w-16">서비스 금액</label>
                  {discountStatus.isLocked ? (
                    <p className="text-sm font-bold text-gray-800 px-1 w-28 text-right">{discountStatus.other.amount || '0'}원</p>
                  ) : (
                    <input type="text" className="w-28 bg-white border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-right" placeholder="0원" value={discountStatus.other.amount} onChange={e => setDiscountStatus({...discountStatus, other: {...discountStatus.other, amount: formatNumber(e.target.value)}})} />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 w-16">건수</label>
                  {discountStatus.isLocked ? (
                    <p className="text-sm font-bold text-gray-800 px-1 w-28 text-right">{discountStatus.other.count || '0'}건</p>
                  ) : (
                    <input type="text" className="w-28 bg-white border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 rounded-lg px-3 py-1.5 outline-none transition-all text-sm text-right" placeholder="0건" value={discountStatus.other.count} onChange={e => setDiscountStatus({...discountStatus, other: {...discountStatus.other, count: formatNumber(e.target.value)}})} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Special Notes (Full Width) */}
          <div className={`mt-4 p-4 rounded-2xl border transition-all ${discountStatus.isLocked ? 'bg-white border-rose-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
            <h4 className="text-xs font-bold text-gray-500 mb-2">할인 및 서비스 특이사항</h4>
            {discountStatus.isLocked ? (
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 min-h-[60px] whitespace-pre-wrap">{discountStatus.other.note || '특이사항 없음'}</p>
            ) : (
              <textarea 
                className="w-full bg-white border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 rounded-xl px-4 py-3 outline-none transition-all text-sm min-h-[80px] resize-none" 
                placeholder="서비스 및 할인 관련 특이사항(예: 인플루언서 방문 메뉴, 이벤트 특이 반응 등)을 자유롭게 기록해주세요." 
                value={discountStatus.other.note} 
                onChange={e => setDiscountStatus({...discountStatus, other: {...discountStatus.other, note: e.target.value}})} 
              />
            )}
          </div>
        </Card>

        {/* 3. 리뷰 관리 (Reviews) */}
        <Card className="lg:col-span-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="p-2 bg-yellow-50 rounded-lg"><Star className="w-5 h-5 text-yellow-500" /></div>
              리뷰 관리
            </h3>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
                <span className="text-[10px] sm:text-xs font-bold text-amber-600">총 리뷰 수</span>
                <span className="text-sm sm:text-lg font-black text-amber-700">{totalReviews}개</span>
              </div>
              <button 
                onClick={() => {
                  const willLock = !isReviewsLocked;
                  setIsReviewsLocked(willLock);
                  const newDetails = { ...reviewDetails, isLocked: willLock };
                  setReviewDetails(newDetails);
                  const newKindness = { ...reviewKindness, isLocked: willLock };
                  const newDelicious = { ...reviewDelicious, isLocked: willLock };
                  const newNormal = { ...reviewNormal, isLocked: willLock };
                  const newUncomfortable = { ...reviewUncomfortable, isLocked: willLock };
                  setReviewKindness(newKindness);
                  setReviewDelicious(newDelicious);
                  setReviewNormal(newNormal);
                  setReviewUncomfortable(newUncomfortable);

                  const payload = buildCurrentReportObject({
                    reviews: {
                      kindness: newKindness,
                      delicious: newDelicious,
                      normal: newNormal,
                      uncomfortable: newUncomfortable,
                      details: newDetails,
                      isLocked: willLock
                    }
                  });
                  saveConfirmedSection(
                    payload,
                    willLock ? '리뷰 관리가 전체 확정 및 저장되었습니다.' : '리뷰 관리가 수정 모드로 전환되었습니다.'
                  );
                }}
                className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                  isReviewsLocked 
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                    : 'bg-rose-500 text-white shadow-lg shadow-rose-200 hover:bg-rose-600'
                }`}
              >
                {isReviewsLocked ? (
                  <><Edit2 className="w-4 h-4" /> 수정</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> 전체 확정</>
                )}
              </button>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-2">
              {/* 친절 */}
              <div className={`rounded-xl p-2 sm:p-3 border transition-all ${isReviewsLocked ? 'bg-white border-green-200 shadow-sm' : 'bg-green-50 border-green-100'}`}>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] sm:text-xs font-bold text-green-700">친절</p>
                </div>
                <div className="flex items-end gap-1">
                  {isReviewsLocked ? (
                    <p className="text-lg sm:text-xl font-bold text-green-800 px-1">{reviewKindness.count || '0'}</p>
                  ) : (
                    <input type="text" inputMode="numeric" className="w-8 sm:w-14 bg-white border border-green-200 rounded px-1 sm:px-2 py-1 text-sm sm:text-base font-bold text-green-700 outline-none focus:ring-2 focus:ring-green-500 text-center" placeholder="0" value={reviewKindness.count} onChange={e => setReviewKindness({...reviewKindness, count: e.target.value.replace(/[^0-9]/g, '')})} />
                  )}
                  <span className="text-[10px] sm:text-xs text-green-600 font-medium mb-0.5">건</span>
                </div>
              </div>

              {/* 맛있음 */}
              <div className={`rounded-xl p-2 sm:p-3 border transition-all ${isReviewsLocked ? 'bg-white border-orange-200 shadow-sm' : 'bg-orange-50 border-orange-100'}`}>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] sm:text-xs font-bold text-orange-700">맛있음</p>
                </div>
                <div className="flex items-end gap-1">
                  {isReviewsLocked ? (
                    <p className="text-lg sm:text-xl font-bold text-orange-800 px-1">{reviewDelicious.count || '0'}</p>
                  ) : (
                    <input type="text" inputMode="numeric" className="w-8 sm:w-14 bg-white border border-orange-200 rounded px-1 sm:px-2 py-1 text-sm sm:text-base font-bold text-orange-700 outline-none focus:ring-2 focus:ring-orange-500 text-center" placeholder="0" value={reviewDelicious.count} onChange={e => setReviewDelicious({...reviewDelicious, count: e.target.value.replace(/[^0-9]/g, '')})} />
                  )}
                  <span className="text-[10px] sm:text-xs text-orange-600 font-medium mb-0.5">건</span>
                </div>
              </div>

              {/* 보통 */}
              <div className={`rounded-xl p-2 sm:p-3 border transition-all ${isReviewsLocked ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] sm:text-xs font-bold text-gray-600">보통</p>
                </div>
                <div className="flex items-end gap-1">
                  {isReviewsLocked ? (
                    <p className="text-lg sm:text-xl font-bold text-gray-800 px-1">{reviewNormal.count || '0'}</p>
                  ) : (
                    <input type="text" inputMode="numeric" className="w-8 sm:w-14 bg-white border border-gray-300 rounded px-1 sm:px-2 py-1 text-sm sm:text-base font-bold text-gray-700 outline-none focus:ring-2 focus:ring-gray-400 text-center" placeholder="0" value={reviewNormal.count} onChange={e => setReviewNormal({...reviewNormal, count: e.target.value.replace(/[^0-9]/g, '')})} />
                  )}
                  <span className="text-[10px] sm:text-xs text-gray-500 font-medium mb-0.5">건</span>
                </div>
              </div>

              {/* 불편 */}
              <div className={`rounded-xl p-2 sm:p-3 border transition-all ${isReviewsLocked ? 'bg-white border-red-200 shadow-sm' : 'bg-red-50 border-red-100'}`}>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] sm:text-xs font-bold text-red-700">불편</p>
                </div>
                <div className="flex items-end gap-1">
                  {isReviewsLocked ? (
                    <p className="text-lg sm:text-xl font-bold text-red-800 px-1">{reviewUncomfortable.count || '0'}</p>
                  ) : (
                    <input type="text" inputMode="numeric" className="w-8 sm:w-14 bg-white border border-red-200 rounded px-1 sm:px-2 py-1 text-sm sm:text-base font-bold text-red-700 outline-none focus:ring-2 focus:ring-red-500 text-center" placeholder="0" value={reviewUncomfortable.count} onChange={e => setReviewUncomfortable({...reviewUncomfortable, count: e.target.value.replace(/[^0-9]/g, '')})} />
                  )}
                  <span className="text-[10px] sm:text-xs text-red-600 font-medium mb-0.5">건</span>
                </div>
              </div>
            </div>
            
            <div className={`rounded-xl p-5 border transition-all ${isReviewsLocked ? 'bg-white border-red-200 shadow-sm' : 'bg-red-50/50 border-red-100'}`}>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-bold text-red-800">불편 리뷰 상세 및 대책</p>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { key: 'service', label: '서비스' },
                  { key: 'facility', label: '매장시설' },
                  { key: 'food', label: '음식' },
                  { key: 'other', label: '기타' }
                ].map(item => (
                  <div key={item.key} className="flex flex-col items-center justify-center bg-white py-2 px-1 rounded-lg border border-red-100">
                    <span className="text-[10px] sm:text-xs text-gray-600 mb-1 whitespace-nowrap">{item.label}</span>
                    <div className="flex items-center gap-0.5">
                      {isReviewsLocked ? (
                        <span className="text-sm font-bold text-gray-800 px-1">{reviewDetails[item.key as keyof typeof reviewDetails] || '0'}</span>
                      ) : (
                        <input type="text" inputMode="numeric" className="w-8 sm:w-12 text-center outline-none text-sm font-medium bg-gray-50 rounded py-0.5" placeholder="0" value={reviewDetails[item.key as keyof typeof reviewDetails] as string} onChange={e => setReviewDetails({...reviewDetails, [item.key]: e.target.value.replace(/[^0-9]/g, '')})} />
                      )}
                      <span className="text-[10px] text-gray-400">건</span>
                    </div>
                  </div>
                ))}
              </div>
              {isReviewsLocked ? (
                <div className="w-full bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-700 min-h-[80px] whitespace-pre-wrap">
                  {reviewDetails.note || '작성된 대책이 없습니다.'}
                </div>
              ) : (
                <textarea 
                  className="w-full bg-white border border-red-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 rounded-lg p-3 text-sm outline-none resize-none min-h-[80px]"
                  placeholder="불편 리뷰사항이 재발되지 않도록 하려면 어떻게 해야될지 작성해주세요."
                  value={reviewDetails.note}
                  onChange={e => setReviewDetails({...reviewDetails, note: e.target.value})}
                ></textarea>
              )}
            </div>
          </div>
        </Card>

        {/* 매장 일일 냉장고 온도체크 (Fridge Temps) */}
        <Card className="lg:col-span-12">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="p-2 bg-teal-50 rounded-lg"><CheckSquare className="w-5 h-5 text-teal-600" /></div>
              매장 일일 냉장고 온도체크
            </h3>
            {fridgeTemps.isLocked ? (
              <button 
                onClick={() => {
                  const newFridge = { ...fridgeTemps, isLocked: false };
                  setFridgeTemps(newFridge);
                  const payload = buildCurrentReportObject({ fridgeTemps: newFridge });
                  saveConfirmedSection(payload, '냉장고 온도체크가 수정 모드로 전환되었습니다.');
                }} 
                className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
              >
                수정
              </button>
            ) : (
              <button 
                onClick={() => {
                  const newFridge = { ...fridgeTemps, isLocked: true };
                  setFridgeTemps(newFridge);
                  const payload = buildCurrentReportObject({ fridgeTemps: newFridge });
                  saveConfirmedSection(payload, '냉장고 온도체크가 확인 및 저장되었습니다.');
                }} 
                className="text-xs bg-rose-400 text-white px-3 py-1.5 rounded-lg hover:bg-rose-500 transition-colors font-semibold shadow-sm"
              >
                확인
              </button>
            )}
          </div>
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl border transition-all ${fridgeTemps.isLocked ? 'bg-white border-teal-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
            {[
              { key: 'kitchen1', label: '주방1번' },
              { key: 'kitchen2', label: '주방2번' },
              { key: 'hall1', label: '홀1번' },
              { key: 'hall2', label: '홀2번' },
              { key: 'drink', label: '음료냉장고' },
              { key: 'alcohol', label: '주류냉장고' },
              { key: 'storage1', label: '창고1번' },
              { key: 'storage2', label: '창고2번' }
            ].map(area => (
              <div key={area.key} className="flex flex-col bg-white border border-gray-200 rounded-lg p-2.5">
                <span className="text-xs font-bold text-gray-500 mb-1.5">{area.label}</span>
                <div className="flex items-center">
                  {fridgeTemps.isLocked ? (
                    <span className="text-lg font-bold text-teal-700 px-1">{fridgeTemps[area.key as keyof typeof fridgeTemps] || '-'}</span>
                  ) : (
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded px-2 py-1 text-sm font-medium outline-none transition-all" 
                      placeholder="예: -2" 
                      value={fridgeTemps[area.key as keyof typeof fridgeTemps] as string} 
                      onChange={e => setFridgeTemps({...fridgeTemps, [area.key]: e.target.value})} 
                    />
                  )}
                  <span className="text-xs text-gray-400 ml-1">°C</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
