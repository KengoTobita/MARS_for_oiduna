/**
 * Oiduna API Types
 *
 * Type definitions for Oiduna HTTP API
 */

export interface CompiledSession {
  environment: Environment;
  tracks: Record<string, Track>;
  tracks_midi: Record<string, MidiTrack>;
  sequences: Record<string, Sequence>;
  scenes: Record<string, Scene>;
  apply: ApplyConfig;
}

export interface Environment {
  bpm: number;
  default_gate: number;
  swing: number;
  loop_steps: number;
}

export interface Track {
  meta: TrackMeta;
  params: Record<string, any>;
  fx: Record<string, any>;
  track_fx: Record<string, any>;
  sends: Send[];
}

export interface TrackMeta {
  track_id: string;
  mute: boolean;
  solo: boolean;
}

export interface MidiTrack {
  // TODO: Define MIDI track structure
}

export interface Sequence {
  track_id: string;
  events: SequenceEvent[];
}

export interface SequenceEvent {
  step: number;
  velocity: number;
  gate: number;
  [key: string]: any;
}

export interface Scene {
  // TODO: Define scene structure
}

export interface Send {
  // TODO: Define send structure
}

export interface ApplyConfig {
  timing: 'immediate' | 'beat' | 'bar';
  track_ids: string[];
  scene_name: string | null;
}

export interface ScheduledMessage {
  destination_id: string;
  cycle: number;
  step: number;
  params: Record<string, any>;
}
