
import { Player, MatchType, Tournament, TournamentMatch, Competitor } from '../types';

// Helper to ensure unique IDs
export const generateId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Helper to generate optimal seeding indices (0, N-1, N/2, ...)
const getSeedingIndices = (size: number): number[] => {
    const indices = [0];
    const results = new Set<number>([0]);
    if (size > 1) results.add(size - 1);
    
    const priority = [0, size - 1]; // Top, Bottom
    
    if (size >= 4) {
        priority.push(Math.floor(size / 2));     // Mid-Bottom
        priority.push(Math.floor(size / 2) - 1); // Mid-Top
    }

    if (size >= 8) {
        const q = Math.floor(size / 4);
        priority.push(q);             // Q1 Bottom
        priority.push(size - 1 - q);  // Q4 Top
        priority.push(Math.floor(size / 2) + q); // Q3 Bottom
        priority.push(Math.floor(size / 2) - 1 - q); // Q2 Top
    }
    
    return priority;
};

// --- Standard Knockout Tournament Creation ---
export const createTournament = (players: Player[], type: MatchType, playerConfig: Record<string, 'seed' | 'separated' | 'normal' | undefined>): Tournament | null => {
  const minPlayers = type === 'singles' ? 2 : 4;
  if (players.length < minPlayers) return null;

  // 1. Create Competitors (Shuffle players first)
  let competitors: Competitor[] = [];
  const shuffled = [...players].sort(() => 0.5 - Math.random());

  if (type === 'singles') {
    competitors = shuffled.map(p => ({
      id: p.id,
      name: p.name,
      players: [p]
    }));
  } else {
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        const p1 = shuffled[i];
        const p2 = shuffled[i+1];
        competitors.push({
          id: `team-${p1.id}-${p2.id}`,
          name: `${p1.name} & ${p2.name}`,
          players: [p1, p2]
        });
      }
    }
  }

  if (competitors.length < 2) return null;

  // 1.5 Apply Configuration
  competitors.forEach(comp => {
      const hasSeed = comp.players.some(p => playerConfig[p.id] === 'seed');
      const hasSeparated = comp.players.some(p => playerConfig[p.id] === 'separated');

      if (hasSeed) {
          comp.isSeed = true;
      } else if (hasSeparated) {
          comp.isSeparated = true;
      }
  });

  const seeds = competitors.filter(c => c.isSeed);
  const separated = competitors.filter(c => c.isSeparated);
  const regulars = competitors.filter(c => !c.isSeed && !c.isSeparated);

  // 2. Pad to next power of 2
  const count = competitors.length;
  let size = 1;
  while (size < count) size *= 2;
  
  // 3. Placement
  const competitorSlots: (Competitor | null)[] = new Array(size).fill(null);
  const targetIndices = getSeedingIndices(size);

  // 3a. Place Seeds
  seeds.forEach(seed => {
      const idx = targetIndices.find(i => competitorSlots[i] === null);
      if (idx !== undefined) {
          competitorSlots[idx] = seed;
      } else {
          const emptyIdx = competitorSlots.findIndex(s => s === null);
          if (emptyIdx !== -1) competitorSlots[emptyIdx] = seed;
      }
  });

  // 3b. Place Separated
  separated.forEach(sep => {
       const idx = targetIndices.find(i => competitorSlots[i] === null);
      if (idx !== undefined) {
          competitorSlots[idx] = sep;
      } else {
          const emptyIdx = competitorSlots.findIndex(s => s === null);
          if (emptyIdx !== -1) competitorSlots[emptyIdx] = sep;
      }
  });

  // 3c. Calculate Byes
  let byesNeeded = size - count;
  const byeCompetitor: Competitor = { id: 'bye', name: '輪空', players: [], isBye: true };

  // 3d. Assign Byes
  const getOpponentIndex = (k: number) => (k % 2 === 0) ? k + 1 : k - 1;

  for (let i = 0; i < size && byesNeeded > 0; i++) {
      if (competitorSlots[i]?.isSeed) {
          const opponentIdx = getOpponentIndex(i);
          if (competitorSlots[opponentIdx] === null) {
              competitorSlots[opponentIdx] = byeCompetitor;
              byesNeeded--;
          }
      }
  }

  // 3e. Fill remaining
  const remainingSlotsIndices: number[] = [];
  for (let i = 0; i < size; i++) {
      if (competitorSlots[i] === null) remainingSlotsIndices.push(i);
  }

  const pool = [...regulars];
  for (let i = 0; i < byesNeeded; i++) pool.push(byeCompetitor);
  
  pool.sort(() => 0.5 - Math.random());

  remainingSlotsIndices.forEach((slotIdx, i) => {
      if (i < pool.length) {
          competitorSlots[slotIdx] = pool[i];
      }
  });

  // 4. Generate Matches
  const matches: TournamentMatch[] = [];
  const totalRounds = Math.log2(size);
  const getMatchId = (r: number, i: number) => `R${r}-M${i}`;

  for (let r = 1; r <= totalRounds; r++) {
    const numMatches = size / Math.pow(2, r);
    for (let i = 0; i < numMatches; i++) {
        matches.push({
            id: getMatchId(r, i),
            round: r,
            matchIndex: i,
            competitorA: null,
            competitorB: null,
            winner: null,
            nextMatchId: r < totalRounds ? getMatchId(r + 1, Math.floor(i / 2)) : null
        });
    }
  }

  const round1Matches = matches.filter(m => m.round === 1);
  round1Matches.forEach((match, index) => {
      match.competitorA = competitorSlots[index * 2];
      match.competitorB = competitorSlots[index * 2 + 1];
  });

  const tournament: Tournament = {
      id: generateId(),
      type,
      format: 'knockout',
      matches,
      rounds: totalRounds,
      status: 'active',
      champion: null,
      timestamp: Date.now()
  };

  updateBracket(tournament);

  return tournament;
};

