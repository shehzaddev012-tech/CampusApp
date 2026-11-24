import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Eye, Lock, Trash2, UserRound } from 'lucide-react-native';

import { Button, Card, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { useSession } from '../../store/sessionStore';
import { GUTTER, useTheme } from '../../theme';
import { confirm } from '../../utils/confirm';

type Props = NativeStackScreenProps<AppStackParamList, 'Privacy'>;

/** Plain words about what the app keeps, who can see it, and how to delete it. */
export function PrivacyScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const university = useSession(s => s.university);
  const deleteAccount = useSession(s => s.deleteAccount);
  const uni = university?.name ?? 'your university';

  const confirmDelete = async () => {
    if (await confirm({ title: 'Delete your account?', message: 'This permanently deletes your profile, membership and photos. This cannot be undone.', confirmLabel: 'Delete everything' })) {
      deleteAccount();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Privacy and data" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Section icon={UserRound} title="What IAC Campus keeps about you">
          Your name, email address, student ID, school and profile picture, and what you post yourself: updates, photos, notes, messages and event tickets. It does not use your location.
        </Section>
        <Section icon={Eye} title="Who can see it">
          Only approved students and staff of {uni}. Other students see your name, picture and school. Your email and student ID are visible to the university admins who approve members. Nothing is shown to people outside {uni}.
        </Section>
        <Section icon={Lock} title="Camera and files">
          The camera is used only when you take a chat or profile photo, or when a gate guard scans a ticket. Files you choose are uploaded only when you send them.
        </Section>

        <Card padding={16} style={styles.delete}>
          <View style={styles.deleteHead}>
            <Trash2 size={18} color={colors.danger} />
            <Text variant="bodyStrong" style={styles.deleteTitle}>
              Delete my account
            </Text>
          </View>
          <Text variant="small" color="textSecondary" style={styles.deleteText}>
            Removes your profile, your membership and the photos you uploaded. You can create a new account later, but nothing can be brought back.
          </Text>
          <Button title="Delete account" variant="danger" onPress={confirmDelete} />
        </Card>
      </ScrollView>
    </View>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Lock; title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
        <Icon size={18} color={colors.text} />
      </View>
      <View style={styles.sectionText}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="body" color="textSecondary" style={styles.body}>
          {children}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 12 },
  section: { flexDirection: 'row', gap: 14, marginBottom: 26 },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sectionText: { flex: 1 },
  body: { marginTop: 4 },
  delete: { marginTop: 8 },
  deleteHead: { flexDirection: 'row', alignItems: 'center' },
  deleteTitle: { marginLeft: 10 },
  deleteText: { marginVertical: 10 },
});
