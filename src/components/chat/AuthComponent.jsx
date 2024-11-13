import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function AuthComponent() {
  const [password, setPassword] = useState('');
  const { authenticate, authError } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    await authenticate(password.trim());
    setPassword('');
  };

  return (
    <div className="flex items-center gap-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter secret code"
          className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-md text-sm 
                     text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 
                     focus:ring-blue-500/50 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!password.trim()}
          className="px-3 py-1.5 bg-blue-600 text-gray-100 rounded-md text-sm 
                     hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 
                     disabled:cursor-not-allowed transition-all duration-200"
        >
          Authenticate
        </button>
      </form>
      {authError && (
        <Alert variant="destructive" className="bg-red-900/30 border border-red-900/50 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}