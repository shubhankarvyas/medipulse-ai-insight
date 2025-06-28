import { useAuth } from '@/hooks/useAuth';

export const DebugAuth = () => {
  const { user, userProfile } = useAuth();

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 p-3 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold text-yellow-800">Debug Info</h4>
      <div className="mt-2 space-y-1">
        <p><strong>User ID:</strong> {user?.id || 'Not logged in'}</p>
        <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
        <p><strong>Profile Role:</strong> {userProfile?.role || 'No profile'}</p>
        <p><strong>Profile Name:</strong> {userProfile?.full_name || 'N/A'}</p>
      </div>
    </div>
  );
};
