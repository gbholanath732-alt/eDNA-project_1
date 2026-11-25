import { ArrowRight, UploadCloud } from 'lucide-react';
import { DatasetSummary, SpeciesRecord } from '../types/edna.ts';
import { ResilientImage } from './ResilientImage.tsx';
import { AppView } from './Navbar.tsx';

interface OverviewSectionProps {
  datasets: DatasetSummary[];
  species: SpeciesRecord[];
  onNavigate: (view: AppView) => void;
  onSelectDataset: (datasetId: number) => void;
  onFilterHabitat: (habitat: string) => void;
}

export function OverviewSection({
  datasets,
  species,
  onNavigate,
  onSelectDataset,
  onFilterHabitat,
}: OverviewSectionProps) {
  const totalReads = datasets.reduce((sum, d) => sum + d.totalReads, 0);
  const avgShannon =
    datasets.length > 0
      ? (
          datasets.reduce((sum, d) => sum + d.shannonIndex, 0) / datasets.length
        ).toFixed(2)
      : '0.00';

  const ecosystemCards = [
    {
      title: 'Tropical Coral Reefs',
      habitat: 'Marine Reef',
      meta: 'COI & 12S MiFish · Scleractinia & Reef Teleosts',
      description:
        'Detect cryptic scleractinian corals, reef sharks, and planktivorous fishes from 2L seawater replicates.',
      image: '/src/assets/images/species_coral_reef_1795608904344.jpg',
    },
    {
      title: 'Temperate Kelp Canopies',
      habitat: 'Coastal Kelp',
      meta: 'ITS2 & 12S · Macroalgae & Keystone Carnivores',
      description:
        'Track Macrocystis canopy health, echinoid grazing pressure, and endangered marine mammals non-invasively.',
      image: '/src/assets/images/species_kelp_forest_1795608905759.jpg',
    },
    {
      title: 'Alpine Freshwater Rivers',
      habitat: 'Freshwater River',
      meta: '12S & COI · Cold-Water Salmonids & Unionids',
      description:
        'Monitor watershed thermal refugia and endangered benthic pearl mussels across headwater tributaries.',
      image: '/src/assets/images/species_freshwater_river_1795608906521.jpg',
    },
  ];

  return (
    <div className="space-y-12">
      {/* Split Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-white border border-[#D8E5E1] rounded-2xl overflow-hidden">
        <div className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-between">
          <div className="space-y-5">
            <p className="text-xs font-mono tracking-wider uppercase text-emerald-800">
              Environmental Genomics & Molecular Ecology
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold leading-[1.14] tracking-tight text-[#0B2528] headline-balance">
              Identifying Taxonomy and Assessing Biodiversity from eDNA Datasets
            </h1>
            <p className="text-base text-[#4A6366] leading-relaxed max-w-xl">
              Upload FASTA or CSV amplicon metabarcoding datasets, classify organisms
              across marine and freshwater reference catalogs with Gemini AI, and
              quantify alpha diversity through Shannon, Simpson, and rarefaction models.
            </p>
          </div>

          <div className="pt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('analyze')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload eDNA Dataset</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('species')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#0B2528] bg-[#F0F6F4] hover:bg-[#E3EFEA] border border-[#D8E5E1] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <span>Browse Reference Taxa</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 relative min-h-[280px] lg:min-h-[420px]">
          <ResilientImage
            src="/src/assets/images/hero_edna_estuary_1795608904054.jpg"
            alt="Aerial view of coastal mangrove estuary and coral seagrass flats"
            className="w-full h-full lg:h-full object-cover"
            fallbackLabel="Coastal Estuary Monitoring Transect"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06181A]/80 via-[#06181A]/20 to-transparent flex items-end p-6">
            <div className="text-white space-y-1">
              <p className="text-xs font-mono text-emerald-200">
                COI · 12S MiFish · 16S rRNA · ITS2
              </p>
              <p className="text-sm font-medium">
                Non-invasive multi-kingdom aquatic biomonitoring across estuarine, reef, and alpine transects.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Column Quantitative Strip directly below hero */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#D8E5E1] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4A6366]">Reference Datasets</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#0B2528] mt-1.5">
            {datasets.length}
          </p>
          <p className="text-xs text-[#4A6366] mt-1">Analyzed & indexed</p>
        </div>
        <div className="bg-white border border-[#D8E5E1] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4A6366]">Cataloged Taxa</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#0B2528] mt-1.5">
            {species.length}
          </p>
          <p className="text-xs text-[#4A6366] mt-1">Verified barcode references</p>
        </div>
        <div className="bg-white border border-[#D8E5E1] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4A6366]">Sequencing Reads</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#0B2528] mt-1.5">
            {totalReads.toLocaleString()}
          </p>
          <p className="text-xs text-[#4A6366] mt-1">Quality-filtered amplicons</p>
        </div>
        <div className="bg-white border border-[#D8E5E1] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4A6366]">Mean Shannon H′</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-800 mt-1.5">
            {avgShannon}
          </p>
          <p className="text-xs text-[#4A6366] mt-1">Community alpha diversity</p>
        </div>
      </section>

      {/* Ecosystem Sampling Showcase */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#0B2528]">
              Monitored Aquatic Biomes
            </h2>
            <p className="text-sm text-[#4A6366] mt-1">
              Explore curated barcode taxa and baseline eDNA transects across key ecosystems.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('species')}
            className="text-sm font-medium text-sky-800 hover:text-sky-950 underline underline-offset-4"
          >
            Open full taxonomy catalog
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ecosystemCards.map((card) => (
            <button
              key={card.title}
              type="button"
              onClick={() => {
                onFilterHabitat(card.habitat);
                onNavigate('species');
              }}
              className="group text-left bg-white border border-[#D8E5E1] rounded-xl overflow-hidden hover:border-emerald-600/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#F0F6F4]">
                <ResilientImage
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
              <div className="p-5 space-y-2">
                <p className="text-xs font-mono text-[#4A6366]">{card.meta}</p>
                <h3 className="text-lg font-semibold text-[#0B2528] group-hover:text-emerald-800 transition-colors">
                  {card.title}
                </h3>
                <p className="text-sm text-[#4A6366] leading-relaxed">
                  {card.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Recent Public eDNA Datasets Table */}
      <section className="bg-white border border-[#D8E5E1] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E7F0ED] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0B2528]">
              Published Reference eDNA Datasets
            </h2>
            <p className="text-xs text-[#4A6366] mt-0.5">
              Select any survey below to inspect rarefaction curves, taxonomic assignments, and scientific reports.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('analyze')}
            className="text-sm font-medium text-emerald-800 hover:text-emerald-950"
          >
            Open Analysis Workspace →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E7F0ED] bg-[#F7FAF9] text-xs font-medium text-[#4A6366]">
                <th className="py-3 px-6">Dataset Title</th>
                <th className="py-3 px-4">Biome & Location</th>
                <th className="py-3 px-4">Marker</th>
                <th className="py-3 px-4 text-right">Taxa (S)</th>
                <th className="py-3 px-4 text-right">Shannon H′</th>
                <th className="py-3 px-4 text-right">Simpson 1−D</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7F0ED] text-sm">
              {datasets.slice(0, 6).map((ds) => (
                <tr key={ds.id} className="hover:bg-[#F7FAF9] transition-colors">
                  <td className="py-3.5 px-6 font-medium text-[#0B2528]">
                    {ds.title}
                  </td>
                  <td className="py-3.5 px-4 text-[#4A6366]">
                    {ds.biome} · {ds.sampleLocation}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-sky-800">
                    {ds.markerGene}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                    {ds.identifiedSpeciesCount}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-800">
                    {ds.shannonIndex.toFixed(3)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                    {ds.simpsonIndex.toFixed(3)}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDataset(ds.id);
                        onNavigate('analyze');
                      }}
                      className="text-xs font-medium text-emerald-800 hover:text-emerald-950 underline underline-offset-4 whitespace-nowrap"
                    >
                      Inspect Analytics
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
