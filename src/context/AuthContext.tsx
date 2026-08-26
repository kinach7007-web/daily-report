import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { UserAccount } from '../types';

export const MASTER_ADMIN: UserAccount = {
  id: 'kinach',
  username: 'kinach',
  password: '10313',
  name: '대표 운영자',
  role: '총괄 운영자',
  isAdmin: true,
  createdAt: '2026-01-01',
};

const SESSION_KEY = 'bbanjib_auth_user';

interface AuthContextType {
  currentUser: UserAccount | null;
  usersList: UserAccount[];
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  addUser: (userData: { username: string; password: string; name: string; role: string }) => Promise<{ success: boolean; message?: string }>;
  updateUser: (id: string, updateData: { name?: string; role?: string; password?: string }) => Promise<{ success: boolean; message?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; message?: string }>;
  resetUserPassword: (id: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Firestore Sync & Initialize Master Account
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    const initUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        
        // Ensure master admin exists in Firestore
        const masterDocRef = doc(db, 'users', 'kinach');
        const masterSnap = await getDoc(masterDocRef);
        if (!masterSnap.exists()) {
          await setDoc(masterDocRef, {
            username: 'kinach',
            password: '10313',
            name: '대표 운영자',
            role: '총괄 운영자',
            isAdmin: true,
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
          });
        }

        // Realtime listener
        unsubscribe = onSnapshot(usersRef, (snapshot) => {
          const fetched: UserAccount[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetched.push({
              id: docSnap.id,
              username: data.username || docSnap.id,
              password: data.password || '',
              name: data.name || '',
              role: data.role || '직원',
              isAdmin: Boolean(data.isAdmin),
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            });
          });

          // Ensure master admin is present in memory even if offline/empty
          if (!fetched.some(u => u.username === 'kinach')) {
            fetched.unshift(MASTER_ADMIN);
          }

          setUsersList(fetched);
          setIsLoading(false);

          // Update current user session if info changed
          if (currentUser) {
            const updated = fetched.find(u => u.username === currentUser.username);
            if (updated) {
              setCurrentUser(updated);
              localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
            }
          }
        }, (error) => {
          console.warn('Firestore users sync error, using local fallback:', error);
          setUsersList([MASTER_ADMIN]);
          setIsLoading(false);
        });
      } catch (err) {
        console.error('Failed to initialize users collection:', err);
        setUsersList([MASTER_ADMIN]);
        setIsLoading(false);
      }
    };

    initUsers();

    return () => unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const trimmedUser = username.trim();
    const trimmedPw = password.trim();

    if (!trimmedUser || !trimmedPw) {
      return { success: false, message: '아이디와 비밀번호를 모두 입력해주세요.' };
    }

    // Check Master Admin
    if (trimmedUser === MASTER_ADMIN.username && trimmedPw === MASTER_ADMIN.password) {
      const adminUser: UserAccount = { ...MASTER_ADMIN };
      setCurrentUser(adminUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
      return { success: true };
    }

    // Check against usersList
    let matchedUser = usersList.find(u => u.username.toLowerCase() === trimmedUser.toLowerCase());

    // If not found in memory list, try fresh fetch from Firestore
    if (!matchedUser) {
      try {
        const docRef = doc(db, 'users', trimmedUser);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          matchedUser = {
            id: snap.id,
            username: data.username || snap.id,
            password: data.password || '',
            name: data.name || '',
            role: data.role || '직원',
            isAdmin: Boolean(data.isAdmin),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        }
      } catch (e) {
        console.error('Login fetch error:', e);
      }
    }

    if (!matchedUser) {
      return { success: false, message: '등록되지 않은 아이디입니다. 운영자에게 계정 생성을 요청하세요.' };
    }

    if (matchedUser.password !== trimmedPw) {
      return { success: false, message: '비밀번호가 일치하지 않습니다.' };
    }

    // Success
    setCurrentUser(matchedUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(matchedUser));
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const addUser = async (userData: { username: string; password: string; name: string; role: string }): Promise<{ success: boolean; message?: string }> => {
    const trimmedUsername = userData.username.trim();
    const trimmedPassword = userData.password.trim();
    const trimmedName = userData.name.trim();
    const trimmedRole = userData.role.trim() || '직원';

    if (!trimmedUsername || !trimmedPassword || !trimmedName) {
      return { success: false, message: '아이디, 비밀번호, 이름을 모두 입력해주세요.' };
    }

    // Check duplicate
    if (trimmedUsername === 'kinach' || usersList.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase())) {
      return { success: false, message: '이미 존재하는 아이디입니다.' };
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const newUserDoc = {
        username: trimmedUsername,
        password: trimmedPassword,
        name: trimmedName,
        role: trimmedRole,
        isAdmin: false,
        createdAt: today,
        updatedAt: today,
      };

      await setDoc(doc(db, 'users', trimmedUsername), newUserDoc);
      return { success: true };
    } catch (e) {
      console.error('Add user error:', e);
      return { success: false, message: '사용자 등록 중 오류가 발생했습니다.' };
    }
  };

  const updateUser = async (id: string, updateData: { name?: string; role?: string; password?: string }): Promise<{ success: boolean; message?: string }> => {
    try {
      const docRef = doc(db, 'users', id);
      const payload: Record<string, any> = {
        updatedAt: new Date().toISOString().split('T')[0],
      };
      if (updateData.name !== undefined) payload.name = updateData.name.trim();
      if (updateData.role !== undefined) payload.role = updateData.role.trim();
      if (updateData.password !== undefined) payload.password = updateData.password.trim();

      await updateDoc(docRef, payload);
      return { success: true };
    } catch (e) {
      console.error('Update user error:', e);
      return { success: false, message: '사용자 정보 수정 중 오류가 발생했습니다.' };
    }
  };

  const resetUserPassword = async (id: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    if (!newPassword.trim()) {
      return { success: false, message: '새 비밀번호를 입력해주세요.' };
    }
    return updateUser(id, { password: newPassword.trim() });
  };

  const deleteUser = async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (id === 'kinach') {
      return { success: false, message: '총괄 운영자 계정은 삭제할 수 없습니다.' };
    }

    try {
      await deleteDoc(doc(db, 'users', id));
      return { success: true };
    } catch (e) {
      console.error('Delete user error:', e);
      return { success: false, message: '사용자 삭제 중 오류가 발생했습니다.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        usersList,
        isLoading,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        resetUserPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
