import { sortFeed } from '../src/store/feedStore';
import { allowedPostKinds } from '../src/types/domain';
import { compactNumber, timeAgo } from '../src/utils/time';
import type { Post } from '../src/types/domain';

jest.mock('../src/services', () => ({ backend: {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const NOW = 1_700_000_000_000;
const H = 3_600_000;
const make = (id: string, over: Partial<Post>): Post => ({
  id,
  universityId: 'iac',
  kind: 'official',
  title: id,
  body: '',
  authorId: 'a',
  authorName: 'A',
  authorRole: 'uni_admin',
  source: 'S',
  channel: null,
  pinned: false,
  createdAt: NOW,
  likeCount: 0,
  commentCount: 0,
  readCount: 0,
  ...over,
});

describe('feed ordering', () => {
  it('puts fresh alerts first, then pinned, then newest', () => {
    const list = [
      make('old', { createdAt: NOW - 5 * H }),
      make('new', { createdAt: NOW - 1 * H }),
      make('pinned', { pinned: true, createdAt: NOW - 30 * H }),
      make('alert', { kind: 'alert', createdAt: NOW - 2 * H }),
    ];
    expect(sortFeed(list, NOW).map(p => p.id)).toEqual(['alert', 'pinned', 'new', 'old']);
  });

  it('does not keep an old alert on top', () => {
    const list = [make('new', { createdAt: NOW - H }), make('oldAlert', { kind: 'alert', createdAt: NOW - 48 * H })];
    expect(sortFeed(list, NOW)[0].id).toBe('new');
  });
});

describe('posting roles', () => {
  it('limits who can publish what', () => {
    expect(allowedPostKinds('student')).toEqual([]);
    expect(allowedPostKinds('society_head')).toEqual(['society']);
    expect(allowedPostKinds('security')).toEqual(['alert']);
    expect(allowedPostKinds('uni_admin').sort()).toEqual(['alert', 'official', 'society']);
  });
});

describe('helpers', () => {

  it('formats relative time and counts', () => {
    expect(timeAgo(NOW - 20 * 60_000, NOW)).toBe('20m ago');
    expect(timeAgo(NOW - 2 * H, NOW)).toBe('2h ago');
    expect(timeAgo(NOW - 30 * H, NOW)).toBe('Yesterday');
    expect(compactNumber(1200)).toBe('1.2k');
    expect(compactNumber(86)).toBe('86');
  });
});
