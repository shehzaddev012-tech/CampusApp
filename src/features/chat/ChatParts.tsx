import React, { useRef } from 'react';
import { Animated, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Check, CheckCheck, Clock, Copy, FileText, Flag, Image as ImageIcon, Paperclip, Reply, Send, Trash2, X } from 'lucide-react-native';

import { Avatar, PressableScale, Text } from '../../components/ui';
import { useTheme } from '../../theme';
import { CHAT_REACTIONS, type ChatMessage, type ChatQuote, type PickedPhoto } from '../../types/domain';
import { clock } from '../../utils/chatTime';

export type Delivery = 'pending' | 'sent' | 'delivered' | 'read';

export const fileSize = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);
const kindLabel = (mime: string) => (mime === 'application/pdf' ? 'PDF' : mime.includes('wordprocessing') ? 'Word' : mime.includes('spreadsheet') ? 'Excel' : mime.includes('presentation') ? 'PowerPoint' : 'File');

/** Sender names in groups: readable on both a light and a dark bubble. */
const NAME_COLORS = ['#2B9A55', '#D9663F', '#7A5AD6', '#2F86C9', '#C2487A', '#B77A0B', '#4E8F2A', '#1F8F9E'];
export const nameColor = (key: string): string => {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return NAME_COLORS[h % NAME_COLORS.length] as string;
};

/** The chat's own colours: a soft wallpaper, a light-lime bubble for me and a white one for the others. */
export function useChatColors() {
  const { isDark, colors } = useTheme();
  // Everything comes from the app's own theme (Campus Green), so chat looks like the rest of the app.
  return {
    wallpaper: colors.background,
    mine: colors.primarySoft,
    theirs: colors.surface,
    text: colors.text,
    meta: colors.textSecondary,
    quoteMine: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    quoteTheirs: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    panel: colors.surface,
    icon: colors.textSecondary,
    border: colors.border,
    info: colors.info,
    doc: colors.info,
    camera: colors.accent,
    gallery: colors.success,
  };
}

const IMAGE_WIDTH = 240;

/** The ticks next to the time of my own messages: clock (sending), one tick (sent), two (delivered), two blue (read). */
export function Ticks({ status }: { status: Delivery }) {
  const { meta, info } = useChatColors();
  if (status === 'pending') {
    return <Clock size={13} color={meta} />;
  }
  if (status === 'sent') {
    return <Check size={16} color={meta} />;
  }
  return <CheckCheck size={17} color={status === 'read' ? info : meta} />;
}

/** The top bar of a chat: back, the person or group (picture, name, status line), and actions. */
export function ChatHeader({ title, photoUrl, subtitle, typing, onBack, onPress, right }: { title: string; photoUrl?: string | null; subtitle?: string; typing: boolean; onBack: () => void; onPress?: () => void; right?: React.ReactNode }) {
  const { colors } = useTheme();
  const c = useChatColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6, backgroundColor: colors.surface, borderBottomColor: c.border }]}>
      <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go back" style={styles.headerBack}>
        <ArrowLeft size={24} color={colors.text} />
      </Pressable>
      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={onPress ? `${title}, open info` : title} style={styles.headerWho}>
        <Avatar name={title} uri={photoUrl} size={40} />
        <View style={styles.headerText}>
          <Text variant="cardTitle" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" numberOfLines={1} style={{ color: typing ? colors.success : c.meta }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

