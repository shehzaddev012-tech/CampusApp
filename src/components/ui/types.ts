import type { ComponentType } from 'react';

/** Minimal shape shared by every lucide icon, so we do not depend on lucide's own types. */
export type IconType = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;
