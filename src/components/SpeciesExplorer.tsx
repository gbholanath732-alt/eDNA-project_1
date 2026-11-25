import { useMemo, useState } from 'react';
import { Dna, Loader2, Search, X } from 'lucide-react';
import { SpeciesRecord } from '../types/edna.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface SpeciesExplorerProps {
  species: SpeciesRecord[];
  initialHabitat?: string;
}

const HABITATS = [
  'All',
  'Marine Reef',
  'Coastal Kelp',
  'Freshwater River',
  'Mangrove Estuary',
  'Pelagic Open Ocean',
];

const MARKERS = ['All', 'COI', '12S MiFish', '16S rRNA', 'ITS2'];

const IUCN_LABELS: Record<string, { label: string; tone: string }> = {
  LC: { label: 'LC · Least Concern', tone: 'text-emerald-800' },
  NT: { label: 'NT · Near Threatened', tone: 'text-sky-800' },
  VU: { label: 'VU · Vulnerable', tone: 'text-amber-700' },
  EN: { label: 'EN · Endangered', tone: 'text-rose-700' },
  CR: { label: 'CR · Critically Endangered', tone: 'text-rose-900' },
  DD: { label: 'DD · Data Deficient', tone: 'text-[#4A6366]' },
};

export function SpeciesExplorer({
  species,
  initialHabitat = 'All',
}: SpeciesExplorerProps) {
  const [search, setSearch] = useState('');
  const [habitat, setHabitat] = useState(initialHabitat);
  const [marker, setMarker] = useState('All');
  const [selected, setSelected] = useState<SpeciesRecord | null>(null);
  const [aiBrief, setAiBrief] = useState<{
    ecologicalSignificance: string;
    ednaDetectionNotes: string;
    conservationContext: string;
  } | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return species.filter((sp) => {
      if (habitat !== 'All' && sp.habitat !== habitat) return false;
      if (marker !== 'All' && sp.markerGene !== marker) return false;
      if (q) {
        const matches =
          sp.scientificName.toLowerCase().includes(q) ||
          sp.commonName.toLowerCase().includes(q) ||
          sp.phylum.toLowerCase().includes(q) ||
          sp.family.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [species, search, habitat, marker]);

  const handleOpenDetail = (sp: SpeciesRecord) => {
    setSelected(sp);
    setAiBrief(null);
    setBriefError(null);
  };

  const handleGenerateBrief = async (sp: SpeciesRecord) => {
    setBriefLoading(true);
    setBriefError(null);
    try {
      const res = await fetch(`/api/species/${sp.id}/ai-brief`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not generate taxonomic brief');
      }
      setAiBrief(data.brief);
    } catch (err: any) {
      setBriefError(err?.message || 'Failed to retrieve AI brief');
    } finally {
      setBriefLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2528]">
            Species & Barcode Reference Explorer
          </h1>
          <p className="text-sm text-[#4A6366] mt-1">
            Inspect verified mitochondrial and ribosomal eDNA barcodes, taxonomic lineages, and IUCN status.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#4A6366] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scientific name, phylum, family..."
            aria-label="Search reference species"
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-[#D8E5E1] rounded-lg focus:outline-none focus:border-emerald-700"
          />
        </div>
      </div>

      {/* Filter Segmented Controls */}
      <div className="bg-white border border-[#D8E5E1] rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#4A6366] mr-2">Biome:</span>
          <div className="flex flex-wrap gap-1 p-1 bg-[#F0F6F4] rounded-lg">
            {HABITATS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHabitat(h)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  habitat === h
                    ? 'bg-white text-[#0B2528] shadow-sm'
                    : 'text-[#4A6366] hover:text-[#0B2528]'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#4A6366] mr-2">Marker:</span>
          <div className="flex flex-wrap gap-1 p-1 bg-[#F0F6F4] rounded-lg">
            {MARKERS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMarker(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  marker === m
                    ? 'bg-white text-sky-900 shadow-sm'
                    : 'text-[#4A6366] hover:text-[#0B2528]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Species Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#D8E5E1] rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-[#0B2528]">
            No taxa match the active filter criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setHabitat('All');
              setMarker('All');
            }}
            className="mt-3 text-xs font-medium text-emerald-800 underline underline-offset-4"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((sp) => {
            const iucn = IUCN_LABELS[sp.iucnStatus] || IUCN_LABELS.DD;
            return (
              <article
                key={sp.id}
                className="bg-white border border-[#D8E5E1] rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] bg-[#F0F6F4] overflow-hidden">
                    <ResilientImage
                      src={sp.imageUrl}
                      alt={`${sp.commonName} (${sp.scientificName})`}
                      className="w-full h-full object-cover"
                      fallbackLabel={sp.scientificName}
                    />
                  </div>
                  <div className="p-5 space-y-2.5">
                    <div className="text-xs text-[#4A6366] flex flex-wrap items-center gap-1.5">
                      <span>{sp.phylum}</span>
                      <span aria-hidden="true">·</span>
                      <span>{sp.family}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-sky-800">{sp.markerGene}</span>
                    </div>

                    <div>
                      <h2 className="text-lg font-semibold text-[#0B2528] italic">
                        {sp.scientificName}
                      </h2>
                      <p className="text-sm text-[#4A6366]">{sp.commonName}</p>
                    </div>

                    <p className="text-xs text-[#4A6366] leading-relaxed line-clamp-2">
                      {sp.ecologicalRole}
                    </p>

                    <div className="pt-2 border-t border-[#E7F0ED] flex items-center justify-between text-xs">
                      <span className={`font-medium ${iucn.tone}`}>{iucn.label}</span>
                      <span className="font-mono tabular-nums text-[#4A6366]">
                        GC {sp.gcContent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(sp)}
                    className="w-full py-2 px-4 text-xs font-medium text-[#0B2528] bg-[#F0F6F4] hover:bg-[#E3EFEA] border border-[#D8E5E1] rounded-lg transition-colors"
                  >
                    Inspect Barcode & AI Taxonomic Brief
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-[#06181A]/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Taxon details for ${selected.scientificName}`}
        >
          <div className="bg-white border border-[#D8E5E1] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-sky-800">
                  {selected.kingdom} · {selected.phylum} · {selected.taxClass} ·{' '}
                  {selected.taxOrder} · {selected.family}
                </p>
                <h2 className="text-2xl font-bold text-[#0B2528] italic mt-1">
                  {selected.scientificName}
                </h2>
                <p className="text-sm text-[#4A6366]">{selected.commonName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close modal"
                className="p-2 rounded-lg text-[#4A6366] hover:bg-[#F0F6F4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-[#F7FAF9] border border-[#D8E5E1] rounded-xl p-4 text-xs">
              <div>
                <span className="text-[#4A6366] block">Habitat Biome</span>
                <span className="font-semibold text-[#0B2528]">{selected.habitat}</span>
              </div>
              <div>
                <span className="text-[#4A6366] block">Target Marker</span>
                <span className="font-mono font-semibold text-sky-800">
                  {selected.markerGene}
                </span>
              </div>
              <div>
                <span className="text-[#4A6366] block">GC Composition</span>
                <span className="font-mono tabular-nums font-semibold text-[#0B2528]">
                  {selected.gcContent.toFixed(1)}%
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-[#4A6366] mb-1.5">
                Reference Amplicon Barcode Snippet
              </p>
              <div className="bg-[#0B2528] text-emerald-200 font-mono text-xs p-3.5 rounded-lg break-all leading-relaxed">
                {selected.referenceSequence}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#0B2528]">Ecological Role</h3>
              <p className="text-sm text-[#4A6366] mt-1 leading-relaxed">
                {selected.ecologicalRole}
              </p>
            </div>

            <div className="border-t border-[#E7F0ED] pt-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-[#0B2528]">
                  AI Taxonomic & eDNA Monitoring Brief
                </h3>
                <button
                  type="button"
                  disabled={briefLoading}
                  onClick={() => handleGenerateBrief(selected)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                >
                  {briefLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Brief...</span>
                    </>
                  ) : (
                    <>
                      <Dna className="w-3.5 h-3.5" />
                      <span>Generate Gemini Brief</span>
                    </>
                  )}
                </button>
              </div>

              {briefError && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  {briefError}
                </p>
              )}

              {aiBrief && (
                <div className="bg-[#F0F6F4] border border-[#D8E5E1] rounded-xl p-4 space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-emerald-900">
                      Ecological Significance
                    </p>
                    <p className="text-[#0B2528] mt-0.5 leading-relaxed">
                      {aiBrief.ecologicalSignificance}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-sky-900">
                      eDNA Detection & Primer Notes
                    </p>
                    <p className="text-[#0B2528] mt-0.5 leading-relaxed">
                      {aiBrief.ednaDetectionNotes}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0B2528]">
                      Conservation Context
                    </p>
                    <p className="text-[#0B2528] mt-0.5 leading-relaxed">
                      {aiBrief.conservationContext}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
