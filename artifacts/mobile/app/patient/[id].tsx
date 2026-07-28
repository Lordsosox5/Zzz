import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@/hooks/useColors';

interface PatientDetail {
  id: number; nameEn: string; nameAr?: string; mrn: string; dob?: string;
  gender?: string; bloodGroup?: string; status: string; patientType?: string;
  nationality?: string; weight?: number; height?: number;
  guardianName?: string; guardianRelation?: string; guardianPhone?: string;
  address?: string; admissionDate?: string; chiefComplaint?: string;
  unitId?: number; email?: string; phone?: string;
}

type TabId = 'overview' | 'vitals' | 'notes' | 'labs';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'person-outline' },
  { id: 'vitals', label: 'Vitals', icon: 'pulse-outline' },
  { id: 'notes', label: 'Notes', icon: 'document-text-outline' },
  { id: 'labs', label: 'Labs', icon: 'flask-outline' },
];

function InfoRow({ label, value, icon }: { label: string; value?: string | number | null; icon?: string }) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={[irStyles.row, { borderBottomColor: colors.border }]}>
      {icon ? <Ionicons name={icon as any} size={16} color={colors.mutedForeground} style={{ marginRight: 10 }} /> : <View style={{ width: 26 }} />}
      <Text style={[irStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[irStyles.value, { color: colors.foreground }]}>{String(value)}</Text>
    </View>
  );
}
const irStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { flex: 1, fontSize: 13, fontFamily: 'Tajawal_400Regular' },
  value: { fontSize: 14, fontFamily: 'Tajawal_500Medium', textAlign: 'right', flex: 1 },
});

