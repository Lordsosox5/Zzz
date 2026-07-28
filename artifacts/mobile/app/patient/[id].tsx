import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { apiRequest } from '@/lib/api';

interface PatientDetail {
  id: number; nameEn: string; nameAr?: string; mrn: string; dob?: string;
  gender?: string; bloodGroup?: string; status: string; patientType?: string;
  nationality?: string; weight?: number; height?: number;
  guardianName?: string; guardianRelation?: string; guardianPhone?: string;
  address?: string; admissionDate?: string; chiefComplaint?: string;
  unitId?: number; email?: string; phone?: string;
}

interface ClinicalNote {
  id: number; noteType?: string; content: string; createdAt?: string;
  authorName?: string; patientId?: number;
}

interface LabOrder {
  id: number; testName: string; status: string; orderedAt?: string;
  result?: string; referenceRange?: string; unit?: string;
  orderedByName?: string; notes?: string;
}

interface RadiologyOrder {
  id: number; studyType: string; status: string; orderedAt?: string;
  findings?: string; impression?: string; orderedByName?: string;
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

const LAB_STATUS: Record<string, { color: string; bg: string }> = {
  pending:    { color: '#D97706', bg: '#FEF3C7' },
  in_progress:{ color: '#0A66C2', bg: '#E8F1FB' },
  completed:  { color: '#16A34A', bg: '#DCFCE7' },
  cancelled:  { color: '#EF4444', bg: '#FEE2E2' },
};

function LabCard({ order }: { order: LabOrder }) {
  const colors = useColors();
  const st = LAB_STATUS[order.status] ?? { color: colors.mutedForeground, bg: colors.muted };
  return (
    <View style={[labStyles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      <View style={labStyles.topRow}>
        <View style={[labStyles.iconWrap, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="flask-outline" size={18} color={colors.primary} />
        </View>
        <View style={labStyles.info}>
          <Text style={[labStyles.name, { color: colors.foreground }]} numberOfLines={1}>{order.testName}</Text>
          {order.orderedByName && (
            <Text style={[labStyles.sub, { color: colors.mutedForeground }]}>Dr. {order.orderedByName}</Text>
          )}
        </View>
        <View style={[labStyles.badge, { backgroundColor: st.bg }]}>
          <Text style={[labStyles.badgeText, { color: st.color }]}>
            {order.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
      {order.result && (
        <View style={[labStyles.resultBox, { backgroundColor: colors.muted }]}>
          <Text style={[labStyles.resultLabel, { color: colors.mutedForeground }]}>Result</Text>
          <Text style={[labStyles.resultValue, { color: colors.foreground }]}>
            {order.result}{order.unit ? ` ${order.unit}` : ''}
            {order.referenceRange ? `  (ref: ${order.referenceRange})` : ''}
          </Text>
        </View>
      )}
      {order.orderedAt && (
        <Text style={[labStyles.date, { color: colors.mutedForeground }]}>
          {new Date(order.orderedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      )}
    </View>
  );
}

const labStyles = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 14, marginBottom: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontFamily: 'Tajawal_700Bold' },
  sub: { fontSize: 12, fontFamily: 'Tajawal_400Regular', marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  resultBox: { borderRadius: 10, padding: 10, marginTop: 10 },
  resultLabel: { fontSize: 11, fontFamily: 'Tajawal_500Medium', marginBottom: 2 },
  resultValue: { fontSize: 14, fontFamily: 'Tajawal_500Medium' },
  date: { fontSize: 11, fontFamily: 'Tajawal_400Regular', marginTop: 8 },
});

const NOTE_TYPE_COLOR: Record<string, { color: string; bg: string }> = {
  progress_note:   { color: '#0A66C2', bg: '#E8F1FB' },
  admission_note:  { color: '#7C3AED', bg: '#EDE9FE' },
  discharge_note:  { color: '#16A34A', bg: '#DCFCE7' },
  consultation:    { color: '#D97706', bg: '#FEF3C7' },
  procedure_note:  { color: '#DC2626', bg: '#FEE2E2' },
};

function NoteCard({ note }: { note: ClinicalNote }) {
  const [expanded, setExpanded] = useState(false);
  const colors = useColors();
  const tc = NOTE_TYPE_COLOR[note.noteType ?? ''] ?? { color: colors.primary, bg: colors.primaryLight };
  const label = (note.noteType ?? 'note').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <TouchableOpacity
      style={[noteStyles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={() => setExpanded(v => !v)}
      activeOpacity={0.85}
    >
      <View style={noteStyles.header}>
        <View style={[noteStyles.typeBadge, { backgroundColor: tc.bg }]}>
          <Text style={[noteStyles.typeBadgeText, { color: tc.color }]}>{label}</Text>
        </View>
        {note.createdAt && (
          <Text style={[noteStyles.date, { color: colors.mutedForeground }]}>
            {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        )}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16} color={colors.mutedForeground}
        />
      </View>
      {note.authorName && (
        <Text style={[noteStyles.author, { color: colors.mutedForeground }]}>Dr. {note.authorName}</Text>
      )}
      <Text
        style={[noteStyles.content, { color: colors.foreground }]}
        numberOfLines={expanded ? undefined : 2}
      >
        {note.content}
      </Text>
    </TouchableOpacity>
  );
}

const noteStyles = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 14, marginBottom: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeBadgeText: { fontSize: 11, fontFamily: 'Tajawal_700Bold' },
  date: { fontSize: 12, fontFamily: 'Tajawal_400Regular', flex: 1 },
  author: { fontSize: 12, fontFamily: 'Tajawal_400Regular', marginBottom: 6 },
  content: { fontSize: 14, fontFamily: 'Tajawal_400Regular', lineHeight: 20 },
});

// ─── Vitals gauge card ──────────────────────────────────────────────────────
interface VitalCardProps { label: string; value?: string | number | null; unit: string; icon: string; color: string; bg: string; }
function VitalCard({ label, value, unit, icon, color, bg }: VitalCardProps) {
  const colors = useColors();
  return (
    <View style={[vitStyles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      <View style={[vitStyles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[vitStyles.value, { color: colors.foreground }]}>
        {value ?? '—'}
        {value ? <Text style={[vitStyles.unit, { color: colors.mutedForeground }]}> {unit}</Text> : null}
      </Text>
      <Text style={[vitStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}
const vitStyles = StyleSheet.create({
  card: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: 'flex-start', minWidth: 0,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
    marginBottom: 10,
  },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  value: { fontSize: 22, fontFamily: 'Tajawal_700Bold' },
  unit: { fontSize: 13, fontFamily: 'Tajawal_400Regular' },
  label: { fontSize: 12, fontFamily: 'Tajawal_400Regular', marginTop: 2 },
});

export default function PatientDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data: patient, isLoading, error } = useQuery<PatientDetail>({
    queryKey: [`/patients/${id}`],
    enabled: !!id,
    retry: false,
  });

  const { data: notesData, isLoading: notesLoading } = useQuery<ClinicalNote[]>({
    queryKey: [`/clinical-notes?patientId=${id}`],
    enabled: !!id && activeTab === 'notes',
    retry: false,
    select: (d) => (Array.isArray(d) ? d : []),
  });

  const { data: labsData, isLoading: labsLoading } = useQuery<LabOrder[]>({
    queryKey: [`/lab-orders?patientId=${id}`],
    enabled: !!id && activeTab === 'labs',
    retry: false,
    select: (d) => (Array.isArray(d) ? d : []),
  });

  const { data: radiologyData, isLoading: radioLoading } = useQuery<RadiologyOrder[]>({
    queryKey: [`/radiology-orders?patientId=${id}`],
    enabled: !!id && activeTab === 'labs',
    retry: false,
    select: (d) => (Array.isArray(d) ? d : []),
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
        {patient && (
          <TouchableOpacity
            style={[s.apptBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(`/book-appointment?patientId=${id}&patientName=${encodeURIComponent(patient.nameEn)}`);
            }}
          >
            <Ionicons name="calendar-outline" size={16} color="#FFF" />
          </TouchableOpacity>
        )}
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
          <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            {/* ── Overview ── */}
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

            {/* ── Vitals ── */}
            {activeTab === 'vitals' && (
              <View style={s.section}>
                {/* Pulled from patient record */}
                {(patient.weight || patient.height) ? (
                  <>
                    <Text style={s.sectionTitle}>Anthropometrics</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <VitalCard label="Weight" value={patient.weight} unit="kg" icon="scale-outline" color="#0A66C2" bg="#E8F1FB" />
                      <VitalCard label="Height" value={patient.height} unit="cm" icon="resize-outline" color="#7C3AED" bg="#EDE9FE" />
                    </View>
                    {patient.weight && patient.height && (() => {
                      const bmi = patient.weight! / Math.pow(patient.height! / 100, 2);
                      return (
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <VitalCard label="BMI" value={bmi.toFixed(1)} unit="kg/m²" icon="body-outline" color="#13A2AE" bg="#E5F7F9" />
                        </View>
                      );
                    })()}
                  </>
                ) : null}

                <Text style={[s.sectionTitle, { marginTop: patient.weight || patient.height ? 8 : 0 }]}>Clinical Vitals</Text>
                <View style={[s.emptyTab, { backgroundColor: colors.card, borderRadius: 16, padding: 24 }]}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Ionicons name="pulse-outline" size={28} color={colors.primary} />
                  </View>
                  <Text style={[s.emptyTitle, { color: colors.foreground }]}>No vitals recorded</Text>
                  <Text style={[s.emptySub, { color: colors.mutedForeground }]}>
                    Vital signs (BP, HR, SpO₂, Temp) are recorded through the desktop EHR
                  </Text>
                </View>
              </View>
            )}

            {/* ── Notes ── */}
            {activeTab === 'notes' && (
              <View style={s.section}>
                {notesLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
                ) : !notesData || notesData.length === 0 ? (
                  <View style={s.emptyTab}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <Ionicons name="document-text-outline" size={28} color={colors.primary} />
                    </View>
                    <Text style={[s.emptyTitle, { color: colors.foreground }]}>No clinical notes</Text>
                    <Text style={[s.emptySub, { color: colors.mutedForeground }]}>Notes for this patient will appear here</Text>
                  </View>
                ) : (
                  <>
                    <Text style={s.sectionTitle}>{notesData.length} note{notesData.length !== 1 ? 's' : ''}</Text>
                    {notesData.map(n => <NoteCard key={n.id} note={n} />)}
                  </>
                )}
              </View>
            )}

            {/* ── Labs ── */}
            {activeTab === 'labs' && (
              <View style={s.section}>
                {labsLoading || radioLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
                ) : (
                  <>
                    {(labsData?.length ?? 0) > 0 && (
                      <>
                        <Text style={s.sectionTitle}>Lab Orders ({labsData!.length})</Text>
                        {labsData!.map(o => <LabCard key={o.id} order={o} />)}
                      </>
                    )}
                    {(radiologyData?.length ?? 0) > 0 && (
                      <>
                        <Text style={s.sectionTitle}>Radiology ({radiologyData!.length})</Text>
                        {radiologyData!.map(r => (
                          <View key={r.id} style={[labStyles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                            <View style={labStyles.topRow}>
                              <View style={[labStyles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
                                <Ionicons name="scan-outline" size={18} color="#D97706" />
                              </View>
                              <View style={labStyles.info}>
                                <Text style={[labStyles.name, { color: colors.foreground }]}>{r.studyType}</Text>
                                {r.orderedByName && <Text style={[labStyles.sub, { color: colors.mutedForeground }]}>Dr. {r.orderedByName}</Text>}
                              </View>
                              <View style={[labStyles.badge, { backgroundColor: LAB_STATUS[r.status]?.bg ?? colors.muted }]}>
                                <Text style={[labStyles.badgeText, { color: LAB_STATUS[r.status]?.color ?? colors.mutedForeground }]}>
                                  {r.status.replace('_', ' ')}
                                </Text>
                              </View>
                            </View>
                            {r.findings && (
                              <View style={[labStyles.resultBox, { backgroundColor: colors.muted }]}>
                                <Text style={[labStyles.resultLabel, { color: colors.mutedForeground }]}>Findings</Text>
                                <Text style={[labStyles.resultValue, { color: colors.foreground }]}>{r.findings}</Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </>
                    )}
                    {(labsData?.length ?? 0) === 0 && (radiologyData?.length ?? 0) === 0 && (
                      <View style={s.emptyTab}>
                        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                          <Ionicons name="flask-outline" size={28} color={colors.primary} />
                        </View>
                        <Text style={[s.emptyTitle, { color: colors.foreground }]}>No lab orders</Text>
                        <Text style={[s.emptySub, { color: colors.mutedForeground }]}>Lab and radiology orders will appear here</Text>
                      </View>
                    )}
                  </>
                )}
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
  apptBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold', color: c.foreground, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 17, fontFamily: 'Tajawal_700Bold' },
  backLink: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  heroCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: c.card, padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
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
  tabBar: { flexDirection: 'row', backgroundColor: c.card, borderBottomWidth: 1 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabBtnActive: {},
  tabLabel: { fontSize: 12, fontFamily: 'Tajawal_500Medium' },
  tabContent: { flex: 1 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 13, fontFamily: 'Tajawal_700Bold', color: c.mutedForeground, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 16 },
  card: { borderRadius: 16, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4, shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  emptyTab: { alignItems: 'center', paddingTop: 32, gap: 6 },
  emptyTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold' },
  emptySub: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },
});
