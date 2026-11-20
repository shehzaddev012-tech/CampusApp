import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ban, Send } from 'lucide-react-native';

import { IconButton, PressableScale, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useToast } from '../../store/toastStore';
import { useTheme } from '../../theme';
import type { ChatMessage } from '../../types/domain';
import { confirm } from '../../utils/confirm';
import { reportContent } from '../../utils/report';

type Props = NativeStackScreenProps<AppStackParamList, 'Chat'>;

const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** A conversation. New messages arrive by asking the server every few seconds while the screen is open. */
export function ChatScreen({ navigation, route }: Props) {
  const { colors, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const { chatId, title, kind, otherUserId } = route.params;
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const list = useRef<FlatList<ChatMessage>>(null);
  const latest = useRef(0);

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) {
      return;
    }
    setMessages(prev => {
      const seen = new Set((prev ?? []).map(m => m.id));
      const next = [...(prev ?? []), ...incoming.filter(m => !seen.has(m.id))];
      latest.current = next.length ? (next[next.length - 1] as ChatMessage).createdAt : 0;
      return next;
    });
  }, []);

  useEffect(() => {
    let alive = true;
    const first = () =>
      backend.chat
        .messages(chatId)
        .then(m => {
          if (!alive) {
            return;
          }
          setMessages(m);
          latest.current = m.length ? (m[m.length - 1] as ChatMessage).createdAt : 0;
          backend.chat.markRead(chatId).catch(() => undefined);
        })
        .catch(() => alive && setMessages([]));
    first();
    const t = setInterval(() => {
      backend.chat
        .messages(chatId, latest.current || undefined)
        .then(m => {
          if (alive && m.length) {
            merge(m);
            backend.chat.markRead(chatId).catch(() => undefined);
          }
        })
        .catch(() => undefined);
    }, 3500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [chatId, merge]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) {
      return;
    }
    setSending(true);
    try {
      const m = await backend.chat.send(chatId, body);
      setText('');
      merge([m]);
    } catch (e) {
      show({ title: 'Message not sent', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    } finally {
      setSending(false);
    }
  };

  const block = async () => {
    if (!otherUserId || !(await confirm({ title: `Block ${title}?`, message: 'You will not see each other in messages or search. You can unblock later.', confirmLabel: 'Block' }))) {
      return;
    }
    try {
      await backend.chat.block(otherUserId, true);
      show({ title: `${title} is blocked`, tone: 'success' });
      navigation.goBack();
    } catch (e) {
      show({ title: 'Could not block', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar title={title} onBack={() => navigation.goBack()} right={kind === 'dm' ? <IconButton icon={Ban} onPress={block} accessibilityLabel="Block" /> : undefined} />
      <FlatList
        ref={list}
        data={messages ?? []}
        keyExtractor={m => m.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text variant="small" color="textTertiary" style={styles.empty}>{messages === null ? '' : 'No messages yet. Say hello.'}</Text>}
        renderItem={({ item: m }) => (
          <PressableScale
            onLongPress={m.mine ? undefined : () => reportContent('message', m.id, 'message')}
            scaleTo={0.99}
            accessibilityLabel={`${m.senderName}: ${m.body}`}
            style={[styles.bubbleWrap, m.mine ? styles.mine : styles.theirs]}>
            <View style={[styles.bubble, { borderRadius: radius.lg, backgroundColor: m.mine ? colors.inverse : colors.surface, borderColor: colors.border, borderWidth: m.mine ? 0 : StyleSheet.hairlineWidth }]}>
              {!m.mine && kind !== 'dm' ? (
                <Text variant="caption" color="textTertiary" style={styles.sender}>
                  {m.senderName}
                </Text>
              ) : null}
              <Text variant="body" color={m.mine ? 'onInverse' : 'text'}>
                {m.body}
              </Text>
              <Text variant="caption" color={m.mine ? 'onInverse' : 'textTertiary'} style={styles.time}>
                {clock(m.createdAt)}
              </Text>
            </View>
          </PressableScale>
        )}
      />
      <View style={[styles.composer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 8, backgroundColor: colors.background }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={1000}
          style={[styles.input, typography.body, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}
        />
        <IconButton icon={Send} onPress={send} accessibilityLabel="Send" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  messages: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 40 },
  bubbleWrap: { maxWidth: '82%' },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  bubble: { paddingHorizontal: 12, paddingVertical: 8 },
  sender: { marginBottom: 2 },
  time: { alignSelf: 'flex-end', marginTop: 2, opacity: 0.7 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 120, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
});
