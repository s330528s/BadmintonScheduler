
import React from 'react';
import { Match } from '../types';
import { Trash2, User, Mic } from 'lucide-react';
import { generateMatchCommentary } from '../services/geminiService';

interface MatchListProps {
  matches: Match[];
  onDeleteMatch: (id: string) => void;
  onUpdateMatchCommentary: (id: string, text: string) => void;
  isAdmin: boolean;
}

export const MatchList: React.FC<MatchListProps> = ({ matches, onDeleteMatch, onUpdateMatchCommentary, isAdmin }) => {
  
  const handleGenerateAI = async (match: Match) => {
      // Indicate loading state locally could be improved, but for simplicity:
      onUpdateMatchCommentary(match.id, "AI 正在生成中...");
      const commentary = await generateMatchCommentary(match);
      onUpdateMatchCommentary(match.id, commentary);
  };

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
        <p className="text-slate-400">尚無賽程{isAdmin ? '，請建立第一場比賽！' : ''}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          賽程表
          <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{matches.length} 場</span>
      </h2>
      {matches.map((match, index) => (
        <div key={match.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group">
          
          {isAdmin && (
              <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onDeleteMatch(match.id)}
                    className="p-1.5 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg shadow-sm border border-slate-200 transition-colors"
                    title="刪除比賽"
                  >
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>
          )}

          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Match #{matches.length - index} • {match.type === 'singles' ? '單打' : '雙打'}</span>
                <span className="text-xs text-slate-400">{new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div className="flex items-center gap-4">
                {/* Team A */}
                <div className="flex-1 flex flex-col items-center gap-1 p-2 rounded-lg bg-blue-50 border border-blue-100">
                    {match.teamA.map(p => (
                        <div key={p.id} className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-1">
                             <User className="w-3 h-3 text-blue-400" /> {p.name}
                        </div>
                    ))}
                </div>

                <div className="text-slate-300 font-bold italic text-lg">VS</div>

                {/* Team B */}
                <div className="flex-1 flex flex-col items-center gap-1 p-2 rounded-lg bg-red-50 border border-red-100">
                     {match.teamB.map(p => (
                        <div key={p.id} className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-1">
                             <User className="w-3 h-3 text-red-400" /> {p.name}
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Commentary Section */}
            <div className="mt-4 pt-3 border-t border-slate-100">
                {!match.aiCommentary ? (
                    isAdmin ? (
                        <button 
                            onClick={() => handleGenerateAI(match)}
                            className="flex items-center gap-1.5 text-xs text-purple-600 font-medium hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                        >
                            <Mic className="w-3 h-3" /> 讓 AI 主播講評
                        </button>
                    ) : null
                ) : (
                    <div className="bg-purple-50 p-3 rounded-lg text-sm text-slate-700 relative">
                        <div className="absolute top-2 left-2">
                             <Mic className="w-3 h-3 text-purple-400" />
                        </div>
                        <p className="pl-6 italic leading-relaxed">
                            "{match.aiCommentary}"
                        </p>
                    </div>
                )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
