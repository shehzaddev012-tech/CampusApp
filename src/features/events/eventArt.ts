import type { BadgeTone, PatternKind } from '../../components/ui';
import { Category, Colors, PALETTE, categoryColor } from '../../theme';

const KIND: Record<Category, PatternKind> = {
  Tech: 'grid',
  Sports: 'stripes',
  Cultural: 'waves',
  Career: 'blocks',
  Social: 'dots',
};

const TONE: Record<Category, BadgeTone> = {
  Tech: 'sky',
  Sports: 'coral',
  Cultural: 'lavender',
  Career: 'yellow',
  Social: 'primary',
};

/** Each category has its own colour and graphic character. */
export function categoryArt(colors: Colors, category: Category) {
  return {
    kind: KIND[category],
    bg: categoryColor(colors, category),
    fg: PALETTE.ink,
    tone: TONE[category],
  };
}