export default function PatientDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data: patient, isLoading, error } = useQuery<PatientDetail>({
    queryKey: [`/patients/${id}`],
    enabled: !!id,
    retry: false,
  });

  const age = patient?.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const isActive = patient?.status === 'active' || patient?.status === 'admitted';
  const s = detailStyles(colors);

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      {/* Header bar */}
      <View style={s.headerBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Patient Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error || !patient ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={[s.errorText, { color: colors.destructive }]}>Patient not found</Text>
          <TouchableOpacity style={[s.backLink, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <Text style={{ color: '#FFF', fontFamily: 'Tajawal_500Medium' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Patient hero card */}
          <View style={s.heroCard}>
            <View style={[s.avatar, { backgroundColor: colors.primary }]}>
              <Text style={s.avatarText}>
                {patient.nameEn.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={s.heroInfo}>
              <Text style={s.heroName}>{patient.nameEn}</Text>
              {patient.nameAr && <Text style={s.heroNameAr}>{patient.nameAr}</Text>}
              <View style={s.heroMeta}>
                <Text style={s.heroMrn}>MRN: {patient.mrn}</Text>
                {age !== null && <Text style={s.heroAge}>{age} years</Text>}
                {patient.gender && <Text style={s.heroAge}>{patient.gender}</Text>}
              </View>
            </View>
            <View style={[s.statusBadge, { backgroundColor: isActive ? colors.successLight : colors.muted }]}>
              <View style={[s.statusDot, { backgroundColor: isActive ? colors.success : colors.mutedForeground }]} />
              <Text style={[s.statusText, { color: isActive ? colors.success : colors.mutedForeground }]}>
                {isActive ? 'Active' : patient.status === 'discharged' ? 'Discharged' : patient.status}
              </Text>
            </View>
          </View>

          {/* Tab bar */}
          <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[s.tabBtn, activeTab === tab.id && [s.tabBtnActive, { borderBottomColor: colors.primary }]]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? colors.primary : colors.mutedForeground} />
                <Text style={[s.tabLabel, { color: activeTab === tab.id ? colors.primary : colors.mutedForeground }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
            {activeTab === 'overview' && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Demographics</Text>
                <View style={[s.card, { backgroundColor: colors.card }]}>
                  <InfoRow label="Date of Birth" value={patient.dob} icon="calendar-outline" />
                  <InfoRow label="Gender" value={patient.gender} icon="person-outline" />
                  <InfoRow label="Blood Group" value={patient.bloodGroup} icon="water-outline" />
                  <InfoRow label="Nationality" value={patient.nationality} icon="flag-outline" />
                  <InfoRow label="Weight" value={patient.weight ? `${patient.weight} kg` : null} icon="scale-outline" />
                  <InfoRow label="Height" value={patient.height ? `${patient.height} cm` : null} icon="resize-outline" />
                  <InfoRow label="Patient Type" value={patient.patientType} icon="clipboard-outline" />
                </View>

                <Text style={s.sectionTitle}>Guardian / Contact</Text>
                <View style={[s.card, { backgroundColor: colors.card }]}>
                  <InfoRow label="Guardian" value={patient.guardianName} icon="people-outline" />
                  <InfoRow label="Relation" value={patient.guardianRelation} icon="git-branch-outline" />
                  <InfoRow label="Phone" value={patient.guardianPhone} icon="call-outline" />
                  <InfoRow label="Address" value={patient.address} icon="location-outline" />
                </View>

                <Text style={s.sectionTitle}>Admission</Text>
                <View style={[s.card, { backgroundColor: colors.card }]}>
                  <InfoRow label="Admission Date" value={patient.admissionDate} icon="enter-outline" />
                  <InfoRow label="Chief Complaint" value={patient.chiefComplaint} icon="chatbubble-ellipses-outline" />
                </View>
              </View>
            )}
            {activeTab === 'vitals' && (
              <View style={s.section}>
                <View style={s.emptyTab}>
                  <Ionicons name="pulse-outline" size={48} color={colors.mutedForeground} />
                  <Text style={[s.emptyTitle, { color: colors.foreground }]}>No vitals recorded</Text>
                  <Text style={[s.emptySub, { color: colors.mutedForeground }]}>Vitals are recorded through the desktop app</Text>
                </View>
              </View>
            )}
            {activeTab === 'notes' && (
              <View style={s.section}>
                <View style={s.emptyTab}>
                  <Ionicons name="document-text-outline" size={48} color={colors.mutedForeground} />
                  <Text style={[s.emptyTitle, { color: colors.foreground }]}>No clinical notes</Text>
                  <Text style={[s.emptySub, { color: colors.mutedForeground }]}>Notes are added through the desktop app</Text>
                </View>
              </View>
            )}
            {activeTab === 'labs' && (
              <View style={s.section}>
                <View style={s.emptyTab}>
                  <Ionicons name="flask-outline" size={48} color={colors.mutedForeground} />
                  <Text style={[s.emptyTitle, { color: colors.foreground }]}>No lab results</Text>
                  <Text style={[s.emptySub, { color: colors.mutedForeground }]}>Lab results are managed through the desktop app</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const detailStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.card,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.muted, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold', color: c.foreground, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 17, fontFamily: 'Tajawal_700Bold' },
  backLink: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  heroCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: c.card, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontFamily: 'Tajawal_700Bold', color: '#FFF' },
  heroInfo: { flex: 1, minWidth: 0 },
  heroName: { fontSize: 18, fontFamily: 'Tajawal_700Bold', color: c.foreground },
  heroNameAr: { fontSize: 13, color: c.mutedForeground, fontFamily: 'Tajawal_400Regular' },
  heroMeta: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  heroMrn: { fontSize: 12, color: c.primary, fontFamily: 'Tajawal_500Medium' },
  heroAge: { fontSize: 12, color: c.mutedForeground, fontFamily: 'Tajawal_400Regular' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: 'Tajawal_700Bold' },
  tabBar: {
    flexDirection: 'row', backgroundColor: c.card,
    borderBottomWidth: 1,
  },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabBtnActive: {},
  tabLabel: { fontSize: 12, fontFamily: 'Tajawal_500Medium' },
  tabContent: { flex: 1 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 13, fontFamily: 'Tajawal_700Bold', color: c.mutedForeground, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 16 },
  card: { borderRadius: 16, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4, shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  emptyTab: { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold' },
  emptySub: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'center' },
});
