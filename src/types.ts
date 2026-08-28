export interface UserAccount {
  id: string; // Document ID or username
  username: string;
  password?: string;
  name: string;
  role: string;
  isAdmin: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalesSlot {
  amount: string;
  count: string;
  isLocked?: boolean;
}

export interface ReviewItem {
  count: string;
  isLocked?: boolean;
}

export interface ReviewDetails {
  service: string;
  facility: string;
  food: string;
  other: string;
  note: string;
  isLocked?: boolean;
}

export interface DiscountItem {
  amount: string;
  count: string;
  note?: string;
}

export interface DiscountStatus {
  marketing: DiscountItem;
  event: DiscountItem;
  other: DiscountItem;
  isLocked?: boolean;
}

export interface FridgeTemps {
  kitchen1: string;
  kitchen2: string;
  hall1: string;
  hall2: string;
  drink: string;
  alcohol: string;
  storage1: string;
  storage2: string;
  isLocked?: boolean;
}

export interface DailyReportRecord {
  id?: string;
  date: string; // YYYY-MM-DD
  dayOfWeek?: string; // 월, 화, 수, 목, 금, 토, 일
  writer?: string;
  savedAt?: string;
  isConfirmed?: boolean;
  sales: {
    lunch: SalesSlot;
    dinner: SalesSlot;
    night: SalesSlot;
    netDinnerAmount?: number;
    netDinnerCount?: number;
    netNightAmount?: number;
    netNightCount?: number;
    totalAmount: number;
    totalCount: number;
    avgTicket?: number;
  };
  improvements?: any[];
  reviews: {
    kindness: ReviewItem;
    delicious: ReviewItem;
    normal: ReviewItem;
    uncomfortable: ReviewItem;
    details: ReviewDetails;
    totalReviews?: number;
  };
  discount: DiscountStatus;
  fridgeTemps: FridgeTemps;
  announcements?: string;
  complaints?: any[];
  interviews?: any[];
  inventory?: any;
  newHireChecklist?: any[];
  adminChecklist?: any[];
}
