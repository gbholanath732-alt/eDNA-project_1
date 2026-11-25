import { GoogleGenAI, Type } from '@google/genai';

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface ParsedSequenceInput {
  sequenceHeader: string;
  dnaSequence: string;
  readCount: number;
  gcContent: number;
  sequenceLength: number;
}

export interface IdentifiedSequenceResult {
  sequenceHeader: string;
  identifiedScientificName: string;
  identifiedCommonName: string;
  kingdom: string;
  phylum: string;
  taxClass: string;
  family: string;
  confidenceScore: number;
  iucnStatus: string;
  aiRationale: string;
}

export async function identifySequencesWithGemini(
  sequences: ParsedSequenceInput[],
  markerGene: string,
  biome: string,
  catalogHints: Array<{
    scientificName: string;
    commonName: string;
    kingdom: string;
    phylum: string;
    taxClass: string;
    family: string;
    iucnStatus: string;
    markerGene: string;
    referenceSequence: string;
  }>
): Promise<IdentifiedSequenceResult[]> {
  const ai = getAiClient();

  const batch = sequences.slice(0, 40);
  const catalogContext = catalogHints
    .map(
      (s) =>
        `${s.scientificName} (${s.commonName}) | ${s.kingdom}/${s.phylum}/${s.taxClass}/${s.family} | IUCN:${s.iucnStatus} | Marker:${s.markerGene} | Ref:${s.referenceSequence.slice(0, 36)}`
    )
    .join('\n');

  const sequenceList = batch
    .map(
      (seq, idx) =>
        `[${idx + 1}] Header: ${seq.sequenceHeader} | Reads: ${seq.readCount} | Len: ${seq.sequenceLength}bp | GC: ${seq.gcContent.toFixed(1)}% | Seq: ${seq.dnaSequence.slice(0, 120)}`
    )
    .join('\n');

  const prompt = `You are an expert molecular ecologist and taxonomic bioinformatician specializing in environmental DNA (eDNA) metabarcoding (${markerGene} marker gene) in ${biome} ecosystems.

Analyze the following eDNA sequence amplicons and assign the most scientifically plausible taxonomic identification based on header hints, nucleotide motifs, GC content, marker gene (${markerGene}), and biome (${biome}). When a sequence closely matches or aligns with a reference taxon below, prioritize that accurate taxonomy; otherwise assign a realistic, valid taxon appropriate to the biome and marker.

Reference Taxa Catalog:
${catalogContext}

Input eDNA Sequences:
${sequenceList}

Return a JSON array with one object per input sequence in exact order, matching the sequenceHeader verbatim.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'Respond strictly with valid JSON conforming to the schema. Ensure confidenceScore is between 55 and 99.8, and iucnStatus is one of LC, NT, VU, EN, CR, DD.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sequenceHeader: { type: Type.STRING },
            identifiedScientificName: { type: Type.STRING },
            identifiedCommonName: { type: Type.STRING },
            kingdom: { type: Type.STRING },
            phylum: { type: Type.STRING },
            taxClass: { type: Type.STRING },
            family: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            iucnStatus: { type: Type.STRING },
            aiRationale: { type: Type.STRING },
          },
          required: [
            'sequenceHeader',
            'identifiedScientificName',
            'identifiedCommonName',
            'kingdom',
            'phylum',
            'taxClass',
            'family',
            'confidenceScore',
            'iucnStatus',
            'aiRationale',
          ],
        },
      },
    },
  });

  const rawText = (response.text ?? '[]').trim();
  const parsed = JSON.parse(rawText) as IdentifiedSequenceResult[];
  return parsed;
}

export interface ReportGenerationResult {
  title: string;
  executiveSummary: string;
  taxonomicHighlights: string;
  conservationNotes: string;
  methodologyNotes: string;
}

export async function generateBiodiversityReportWithGemini(params: {
  datasetTitle: string;
  sampleLocation: string;
  biome: string;
  markerGene: string;
  collectionDate: string;
  totalSequences: number;
  totalReads: number;
  speciesRichness: number;
  shannonIndex: number;
  simpsonIndex: number;
  pielouEvenness: number;
  margalefRichness: number;
  taxaSummary: Array<{
    scientificName: string;
    commonName: string;
    phylum: string;
    reads: number;
    iucnStatus: string;
    confidence: number;
  }>;
}): Promise<ReportGenerationResult> {
  const ai = getAiClient();

  const taxaText = params.taxaSummary
    .slice(0, 20)
    .map(
      (t) =>
        `- ${t.scientificName} (${t.commonName}, ${t.phylum}): ${t.reads} reads, IUCN ${t.iucnStatus}, confidence ${t.confidence.toFixed(1)}%`
    )
    .join('\n');

  const prompt = `Generate a rigorous peer-review-grade environmental DNA (eDNA) biodiversity assessment report for the following dataset:

Dataset: ${params.datasetTitle}
Location: ${params.sampleLocation} (${params.biome})
Collection Date: ${params.collectionDate}
Target Marker Gene: ${params.markerGene}
Total Amplicon Variants: ${params.totalSequences}
Total Sequencing Reads: ${params.totalReads}
Observed Species Richness (S): ${params.speciesRichness}
Shannon-Wiener Diversity Index (H'): ${params.shannonIndex.toFixed(3)}
Simpson Diversity Index (1 - D): ${params.simpsonIndex.toFixed(3)}
Pielou's Evenness (J'): ${params.pielouEvenness.toFixed(3)}
Margalef's Richness Index (d): ${params.margalefRichness.toFixed(3)}

Identified Taxa Breakdown:
${taxaText}

Provide structured sections with precise ecological interpretation, citing exact metrics from the dataset.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are a senior conservation geneticist writing formal scientific eDNA monitoring reports. Keep prose clear, quantitative, and free of hype.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          executiveSummary: { type: Type.STRING },
          taxonomicHighlights: { type: Type.STRING },
          conservationNotes: { type: Type.STRING },
          methodologyNotes: { type: Type.STRING },
        },
        required: [
          'title',
          'executiveSummary',
          'taxonomicHighlights',
          'conservationNotes',
          'methodologyNotes',
        ],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  return JSON.parse(rawText) as ReportGenerationResult;
}

export async function explainTaxonWithGemini(params: {
  scientificName: string;
  commonName: string;
  habitat: string;
  markerGene: string;
  iucnStatus: string;
}): Promise<{
  ecologicalSignificance: string;
  ednaDetectionNotes: string;
  conservationContext: string;
}> {
  const ai = getAiClient();

  const prompt = `Provide a concise, authoritative scientific brief on ${params.scientificName} (${params.commonName}) in the context of eDNA biodiversity monitoring.
Habitat: ${params.habitat}
Primary Barcode Marker: ${params.markerGene}
IUCN Red List Status: ${params.iucnStatus}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'Provide factual marine/freshwater biological and eDNA metabarcoding notes in crisp academic prose.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ecologicalSignificance: { type: Type.STRING },
          ednaDetectionNotes: { type: Type.STRING },
          conservationContext: { type: Type.STRING },
        },
        required: [
          'ecologicalSignificance',
          'ednaDetectionNotes',
          'conservationContext',
        ],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  return JSON.parse(rawText);
}
