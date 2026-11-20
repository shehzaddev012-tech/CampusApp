import React, { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BookMarked, ImageOff, Plus } from 'lucide-react-native';

import { Badge, Chip, EmptyState, IconButton, Input, PressableScale, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { GUTTER, useTheme } from '../../theme';
import { BOOK_CONDITIONS, type Book } from '../../types/domain';
import { rs } from '../../utils/report';

type Props = NativeStackScreenProps<AppStackParamList, 'Books'>;

export function BooksScreen({ navigation }: Props) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [scope, setScope] = useState<'market' | 'mine'>('market');
  const [q, setQ] = useState('');
  const [books, setBooks] = useState<Book[] | null>(null);

  const colW = (width - GUTTER * 2 - 12) / 2;

  const load = useCallback(async () => {
    try {
      setBooks(await backend.study.listBooks({ scope, q: q.trim() || undefined }));
    } catch {
      setBooks(prev => prev ?? []);
    }
  }, [scope, q]);

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(load, 250);
      return () => clearTimeout(t);
    }, [load]),
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Book market" onBack={() => navigation.goBack()} right={<IconButton icon={Plus} onPress={() => navigation.navigate('BookForm')} accessibilityLabel="Sell a book" />} />
      <View style={styles.search}>
        <Input placeholder="Search by title, author or course" value={q} onChangeText={setQ} returnKeyType="search" />
      </View>
      <View style={styles.filters}>
        <Chip label="For sale" selected={scope === 'market'} onPress={() => { setBooks(null); setScope('market'); }} />
        <Chip label="My listings" selected={scope === 'mine'} onPress={() => { setBooks(null); setScope('mine'); }} />
      </View>
      <FlatList
        key="grid"
        data={books ?? []}
        numColumns={2}
        keyExtractor={b => b.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ListEmptyComponent={
          books === null ? (
            <Skeleton height={200} radius={20} />
          ) : (
            <EmptyState
              icon={BookMarked}
              title={scope === 'market' ? 'No books for sale' : 'You have not listed any book'}
              message={scope === 'market' ? 'Have a textbook you no longer need? List it and help a classmate.' : 'Books you list show up here, sold ones too.'}
              actionLabel="Sell a book"
              onAction={() => navigation.navigate('BookForm')}
            />
          )
        }
        renderItem={({ item: b }) => (
          <PressableScale onPress={() => navigation.navigate('BookDetail', { bookId: b.id })} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={`${b.title}, ${rs(b.price)}`} style={{ width: colW }}>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
              {b.photos[0] ? (
                <Image source={{ uri: b.photos[0].thumbUrl }} style={[styles.photo, { height: colW * 0.9 }]} />
              ) : (
                <View style={[styles.photo, styles.noPhoto, { height: colW * 0.9, backgroundColor: colors.surfaceAlt }]}>
                  <ImageOff size={26} color={colors.textTertiary} />
                </View>
              )}
              <View style={styles.body}>
                <Text variant="smallStrong" numberOfLines={2}>
                  {b.title}
                </Text>
                <Text variant="title3" style={styles.price}>
                  {rs(b.price)}
                </Text>
                <View style={styles.tags}>
                  <Badge label={BOOK_CONDITIONS.find(c => c.value === b.condition)?.label ?? b.condition} tone="neutral" />
                  {b.status !== 'available' ? <Badge label={b.status === 'sold' ? 'Sold' : b.status === 'reserved' ? 'Reserved' : 'Hidden'} tone={b.status === 'sold' ? 'danger' : 'warning'} /> : null}
                </View>
              </View>
            </View>
          </PressableScale>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  search: { paddingHorizontal: GUTTER, paddingTop: 12 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: GUTTER, paddingVertical: 12 },
  list: { paddingHorizontal: GUTTER, paddingTop: 4, flexGrow: 1 },
  row: { gap: 12, marginBottom: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  photo: { width: '100%' },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 12 },
  price: { marginTop: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
});
