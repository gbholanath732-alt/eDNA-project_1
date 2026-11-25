import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import {
  appSettings,
  biodiversityReports,
  datasets,
  learningModules,
  sequenceRecords,
  speciesCatalog,
  users,
} from './src/db/schema.ts';
import { ensureSeeded } from './src/db/seed.ts';
import {
  AuthRequest,
  optionalAuth,
  requireAdmin,
  requireAuth,
} from './src/middleware/auth.ts';
import {
  computeBiodiversityMetrics,
  parseEdnaFile,
} from './src/lib/bioinformatics.ts';
import {
  explainTaxonWithGemini,
  generateBiodiversityReportWithGemini,
  identifySequencesWithGemini,
} from './src/lib/gemini.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await ensureSeeded();
    res.json({ status: 'ok', service: 'edna-explorer' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ error: 'Database initialization error' });
  }
});

// Auth & User Profile
app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  res.json({ user: req.dbUser });
});

app.patch('/api/auth/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { displayName, institution, bio } = req.body ?? {};
    if (typeof displayName === 'string' && displayName.length > 100) {
      return res.status(400).json({ error: 'Display name must be under 100 characters' });
    }
    if (typeof institution === 'string' && institution.length > 140) {
      return res.status(400).json({ error: 'Institution must be under 140 characters' });
    }
    if (typeof bio === 'string' && bio.length > 500) {
      return res.status(400).json({ error: 'Bio must be under 500 characters' });
    }

    const updated = await db
      .update(users)
      .set({
        displayName:
          typeof displayName === 'string' && displayName.trim()
            ? displayName.trim()
            : req.dbUser!.displayName,
        institution: typeof institution === 'string' ? institution.trim() : req.dbUser!.institution,
        bio: typeof bio === 'string' ? bio.trim() : req.dbUser!.bio,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, req.dbUser!.uid))
      .returning();

    res.json({ user: updated[0] });
  } catch (error) {
    console.error('Profile update failed:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Species Explorer
app.get('/api/species', async (req, res) => {
  try {
    await ensureSeeded();
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const habitat = typeof req.query.habitat === 'string' ? req.query.habitat.trim() : '';
    const marker = typeof req.query.marker === 'string' ? req.query.marker.trim() : '';
    const iucn = typeof req.query.iucn === 'string' ? req.query.iucn.trim() : '';

    const conditions = [];
    if (q) {
      conditions.push(
        or(
          ilike(speciesCatalog.scientificName, `%${q}%`),
          ilike(speciesCatalog.commonName, `%${q}%`),
          ilike(speciesCatalog.phylum, `%${q}%`),
          ilike(speciesCatalog.family, `%${q}%`)
        )
      );
    }
    if (habitat && habitat !== 'All') {
      conditions.push(eq(speciesCatalog.habitat, habitat));
    }
    if (marker && marker !== 'All') {
      conditions.push(eq(speciesCatalog.markerGene, marker));
    }
    if (iucn && iucn !== 'All') {
      conditions.push(eq(speciesCatalog.iucnStatus, iucn));
    }

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(speciesCatalog)
            .where(and(...conditions))
            .orderBy(speciesCatalog.scientificName)
        : await db.select().from(speciesCatalog).orderBy(speciesCatalog.scientificName);

    res.json({ species: rows });
  } catch (error) {
    console.error('Failed to query species catalog:', error);
    res.status(500).json({ error: 'Failed to load species catalog' });
  }
});

app.post('/api/species/:id/ai-brief', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid species ID' });
    }

    const rows = await db
      .select()
      .from(speciesCatalog)
      .where(eq(speciesCatalog.id, id))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Species not found' });
    }

    const sp = rows[0];
    const brief = await explainTaxonWithGemini({
      scientificName: sp.scientificName,
      commonName: sp.commonName,
      habitat: sp.habitat,
      markerGene: sp.markerGene,
      iucnStatus: sp.iucnStatus,
    });

    res.json({ brief });
  } catch (error: any) {
    console.error('AI species brief error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate AI taxonomic brief',
    });
  }
});

