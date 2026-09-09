const fs = require('fs');
let code = fs.readFileSync('src/components/ComplaintLog.tsx', 'utf8');

// 1. Add editingId state
code = code.replace(
  "const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);",
  "const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);\n  const [editingId, setEditingId] = useState<string | null>(null);"
);

// 2. Add handleEdit and handleDelete functions
const funcs = `
  const handleEdit = (complaint: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentUser.role !== 'admin') {
      alert('관리자만 수정할 수 있습니다.');
      return;
    }
    setFormData(complaint);
    setEditingId(complaint.id || complaint.date + complaint.time);
    setIsFormOpen(true);
    setSelectedComplaint(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser.role !== 'admin') {
      alert('관리자만 삭제할 수 있습니다.');
      return;
    }
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'complaints', String(id)));
      setSelectedComplaint(null);
      setToastMessage('삭제되었습니다.');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (e) {
      console.error(e);
      alert('삭제 실패');
    }
  };
`;
code = code.replace("const handleSave = async () => {", funcs + "\n  const handleSave = async () => {");

// 3. Update handleSave to use editingId
code = code.replace("const newComplaint = { ...formData, id: Date.now() };", "const docId = editingId || String(Date.now());\n    const newComplaint = { ...formData, id: docId };");
code = code.replace("String(newComplaint.id)", "docId");

// 4. Reset editingId on save or cancel
code = code.replace("setIsFormOpen(false);", "setIsFormOpen(false);\n    setEditingId(null);");

// 5. Add cancel button logic to reset editingId
code = code.replace("onClick={() => setIsFormOpen(false)}", "onClick={() => { setIsFormOpen(false); setEditingId(null); }}");
code = code.replace("onClick={() => setIsFormOpen(!isFormOpen)}", "onClick={() => { setIsFormOpen(!isFormOpen); if(isFormOpen) setEditingId(null); }}");

// 6. Add Edit/Delete buttons to detail view
const detailButtons = `
            {currentUser.role === 'admin' && selectedComplaint && (
              <div className="flex gap-2 w-full mt-4">
                <button
                  onClick={() => handleEdit(selectedComplaint)}
                  className="flex-1 py-3 bg-stone-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-stone-900 shadow-sm transition-all"
                >
                  <Edit2 className="w-4 h-4" /> 수정 (관리자)
                </button>
                <button
                  onClick={(e) => handleDelete(selectedComplaint.id, e)}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-700 shadow-sm transition-all"
                >
                  <Trash2 className="w-4 h-4" /> 삭제 (관리자)
                </button>
              </div>
            )}
            {currentUser.role !== 'admin' && (
              <div className="p-3 mt-4 rounded-xl border bg-stone-50 border-stone-200 text-stone-600 flex items-start gap-2.5 text-xs">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-stone-400" />
                <span>등록된 컴플레인 일지는 관리자만 수정 및 삭제가 가능합니다. 일반 직원은 수정이 잠겨있으며, 관리자 권한으로만 수정/삭제가 가능합니다.</span>
              </div>
            )}
          </div>
        </div>
      ) : (
`;
code = code.replace(/          <\/div>\n        <\/div>\n      \) : \(/g, detailButtons);

fs.writeFileSync('src/components/ComplaintLog.tsx', code);
