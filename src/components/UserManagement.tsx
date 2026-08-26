import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserAccount } from '../types';
import { 
  UserPlus, 
  Users, 
  KeyRound, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  Check, 
  X, 
  AlertCircle, 
  Search,
  Lock,
  UserCheck
} from 'lucide-react';

const ROLE_PRESETS = ['점장', '매니저', '캡틴', '주방팀장', '주방직원', '홀직원', '파트타이머'];

export default function UserManagement() {
  const { usersList, addUser, updateUser, deleteUser, resetUserPassword } = useAuth();

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('매니저');
  const [customRole, setCustomRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Password reset modal state
  const [resetModalUser, setResetModalUser] = useState<UserAccount | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editMsg, setEditMsg] = useState<string | null>(null);

  // Handle create user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);

    const roleToUse = newRole === 'custom' ? customRole.trim() : newRole;
    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      setFormMsg({ type: 'error', text: '아이디, 비밀번호, 이름을 모두 입력해주세요.' });
      return;
    }

    setIsSubmitting(true);
    const res = await addUser({
      username: newUsername.trim(),
      password: newPassword.trim(),
      name: newName.trim(),
      role: roleToUse || '직원',
    });

    if (res.success) {
      setFormMsg({ type: 'success', text: `[${newName}] 직원의 계정이 성공적으로 등록되었습니다.` });
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setNewRole('매니저');
      setCustomRole('');
    } else {
      setFormMsg({ type: 'error', text: res.message || '계정 생성에 실패했습니다.' });
    }
    setIsSubmitting(false);
  };

  // Handle password reset
  const handlePasswordResetSubmit = async () => {
    if (!resetModalUser) return;
    if (!resetPasswordInput.trim()) {
      setResetMsg('새 비밀번호를 입력해주세요.');
      return;
    }

    const res = await resetUserPassword(resetModalUser.id, resetPasswordInput.trim());
    if (res.success) {
      setResetMsg(null);
      setResetModalUser(null);
      setResetPasswordInput('');
      alert(`[${resetModalUser.name}] 님의 비밀번호가 성공적으로 변경되었습니다.`);
    } else {
      setResetMsg(res.message || '비밀번호 변경 실패');
    }
  };

  // Handle edit user info
  const handleEditSubmit = async () => {
    if (!editingUser) return;
    if (!editName.trim()) {
      setEditMsg('이름을 입력해주세요.');
      return;
    }

    const res = await updateUser(editingUser.id, {
      name: editName.trim(),
      role: editRole.trim() || '직원',
    });

    if (res.success) {
      setEditingUser(null);
      setEditMsg(null);
    } else {
      setEditMsg(res.message || '수정에 실패했습니다.');
    }
  };

  // Handle delete user
  const handleDelete = async (user: UserAccount) => {
    if (user.isAdmin || user.username === 'kinach') {
      alert('총괄 운영자 계정은 삭제할 수 없습니다.');
      return;
    }

    if (window.confirm(`[${user.name} (${user.username})] 계정을 정말로 삭제하시겠습니까?\n삭제 후에는 해당 계정으로 로그인할 수 없습니다.`)) {
      const res = await deleteUser(user.id);
      if (!res.success) {
        alert(res.message || '삭제에 실패했습니다.');
      }
    }
  };

  const filteredUsers = usersList.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-black text-gray-800">사용자(직원) 계정 관리</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              운영자가 직접 직원의 아이디와 비밀번호를 지정하고, 비밀번호 분실 시 즉시 재설정할 수 있습니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>등록된 총 계정: {usersList.length}개</span>
        </div>
      </div>

      {/* Add New User Form Card */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
            <UserPlus className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-gray-800 text-sm md:text-base">신규 직원 계정 추가</h4>
        </div>

        {formMsg && (
          <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
            formMsg.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {formMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
            <span>{formMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleAddUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                아이디 (로그인용) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="예: staff1, chulsoo"
                className="w-full bg-gray-50/80 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                비밀번호 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="초기 비밀번호 지정"
                className="w-full bg-gray-50/80 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                required
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                이름 (실명/작성자명) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="예: 김철수"
                className="w-full bg-gray-50/80 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                직급 (역할)
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-gray-50/80 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white cursor-pointer"
              >
                {ROLE_PRESETS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
                <option value="custom">직접 입력...</option>
              </select>
            </div>
          </div>

          {newRole === 'custom' && (
            <div className="max-w-xs animate-in fade-in">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                직급 직접 입력
              </label>
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="예: 조리장, 오픈담당"
                className="w-full bg-gray-50/80 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                required
              />
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>직원 계정 등록하기</span>
            </button>
          </div>
        </form>
      </div>

      {/* Users List Card */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-gray-800 text-sm md:text-base">
              등록된 계정 목록 ({filteredUsers.length}명)
            </h4>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="이름, 아이디, 직급 검색..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-gray-200/70 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-700 border-b border-gray-200 text-[11px]">
              <tr>
                <th className="px-3.5 py-3 font-bold text-center w-16">구분</th>
                <th className="px-3.5 py-3 font-bold">아이디</th>
                <th className="px-3.5 py-3 font-bold">이름</th>
                <th className="px-3.5 py-3 font-bold">직급</th>
                <th className="px-3.5 py-3 font-bold text-center">등록일</th>
                <th className="px-3.5 py-3 font-bold text-center w-48">계정 관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-xs font-medium">
                    등록된 직원이 없거나 검색 조건과 일치하는 계정이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isMaster = user.isAdmin || user.username === 'kinach';

                  return (
                    <tr key={user.id} className={`hover:bg-gray-50/70 transition-colors ${isMaster ? 'bg-amber-50/20' : ''}`}>
                      <td className="px-3.5 py-3 text-center">
                        {isMaster ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                            <ShieldCheck className="w-3 h-3" />
                            운영자
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                            <UserCheck className="w-3 h-3" />
                            직원
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 font-bold text-gray-900">
                        {user.username}
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-gray-800">
                        {user.name}
                      </td>
                      <td className="px-3.5 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          isMaster 
                            ? 'bg-amber-50 text-amber-700' 
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center text-gray-400 font-medium">
                        {user.createdAt || '-'}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setEditName(user.name);
                              setEditRole(user.role);
                              setEditMsg(null);
                            }}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="정보 수정"
                          >
                            <Edit3 className="w-3 h-3" />
                            수정
                          </button>

                          <button
                            onClick={() => {
                              setResetModalUser(user);
                              setResetPasswordInput('');
                              setResetMsg(null);
                            }}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="비밀번호 변경"
                          >
                            <KeyRound className="w-3 h-3" />
                            비번 재설정
                          </button>

                          {!isMaster && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="계정 삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                              삭제
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">비밀번호 즉시 재설정</h4>
                  <p className="text-xs text-gray-500">{resetModalUser.name} ({resetModalUser.username})</p>
                </div>
              </div>
              <button
                onClick={() => setResetModalUser(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetMsg && (
              <div className="p-2.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200">
                {resetMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                새 비밀번호 입력
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3" />
                <input
                  type="text"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  placeholder="새로운 비밀번호 입력"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handlePasswordResetSubmit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
              >
                비밀번호 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-100 text-gray-700 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">사용자 정보 수정</h4>
                  <p className="text-xs text-gray-500">아이디: {editingUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editMsg && (
              <div className="p-2.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200">
                {editMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  이름 (실명)
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  직급
                </label>
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleEditSubmit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
              >
                정보 수정 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
