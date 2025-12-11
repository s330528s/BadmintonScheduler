
import React, { useState } from 'react';
import { Player } from '../types';
import { Button } from './Button';
import { Plus, X, Users, FileEdit, Check, RotateCcw, Link, FileSpreadsheet, Loader2, AlertCircle, Download, Copy, ClipboardCheck } from 'lucide-react';

interface PlayerManagerProps {
  players: Player[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onUpdatePlayers: (names: string[]) => void;
  isAdmin: boolean;
}

export const PlayerManager: React.FC<PlayerManagerProps> = ({ players, onAddPlayer, onRemovePlayer, onUpdatePlayers, isAdmin }) => {
  const [newName, setNewName] = useState('');
  
  // Text Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  // Sheet Import Mode
  const [isSheetImporting, setIsSheetImporting] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [sheetError, setSheetError] = useState('');
  
  // Import Preview State
  const [parsedNames, setParsedNames] = useState<string[] | null>(null);

  // Copy Feedback State
  const [isCopied, setIsCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddPlayer(newName.trim());
      setNewName('');
    }
  };

  // --- Export Logic ---
  const handleExportCSV = () => {
      if (players.length === 0) return;
      
      // Add BOM for Excel compatibility + Join names
      const csvContent = "\uFEFF" + players.map(p => p.name).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const dateStr = new Date().toISOString().slice(0,10);
      link.href = url;
      link.setAttribute('download', `badminton_players_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleCopyList = () => {
      if (players.length === 0) return;

      const text = players.map(p => p.name).join("\n");
      navigator.clipboard.writeText(text).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      });
  };

  // --- Text Batch Edit Logic ---
  const startEditing = () => {
    setEditText(players.map(p => p.name).join('\n'));
    setIsEditing(true);
    setIsSheetImporting(false);
    setParsedNames(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditText('');
  };

  const saveEditing = () => {
    const names = editText.split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0);
    const uniqueNames = Array.from(new Set(names));
    onUpdatePlayers(uniqueNames);
    setIsEditing(false);
  };

  // --- Google Sheet Import Logic ---
  const startSheetImport = () => {
      setIsSheetImporting(true);
      setIsEditing(false);
      setSheetUrl('');
      setSheetError('');
      setParsedNames(null);
  };

  const cancelSheetImport = () => {
      setIsSheetImporting(false);
      setSheetUrl('');
      setSheetError('');
      setParsedNames(null);
  };

  const confirmSheetImport = () => {
      if (parsedNames && parsedNames.length > 0) {
          onUpdatePlayers(parsedNames);
          // Reset states
          setIsSheetImporting(false);
          setParsedNames(null);
          setSheetUrl('');
      }
  };

  const handleFetchSheet = async () => {
      if (!sheetUrl) return;

      setIsLoadingSheet(true);
      setSheetError('');
      setParsedNames(null);
      console.log("--- 開始讀取名單 ---");
      console.log("目標 URL:", sheetUrl);

      try {
          let targetUrl = sheetUrl.trim();

          // 嘗試修正常見的錯誤連結 (例如直接複製網址列的 edit 連結)
          if (targetUrl.includes('/edit') && !targetUrl.includes('output=csv')) {
             const match = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
             if (match && match[1]) {
                 const newUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
                 console.log("偵測到編輯連結，嘗試轉換為匯出連結:", newUrl);
                 targetUrl = newUrl;
             }
          }

          const response = await fetch(targetUrl);
          console.log("Response Status:", response.status);
          
          if (!response.ok) {
              throw new Error(`讀取失敗 (Status: ${response.status})。請確認連結權限是否已設為「公開/發佈到網路」。`);
          }

          const csvText = await response.text();
          console.log("取得內容長度:", csvText.length);
          
          // Robust parsing for CSV
          const rows = csvText.split(/\r\n|\n|\r/);
          const names: string[] = [];

          rows.forEach((row, idx) => {
              if (!row.trim()) return;

              // Simple CSV parsing: assumes name is in the first column.
              let firstCell = row.split(',')[0].trim();
              
              // Remove BOM if present at start of file
              if (idx === 0) {
                  firstCell = firstCell.replace(/^\ufeff/, '');
              }

              if (firstCell.startsWith('"') && firstCell.endsWith('"')) {
                  firstCell = firstCell.slice(1, -1).trim();
              }
              
              firstCell = firstCell.replace(/""/g, '"');

              if (firstCell && firstCell.length > 0) {
                  names.push(firstCell);
              }
          });

          console.log("解析出的名字列表:", names);

          if (names.length === 0) {
              throw new Error("無法從檔案中解析出名字。請確認連結是否為 CSV 格式，且第一欄包含資料。");
          }

          const uniqueNames = Array.from(new Set(names));
          setParsedNames(uniqueNames);

      } catch (err: any) {
          console.error("Import Error:", err);
          setSheetError(err.message || "發生未知錯誤，請檢查 Console Log。");
      } finally {
          setIsLoadingSheet(false);
      }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2 text-slate-800">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold">人員管理 ({players.length}人)</h2>
        </div>
        {!isEditing && !isSheetImporting && (
            <div className="flex flex-wrap gap-2">
                 {/* Export Tools (Available to everyone) */}
                 <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 mr-2">
                    <button 
                        onClick={handleExportCSV}
                        className="text-slate-600 hover:text-emerald-700 hover:bg-white p-1.5 rounded-md transition-all"
                        title="下載為 CSV (可匯入 Google Sheets)"
                        disabled={players.length === 0}
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <div className="w-[1px] h-4 bg-slate-300 mx-0.5"></div>
                    <button 
                        onClick={handleCopyList}
                        className={`p-1.5 rounded-md transition-all flex items-center gap-1 ${isCopied ? 'text-emerald-700 bg-emerald-100' : 'text-slate-600 hover:text-emerald-700 hover:bg-white'}`}
                        title="複製名單到剪貼簿"
                        disabled={players.length === 0}
                    >
                        {isCopied ? <ClipboardCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {isCopied && <span className="text-xs font-bold px-1">已複製</span>}
                    </button>
                 </div>

                {/* Admin Tools */}
                {isAdmin && (
                    <>
                        <button 
                            onClick={startSheetImport}
                            className="text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 flex items-center gap-2 text-sm font-bold transition-colors px-3 py-1.5 rounded-lg"
                            title="從 Google Sheets 匯入"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span className="hidden sm:inline">匯入 Sheets</span>
                        </button>
                        <button 
                            onClick={startEditing}
                            className="text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 flex items-center gap-2 text-sm font-bold transition-colors px-3 py-1.5 rounded-lg"
                            title="批次文字編輯"
                        >
                            <FileEdit className="w-4 h-4" />
                            <span className="hidden sm:inline">批次編輯</span>
                        </button>
                    </>
                )}
            </div>
        )}
      </div>

      {isSheetImporting ? (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200 bg-slate-50 p-5 rounded-xl border-2 border-emerald-100">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-base">
                  <div className="bg-green-100 p-1.5 rounded text-green-700">
                     <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  從 Google Sheets 匯入
              </h3>
              
              {!parsedNames && (
                  <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4 shadow-sm">
                      <ol className="text-sm text-slate-700 list-decimal list-inside space-y-2 font-medium">
                          <li>在 Google Sheets 點選 <span className="text-emerald-700 bg-emerald-50 px-1 rounded">檔案 &gt; 共用 &gt; 發佈到網路</span></li>
                          <li>連結格式選擇 <span className="text-emerald-700 bg-emerald-50 px-1 rounded">CSV (逗號分隔值)</span></li>
                          <li>點擊發佈，並複製產生的連結貼在下方</li>
                          <li>系統將讀取 <span className="text-emerald-700 bg-emerald-50 px-1 rounded">第一欄 (Column A)</span> 作為名字</li>
                      </ol>
                  </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="在此貼上連結 (https://docs.google.com/.../pub?output=csv)"
                    className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder:text-slate-400 font-medium"
                    disabled={!!parsedNames} 
                  />
                  {!parsedNames && (
                      <Button variant="primary" onClick={handleFetchSheet} disabled={isLoadingSheet || !sheetUrl} className="whitespace-nowrap px-6">
                          {isLoadingSheet ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link className="w-4 h-4 mr-2" />}
                          {isLoadingSheet ? "讀取中..." : "讀取資料"}
                      </Button>
                  )}
              </div>

              {sheetError && (
                  <div className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2 shadow-sm">
                      <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                      <div className="font-medium whitespace-pre-wrap">{sheetError}</div>
                  </div>
              )}

              {/* Preview Section */}
              {parsedNames && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                          <h4 className="font-bold text-emerald-800 mb-2 flex items-center justify-between">
                              <span>讀取成功！共 {parsedNames.length} 位選手</span>
                              <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full">預覽</span>
                          </h4>
                          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-white/50 rounded border border-emerald-100/50">
                              {parsedNames.map((name, i) => (
                                  <span key={i} className="text-xs font-medium text-slate-700 bg-white border border-emerald-100 px-2 py-1 rounded shadow-sm">
                                      {name}
                                  </span>
                              ))}
                          </div>
                          <div className="mt-3 text-xs text-emerald-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              確認匯入將會覆蓋目前所有人員名單
                          </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                           <Button variant="ghost" onClick={() => setParsedNames(null)}>
                               重新讀取
                           </Button>
                           <Button variant="primary" onClick={confirmSheetImport} className="shadow-lg shadow-emerald-500/20">
                               <Check className="w-4 h-4 mr-2" />
                               確認匯入
                           </Button>
                      </div>
                  </div>
              )}

              {!parsedNames && (
                <div className="flex justify-end pt-2 border-t border-slate-200/50 mt-2">
                    <Button variant="ghost" size="sm" onClick={cancelSheetImport}>
                        取消
                    </Button>
                </div>
              )}
          </div>
      ) : isEditing ? (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="mb-3 text-sm text-slate-700 font-medium flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-emerald-600" />
                請輸入人員名單，每行一個名字
            </div>
            <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full h-48 p-4 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-base text-slate-800 leading-relaxed resize-y bg-white placeholder:text-slate-300"
                placeholder="例如：&#10;小戴&#10;小天&#10;麟洋"
            />
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={cancelEditing}>
                    <RotateCcw className="w-4 h-4 mr-1" /> 取消
                </Button>
                <Button variant="primary" onClick={saveEditing}>
                    <Check className="w-4 h-4 mr-1" /> 儲存變更
                </Button>
            </div>
        </div>
      ) : (
        <>
            {isAdmin && (
                <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
                    <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="輸入名字 (例如: 小戴)"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow text-slate-800 placeholder:text-slate-400"
                    />
                    <Button type="submit" disabled={!newName.trim()}>
                    <Plus className="w-5 h-5 mr-1" /> 新增
                    </Button>
                </form>
            )}

            <div className="flex flex-wrap gap-2">
                {players.length === 0 ? (
                <div className="w-full text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <p className="text-slate-500 text-sm italic mb-2">
                        目前沒有人員名單
                    </p>
                    {isAdmin && (
                        <p className="text-slate-400 text-xs">
                            請上方輸入名字新增，或是使用「匯入 Sheets」功能
                        </p>
                    )}
                </div>
                ) : (
                players.map(player => (
                    <div 
                    key={player.id} 
                    className="group flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 transition-colors"
                    >
                    <span className="font-medium text-slate-700">{player.name}</span>
                    {isAdmin && (
                        <button 
                            onClick={() => onRemovePlayer(player.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-red-50"
                            aria-label="Remove player"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    </div>
                ))
                )}
            </div>
        </>
      )}
    </div>
  );
};
