import { BadgeCheck, TriangleAlert, Users } from 'lucide-react-native';

import type { IconType } from '../../components/ui';
import type { Colors } from '../../theme';
import type { PostKind } from '../../types/domain';

export interface KindMeta {
  label: string;
  /** Short word shown in tags and chips. */
  name: string;
  icon: IconType;
  /** Accent used for markers and fills. */
  color: string;
  /** Readable variant of the accent for small text and icons. */
  textColor: string;
}

/**
 * Each kind of update has its own look so students can tell who is speaking:
 *   official  the university (ink, verified tick)
 *   society   a student society (lavender)
 *   alert     an emergency or urgent notice (coral)
 */
export function kindMeta(kind: PostKind, colors: Colors): KindMeta {
  switch (kind) {
    case 'official':
      return { label: 'OFFICIAL', name: 'Official', icon: BadgeCheck, color: colors.text, textColor: colors.text };
    case 'society':
      return { label: 'SOCIETY', name: 'Society', icon: Users, color: colors.lavender, textColor: colors.lavenderText };
    case 'alert':
      return { label: 'ALERT', name: 'Alert', icon: TriangleAlert, color: colors.coral, textColor: colors.coralText };
  }
}
