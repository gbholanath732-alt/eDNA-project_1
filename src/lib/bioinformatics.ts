export interface RawParsedSequence {
  sequenceHeader: string;
  dnaSequence: string;
  readCount: number;
  gcContent: number;
  sequenceLength: number;
}

export function calculateGcContent(seq: string): {
  gcContent: number;
  cleanSeq: string;
} {
  const cleanSeq = seq.toUpperCase().replace(/[^ACGTN]/g, '');
  if (cleanSeq.length === 0) {
    return { gcContent: 0, cleanSeq: '' };
  }
  let gc = 0;
  let atgc = 0;
  for (let i = 0; i < cleanSeq.length; i++) {
    const ch = cleanSeq[i];
    if (ch === 'G' || ch === 'C') {
      gc++;
      atgc++;
    } else if (ch === 'A' || ch === 'T') {
      atgc++;
    }
  }
  const gcContent = atgc > 0 ? (gc / atgc) * 100 : 0;
  return { gcContent: Number(gcContent.toFixed(2)), cleanSeq };
}

export function parseEdnaFile(
  content: string,
  format: 'FASTA' | 'CSV'
): RawParsedSequence[] {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Uploaded file is empty.');
  }

  const results: RawParsedSequence[] = [];

  if (format === 'FASTA' || trimmed.startsWith('>')) {
    const lines = trimmed.split(/\r?\n/);
    let currentHeader = '';
    let currentSeqParts: string[] = [];

    const flush = () => {
      if (!currentHeader) return;
      const joined = currentSeqParts.join('');
      const { gcContent, cleanSeq } = calculateGcContent(joined);
      if (cleanSeq.length >= 12) {
        const readMatch = currentHeader.match(/(?:reads|size|count)[=:_](\d+)/i);
        const readCount = readMatch ? Math.max(1, parseInt(readMatch[1], 10)) : 45;
        results.push({
          sequenceHeader: currentHeader.slice(0, 140),
          dnaSequence: cleanSeq.slice(0, 1200),
          readCount,
          gcContent,
          sequenceLength: cleanSeq.length,
        });
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith('>')) {
        flush();
        currentHeader = line.slice(1).trim() || `Seq_${results.length + 1}`;
        currentSeqParts = [];
      } else {
        currentSeqParts.push(line);
      }
    }
    flush();
  } else {
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV must include a header row and at least one sequence row.');
    }

    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

    const headerIdx = headers.findIndex((h) =>
      ['header', 'id', 'sequence_id', 'sample_id', 'amplicon_id', 'name'].includes(h)
    );
    const seqIdx = headers.findIndex((h) =>
      ['sequence', 'dna_sequence', 'dna', 'seq', 'amplicon'].includes(h)
    );
    const readsIdx = headers.findIndex((h) =>
      ['reads', 'read_count', 'count', 'abundance'].includes(h)
    );

    const resolvedHeaderIdx = headerIdx >= 0 ? headerIdx : 0;
    const resolvedSeqIdx = seqIdx >= 0 ? seqIdx : 1;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const rawSeq = cols[resolvedSeqIdx] || '';
      const { gcContent, cleanSeq } = calculateGcContent(rawSeq);
      if (cleanSeq.length < 12) continue;
      const readCount =
        readsIdx >= 0 && cols[readsIdx] && !Number.isNaN(Number(cols[readsIdx]))
          ? Math.max(1, Math.round(Number(cols[readsIdx])))
          : 50;

      results.push({
        sequenceHeader: (cols[resolvedHeaderIdx] || `CSV_Amplicon_${i}`).slice(0, 140),
        dnaSequence: cleanSeq.slice(0, 1200),
        readCount,
        gcContent,
        sequenceLength: cleanSeq.length,
      });
    }
  }

  if (results.length === 0) {
    throw new Error(
      'No valid DNA sequences (>= 12 bp of A/C/G/T/N) were found in the uploaded file.'
    );
  }

  return results;
}

