import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Clipboard from '@react-native-clipboard/clipboard';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Ban, ChevronDown, Info } from 'lucide-react-native';

import { BrandLoader, PressableScale, Text } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useToast } from '../../store/toastStore';
import { useTheme } from '../../theme';
import type { ChatMessage, ChatPresence, ChatReceipts, PickedPhoto } from '../../types/domain';
import { dayLabel, lastSeenText, sameDay } from '../../utils/chatTime';
import { confirm } from '../../utils/confirm';
import { reportContent } from '../../utils/report';
import { AttachSheet, ChatHeader, Composer, DayChip, ImageViewer, MessageActions, MessageBubble, ReplyBanner, SendPreview, SystemLine, useChatColors, type Delivery } from './ChatParts';

type Props = NativeStackScreenProps<AppStackParamList, 'Chat'>;

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const TWO_DAYS = 2 * 24 * 3_600_000;
const RUN_GAP_MS = 5 * 60_000;
const isTemp = (m: ChatMessage) => m.id.startsWith('tmp-');

type Row =
  | { key: string; type: 'day'; label: string }
  | { key: string; type: 'system'; text: string }
  | { key: string; type: 'message'; message: ChatMessage; showSender: boolean; firstInRun: boolean };

/** A conversation, in the WhatsApp way. New messages arrive live (the server nudges the app); a slow check is the fallback. */
export function ChatScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const chat = useChatColors();
  const show = useToast(s => s.show);
  const { chatId, title, kind, otherUserId, photoUrl, targetId } = route.params;
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [receipts, setReceipts] = useState<ChatReceipts | null>(null);
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const sentKey = useRef(new Map<string, string>());
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState<ChatMessage | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [preview, setPreview] = useState<PickedPhoto[]>([]);
  const [caption, setCaption] = useState('');
  const [typingName, setTypingName] = useState<string | null>(null);
  const [presence, setPresence] = useState<ChatPresence | null>(null);
  const [away, setAway] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const list = useRef<FlatList<Row>>(null);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const stickToEnd = useRef(true);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCount = useRef(0);

  /** Puts a changed message (a new reaction, say) into the list, or adds it when it is new. */
  const put = useCallback((m: ChatMessage) => {
    setMessages(prev => {
      const rest = (prev ?? []).filter(x => x.id !== m.id);
      return [...rest, m].sort((a, b) => a.createdAt - b.createdAt);
    });
  }, []);

  useEffect(() => {
    let alive = true;
    // Always the newest page, replacing what we have: that also brings new reactions, ticks and deleted messages.
    const refresh = (markRead: boolean) =>
      backend.chat
        .messages(chatId)
        .then(t => {
          if (!alive) {
            return;
          }
          setMessages(t.messages);
          setReceipts(t.receipts);
          if (markRead) {
            backend.chat.markRead(chatId).catch(() => undefined);
          }
        })
        .catch(() => alive && setMessages(prev => prev ?? []));
    const loadPresence = () => {
      if (kind === 'dm' && otherUserId) {
        backend.chat
          .presence(otherUserId)
          .then(p => alive && setPresence(p))
          .catch(() => undefined);
      }
    };
    void refresh(true);
    loadPresence();
    // Live: the server nudges us the moment someone writes, reacts, receives or reads. The timer below is only
    // the safety net (every ~3.5 s when the live connection is down, about every 25 s when it is up).
    const unsubscribe = backend.chat.onNudge(id => {
      if (id === chatId) {
        void refresh(true);
        loadPresence();
      }
    });
    const stopTyping = backend.chat.onTyping((id, name) => {
      if (id !== chatId) {
        return;
      }
      setTypingName(name || 'Someone');
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }
      typingTimer.current = setTimeout(() => setTypingName(null), 4000);
    });
    let ticks = 0;
    const t = setInterval(() => {
      ticks += 1;
      if (!backend.chat.isLive() || ticks % 7 === 0) {
        void refresh(false);
      }
      if (ticks % 6 === 0) {
        loadPresence();
      }
    }, 3500);
    return () => {
      alive = false;
      unsubscribe();
      stopTyping();
      clearInterval(t);
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }
    };
  }, [chatId, kind, otherUserId]);

  // The rows: day separators, "X added Y" lines and bubbles grouped into runs by the same person.
  const rows = useMemo<Row[]>(() => {
    const settled = new Set(sentKey.current.values());
    const all = [...(messages ?? []), ...pending.filter(p => !settled.has(p.id))].sort((a, b) => a.createdAt - b.createdAt);
    const out: Row[] = [];
    let prev: ChatMessage | null = null;
    for (const m of all) {
      const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
      if (newDay) {
        out.push({ key: `day-${m.id}`, type: 'day', label: dayLabel(m.createdAt) });
      }
      if (m.kind === 'system') {
        out.push({ key: m.id, type: 'system', text: `${m.mine ? 'You' : m.senderName} ${m.body}` });
      } else {
        const firstInRun = newDay || !prev || prev.kind === 'system' || prev.senderId !== m.senderId || m.createdAt - prev.createdAt > RUN_GAP_MS;
        // A message I just sent keeps the key of its grey "sending" bubble, so it settles in place instead of being redrawn.
        out.push({ key: sentKey.current.get(m.id) ?? m.id, type: 'message', message: m, showSender: firstInRun && kind !== 'dm', firstInRun });
      }
      prev = m;
    }
    return out;
  }, [messages, pending, kind]);

  // "N new messages" on the jump-down button while scrolled up.
  useEffect(() => {
    const count = (messages ?? []).length;
    if (!stickToEnd.current && count > lastCount.current && lastCount.current > 0) {
      setNewCount(n => n + (count - lastCount.current));
    }
    lastCount.current = count;
  }, [messages]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const fromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    stickToEnd.current = fromBottom < 160;
    setAway(fromBottom > 400);
    if (stickToEnd.current) {
      setNewCount(0);
    }
  };

  const jumpToEnd = () => {
    stickToEnd.current = true;
    setNewCount(0);
    list.current?.scrollToEnd({ animated: true });
  };

  const fail = (what: string, e: unknown) => show({ title: what, body: e instanceof Error ? e.message : undefined, tone: 'alert' });

  const delivery = (m: ChatMessage): Delivery | null => {
    if (isTemp(m)) {
      return 'pending';
    }
    if (!receipts) {
      return null;
    }
    return m.createdAt <= receipts.readAt ? 'read' : m.createdAt <= receipts.deliveredAt ? 'delivered' : 'sent';
  };

  const send = async () => {
    const body = text.trim();
    if (!body) {
      return;
    }
    const quoting = replyTo;
    const temp: ChatMessage = {
      id: `tmp-${Date.now()}`,
      kind: 'text',
      senderId: 'me',
      senderName: 'You',
      body,
      deleted: false,
      createdAt: Date.now(),
      mine: true,
      replyTo: quoting ? { id: quoting.id, senderName: quoting.mine ? 'You' : quoting.senderName, body: quoting.body, attachmentKind: quoting.attachment?.kind ?? null, deleted: false } : null,
      attachment: null,
      reactions: [],
    };
    stickToEnd.current = true;
    setPending(p => [...p, temp]);
    setText('');
    setReplyTo(null);
    try {
      const m = await backend.chat.send(chatId, body, quoting?.id);
      sentKey.current.set(m.id, temp.id);
      put(m);
      setPending(p => p.filter(x => x.id !== temp.id));
    } catch (e) {
      setPending(p => p.filter(x => x.id !== temp.id));
      setText(body); // nothing is lost: it goes back into the box
      setReplyTo(quoting);
      fail('Message not sent', e);
    }
  };

  const sendPicked = async () => {
    const files = preview;
    const note = caption.trim();
    const quoting = replyTo;
    setPreview([]);
    setCaption('');
    setReplyTo(null);
    for (let i = 0; i < files.length; i++) {
      const f = files[i] as PickedPhoto;
      setUploading(f.name);
      try {
        stickToEnd.current = true;
        put(await backend.chat.sendAttachment(chatId, f, i === 0 ? note : '', i === 0 ? quoting?.id : undefined));
      } catch (e) {
        fail(`Could not send ${f.name}`, e);
        break;
      }
    }
    setUploading(null);
  };

  const pickPhotos = async () => {
    setAttachOpen(false);
    const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 5, quality: 0.8, maxWidth: 2000, maxHeight: 2000 });
    const picked = (res.assets ?? []).filter(a => a.uri).map(a => ({ uri: a.uri as string, name: a.fileName ?? 'photo.jpg', type: a.type ?? 'image/jpeg' }));
    if (picked.length > 0) {
      setPreview(picked);
    }
  };

  const takePhoto = async () => {
    setAttachOpen(false);
    const res = await launchCamera({ mediaType: 'photo', quality: 0.8, maxWidth: 2000, maxHeight: 2000, saveToPhotos: false });
    if (res.errorCode === 'camera_unavailable' || res.errorCode === 'permission') {
      show({ title: 'Camera not available', body: res.errorCode === 'permission' ? 'Allow camera access in Settings.' : 'This phone has no camera we can use.', tone: 'alert' });
      return;
    }
    const a = res.assets?.[0];
    if (a?.uri) {
      setPreview([{ uri: a.uri, name: a.fileName ?? 'photo.jpg', type: a.type ?? 'image/jpeg' }]);
    }
  };

  const pickDocument = async () => {
    setAttachOpen(false);
    try {
      const res = await pick({ type: [types.pdf, types.docx, types.xlsx, types.pptx], allowMultiSelection: false });
      const f = res[0];
      if (!f) {
        return;
      }
      if (f.size !== null && f.size !== undefined && f.size > MAX_FILE_BYTES) {
        show({ title: 'That file is too big', body: 'Documents can be up to 15 MB.', tone: 'alert' });
        return;
      }
      setPreview([{ uri: f.uri, name: f.name ?? 'document', type: f.type ?? 'application/octet-stream' }]);
    } catch (e) {
      if (!(isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED)) {
        show({ title: 'Could not pick the file', tone: 'alert' });
      }
    }
  };

  const openFile = (url: string) => {
    Linking.openURL(url).catch(() => show({ title: 'Could not open the file', body: 'No app on this phone can open it.', tone: 'alert' }));
  };

  /** Reacting with the emoji I already used takes it back. */
  const react = async (m: ChatMessage, emoji: string) => {
    setActionsFor(null);
    const already = m.reactions.find(r => r.mine)?.emoji === emoji;
    try {
      put(await backend.chat.react(chatId, m.id, already ? null : emoji));
    } catch (e) {
      fail('Could not react', e);
    }
  };

  const startReply = (m: ChatMessage) => {
    setActionsFor(null);
    setReplyTo(m);
    setTimeout(() => input.current?.focus(), 50);
  };

  const copy = (m: ChatMessage) => {
    setActionsFor(null);
    Clipboard.setString(m.body);
    show({ title: 'Copied', tone: 'success' });
  };

  const removeFor = async (m: ChatMessage, scope: 'me' | 'everyone') => {
    try {
      await backend.chat.deleteMessage(chatId, m.id, scope);
      if (scope === 'me') {
        setMessages(prev => (prev ?? []).filter(x => x.id !== m.id));
      } else {
        put({ ...m, deleted: true, body: '', attachment: null, reactions: [], replyTo: null });
      }
    } catch (e) {
      fail('Could not delete', e);
    }
  };

  const askDelete = (m: ChatMessage) => {
    setActionsFor(null);
    const canEveryone = m.mine && Date.now() - m.createdAt < TWO_DAYS;
    if (canEveryone) {
      Alert.alert('Delete message?', undefined, [
        { text: 'Delete for everyone', style: 'destructive', onPress: () => void removeFor(m, 'everyone') },
        { text: 'Delete for me', onPress: () => void removeFor(m, 'me') },
        { text: 'Cancel', style: 'cancel' },
      ], { cancelable: false });
      return;
    }
    void confirm({ title: 'Delete for you?', message: 'It stays for everyone else in this chat.', confirmLabel: 'Delete' }).then(async ok => {
      if (ok) {
        await removeFor(m, 'me');
      }
    });
  };

  const scrollToMessage = (id: string) => {
    const index = rows.findIndex(r => r.type === 'message' && r.message.id === id);
    if (index >= 0) {
      stickToEnd.current = false;
      list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.35 });
    } else {
      show({ title: 'That message is further back', tone: 'info' });
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
      fail('Could not block', e);
    }
  };

  const subtitle = typingName
    ? kind === 'dm'
      ? 'typing...'
      : `${typingName} is typing...`
    : kind === 'dm' && presence
      ? presence.online
        ? 'online'
        : presence.lastSeenAt
          ? lastSeenText(presence.lastSeenAt)
          : undefined
      : undefined;

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: chat.wallpaper }]} behavior="padding">
      <ChatHeader
        title={title}
        photoUrl={photoUrl}
        subtitle={subtitle}
        typing={typingName !== null}
        onBack={() => navigation.goBack()}
        onPress={
          kind === 'custom'
            ? () => navigation.navigate('GroupChatInfo', { chatId })
            : kind === 'dm' && otherUserId
              ? () => navigation.navigate('PersonProfile', { userId: otherUserId })
              : kind === 'society' && targetId
                ? () => navigation.navigate('SocietyDetail', { societyId: targetId })
                : kind === 'group' && targetId
                  ? () => navigation.navigate('GroupDetail', { groupId: targetId })
                  : undefined
        }
        right={
          kind === 'dm' ? (
            <Pressable onPress={block} hitSlop={8} accessibilityRole="button" accessibilityLabel="Block" style={styles.headerAction}>
              <Ban size={22} color={chat.icon} />
            </Pressable>
          ) : kind === 'custom' ? (
            <Pressable onPress={() => navigation.navigate('GroupChatInfo', { chatId })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Group info" style={styles.headerAction}>
              <Info size={22} color={chat.icon} />
            </Pressable>
          ) : undefined
        }
      />
      <FlatList
        ref={list}
        data={rows}
        keyExtractor={r => r.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messages}
        onScroll={onScroll}
        scrollEventThrottle={64}
        onScrollToIndexFailed={info => list.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true })}
        onContentSizeChange={() => stickToEnd.current && list.current?.scrollToEnd({ animated: false })}
        onLayout={() => stickToEnd.current && list.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text variant="small" color="textTertiary" style={styles.empty}>{messages === null ? '' : 'No messages yet. Say hello.'}</Text>}
        renderItem={({ item: r }) => {
          if (r.type === 'day') {
            return <DayChip label={r.label} />;
          }
          if (r.type === 'system') {
            return <SystemLine text={r.text} />;
          }
          const m = r.message;
          return (
            <MessageBubble
              message={m}
              showSender={r.showSender}
              firstInRun={r.firstInRun}
              delivery={m.mine ? delivery(m) : null}
              onLongPress={() => !isTemp(m) && setActionsFor(m)}
              onReply={() => !isTemp(m) && startReply(m)}
              onOpenQuote={scrollToMessage}
              onOpenImage={setViewing}
              onOpenFile={openFile}
              onReact={emoji => void react(m, emoji)}
            />
          );
        }}
      />

      {away ? (
        <PressableScale onPress={jumpToEnd} scaleTo={0.92} accessibilityRole="button" accessibilityLabel={newCount > 0 ? `${newCount} new messages, jump to the latest` : 'Jump to the latest message'} style={[styles.jump, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ChevronDown size={22} color={colors.text} />
          {newCount > 0 ? (
            <View style={[styles.jumpBadge, { backgroundColor: colors.primary }]}>
              <Text variant="caption" color="onPrimary" style={styles.jumpBadgeText}>
                {newCount > 99 ? '99+' : newCount}
              </Text>
            </View>
          ) : null}
        </PressableScale>
      ) : null}

      {uploading ? (
        <View style={[styles.uploading, { backgroundColor: colors.surfaceAlt }]}>
          <BrandLoader size={26} />
          <Text variant="small" color="textSecondary" numberOfLines={1} style={styles.uploadingText}>
            Sending {uploading}...
          </Text>
        </View>
      ) : null}
      <ReplyBanner message={replyTo} onCancel={() => setReplyTo(null)} />
      <Composer
        text={text}
        inputRef={input}
        onText={t => {
          setText(t);
          if (t.length > 0) {
            backend.chat.sendTyping(chatId);
          }
        }}
        onSend={() => void send()}
        onAttach={() => setAttachOpen(true)}
        onCamera={() => void takePhoto()}
      />

      <AttachSheet open={attachOpen} onClose={() => setAttachOpen(false)} onPhoto={() => void pickPhotos()} onCamera={() => void takePhoto()} onDocument={() => void pickDocument()} />
      <MessageActions
        message={actionsFor}
        onClose={() => setActionsFor(null)}
        onReact={emoji => actionsFor && void react(actionsFor, emoji)}
        onReply={() => actionsFor && startReply(actionsFor)}
        onCopy={() => actionsFor && copy(actionsFor)}
        onDelete={() => actionsFor && askDelete(actionsFor)}
        onReport={() => {
          const m = actionsFor;
          setActionsFor(null);
          if (m) {
            reportContent('message', m.id, 'message');
          }
        }}
      />
      <SendPreview
        files={preview}
        caption={caption}
        onCaption={setCaption}
        onRemove={i => setPreview(p => p.filter((_, j) => j !== i))}
        onCancel={() => {
          setPreview([]);
          setCaption('');
        }}
        onSend={() => void sendPicked()}
      />
      <ImageViewer uri={viewing} onClose={() => setViewing(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  messages: { paddingHorizontal: 12, paddingVertical: 12, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 40 },
  jump: { position: 'absolute', right: 16, bottom: 96, width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  jumpBadge: { position: 'absolute', top: -8, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  jumpBadgeText: { fontWeight: '700' },
  uploading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  uploadingText: { flex: 1 },
  headerAction: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
});