// --- Group Cycle Tournament (6 Teams) ---
export const createGroupCycleTournament = (players: Player[], playerConfig: Record<string, 'seed' | 'separated' | 'normal' | undefined>): Tournament | null => {
    // 1. Requirement: 6 Teams = 12 Players
    if (players.length < 12) return null;

    // 2. Create Teams
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    const competitors: Competitor[] = [];
    
    for (let i = 0; i < 12; i += 2) {
        const p1 = shuffled[i];
        const p2 = shuffled[i+1];
        competitors.push({
            id: `team-${p1.id}-${p2.id}`,
            name: `${p1.name} & ${p2.name}`,
            players: [p1, p2],
            stats: { wins: 0, points: 0, played: 0 }
        });
    }

    // 3. Assign to Groups (A and B)
    // We can use seeding logic here if needed, but for now random
    const groupA = competitors.slice(0, 3);
    const groupB = competitors.slice(3, 6);

    const matches: TournamentMatch[] = [];
    
    // Group Matches Helper
    const createGroupMatches = (groupTeams: Competitor[], groupName: 'A' | 'B') => {
        // Round Robin for 3 teams: 0v1, 1v2, 0v2
        const pairings = [[0, 1], [1, 2], [0, 2]];
        pairings.forEach((pair, idx) => {
            matches.push({
                id: `G${groupName}-M${idx}`,
                round: 1, // All group matches are round 1 logically for display or phase
                matchIndex: matches.length,
                group: groupName,
                competitorA: groupTeams[pair[0]],
                competitorB: groupTeams[pair[1]],
                winner: null,
                nextMatchId: null // Handled by logic
            });
        });
    };

    createGroupMatches(groupA, 'A');
    createGroupMatches(groupB, 'B');

    // Finals Placeholders
    // Championship: A1 vs B1
    matches.push({
        id: 'FINAL-GOLD',
        round: 2,
        matchIndex: 0,
        group: 'Finals',
        competitorA: null, // To be determined
        competitorB: null, // To be determined
        winner: null,
        nextMatchId: null
    });

    // 3rd Place: A2 vs B2
    matches.push({
        id: 'FINAL-BRONZE',
        round: 2,
        matchIndex: 1,
        group: 'Finals',
        competitorA: null, // To be determined
        competitorB: null, // To be determined
        winner: null,
        nextMatchId: null
    });

    return {
        id: generateId(),
        type: 'doubles',
        format: 'round-robin-6',
        matches,
        rounds: 2, // Phase 1: Group, Phase 2: Finals
        status: 'active',
        champion: null,
        timestamp: Date.now()
    };
};

export const updateBracket = (tournament: Tournament) => {
    if (tournament.format === 'round-robin-6') {
        updateRoundRobinBracket(tournament);
    } else {
        updateKnockoutBracket(tournament);
    }
};

