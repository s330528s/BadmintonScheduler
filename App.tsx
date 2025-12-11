import React, { useState, useEffect } from 'react';
import { Player, Match, MatchType, Tournament, Competitor } from './types';
import { PlayerManager } from './components/PlayerManager';
import { MatchBuilder } from './components/MatchBuilder';
import { MatchList } from './components/MatchList';
import { TournamentBracket } from './components/TournamentBracket';
import { createTournament, createGroupCycleTournament, updateBracket, generateId } from './services/tournamentService';
import { Activity, Trophy, PlayCircle, Calendar, Trash2, Crown, Eye, Play, Sparkles, Star, Shield, Hash, Users2, Lock, Unlock, LogIn, LogOut, X, Info, CheckCircle2, Split } from 'lucide-react';
import { Button } from './components/Button';

type ViewMode = 'single_match' | 'tournament';
type PlayerStatus = 'normal' | 'seed' | 'separated';

// Constants for Default Data
const DEFAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSVyuttZt3lVHq2kuAn2066G2clVfubRJyFDp42_L2oDXpek9Ic41F0SYkllM4P0NuxI-axlO8JeBZQ/pub?gid=0&single=true&output=csv";

const FALLBACK_PLAYERS: Player[] = [
    { id: '1', name: '小戴' },
    { id: '2', name: '小天' },
    { id: '3', name: '麟洋' },
    { id: '4', name: '王齊麟' },
    { id: '5', name: '安洗瑩' },
    { id: '6', name: '山口茜' },
    { id: '7', name: '周天成' },
    { id: '8', name: '王子維' },
    { id: '9', name: '李洋' },
    { id: '10', name: '陳雨菲' },
    { id: '11', name: '馬琳' },
    { id: '12', name: '辛度' }
];

// --- Sub-component: History Row ---
interface HistoryItemRowProps {
    item: Tournament;
    onResume: (item: Tournament) => void;
    onDelete: (id: string) => void;
    isAdmin: boolean;
}

