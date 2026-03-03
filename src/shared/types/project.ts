/**
 * Project Data Types
 *
 * Type definitions for MARS project data structure
 */

export interface ProjectData {
  schema_version: string;
  name: string;
  description?: string;
  author?: string;
  created_at: string;
  updated_at: string;
  oiduna: OidunaConfig;
  dsl_version: string;
  metadata: ProjectMetadata;
}

export interface OidunaConfig {
  api_url: string;
  default_bpm: number;
  default_gate: number;
  loop_steps: number;
}

export interface ProjectMetadata {
  venue?: string;
  date?: string;
  genre?: string;
  tags: string[];
}

export interface Song {
  name: string;
  title?: string;
  artist?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Clip {
  name: string;
  description?: string;
  dsl: string;
  color?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}