export interface BiodiversityMetrics {
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

function logComb(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  if (k === 0 || k === n) return 0;
  let res = 0;
  const limit = Math.min(k, n - k);
  for (let i = 0; i < limit; i++) {
    res += Math.log(n - i) - Math.log(i + 1);
  }
  return res;
}

export function computeBiodiversityMetrics(
  records: Array<{
    identifiedScientificName: string;
    identifiedCommonName: string;
    phylum: string;
    readCount: number;
    iucnStatus: string;
  }>
): BiodiversityMetrics {
  const speciesMap = new Map<
    string,
    {
      scientificName: string;
      commonName: string;
      phylum: string;
      reads: number;
      iucnStatus: string;
    }
  >();

  let totalReads = 0;

  for (const r of records) {
    const reads = Math.max(1, r.readCount);
    totalReads += reads;
    const key = r.identifiedScientificName;
    const existing = speciesMap.get(key);
    if (existing) {
      existing.reads += reads;
    } else {
      speciesMap.set(key, {
        scientificName: r.identifiedScientificName,
        commonName: r.identifiedCommonName,
        phylum: r.phylum,
        reads,
        iucnStatus: r.iucnStatus,
      });
    }
  }

  const speciesList = Array.from(speciesMap.values()).sort((a, b) => b.reads - a.reads);
  const S = speciesList.length;
  const N = totalReads;

  let shannon = 0;
  let simpsonSum = 0;

  for (const sp of speciesList) {
    const p = sp.reads / N;
    if (p > 0) {
      shannon -= p * Math.log(p);
      simpsonSum += p * p;
    }
  }

  const simpson = N > 0 ? 1 - simpsonSum : 0;
  const pielou = S > 1 ? shannon / Math.log(S) : S === 1 ? 1 : 0;
  const margalef = N > 1 ? (S - 1) / Math.log(N) : 0;

  // Rarefaction curve via Hurlbert expected species richness
  const steps = 10;
  const rarefactionCurve: Array<{ readsSampled: number; expectedSpecies: number }> = [];
  if (N > 0 && S > 0) {
    for (let i = 0; i <= steps; i++) {
      const m = Math.max(1, Math.round((N * i) / steps));
      if (i === 0) {
        rarefactionCurve.push({ readsSampled: 0, expectedSpecies: 0 });
        continue;
      }
      if (m >= N) {
        rarefactionCurve.push({ readsSampled: N, expectedSpecies: S });
        continue;
      }
      const totalLog = logComb(N, m);
      let expected = 0;
      for (const sp of speciesList) {
        if (N - sp.reads >= m) {
          const probAbsent = Math.exp(logComb(N - sp.reads, m) - totalLog);
          expected += 1 - probAbsent;
        } else {
          expected += 1;
        }
      }
      rarefactionCurve.push({
        readsSampled: m,
        expectedSpecies: Number(expected.toFixed(2)),
      });
    }
  }

  const rankAbundance = speciesList.map((sp, idx) => ({
    rank: idx + 1,
    scientificName: sp.scientificName,
    commonName: sp.commonName,
    reads: sp.reads,
    relativeAbundance: Number(((sp.reads / N) * 100).toFixed(2)),
    phylum: sp.phylum,
    iucnStatus: sp.iucnStatus,
  }));

  const phylumMap = new Map<string, { reads: number; species: Set<string> }>();
  for (const sp of speciesList) {
    const entry = phylumMap.get(sp.phylum) || { reads: 0, species: new Set() };
    entry.reads += sp.reads;
    entry.species.add(sp.scientificName);
    phylumMap.set(sp.phylum, entry);
  }

  const phylumBreakdown = Array.from(phylumMap.entries())
    .map(([phylum, val]) => ({
      phylum,
      reads: val.reads,
      speciesCount: val.species.size,
      percentage: Number(((val.reads / N) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.reads - a.reads);

  return {
    totalSequences: records.length,
    totalReads: N,
    speciesRichness: S,
    shannonIndex: Number(shannon.toFixed(3)),
    simpsonIndex: Number(simpson.toFixed(3)),
    pielouEvenness: Number(pielou.toFixed(3)),
    margalefRichness: Number(margalef.toFixed(3)),
    rarefactionCurve,
    rankAbundance,
    phylumBreakdown,
  };
}
