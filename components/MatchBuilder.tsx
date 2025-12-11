
import React, { useState, useMemo, useEffect } from 'react';
import { Player, MatchType } from '../types';
import { Button } from './Button';
import { Shuffle, Swords, Check, Sparkles, GripVertical, X } from 'lucide-react';
import { getTacticalAdvice } from '../services/geminiService';

interface MatchBuilderProps {
  players: Player[];
  onCreateMatch: (type: MatchType, teamA: Player[], teamB: Player[]) => void;
}

export const MatchBuilder: React.FC<MatchBuilderProps> = ({ players, onCreateMatch }) => {
  const [matchType, setMatchType] = useState<MatchType>('doubles');
  // Separate state for Team A and Team B to allow specific placement
  const [teamAIds, setTeamAIds] = useState<string[]>([]);
  const [teamBIds, setTeamBIds] = useState<string[]>([]);
  
  const [advice, setAdvice] = useState<string>("");
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  // Constants
  const playersPerTeam = matchType === 'singles' ? 1 : 2;
  const requiredPlayers = playersPerTeam * 2;

  // --- Clean up selections when players change ---
  useEffect(() => {
    // If a player is removed from the main list (e.g., imported new list), 
    // remove their ID from the selection to prevent errors.
    const validIds = new Set(players.map(p => p.id));
    
    setTeamAIds(prev => prev.filter(id => validIds.has(id)));
    setTeamBIds(prev => prev.filter(id => validIds.has(id)));
  }, [players]);

  // --- Drag and Drop Logic ---

  const handleDragStart = (e: React.DragEvent, playerId: string, source: 'roster' | 'teamA' | 'teamB') => {
    e.dataTransfer.setData("playerId", playerId);
    e.dataTransfer.setData("source", source);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetTeam: 'teamA' | 'teamB') => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");
    const source = e.dataTransfer.getData("source");

    if (!playerId) return;

    // Logic to move player
    movePlayer(playerId, source as any, targetTeam);
  };

  const movePlayer = (playerId: string, source: 'roster' | 'teamA' | 'teamB', target: 'roster' | 'teamA' | 'teamB') => {
    if (source === target) return;

    // 1. Remove from Source
    if (source === 'teamA') setTeamAIds(prev => prev.filter(id => id !== playerId));
    if (source === 'teamB') setTeamBIds(prev => prev.filter(id => id !== playerId));
    // (If source is roster, we don't need to 'remove' from state, just check existence)

    // 2. Add to Target (if limits allow)
    if (target === 'teamA') {
        if (teamAIds.length < playersPerTeam) {
            setTeamAIds(prev => [...prev, playerId]);
        } else if (source !== 'teamA') {
             // Swap behavior if full? Or just reject? Let's reject for simplicity or swap if source was teamB
             // For now, simpler: don't add if full.
        }
    } else if (target === 'teamB') {
        if (teamBIds.length < playersPerTeam) {
            setTeamBIds(prev => [...prev, playerId]);
        }
    }
  };

  // Click fallback for accessibility/mobile
  const handleRosterClick = (playerId: string) => {
      if (teamAIds.length < playersPerTeam) {
          setTeamAIds(prev => [...prev, playerId]);
      } else if (teamBIds.length < playersPerTeam) {
          setTeamBIds(prev => [...prev, playerId]);
      }
  };

  const handleTeamPlayerClick = (playerId: string, team: 'teamA' | 'teamB') => {
      if (team === 'teamA') setTeamAIds(prev => prev.filter(id => id !== playerId));
      else setTeamBIds(prev => prev.filter(id => id !== playerId));
  };


  // --- Helper Functions ---

  const resetSelection = () => {
      setTeamAIds([]);
      setTeamBIds([]);
      setAdvice("");
  };

  const fillRandomly = () => {
    // Current selected IDs
    const currentSelected = [...teamAIds, ...teamBIds];
    const available = players.filter(p => !currentSelected.includes(p.id));
    
    // How many more needed?
    const neededA = playersPerTeam - teamAIds.length;
    const neededB = playersPerTeam - teamBIds.length;
    const totalNeeded = neededA + neededB;

    if (available.length < totalNeeded) {
      alert("剩餘人員不足以組成比賽！");
      return;
    }

    // Shuffle available
    const shuffled = [...available].sort(() => 0.5 - Math.random());

    const newA = shuffled.slice(0, neededA).map(p => p.id);
    const newB = shuffled.slice(neededA, neededA + neededB).map(p => p.id);

    setTeamAIds(prev => [...prev, ...newA]);
    setTeamBIds(prev => [...prev, ...newB]);
  };

  const handleCreate = () => {
    const pA = teamAIds.map(id => players.find(p => p.id === id)!).filter(Boolean);
    const pB = teamBIds.map(id => players.find(p => p.id === id)!).filter(Boolean);

    if (pA.length !== playersPerTeam || pB.length !== playersPerTeam) return;

    onCreateMatch(matchType, pA, pB);
    resetSelection();
  };

  const fetchAdvice = async () => {
    setLoadingAdvice(true);
    const text = await getTacticalAdvice(matchType);
    setAdvice(text);
    setLoadingAdvice(false);
  }

  // --- Derived State ---
  
  const availablePlayers = useMemo(() => {
      const allSelected = [...teamAIds, ...teamBIds];
      return players.filter(p => !allSelected.includes(p.id));
  }, [players, teamAIds, teamBIds]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-6">
      <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
        <h2 className="font-bold text-lg flex items-center gap-2">
            <Swords className="w-5 h-5" /> 
            安排賽程
        </h2>
        <div className="flex bg-emerald-700 rounded-lg p-1">
          <button
            onClick={() => { setMatchType('singles'); resetSelection(); }}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${matchType === 'singles' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-100 hover:bg-emerald-600'}`}
          >
            單打
          </button>
          <button
            onClick={() => { setMatchType('doubles'); resetSelection(); }}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${matchType === 'doubles' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-100 hover:bg-emerald-600'}`}
          >
            雙打
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Advice Section */}
        <div className="mb-6">
             {!advice ? (
                 <button onClick={fetchAdvice} disabled={loadingAdvice} className="text-xs text-emerald-600 font-medium flex items-center hover:underline">
                     <Sparkles className="w-3 h-3 mr-1" /> 
                     {loadingAdvice ? "思考中..." : "向 AI 詢問戰術建議"}
                 </button>
             ) : (
                 <div className="bg-amber-50 text-amber-800 text-sm p-3 rounded-lg border border-amber-200 flex items-start">
                     <Sparkles className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-amber-500" />
                     {advice}
                 </div>
             )}
        </div>

        {/* Court Visualization (Drop Zones) */}
        <div className="bg-emerald-50 rounded-xl p-4 md:p-6 border-2 border-dashed border-emerald-200 mb-6 relative">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-b-md font-bold uppercase tracking-wider">
                Court (拖曳至此)
             </div>
             
             <div className="flex flex-col md:flex-row justify-between items-stretch gap-4 mt-2">
                {/* Team A Drop Zone */}
                <div 
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'teamA')}
                    className={`flex-1 flex flex-col gap-2 p-3 rounded-lg transition-colors min-h-[120px] ${teamAIds.length < playersPerTeam ? 'bg-blue-50/50 border-2 border-dashed border-blue-200 hover:bg-blue-100/50' : 'bg-blue-50 border border-blue-200'}`}
                >
                    <div className="text-center text-xs text-blue-600 font-bold mb-1 uppercase tracking-wider">Team A</div>
                    
                    {teamAIds.map(id => {
                        const player = players.find(p => p.id === id);
                        if (!player) return null;
                        return (
                            <div 
                                key={id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, id, 'teamA')}
                                onClick={() => handleTeamPlayerClick(id, 'teamA')}
                                className="bg-white border border-blue-200 shadow-sm p-2 rounded-md flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-red-300 group"
                            >
                                <div className="flex items-center gap-2">
                                    <GripVertical className="w-4 h-4 text-slate-300" />
                                    <span className="font-bold text-slate-700">{player.name}</span>
                                </div>
                                <X className="w-4 h-4 text-slate-300 hover:text-red-500 cursor-pointer" />
                            </div>
                        );
                    })}
                    
                    {teamAIds.length < playersPerTeam && (
                         <div className="flex-1 flex items-center justify-center text-blue-200 text-sm italic pointer-events-none">
                            拖曳球員至 A 隊
                         </div>
                    )}
                </div>

                <div className="flex items-center justify-center">
                    <div className="text-emerald-300 font-bold text-xl italic bg-white p-2 rounded-full shadow-sm">VS</div>
                </div>

                {/* Team B Drop Zone */}
                <div 
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'teamB')}
                    className={`flex-1 flex flex-col gap-2 p-3 rounded-lg transition-colors min-h-[120px] ${teamBIds.length < playersPerTeam ? 'bg-red-50/50 border-2 border-dashed border-red-200 hover:bg-red-100/50' : 'bg-red-50 border border-red-200'}`}
                >
                    <div className="text-center text-xs text-red-600 font-bold mb-1 uppercase tracking-wider">Team B</div>
                    
                    {teamBIds.map(id => {
                        const player = players.find(p => p.id === id);
                        if (!player) return null;
                        return (
                            <div 
                                key={id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, id, 'teamB')}
                                onClick={() => handleTeamPlayerClick(id, 'teamB')}
                                className="bg-white border border-red-200 shadow-sm p-2 rounded-md flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-red-300 group"
                            >
                                <div className="flex items-center gap-2">
                                    <GripVertical className="w-4 h-4 text-slate-300" />
                                    <span className="font-bold text-slate-700">{player.name}</span>
                                </div>
                                <X className="w-4 h-4 text-slate-300 hover:text-red-500 cursor-pointer" />
                            </div>
                        );
                    })}

                    {teamBIds.length < playersPerTeam && (
                         <div className="flex-1 flex items-center justify-center text-red-200 text-sm italic pointer-events-none">
                            拖曳球員至 B 隊
                         </div>
                    )}
                </div>
             </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-6">
            <Button 
                variant="secondary" 
                fullWidth 
                onClick={fillRandomly}
                disabled={(teamAIds.length === playersPerTeam && teamBIds.length === playersPerTeam) || availablePlayers.length < (requiredPlayers - teamAIds.length - teamBIds.length)}
            >
                <Shuffle className="w-4 h-4 mr-2" /> 隨機補滿
            </Button>
            <Button 
                variant="primary" 
                fullWidth 
                onClick={handleCreate}
                disabled={teamAIds.length !== playersPerTeam || teamBIds.length !== playersPerTeam}
            >
                <Check className="w-4 h-4 mr-2" /> 建立比賽
            </Button>
        </div>

        {/* Player Roster (Source) */}
        <div>
            <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider flex justify-between items-center">
                <span>候選名單 ({availablePlayers.length})</span>
                <span className="text-xs font-normal text-slate-400 normal-case">可拖曳或點擊加入</span>
            </h3>
            
            <div 
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 min-h-[50px] bg-slate-50 p-2 rounded-lg border border-slate-100"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'roster' as any)}
            >
                {availablePlayers.map(player => (
                    <div
                        key={player.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, player.id, 'roster')}
                        onClick={() => handleRosterClick(player.id)}
                        className="
                            bg-white border border-slate-200 text-slate-700 
                            px-3 py-2 rounded-lg text-sm font-medium shadow-sm
                            flex items-center gap-2 cursor-grab active:cursor-grabbing hover:border-emerald-400 hover:text-emerald-700 transition-all select-none
                        "
                    >
                        <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                        <span className="truncate">{player.name}</span>
                    </div>
                ))}
                
                {availablePlayers.length === 0 && (
                    <div className="col-span-full text-center text-slate-300 text-xs py-4">
                        {players.length === 0 ? "請先新增人員" : "所有人員已在場上"}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
