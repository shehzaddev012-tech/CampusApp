import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BadgeCheck, Share2 } from 'lucide-react-native';

import { Badge, Button, Card, IconButton, Input, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import type { CvData } from '../../types/domain';
import { FormError } from '../auth/AuthPage';

type Props = NativeStackScreenProps<AppStackParamList, 'Cv'>;

const month = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

/** A plain-text CV the student can send anywhere. Verified items come from the university's own records. */
function asText(cv: CvData, summary: string, skills: string[], links: string[]): string {
  const lines: string[] = [cv.name.toUpperCase(), `${cv.department} · ${cv.university}`, `${cv.email}`, ''];
  if (summary) {
    lines.push('SUMMARY', summary, '');
  }
  if (skills.length) {
    lines.push('SKILLS', skills.join(', '), '');
  }
  if (cv.societies.length) {
    lines.push('SOCIETIES', ...cv.societies.map(s => `- ${s.name}${s.role === 'head' ? ' (head)' : ''}`), '');
  }
  if (cv.eventsAttended.length) {
    lines.push('EVENTS ATTENDED (verified by the university)', ...cv.eventsAttended.map(e => `- ${e.title}, ${month(e.date)}`), '');
  }
  if (cv.volunteering.length) {
    lines.push('VOLUNTEERING (verified by the university)', ...cv.volunteering.map(e => `- ${e.title}, ${month(e.date)}`), '');
  }
  if (links.length) {
    lines.push('LINKS', ...links, '');
  }
  return lines.join('\n').trim();
}

export function CvScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const [cv, setCv] = useState<CvData | null>(null);
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [links, setLinks] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      backend.career
        .cv()
        .then(d => {
          setCv(d);
          setSummary(d.summary);
          setSkills(d.skills.join(', '));
          setLinks(d.links.join('\n'));
        })
        .catch(() => undefined);
    }, []),
  );

  const skillList = skills.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  const linkList = links.split('\n').map(s => s.trim()).filter(Boolean);

  const save = async (quiet = false): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await backend.career.saveCvProfile({ summary: summary.trim(), skills: skillList, links: linkList });
      if (!quiet) {
        show({ title: 'CV saved', tone: 'success' });
      }
      return true;
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Something went wrong. Please try again.';
      setError(msg);
      show({ title: 'Could not save your CV', body: msg, tone: 'alert' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!cv || !(await save(true))) {
      return;
    }
    try {
      await Share.share({ title: `${cv.name} - CV`, message: asText(cv, summary.trim(), skillList, linkList) });
    } catch {
      show({ title: 'Could not open sharing', tone: 'alert' });
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar title="My CV" onBack={() => navigation.goBack()} right={cv ? <IconButton icon={Share2} onPress={share} accessibilityLabel="Share my CV" /> : undefined} />
      {!cv ? (
        <View style={styles.pad}>
          <Skeleton height={200} radius={20} />
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          <Card padding={16}>
            <Text variant="title3">{cv.name}</Text>
            <Text variant="small" color="textSecondary" style={styles.top}>
              {cv.department}
            </Text>
            <Text variant="small" color="textSecondary">
              {cv.university}
            </Text>
            <Text variant="caption" color="textTertiary" style={styles.top}>
              {cv.email}
            </Text>
          </Card>

          <View style={styles.field}>
            <Input label="Summary" placeholder="Two or three lines about you and what you are looking for." value={summary} onChangeText={setSummary} multiline maxLength={600} />
          </View>
          <View style={styles.field}>
            <Input label="Skills" placeholder="TypeScript, SQL, Public speaking" value={skills} onChangeText={setSkills} hint="Separate with commas. Up to 15." />
          </View>
          <View style={styles.field}>
            <Input label="Links (https only, up to 3)" placeholder={'https://github.com/you\nhttps://linkedin.com/in/you'} value={links} onChangeText={setLinks} multiline autoCapitalize="none" />
          </View>

          <View style={styles.verified}>
            <BadgeCheck size={18} color={colors.primary} />
            <Text variant="cardTitle" style={styles.verifiedText}>
              Verified by {cv.university}
            </Text>
          </View>
          <Text variant="caption" color="textTertiary" style={styles.note}>
            These come from the university’s own records, so employers can trust them. You cannot edit them.
          </Text>

          <Section title="Societies" empty="Join a society and it appears here.">
            {cv.societies.map(s => (
              <Row key={s.name} label={s.name} right={s.role === 'head' ? <Badge label="Head" tone="ink" /> : undefined} />
            ))}
          </Section>
          <Section title="Events attended" empty="Check in at events and they appear here.">
            {cv.eventsAttended.map(e => (
              <Row key={`${e.title}${e.date}`} label={e.title} sub={month(e.date)} />
            ))}
          </Section>
          {cv.volunteering.length > 0 ? (
            <Section title="Volunteering" empty="">
              {cv.volunteering.map(e => (
                <Row key={`${e.title}${e.date}`} label={e.title} sub={month(e.date)} />
              ))}
            </Section>
          ) : null}

          <View style={styles.field}>
            <FormError message={error} />
            <Button title="Save" variant="soft" onPress={() => save()} loading={busy} />
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  return (
    <View style={styles.section}>
      <Text variant="cardTitle" style={styles.sectionTitle}>
        {title}
      </Text>
      {items.length > 0 ? items : <Text variant="small" color="textTertiary">{empty}</Text>}
    </View>
  );
}

function Row({ label, sub, right }: { label: string; sub?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text variant="body" numberOfLines={2}>
          {label}
        </Text>
        {sub ? (
          <Text variant="caption" color="textTertiary">
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: GUTTER },
  content: { paddingHorizontal: GUTTER, paddingTop: 16 },
  top: { marginTop: 4 },
  field: { marginTop: 20 },
  verified: { flexDirection: 'row', alignItems: 'center', marginTop: 28 },
  verifiedText: { marginLeft: 8 },
  note: { marginTop: 4 },
  section: { marginTop: 20 },
  sectionTitle: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  rowText: { flex: 1 },
});
