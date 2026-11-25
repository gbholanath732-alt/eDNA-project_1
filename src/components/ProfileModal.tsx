import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { profile, getIdToken, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [institution, setInstitution] = useState(profile?.institution || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !profile) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName, institution, bio }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Could not save profile');
      }
      await refreshProfile();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#06181A]/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Researcher Profile"
    >
      <div className="bg-white border border-[#D8E5E1] rounded-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7F0ED] pb-3">
          <h2 className="text-lg font-bold text-[#0B2528]">Researcher Profile</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-[#4A6366] hover:bg-[#F0F6F4]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#4A6366] mb-1">
              Email Address
            </label>
            <input
              type="text"
              disabled
              value={profile.email}
              className="w-full px-3 py-2 text-sm bg-[#F7FAF9] text-[#4A6366] border border-[#D8E5E1] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#4A6366] mb-1">
              Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#4A6366] mb-1">
              Research Institution / University
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g., Scripps Institution of Oceanography"
              className="w-full px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#4A6366] mb-1">
              Research Focus
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your eDNA sampling ecosystems or target taxa..."
              className="w-full px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg focus:outline-none focus:border-emerald-700"
            />
          </div>

          {error && <p className="text-xs text-rose-700">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#4A6366] hover:text-[#0B2528]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
