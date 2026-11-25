import { count } from 'drizzle-orm';
import { db } from './index.ts';
import {
  appSettings,
  biodiversityReports,
  datasets,
  learningModules,
  sequenceRecords,
  speciesCatalog,
} from './schema.ts';
import { computeBiodiversityMetrics } from '../lib/bioinformatics.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function runSeed(): Promise<void> {
  const [{ value: speciesCount }] = await db
    .select({ value: count() })
    .from(speciesCatalog);

  if (Number(speciesCount) > 0) {
    return;
  }

  const speciesSeed = [
    {
      scientificName: 'Acropora millepora',
      commonName: 'Staghorn Table Coral',
      kingdom: 'Animalia',
      phylum: 'Cnidaria',
      taxClass: 'Anthozoa',
      taxOrder: 'Scleractinia',
      family: 'Acroporidae',
      genus: 'Acropora',
      iucnStatus: 'NT',
      habitat: 'Marine Reef',
      markerGene: 'COI',
      referenceSequence:
        'GGTCAACAAATCATAAAGATATTGGTACCTTATATTTTATTTTCGGTGCCTGAGCCGGAATGGTAGGCACATCTTTA',
      gcContent: 44.2,
      ecologicalRole:
        'Primary reef-building scleractinian coral creating structural habitat for juvenile reef fish and invertebrates.',
      imageUrl: '/src/assets/images/species_coral_reef_1795608904344.jpg',
    },
    {
      scientificName: 'Chromis viridis',
      commonName: 'Blue-Green Chromis',
      kingdom: 'Animalia',
      phylum: 'Chordata',
      taxClass: 'Actinopterygii',
      taxOrder: 'Ovalentaria',
      family: 'Pomacentridae',
      genus: 'Chromis',
      iucnStatus: 'LC',
      habitat: 'Marine Reef',
      markerGene: '12S MiFish',
      referenceSequence:
        'CACCGCGGTTATACGAGAGACCCTAGTTGATAGACCACGGCGTAAAGAGTGGTTAAGGAAAAAATCACAACTAAAG',
      gcContent: 48.6,
      ecologicalRole:
        'Planktivorous schooling damselfish closely associated with branching Acropora colonies; indicator of healthy reef structure.',
      imageUrl: '/src/assets/images/species_coral_reef_1795608904344.jpg',
    },
    {
      scientificName: 'Chelonia mydas',
      commonName: 'Green Sea Turtle',
      kingdom: 'Animalia',
      phylum: 'Chordata',
      taxClass: 'Reptilia',
      taxOrder: 'Testudines',
      family: 'Cheloniidae',
      genus: 'Chelonia',
      iucnStatus: 'EN',
      habitat: 'Mangrove Estuary',
      markerGene: '12S MiFish',
      referenceSequence:
        'AAAGGTTTGGTCCTAGCCTTAATATTAATTTTTAGTAAAATTACACATGCAAGCATCCGCATCCCCGTGAAAACGC',
      gcContent: 46.1,
      ecologicalRole:
        'Keystone marine herbivore maintaining seagrass meadow productivity and nutrient cycling across coastal estuaries.',
      imageUrl: '/src/assets/images/hero_edna_estuary_1795608904054.jpg',
    },
    {
      scientificName: 'Macrocystis pyrifera',
      commonName: 'Giant Bladder Kelp',
      kingdom: 'Chromista',
      phylum: 'Ochrophyta',
      taxClass: 'Phaeophyceae',
      taxOrder: 'Laminariales',
      family: 'Laminariaceae',
      genus: 'Macrocystis',
      iucnStatus: 'LC',
      habitat: 'Coastal Kelp',
      markerGene: 'ITS2',
      referenceSequence:
        'TCGATGAAGAACGCAGCGAAATGCGATACGTATTGTGAATTGCAGAATTCAGTGAATCATCGAATCTTTGAACGCA',
      gcContent: 51.3,
      ecologicalRole:
        'Foundation macroalga forming three-dimensional underwater forests that attenuate wave energy and sequester coastal carbon.',
      imageUrl: '/src/assets/images/species_kelp_forest_1795608905759.jpg',
    },
    {
      scientificName: 'Sebastes mystinus',
      commonName: 'Blue Rockfish',
      kingdom: 'Animalia',
      phylum: 'Chordata',
      taxClass: 'Actinopterygii',
      taxOrder: 'Scorpaeniformes',
      family: 'Sebastidae',
      genus: 'Sebastes',
      iucnStatus: 'LC',
      habitat: 'Coastal Kelp',
      markerGene: '12S MiFish',
      referenceSequence:
        'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGACTCAAGTGGATAGACCACGGCGTAAAGGGTGGTTA',
      gcContent: 52.4,
      ecologicalRole:
        'Mid-water kelp forest predator linking pelagic zooplankton production to temperate rocky reef food webs.',
      imageUrl: '/src/assets/images/species_kelp_forest_1795608905759.jpg',
    },
    {
      scientificName: 'Enhydra lutris',
      commonName: 'Sea Otter',
      kingdom: 'Animalia',
      phylum: 'Chordata',
      taxClass: 'Mammalia',
      taxOrder: 'Carnivora',
      family: 'Mustelidae',
      genus: 'Enhydra',
      iucnStatus: 'EN',
      habitat: 'Coastal Kelp',
      markerGene: '12S MiFish',
      referenceSequence:
        'CACTGCCTGCCATGGTTATTCCCTAAACTAGGATTAGATACCCTACTATGCTTAGCCCTAAACATAGATAGTTACC',
      gcContent: 45.8,
      ecologicalRole:
        'Apex kelp-forest keystone carnivore regulating purple sea urchin grazing pressure and preserving kelp canopy biomass.',
      imageUrl: '/src/assets/images/species_kelp_forest_1795608905759.jpg',
    },
    {
      scientificName: 'Salvelinus fontinalis',
      commonName: 'Brook Trout',
      kingdom: 'Animalia',
      phylum: 'Chordata',
      taxClass: 'Actinopterygii',
      taxOrder: 'Salmoniformes',
      family: 'Salmonidae',
      genus: 'Salvelinus',
      iucnStatus: 'LC',
      habitat: 'Freshwater River',
      markerGene: '12S MiFish',
      referenceSequence:
        'GCCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGACCCTAGTTGATAGACTACGGCGTAAAGAGTGGTTA',
      gcContent: 50.9,
      ecologicalRole:
        'Cold-water indicator salmonid requiring high dissolved oxygen and intact riparian canopy shading.',
      imageUrl: '/src/assets/images/species_freshwater_river_1795608906521.jpg',
    },
    {
      scientificName: 'Margaritifera margaritifera',
      commonName: 'Freshwater Pearl Mussel',
      kingdom: 'Animalia',
      phylum: 'Mollusca',
      taxClass: 'Bivalvia',
      taxOrder: 'Unionida',
      family: 'Margaritiferidae',
      genus: 'Margaritifera',
      iucnStatus: 'EN',
      habitat: 'Freshwater River',
      markerGene: 'COI',
      referenceSequence:
        'TGGTACTTTATATTTTATTTTTGGGGCTTGAGCGGGTATAGTAGGGACTGCTTTGAGAGTTTTAATTCGAACTGAA',
      gcContent: 41.7,
      ecologicalRole:
        'Benthic filter-feeder clarifying oligotrophic river water; larval glochidia depend directly on native salmonid hosts.',
      imageUrl: '/src/assets/images/species_freshwater_river_1795608906521.jpg',
    },
    {
      scientificName: 'Rhizophora mangle',
      commonName: 'Red Mangrove',
      kingdom: 'Plantae',
      phylum: 'Tracheophyta',
      taxClass: 'Magnoliopsida',
      taxOrder: 'Malpighiales',
      family: 'Rhizophoraceae',
      genus: 'Rhizophora',
      iucnStatus: 'LC',
      habitat: 'Mangrove Estuary',
      markerGene: 'ITS2',
      referenceSequence:
        'GCGATACTTGGTGTGAATTGCAGAATCCCGTGAACCATCGAGTCTTTGAACGCAAGTTGCGCCCGAAGCCATTAGG',
      gcContent: 53.8,
      ecologicalRole:
        'Prop-root coastal stabilizer trapping estuarine sediments and serving as nursery habitat for juvenile marine teleosts.',
      imageUrl: '/src/assets/images/hero_edna_estuary_1795608904054.jpg',
    },
    {
      scientificName: 'Strongylocentrotus purpuratus',
      commonName: 'Pacific Purple Sea Urchin',
      kingdom: 'Animalia',
      phylum: 'Echinodermata',
      taxClass: 'Echinoidea',
      taxOrder: 'Camarodonta',
      family: 'Strongylocentrotidae',
      genus: 'Strongylocentrotus',
      iucnStatus: 'LC',
      habitat: 'Coastal Kelp',
      markerGene: 'COI',
      referenceSequence:
        'GGTACTCTTTATCTTATATTTGGGGCTTGAGCGGGAATAGTTGGCACTGCTTTAAGTGTTCTTATTCGAGCAGAAC',
      gcContent: 43.9,
      ecologicalRole:
        'Benthic macroalgae grazer whose population outbreaks serve as an early warning signal for trophic cascades.',
      imageUrl: '/src/assets/images/species_kelp_forest_1795608905759.jpg',
    },
    {
      scientificName: 'Carcharhinus melanopterus',
      commonName: 'Blacktip Reef Shark',
      kingdom: 'Animalia',
      phylum: 'Chordata',
      taxClass: 'Chondrichthyes',
      taxOrder: 'Carcharhiniformes',
      family: 'Carcharhinidae',
      genus: 'Carcharhinus',
      iucnStatus: 'VU',
      habitat: 'Marine Reef',
      markerGene: 'COI',
      referenceSequence:
        'GGTACTTTATATTTTATTTTTGGAGCATGAGCCGGGATGGTTGGCACAGCCTTAAGCCTTTTAATTCGTGCCGAGC',
      gcContent: 46.5,
      ecologicalRole:
        'Mobile reef-crest mesopredator regulating herbivorous fish behavior and maintaining trophic balance.',
      imageUrl: '/src/assets/images/species_coral_reef_1795608904344.jpg',
    },
    {
      scientificName: 'Synechococcus marinus',
      commonName: 'Marine Picocyanobacterium',
      kingdom: 'Bacteria',
      phylum: 'Cyanobacteria',
      taxClass: 'Cyanophyceae',
      taxOrder: 'Synechococcales',
      family: 'Synechococcaceae',
      genus: 'Synechococcus',
      iucnStatus: 'LC',
      habitat: 'Pelagic Open Ocean',
      markerGene: '16S rRNA',
      referenceSequence:
        'CCTACGGGAGGCAGCAGTGGGGAATTTTCCGCAATGGGCGAAAGCCTGACGGAGCAATACCGCGTGAGGGAGGAAG',
      gcContent: 57.9,
      ecologicalRole:
        'Ubiquitous autotrophic picoplankton responsible for a major fraction of marine primary carbon fixation.',
      imageUrl: '/src/assets/images/hero_edna_estuary_1795608904054.jpg',
    },
  ];

  await db.insert(speciesCatalog).values(speciesSeed).onConflictDoNothing();

  // Seed 3 rich public reference datasets
  const seedDatasets = [
    {
      title: 'Raja Ampat Reef Crest eDNA Transect',
      description:
        '2-liter Sterivex water filtration samples collected along 12 m depth contours across coral-mangrove transition zones.',
      sampleLocation: 'Misool Marine Reserve, Indonesia',
      biome: 'Marine Reef',
      latitude: -1.8842,
      longitude: 130.1456,
      collectionDate: '2026-09-14',
      markerGene: 'COI',
      fileFormat: 'FASTA',
      fileName: 'raja_ampat_coi_transect.fasta',
      sequences: [
        {
          sequenceHeader: 'RA_T1_001_reads=420',
          dnaSequence:
            'GGTCAACAAATCATAAAGATATTGGTACCTTATATTTTATTTTCGGTGCCTGAGCCGGAATGGTAGGCACATCTTTAAGT',
          readCount: 420,
          identifiedScientificName: 'Acropora millepora',
          identifiedCommonName: 'Staghorn Table Coral',
          kingdom: 'Animalia',
          phylum: 'Cnidaria',
          taxClass: 'Anthozoa',
          family: 'Acroporidae',
          confidenceScore: 98.6,
          iucnStatus: 'NT',
          aiRationale:
            '99.1% COI barcode identity with Acropora millepora reference haplotype; high scleractinian read signal.',
        },
        {
          sequenceHeader: 'RA_T1_002_reads=310',
          dnaSequence:
            'CACCGCGGTTATACGAGAGACCCTAGTTGATAGACCACGGCGTAAAGAGTGGTTAAGGAAAAAATCACAACTAAAGCC',
          readCount: 310,
          identifiedScientificName: 'Chromis viridis',
          identifiedCommonName: 'Blue-Green Chromis',
          kingdom: 'Animalia',
          phylum: 'Chordata',
          taxClass: 'Actinopterygii',
          family: 'Pomacentridae',
          confidenceScore: 97.4,
          iucnStatus: 'LC',
          aiRationale:
            'Strong reef damselfish amplicon match; expected commensal association with Acropora corals.',
        },
        {
          sequenceHeader: 'RA_T1_003_reads=88',
          dnaSequence:
            'GGTACTTTATATTTTATTTTTGGAGCATGAGCCGGGATGGTTGGCACAGCCTTAAGCCTTTTAATTCGTGCCGAGCTA',
          readCount: 88,
          identifiedScientificName: 'Carcharhinus melanopterus',
          identifiedCommonName: 'Blacktip Reef Shark',
          kingdom: 'Animalia',
          phylum: 'Chordata',
          taxClass: 'Chondrichthyes',
          family: 'Carcharhinidae',
          confidenceScore: 94.8,
          iucnStatus: 'VU',
          aiRationale:
            'Diagnostic elasmobranch COI motif confirming reef-crest predator presence.',
        },
        {
          sequenceHeader: 'RA_T1_004_reads=145',
          dnaSequence:
            'AAAGGTTTGGTCCTAGCCTTAATATTAATTTTTAGTAAAATTACACATGCAAGCATCCGCATCCCCGTGAAAACGCCA',
          readCount: 145,
          identifiedScientificName: 'Chelonia mydas',
          identifiedCommonName: 'Green Sea Turtle',
          kingdom: 'Animalia',
          phylum: 'Chordata',
          taxClass: 'Reptilia',
          family: 'Cheloniidae',
          confidenceScore: 96.2,
          iucnStatus: 'EN',
          aiRationale:
            'Matches Cheloniidae conserved motif; foraging signature near adjacent seagrass beds.',
        },
        {
          sequenceHeader: 'RA_T1_005_reads=264',
          dnaSequence:
            'CCTACGGGAGGCAGCAGTGGGGAATTTTCCGCAATGGGCGAAAGCCTGACGGAGCAATACCGCGTGAGGGAGGAAGGC',
          readCount: 264,
          identifiedScientificName: 'Synechococcus marinus',
          identifiedCommonName: 'Marine Picocyanobacterium',
          kingdom: 'Bacteria',
          phylum: 'Cyanobacteria',
          taxClass: 'Cyanophyceae',
          family: 'Synechococcaceae',
          confidenceScore: 95.1,
          iucnStatus: 'LC',
          aiRationale:
            'High-GC marine picoplankton signature typical of oligotrophic tropical surface water.',
        },
      ],
    },
    {
      title: 'Monterey Bay Kelp Canopy Metabarcoding',
      description:
        'Comparative surface and benthic eDNA profiles from Point Lobos giant kelp beds during autumn upwelling.',
      sampleLocation: 'Monterey Bay, California',
      biome: 'Coastal Kelp',
      latitude: 36.5194,
      longitude: -121.9512,
      collectionDate: '2026-10-03',
      markerGene: '12S MiFish',
      fileFormat: 'CSV',
      fileName: 'monterey_kelp_12s.csv',
      sequences: [
        {
          sequenceHeader: 'MB_KC_01',
          dnaSequence:
            'GTCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGACTCAAGTGGATAGACCACGGCGTAAAGGGTGGTTAGG',
          readCount: 380,
          identifiedScientificName: 'Sebastes mystinus',
          identifiedCommonName: 'Blue Rockfish',
          kingdom: 'Animalia',
          phylum: 'Chordata',
          taxClass: 'Actinopterygii',
          family: 'Sebastidae',
          confidenceScore: 98.1,
          iucnStatus: 'LC',
          aiRationale:
            'Exact 12S MiFish diagnostic match for temperate rocky-reef Sebastes.',
        },
        {
          sequenceHeader: 'MB_KC_02',
          dnaSequence:
            'CACTGCCTGCCATGGTTATTCCCTAAACTAGGATTAGATACCCTACTATGCTTAGCCCTAAACATAGATAGTTACCTA',
          readCount: 92,
          identifiedScientificName: 'Enhydra lutris',
          identifiedCommonName: 'Sea Otter',
          kingdom: 'Animalia',
          phylum: 'Chordata',
          taxClass: 'Mammalia',
          family: 'Mustelidae',
          confidenceScore: 96.7,
          iucnStatus: 'EN',
          aiRationale:
            'High-specificity marine mammal 12S fragment; confirms keystone predator presence.',
        },
        {
          sequenceHeader: 'MB_KC_03',
          dnaSequence:
            'TCGATGAAGAACGCAGCGAAATGCGATACGTATTGTGAATTGCAGAATTCAGTGAATCATCGAATCTTTGAACGCACA',
          readCount: 410,
          identifiedScientificName: 'Macrocystis pyrifera',
          identifiedCommonName: 'Giant Bladder Kelp',
          kingdom: 'Chromista',
          phylum: 'Ochrophyta',
          taxClass: 'Phaeophyceae',
          family: 'Laminariaceae',
          confidenceScore: 99.2,
          iucnStatus: 'LC',
          aiRationale:
            'Dominant canopy macroalga ITS2 signal consistent with dense kelp stand.',
        },
        {
          sequenceHeader: 'MB_KC_04',
          dnaSequence:
            'GGTACTCTTTATCTTATATTTGGGGCTTGAGCGGGAATAGTTGGCACTGCTTTAAGTGTTCTTATTCGAGCAGAACTA',
          readCount: 175,
          identifiedScientificName: 'Strongylocentrotus purpuratus',
          identifiedCommonName: 'Pacific Purple Sea Urchin',
          kingdom: 'Animalia',
          phylum: 'Echinodermata',
          taxClass: 'Echinoidea',
          family: 'Strongylocentrotidae',
          confidenceScore: 95.8,
          iucnStatus: 'LC',
          aiRationale:
            'Moderate echinoid grazing signal within balanced kelp ecosystem.',
        },
      ],
    },
    {
      title: 'Upper Cascade Alpine Watershed Assessment',
      description:
        'Stream-mouth 0.45 µm nitrocellulose filtration targeting cold-water salmonids and endangered benthic unionids.',
      sampleLocation: 'Deschutes Headwaters, Oregon',
      biome: 'Freshwater River',
      latitude: 43.9821,
      longitude: -121.7453,
      collectionDate: '2026-08-22',
      markerGene: '12S MiFish',
      fileFormat: 'FASTA',
      fileName: 'cascade_alpine_stream.fasta',
      sequences: [
        {
          sequenceHeader: 'UC_ST_01_reads=510',
          dnaSequence:
            'GCCGGTAAAACTCGTGCCAGCCACCGCGGTTATACGAGAGACCCTAGTTGATAGACTACGGCGTAAAGAGTGGTTAAA',
          readCount: 510,
          identifiedScientificName: 'Salvelinus fontinalis',
          identifiedCommonName: 'Brook Trout',
          kingdom: 'Animalia',
          phylum: 'Chordata',
          taxClass: 'Actinopterygii',
          family: 'Salmonidae',
          confidenceScore: 98.9,
          iucnStatus: 'LC',
          aiRationale:
            'Canonical salmonid 12S signature indicating healthy cold-water thermal regime.',
        },
        {
          sequenceHeader: 'UC_ST_02_reads=134',
          dnaSequence:
            'TGGTACTTTATATTTTATTTTTGGGGCTTGAGCGGGTATAGTAGGGACTGCTTTGAGAGTTTTAATTCGAACTGAACT',
          readCount: 134,
          identifiedScientificName: 'Margaritifera margaritifera',
          identifiedCommonName: 'Freshwater Pearl Mussel',
          kingdom: 'Animalia',
          phylum: 'Mollusca',
          taxClass: 'Bivalvia',
          family: 'Margaritiferidae',
          confidenceScore: 93.4,
          iucnStatus: 'EN',
          aiRationale:
            'Endangered unionid bivalve signal co-occurring with host salmonids.',
        },
      ],
    },
  ];

  for (const ds of seedDatasets) {
    const metrics = computeBiodiversityMetrics(ds.sequences);
    const [insertedDataset] = await db
      .insert(datasets)
      .values({
        userId: 'system-reference',
        title: ds.title,
        description: ds.description,
        sampleLocation: ds.sampleLocation,
        biome: ds.biome,
        latitude: ds.latitude,
        longitude: ds.longitude,
        collectionDate: ds.collectionDate,
        markerGene: ds.markerGene,
        fileFormat: ds.fileFormat,
        fileName: ds.fileName,
        totalSequences: metrics.totalSequences,
        totalReads: metrics.totalReads,
        identifiedSpeciesCount: metrics.speciesRichness,
        shannonIndex: metrics.shannonIndex,
        simpsonIndex: metrics.simpsonIndex,
        pielouEvenness: metrics.pielouEvenness,
        margalefRichness: metrics.margalefRichness,
        status: 'analyzed',
        isPublic: true,
      })
      .returning();

    const seqRows = ds.sequences.map((s) => {
      const gcCount = (s.dnaSequence.match(/[GC]/gi) || []).length;
      const gcContent = Number(((gcCount / s.dnaSequence.length) * 100).toFixed(2));
      return {
        datasetId: insertedDataset.id,
        sequenceHeader: s.sequenceHeader,
        dnaSequence: s.dnaSequence,
        readCount: s.readCount,
        gcContent,
        sequenceLength: s.dnaSequence.length,
        identifiedScientificName: s.identifiedScientificName,
        identifiedCommonName: s.identifiedCommonName,
        kingdom: s.kingdom,
        phylum: s.phylum,
        taxClass: s.taxClass,
        family: s.family,
        confidenceScore: s.confidenceScore,
        iucnStatus: s.iucnStatus,
        aiRationale: s.aiRationale,
      };
    });

    await db.insert(sequenceRecords).values(seqRows);

    await db.insert(biodiversityReports).values({
      datasetId: insertedDataset.id,
      userId: 'system-reference',
      title: `${ds.title} — Baseline Ecological Assessment`,
      executiveSummary: `Environmental DNA metabarcoding of ${ds.fileName} (${ds.markerGene}) recovered ${metrics.totalReads} quality-filtered reads across ${metrics.speciesRichness} distinct taxa, yielding a Shannon diversity index of H' = ${metrics.shannonIndex} and Simpson index of 1 - D = ${metrics.simpsonIndex}.`,
      taxonomicHighlights: `Dominant assemblages span ${metrics.phylumBreakdown.map((p) => `${p.phylum} (${p.percentage}%)`).join(', ')}. Rank-abundance distribution demonstrates balanced community evenness (Pielou J' = ${metrics.pielouEvenness}).`,
      conservationNotes: `Detection of IUCN-listed focal taxa underscores the conservation value of ${ds.sampleLocation} and supports continued non-invasive eDNA biomonitoring.`,
      methodologyNotes: `Sequences were filtered for nucleotide integrity, evaluated for GC composition, taxonomically assigned against curated ${ds.markerGene} reference motifs, and analyzed via Hurlbert rarefaction.`,
    });
  }

  const modulesSeed = [
    {
      slug: 'edna-filtration-field-protocol',
      title: 'Field Water Filtration & Sterile eDNA Capture',
      category: 'Field Protocol',
      difficulty: 'Foundational',
      readMinutes: 6,
      summary:
        'Learn how trace intracellular and extracellular DNA is captured on 0.22–0.45 µm membranes without cross-site contamination.',
      imageUrl: '/src/assets/images/lab_edna_sequencing_1795608906819.jpg',
      contentMarkdown: `### 1. Why Filtration Matters
Organisms continuously shed cellular material—mucus, scales, gametes, and fecal matter—into aquatic habitats. Environmental DNA (eDNA) persistence typically ranges from 24 hours to 14 days depending on UV exposure, temperature, and microbial activity.

### 2. Core Sterile Workflow
- **Pre-sampling decontamination**: Soak peristaltic tubing and filter housings in 10% sodium hypochlorite for 15 minutes, followed by DNA-free water rinses.
- **Volume standardization**: Filter 1.0–2.0 L per biological replicate using 0.45 µm cellulose nitrate or enclosed Sterivex capsules.
- **Field blanks**: Always process one sterile distilled-water blank at each sampling station to detect aerosol or glove contamination.
- **Preservation**: Immediately seal filters in silica desiccant or RNAlater buffer at -20 °C prior to extraction.`,
      published: true,
    },
    {
      slug: 'coi-vs-12s-mifish-barcoding',
      title: 'Selecting Barcode Markers: COI, 12S MiFish & 16S rRNA',
      category: 'Molecular Genetics',
      difficulty: 'Intermediate',
      readMinutes: 8,
      summary:
        'Compare primer taxonomic breadth, reference database coverage, and amplicon resolution across multi-kingdom surveys.',
      imageUrl: '/src/assets/images/species_coral_reef_1795608904344.jpg',
      contentMarkdown: `### 1. Cytochrome c Oxidase I (COI)
The standard metazoan DNA barcode (~313 bp mini-barcode for degraded eDNA). Excels at identifying crustaceans, mollusks, cnidarians, and benthic macroinvertebrates, though universal primers can over-amplify non-target diatoms or bacteria.

### 2. 12S rRNA (MiFish-U / Tele02)
Specifically designed for bony fishes and elasmobranchs (~170 bp). Its conserved flanking regions eliminate invertebrate bycatch and achieve species-level resolution for over 85% of coastal teleosts.

### 3. 16S rRNA & ITS2
- **16S V3–V4**: Resolves marine and freshwater microbial communities (Cyanobacteria, Proteobacteria) that drive biogeochemical cycling.
- **ITS2**: Essential for macroalgae, seagrass, and wetland angiosperm monitoring.`,
      published: true,
    },
    {
      slug: 'biodiversity-indices-explained',
      title: 'Quantifying Alpha Diversity: Shannon, Simpson & Rarefaction',
      category: 'Biostatistics',
      difficulty: 'Intermediate',
      readMinutes: 7,
      summary:
        'Interpret H′, 1 − D, Pielou evenness, and Hurlbert rarefaction curves when comparing sequencing depths across stations.',
      imageUrl: '/src/assets/images/species_kelp_forest_1795608905759.jpg',
      contentMarkdown: `### 1. Shannon-Wiener Index (H′)
Measures uncertainty in predicting the species identity of a randomly drawn read:
\`H' = -Σ p_i · ln(p_i)\`
Sensitive to both species richness and rare taxa. Values between 1.5 and 3.5 are typical in natural aquatic communities.

### 2. Gini-Simpson Index (1 − D)
Represents the probability that two reads drawn at random belong to different species:
\`1 - D = 1 - Σ p_i²\`
Weighted toward dominant taxa and bounded cleanly between 0 and 1.

### 3. Why Rarefaction Is Essential
Raw species counts increase with sequencing depth. Hurlbert rarefaction curves normalize richness to an equivalent read count so shallow and deep sequencing runs can be compared fairly.`,
      published: true,
    },
    {
      slug: 'iucn-conservation-edna-signals',
      title: 'Detecting Threatened & Keystone Taxa via eDNA Signals',
      category: 'Conservation Ecology',
      difficulty: 'Applied',
      readMinutes: 5,
      summary:
        'Translate low-abundance Endangered (EN) and Vulnerable (VU) amplicon detections into actionable marine protected area policy.',
      imageUrl: '/src/assets/images/species_freshwater_river_1795608906521.jpg',
      contentMarkdown: `### 1. Needle-in-a-Haystack Sensitivity
Traditional visual transects routinely miss cryptic, nocturnal, or low-density threatened species such as *Margaritifera margaritifera* (Freshwater Pearl Mussel) or *Carcharhinus melanopterus*. eDNA detects shed genetic traces weeks after an individual passes through a habitat.

### 2. False Positive & Negative Controls
- **Thresholding**: Verify confidence scores alongside read abundance and negative control subtraction.
- **Trophic inference**: Pair endangered consumer detections (e.g., *Enhydra lutris*) with prey and foundation species abundances to assess ecosystem resilience.`,
      published: true,
    },
  ];

  await db.insert(learningModules).values(modulesSeed).onConflictDoNothing();

  const settingsSeed = [
    {
      key: 'ai_confidence_threshold',
      value: '75',
      description: 'Minimum AI taxonomic assignment confidence percentage flagged as high-confidence.',
    },
    {
      key: 'default_marker_gene',
      value: 'COI',
      description: 'Default amplicon barcode marker pre-selected on dataset upload.',
    },
    {
      key: 'max_sequences_per_upload',
      value: '250',
      description: 'Maximum amplicon variants processed per uploaded FASTA or CSV file.',
    },
    {
      key: 'allow_public_datasets',
      value: 'true',
      description: 'Allow researchers to publish analyzed datasets to the shared Explorer catalog.',
    },
  ];

  await db.insert(appSettings).values(settingsSeed).onConflictDoNothing();
}
