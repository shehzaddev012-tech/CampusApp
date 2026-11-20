import React, { useCallback, useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Flag, ImageOff, Trash2 } from 'lucide-react-native';

import { Avatar, Badge, Button, Card, IconButton, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import { BOOK_CONDITIONS, type Book, type BookInterested } from '../../types/domain';
import { confirm } from '../../utils/confirm';
import { reportContent, rs } from '../../utils/report';
import { timeAgo } from '../../utils/time';

type Props = NativeStackScreenProps<AppStackParamList, 'BookDetail'>;

export function BookDetailScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const show = useToast(s => s.show);
  const [book, setBook] = useState<Book | null>(null);
  const [asked, setAsked] = useState<BookInterested[]>([]);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const b = await backend.study.book(route.params.bookId);
      setBook(b);
      if (b.canManage && (b.interestedCount ?? 0) > 0) {
        setAsked(await backend.study.bookInterested(b.id));
      } else {
        setAsked([]);
      }
    } catch {
      setMissing(true);
    }
  }, [route.params.bookId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const fail = (title: string, e: unknown) => show({ title, body: e instanceof Error ? e.message : undefined, tone: 'alert' });

  const ask = async () => {
    if (!book || busy) {
      return;
    }
    if (!(await confirm({ title: 'Ask about this book?', message: `${book.sellerName} gets a notification with your name and department, and can contact you.`, confirmLabel: 'Yes, I am interested', tone: 'neutral' }))) {
      return;
    }
    setBusy(true);
    try {
      await backend.study.askAboutBook(book.id);
      show({ title: 'They have been told', body: 'The seller will contact you.', tone: 'success' });
      await load();
    } catch (e) {
      fail('Could not send', e);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: 'available' | 'reserved' | 'sold') => {
    if (!book) {
      return;
    }
    if (status === 'sold' && !(await confirm({ title: 'Mark as sold?', message: 'It leaves the market. You can still see it under My listings.', confirmLabel: 'Mark as sold', tone: 'neutral' }))) {
      return;
    }
    try {
      setBook(await backend.study.updateBook(book.id, { status }));
    } catch (e) {
      fail('Could not update', e);
    }
  };

  const remove = async () => {
    if (!book || !(await confirm({ title: 'Delete this listing?', message: 'Its photos are deleted too. This cannot be undone.', confirmLabel: 'Delete listing' }))) {
      return;
    }
    try {
      await backend.study.removeBook(book.id);
      navigation.goBack();
    } catch (e) {
      fail('Could not delete', e);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        title="Book"
        onBack={() => navigation.goBack()}
        right={book && !book.mine ? <IconButton icon={Flag} onPress={() => reportContent('book', book.id, 'listing')} accessibilityLabel="Report" /> : book?.canManage ? <IconButton icon={Trash2} onPress={remove} accessibilityLabel="Delete" /> : undefined}
      />
      {!book ? (
        <View style={styles.pad}>{missing ? <Text variant="body" color="textSecondary">This listing is no longer available.</Text> : <Skeleton height={220} radius={20} />}</View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          {book.photos.length > 0 ? (
            <FlatList
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={book.photos}
              keyExtractor={p => p.id}
              renderItem={({ item }) => <Image source={{ uri: item.url }} style={{ width, height: width * 0.75, backgroundColor: colors.surfaceAlt }} resizeMode="cover" />}
            />
          ) : (
            <View style={[styles.noPhoto, { height: width * 0.5, backgroundColor: colors.surfaceAlt }]}>
              <ImageOff size={32} color={colors.textTertiary} />
            </View>
          )}
          <View style={styles.content}>
            <View style={styles.tags}>
              <Badge label={BOOK_CONDITIONS.find(c => c.value === book.condition)?.label ?? book.condition} tone="neutral" />
              {book.status !== 'available' ? <Badge label={book.status === 'sold' ? 'Sold' : book.status === 'reserved' ? 'Reserved' : 'Hidden'} tone={book.status === 'sold' ? 'danger' : 'warning'} /> : null}
            </View>
            <Text variant="title2" style={styles.title}>
              {book.title}
            </Text>
            {book.author ? (
              <Text variant="small" color="textSecondary" style={styles.sub}>
                by {book.author}
              </Text>
            ) : null}
            <Text variant="title1" style={styles.price}>
              {rs(book.price)}
            </Text>
            {book.course ? (
              <Text variant="small" color="textSecondary">
                For course {book.course}
              </Text>
            ) : null}
            {book.description ? (
              <Text variant="body" color="textSecondary" style={styles.desc}>
                {book.description}
              </Text>
            ) : null}
            <Text variant="caption" color="textTertiary" style={styles.sub}>
              Listed by {book.mine ? 'you' : book.sellerName} · {timeAgo(book.createdAt)}
            </Text>

            {book.mine ? (
              <View style={styles.actions}>
                {book.status !== 'sold' ? (
                  <>
                    <Button title="Mark as sold" onPress={() => setStatus('sold')} />
                    <Button title={book.status === 'reserved' ? 'Available again' : 'Reserve it'} variant="soft" onPress={() => setStatus(book.status === 'reserved' ? 'available' : 'reserved')} />
                  </>
                ) : (
                  <Button title="List it again" variant="soft" onPress={() => setStatus('available')} />
                )}
              </View>
            ) : book.status === 'available' || book.status === 'reserved' ? (
              <View style={styles.actions}>
                <Button title={book.iAsked ? 'You asked about it' : 'I am interested'} variant={book.iAsked ? 'soft' : 'primary'} disabled={book.iAsked} loading={busy} onPress={ask} />
              </View>
            ) : null}

            {book.canManage && asked.length > 0 ? (
              <View style={styles.asked}>
                <Text variant="cardTitle" style={styles.askedTitle}>
                  {asked.length} {asked.length === 1 ? 'person is' : 'people are'} interested
                </Text>
                {asked.map(p => (
                  <View key={p.uid} style={styles.askedRow}>
                    <Card padding={12}>
                      <View style={styles.person}>
                        <Avatar name={p.name} size={36} />
                        <View style={styles.personText}>
                          <Text variant="cardTitle" numberOfLines={1}>
                            {p.name}
                          </Text>
                          <Text variant="caption" color="textTertiary">
                            {p.department} · Batch {p.batch} · {timeAgo(p.createdAt)}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: GUTTER },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: GUTTER, paddingTop: 16 },
  tags: { flexDirection: 'row', gap: 8 },
  title: { marginTop: 12 },
  sub: { marginTop: 6 },
  price: { marginTop: 10 },
  desc: { marginTop: 14 },
  actions: { gap: 10, marginTop: 20 },
  asked: { marginTop: 28 },
  askedTitle: { marginBottom: 10 },
  askedRow: { marginBottom: 8 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personText: { flex: 1 },
});