const HistoryItemRow: React.FC<HistoryItemRowProps> = ({ item, onResume, onDelete, isAdmin }) => {
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        if (confirming) {
            const timer = setTimeout(() => setConfirming(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [confirming]);

    return (
        <div 
            className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group relative border-b last:border-0 border-slate-100 cursor-pointer"
            onClick={() => onResume(item)}
            title="點擊檢視詳細賽程"
        >
            <div className="flex items-center gap-4">
                <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm shrink-0
                    ${item.status === 'completed' ? 'bg-yellow-500' : 'bg-slate-400'}
                `}>
                    {item.status === 'completed' ? <Crown className="w-5 h-5" /> : <Play className="w-4 h-4 ml-0.5" />}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${item.type === 'singles' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {item.format === 'round-robin-6' ? '雙打循環 (6組)' : (item.type === 'singles' ? '單打' : '雙打')}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded flex items-center gap-0.5">
                            <Hash className="w-3 h-3" />
                            {item.id.split('-')[0]}
                        </span>
                        <span className="text-xs text-slate-400">
                            {new Date(item.timestamp).toLocaleString([], {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {item.champion ? (
                            <span className="font-bold text-slate-800 flex items-center gap-1 text-sm truncate">
                                <Crown className="w-3 h-3 text-yellow-500" />
                                冠軍: {item.champion.name}
                            </span>
                        ) : (
                            <span className="text-slate-600 text-sm font-medium">
                                未完成 ({item.rounds} 輪/階段)
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 relative z-10 shrink-0 ml-2">
                <button 
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onResume(item);
                    }}
                    className="p-2 text-slate-500 hover:text-emerald-600 bg-white hover:bg-emerald-50 rounded-full transition-all border border-slate-200 hover:border-emerald-200 shadow-sm"
                    title={item.status === 'completed' ? "檢視紀錄" : "繼續比賽"}
                >
                    {item.status === 'completed' ? <Eye className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                </button>
                {isAdmin && (
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirming) {
                                onDelete(item.id);
                            } else {
                                setConfirming(true);
                            }
                        }}
                        className={`
                            p-2 rounded-full transition-all border cursor-pointer flex items-center gap-1 shadow-sm
                            ${confirming 
                                ? 'bg-red-500 text-white border-red-600 w-auto px-3' 
                                : 'text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 border-slate-200 hover:border-red-200'}
                        `}
                        title={confirming ? "點擊以確認刪除" : "刪除紀錄"}
                    >
                        <Trash2 className="w-4 h-4" />
                        {confirming && <span className="text-xs font-bold whitespace-nowrap animate-in fade-in slide-in-from-right-2">確認?</span>}
                    </button>
                )}
            </div>
        </div>
    );
};

// --- Sub-component: Login Modal ---
interface LoginModalProps {
    onLogin: (success: boolean) => void;
    onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (username === 'admin' && password === 'admin') {
            onLogin(true);
        } else {
            setError('帳號或密碼錯誤');
            setPassword('');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-8 animate-in zoom-in-95 duration-200 border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-slate-900 font-extrabold text-2xl flex items-center gap-3">
                        <Lock className="w-7 h-7 text-emerald-600" />
                        管理員登入
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-base font-bold text-slate-800 mb-2">帳號</label>
                        <input 
                            type="text" 
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold text-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                            placeholder="請輸入帳號"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-base font-bold text-slate-800 mb-2">密碼</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold text-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                            placeholder="請輸入密碼"
                        />
                    </div>
                    
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm font-bold p-3 rounded-lg flex items-center gap-2 border border-red-100">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <div className="pt-2">
                        <Button fullWidth size="lg" type="submit" className="font-bold text-lg py-4 shadow-lg shadow-emerald-600/20">
                            登入系統
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function App() {
  // Default to tournament view
  const [viewMode, setViewMode] = useState<ViewMode>('tournament');
  
  // Auth State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Initialize with fallback to ensure UI isn't empty while fetching
  const [players, setPlayers] = useState<Player[]>(FALLBACK_PLAYERS);
  
  // Attempt to fetch players from CSV on mount
  useEffect(() => {
      const fetchDefaultPlayers = async () => {
          try {
              const response = await fetch(DEFAULT_CSV_URL);
              if (!response.ok) throw new Error("Failed to fetch default player CSV");
              
              const csvText = await response.text();
              const rows = csvText.split(/\r\n|\n|\r/);
              const names: string[] = [];
              
              rows.forEach((row, idx) => {
                  if (!row.trim()) return;
                  let cell = row.split(',')[0].trim();
                  // Remove BOM if present
                  if (idx === 0) cell = cell.replace(/^\ufeff/, '');
                  // Handle quotes
                  if (cell.startsWith('"') && cell.endsWith('"')) {
                      cell = cell.slice(1, -1).trim();
                  }
                  cell = cell.replace(/""/g, '"');
                  
                  if (cell) names.push(cell);
              });
              
              const uniqueNames = Array.from(new Set(names));
              
              if (uniqueNames.length > 0) {
                  const newPlayers = uniqueNames.map(name => ({ 
                      id: generateId(), 
                      name 
                  }));
                  setPlayers(newPlayers);
                  console.log(`Successfully loaded ${newPlayers.length} players from default CSV.`);
              }
          } catch (error) {
              console.warn("Could not load default players from CSV, using built-in fallback.", error);
              // No action needed, fallback players are already set in initial state
          }
      };

      fetchDefaultPlayers();
  }, []);
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tournamentHistory, setTournamentHistory] = useState<Tournament[]>([]);
  const [playerConfig, setPlayerConfig] = useState<Record<string, PlayerStatus>>({});

  // --- Auth Handlers ---
  const handleLoginSuccess = () => {
      setIsAdmin(true);
      setShowLoginModal(false);
  };

  const handleLogout = () => {
      setIsAdmin(false);
  };

  // --- Player Management ---
  const addPlayer = (name: string) => {
    if (!isAdmin) return;
    const newPlayer: Player = { id: generateId(), name };
    setPlayers(prev => [...prev, newPlayer]);
  };

  const removePlayer = (id: string) => {
    if (!isAdmin) return;
    setPlayers(prev => prev.filter(p => p.id !== id));
    setPlayerConfig(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
    });
  };

  // Bulk update from list import
  const handleUpdatePlayerList = (newNames: string[]) => {
      if (!isAdmin) return;
      console.log("Updating players with list:", newNames);
      setPlayers(prevPlayers => {
          // Map existing players by name to preserve IDs where possible
          const existingMap = new Map(prevPlayers.map(p => [p.name, p]));
          
          return newNames.map(name => {
              // Return existing player object if name matches, otherwise create new
              return existingMap.get(name) || { id: generateId(), name };
          });
      });
  };

  const togglePlayerStatus = (id: string) => {
      if (!isAdmin) return;
      setPlayerConfig(prev => {
          const current = prev[id];
          
          // Cycle: undefined/none -> normal -> seed -> separated -> undefined/none
          if (!current) return { ...prev, [id]: 'normal' };
          if (current === 'normal') return { ...prev, [id]: 'seed' };
          if (current === 'seed') return { ...prev, [id]: 'separated' };
          
          // If separated, delete key to reset to none
          const next = { ...prev };
          delete next[id];
          return next;
      });
  };

  // --- Single Match Logic ---
  const createMatch = (type: MatchType, teamA: Player[], teamB: Player[]) => {
    if (!isAdmin) return;
    const newMatch: Match = {
      id: generateId(),
      type,
      teamA,
      teamB,
      timestamp: Date.now()
    };
    setMatches(prev => [newMatch, ...prev]);
  };

  const deleteMatch = (id: string) => {
    if (!isAdmin) return;
    setMatches(prev => prev.filter(m => m.id !== id));
  };

  const updateMatchCommentary = (id: string, text: string) => {
      setMatches(prev => prev.map(m => m.id === id ? { ...m, aiCommentary: text } : m));
  };

  // --- Helper: Sort History ---
  const sortHistory = (list: Tournament[]) => {
      return [...list].sort((a, b) => b.timestamp - a.timestamp);
  };

  // --- Tournament Logic ---
  const handleStartTournament = (type: MatchType) => {
      if (!isAdmin) return;
      
      // Filter players who are selected in config
      const participatingPlayers = players.filter(p => playerConfig[p.id]);

      const newTournament = createTournament(participatingPlayers, type, playerConfig);
      if (newTournament) {
          if (tournament) {
              setTournamentHistory(prev => sortHistory([tournament, ...prev]));
          }
          setTournament(newTournament);
      } else {
          alert(`選取人數不足以建立賽程 (單打至少2人，雙打至少4人)\n目前已選取: ${participatingPlayers.length} 人`);
      }
  };

  const handleStartGroupCycle = () => {
      if (!isAdmin) return;
      
      // Filter players who are selected in config
      const participatingPlayers = players.filter(p => playerConfig[p.id]);

      if (participatingPlayers.length < 12) {
          alert(`選取人數不足！目前選取 ${participatingPlayers.length} 人，建立「6組循環賽」至少需要 12 人。`);
          return;
      }
      
      const newTournament = createGroupCycleTournament(participatingPlayers, playerConfig);
      if (newTournament) {
          if (tournament) {
              setTournamentHistory(prev => sortHistory([tournament, ...prev]));
          }
          setTournament(newTournament);
      }
  };

  const handleTournamentUpdate = (matchId: string, winner: Competitor, scoreA?: number, scoreB?: number) => {
      if (!isAdmin) return; // Guard
      if (!tournament) return;
      
      const newMatches = tournament.matches.map(m => ({ ...m }));
      const targetMatch = newMatches.find(m => m.id === matchId);
      if (targetMatch) {
          targetMatch.winner = winner;
          if (scoreA !== undefined) targetMatch.scoreA = scoreA;
          if (scoreB !== undefined) targetMatch.scoreB = scoreB;
      }
      
      const newTournament = { ...tournament, matches: newMatches };
      updateBracket(newTournament);
      setTournament(newTournament);
  };

  const handleCloseTournament = (save: boolean) => {
      if (tournament && save) {
          setTournamentHistory(prev => {
              const filtered = prev.filter(t => t.id !== tournament.id);
              return sortHistory([tournament, ...filtered]);
          });
      }
      setTournament(null);
  };

  // --- History Handlers ---

  const deleteHistory = (id: string) => {
      if (!isAdmin) return;
      setTournamentHistory(prev => prev.filter(t => t.id !== id));
  };

  const handleResumeTournament = (historyItem: Tournament) => {
      if (tournament && tournament.id !== historyItem.id) {
          setTournamentHistory(prev => {
              const filtered = prev.filter(t => t.id !== tournament.id);
              return sortHistory([tournament, ...filtered]);
          });
      }
      setTournament(historyItem);
  };

  const participatingCount = players.filter(p => playerConfig[p.id]).length;

  return (
    <div className="min-h-screen pb-12 bg-gray-50">
      {showLoginModal && (
          <LoginModal onLogin={handleLoginSuccess} onClose={() => setShowLoginModal(false)} />
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setViewMode('tournament')}>
            <div className="bg-emerald-600 p-2 rounded-lg text-white">
                <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">SmashMaster</h1>
          </div>
          
          <div className="flex items-center gap-3">
              {/* Navigation Tabs - Reordered: Match First, Tournament Second */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                    onClick={() => setViewMode('single_match')}
                    className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'single_match' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    <span className="hidden xs:inline">一般對戰</span>
                    <span className="xs:hidden">對戰</span>
                </button>
                <button
                    onClick={() => setViewMode('tournament')}
                    className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'tournament' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Trophy className="w-4 h-4 mr-2" />
                    <span className="hidden xs:inline">錦標賽</span>
                    <span className="xs:hidden">賽程</span>
                </button>
              </div>

              {/* Login Button */}
              {isAdmin ? (
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors text-sm font-medium"
                    title="登出管理員"
                  >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:inline">登出</span>
                  </button>
              ) : (
                  <button 
                    onClick={() => setShowLoginModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-medium"
                    title="管理員登入"
                  >
                      <LogIn className="w-4 h-4" />
                      <span className="hidden sm:inline">登入</span>
                  </button>
              )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* Permission Banner */}
        {!isAdmin && (
             <div className="mb-4 flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm border border-blue-100 shadow-sm">
                 <Eye className="w-5 h-5 shrink-0" />
                 <span className="font-medium">訪客模式：您目前僅能「檢視」名單與賽程紀錄。如需建立新比賽或編輯，請按右上角登入。</span>
             </div>
        )}

        {/* Player Management Area (Always visible) */}
        <PlayerManager 
            players={players} 
            onAddPlayer={addPlayer} 
            onRemovePlayer={removePlayer} 
            onUpdatePlayers={handleUpdatePlayerList}
            isAdmin={isAdmin}
        />

        {viewMode === 'single_match' ? (
            <>
                {isAdmin ? (
                    <MatchBuilder 
                        players={players} 
                        onCreateMatch={createMatch} 
                    />
                ) : (
                    <div className="mb-6 p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <h3 className="text-slate-600 font-medium">建立新比賽功能已鎖定</h3>
                        <p className="text-slate-400 text-sm mt-1">請查看下方的對戰列表，或登入以新增賽程</p>
                    </div>
                )}
                <MatchList 
                    matches={matches} 
                    onDeleteMatch={deleteMatch}
                    onUpdateMatchCommentary={updateMatchCommentary}
                    isAdmin={isAdmin}
                />
            </>
        ) : (
            <div className="space-y-6">
                {!tournament ? (
                    <>
                        {/* Tournament Creation Card */}
                        <div className={`bg-white rounded-xl shadow-lg border border-slate-200 p-8 relative overflow-hidden ${!isAdmin ? 'bg-slate-50' : ''}`}>
                            <div className="text-center mb-6">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isAdmin ? 'bg-yellow-50' : 'bg-slate-200'}`}>
                                    {isAdmin ? <Trophy className="w-8 h-8 text-yellow-600" /> : <Lock className="w-8 h-8 text-slate-500" />}
                                </div>
                                <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
                                    建立賽程
                                    {!isAdmin && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-normal">管理員限定</span>}
                                </h2>
                                <p className="text-slate-500 max-w-md mx-auto">
                                    選擇淘汰賽制或分組循環賽制
                                </p>
                            </div>

                            {/* Seeding Section */}
                            {players.length > 0 && (
                                <div className="mb-8 p-4 bg-white/50 rounded-lg border border-slate-200 shadow-sm">
                                    <h3 className={`text-sm font-bold mb-3 flex items-center justify-between ${isAdmin ? 'text-slate-700' : 'text-slate-400'}`}>
                                        <div className="flex items-center gap-2">
                                            <Sparkles className={`w-4 h-4 ${isAdmin ? 'text-emerald-500' : 'text-slate-300'}`} />
                                            參賽人員設定
                                        </div>
                                        <div className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                            已選取: {participatingCount} 人
                                        </div>
                                    </h3>

                                    {/* Helper Legend / Instruction */}
                                    {isAdmin && (
                                        <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                                            <div className="flex items-start gap-2">
                                                <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                                                <p>點擊選手名稱可切換狀態，<span className="font-bold text-slate-800">未選取(灰色)</span> 的選手將不會加入賽程。</p>
                                            </div>
                                            <div className="flex flex-wrap gap-4 mt-2 pt-2 border-t border-slate-200">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                                    <div className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1 shadow-sm">
                                                        <CheckCircle2 className="w-3 h-3" /> 
                                                        <span className="font-bold">參賽</span>
                                                    </div>
                                                    <span className="hidden sm:inline">(一般選手)</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                                    <div className="px-2 py-0.5 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 flex items-center gap-1 shadow-sm">
                                                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> 
                                                        <span className="font-bold">種子</span>
                                                    </div>
                                                    <span className="hidden sm:inline">(高順位)</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                                    <div className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 flex items-center gap-1 shadow-sm">
                                                        <Shield className="w-3 h-3 text-blue-500 fill-blue-500" /> 
                                                        <span className="font-bold">錯開</span>
                                                    </div>
                                                    <span className="hidden sm:inline">(盡量不同側)</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                                    <div className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-400 border-dashed flex items-center gap-1">
                                                        <span className="font-bold">未選</span>
                                                    </div>
                                                    <span className="hidden sm:inline">(不參賽)</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {players.map(player => {
                                            const status = playerConfig[player.id];
                                            return (
                                                <button
                                                    key={player.id}
                                                    onClick={() => togglePlayerStatus(player.id)}
                                                    disabled={!isAdmin}
                                                    className={`
                                                        px-3 py-2 rounded-lg text-sm font-medium transition-all text-left flex items-center gap-2 border select-none
                                                        ${status === 'seed' 
                                                            ? 'bg-yellow-50 border-yellow-200 text-yellow-800 shadow-sm ring-1 ring-yellow-200' 
                                                            : status === 'separated'
                                                                ? 'bg-blue-50 border-blue-200 text-blue-800 shadow-sm ring-1 ring-blue-200'
                                                                : status === 'normal'
                                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm'
                                                                    : 'bg-slate-50 border-slate-200 text-slate-400 border-dashed opacity-80 hover:opacity-100'}
                                                        ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}
                                                    `}
                                                >
                                                    {status === 'normal' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                                                    {status === 'seed' && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />}
                                                    {status === 'separated' && <Shield className="w-4 h-4 text-blue-500 fill-blue-500 shrink-0" />}
                                                    
                                                    <span className="truncate">{player.name}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Left: Elimination */}
                                <div className={`flex flex-col gap-4 p-4 border rounded-lg ${isAdmin ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-slate-100'}`}>
                                    <div className="text-center text-sm font-bold text-slate-600 mb-2">單淘汰賽制</div>
                                    <div className="flex justify-center gap-4">
                                        <Button variant="outline" onClick={() => handleStartTournament('singles')} disabled={!isAdmin}>
                                            建立單打賽程
                                        </Button>
                                        <Button variant="primary" onClick={() => handleStartTournament('doubles')} disabled={!isAdmin}>
                                            建立雙打賽程
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-400 text-center">適合快速決出冠軍，將從上方已選名單中產生對戰組合</p>
                                </div>

                                {/* Right: Round Robin */}
                                <div className={`flex flex-col gap-4 p-4 border rounded-lg ${isAdmin ? 'border-indigo-100 bg-indigo-50/50' : 'border-slate-200 bg-slate-100'}`}>
                                    <div className={`text-center text-sm font-bold mb-2 ${isAdmin ? 'text-indigo-700' : 'text-slate-600'}`}>分組循環積分賽</div>
                                    <div className="flex justify-center">
                                        <Button 
                                            onClick={handleStartGroupCycle}
                                            disabled={!isAdmin}
                                            className={`${isAdmin ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-400'} text-white focus:ring-indigo-500`}
                                        >
                                            <Users2 className="w-4 h-4 mr-2" />
                                            建立雙打循環賽 (6組)
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-400 text-center">
                                        需選取 12 人。分為 A, B 兩組循環
                                    </p>
                                </div>
                            </div>
                            
                            {players.length < 2 && <p className="text-red-500 text-xs mt-4 text-center">人員不足，請先新增人員</p>}
                        </div>

                        {/* Tournament History Log */}
                        {tournamentHistory.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> 歷史賽程紀錄
                                    </h3>
                                    <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">{tournamentHistory.length} 筆</span>
                                </div>
                                <div>
                                    {tournamentHistory.map((historyItem) => (
                                        <HistoryItemRow 
                                            key={historyItem.id} 
                                            item={historyItem} 
                                            onResume={handleResumeTournament}
                                            onDelete={deleteHistory}
                                            isAdmin={isAdmin}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <TournamentBracket 
                        key={tournament.id}
                        tournament={tournament}
                        onUpdateMatch={handleTournamentUpdate}
                        onSaveAndClose={() => handleCloseTournament(true)}
                        onClose={() => handleCloseTournament(false)}
                        isAdmin={isAdmin}
                    />
                )}
            </div>
        )}
        
      </main>

       {/* Footer */}
       <footer className="max-w-4xl mx-auto px-4 py-6 text-center text-slate-400 text-sm">
           <p>© {new Date().getFullYear()} SmashMaster. Badminton Scheduler.</p>
       </footer>
    </div>
  );
}