const updateKnockoutBracket = (tournament: Tournament) => {
    const sortedMatches = [...tournament.matches].sort((a, b) => a.round - b.round);

    for (const match of sortedMatches) {
        // 1. Determine winner if not set but one side is BYE
        if (!match.winner) {
            if (match.competitorA && match.competitorB) {
                if (match.competitorB.isBye && !match.competitorA.isBye) {
                    match.winner = match.competitorA;
                } else if (match.competitorA.isBye && !match.competitorB.isBye) {
                    match.winner = match.competitorB;
                } else if (match.competitorA.isBye && match.competitorB.isBye) {
                    match.winner = match.competitorA;
                }
            }
        }

        // 2. Propagate to next match
        if (match.nextMatchId) {
            const nextMatch = tournament.matches.find(m => m.id === match.nextMatchId);
            if (nextMatch) {
                const isTeamA = match.matchIndex % 2 === 0;
                const newCompetitor = match.winner;

                if (isTeamA) {
                    if (nextMatch.competitorA?.id !== newCompetitor?.id) {
                        nextMatch.competitorA = newCompetitor;
                        nextMatch.winner = null; 
                    }
                } else {
                    if (nextMatch.competitorB?.id !== newCompetitor?.id) {
                        nextMatch.competitorB = newCompetitor;
                        nextMatch.winner = null;
                    }
                }
            }
        }
    }

    const finalMatch = tournament.matches.find(m => m.round === tournament.rounds);
    if (finalMatch?.winner) {
        tournament.champion = finalMatch.winner;
        tournament.status = 'completed';
    } else {
        tournament.champion = null;
        tournament.status = 'active';
    }
};

const updateRoundRobinBracket = (tournament: Tournament) => {
    // 1. Reset Stats
    const allTeams = new Map<string, Competitor>();
    
    // Collect all unique teams participating in group stage
    tournament.matches.filter(m => m.group === 'A' || m.group === 'B').forEach(m => {
        if (m.competitorA) allTeams.set(m.competitorA.id, m.competitorA);
        if (m.competitorB) allTeams.set(m.competitorB.id, m.competitorB);
    });

    allTeams.forEach(team => {
        team.stats = { wins: 0, points: 0, played: 0 };
    });

    // 2. Calculate Stats from Matches
    const groupAMatches = tournament.matches.filter(m => m.group === 'A');
    const groupBMatches = tournament.matches.filter(m => m.group === 'B');
    const finals = tournament.matches.filter(m => m.group === 'Finals');

    const processMatch = (m: TournamentMatch) => {
        if (m.winner && m.scoreA !== undefined && m.scoreB !== undefined) {
            const tA = allTeams.get(m.competitorA!.id);
            const tB = allTeams.get(m.competitorB!.id);
            if (tA && tB) {
                tA.stats!.played++;
                tB.stats!.played++;
                tA.stats!.points += Number(m.scoreA);
                tB.stats!.points += Number(m.scoreB);
                if (m.winner.id === tA.id) tA.stats!.wins++;
                else tB.stats!.wins++;
            }
        }
    };

    groupAMatches.forEach(processMatch);
    groupBMatches.forEach(processMatch);

    // 3. Check if Groups are Finished and Determine Rankings
    const getGroupStandings = (matches: TournamentMatch[]) => {
        const teamsInGroup = new Set<string>();
        matches.forEach(m => {
            if (m.competitorA) teamsInGroup.add(m.competitorA.id);
            if (m.competitorB) teamsInGroup.add(m.competitorB.id);
        });
        
        const standings = Array.from(teamsInGroup).map(id => allTeams.get(id)!).sort((a, b) => {
            if (b.stats!.wins !== a.stats!.wins) return b.stats!.wins - a.stats!.wins;
            return b.stats!.points - a.stats!.points;
        });

        const allCompleted = matches.every(m => !!m.winner);
        return { standings, allCompleted };
    };

    const groupA = getGroupStandings(groupAMatches);
    const groupB = getGroupStandings(groupBMatches);

    // 4. Update Finals Participants if Groups Completed
    const goldMatch = finals.find(m => m.id === 'FINAL-GOLD');
    const bronzeMatch = finals.find(m => m.id === 'FINAL-BRONZE');

    if (groupA.allCompleted && groupB.allCompleted) {
        if (goldMatch) {
            if (goldMatch.competitorA?.id !== groupA.standings[0].id) goldMatch.competitorA = groupA.standings[0];
            if (goldMatch.competitorB?.id !== groupB.standings[0].id) goldMatch.competitorB = groupB.standings[0];
        }
        if (bronzeMatch) {
            if (bronzeMatch.competitorA?.id !== groupA.standings[1].id) bronzeMatch.competitorA = groupA.standings[1];
            if (bronzeMatch.competitorB?.id !== groupB.standings[1].id) bronzeMatch.competitorB = groupB.standings[1];
        }
    } else {
        // Clear finals if we went back and edited scores
        if (goldMatch) { goldMatch.competitorA = null; goldMatch.competitorB = null; goldMatch.winner = null; }
        if (bronzeMatch) { bronzeMatch.competitorA = null; bronzeMatch.competitorB = null; bronzeMatch.winner = null; }
    }

    // 5. Determine Tournament Status
    if (goldMatch?.winner) {
        tournament.champion = goldMatch.winner;
        tournament.status = 'completed';
    } else {
        tournament.champion = null;
        tournament.status = 'active';
    }
};
