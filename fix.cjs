const fs = require('fs');

function fix(file, isInterview) {
  let code = fs.readFileSync(file, 'utf8');
  
  // 1. imports
  code = code.replace("import { deleteDoc, ", "import { collection, addDoc, doc, setDoc, onSnapshot, Timestamp, deleteDoc } from 'firebase/firestore';\n//");
  code = code.replace("import { collection, addDoc, doc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';", "import { collection, addDoc, doc, setDoc, onSnapshot, Timestamp, deleteDoc } from 'firebase/firestore';");
  
  if (isInterview) {
    code = code.replace("MessageSquareQuote\n} from 'lucide-react';", "MessageSquareQuote,\n  Edit2,\n  Trash2,\n  ShieldAlert\n} from 'lucide-react';");
  } else {
    code = code.replace("MessageSquareQuote\n} from 'lucide-react';", "MessageSquareQuote,\n  Edit2,\n  Trash2,\n  ShieldAlert\n} from 'lucide-react';");
  }

  // 2. state
  const stateSearch = isInterview ? "const [selectedInterview, setSelectedInterview] = useState<any | null>(null);" : "const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);";
  const stateReplace = stateSearch + "\n  const [editingId, setEditingId] = useState<string | null>(null);";
  code = code.replace(stateSearch, stateReplace);

  // 3. funcs
  const idField = isInterview ? "applicant" : "date + complaint.time";
  const typeName = isInterview ? "interview" : "complaint";
  const collectionName = isInterview ? "interviews" : "complaints";
  const selectedName = isInterview ? "selectedInterview" : "selectedComplaint";
  const setSelectName = isInterview ? "setSelectedInterview" : "setSelectedComplaint";

  const funcs = `
  const handleEdit = (item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentUser.role !== 'admin') {
      alert('관리자만 수정할 수 있습니다.');
      return;
    }
    setFormData(item);
    setEditingId(item.id || item.${isInterview ? 'applicant' : 'date'});
    setIsFormOpen(true);
    ${setSelectName}(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser.role !== 'admin') {
      alert('관리자만 삭제할 수 있습니다.');
      return;
    }
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, '${collectionName}', String(id)));
      ${setSelectName}(null);
      setToastMessage('삭제되었습니다.');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (e) {
      console.error(e);
      alert('삭제 실패');
    }
  };
`;
  code = code.replace("const handleSave = async () => {", funcs + "\n  const handleSave = async () => {");

  // 4. save logic
  if (isInterview) {
    code = code.replace("const newInterview = { \n      ...formData, \n      id: Date.now() \n    };", "const docId = editingId || String(Date.now());\n    const newInterview = { ...formData, id: docId };");
    code = code.replace("String(newInterview.id)", "docId");
    code = code.replace("const newInterview = { ...formData, id: Date.now() };", "const docId = editingId || String(Date.now());\n    const newInterview = { ...formData, id: docId };");
  } else {
    code = code.replace("const newComplaint = { ...formData, id: Date.now() };", "const docId = editingId || String(Date.now());\n    const newComplaint = { ...formData, id: docId };");
    code = code.replace("String(newComplaint.id)", "docId");
  }

  // 5. buttons & cancel
  code = code.replace("setIsFormOpen(false);", "setIsFormOpen(false);\n    setEditingId(null);");
  code = code.replace("onClick={() => setIsFormOpen(false)}", "onClick={() => { setIsFormOpen(false); setEditingId(null); }}");
  code = code.replace("onClick={() => setIsFormOpen(!isFormOpen)}", "onClick={() => { setIsFormOpen(!isFormOpen); if(isFormOpen) setEditingId(null); }}");

  // 6. detail UI
  const detailButtons = `
            {currentUser.role === 'admin' && ${selectedName} && (
              <div className="flex gap-2 w-full mt-4">
                <button
                  onClick={() => handleEdit(${selectedName})}
                  className="flex-1 py-3 bg-stone-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-stone-900 shadow-sm transition-all"
                >
                  <Edit2 className="w-4 h-4" /> 수정 (관리자)
                </button>
                <button
                  onClick={(e) => handleDelete(${selectedName}.id, e)}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-700 shadow-sm transition-all"
                >
                  <Trash2 className="w-4 h-4" /> 삭제 (관리자)
                </button>
              </div>
            )}
            {currentUser.role !== 'admin' && (
              <div className="p-3 mt-4 rounded-xl border bg-stone-50 border-stone-200 text-stone-600 flex items-start gap-2.5 text-xs">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-stone-400" />
                <span>등록된 일지는 관리자만 수정 및 삭제가 가능합니다. 일반 직원은 수정이 잠겨있으며, 관리자 권한으로만 수정/삭제가 가능합니다.</span>
              </div>
            )}
          </div>
        </div>
      ) : (
`;
  code = code.replace(/          <\/div>\n        <\/div>\n      \) : \(/g, detailButtons);

  fs.writeFileSync(file, code);
}

fix('src/components/ComplaintLog.tsx', false);
fix('src/components/InterviewLog.tsx', true);
