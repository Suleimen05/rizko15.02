import { useState, useEffect } from 'react';
import { DEV_ACCESS_ENABLED, DEV_ACCESS_PASSWORD } from '@/config/features';

const STORAGE_KEY = 'rizko_dev_access';

export function DevAccessGate({ children }: { children: React.ReactNode }) {
  const [hasAccess, setHasAccess] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!DEV_ACCESS_ENABLED) {
      setHasAccess(true);
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setHasAccess(true);
  }, []);

  if (hasAccess) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === DEV_ACCESS_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setHasAccess(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600" />
          <h1 className="text-xl font-bold text-white">Developer Access</h1>
          <p className="text-gray-500 text-sm mt-1">Enter password to continue</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className={`w-full px-4 py-3 rounded-lg bg-gray-900 border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500 shake' : 'border-gray-800'
          }`}
        />
        <button
          type="submit"
          className="w-full mt-4 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
        >
          Access
        </button>
      </form>
      <style>{`
        .shake { animation: shake 0.3s ease-in-out; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
