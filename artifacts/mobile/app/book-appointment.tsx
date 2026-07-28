import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Animated, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiRequest } from '@/lib/api';

const APPT_TYPES = ['Follow-up', 'Consultation', 'Procedure', 'Vaccination', 'Emergency', 'Routine Check'];
const DURATIONS = ['15 min', '30 min', '45 min', '60 min', '90 min'];

function LabeledInput({ label, value, onChangeText, placeholder, required, multiline, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; required?: boolean; multiline?: boolean; keyboardType?: any;
}) {
  const colors = useColors();
  return (
    <View style={liStyles.group}>
      <Text style={[liStyles.label, { color: colors.foreground }]}>
        {label}{required ? <Text style={{ color: colors.destructive }}> *</Text> : ''}
      </Text>
      <TextInput
        style={[liStyles.input, {
          backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground,
          height: multiline ? 88 : 48, textAlignVertical: multiline ? 'top' : 'center',
          paddingTop: multiline ? 12 : 0,
        }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}
const liStyles = StyleSheet.create({
  group: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: 'Tajawal_500Medium', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14,
    fontSize: 15, fontFamily: 'Tajawal_400Regular',
  },
});

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[chipStyles.chip, {
        backgroundColor: selected ? colors.primary : colors.card,
        borderColor: selected ? colors.primary : colors.border,
      }]}
      onPress={onPress} activeOpacity={0.75}
    >
      <Text style={[chipStyles.text, { color: selected ? '#FFF' : colors.foreground }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const chipStyles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, margin: 4 },
  text: { fontSize: 13, fontFamily: 'Tajawal_500Medium' },
});

export default function BookAppointmentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { patientId, patientName } = useLocalSearchParams<{ patientId: string; patientName: string }>();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [apptType, setApptType] = useState('');
  const [duration, setDuration] = useState('30 min');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiRequest('/appointments', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/appointments'] });
      qc.invalidateQueries({ queryKey: [`/appointments?date=${date}`] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: (e: any) => {
      setError(e.message ?? 'Failed to book appointment');
      shake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleSubmit = () => {
    if (!date.trim() || !time.trim()) {
      setError('Please enter a date and time.');
      shake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setError('');
    // Build ISO datetime from date + time
    const scheduledAt = `${date}T${time}:00`;
    mutation.mutate({
      patientId: Number(patientId),
      scheduledAt,
      type: apptType || undefined,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
      status: 'scheduled',
    });
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.root, { paddingTop: topPad }]}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.title}>Book Appointment</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: botPad + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Patient banner */}
          <View style={[s.patientBanner, { backgroundColor: colors.primaryLight }]}>
            <View style={[s.patientAvatar, { backgroundColor: colors.primary }]}>
              <Text style={s.patientAvatarText}>
                {decodeURIComponent(patientName ?? '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[s.patientLabel, { color: colors.mutedForeground }]}>Patient</Text>
              <Text style={[s.patientName, { color: colors.foreground }]} numberOfLines={1}>
                {decodeURIComponent(patientName ?? 'Unknown')}
              </Text>
            </View>
          </View>

          {/* Error */}
          {error ? (
            <Animated.View style={[s.errorBanner, { backgroundColor: colors.destructiveLight, transform: [{ translateX: shakeAnim }] }]}>
              <Ionicons name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[s.errorText, { color: colors.destructive }]}>{error}</Text>
            </Animated.View>
          ) : null}

          {/* Date & Time */}
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <LabeledInput label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" required keyboardType="numeric" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <LabeledInput label="Time" value={time} onChangeText={setTime} placeholder="HH:MM" required keyboardType="numeric" />
            </View>
          </View>

          {/* Appointment type */}
          <Text style={[liStyles.label, { color: colors.foreground, marginBottom: 8 }]}>Appointment Type</Text>
          <View style={s.chipsWrap}>
            {APPT_TYPES.map(t => (
              <Chip key={t} label={t} selected={apptType === t} onPress={() => setApptType(apptType === t ? '' : t)} />
            ))}
          </View>

          {/* Duration */}
          <Text style={[liStyles.label, { color: colors.foreground, marginBottom: 8, marginTop: 4 }]}>Duration</Text>
          <View style={s.chipsWrap}>
            {DURATIONS.map(d => (
              <Chip key={d} label={d} selected={duration === d} onPress={() => setDuration(d)} />
            ))}
          </View>

          {/* Reason */}
          <View style={{ marginTop: 8 }}>
            <LabeledInput label="Reason for Visit" value={reason} onChangeText={setReason} placeholder="e.g. Follow-up after fever…" multiline />
          </View>

          {/* Notes */}
          <LabeledInput label="Additional Notes" value={notes} onChangeText={setNotes} placeholder="Any special instructions…" multiline />

          {/* Summary card */}
          <View style={[s.summary, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Text style={[s.summaryTitle, { color: colors.primary }]}>Appointment Summary</Text>
            {[
              ['Patient', decodeURIComponent(patientName ?? '')],
              ['Date', date],
              ['Time', time],
              ['Type', apptType],
            ].filter(([, v]) => v).map(([k, v]) => (
              <View key={k} style={s.summaryRow}>
                <Text style={[s.summaryKey, { color: colors.primary }]}>{k}</Text>
                <Text style={[s.summaryVal, { color: colors.foreground }]}>{v}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* CTA */}
        <View style={[s.footer, { paddingBottom: botPad + 12, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[s.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={mutation.isPending}
            activeOpacity={0.85}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="calendar-outline" size={20} color="#FFF" />
                <Text style={s.submitText}>Confirm Appointment</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: c.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.muted, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: 'Tajawal_700Bold', color: c.foreground },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  patientBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 14, marginBottom: 20,
  },
  patientAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  patientAvatarText: { color: '#FFF', fontSize: 16, fontFamily: 'Tajawal_700Bold' },
  patientLabel: { fontSize: 11, fontFamily: 'Tajawal_400Regular', marginBottom: 2 },
  patientName: { fontSize: 16, fontFamily: 'Tajawal_700Bold' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Tajawal_400Regular' },
  row: { flexDirection: 'row' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 8 },
  summary: {
    borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 8,
    borderWidth: 1.5, gap: 8,
  },
  summaryTitle: { fontSize: 13, fontFamily: 'Tajawal_700Bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryKey: { fontSize: 13, fontFamily: 'Tajawal_500Medium' },
  summaryVal: { fontSize: 13, fontFamily: 'Tajawal_400Regular' },
  footer: {
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: c.card, borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitBtn: {
    height: 52, borderRadius: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  submitText: { color: '#FFF', fontSize: 16, fontFamily: 'Tajawal_700Bold' },
});
