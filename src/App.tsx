/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Users, 
  AlertTriangle, 
  Menu, 
  X, 
  Settings, 
  ListChecks, 
  BarChart3, 
  ShieldCheck, 
  ClipboardList,
  LogOut,
  UserCheck
} from 'lucide-react';
import DailyReport from './components/DailyReport';
import DailyTaskReport from './components/DailyTaskReport';
import ComplaintLog from './components/ComplaintLog';
import InterviewLog from './components/InterviewLog';
import SalesStats from './components/SalesStats';
import AdminCenter from './components/AdminCenter';
import NotificationManager from './components/NotificationManager';
import LoginScreen from './components/LoginScreen';
import { AuthProvider, useAuth } from './context/AuthContext';

function MainApp() {
  const { currentUser, logout, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // If user is not admin and was on admin tab, switch to daily
  useEffect(() => {
    if (currentUser && !currentUser.isAdmin && activeTab === 'admin') {
      setActiveTab('daily');
    }
  }, [currentUser, activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-gray-300">시스템 연결 중...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  // Base tabs for all users
  const baseTabs = [
    { id: 'daily', name: '영업 일보', icon: FileText },
    { id: 'task-report', name: '일일업무 보고', icon: ClipboardList },
    { id: 'stats', name: '영업 통계', icon: BarChart3 },
    { id: 'complaint', name: '컴플레인 관리', icon: AlertTriangle },
    { id: 'interview', name: '면접 일지', icon: Users },
  ];

  // Only admin gets the Admin Center tab
  const tabs = currentUser.isAdmin
    ? [...baseTabs, { id: 'admin', name: '관리자 센터', icon: ShieldCheck }]
    : baseTabs;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-rose-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white/85 backdrop-blur-md border-b border-gray-100 p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-black text-gray-800">뼈반집 관리</h1>
            <p className="text-[10px] text-gray-500">{currentUser.name} ({currentUser.role})</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={logout} 
            className="p-2 bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 rounded-xl transition-colors"
            title="로그아웃"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="p-2 bg-gray-50 rounded-xl text-gray-600"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`
        ${isMobileMenuOpen ? 'block' : 'hidden'} 
        md:block w-full md:w-72 bg-white/70 backdrop-blur-xl border-r border-gray-100 min-h-screen fixed md:sticky top-0 md:top-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col justify-between
      `}>
        <div>
          <div className="p-6 md:p-8 hidden md:block">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">뼈반집</h1>
            <p className="text-xs text-gray-500 mt-1 font-medium">영업 관리 시스템</p>
          </div>

          {/* Navigation */}
          <nav className="mt-2 md:mt-2 px-4 space-y-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-200 font-bold scale-[1.02]'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-xs font-semibold'
                  }`}
                >
                  <div className={`p-2 rounded-xl mr-3 transition-colors ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm">{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile Card & Logout Footer in Sidebar */}
        <div className="p-4 m-4 bg-white/90 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
              currentUser.isAdmin ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-700'
            }`}>
              {currentUser.isAdmin ? <ShieldCheck className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-bold text-gray-900 truncate">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                <span>{currentUser.role}</span>
                {currentUser.isAdmin && (
                  <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.2 rounded font-bold">운영자</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full py-2 px-3 bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-gray-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>로그아웃</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-6xl mx-auto">
        <NotificationManager />
        <div className={activeTab === 'daily' ? 'block' : 'hidden'}><DailyReport /></div>
        <div className={activeTab === 'task-report' ? 'block' : 'hidden'}><DailyTaskReport /></div>
        <div className={activeTab === 'stats' ? 'block' : 'hidden'}><SalesStats /></div>
        <div className={activeTab === 'complaint' ? 'block' : 'hidden'}><ComplaintLog /></div>
        <div className={activeTab === 'interview' ? 'block' : 'hidden'}><InterviewLog /></div>
        {currentUser.isAdmin && (
          <div className={activeTab === 'admin' ? 'block' : 'hidden'}><AdminCenter /></div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
