import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from './store';
import { parseCSV, exportToZip, countPlaceholders } from './utils';
import { useFilteredEntries } from './hooks/useFilteredEntries';
import { Sidebar } from './components/Sidebar';
import { EditorArea } from './components/EditorArea';
import { HighlightText } from './components/HighlightText';
import { PlaceholderManager } from './components/PlaceholderManager';
import { Upload, Download, Settings, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Copy, Check, ArrowDownToLine } from 'lucide-react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="opacity-40 hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100"
      title="复制到剪贴板"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
    </button>
  );
}

export default function App() {
  const { state, loading, updateEntry, setPlaceholders, setFilters, setCurrentIndex, loadCSV, clearData, undo, redo } = useAppStore();
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [undoRedoToast, setUndoRedoToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredOrder = useFilteredEntries(
    state?.entries || {},
    state?.order || [],
    state?.filters || { file: '', diffTeam: false, emptyOfficial: false, flagged: false, search: '' }
  );

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (state?.history.past.length) {
          const lastAction = state.history.past[state.history.past.length - 1];
          const affectedIndex = state.order.indexOf(lastAction.entryId);
          if (affectedIndex !== -1) {
            setCurrentIndex(affectedIndex);
          }
          undo();
          setUndoRedoToast('已撤销');
          setTimeout(() => setUndoRedoToast(null), 1500);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (state?.history.future.length) {
          const nextAction = state.history.future[0];
          const affectedIndex = state.order.indexOf(nextAction.entryId);
          if (affectedIndex !== -1) {
            setCurrentIndex(affectedIndex);
          }
          redo();
          setUndoRedoToast('已重做');
          setTimeout(() => setUndoRedoToast(null), 1500);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, [state?.history, state?.order, undo, redo, setCurrentIndex]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">正在加载工作区...</div>;
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { entries, order } = await parseCSV(file);
      loadCSV(entries, order);
    } catch (err) {
      setUploadError('解析 CSV 文件失败。请确保文件格式正确。');
      console.error(err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = () => {
    if (!state) return;
    exportToZip(state.entries, state.order);
  };

  if (!state || state.order.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
        <p className="text-gray-500">暂无数据，请上传 CSV 文件开始工作</p>
        <input
          type="file"
          accept=".csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Upload className="w-5 h-5 mr-2" />
          上传 CSV
        </button>

        {/* Upload Error Modal */}
        {uploadError && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-t-4 border-red-500">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-bold text-gray-900">上传失败</h3>
              </div>
              <p className="text-gray-700 mb-6">{uploadError}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setUploadError(null)}
                  className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  我知道了
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentEntryId = state.order[state.currentIndex];
  const currentEntry = state.entries[currentEntryId];

  const jumpToNext = () => {
    const currentFilteredIndex = filteredOrder.indexOf(currentEntryId);
    if (currentFilteredIndex >= 0) {
      for (let i = currentFilteredIndex + 1; i < filteredOrder.length; i++) {
        if (state.entries[filteredOrder[i]].status !== 'completed') {
          setCurrentIndex(state.order.indexOf(filteredOrder[i]));
          return;
        }
      }
      if (currentFilteredIndex < filteredOrder.length - 1) {
        setCurrentIndex(state.order.indexOf(filteredOrder[currentFilteredIndex + 1]));
      }
    } else if (filteredOrder.length > 0) {
      // If current entry is not in filtered list, jump to the first incomplete item
      for (let i = 0; i < filteredOrder.length; i++) {
        if (state.entries[filteredOrder[i]].status !== 'completed') {
          setCurrentIndex(state.order.indexOf(filteredOrder[i]));
          return;
        }
      }
      // Or just the first item if all are completed
      setCurrentIndex(state.order.indexOf(filteredOrder[0]));
    }
  };

  const handleConfirm = (latestValue: string) => {
    const origCount = countPlaceholders(currentEntry.English_Original, state.placeholders);
    const modCount = countPlaceholders(latestValue, state.placeholders);

    const action = () => {
      React.startTransition(() => {
        updateEntry(currentEntryId, { Chinese_Mod: latestValue, status: 'completed' });
        jumpToNext();
      });
    };

    if (origCount !== modCount) {
      setValidationWarning(`占位符数量不匹配！原文有 ${origCount} 个，译文有 ${modCount} 个。`);
      setPendingAction(() => action);
    } else {
      action();
    }
  };

  const handleFlag = () => {
    updateEntry(currentEntryId, { status: 'flagged' });
    jumpToNext();
  };

  const isTeamAligned = currentEntry.Chinese_Mod && currentEntry.Chinese_Mod === currentEntry.Chinese_Team;
  const isOfficialAligned = currentEntry.Chinese_Mod && currentEntry.Chinese_Mod === currentEntry.Chinese_Official && !isTeamAligned;

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">本地化工作室</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-medium">
            {state.order.length} 词条
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Upload className="w-4 h-4 mr-2" />
            上传 CSV
          </button>
          <button
            onClick={() => setShowPlaceholders(true)}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Settings className="w-4 h-4 mr-2" />
            校验字典
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <Download className="w-4 h-4 mr-2" />
            导出 JSON
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-sm text-red-600 hover:text-red-800 ml-4"
          >
            清空数据
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Container */}
        <div
          className="transition-[width] duration-300 ease-in-out overflow-hidden shrink-0 bg-gray-50 border-r border-gray-200 z-10"
          style={{ width: isSidebarOpen ? '20rem' : '0' }}
        >
          <div className="w-80 h-full">
            <Sidebar 
              state={state} 
              onSelect={setCurrentIndex} 
              onFilterChange={setFilters} 
            />
          </div>
        </div>

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 relative">
          {/* Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-gray-200 border-l-0 rounded-r-lg shadow-md p-1.5 hover:bg-gray-50 text-gray-500 hover:text-indigo-600 transition-colors"
            title={isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>

          {filteredOrder.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              没有符合当前过滤条件的词条。
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden max-w-6xl mx-auto w-full gap-4">
              
              {/* Info Area */}
              <div className="shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex justify-between items-center">
                <div className={`flex ${isSidebarOpen ? 'flex-col items-start' : 'flex-row items-center space-x-6'}`}>
                  <div className={`flex items-center space-x-2 ${isSidebarOpen ? 'mb-1' : ''}`}>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded uppercase tracking-wider">文件</span>
                    <span className="text-sm font-medium text-gray-900">{currentEntry.File}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded uppercase tracking-wider">键名</span>
                    <span className="text-sm font-mono text-indigo-600">{currentEntry.Key}</span>
                  </div>
                </div>
                {isTeamAligned && (
                  <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">已对齐 (团队)</span>
                  </div>
                )}
                {isOfficialAligned && (
                  <div className="flex items-center text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200 shrink-0">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">已对齐 (官方)</span>
                  </div>
                )}
              </div>

              {/* Reference Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 h-64 min-h-0">
                {/* English */}
                <div className="flex flex-col space-y-1.5 h-full min-h-0">
                  <div className="flex items-center justify-between shrink-0">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">英文原文</h3>
                    {currentEntry.English_Original && <CopyButton text={currentEntry.English_Original} />}
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex-1 min-h-0 overflow-y-auto text-gray-800 text-base leading-relaxed">
                    <HighlightText text={currentEntry.English_Original} placeholders={state.placeholders} />
                  </div>
                </div>

                {/* Official & Team */}
                <div className="flex flex-col space-y-3 h-full min-h-0">
                  <div className="flex flex-col space-y-1.5 flex-1 min-h-0">
                    <div className="flex items-center justify-between shrink-0">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">官方中文</h3>
                      <div className="flex items-center space-x-1">
                        {currentEntry.Chinese_Official && (
                          <>
                            <button
                              onClick={() => updateEntry(currentEntryId, { Chinese_Mod: currentEntry.Chinese_Official })}
                              className="opacity-40 hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded hover:bg-indigo-50 text-xs text-indigo-600 flex items-center space-x-0.5"
                              title="填入模组编辑区"
                            >
                              <ArrowDownToLine className="w-3 h-3" />
                              <span>填入</span>
                            </button>
                            <CopyButton text={currentEntry.Chinese_Official} />
                          </>
                        )}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex-1 min-h-0 overflow-y-auto text-gray-800 text-base leading-relaxed">
                      {currentEntry.Chinese_Official ? (
                        <HighlightText text={currentEntry.Chinese_Official} placeholders={state.placeholders} />
                      ) : (
                        <span className="text-gray-400 italic">无官方翻译</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1.5 flex-1 min-h-0">
                    <div className="flex items-center justify-between shrink-0">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">团队中文</h3>
                      <div className="flex items-center space-x-1">
                        {currentEntry.Chinese_Team && (
                          <>
                            <button
                              onClick={() => updateEntry(currentEntryId, { Chinese_Mod: currentEntry.Chinese_Team })}
                              className="opacity-40 hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded hover:bg-indigo-50 text-xs text-indigo-600 flex items-center space-x-0.5"
                              title="填入模组编辑区"
                            >
                              <ArrowDownToLine className="w-3 h-3" />
                              <span>填入</span>
                            </button>
                            <CopyButton text={currentEntry.Chinese_Team} />
                          </>
                        )}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex-1 min-h-0 overflow-y-auto text-gray-800 text-base leading-relaxed">
                      {currentEntry.Chinese_Team ? (
                        <HighlightText text={currentEntry.Chinese_Team} placeholders={state.placeholders} />
                      ) : (
                        <span className="text-gray-400 italic">无团队翻译</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Core Edit Area */}
              <div className="flex-1 flex flex-col min-h-0 space-y-1.5 pt-2">
                <div className="flex justify-between items-end shrink-0">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                    模组中文 (编辑)
                    <span className="ml-3 text-xs font-normal text-gray-500 normal-case">
                      按 <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded-md text-gray-600 mx-1">Ctrl+Enter</kbd> 确认，<kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded-md text-gray-600 mx-1">Enter</kbd> 下一个，<kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded-md text-gray-600 mx-1">Ctrl+M</kbd> 标记存疑
                    </span>
                  </h3>
                </div>
                
                <div className="flex-1 min-h-0">
                  <EditorArea
                    key={currentEntryId}
                    entry={currentEntry}
                    placeholders={state.placeholders}
                    onChange={(val) => updateEntry(currentEntryId, { Chinese_Mod: val })}
                    onConfirm={handleConfirm}
                    onNext={jumpToNext}
                    onFlag={handleFlag}
                  />
                </div>
              </div>

            </div>
          )}

          {/* Validation Warning Modal */}
          {validationWarning && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-t-4 border-red-500">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h3 className="text-lg font-bold text-gray-900">校验错误</h3>
                </div>
                <p className="text-gray-700 mb-6">{validationWarning}</p>
                <div className="flex justify-end space-x-3">
                  <button
                    id="btn-cancel"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight') document.getElementById('btn-ignore')?.focus();
                    }}
                    onClick={() => {
                      setValidationWarning(null);
                      setPendingAction(null);
                      setTimeout(() => document.getElementById('mod-editor')?.focus(), 0);
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    取消并修改
                  </button>
                  <button
                    id="btn-ignore"
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') document.getElementById('btn-cancel')?.focus();
                    }}
                    onClick={() => {
                      if (pendingAction) pendingAction();
                      setValidationWarning(null);
                      setPendingAction(null);
                      setTimeout(() => document.getElementById('mod-editor')?.focus(), 0);
                    }}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    强制忽略
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Clear Data Confirmation Modal */}
          {showClearConfirm && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-t-4 border-red-500">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h3 className="text-lg font-bold text-gray-900">清空数据</h3>
                </div>
                <p className="text-gray-700 mb-6">确定要清空所有数据并重新开始吗？此操作不可撤销。</p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      clearData();
                      setShowClearConfirm(false);
                    }}
                    className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    确定清空
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Error Modal */}
          {uploadError && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-t-4 border-red-500">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h3 className="text-lg font-bold text-gray-900">上传失败</h3>
                </div>
                <p className="text-gray-700 mb-6">{uploadError}</p>
                <div className="flex justify-end">
                  <button
                    onClick={() => setUploadError(null)}
                    className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    我知道了
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Undo/Redo Toast */}
          {undoRedoToast && (
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
              <div className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">{undoRedoToast}</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {showPlaceholders && (
        <PlaceholderManager
          placeholders={state.placeholders}
          onChange={setPlaceholders}
          onClose={() => setShowPlaceholders(false)}
        />
      )}
    </div>
  );
}
