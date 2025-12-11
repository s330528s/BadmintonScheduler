
import React, { useState } from 'react';
import { Tournament, TournamentMatch, Competitor } from '../types';
import { Trophy, Crown, X, CheckCircle2, Save, LogOut, Eye, ArrowLeft, Star, Shield, ListOrdered, Medal } from 'lucide-react';

interface TournamentBracketProps {
  tournament: Tournament;
  onUpdateMatch: (matchId: string, winner: Competitor, scoreA: number, scoreB: number) => void;
  onSaveAndClose: () => void;
  onClose: () => void;
  isAdmin: boolean;
}

export const TournamentBracket: React.FC<TournamentBracketProps> = ({ tournament, onUpdateMatch, onSaveAndClose, onClose, isAdmin }) => {
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [showCelebration, setShowCelebration] = useState<boolean>(!!tournament.champion);

  const handleManualClose = () => {
      // If admin, we can save state (conceptually). If guest, just close.
      if (isAdmin) {
        onSaveAndClose();
      } else {
        onClose();
      }
  };

  const handleMatchClick = (match: TournamentMatch) => {
      if (!isAdmin) return; // Guests cannot click matches to edit scores
      setSelectedMatch(match);
  };

  // --- Render Functions ---

  const renderKnockoutView = () => {
    const totalRounds = tournament.rounds;
    const matchesByRound: Record<number, TournamentMatch[]> = {};
    for (let r = 1; r <= totalRounds; r++) {
        matchesByRound[r] = tournament.matches
            .filter(m => m.round === r)
            .sort((a, b) => a.matchIndex - b.matchIndex);
    }

    const renderColumn = (round: number, side: 'left' | 'right' | 'center') => {
        const matches = matchesByRound[round] || [];
        let displayMatches = matches;

        if (side !== 'center') {
            const mid = Math.ceil(matches.length / 2);
            if (side === 'left') {
                displayMatches = matches.slice(0, mid);
            } else {
                displayMatches = matches.slice(mid);
            }
        }

        return (
            <div key={`${side}-${round}`} className="flex flex-col justify-around px-4 gap-4 min-w-[200px]">
                {side !== 'center' && (
                    <div className="text-center text-blue-300 font-bold text-xs uppercase tracking-widest mb-2 opacity-70">
                        {round === totalRounds - 1 ? '四強' : `Round ${round}`}
                    </div>
                )}
                {side === 'center' && (
                    <div className="text-center text-yellow-400 font-bold text-sm uppercase tracking-widest mb-4">
                        冠軍賽
                    </div>
                )}
                
                {displayMatches.map(match => (
                    <MatchCard 
                        key={match.id} 
                        match={match} 
                        side={side}
                        onClick={() => handleMatchClick(match)}
                        isAdmin={isAdmin}
                    />
                ))}
            </div>
        );
    };

    const columns = [];
    for (let r = 1; r < totalRounds; r++) columns.push(renderColumn(r, 'left'));
    columns.push(renderColumn(totalRounds, 'center'));
    for (let r = totalRounds - 1; r >= 1; r--) columns.push(renderColumn(r, 'right'));

    return (
        <div className="flex justify-center min-w-max h-full">
            {columns}
        </div>
    );
  };

  const renderRoundRobinView = () => {
    const groupAMatches = tournament.matches.filter(m => m.group === 'A');
    const groupBMatches = tournament.matches.filter(m => m.group === 'B');
    const finals = tournament.matches.filter(m => m.group === 'Finals');
    const goldMatch = finals.find(m => m.id === 'FINAL-GOLD');
    const bronzeMatch = finals.find(m => m.id === 'FINAL-BRONZE');

    // Get unique teams for stats
    const getTeams = (matches: TournamentMatch[]) => {
        const map = new Map<string, Competitor>();
        matches.forEach(m => {
            if (m.competitorA) map.set(m.competitorA.id, m.competitorA);
            if (m.competitorB) map.set(m.competitorB.id, m.competitorB);
        });
        return Array.from(map.values()).sort((a, b) => {
            const winsA = a.stats?.wins || 0;
            const winsB = b.stats?.wins || 0;
            if (winsB !== winsA) return winsB - winsA;
            return (b.stats?.points || 0) - (a.stats?.points || 0);
        });
    };

    const teamStatsA = getTeams(groupAMatches);
    const teamStatsB = getTeams(groupBMatches);

    return (
        <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto px-4">
            
            {/* Finals Section - Top */}
            <div className="flex flex-col items-center justify-center gap-6 pb-6 border-b border-slate-700/50">
                <div className="flex items-end gap-12">
                     {/* Bronze */}
                     <div className="flex flex-col items-center">
                        <div className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Medal className="w-3 h-3" /> 季軍戰
                        </div>
                        {bronzeMatch && (
                            <MatchCard 
                                match={bronzeMatch} 
                                side="center" 
                                onClick={() => handleMatchClick(bronzeMatch)}
                                isAdmin={isAdmin} 
                            />
                        )}
                    </div>
                    
                    {/* Gold */}
                    <div className="flex flex-col items-center scale-110">
                        <div className="text-yellow-400 text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Crown className="w-4 h-4" /> 冠軍戰
                        </div>
                        {goldMatch && (
                            <MatchCard 
                                match={goldMatch} 
                                side="center" 
                                onClick={() => handleMatchClick(goldMatch)} 
                                isAdmin={isAdmin}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Groups Section - Bottom */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* Group A */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-blue-300 font-bold mb-4 flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-xs">A</div>
                        A 組賽程與積分
                    </h3>
                    
                    {/* Table */}
                    <div className="mb-4 overflow-hidden rounded-lg border border-slate-700">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-900 text-slate-400">
                                <tr>
                                    <th className="p-2">隊伍</th>
                                    <th className="p-2 text-center">勝</th>
                                    <th className="p-2 text-center">得分</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {teamStatsA.map((team, idx) => (
                                    <tr key={team.id} className={idx === 0 ? 'bg-indigo-500/10' : ''}>
                                        <td className="p-2 flex items-center gap-1 font-medium text-slate-200">
                                            <span className="text-slate-500 w-4 text-right inline-block mr-1 font-mono">{idx + 1}.</span>
                                            {team.name}
                                            {idx === 0 && <span className="text-[10px] bg-yellow-500 text-slate-900 px-1 rounded font-bold ml-1">決賽</span>}
                                            {idx === 1 && <span className="text-[10px] bg-orange-500 text-slate-900 px-1 rounded font-bold ml-1">季軍</span>}
                                        </td>
                                        <td className="p-2 text-center font-bold text-white">{team.stats?.wins || 0}</td>
                                        <td className="p-2 text-center text-slate-400">{team.stats?.points || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Matches */}
                    <div className="space-y-2">
                        {groupAMatches.map(m => (
                             <div key={m.id} onClick={() => handleMatchClick(m)} className={`p-2 rounded flex justify-between items-center bg-slate-900/40 border border-slate-700/50 ${isAdmin ? 'cursor-pointer hover:bg-slate-700' : ''}`}>
                                <span className={`text-sm ${m.winner?.id === m.competitorA?.id ? 'text-green-400 font-bold' : 'text-slate-200'}`}>{m.competitorA?.name}</span>
                                <div className="text-xs font-mono bg-slate-800 px-2 py-1 rounded">
                                    {m.scoreA !== undefined ? m.scoreA : '-'} : {m.scoreB !== undefined ? m.scoreB : '-'}
                                </div>
                                <span className={`text-sm ${m.winner?.id === m.competitorB?.id ? 'text-green-400 font-bold' : 'text-slate-200'}`}>{m.competitorB?.name}</span>
                             </div>
                        ))}
                    </div>
                </div>

                {/* Group B */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-pink-300 font-bold mb-4 flex items-center gap-2">
                         <div className="w-6 h-6 rounded bg-pink-500/20 flex items-center justify-center text-xs">B</div>
                        B 組賽程與積分
                    </h3>
                     {/* Table */}
                     <div className="mb-4 overflow-hidden rounded-lg border border-slate-700">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-900 text-slate-400">
                                <tr>
                                    <th className="p-2">隊伍</th>
                                    <th className="p-2 text-center">勝</th>
                                    <th className="p-2 text-center">得分</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {teamStatsB.map((team, idx) => (
                                    <tr key={team.id} className={idx === 0 ? 'bg-indigo-500/10' : ''}>
                                        <td className="p-2 flex items-center gap-1 font-medium text-slate-200">
                                            <span className="text-slate-500 w-4 text-right inline-block mr-1 font-mono">{idx + 1}.</span>
                                            {team.name}
                                            {idx === 0 && <span className="text-[10px] bg-yellow-500 text-slate-900 px-1 rounded font-bold ml-1">決賽</span>}
                                            {idx === 1 && <span className="text-[10px] bg-orange-500 text-slate-900 px-1 rounded font-bold ml-1">季軍</span>}
                                        </td>
                                        <td className="p-2 text-center font-bold text-white">{team.stats?.wins || 0}</td>
                                        <td className="p-2 text-center text-slate-400">{team.stats?.points || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Matches */}
                    <div className="space-y-2">
                        {groupBMatches.map(m => (
                             <div key={m.id} onClick={() => handleMatchClick(m)} className={`p-2 rounded flex justify-between items-center bg-slate-900/40 border border-slate-700/50 ${isAdmin ? 'cursor-pointer hover:bg-slate-700' : ''}`}>
                                <span className={`text-sm ${m.winner?.id === m.competitorA?.id ? 'text-green-400 font-bold' : 'text-slate-200'}`}>{m.competitorA?.name}</span>
                                <div className="text-xs font-mono bg-slate-800 px-2 py-1 rounded">
                                    {m.scoreA !== undefined ? m.scoreA : '-'} : {m.scoreB !== undefined ? m.scoreB : '-'}
                                </div>
                                <span className={`text-sm ${m.winner?.id === m.competitorB?.id ? 'text-green-400 font-bold' : 'text-slate-200'}`}>{m.competitorB?.name}</span>
                             </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-700 mb-6 text-white min-h-[600px] flex flex-col relative">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900 pointer-events-none"></div>

      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-sm p-4 flex justify-between items-center border-b border-indigo-500/30 z-20 relative">
        <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-2 rounded-lg text-white shadow-lg shadow-orange-500/20">
                <Trophy className="w-5 h-5" />
            </div>
            <div>
                <h2 className="font-bold text-lg text-white tracking-wide">
                    {tournament.format === 'round-robin-6' ? '雙打分組循環賽 (6組)' : `${tournament.type === 'singles' ? '單打' : '雙打'}錦標賽`}
                </h2>
                <div className="text-xs text-indigo-300">
                    {tournament.champion ? `🏆 冠軍: ${tournament.champion.name}` : '🔥 激戰進行中'}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            {tournament.champion && !showCelebration && (
                <button 
                    onClick={() => setShowCelebration(true)}
                    className="px-3 py-1.5 rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-sm transition-colors border border-yellow-500/30 flex items-center gap-2"
                >
                    <Crown className="w-4 h-4" />
                    顯示冠軍
                </button>
            )}
            <button 
                onClick={handleManualClose}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm transition-colors border border-slate-600 hover:border-slate-500 flex items-center gap-2"
            >
                {tournament.champion ? <LogOut className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                {tournament.champion ? '關閉紀錄' : (isAdmin ? '儲存並返回' : '返回主選單')}
            </button>
        </div>
      </div>

      {/* Bracket Area */}
      <div className="flex-1 overflow-auto p-8 z-10 relative">
         {tournament.format === 'round-robin-6' ? renderRoundRobinView() : renderKnockoutView()}
      </div>

      {/* Champion Celebration Overlay */}
      {tournament.champion && showCelebration && (
          <div className="absolute inset-0 z-30 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-500">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-600 w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.5)] mb-6 animate-bounce">
                    <Crown className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 mb-2 uppercase tracking-widest">
                    Champion
                </h2>
                <div className="text-4xl font-bold text-white mb-12">
                    {tournament.champion.name}
                </div>
                
                <div className="flex flex-col gap-3 min-w-[280px]">
                    {isAdmin && (
                        <button 
                            onClick={onSaveAndClose}
                            className="px-8 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-full font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-105"
                        >
                            <Save className="w-5 h-5" />
                            儲存紀錄並回主選單
                        </button>
                    )}
                    <button 
                        onClick={() => setShowCelebration(false)} 
                        className="px-8 py-3 bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 rounded-full font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                        <Eye className="w-4 h-4" />
                        檢視賽程表
                    </button>
                </div>
          </div>
      )}

      {/* Modal for Score Entry */}
      {selectedMatch && !tournament.champion && (
          <ScoreModal 
            match={selectedMatch} 
            onClose={() => setSelectedMatch(null)}
            onConfirm={(winner, sA, sB) => {
                onUpdateMatch(selectedMatch.id, winner, sA, sB);
                setSelectedMatch(null);
            }}
          />
      )}
    </div>
  );
};

// --- Sub Components ---

interface MatchCardProps {
    match: TournamentMatch;
    side: 'left' | 'right' | 'center';
    onClick: () => void;
    isAdmin: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, side, onClick, isAdmin }) => {
    const isReady = match.competitorA && match.competitorB;
    const isCompleted = !!match.winner;
    
    // Determining card styles based on status
    let borderClass = "border-indigo-500/30";
    let bgClass = "bg-slate-800/60";
    
    if (match.round === 1 && !isReady) {
        // Not supposed to happen in R1 usually, unless bugs
    }
    
    if (side === 'center') {
        borderClass = "border-yellow-500/50";
        bgClass = "bg-slate-800/80 shadow-[0_0_20px_rgba(234,179,8,0.2)]";
    }

    // Special styling for finals in Round Robin
    if (match.id === 'FINAL-BRONZE') {
         borderClass = "border-orange-500/40";
         bgClass = "bg-slate-800/60 shadow-[0_0_15px_rgba(249,115,22,0.1)]";
    }
    
    const isClickable = isAdmin && isReady && !match.competitorA?.isBye && !match.competitorB?.isBye;

    return (
        <div 
            onClick={() => isClickable ? onClick() : null}
            className={`
                relative w-48 rounded-lg border ${borderClass} ${bgClass} backdrop-blur-sm 
                flex flex-col overflow-hidden transition-all duration-300
                ${isClickable ? 'hover:scale-105 hover:bg-slate-700/80 cursor-pointer hover:border-indigo-400' : 'cursor-default'}
            `}
        >
            {/* Player A */}
            <CompetitorRow 
                competitor={match.competitorA} 
                score={match.scoreA} 
                isWinner={match.winner?.id === match.competitorA?.id} 
                align={side === 'right' ? 'right' : 'left'}
            />
            
            {/* Divider */}
            <div className="h-[1px] bg-slate-700 w-full relative">
                {side === 'center' && (
                    <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-[10px] text-slate-500 px-1">VS</div>
                )}
            </div>

            {/* Player B */}
            <CompetitorRow 
                competitor={match.competitorB} 
                score={match.scoreB} 
                isWinner={match.winner?.id === match.competitorB?.id}
                align={side === 'right' ? 'right' : 'left'}
            />
            
            {/* Status Indicator or Match ID */}
            {isCompleted && (
                 <div className="absolute top-0 right-0 p-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
                 </div>
            )}
        </div>
    );
};

const CompetitorRow = ({ competitor, score, isWinner, align }: { competitor: Competitor | null, score?: number | string, isWinner: boolean, align: 'left' | 'right' }) => {
    return (
        <div className={`
            flex items-center px-3 py-2 h-10 gap-2
            ${isWinner ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300'}
            ${align === 'right' ? 'flex-row-reverse' : 'flex-row'}
        `}>
            {/* Name Container */}
            <span className={`
                text-sm font-medium truncate flex-1 flex items-center gap-1 
                ${align === 'right' ? 'justify-end' : 'justify-start'} 
                ${isWinner ? 'font-bold text-white' : ''}
            `}>
                {competitor && competitor.isSeed && !competitor.isBye && (
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
                )}
                {competitor && competitor.isSeparated && !competitor.isBye && (
                     <Shield className="w-3 h-3 text-blue-500 fill-blue-500 shrink-0" />
                )}
                <span className="truncate">
                     {competitor ? competitor.name : <span className="text-slate-600 italic text-xs">待定</span>}
                     {competitor?.isBye && <span className="text-xs text-slate-500 ml-1">(輪空)</span>}
                </span>
            </span>

            {/* Score */}
            {(score !== undefined || isWinner) && competitor && !competitor.isBye && (
                <span className={`
                    font-mono font-bold text-sm px-1.5 rounded
                    ${isWinner ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-500'}
                `}>
                    {score !== undefined ? score : '-'}
                </span>
            )}
        </div>
    );
};


// --- Modal Component ---

interface ScoreModalProps {
    match: TournamentMatch;
    onClose: () => void;
    onConfirm: (winner: Competitor, scoreA: number, scoreB: number) => void;
}

const ScoreModal: React.FC<ScoreModalProps> = ({ match, onClose, onConfirm }) => {
    const [scoreA, setScoreA] = useState<string>(match.scoreA?.toString() || '');
    const [scoreB, setScoreB] = useState<string>(match.scoreB?.toString() || '');
    const [error, setError] = useState('');

    if (!match.competitorA || !match.competitorB) return null;

    const handleConfirm = () => {
        const sA = Number(scoreA);
        const sB = Number(scoreB);

        // Validation
        if (scoreA.trim() === '' || scoreB.trim() === '' || isNaN(sA) || isNaN(sB)) {
            setError('請輸入完整的比分');
            return;
        }

        if (!Number.isInteger(sA) || !Number.isInteger(sB) || sA < 0 || sB < 0) {
            setError('比分必須為正整數 (0或以上)');
            return;
        }

        if (sA === sB) {
            alert('比分相同，無法分出勝負！請重新確認分數。');
            setError('比分不能相同');
            return;
        }

        setError('');

        const winner = sA > sB ? match.competitorA! : match.competitorB!;
        onConfirm(winner, sA, sB);
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
            <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-bold text-lg">輸入比分與結果</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center justify-between gap-4 mb-2">
                    {/* Team A Input */}
                    <div className="flex-1 flex flex-col items-center gap-2">
                        <span className="text-indigo-300 font-bold text-sm text-center truncate w-full flex items-center justify-center gap-1">
                            {match.competitorA.isSeed && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                            {match.competitorA.isSeparated && <Shield className="w-3 h-3 text-blue-500 fill-blue-500" />}
                            {match.competitorA.name}
                        </span>
                        <input 
                            type="number" 
                            inputMode="numeric"
                            min="0"
                            step="1"
                            value={scoreA}
                            onChange={e => { setScoreA(e.target.value); setError(''); }}
                            className="w-20 h-16 bg-slate-900 border border-slate-600 rounded-lg text-center text-white text-3xl font-bold focus:border-indigo-500 outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="0"
                            onKeyDown={(e) => {
                                if (['-', '.', 'e', 'E', '+'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                        />
                    </div>

                    <div className="text-slate-500 font-bold text-xl italic pt-6">VS</div>

                    {/* Team B Input */}
                    <div className="flex-1 flex flex-col items-center gap-2">
                         <span className="text-indigo-300 font-bold text-sm text-center truncate w-full flex items-center justify-center gap-1">
                             {match.competitorB.isSeed && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                             {match.competitorB.isSeparated && <Shield className="w-3 h-3 text-blue-500 fill-blue-500" />}
                             {match.competitorB.name}
                         </span>
                        <input 
                            type="number" 
                            inputMode="numeric"
                            min="0"
                            step="1"
                            value={scoreB}
                            onChange={e => { setScoreB(e.target.value); setError(''); }}
                            className="w-20 h-16 bg-slate-900 border border-slate-600 rounded-lg text-center text-white text-3xl font-bold focus:border-indigo-500 outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="0"
                             onKeyDown={(e) => {
                                if (['-', '.', 'e', 'E', '+'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                        />
                    </div>
                </div>
                
                {error && (
                    <div className="text-red-400 text-xs text-center mb-4 font-bold bg-red-400/10 py-1 rounded">
                        {error}
                    </div>
                )}

                <p className="text-center text-xs text-slate-500 mb-6 mt-2">
                    系統將根據比分自動判定晉級者
                </p>

                <button 
                    onClick={handleConfirm}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-base rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                    <CheckCircle2 className="w-5 h-5" />
                    確認比賽結果
                </button>
            </div>
        </div>
    );
};
