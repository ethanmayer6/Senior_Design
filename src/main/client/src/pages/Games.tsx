import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/header';
import {
  getDailyGame,
  submitDailyGuess,
  type DailyGameState,
  type GameLeaderboardEntry,
} from '../api/gamesApi';

type NoticeLevel = 'info' | 'success' | 'error';

function formatDuration(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((safeMs % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

function formatDisplayName(entry: GameLeaderboardEntry): string {
  const fullName = `${entry.firstName ?? ''} ${entry.lastName ?? ''}`.trim();
  if (fullName.length > 0) return fullName;
  if (entry.username) return entry.username;
  return `User #${entry.userId}`;
}

function formatSolvedAt(value: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function Leaderboard({
  title,
  entries,
  emptyMessage,
}: {
  title: string;
  entries: GameLeaderboardEntry[];
  emptyMessage: string;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">{emptyMessage}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Player</th>
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Solved</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={`${entry.userId}-${entry.solvedAt ?? index}`} className="border-b border-gray-100">
                  <td className="px-2 py-2 text-gray-700">{index + 1}</td>
                  <td className="px-2 py-2 text-gray-800">{formatDisplayName(entry)}</td>
                  <td className="px-2 py-2 font-semibold text-gray-900">{formatDuration(entry.solveTimeMs)}</td>
                  <td className="px-2 py-2 text-gray-600">{formatSolvedAt(entry.solvedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function Games() {
  const [game, setGame] = useState<DailyGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guess, setGuess] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeLevel, setNoticeLevel] = useState<NoticeLevel>('info');
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    let active = true;

    async function loadDailyGame() {
      setLoading(true);
      setError(null);
      try {
        const state = await getDailyGame();
        if (!active) return;
        setGame(state);
      } catch (err: any) {
        if (!active) return;
        const message = err?.response?.data?.message || err?.message || 'Failed to load the daily game.';
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDailyGame();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!game || game.solved) return undefined;
    const timerId = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(timerId);
  }, [game]);

  const elapsedMs = useMemo(() => {
    if (!game) return 0;
    if (game.solved) return game.solveTimeMs ?? 0;
    return Math.max(0, nowMs - game.startedAtEpochMs);
  }, [game, nowMs]);

  const puzzleDateLabel = useMemo(() => {
    if (!game?.puzzleDate) return '';
    const parsed = new Date(`${game.puzzleDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return game.puzzleDate;
    return parsed.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }, [game?.puzzleDate]);

  const noticeClassName = noticeLevel === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : noticeLevel === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-slate-200 bg-slate-50 text-slate-700';

  const submitGuess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const candidate = guess.trim();
    if (!candidate) {
      setNotice('Enter a guess before submitting.');
      setNoticeLevel('error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitDailyGuess(candidate);
      setGame(result.state);
      setNotice(result.message);
      setNoticeLevel(result.correct ? 'success' : 'error');
      if (result.correct) {
        setGuess('');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to submit guess.';
      setNotice(message);
      setNoticeLevel('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-100">
      <Header />

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-red-100 bg-white/90 p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">Games Module</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Daily Word Scramble</h1>
              <p className="mt-2 text-sm text-gray-600">
                New puzzle each day. Your solve time is stored and ranked against your peers.
              </p>
            </div>
            <Link
              to="/courseflow"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
            >
              <i className="pi pi-arrow-left mr-2 text-red-500"></i>
              Back
            </Link>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {loading && <div className="text-sm text-gray-600">Loading daily puzzle...</div>}
          {!loading && error && <div className="text-sm text-red-700">{error}</div>}

          {!loading && !error && game && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{puzzleDateLabel}</p>
                  <p className="mt-1 text-sm text-gray-600">{game.clue}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-right">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Timer</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDuration(elapsedMs)}</p>
                  {game.rank !== null && (
                    <p className="text-xs text-gray-600">Rank #{game.rank} today</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {game.scrambledWord.split('').map((char, idx) => (
                  <div
                    key={`${char}-${idx}`}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-lg font-bold text-red-700"
                  >
                    {char}
                  </div>
                ))}
              </div>

              <form onSubmit={submitGuess} className="flex flex-wrap gap-2">
                <input
                  value={guess}
                  onChange={(event) => setGuess(event.target.value.toUpperCase())}
                  placeholder={`Enter ${game.wordLength}-letter word`}
                  maxLength={game.wordLength + 2}
                  disabled={submitting || game.solved}
                  className="min-w-[14rem] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-red-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting || game.solved}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  {game.solved ? 'Solved' : submitting ? 'Checking...' : 'Submit Guess'}
                </button>
              </form>

              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1">
                  Incorrect guesses: {game.incorrectGuesses}
                </span>
                <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1">
                  Solvers today: {game.totalSolvers}
                </span>
              </div>

              {notice && (
                <div className={`rounded-lg border px-3 py-2 text-sm ${noticeClassName}`}>
                  {notice}
                </div>
              )}
            </div>
          )}
        </section>

        {!loading && !error && game && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Leaderboard
              title="Peer Leaderboard"
              entries={game.peerLeaderboard}
              emptyMessage="No friend-group solves yet today."
            />
            <Leaderboard
              title="Global Leaderboard"
              entries={game.globalLeaderboard}
              emptyMessage="No one has solved this puzzle yet."
            />
          </div>
        )}
      </main>
    </div>
  );
}