// Datasets & Analytics
app.get('/api/datasets', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const uid = req.dbUser?.uid;
    const isAdmin = req.dbUser?.role === 'admin';

    const rows = isAdmin
      ? await db.select().from(datasets).orderBy(desc(datasets.createdAt))
      : uid
        ? await db
            .select()
            .from(datasets)
            .where(or(eq(datasets.isPublic, true), eq(datasets.userId, uid)))
            .orderBy(desc(datasets.createdAt))
        : await db
            .select()
            .from(datasets)
            .where(eq(datasets.isPublic, true))
            .orderBy(desc(datasets.createdAt));

    const safeRows = rows.map(({ rawFileContent: _raw, ...rest }) => rest);
    res.json({ datasets: safeRows });
  } catch (error) {
    console.error('Failed to load datasets:', error);
    res.status(500).json({ error: 'Failed to load datasets' });
  }
});

app.get('/api/datasets/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid dataset ID' });
    }

    const rows = await db.select().from(datasets).where(eq(datasets.id, id)).limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const ds = rows[0];
    const canView =
      ds.isPublic ||
      req.dbUser?.role === 'admin' ||
      (req.dbUser && ds.userId === req.dbUser.uid);

    if (!canView) {
      return res.status(403).json({ error: 'You do not have access to this dataset' });
    }

    const sequences = await db
      .select()
      .from(sequenceRecords)
      .where(eq(sequenceRecords.datasetId, id))
      .orderBy(desc(sequenceRecords.readCount));

    const reports = await db
      .select()
      .from(biodiversityReports)
      .where(eq(biodiversityReports.datasetId, id))
      .orderBy(desc(biodiversityReports.createdAt));

    const analytics = computeBiodiversityMetrics(sequences);
    const { rawFileContent: _raw, ...safeDataset } = ds;

    res.json({
      dataset: safeDataset,
      sequences,
      reports,
      analytics,
    });
  } catch (error) {
    console.error('Failed to fetch dataset detail:', error);
    res.status(500).json({ error: 'Failed to load dataset details' });
  }
});

