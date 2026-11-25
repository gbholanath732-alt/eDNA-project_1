import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  AppSetting,
  DatasetSummary,
  SpeciesRecord,
  UserProfile,
} from '../types/edna.ts';

interface AdminDashboardProps {
  species: SpeciesRecord[];
  onRefreshGlobal: () => Promise<void>;
}

type AdminTab = 'analytics' | 'users' | 'datasets' | 'taxonomy' | 'settings';

export function AdminDashboard({
  species,
  onRefreshGlobal,
}: AdminDashboardProps) {
  const { profile, getIdToken } = useAuth();
  const [tab, setTab] = useState<AdminTab>('analytics');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<{
    users: number;
    datasets: number;
    sequences: number;
    speciesCatalog: number;
    reports: number;
  } | null>(null);
  const [biomeBreakdown, setBiomeBreakdown] = useState<
    Array<{ biome: string; count: number }>
  >([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [datasetsList, setDatasetsList] = useState<DatasetSummary[]>([]);
  const [settingsList, setSettingsList] = useState<AppSetting[]>([]);

  // New species form
  const [sciName, setSciName] = useState('');
  const [commonName, setCommonName] = useState('');
  const [phylum, setPhylum] = useState('Chordata');
  const [habitat, setHabitat] = useState('Marine Reef');
  const [markerGene, setMarkerGene] = useState('COI');
  const [iucnStatus, setIucnStatus] = useState('LC');
  const [refSeq, setRefSeq] = useState('');
  const [ecoRole, setEcoRole] = useState('');
  const [savingSpecies, setSavingSpecies] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Authentication required');
      const headers = { Authorization: `Bearer ${token}` };

      const [ovRes, usrRes, dsRes, setRes] = await Promise.all([
        fetch('/api/admin/overview', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/datasets', { headers }),
        fetch('/api/admin/settings', { headers }),
      ]);

      if (!ovRes.ok) {
        const err = await ovRes.json().catch(() => ({}));
        throw new Error(err.error || 'Admin access denied');
      }

      const ov = await ovRes.json();
      const usr = await usrRes.json();
      const ds = await dsRes.json();
      const st = await setRes.json();

      setStats(ov.stats);
      setBiomeBreakdown(ov.biomeBreakdown || []);
      setUsersList(usr.users || []);
      setDatasetsList(ds.datasets || []);
      setSettingsList(st.settings || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load admin console');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [profile]);

  if (profile?.role !== 'admin') {
    return (
      <div className="bg-white border border-rose-200 rounded-xl p-10 text-center space-y-2">
        <h1 className="text-xl font-bold text-rose-800">Access Restricted</h1>
        <p className="text-sm text-[#4A6366]">
          Administrator privileges are required to view system analytics and manage platform records.
        </p>
      </div>
    );
  }

  const handleUpdateUser = async (
    id: number,
    updates: { role?: string; isActive?: boolean }
  ) => {
    const token = await getIdToken();
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await loadAdminData();
    }
  };

  const handleToggleDatasetPublic = async (ds: DatasetSummary) => {
    const token = await getIdToken();
    const res = await fetch(`/api/admin/datasets/${ds.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isPublic: !ds.isPublic }),
    });
    if (res.ok) {
      await loadAdminData();
      await onRefreshGlobal();
    }
  };

  const handleDeleteDataset = async (id: number) => {
    const token = await getIdToken();
    const res = await fetch(`/api/admin/datasets/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await loadAdminData();
      await onRefreshGlobal();
    }
  };

  const handleAddSpecies = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSpecies(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/admin/species', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scientificName: sciName,
          commonName,
          phylum,
          habitat,
          markerGene,
          iucnStatus,
          referenceSequence: refSeq,
          ecologicalRole: ecoRole,
        }),
      });
      if (res.ok) {
        setSciName('');
        setCommonName('');
        setRefSeq('');
        setEcoRole('');
        await loadAdminData();
        await onRefreshGlobal();
      }
    } finally {
      setSavingSpecies(false);
    }
  };

  const handleDeleteSpecies = async (id: number) => {
    const token = await getIdToken();
    const res = await fetch(`/api/admin/species/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await loadAdminData();
      await onRefreshGlobal();
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    const token = await getIdToken();
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) {
      await loadAdminData();
    }
  };

  const tabs: Array<{ id: AdminTab; label: string }> = [
    { id: 'analytics', label: 'System Analytics' },
    { id: 'users', label: 'Users & Roles' },
    { id: 'datasets', label: 'Datasets' },
    { id: 'taxonomy', label: 'Taxonomy Catalog' },
    { id: 'settings', label: 'App Settings' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-sky-800 uppercase tracking-wider">
            Role-Protected Operations Console
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2528] mt-1">
            Platform Administration
          </h1>
        </div>

        <div className="flex flex-wrap gap-1 p-1 bg-[#F0F6F4] border border-[#D8E5E1] rounded-lg">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-white text-[#0B2528] shadow-sm'
                  : 'text-[#4A6366] hover:text-[#0B2528]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-[#D8E5E1] rounded-xl p-10 flex items-center justify-center gap-3 text-sm text-[#4A6366]">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
          <span>Loading administration metrics...</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {!loading && !error && tab === 'analytics' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-[#D8E5E1] rounded-xl p-5">
              <p className="text-xs text-[#4A6366]">Registered Users</p>
              <p className="text-2xl font-bold font-mono tabular-nums mt-1">
                {stats.users}
              </p>
            </div>
            <div className="bg-white border border-[#D8E5E1] rounded-xl p-5">
              <p className="text-xs text-[#4A6366]">Total Datasets</p>
              <p className="text-2xl font-bold font-mono tabular-nums mt-1">
                {stats.datasets}
              </p>
            </div>
            <div className="bg-white border border-[#D8E5E1] rounded-xl p-5">
              <p className="text-xs text-[#4A6366]">Sequence Records</p>
              <p className="text-2xl font-bold font-mono tabular-nums mt-1">
                {stats.sequences}
              </p>
            </div>
            <div className="bg-white border border-[#D8E5E1] rounded-xl p-5">
              <p className="text-xs text-[#4A6366]">Reference Taxa</p>
              <p className="text-2xl font-bold font-mono tabular-nums mt-1">
                {stats.speciesCatalog}
              </p>
            </div>
            <div className="bg-white border border-[#D8E5E1] rounded-xl p-5">
              <p className="text-xs text-[#4A6366]">Generated Reports</p>
              <p className="text-2xl font-bold font-mono tabular-nums mt-1">
                {stats.reports}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#D8E5E1] rounded-xl p-6">
            <h2 className="text-base font-semibold text-[#0B2528] mb-4">
              Dataset Distribution by Biome
            </h2>
            <div className="space-y-3">
              {biomeBreakdown.map((b) => (
                <div key={b.biome} className="flex items-center justify-between text-sm">
                  <span className="text-[#0B2528]">{b.biome}</span>
                  <span className="font-mono tabular-nums text-emerald-800 font-medium">
                    {b.count} datasets
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && tab === 'users' && (
        <div className="bg-white border border-[#D8E5E1] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E7F0ED] bg-[#F7FAF9] text-xs font-medium text-[#4A6366]">
                  <th className="py-3 px-6">User</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account State</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7F0ED] text-sm">
                {usersList.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3.5 px-6">
                      <p className="font-medium text-[#0B2528]">
                        {u.displayName || u.email}
                      </p>
                      <p className="text-xs text-[#4A6366]">{u.email}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#4A6366]">
                      {u.institution || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleUpdateUser(u.id, { role: e.target.value })
                        }
                        className="px-2.5 py-1 text-xs border border-[#D8E5E1] rounded-md bg-white"
                      >
                        <option value="researcher">researcher</option>
                        <option value="student">student</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium">
                      <span
                        className={
                          u.isActive ? 'text-emerald-800' : 'text-rose-700'
                        }
                      >
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateUser(u.id, { isActive: !u.isActive })
                        }
                        className="text-xs font-medium text-sky-800 hover:underline"
                      >
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && tab === 'datasets' && (
        <div className="bg-white border border-[#D8E5E1] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E7F0ED] bg-[#F7FAF9] text-xs font-medium text-[#4A6366]">
                  <th className="py-3 px-6">Dataset</th>
                  <th className="py-3 px-4">Location & Marker</th>
                  <th className="py-3 px-4 text-right">Reads</th>
                  <th className="py-3 px-4">Visibility</th>
                  <th className="py-3 px-6 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7F0ED] text-sm">
                {datasetsList.map((ds) => (
                  <tr key={ds.id}>
                    <td className="py-3.5 px-6 font-medium text-[#0B2528]">
                      {ds.title}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#4A6366]">
                      {ds.sampleLocation} · {ds.markerGene}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {ds.totalReads.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleDatasetPublic(ds)}
                        className="font-medium text-sky-800 hover:underline"
                      >
                        {ds.isPublic ? 'Public' : 'Private'}
                      </button>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteDataset(ds.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && tab === 'taxonomy' && (
        <div className="space-y-6">
          <form
            onSubmit={handleAddSpecies}
            className="bg-white border border-[#D8E5E1] rounded-xl p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-[#0B2528]">
              Add Reference Barcode Taxon
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                required
                value={sciName}
                onChange={(e) => setSciName(e.target.value)}
                placeholder="Scientific Name (e.g., Thunnus albacares)"
                className="px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg"
              />
              <input
                type="text"
                required
                value={commonName}
                onChange={(e) => setCommonName(e.target.value)}
                placeholder="Common Name (e.g., Yellowfin Tuna)"
                className="px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg"
              />
              <input
                type="text"
                required
                value={phylum}
                onChange={(e) => setPhylum(e.target.value)}
                placeholder="Phylum"
                className="px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg"
              />
              <select
                value={habitat}
                onChange={(e) => setHabitat(e.target.value)}
                className="px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg bg-white"
              >
                <option value="Marine Reef">Marine Reef</option>
                <option value="Coastal Kelp">Coastal Kelp</option>
                <option value="Freshwater River">Freshwater River</option>
                <option value="Mangrove Estuary">Mangrove Estuary</option>
                <option value="Pelagic Open Ocean">Pelagic Open Ocean</option>
              </select>
              <select
                value={markerGene}
                onChange={(e) => setMarkerGene(e.target.value)}
                className="px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg bg-white"
              >
                <option value="COI">COI</option>
                <option value="12S MiFish">12S MiFish</option>
                <option value="16S rRNA">16S rRNA</option>
                <option value="ITS2">ITS2</option>
              </select>
              <select
                value={iucnStatus}
                onChange={(e) => setIucnStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg bg-white"
              >
                <option value="LC">LC</option>
                <option value="NT">NT</option>
                <option value="VU">VU</option>
                <option value="EN">EN</option>
                <option value="CR">CR</option>
              </select>
            </div>
            <input
              type="text"
              required
              value={refSeq}
              onChange={(e) => setRefSeq(e.target.value)}
              placeholder="Reference DNA Barcode Sequence (ACGT...)"
              className="w-full px-3 py-2 text-xs font-mono border border-[#D8E5E1] rounded-lg"
            />
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
              <input
                type="text"
                value={ecoRole}
                onChange={(e) => setEcoRole(e.target.value)}
                placeholder="Ecological role summary"
                className="flex-1 px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg"
              />
              <button
                type="submit"
                disabled={savingSpecies}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Add Taxon</span>
              </button>
            </div>
          </form>

          <div className="bg-white border border-[#D8E5E1] rounded-xl overflow-hidden">
            <div className="divide-y divide-[#E7F0ED]">
              {species.map((sp) => (
                <div
                  key={sp.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-4 text-sm"
                >
                  <div>
                    <span className="font-semibold italic text-[#0B2528]">
                      {sp.scientificName}
                    </span>
                    <span className="text-[#4A6366] ml-2">
                      ({sp.commonName}) · {sp.habitat} · {sp.markerGene}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSpecies(sp.id)}
                    className="text-xs font-medium text-rose-700 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && tab === 'settings' && (
        <div className="bg-white border border-[#D8E5E1] rounded-xl divide-y divide-[#E7F0ED]">
          {settingsList.map((setting) => (
            <SettingRow
              key={setting.key}
              setting={setting}
              onSave={handleSaveSetting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SettingRow({
  setting,
  onSave,
}: {
  setting: AppSetting;
  onSave: (key: string, val: string) => Promise<void>;
}) {
  const [val, setVal] = useState(setting.value);
  const [saving, setSaving] = useState(false);

  return (
    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="text-sm font-mono font-semibold text-[#0B2528]">
          {setting.key}
        </p>
        <p className="text-xs text-[#4A6366] mt-0.5">{setting.description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="px-3 py-1.5 text-sm font-mono border border-[#D8E5E1] rounded-lg w-40"
        />
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave(setting.key, val);
            setSaving(false);
          }}
          className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
