export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: 'researcher' | 'student' | 'admin' | string;
  institution: string | null;
  bio: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface SpeciesRecord {
  id: number;
  scientificName: string;
  commonName: string;
  kingdom: string;
  phylum: string;
  taxClass: string;
  taxOrder: string;
  family: string;
  genus: string;
  iucnStatus: string;
  habitat: string;
  markerGene: string;
  referenceSequence: string;
  gcContent: number;
  ecologicalRole: string;
  imageUrl: string | null;
}

export interface DatasetSummary {
  id: number;
  userId: string;
  title: string;
  description: string | null;
  sampleLocation: string;
  biome: string;
  latitude: number | null;
  longitude: number | null;
  collectionDate: string;
  markerGene: string;
  fileFormat: string;
  fileName: string;
  totalSequences: number;
  totalReads: number;
  identifiedSpeciesCount: number;
  shannonIndex: number;
  simpsonIndex: number;
  pielouEvenness: number;
  margalefRichness: number;
  status: string;
  isPublic: boolean;
  createdAt: string;
}

export interface SequenceRecord {
  id: number;
  datasetId: number;
  sequenceHeader: string;
  dnaSequence: string;
  readCount: number;
  gcContent: number;
  sequenceLength: number;
  identifiedScientificName: string;
  identifiedCommonName: string;
  kingdom: string;
  phylum: string;
  taxClass: string;
  family: string;
  confidenceScore: number;
  iucnStatus: string;
  aiRationale: string | null;
}

export interface BiodiversityReport {
  id: number;
  datasetId: number;
  userId: string;
  title: string;
  executiveSummary: string;
  taxonomicHighlights: string;
  conservationNotes: string;
  methodologyNotes: string;
  createdAt: string;
}

export interface DatasetAnalytics {
  totalSequences: number;
  totalReads: number;
  speciesRichness: number;
  shannonIndex: number;
  simpsonIndex: number;
  pielouEvenness: number;
  margalefRichness: number;
  rarefactionCurve: Array<{ readsSampled: number; expectedSpecies: number }>;
  rankAbundance: Array<{
    rank: number;
    scientificName: string;
    commonName: string;
    reads: number;
    relativeAbundance: number;
    phylum: string;
    iucnStatus: string;
  }>;
  phylumBreakdown: Array<{
    phylum: string;
    reads: number;
    speciesCount: number;
    percentage: number;
  }>;
}

export interface LearningModule {
  id: number;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  readMinutes: number;
  summary: string;
  contentMarkdown: string;
  imageUrl: string | null;
}

export interface AppSetting {
  key: string;
  value: string;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}