app.post('/api/datasets/upload', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const {
      title,
      description,
      sampleLocation,
      biome,
      latitude,
      longitude,
      collectionDate,
      markerGene,
      fileFormat,
      fileName,
      fileContent,
      isPublic,
    } = req.body ?? {};

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ error: 'Dataset title must be at least 3 characters' });
    }
    if (!sampleLocation || typeof sampleLocation !== 'string') {
      return res.status(400).json({ error: 'Sample location is required' });
    }
    if (!biome || typeof biome !== 'string') {
      return res.status(400).json({ error: 'Biome is required' });
    }
    if (!markerGene || typeof markerGene !== 'string') {
      return res.status(400).json({ error: 'Marker gene is required' });
    }
    if (!fileContent || typeof fileContent !== 'string') {
      return res.status(400).json({ error: 'Dataset file content is required' });
    }

    const resolvedFormat: 'FASTA' | 'CSV' =
      fileFormat === 'CSV' ? 'CSV' : 'FASTA';

    const parsedSequences = parseEdnaFile(fileContent, resolvedFormat);
    const catalogRows = await db.select().from(speciesCatalog);

    const aiResults = await identifySequencesWithGemini(
      parsedSequences,
      markerGene,
      biome,
      catalogRows
    );

    const resultMap = new Map(
      aiResults.map((r) => [r.sequenceHeader.trim(), r])
    );

    const enrichedRecords = parsedSequences.map((seq, idx) => {
      const match = resultMap.get(seq.sequenceHeader.trim()) || aiResults[idx];
      return {
        sequenceHeader: seq.sequenceHeader,
        dnaSequence: seq.dnaSequence,
        readCount: seq.readCount,
        gcContent: seq.gcContent,
        sequenceLength: seq.sequenceLength,
        identifiedScientificName:
          match?.identifiedScientificName || 'Unassigned Eukaryota',
        identifiedCommonName: match?.identifiedCommonName || 'Unclassified Taxon',
        kingdom: match?.kingdom || 'Eukaryota',
        phylum: match?.phylum || 'Unknown',
        taxClass: match?.taxClass || 'Unknown',
        family: match?.family || 'Unknown',
        confidenceScore: Math.min(
          99.9,
          Math.max(40, Number(match?.confidenceScore ?? 82))
        ),
        iucnStatus: match?.iucnStatus || 'DD',
        aiRationale:
          match?.aiRationale ||
          `Assigned via Gemini ${markerGene} amplicon motif comparison.`,
      };
    });

    const metrics = computeBiodiversityMetrics(enrichedRecords);

    const [createdDataset] = await db
      .insert(datasets)
      .values({
        userId: req.dbUser!.uid,
        title: title.trim().slice(0, 140),
        description: typeof description === 'string' ? description.trim().slice(0, 600) : null,
        sampleLocation: sampleLocation.trim().slice(0, 140),
        biome: biome.trim().slice(0, 80),
        latitude: typeof latitude === 'number' ? latitude : null,
        longitude: typeof longitude === 'number' ? longitude : null,
        collectionDate:
          typeof collectionDate === 'string' && collectionDate.trim()
            ? collectionDate.trim().slice(0, 32)
            : new Date().toISOString().slice(0, 10),
        markerGene: markerGene.trim().slice(0, 40),
        fileFormat: resolvedFormat,
        fileName:
          typeof fileName === 'string' && fileName.trim()
            ? fileName.trim().slice(0, 120)
            : `dataset.${resolvedFormat.toLowerCase()}`,
        rawFileContent: fileContent.slice(0, 250000),
        totalSequences: metrics.totalSequences,
        totalReads: metrics.totalReads,
        identifiedSpeciesCount: metrics.speciesRichness,
        shannonIndex: metrics.shannonIndex,
        simpsonIndex: metrics.simpsonIndex,
        pielouEvenness: metrics.pielouEvenness,
        margalefRichness: metrics.margalefRichness,
        status: 'analyzed',
        isPublic: isPublic !== false,
      })
      .returning();

    await db.insert(sequenceRecords).values(
      enrichedRecords.map((rec) => ({
        datasetId: createdDataset.id,
        ...rec,
      }))
    );

    const { rawFileContent: _raw, ...safeDataset } = createdDataset;
    res.status(201).json({
      dataset: safeDataset,
      analytics: metrics,
    });
  } catch (error: any) {
    console.error('Dataset upload & analysis error:', error);
    res.status(400).json({
      error: error?.message || 'Failed to parse and analyze eDNA dataset',
    });
  }
});

app.post('/api/datasets/:id/report', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid dataset ID' });
    }

    const rows = await db.select().from(datasets).where(eq(datasets.id, id)).limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }
    const ds = rows[0];

    if (
      !ds.isPublic &&
      ds.userId !== req.dbUser!.uid &&
      req.dbUser!.role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Not authorized to generate report for this dataset' });
    }

    const sequences = await db
      .select()
      .from(sequenceRecords)
      .where(eq(sequenceRecords.datasetId, id));

    const taxaSummary = sequences.map((s) => ({
      scientificName: s.identifiedScientificName,
      commonName: s.identifiedCommonName,
      phylum: s.phylum,
      reads: s.readCount,
      iucnStatus: s.iucnStatus,
      confidence: s.confidenceScore,
    }));

    const generated = await generateBiodiversityReportWithGemini({
      datasetTitle: ds.title,
      sampleLocation: ds.sampleLocation,
      biome: ds.biome,
      markerGene: ds.markerGene,
      collectionDate: ds.collectionDate,
      totalSequences: ds.totalSequences,
      totalReads: ds.totalReads,
      speciesRichness: ds.identifiedSpeciesCount,
      shannonIndex: ds.shannonIndex,
      simpsonIndex: ds.simpsonIndex,
      pielouEvenness: ds.pielouEvenness,
      margalefRichness: ds.margalefRichness,
      taxaSummary,
    });

    const [savedReport] = await db
      .insert(biodiversityReports)
      .values({
        datasetId: id,
        userId: req.dbUser!.uid,
        title: generated.title,
        executiveSummary: generated.executiveSummary,
        taxonomicHighlights: generated.taxonomicHighlights,
        conservationNotes: generated.conservationNotes,
        methodologyNotes: generated.methodologyNotes,
      })
      .returning();

    res.status(201).json({ report: savedReport });
  } catch (error: any) {
    console.error('Report generation error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate AI biodiversity report',
    });
  }
});

