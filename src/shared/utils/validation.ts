/**
 * Validation Schemas
 *
 * Zod schemas for runtime validation
 */

import { z } from 'zod';

export const ProjectDataSchema = z.object({
  schema_version: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  author: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  oiduna: z.object({
    api_url: z.string().url(),
    default_bpm: z.number().positive(),
    default_gate: z.number().min(0).max(1),
    loop_steps: z.number().int().positive(),
  }),
  dsl_version: z.string(),
  metadata: z.object({
    venue: z.string().optional(),
    date: z.string().optional(),
    genre: z.string().optional(),
    tags: z.array(z.string()),
  }),
});

export const ClipSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  dsl: z.string(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  tags: z.array(z.string()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CompiledSessionSchema = z.object({
  environment: z.object({
    bpm: z.number().positive(),
    default_gate: z.number().min(0).max(1),
    swing: z.number(),
    loop_steps: z.number().int().positive(),
  }),
  tracks: z.record(z.any()),
  tracks_midi: z.record(z.any()),
  sequences: z.record(z.any()),
  scenes: z.record(z.any()),
  apply: z.object({
    timing: z.enum(['immediate', 'beat', 'bar']),
    track_ids: z.array(z.string()),
    scene_name: z.string().nullable(),
  }),
});
