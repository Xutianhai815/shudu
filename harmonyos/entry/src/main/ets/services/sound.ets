export type SoundKey = 'select' | 'input' | 'tool' | 'complete';

export function playSound(_key: SoundKey): void {
  // First HarmonyOS MVP keeps sound optional. Wire native audio after core gameplay is stable.
}
