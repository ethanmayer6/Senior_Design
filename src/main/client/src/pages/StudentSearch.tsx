import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import Header from '../components/header';
import {
  addFriend,
  getFriends,
  searchUsersByUsername,
  type StudentSearchResult,
} from '../api/usersApi';

export default function StudentSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [friends, setFriends] = useState<StudentSearchResult[]>([]);
  const [addingFriendId, setAddingFriendId] = useState<number | null>(null);

  useEffect(() => {
    async function loadFriends() {
      try {
        const friendList = await getFriends();
        setFriends(friendList);
      } catch {
        setFriends([]);
      }
    }
    void loadFriends();
  }, []);

  const onSearch = async () => {
    const username = query.trim();
    setSearched(true);
    setError(null);

    if (username.length < 2) {
      setResults([]);
      setError('Enter at least 2 characters to search.');
      return;
    }

    setLoading(true);
    try {
      const found = await searchUsersByUsername(username);
      setResults(found);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Search failed. Please try again.';
      setError(message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const friendIds = new Set(friends.map((friend) => friend.id));

  const handleAddFriend = async (friend: StudentSearchResult) => {
    setAddingFriendId(friend.id);
    setError(null);
    try {
      await addFriend(friend.id);
      setFriends((current) => {
        if (current.some((existing) => existing.id === friend.id)) {
          return current;
        }
        return [...current, friend];
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to add friend.';
      setError(message);
    } finally {
      setAddingFriendId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-100">
      <Header />

      <main className="mx-auto max-w-5xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-red-100 bg-white/90 p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">Student Search</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Find Student Accounts</h1>
              <p className="mt-2 text-sm text-gray-600">
                Search by username (email) to find other existing accounts.
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

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Enter username/email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
            />
            <Button
              label={loading ? 'Searching...' : 'Search'}
              icon="pi pi-search"
              onClick={onSearch}
              disabled={loading}
            />
          </div>

          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

          {searched && !loading && !error && (
            <div className="mt-6">
              <div className="mb-3 text-sm font-medium text-slate-700">
                {results.length} result{results.length === 1 ? '' : 's'}
              </div>

              {results.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No users matched that username.
                </div>
              ) : (
                <div className="grid gap-3">
                  {results.map((user) => (
                    <div
                      key={user.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{user.username}</div>
                          <div className="mt-1 text-sm text-slate-600">
                            {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Name not provided'}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Major: {user.major || 'Not set'}
                          </div>
                        </div>
                        <Button
                          label={
                            friendIds.has(user.id)
                              ? 'Friend Added'
                              : addingFriendId === user.id
                                ? 'Adding...'
                                : 'Add Friend'
                          }
                          icon={friendIds.has(user.id) ? 'pi pi-check' : 'pi pi-user-plus'}
                          size="small"
                          outlined={!friendIds.has(user.id)}
                          onClick={() => void handleAddFriend(user)}
                          disabled={friendIds.has(user.id) || addingFriendId === user.id}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
