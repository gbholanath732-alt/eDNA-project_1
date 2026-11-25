import React, { useEffect, useState } from 'react';
import {
  Download,
  FileText,
  Loader2,
  Printer,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  BiodiversityReport,
  DatasetAnalytics,
  DatasetSummary,
  SequenceRecord,
} from '../types/edna.ts';
import { BiodiversityCharts } from './BiodiversityCharts.tsx';

interface DatasetAnalyzerProps {
  datasets: DatasetSummary[];
  selectedDatasetId: number | null;
  onSelectDataset: (id: number) => void;
  onDatasetsChanged: () => Promise<void>;
}

const SAMPLE_FASTA = `>Estuary_SiteA_01_reads=340
AAAGGTTTGGTCCTAGCCTTAATATTAATTTTTAGTAAAATTACACATGCAAGCATCCGCATCCCCGTGAAAACGCCA
>Estuary_SiteA_02_reads=285
GCGATACTTGGTGTGAATTGCAGAATCCCGTGAACCATCGAGTCTTTGAACGCAAGTTGCGCCCGAAGCCATTAGG
>Estuary_SiteA_03_reads=190
CACCGCGGTTATACGAGAGACCCTAGTTGATAGACCACGGCGTAAAGAGTGGTTAAGGAAAAAATCACAACTAAAGCC
>Estuary_SiteA_04_reads=115
GGTCAACAAATCATAAAGATATTGGTACCTTATATTTTATTTTCGGTGCCTGAGCCGGAATGGTAGGCACATCTTTAAGT`;

const SAMPLE_CSV = `header,sequence,read_count
Kelp_Station2_01,GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGACTCAAGTGGATAGACCACGGCGTAAAGGGTGGTTAGG,410
Kelp_Station2_02,CACTGCCTGCCATGGTTATTCCCTAAACTAGGATTAGATACCCTACTATGCTTAGCCCTAAACATAGATAGTTACCTA,95
Kelp_Station2_03,TCGATGAAGAACGCAGCGAAATGCGATACGTATTGTGAATTGCAGAATTCAGTGAATCATCGAATCTTTGAACGCACA,320`;

