import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('researcher'),
  institution: text('institution'),
  bio: text('bio'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const speciesCatalog = pgTable('species_catalog', {
  id: serial('id').primaryKey(),
  scientificName: text('scientific_name').notNull().unique(),
  commonName: text('common_name').notNull(),
  kingdom: text('kingdom').notNull(),
  phylum: text('phylum').notNull(),
  taxClass: text('tax_class').notNull(),
  taxOrder: text('tax_order').notNull(),
  family: text('family').notNull(),
  genus: text('genus').notNull(),
  iucnStatus: text('iucn_status').notNull().default('LC'),
  habitat: text('habitat').notNull(),
  markerGene: text('marker_gene').notNull(),
  referenceSequence: text('reference_sequence').notNull(),
  gcContent: real('gc_content').notNull(),
  ecologicalRole: text('ecological_role').notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const datasets = pgTable('datasets', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  sampleLocation: text('sample_location').notNull(),
  biome: text('biome').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  collectionDate: text('collection_date').notNull(),
  markerGene: text('marker_gene').notNull(),
  fileFormat: text('file_format').notNull(),
  fileName: text('file_name').notNull(),
  rawFileContent: text('raw_file_content'),
  totalSequences: integer('total_sequences').notNull().default(0),
  totalReads: integer('total_reads').notNull().default(0),
  identifiedSpeciesCount: integer('identified_species_count').notNull().default(0),
  shannonIndex: real('shannon_index').notNull().default(0),
  simpsonIndex: real('simpson_index').notNull().default(0),
  pielouEvenness: real('pielou_evenness').notNull().default(0),
  margalefRichness: real('margalef_richness').notNull().default(0),
  status: text('status').notNull().default('pending'),
  isPublic: boolean('is_public').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sequenceRecords = pgTable('sequence_records', {
  id: serial('id').primaryKey(),
  datasetId: integer('dataset_id')
    .references(() => datasets.id, { onDelete: 'cascade' })
    .notNull(),
  sequenceHeader: text('sequence_header').notNull(),
  dnaSequence: text('dna_sequence').notNull(),
  readCount: integer('read_count').notNull().default(1),
  gcContent: real('gc_content').notNull(),
  sequenceLength: integer('sequence_length').notNull(),
  identifiedScientificName: text('identified_scientific_name').notNull(),
  identifiedCommonName: text('identified_common_name').notNull(),
  kingdom: text('kingdom').notNull(),
  phylum: text('phylum').notNull(),
  taxClass: text('tax_class').notNull(),
  family: text('family').notNull(),
  confidenceScore: real('confidence_score').notNull(),
  iucnStatus: text('iucn_status').notNull().default('LC'),
  aiRationale: text('ai_rationale'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const biodiversityReports = pgTable('biodiversity_reports', {
  id: serial('id').primaryKey(),
  datasetId: integer('dataset_id')
    .references(() => datasets.id, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  executiveSummary: text('executive_summary').notNull(),
  taxonomicHighlights: text('taxonomic_highlights').notNull(),
  conservationNotes: text('conservation_notes').notNull(),
  methodologyNotes: text('methodology_notes').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const learningModules = pgTable('learning_modules', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  difficulty: text('difficulty').notNull(),
  readMinutes: integer('read_minutes').notNull(),
  summary: text('summary').notNull(),
  contentMarkdown: text('content_markdown').notNull(),
  imageUrl: text('image_url'),
  published: boolean('published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedBy: text('updated_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const datasetsRelations = relations(datasets, ({ many }) => ({
  sequences: many(sequenceRecords),
  reports: many(biodiversityReports),
}));

export const sequenceRecordsRelations = relations(sequenceRecords, ({ one }) => ({
  dataset: one(datasets, {
    fields: [sequenceRecords.datasetId],
    references: [datasets.id],
  }),
}));

export const biodiversityReportsRelations = relations(biodiversityReports, ({ one }) => ({
  dataset: one(datasets, {
    fields: [biodiversityReports.datasetId],
    references: [datasets.id],
  }),
}));