/** Drag a message to the right to reply to it. */
function SwipeToReply({ children, onReply, enabled }: { children: React.ReactNode; onReply: () => void; enabled: boolean }) {
  const c = useChatColors();
  const x = useRef(new Animated.Value(0)).current;
  const fired = useRef(false);
  const handlers = useRef(onReply);
  handlers.current = onReply;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dx > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderGrant: () => {
        fired.current = false;
      },
      onPanResponderMove: (_e, g) => {
        const dx = Math.max(0, Math.min(g.dx, 72));
        x.setValue(dx);
        if (dx >= 56 && !fired.current) {
          fired.current = true;
          handlers.current();
        }
      },
      onPanResponderRelease: () => Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start(),
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
    }),
  ).current;

  if (!enabled) {
    return <>{children}</>;
  }
  return (
    <View>
      <Animated.View style={[styles.swipeIcon, { opacity: x.interpolate({ inputRange: [0, 40, 72], outputRange: [0, 0.6, 1] }), backgroundColor: c.quoteTheirs }]} pointerEvents="none">
        <Reply size={16} color={c.icon} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

function QuoteBlock({ quote, mine, onPress }: { quote: ChatQuote; mine: boolean; onPress: () => void }) {
  const c = useChatColors();
  const bar = nameColor(quote.senderName);
  const text = quote.deleted ? '🚫 This message was deleted' : quote.body || (quote.attachmentKind === 'image' ? '📷 Photo' : quote.attachmentKind === 'file' ? '📄 Document' : '');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Replying to ${quote.senderName}: ${text}`} style={[styles.quote, { backgroundColor: mine ? c.quoteMine : c.quoteTheirs, borderLeftColor: bar }]}>
      <Text variant="caption" style={{ color: bar, fontWeight: '700' }} numberOfLines={1}>
        {quote.senderName}
      </Text>
      <Text variant="small" numberOfLines={2} style={[styles.quoteText, { color: c.meta }]}>
        {text}
      </Text>
    </Pressable>
  );
}

interface BubbleProps {
  message: ChatMessage;
  /** Show the sender's name above (first message of a run, in a group). */
  showSender: boolean;
  /** First message of a run from the same person: gets the pointed corner. */
  firstInRun: boolean;
  delivery: Delivery | null;
  onLongPress: () => void;
  onReply: () => void;
  onOpenQuote: (id: string) => void;
  onOpenImage: (uri: string) => void;
  onOpenFile: (url: string) => void;
  onReact: (emoji: string) => void;
}

/** One message, in the WhatsApp way: swipe to reply, quote, picture or document, time with ticks, reactions. */
export function MessageBubble({ message: m, showSender, firstInRun, delivery, onLongPress, onReply, onOpenQuote, onOpenImage, onOpenFile, onReact }: BubbleProps) {
  const { colors, isDark } = useTheme();
  const c = useChatColors();
  const a = m.attachment;
  const ratio = a?.kind === 'image' && a.width && a.height ? Math.min(1.5, Math.max(0.6, a.height / a.width)) : 1;
  const R = 14;
  const tail = firstInRun ? 2 : R;

  return (
    <View style={[styles.wrap, m.mine ? styles.mine : styles.theirs, firstInRun ? styles.gapTop : styles.tightTop]}>
      <SwipeToReply onReply={onReply} enabled={!m.deleted}>
        <PressableScale
          onLongPress={onLongPress}
          delayLongPress={250}
          scaleTo={0.99}
          accessibilityLabel={`${m.mine ? 'You' : m.senderName}: ${m.deleted ? 'deleted message' : m.body || (a ? (a.kind === 'image' ? 'a photo' : a.name) : '')}. Press and hold for options.`}>
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: m.mine ? c.mine : c.theirs,
                borderTopLeftRadius: m.mine ? R : tail,
                borderTopRightRadius: m.mine ? tail : R,
                borderBottomLeftRadius: R,
                borderBottomRightRadius: R,
              },
              !isDark ? styles.lift : null,
            ]}>
            {showSender && !m.mine ? (
              <Text variant="caption" style={[styles.sender, { color: nameColor(m.senderId) }]}>
                {m.senderName}
              </Text>
            ) : null}

            {m.deleted ? (
              <Text variant="body" style={[styles.deleted, { color: c.meta }]}>
                🚫 {m.mine ? 'You deleted this message' : 'This message was deleted'}
              </Text>
            ) : (
              <>
                {m.replyTo ? <QuoteBlock quote={m.replyTo} mine={m.mine} onPress={() => onOpenQuote(m.replyTo!.id)} /> : null}

                {a?.kind === 'image' && a.thumbUrl ? (
                  <Pressable onPress={() => onOpenImage(a.url)} onLongPress={onLongPress} accessibilityRole="imagebutton" accessibilityLabel="Open photo">
                    <Image source={{ uri: a.thumbUrl }} style={{ width: IMAGE_WIDTH, height: IMAGE_WIDTH * ratio, borderRadius: 10, backgroundColor: c.quoteTheirs }} resizeMode="cover" />
                  </Pressable>
                ) : null}

                {a?.kind === 'file' ? (
                  <Pressable onPress={() => onOpenFile(a.url)} onLongPress={onLongPress} accessibilityRole="button" accessibilityLabel={`Open ${a.name}`} style={[styles.file, { backgroundColor: m.mine ? c.quoteMine : c.quoteTheirs }]}>
                    <View style={[styles.fileIcon, { backgroundColor: c.doc }]}>
                      <FileText size={22} color="#FFFFFF" />
                    </View>
                    <View style={styles.fileText}>
                      <Text variant="smallStrong" numberOfLines={2} style={{ color: c.text }}>
                        {a.name}
                      </Text>
                      <Text variant="caption" style={{ color: c.meta }}>
                        {kindLabel(a.mime)} · {fileSize(a.bytes)}
                      </Text>
                    </View>
                  </Pressable>
                ) : null}

                {m.body ? (
                  <Text variant="body" style={[{ color: c.text }, a || m.replyTo ? styles.caption : undefined]}>
                    {m.body}
                  </Text>
                ) : null}
              </>
            )}

            <View style={styles.meta}>
              <Text variant="caption" style={{ color: c.meta }}>
                {clock(m.createdAt)}
              </Text>
              {m.mine && delivery ? <Ticks status={delivery} /> : null}
            </View>
          </View>
        </PressableScale>
      </SwipeToReply>

      {m.reactions.length > 0 ? (
        <View style={[styles.reactions, m.mine ? styles.reactionsMine : styles.reactionsTheirs]}>
          {m.reactions.map(r => (
            <PressableScale
              key={r.emoji}
              onPress={() => onReact(r.emoji)}
              scaleTo={0.92}
              accessibilityRole="button"
              accessibilityLabel={`${r.emoji} ${r.count}${r.mine ? ', yours' : ''}`}
              style={[styles.pill, { backgroundColor: c.panel, borderColor: r.mine ? colors.primary : c.border }]}>
              <Text variant="small">{r.emoji}</Text>
              {r.count > 1 ? (
                <Text variant="caption" style={[styles.count, { color: c.meta }]}>
                  {r.count}
                </Text>
              ) : null}
            </PressableScale>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** "Ayesha added Bilal" in the middle of a group. */
export function SystemLine({ text }: { text: string }) {
  const c = useChatColors();
  return (
    <View style={styles.center}>
      <View style={[styles.chip, { backgroundColor: c.quoteTheirs }]}>
        <Text variant="caption" style={[styles.chipText, { color: c.meta }]}>
          {text}
        </Text>
      </View>
    </View>
  );
}

/** "Today", "Yesterday" ... between the days. */
export function DayChip({ label }: { label: string }) {
  const c = useChatColors();
  return (
    <View style={[styles.center, styles.dayGap]}>
      <View style={[styles.chip, styles.dayChip, { backgroundColor: c.panel }]}>
        <Text variant="caption" style={[styles.chipText, { color: c.meta }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/** The strip above the message box while replying. */
export function ReplyBanner({ message, onCancel }: { message: ChatMessage | null; onCancel: () => void }) {
  const c = useChatColors();
  if (!message) {
    return null;
  }
  const a = message.attachment;
  const text = message.body || (a?.kind === 'image' ? '📷 Photo' : a ? `📄 ${a.name}` : '');
  return (
    <View style={[styles.banner, { backgroundColor: c.wallpaper }]}>
      <View style={[styles.bannerCard, { backgroundColor: c.panel, borderLeftColor: nameColor(message.senderId) }]}>
        <Text variant="caption" style={{ color: nameColor(message.senderId), fontWeight: '700' }} numberOfLines={1}>
          {message.mine ? 'You' : message.senderName}
        </Text>
        <Text variant="small" numberOfLines={1} style={{ color: c.meta }}>
          {text}
        </Text>
      </View>
      <Pressable onPress={onCancel} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cancel reply" style={[styles.bannerClose, { backgroundColor: c.panel }]}>
        <X size={18} color={c.icon} />
      </Pressable>
    </View>
  );
}

/** The message box: a rounded field with the paperclip and camera inside it, and a round send button. */
export function Composer({
  text,
  onText,
  onSend,
  onAttach,
  onCamera,
  inputRef,
}: {
  text: string;
  onText: (t: string) => void;
  onSend: () => void;
  onAttach: () => void;
  onCamera: () => void;
  inputRef: React.RefObject<React.ComponentRef<typeof TextInput> | null>;
}) {
  const { colors, typography } = useTheme();
  const c = useChatColors();
  const insets = useSafeAreaInsets();
  const empty = text.trim().length === 0;
  return (
    <View style={[styles.composer, { backgroundColor: c.wallpaper, paddingBottom: insets.bottom + 8 }]}>
      <View style={[styles.field, { backgroundColor: c.panel }]}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={onText}
          placeholder="Message"
          placeholderTextColor={c.meta}
          multiline
          maxLength={1000}
          style={[styles.input, typography.body, { color: c.text }]}
        />
        <Pressable onPress={onAttach} hitSlop={8} accessibilityRole="button" accessibilityLabel="Attach a photo or document" style={styles.fieldIcon}>
          <PaperclipIcon color={c.icon} />
        </Pressable>
        {empty ? (
          <Pressable onPress={onCamera} hitSlop={8} accessibilityRole="button" accessibilityLabel="Take a photo" style={styles.fieldIcon}>
            <Camera size={22} color={c.icon} />
          </Pressable>
        ) : null}
      </View>
      <PressableScale onPress={onSend} disabled={empty} scaleTo={0.92} accessibilityRole="button" accessibilityLabel="Send" style={[styles.sendButton, { backgroundColor: colors.primary, opacity: empty ? 0.45 : 1 }]}>
        <Send size={22} color={colors.onPrimary} />
      </PressableScale>
    </View>
  );
}

// The paperclip is tilted like WhatsApp's.
function PaperclipIcon({ color }: { color: string }) {
  return (
    <View style={styles.tilt}>
      <Paperclip size={22} color={color} />
    </View>
  );
}

interface ActionsProps {
  message: ChatMessage | null;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onReport: () => void;
}

/** Press and hold a message: a row of reactions, and below it reply, copy, delete, report. */
export function MessageActions({ message, onClose, onReact, onReply, onCopy, onDelete, onReport }: ActionsProps) {
  const { colors, shadow } = useTheme();
  const c = useChatColors();
  const insets = useSafeAreaInsets();
  const mine = message?.reactions.find(r => r.mine)?.emoji;
  const Row = ({ icon: Icon, label, onPress, danger }: { icon: typeof Reply; label: string; onPress: () => void; danger?: boolean }) => (
    <PressableScale onPress={onPress} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={label} style={styles.action}>
      <Icon size={22} color={danger ? colors.danger : c.icon} />
      <Text variant="body" style={{ color: danger ? colors.danger : c.text }}>
        {label}
      </Text>
    </PressableScale>
  );
  return (
    <Modal visible={message !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <View style={[styles.floating, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
          {message && !message.deleted && message.kind === 'text' ? (
            <Pressable onPress={() => undefined} style={[styles.emojiCard, { backgroundColor: c.panel }, shadow(3)]}>
              {CHAT_REACTIONS.map(e => (
                <PressableScale
                  key={e}
                  onPress={() => onReact(e)}
                  scaleTo={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`React ${e}`}
                  accessibilityState={{ selected: mine === e }}
                  style={[styles.emoji, { backgroundColor: mine === e ? c.quoteTheirs : 'transparent' }]}>
                  <Text style={styles.emojiText}>{e}</Text>
                </PressableScale>
              ))}
            </Pressable>
          ) : null}
          <Pressable onPress={() => undefined} style={[styles.menuCard, { backgroundColor: c.panel }, shadow(3)]}>
            {message && !message.deleted ? <Row icon={Reply} label="Reply" onPress={onReply} /> : null}
            {message && !message.deleted && message.body ? <Row icon={Copy} label="Copy" onPress={onCopy} /> : null}
            {message && message.kind === 'text' ? <Row icon={Trash2} label="Delete" onPress={onDelete} danger /> : null}
            {message && !message.mine && !message.deleted ? <Row icon={Flag} label="Report" onPress={onReport} danger /> : null}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

interface AttachProps {
  open: boolean;
  onClose: () => void;
  onPhoto: () => void;
  onCamera: () => void;
  onDocument: () => void;
}

/** The paperclip menu: a small card floating above the message box, with round coloured icons. */
export function AttachSheet({ open, onClose, onPhoto, onCamera, onDocument }: AttachProps) {
  const { shadow } = useTheme();
  const c = useChatColors();
  const insets = useSafeAreaInsets();
  const Item = ({ icon: Icon, label, tint, onPress }: { icon: typeof Camera; label: string; tint: string; onPress: () => void }) => (
    <PressableScale onPress={onPress} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={label} style={styles.attachItem}>
      <View style={[styles.attachIcon, { backgroundColor: tint }]}>
        <Icon size={26} color="#FFFFFF" />
      </View>
      <Text variant="smallStrong" style={{ color: c.text }}>
        {label}
      </Text>
    </PressableScale>
  );
  // A bottom sheet fixed to the lower edge: it always looks the same, with or without the keyboard.
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={styles.attachBackdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable onPress={() => undefined} style={[styles.attachSheet, { backgroundColor: c.panel, paddingBottom: insets.bottom + 24 }, shadow(3)]}>
          <View style={[styles.attachHandle, { backgroundColor: c.border }]} />
          <Text variant="cardTitle" style={[styles.attachTitle, { color: c.text }]}>
            Share
          </Text>
          <View style={styles.attachRow}>
            <Item icon={FileText} label="Document" tint={c.doc} onPress={onDocument} />
            <Item icon={Camera} label="Camera" tint={c.camera} onPress={onCamera} />
            <Item icon={ImageIcon} label="Gallery" tint={c.gallery} onPress={onPhoto} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface PreviewProps {
  files: PickedPhoto[];
  caption: string;
  onCaption: (t: string) => void;
  onRemove: (index: number) => void;
  onCancel: () => void;
  onSend: () => void;
}

/** Before sending: see the pictures (or the document), add a caption, then send. */
export function SendPreview({ files, caption, onCaption, onRemove, onCancel, onSend }: PreviewProps) {
  const { colors, typography } = useTheme();
  const c = useChatColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isImage = (f: PickedPhoto) => f.type.startsWith('image/');
  return (
    <Modal visible={files.length > 0} animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.previewRoot, { paddingTop: insets.top }]}>
        <View style={styles.previewTop}>
          <Pressable onPress={onCancel} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cancel">
            <X size={26} color="#FFFFFF" />
          </Pressable>
        </View>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.previewPager}>
          {files.map((f, i) => (
            <View key={`${f.uri}-${i}`} style={[styles.previewPage, { width }]}>
              {isImage(f) ? (
                <Image source={{ uri: f.uri }} style={styles.previewImage} resizeMode="contain" />
              ) : (
                <View style={styles.previewDoc}>
                  <View style={[styles.previewDocIcon, { backgroundColor: c.doc }]}>
                    <FileText size={44} color="#FFFFFF" />
                  </View>
                  <Text variant="body" style={styles.previewDocName} numberOfLines={3}>
                    {f.name}
                  </Text>
                </View>
              )}
              {files.length > 1 ? (
                <Pressable onPress={() => onRemove(i)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Remove this one" style={styles.previewRemove}>
                  <Trash2 size={20} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </View>
          ))}
        </ScrollView>
        <View style={[styles.previewBar, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            value={caption}
            onChangeText={onCaption}
            placeholder="Add a caption..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            maxLength={1000}
            multiline
            style={[styles.previewInput, typography.body]}
          />
          <PressableScale onPress={onSend} scaleTo={0.92} accessibilityRole="button" accessibilityLabel={`Send ${files.length > 1 ? `${files.length} files` : ''}`} style={[styles.sendButton, { backgroundColor: colors.primary }]}>
            <Send size={22} color={colors.onPrimary} />
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

/** A picture, full screen. Tap anywhere to close. */
export function ImageViewer({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={uri !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.viewer} onPress={onClose} accessibilityLabel="Close photo">
        {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" /> : null}
        <View style={[styles.close, { top: insets.top + 12 }]}>
          <X size={24} color="#FFFFFF" />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBack: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerWho: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  headerText: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 6 },
  wrap: { maxWidth: '84%' },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  gapTop: { marginTop: 8 },
  tightTop: { marginTop: 2 },
  bubble: { paddingHorizontal: 9, paddingTop: 6, paddingBottom: 4, minWidth: 64 },
  lift: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 1, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  sender: { marginBottom: 2, fontWeight: '700' },
  caption: { marginTop: 6 },
  deleted: { fontStyle: 'italic' },
  meta: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 3, marginTop: 1 },
  quote: { borderLeftWidth: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 6, minWidth: 150 },
  quoteText: { marginTop: 1 },
  swipeIcon: { position: 'absolute', left: -2, top: '50%', marginTop: -14, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  file: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 220, padding: 8, borderRadius: 10 },
  fileIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fileText: { flex: 1 },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: -8 },
  reactionsMine: { justifyContent: 'flex-end', paddingRight: 8 },
  reactionsTheirs: { justifyContent: 'flex-start', paddingLeft: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderRadius: 14 },
  count: { marginLeft: 1 },
  center: { alignItems: 'center', marginVertical: 6 },
  dayGap: { marginTop: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  dayChip: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 1, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  chipText: { textAlign: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingTop: 8 },
  bannerCard: { flex: 1, borderLeftWidth: 4, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  bannerClose: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 8, paddingTop: 6 },
  field: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: 26, paddingLeft: 16, paddingRight: 8, minHeight: 48 },
  input: { flex: 1, maxHeight: 120, paddingTop: 11, paddingBottom: 11, paddingRight: 6 },
  fieldIcon: { width: 38, height: 48, alignItems: 'center', justifyContent: 'center' },
  tilt: { transform: [{ rotate: '-45deg' }] },
  sendButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  attachBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'flex-end' },
  floating: { paddingHorizontal: 12, gap: 10, alignItems: 'stretch' },
  emojiCard: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: 30, paddingHorizontal: 8, paddingVertical: 6 },
  emoji: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 28, lineHeight: 34 },
  menuCard: { borderRadius: 20, paddingVertical: 6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 50, paddingHorizontal: 20 },
  attachSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 20 },
  attachHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14 },
  attachTitle: { marginBottom: 18 },
  attachRow: { flexDirection: 'row', justifyContent: 'space-around' },
  attachItem: { alignItems: 'center', gap: 10, minWidth: 84 },
  attachIcon: { width: 60, height: 60, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  previewRoot: { flex: 1, backgroundColor: '#000' },
  previewTop: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 16, paddingVertical: 12 },
  previewPager: { flex: 1 },
  previewPage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '100%' },
  previewDoc: { alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  previewDocIcon: { width: 96, height: 96, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  previewDocName: { color: '#FFFFFF', textAlign: 'center' },
  previewRemove: { position: 'absolute', right: 16, top: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  previewBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 10, paddingTop: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  previewInput: { flex: 1, maxHeight: 110, color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10 },
  viewer: { flex: 1, backgroundColor: '#000' },
  close: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});
