import { ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';

interface DashboardStats {
  totalPatients?: number;
  activeAdmissions?: number;
  todayAppointments?: number;
  pendingLabOrders?: number;
  newPatientsThisMonth?: number;
  criticalAlerts?: number;
}

interface Patient {
  id: number; nameEn: string; nameAr?: string; mrn: string;
  status: string; role?: string; dob?: string;
}

interface Appointment {
  id: number; patientName?: string; time?: string;
  date?: string; status: string; doctor?: string;
  patients?: { nameEn: string };
}

function StatCard({ label, value, icon, color, bg }: {
  label: string; value: number | string; icon: string; color: string; bg: string;
}) {
  const colors = useColors();
  return (
    <View style={[statStyles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[statStyles.value, { color: colors.foreground }]}>{value ?? '—'}</Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1, borderRadius: 16, padding: 16, alignItems: 'flex-start',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
    minWidth: 0,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  value: { fontSize: 26, fontFamily: 'Tajawal_700Bold', lineHeight: 30 },
  label: { fontSize: 12, fontFamily: 'Tajawal_400Regular', marginTop: 2, flexShrink: 1 },
});

function PatientAvatar({ name, colors }: { name: string; colors: ReturnType<typeof useColors> }) {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const hues = ['#0A66C2', '#13A2AE', '#7C3AED', '#DC2626', '#059669', '#D97706'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const bg = hues[hash % hues.length];
  return (
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFF', fontFamily: 'Tajawal_700Bold', fontSize: 14 }}>{initials || '?'}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['/dashboard'],
    retry: false,
  });

  const { data: patientsData, isLoading: patientsLoading, refetch: refetchPatients } = useQuery<{ patients?: Patient[] } | Patient[]>({
    queryKey: ['/patients?limit=5&sort=recent'],
    retry: false,
  });

  const { data: appointmentsData, refetch: refetchAppts } = useQuery<Appointment[]>({
    queryKey: ['/appointments?limit=4'],
    retry: false,
  });

  const isRefreshing = statsLoading || patientsLoading;
  const onRefresh = () => { refetchStats(); refetchPatients(); refetchAppts(); };

  const patientList: Patient[] = Array.isArray(patientsData)
    ? patientsData
    : (patientsData as any)?.patients ?? [];

  const apptList: Appointment[] = Array.isArray(appointmentsData) ? appointmentsData : [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.nameEn?.split(' ')[0] ?? user?.username ?? 'Doctor';

  const s = dashStyles(colors);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={s.greeting}>{greeting},</Text>
          <Text style={s.userName}>{displayName}</Text>
        </View>
        <TouchableOpacity style={s.notifBtn} onPress={() => {}}>
          <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
          <View style={s.notifDot} />
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        {/* Stats Grid */}
        <Text style={s.sectionTitle}>Overview</Text>
        {statsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <View style={s.statsRow}>
              <StatCard
                label="Total Patients" value={stats?.totalPatients ?? '—'}
                icon="people-outline" color={colors.primary} bg={colors.primaryLight}
              />
              <View style={{ width: 12 }} />
              <StatCard
                label="Active Admissions" value={stats?.activeAdmissions ?? '—'}
                icon="bed-outline" color={colors.accent} bg={colors.accentLight}
              />
            </View>
            <View style={[s.statsRow, { marginTop: 12 }]}>
              <StatCard
                label="Today's Appts" value={stats?.todayAppointments ?? '—'}
                icon="calendar-outline" color="#D97706" bg="#FEF3C7"
              />
              <View style={{ width: 12 }} />
              <StatCard
                label="Pending Labs" value={stats?.pendingLabOrders ?? '—'}
                icon="flask-outline" color="#7C3AED" bg="#EDE9FE"
              />
            </View>
          </>
        )}

        {/* Recent Patients */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Patients</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/patients')}>
            <Text style={s.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {patientsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : patientList.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="people-outline" size={36} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No patients yet</Text>
          </View>
        ) : (
          patientList.slice(0, 5).map(p => (
            <TouchableOpacity
              key={p.id}
              style={s.patientRow}
              onPress={() => router.push(`/patient/${p.id}`)}
              activeOpacity={0.75}
            >
              <PatientAvatar name={p.nameEn} colors={colors} />
              <View style={s.patientInfo}>
                <Text style={s.patientName} numberOfLines={1}>{p.nameEn}</Text>
                <Text style={s.patientMrn}>MRN {p.mrn}</Text>
              </View>
              <View style={[s.statusBadge, {
                backgroundColor: p.status === 'active' ? colors.successLight : colors.muted,
              }]}>
                <Text style={[s.statusText, {
                  color: p.status === 'active' ? colors.success : colors.mutedForeground,
                }]}>
                  {p.status === 'active' ? 'Active' : p.status === 'discharged' ? 'Discharged' : p.status}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))
        )}

        {/* Today's Schedule */}
        {apptList.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Today's Schedule</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/appointments')}>
                <Text style={s.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {apptList.slice(0, 3).map(a => (
              <View key={a.id} style={s.apptRow}>
                <View style={[s.apptTimePill, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[s.apptTime, { color: colors.primary }]}>{a.time ?? '—'}</Text>
                </View>
                <View style={s.apptInfo}>
                  <Text style={s.apptPatient} numberOfLines={1}>
                    {a.patientName ?? (a.patients as any)?.nameEn ?? 'Patient'}
                  </Text>
                  <Text style={s.apptDoctor} numberOfLines={1}>{a.doctor ?? 'Appointment'}</Text>
                </View>
                <View style={[s.statusBadge, {
                  backgroundColor: a.status === 'completed' ? colors.successLight
                    : a.status === 'cancelled' ? colors.destructiveLight : colors.warningLight,
                }]}>
                  <Text style={[s.statusText, {
                    color: a.status === 'completed' ? colors.success
                      : a.status === 'cancelled' ? colors.destructive : colors.warning,
                  }]}>
                    {a.status}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const dashStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  header: {
    backgroundColor: c.primary, paddingHorizontal: 24, paddingBottom: 28,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontFamily: 'Tajawal_400Regular' },
  userName: { fontSize: 24, color: '#FFFFFF', fontFamily: 'Tajawal_700Bold', marginTop: 2 },
  notifBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  notifDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: c.primary,
  },
  body: { paddingHorizontal: 20, paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold', color: c.foreground, marginBottom: 12 },
  seeAll: { fontSize: 13, color: c.primary, fontFamily: 'Tajawal_500Medium' },
  statsRow: { flexDirection: 'row' },
  patientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.card, borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  patientInfo: { flex: 1, minWidth: 0 },
  patientName: { fontSize: 15, fontFamily: 'Tajawal_500Medium', color: c.foreground },
  patientMrn: { fontSize: 12, color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: 'Tajawal_500Medium' },
  apptRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.card, borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  apptTimePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  apptTime: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  apptInfo: { flex: 1, minWidth: 0 },
  apptPatient: { fontSize: 14, fontFamily: 'Tajawal_500Medium', color: c.foreground },
  apptDoctor: { fontSize: 12, color: c.mutedForeground, fontFamily: 'Tajawal_400Regular', marginTop: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14, color: c.mutedForeground, fontFamily: 'Tajawal_400Regular' },
});
