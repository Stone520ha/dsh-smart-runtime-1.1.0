import type { CheckpointEvent, ObservationEvent, RuntimeSnapshotEvent } from './types.js'

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    'smart-runtime/snapshot': RuntimeSnapshotEvent
    'smart-runtime/observation': ObservationEvent
    'smart-runtime/checkpoint': CheckpointEvent
  }
}