app.delete('/api/datasets/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid dataset ID' });
    }

    const rows = await db.select().from(datasets).where(eq(datasets.id, id)).limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const ds = rows[0];
    if (ds.userId !== req.dbUser!.uid && req.dbUser!.role !== 'admin') {
      return res.status(403).json({ error: 'Only the dataset owner or an admin can delete it' });
    }

    await db.delete(datasets).where(eq(datasets.id, id));
    res.json({ deleted: true });
  } catch (error) {
    console.error('Delete dataset failed:', error);
    res.status(500).json({ error: 'Failed to delete dataset' });
  }
});

// Learning Modules
app.get('/api/learning', async (_req, res) => {
  try {
    await ensureSeeded();
    const modules = await db
      .select()
      .from(learningModules)
      .where(eq(learningModules.published, true))
      .orderBy(learningModules.id);
    res.json({ modules });
  } catch (error) {
    console.error('Failed to load learning modules:', error);
    res.status(500).json({ error: 'Failed to load learning modules' });
  }
});

// Hidden Admin Dashboard APIs
app.get(
  '/api/admin/overview',
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res) => {
    try {
      await ensureSeeded();
      const [userCountRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users);
      const [datasetCountRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(datasets);
      const [sequenceCountRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(sequenceRecords);
      const [speciesCountRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(speciesCatalog);
      const [reportCountRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(biodiversityReports);

      const allDatasets = await db
        .select()
        .from(datasets)
        .orderBy(desc(datasets.createdAt));

      const biomeCounts = new Map<string, number>();
      for (const d of allDatasets) {
        biomeCounts.set(d.biome, (biomeCounts.get(d.biome) || 0) + 1);
      }

      res.json({
        stats: {
          users: userCountRow.count,
          datasets: datasetCountRow.count,
          sequences: sequenceCountRow.count,
          speciesCatalog: speciesCountRow.count,
          reports: reportCountRow.count,
        },
        biomeBreakdown: Array.from(biomeCounts.entries()).map(([biome, count]) => ({
          biome,
          count,
        })),
      });
    } catch (error) {
      console.error('Admin overview failed:', error);
      res.status(500).json({ error: 'Failed to fetch admin overview' });
    }
  }
);

app.get(
  '/api/admin/users',
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res) => {
    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      res.json({ users: allUsers });
    } catch (error) {
      console.error('Admin users fetch failed:', error);
      res.status(500).json({ error: 'Failed to load users' });
    }
  }
);

app.patch(
  '/api/admin/users/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      const { role, isActive } = req.body ?? {};
      const validRoles = ['researcher', 'student', 'admin'];

      const updates: Partial<{ role: string; isActive: boolean; updatedAt: Date }> = {
        updatedAt: new Date(),
      };

      if (typeof role === 'string') {
        if (!validRoles.includes(role)) {
          return res.status(400).json({ error: 'Invalid role' });
        }
        updates.role = role;
      }

      if (typeof isActive === 'boolean') {
        updates.isActive = isActive;
      }

      const updated = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: updated[0] });
    } catch (error) {
      console.error('Admin user update failed:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

app.get(
  '/api/admin/datasets',
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res) => {
    try {
      const rows = await db.select().from(datasets).orderBy(desc(datasets.createdAt));
      const safeRows = rows.map(({ rawFileContent: _raw, ...rest }) => rest);
      res.json({ datasets: safeRows });
    } catch (error) {
      console.error('Admin datasets failed:', error);
      res.status(500).json({ error: 'Failed to load datasets' });
    }
  }
);

app.patch(
  '/api/admin/datasets/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid dataset ID' });
      }
      const { isPublic, status } = req.body ?? {};
      const updates: Partial<{ isPublic: boolean; status: string; updatedAt: Date }> = {
        updatedAt: new Date(),
      };
      if (typeof isPublic === 'boolean') updates.isPublic = isPublic;
      if (typeof status === 'string' && ['pending', 'analyzed', 'archived'].includes(status)) {
        updates.status = status;
      }
      const updated = await db
        .update(datasets)
        .set(updates)
        .where(eq(datasets.id, id))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: 'Dataset not found' });
      }
      const { rawFileContent: _raw, ...safe } = updated[0];
      res.json({ dataset: safe });
    } catch (error) {
      console.error('Admin dataset update failed:', error);
      res.status(500).json({ error: 'Failed to update dataset' });
    }
  }
);

