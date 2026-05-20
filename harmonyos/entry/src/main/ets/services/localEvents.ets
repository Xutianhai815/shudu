export interface LocalEvent {
  name: string;
  createdAt: number;
}

export function recordLocalEvent(_event: LocalEvent): void {
  // First version does not collect or upload user data.
}