export function DatasetAnalyzer({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onDatasetsChanged,
}: DatasetAnalyzerProps) {
  const { firebaseUser, profile, getIdToken, signIn } = useAuth();

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeDataset, setActiveDataset] = useState<DatasetSummary | null>(null);
  const [sequences, setSequences] = useState<SequenceRecord[]>([]);
  const [reports, setReports] = useState<BiodiversityReport[]>([]);
  const [analytics, setAnalytics] = useState<DatasetAnalytics | null>(null);
  const [expandedSeqId, setExpandedSeqId] = useState<number | null>(null);

  // Upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [sampleLocation, setSampleLocation] = useState('');
  const [biome, setBiome] = useState('Marine Reef');
  const [markerGene, setMarkerGene] = useState('COI');
  const [collectionDate, setCollectionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [fileFormat, setFileFormat] = useState<'FASTA' | 'CSV'>('FASTA');
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Report generation
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    const targetId = selectedDatasetId || datasets[0]?.id;
    if (!targetId) {
      setActiveDataset(null);
      return;
    }

    let cancelled = false;
    const loadDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const token = await getIdToken();
        const res = await fetch(`/api/datasets/${targetId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load dataset analytics');
        }
        if (!cancelled) {
          setActiveDataset(data.dataset);
          setSequences(data.sequences || []);
          setReports(data.reports || []);
          setAnalytics(data.analytics || null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setDetailError(err?.message || 'Error loading dataset');
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedDatasetId, datasets, firebaseUser]);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (file.name.toLowerCase().endsWith('.csv')) {
      setFileFormat('CSV');
    } else {
      setFileFormat('FASTA');
    }
    const text = await file.text();
    setFileContent(text);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      await signIn();
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/datasets/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          sampleLocation,
          biome,
          markerGene,
          collectionDate,
          fileFormat,
          fileName: fileName || `upload.${fileFormat.toLowerCase()}`,
          fileContent,
          isPublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze dataset');
      }
      setShowUpload(false);
      setTitle('');
      setSampleLocation('');
      setFileContent('');
      setFileName('');
      await onDatasetsChanged();
      onSelectDataset(data.dataset.id);
    } catch (err: any) {
      setUploadError(err?.message || 'Upload and identification failed');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!activeDataset) return;
    if (!firebaseUser) {
      await signIn();
      return;
    }
    setGeneratingReport(true);
    setReportError(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/datasets/${activeDataset.id}/report`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not generate scientific report');
      }
      setReports((prev) => [data.report, ...prev]);
    } catch (err: any) {
      setReportError(err?.message || 'Report generation failed');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDeleteDataset = async (id: number) => {
    if (!firebaseUser) return;
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/datasets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await onDatasetsChanged();
      }
    } catch {
      // handled silently
    }
  };

  const handleDownloadCsv = () => {
    if (!activeDataset || sequences.length === 0) return;
    const headers = [
      'sequence_header',
      'scientific_name',
      'common_name',
      'kingdom',
      'phylum',
      'class',
      'family',
      'reads',
      'gc_percent',
      'length_bp',
      'confidence_percent',
      'iucn_status',
    ];
    const rows = sequences.map((s) =>
      [
        `"${s.sequenceHeader.replace(/"/g, '""')}"`,
        `"${s.identifiedScientificName}"`,
        `"${s.identifiedCommonName}"`,
        s.kingdom,
        s.phylum,
        s.taxClass,
        s.family,
        s.readCount,
        s.gcContent,
        s.sequenceLength,
        s.confidenceScore,
        s.iucnStatus,
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDataset.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_taxonomy.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canDeleteActive =
    activeDataset &&
    profile &&
    (activeDataset.userId === profile.uid || profile.role === 'admin');

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2528]">
            eDNA Biodiversity Analyzer & Reports
          </h1>
          <p className="text-sm text-[#4A6366] mt-1">
            Upload FASTA or CSV amplicons for AI taxonomic classification, diversity modeling, and peer-review reporting.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUpload((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{showUpload ? 'Close Upload Form' : 'Upload FASTA / CSV'}</span>
        </button>
      </div>

      {/* Collapsible Upload & AI Classification Panel */}
      {showUpload && (
        <section className="bg-white border border-[#D8E5E1] rounded-2xl p-6 space-y-5 no-print">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E7F0ED] pb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0B2528]">
                New eDNA Dataset Upload & Gemini Taxonomic Pipeline
              </h2>
              <p className="text-xs text-[#4A6366] mt-0.5">
                {firebaseUser
                  ? 'Sequences are validated, stored in Cloud SQL PostgreSQL, and identified via Gemini.'
                  : 'Sign in with Google to persist uploaded datasets and run AI identification.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTitle('Mangrove Estuary Pilot Survey');
                  setSampleLocation('Sunderbans Outer Delta');
                  setBiome('Mangrove Estuary');
                  setMarkerGene('COI');
                  setFileFormat('FASTA');
                  setFileName('mangrove_pilot.fasta');
                  setFileContent(SAMPLE_FASTA);
                }}
                className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-[#F0F6F4] hover:bg-[#E3EFEA] border border-[#D8E5E1] rounded-lg"
              >
                Load Sample FASTA
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitle('Temperate Kelp Station 2');
                  setSampleLocation('Point Lobos Reserve, CA');
                  setBiome('Coastal Kelp');
                  setMarkerGene('12S MiFish');
                  setFileFormat('CSV');
                  setFileName('kelp_station2.csv');
                  setFileContent(SAMPLE_CSV);
                }}
                className="px-3 py-1.5 text-xs font-medium text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg"
              >
                Load Sample CSV
              </button>
            </div>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#4A6366] mb-1">
                  Dataset Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Coral Lagoon Transect A"
                  className="w-full px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A6366] mb-1">
                  Sample Location
                </label>
                <input
                  type="text"
                  required
                  value={sampleLocation}
                  onChange={(e) => setSampleLocation(e.target.value)}
                  placeholder="e.g., Heron Island Reef, QLD"
                  className="w-full px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A6366] mb-1">
                  Collection Date
                </label>
                <input
                  type="date"
                  required
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#4A6366] mb-1">
                  Aquatic Biome
                </label>
                <select
                  value={biome}
                  onChange={(e) => setBiome(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg bg-white focus:outline-none focus:border-emerald-700"
                >
                  <option value="Marine Reef">Marine Reef</option>
                  <option value="Coastal Kelp">Coastal Kelp</option>
                  <option value="Freshwater River">Freshwater River</option>
                  <option value="Mangrove Estuary">Mangrove Estuary</option>
                  <option value="Pelagic Open Ocean">Pelagic Open Ocean</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A6366] mb-1">
                  Barcode Marker Gene
                </label>
                <select
                  value={markerGene}
                  onChange={(e) => setMarkerGene(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg bg-white focus:outline-none focus:border-emerald-700"
                >
                  <option value="COI">COI (Metazoan Cytochrome Oxidase I)</option>
                  <option value="12S MiFish">12S MiFish (Teleost & Elasmobranch)</option>
                  <option value="16S rRNA">16S rRNA (Microbial & Cyanobacteria)</option>
                  <option value="ITS2">ITS2 (Macroalgae & Aquatic Plants)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A6366] mb-1">
                  Format & Upload File
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={fileFormat}
                    onChange={(e) =>
                      setFileFormat(e.target.value === 'CSV' ? 'CSV' : 'FASTA')
                    }
                    className="px-3 py-2 text-sm border border-[#D8E5E1] rounded-lg bg-white"
                  >
                    <option value="FASTA">FASTA</option>
                    <option value="CSV">CSV</option>
                  </select>
                  <label className="flex-1 cursor-pointer px-3 py-2 text-xs font-medium text-center text-[#0B2528] bg-[#F0F6F4] hover:bg-[#E3EFEA] border border-[#D8E5E1] rounded-lg truncate">
                    {fileName || 'Choose .fasta / .csv'}
                    <input
                      type="file"
                      accept=".fasta,.fa,.fna,.csv,.txt"
                      onChange={handleFilePick}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4A6366] mb-1">
                Sequence Payload (FASTA headers `&gt;id_reads=100` or CSV `header,sequence,read_count`)
              </label>
              <textarea
                required
                rows={5}
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                placeholder="Paste FASTA or CSV DNA sequences here..."
                className="w-full px-3.5 py-2.5 text-xs font-mono border border-[#D8E5E1] rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <label className="inline-flex items-center gap-2 text-xs text-[#4A6366]">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded border-[#D8E5E1] text-emerald-700"
                />
                <span>Publish dataset to shared Explorer repository</span>
              </label>

              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Identifying Taxa with Gemini...</span>
                  </>
                ) : (
                  <span>
                    {firebaseUser ? 'Run Identification & Save Dataset' : 'Sign In to Analyze'}
                  </span>
                )}
              </button>
            </div>

            {uploadError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                {uploadError}
              </p>
            )}
          </form>
        </section>
      )}

      {/* Workspace Split: Dataset Sidebar + Main Analytics Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Dataset Selector */}
        <aside className="lg:col-span-3 bg-white border border-[#D8E5E1] rounded-xl overflow-hidden no-print">
          <div className="px-4 py-3.5 border-b border-[#E7F0ED] bg-[#F7FAF9]">
            <h2 className="text-sm font-semibold text-[#0B2528]">
              Available Datasets ({datasets.length})
            </h2>
          </div>
          <div className="divide-y divide-[#E7F0ED] max-h-[540px] overflow-y-auto">
            {datasets.map((ds) => {
              const isSelected = activeDataset?.id === ds.id;
              return (
                <button
                  key={ds.id}
                  type="button"
                  onClick={() => onSelectDataset(ds.id)}
                  className={`w-full text-left p-4 transition-colors ${
                    isSelected
                      ? 'bg-[#F0F6F4] text-[#0B2528]'
                      : 'hover:bg-[#F7FAF9] text-[#4A6366]'
                  }`}
                >
                  <p className="text-sm font-semibold text-[#0B2528] line-clamp-1">
                    {ds.title}
                  </p>
                  <p className="text-xs text-[#4A6366] mt-1">
                    {ds.biome} · {ds.markerGene}
                  </p>
                  <p className="text-xs font-mono tabular-nums text-emerald-800 mt-1.5">
                    S={ds.identifiedSpeciesCount} · H′={ds.shannonIndex.toFixed(2)}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Analytics Stage */}
        <div className="lg:col-span-9 space-y-6">
          {detailLoading && (
            <div className="bg-white border border-[#D8E5E1] rounded-xl p-12 flex items-center justify-center gap-3 text-sm text-[#4A6366]">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
              <span>Computing rarefaction models and loading taxonomic records...</span>
            </div>
          )}

          {!detailLoading && detailError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-sm text-rose-800">
              {detailError}
            </div>
          )}

          {!detailLoading && activeDataset && analytics && (
            <>
              {/* Active Dataset Header */}
              <div className="bg-white border border-[#D8E5E1] rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-mono text-[#4A6366]">
                      {activeDataset.biome} · {activeDataset.sampleLocation} ·{' '}
                      {activeDataset.collectionDate} · {activeDataset.markerGene} (
                      {activeDataset.fileFormat})
                    </p>
                    <h2 className="text-2xl font-bold text-[#0B2528]">
                      {activeDataset.title}
                    </h2>
                    {activeDataset.description && (
                      <p className="text-sm text-[#4A6366] max-w-2xl">
                        {activeDataset.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 no-print shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0B2528] bg-[#F0F6F4] hover:bg-[#E3EFEA] border border-[#D8E5E1] rounded-lg"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0B2528] bg-[#F0F6F4] hover:bg-[#E3EFEA] border border-[#D8E5E1] rounded-lg"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Report</span>
                    </button>
                    {canDeleteActive && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDataset(activeDataset.id)}
                        aria-label="Delete dataset"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Biodiversity Index KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-[#E7F0ED]">
                  <div>
                    <p className="text-xs text-[#4A6366]">Species Richness (S)</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-[#0B2528] mt-1">
                      {analytics.speciesRichness}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#4A6366]">Shannon-Wiener (H′)</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-emerald-800 mt-1">
                      {analytics.shannonIndex.toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#4A6366]">Simpson (1 − D)</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-sky-800 mt-1">
                      {analytics.simpsonIndex.toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#4A6366]">Pielou Evenness (J′)</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-[#0B2528] mt-1">
                      {analytics.pielouEvenness.toFixed(3)}
                    </p>
                  </div>
                </div>
              </div>

              {/* SVG Visualizations */}
              <BiodiversityCharts analytics={analytics} />

              {/* Identified Sequences Table */}
              <div className="bg-white border border-[#D8E5E1] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E7F0ED] flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#0B2528]">
                      Taxonomic Identifications ({sequences.length} Amplicons)
                    </h3>
                    <p className="text-xs text-[#4A6366]">
                      Click any row to inspect raw nucleotide sequence and AI classification rationale.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E7F0ED] bg-[#F7FAF9] text-xs font-medium text-[#4A6366]">
                        <th className="py-3 px-6">Taxon Identified</th>
                        <th className="py-3 px-4">Lineage</th>
                        <th className="py-3 px-4 text-right">Reads</th>
                        <th className="py-3 px-4 text-right">GC %</th>
                        <th className="py-3 px-4 text-right">Confidence</th>
                        <th className="py-3 px-6 text-right">IUCN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7F0ED] text-sm">
                      {sequences.map((seq) => {
                        const isExpanded = expandedSeqId === seq.id;
                        return (
                          <React.Fragment key={seq.id}>
                            <tr
                              onClick={() =>
                                setExpandedSeqId(isExpanded ? null : seq.id)
                              }
                              className="cursor-pointer hover:bg-[#F7FAF9] transition-colors"
                            >
                              <td className="py-3.5 px-6">
                                <p className="font-semibold italic text-[#0B2528]">
                                  {seq.identifiedScientificName}
                                </p>
                                <p className="text-xs text-[#4A6366]">
                                  {seq.identifiedCommonName}
                                </p>
                              </td>
                              <td className="py-3.5 px-4 text-xs text-[#4A6366]">
                                {seq.phylum} · {seq.taxClass} · {seq.family}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                                {seq.readCount.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#4A6366]">
                                {seq.gcContent.toFixed(1)}%
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-800">
                                {seq.confidenceScore.toFixed(1)}%
                              </td>
                              <td className="py-3.5 px-6 text-right font-mono text-xs font-semibold">
                                <span
                                  className={
                                    seq.iucnStatus === 'EN' || seq.iucnStatus === 'CR'
                                      ? 'text-rose-700'
                                      : seq.iucnStatus === 'VU'
                                        ? 'text-amber-700'
                                        : 'text-[#0B2528]'
                                  }
                                >
                                  {seq.iucnStatus}
                                </span>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-[#F7FAF9]">
                                <td colSpan={6} className="px-6 py-4 space-y-2">
                                  <p className="text-xs text-[#4A6366]">
                                    <span className="font-semibold text-[#0B2528]">
                                      Header:{' '}
                                    </span>
                                    <span className="font-mono">
                                      {seq.sequenceHeader} ({seq.sequenceLength} bp)
                                    </span>
                                  </p>
                                  <p className="text-xs font-mono bg-[#0B2528] text-emerald-200 p-2.5 rounded-lg break-all">
                                    {seq.dnaSequence}
                                  </p>
                                  {seq.aiRationale && (
                                    <p className="text-xs text-[#0B2528]">
                                      <span className="font-semibold">
                                        Classification Rationale:{' '}
                                      </span>
                                      {seq.aiRationale}
                                    </p>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scientific Reports Section */}
              <div className="bg-white border border-[#D8E5E1] rounded-xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#0B2528]">
                      Scientific Biodiversity Reports
                    </h3>
                    <p className="text-xs text-[#4A6366]">
                      Structured ecological interpretation generated from calculated diversity metrics and taxon records.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={generatingReport}
                    onClick={handleGenerateReport}
                    className="no-print inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {generatingReport ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Synthesizing Report...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5" />
                        <span>
                          {firebaseUser
                            ? 'Generate AI Scientific Report'
                            : 'Sign In to Generate Report'}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {reportError && (
                  <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                    {reportError}
                  </p>
                )}

                {reports.length === 0 ? (
                  <p className="text-sm text-[#4A6366] py-4">
                    No reports generated for this dataset yet. Click &ldquo;Generate AI Scientific Report&rdquo; to synthesize one.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {reports.map((rep) => (
                      <article
                        key={rep.id}
                        className="border border-[#E7F0ED] bg-[#F7FAF9] rounded-xl p-5 space-y-4"
                      >
                        <div className="border-b border-[#D8E5E1] pb-3">
                          <h4 className="text-base font-bold text-[#0B2528]">
                            {rep.title}
                          </h4>
                          <p className="text-xs font-mono text-[#4A6366] mt-0.5">
                            Generated {new Date(rep.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
                              Executive Summary
                            </p>
                            <p className="text-[#0B2528] mt-1 leading-relaxed">
                              {rep.executiveSummary}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-sky-900 uppercase tracking-wide">
                              Taxonomic Highlights
                            </p>
                            <p className="text-[#0B2528] mt-1 leading-relaxed">
                              {rep.taxonomicHighlights}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#0B2528] uppercase tracking-wide">
                              Conservation Notes
                            </p>
                            <p className="text-[#0B2528] mt-1 leading-relaxed">
                              {rep.conservationNotes}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#4A6366] uppercase tracking-wide">
                              Methodology & Controls
                            </p>
                            <p className="text-[#0B2528] mt-1 leading-relaxed">
                              {rep.methodologyNotes}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