app.post(
  '/api/admin/species',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const {
        scientificName,
        commonName,
        kingdom,
        phylum,
        taxClass,
        taxOrder,
        family,
        genus,
        iucnStatus,
        habitat,
        markerGene,
        referenceSequence,
        ecologicalRole,
      } = req.body ?? {};

      if (!scientificName || !commonName || !phylum || !referenceSequence) {
        return res.status(400).json({ error: 'Missing required taxonomy fields' });
      }

      const cleanSeq = String(referenceSequence).toUpperCase().replace(/[^ACGTN]/g, '');
      const gcCount = (cleanSeq.match(/[GC]/g) || []).length;
      const gcContent =
        cleanSeq.length > 0 ? Number(((gcCount / cleanSeq.length) * 100).toFixed(2)) : 50;

      const [created] = await db
        .insert(speciesCatalog)
        .values({
          scientificName: String(scientificName).trim(),
          commonName: String(commonName).trim(),
          kingdom: String(kingdom || 'Animalia').trim(),
          phylum: String(phylum).trim(),
          taxClass: String(taxClass || 'Actinopterygii').trim(),
          taxOrder: String(taxOrder || 'Perciformes').trim(),
          family: String(family || 'Unknown').trim(),
          genus: String(genus || String(scientificName).split(' ')[0]).trim(),
          iucnStatus: String(iucnStatus || 'LC').trim(),
          habitat: String(habitat || 'Marine Reef').trim(),
          markerGene: String(markerGene || 'COI').trim(),
          referenceSequence: cleanSeq || 'GGTCAACAAATCATAAAGATATTGG',
          gcContent,
          ecologicalRole: String(
            ecologicalRole || 'Cataloged reference taxon for eDNA metabarcoding.'
          ).trim(),
          imageUrl: '/src/assets/images/species_coral_reef_1795608904344.jpg',
        })
        .returning();

      res.status(201).json({ species: created });
    } catch (error: any) {
      console.error('Add species failed:', error);
      res.status(400).json({ error: error?.message || 'Failed to add species record' });
    }
  }
);

app.delete(
  '/api/admin/species/:id',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid species ID' });
      }
      await db.delete(speciesCatalog).where(eq(speciesCatalog.id, id));
      res.json({ deleted: true });
    } catch (error) {
      console.error('Delete species failed:', error);
      res.status(500).json({ error: 'Failed to delete species record' });
    }
  }
);

app.get(
  '/api/admin/settings',
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res) => {
    try {
      await ensureSeeded();
      const rows = await db.select().from(appSettings).orderBy(appSettings.key);
      res.json({ settings: rows });
    } catch (error) {
      console.error('Load settings failed:', error);
      res.status(500).json({ error: 'Failed to load settings' });
    }
  }
);

app.put(
  '/api/admin/settings',
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { key, value } = req.body ?? {};
      if (!key || typeof key !== 'string' || typeof value !== 'string') {
        return res.status(400).json({ error: 'Key and string value are required' });
      }
      const updated = await db
        .update(appSettings)
        .set({
          value: value.trim().slice(0, 200),
          updatedBy: req.dbUser!.email,
          updatedAt: new Date(),
        })
        .where(eq(appSettings.key, key))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: 'Setting key not found' });
      }
      res.json({ setting: updated[0] });
    } catch (error) {
      console.error('Update setting failed:', error);
      res.status(500).json({ error: 'Failed to update setting' });
    }
  }
);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`eDNA Explorer server listening on port ${PORT}`);
  });
}

startServer();
