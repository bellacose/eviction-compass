export type MatterRow = Record<string, any>;

export interface StepProps {
  matter: MatterRow | null;
  clientId: string;
  setClientId: (id: string) => void;
  /** Patches the draft case row and refreshes local state. */
  save: (patch: Record<string, any>) => Promise<MatterRow | null>;
  refresh: () => Promise<void>;
  next: () => void;
  back: () => void;
  goTo: (step: number) => void;
  isAdmin: boolean;
}
