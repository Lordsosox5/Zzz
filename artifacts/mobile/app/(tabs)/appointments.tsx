import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';

interface Appointment {
  id: number;
  date?: string;
  time?: string;
  status: string;
  type?: string;
  reason?: string;
  patients?: { nameEn: string; mrn?: string };
  patientName?: string;
  doctor?: string;
  doctorName?: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  scheduled: { color: '#D97706', bg: '#FEF3C7', label: 'Scheduled' },
  completed: { color: '#16A34A', bg: '#DCFCE7', label: 'Completed' },
  cancelled: { color: '#EF4444', bg: '#FEE2E2', label: 'Cancelled' },
  confirmed: { color: '#0A66C2', bg: '#E8F1FB', label: 'Confirmed' },
  pending: { color: '#D97706', bg: '#FEF3C7', label: 'Pending' },
};

function ApptCard({ item }: { item: Appointment }) {
  const colors = useColors();
  const status = STATUS_CONFIG[item.status] ?? { color: colors.mutedForeground, bg: colors.muted, label: item.status };
  const patientName = item.patientName ?? item.patients?.nameEn ?? 'Unknown Patient';
  const doctor = item.doctor ?? item.doctorName ?? '';

  return (
    <View style={[apptStyles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      <View style={[apptStyles.timePill, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="time-outline" size={14} color={colors.primary} />
        <Text style={[apptStyles.time, { color: colors.primary }]}>{item.time ?? '—'}</Text>
      </View>
      <View style={apptStyles.body}>
        <Text style={[apptStyles.patient, { color: colors.foreground }]} numberOfLines={1}>{patientName}</Text>
        {doctor ? <Text style={[apptStyles.doctor, { color: colors.mutedForeground }]} numberOfLines={1}>{doctor}</Text> : null}
        {item.reason ? <Text style={[apptStyles.reason, { color: colors.mutedForeground }]} numberOfLines={1}>{item.reason}</Text> : null}
      </View>
      <View style={[apptStyles.badge, { backgroundColor: status.bg }]}>
        <Text style={[apptStyles.badgeText, { color: status.color }]}>{status.label}</Text>
      </View>
    </View>
  );
}

const apptStyles = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  timePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, minWidth: 70,
  },
  time: { fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  body: { flex: 1, minWidth: 0 },
  patient: { fontSize: 15, fontFamily: 'Tajawal_700Bold', marginBottom: 2 },
  doctor: { fontSize: 12, fontFamily: 'Tajawal_400Regular' },
  reason: { fontSize: 12, fontFamily: 'Tajawal_400Regular', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
});

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AppointmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);

  // Build 7-day strip
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i - 3);
    return {
      date: d.toISOString().split('T')[0],
      day: DAYS[d.getDay()],
      num: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
    };
  });

  const { data, isLoading, refetch } = useQuery<Appointment[]>({
    queryKey: [`/appointments?date=${selectedDate}`],
    retry: false,
  });

  const appts: Appointment[] = Array.isArray(data) ? data : [];

  const scheduled = appts.filter(a => a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'pending');
  const completed = appts.filter(a => a.status === 'completed');
  const cancelled = appts.filter(a => a.status === 'cancelled');

  const s = appStyles(colors);

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Schedule</Text>
        <Text style={s.subtitle}>{today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
      </View>

      {/* Date strip */}
      <FlatList
        horizontal
        data={days}
        keyExtractor={d => d.date}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.daysContainer}
        renderItem={({ item }) => {
          const isSelected = item.date === selectedDate;
          return (
            <TouchableOpacity
              style={[s.dayBtn, isSelected && { backgroundColor: colors.primary }]}
              onPress={() => setSelectedDate(item.date)}
            >
              <Text style={[s.dayLabel, { color: isSelected ? 'rgba(255,255,255,0.75)' : colors.mutedForeground }]}>
                {item.day}
              </Text>
              <Text style={[s.dayNum, { color: isSelected ? '#FFFFFF' : colors.foreground }]}>
                {item.num}
              </Text>
              {item.isToday && !isSelected && <View style={[s.todayDot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          );
        }}
      />

      {/* Stats row */}
      <View style={s.statsRow}>
        {[
          { label: 'Total', value: appts.length, color: colors.primary },
          { label: 'Scheduled', value: scheduled.length, color: colors.warning },
          { label: 'Completed', value: completed.length, color: colors.success },
          { label: 'Cancelled', value: cancelled.length, color: colors.destructive },
        ].map(st => (
          <View key={st.label} style={[s.statChip, { backgroundColor: colors.card }]}>
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            <Text style={[s.statLabel, { color: colors.mutedForeground }]}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* Appointments list */}
      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={appts}
          keyExtractor={a => String(a.id)}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!appts.length}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No appointments</Text>
              <Text style={[s.emptySub, { color: colors.mutedForeground }]}>Nothing scheduled for this day</Text>
            </View>
          }
          renderItem={({ item }) => <ApptCard item={item} />}
        />
      )}
    </View>
  );
}

const appStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: 20, paddingBottom: 4, paddingTop: 8 },
  title: { fontSize: 28, fontFamily: 'Tajawal_700Bold', color: c.foreground },
  subtitle: { fontSize: 13, color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', marginTop: 1 },
  daysContainer: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  dayBtn: {
    width: 52, height: 68, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.card, borderWidth: 1, borderColor: c.border, gap: 2,
  },
  dayLabel: { fontSize: 11, fontFamily: 'Tajawal_500Medium' },
  dayNum: { fontSize: 20, fontFamily: 'Tajawal_700Bold' },
  todayDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  statChip: {
    flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 3, elevation: 1,
  },
  statValue: { fontSize: 20, fontFamily: 'Tajawal_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Tajawal_400Regular', marginTop: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 80 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold' },
  emptySub: { fontSize: 14, fontFamily: 'Tajawal_400Regular' },
});
