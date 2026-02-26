import api from './axiosClient';

export type GameLeaderboardEntry = {
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  solveTimeMs: number;
  solvedAt: string | null;
};

export type DailyGameState = {
  puzzleDate: string;
  scrambledWord: string;
  clue: string;
  wordLength: number;
  solved: boolean;
  solveTimeMs: number | null;
  rank: number | null;
  totalSolvers: number;
  startedAtEpochMs: number;
  incorrectGuesses: number;
  globalLeaderboard: GameLeaderboardEntry[];
  peerLeaderboard: GameLeaderboardEntry[];
};

export type DailyGameGuessResponse = {
  correct: boolean;
  message: string;
  state: DailyGameState;
};

export async function getDailyGame(): Promise<DailyGameState> {
  const res = await api.get<DailyGameState>('/games/daily');
  return res.data;
}

export async function submitDailyGuess(guess: string): Promise<DailyGameGuessResponse> {
  const res = await api.post<DailyGameGuessResponse>('/games/daily/guess', { guess });
  return res.data;
}
