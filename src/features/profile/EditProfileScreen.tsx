import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Camera, Image as ImageIcon, Trash2, User } from 'lucide-react-native';

import { Avatar, BrandLoader, Button, Input, PressableScale, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useSession } from '../../store/sessionStore';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import { confirm } from '../../utils/confirm';

type Props = NativeStackScreenProps<AppStackParamList, 'EditProfile'>;

/** Change my name and my profile picture. */
export function EditProfileScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const user = useSession(s => s.user);
  const updateUser = useSession(s => s.updateUser);
  const [name, setName] = useState(user?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameOk = name.trim().length >= 2;
  const changed = name.trim() !== (user?.name ?? '');

  const upload = async (a: { uri?: string; fileName?: string; type?: string } | undefined) => {
    if (!a?.uri) {
      return;
    }
    setPhotoBusy(true);
    try {
      const url = await backend.profile.setPhoto({ uri: a.uri, name: a.fileName ?? 'me.jpg', type: a.type ?? 'image/jpeg' });
      updateUser({ photoUrl: url });
      show({ title: 'Photo updated', tone: 'success' });
    } catch (e) {
      show({ title: 'Could not update the photo', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    } finally {
      setPhotoBusy(false);
    }
  };

  const fromGallery = async () => upload((await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8, maxWidth: 1200, maxHeight: 1200 })).assets?.[0]);
  const fromCamera = async () => {
    const res = await launchCamera({ mediaType: 'photo', quality: 0.8, maxWidth: 1200, maxHeight: 1200, cameraType: 'front', saveToPhotos: false });
    if (res.errorCode) {
      show({ title: 'Camera not available', body: res.errorCode === 'permission' ? 'Allow camera access in Settings.' : 'This phone has no camera we can use.', tone: 'alert' });
      return;
    }
    await upload(res.assets?.[0]);
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Remove your photo?', message: 'Your initials will be shown instead.', confirmLabel: 'Remove' }))) {
      return;
    }
    setPhotoBusy(true);
    try {
      await backend.profile.removePhoto();
      updateUser({ photoUrl: null });
    } catch (e) {
      show({ title: 'Could not remove the photo', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    } finally {
      setPhotoBusy(false);
    }
  };

  const save = async () => {
    if (!nameOk || !changed || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await backend.profile.rename(name.trim());
      updateUser({ name: name.trim() });
      show({ title: 'Profile saved', tone: 'success' });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar title="Edit profile" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.photoBlock}>
          <View style={styles.photoWrap}>
            <Avatar name={user?.name ?? 'Student'} uri={user?.photoUrl} size={112} />
            {photoBusy ? (
              <View style={[styles.photoBusy, { backgroundColor: colors.background }]}>
                <BrandLoader size={44} />
              </View>
            ) : null}
          </View>
          <View style={styles.photoActions}>
            <Action icon={ImageIcon} label="Gallery" onPress={fromGallery} disabled={photoBusy} />
            <Action icon={Camera} label="Camera" onPress={fromCamera} disabled={photoBusy} />
            {user?.photoUrl ? <Action icon={Trash2} label="Remove" onPress={remove} disabled={photoBusy} danger /> : null}
          </View>
        </View>

        <Input label="Your name" icon={User} value={name} onChangeText={setName} maxLength={80} autoCapitalize="words" error={name.length > 0 && !nameOk ? 'Your name needs at least 2 characters.' : null} />
        <Text variant="caption" color="textTertiary" style={styles.hint}>
          Your name and picture are shown to other students at your university. Your student ID and school are set when you join and can only be changed by an admin.
        </Text>
        {error ? (
          <Text variant="small" color="danger" style={styles.hint}>
            {error}
          </Text>
        ) : null}
        <View style={styles.save}>
          <Button title="Save" onPress={save} loading={busy} disabled={!nameOk || !changed} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Action({ icon: Icon, label, onPress, disabled, danger }: { icon: typeof Camera; label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  const { colors } = useTheme();
  const tint = danger ? colors.danger : colors.text;
  return (
    <PressableScale onPress={onPress} disabled={disabled} scaleTo={0.95} accessibilityRole="button" accessibilityLabel={label} style={[styles.action, { backgroundColor: colors.surfaceAlt, opacity: disabled ? 0.5 : 1 }]}>
      <Icon size={18} color={tint} />
      <Text variant="smallStrong" style={{ color: tint }}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 12 },
  photoBlock: { alignItems: 'center', marginBottom: 28 },
  photoWrap: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  photoBusy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 56, opacity: 0.85, alignItems: 'center', justifyContent: 'center' },
  photoActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, minHeight: 40, borderRadius: 20 },
  hint: { marginTop: 10 },
  save: { marginTop: 24 },
});
