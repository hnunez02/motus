/**
 * RAG Service — pgvector similarity search for research citations
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Search for relevant research citations using vector similarity.
 * Falls back to tag-based search if no embeddings exist.
 */
export async function searchCitations(muscleGroups = [], goal = '', limit = 3) {
  try {
    const tags = buildSearchTags(muscleGroups, goal);

    const citations = await prisma.$queryRaw`
      SELECT id, title, authors, journal, year, "keyFindings", tags
      FROM "AiCitation"
      WHERE tags && ${tags}::text[]
      LIMIT ${limit}
    `;

    return citations;
  } catch (err) {
    console.error('RAG search failed, returning empty citations:', err.message);
    return [];
  }
}

/**
 * Search citations by vector similarity to a query embedding.
 */
export async function searchByEmbedding(queryEmbedding, limit = 3) {
  try {
    const citations = await prisma.$queryRaw`
      SELECT id, title, authors, journal, year, "keyFindings", tags,
             1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
      FROM "AiCitation"
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${limit}
    `;
    return citations;
  } catch (err) {
    console.error('Vector search failed:', err.message);
    return [];
  }
}

/**
 * Build search tags from muscle groups and goal.
 */
function buildSearchTags(muscleGroups, goal) {
  const tags = [];

  if (goal) tags.push(goal);

  const muscleToTag = {
    chest: 'hypertrophy',
    back: 'volume',
    shoulders: 'volume',
    quads: 'hypertrophy',
    hamstrings: 'recovery',
    glutes: 'hypertrophy',
    biceps: 'volume',
    triceps: 'volume',
    calves: 'volume',
  };

  for (const muscle of muscleGroups) {
    if (muscleToTag[muscle]) tags.push(muscleToTag[muscle]);
  }

  tags.push('recovery');

  return [...new Set(tags)];
}

/**
 * Format citations for AI context injection.
 */
export function formatCitationsForPrompt(citations) {
  return citations.map((c) => ({
    title: c.title,
    authors: c.authors,
    year: c.year,
    keyFinding: c.keyFindings,
    tags: c.tags,
  }));
}
