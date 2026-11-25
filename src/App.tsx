/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AppView, Navbar } from './components/Navbar.tsx';
import { OverviewSection } from './components/OverviewSection.tsx';
import { SpeciesExplorer } from './components/SpeciesExplorer.tsx';
import { DatasetAnalyzer } from './components/DatasetAnalyzer.tsx';
import { LearningHub } from './components/LearningHub.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import {
  DatasetSummary,
  LearningModule,
  SpeciesRecord,
} from './types/edna.ts';

function ExplorerShell() {
  const { firebaseUser, getIdToken, authError } = useAuth();
  const [activeView, setActiveView] = useState<AppView>(() =>
    window.location.hash === '#admin' ? 'admin' : 'overview'
  );
  const [species, setSpecies] = useState<SpeciesRecord[]>([]);
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [initialHabitat, setInitialHabitat] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const [spRes, dsRes, lrRes] = await Promise.all([
        fetch('/api/species'),
        fetch('/api/datasets', { headers }),
        fetch('/api/learning'),
      ]);

      if (!spRes.ok || !dsRes.ok || !lrRes.ok) {
        throw new Error('Failed to load eDNA Explorer database records');
      }

      const [spData, dsData, lrData] = await Promise.all([
        spRes.json(),
        dsRes.json(),
        lrRes.json(),
      ]);

      setSpecies(spData.species || []);
      setDatasets(dsData.datasets || []);
      setModules(lrData.modules || []);
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to reach server');
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    loadData();
  }, [loadData, firebaseUser]);

  const handleNavigate = (view: AppView) => {
    setActiveView(view);
    if (view === 'admin') {
      window.history.replaceState(null, '', '#admin');
    } else if (window.location.hash === '#admin') {
      window.history.replaceState(null, '', '#');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7FAF9] text-[#0B2528]">
      <Navbar
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenProfileModal={() => setProfileModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {authError && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-900">
            Authentication notice: {authError}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-[#D8E5E1] rounded-2xl p-16 flex items-center justify-center gap-3 text-sm text-[#4A6366]">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
            <span>Initializing eDNA Explorer workspace...</span>
          </div>
        ) : loadError ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-sm text-rose-800 flex items-center justify-between">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={loadData}
              className="px-3.5 py-1.5 text-xs font-medium bg-white border border-rose-200 rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeView === 'overview' && (
              <OverviewSection
                datasets={datasets}
                species={species}
                onNavigate={handleNavigate}
                onSelectDataset={(id) => setSelectedDatasetId(id)}
                onFilterHabitat={(h) => setInitialHabitat(h)}
              />
            )}

            {activeView === 'species' && (
              <SpeciesExplorer
                species={species}
                initialHabitat={initialHabitat}
              />
            )}

            {activeView === 'analyze' && (
              <DatasetAnalyzer
                datasets={datasets}
                selectedDatasetId={selectedDatasetId}
                onSelectDataset={(id) => setSelectedDatasetId(id)}
                onDatasetsChanged={loadData}
              />
            )}

            {activeView === 'learn' && <LearningHub modules={modules} />}

            {activeView === 'admin' && (
              <AdminDashboard species={species} onRefreshGlobal={loadData} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-[#D8E5E1] bg-white py-6 mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#4A6366]">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/file_00000000dfdc82119d820d7ad8217f01_cec9d5e9.png"
              alt="eDNA Explorer logo"
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-md object-cover shrink-0"
            />
            <p>
              eDNA Explorer — Identifying Taxonomy and Assessing Biodiversity from eDNA Datasets
            </p>
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => handleNavigate('species')}
              className="hover:text-[#0B2528]"
            >
              Taxonomy Catalog
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('analyze')}
              className="hover:text-[#0B2528]"
            >
              Analyze Dataset
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('learn')}
              className="hover:text-[#0B2528]"
            >
              Methodology Guides
            </button>
          </div>
        </div>
      </footer>

      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ExplorerShell />
    </AuthProvider>
  );
}
