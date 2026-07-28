import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

interface Patient {
  id: number; nameEn: string; nameAr?: string; mrn: string;
  status: string; dob?: string; gender?: string; admissionDate?: string;
  patientType?: string; unitId?: number;
}

type FilterType = 'all' | 'inpatient' | 'outpatient' | 'active' | 'discharged';

function PatientCard({ patient, onPress }: { patient: Patient; onPress: () => void }) {
  const colors = useColors();
  const initials = patient.nameEn.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const hues = ['#0A66C2', '#13A2AE', '#7C3AED', '#DC2626', '#059669', '#D97706'];
  let hash = 0;
  for (let i = 0; i < patient.nameEn.length; i++) hash = (hash * 31 + patient.nameEn.charCodeAt(i)) >>> 0;
  const avatarBg = hues[hash % hues.length];

  const isActive = patient.status === 'active' || patient.status === 'admitted';
  const isDischarged = patient.status === 'discharged';

  const age = patient.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <TouchableOpacity style={[pcStyles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[pcStyles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={pcStyles.avatarText}>{initials || '?'}</Text>
      </View>
      <View style={pcStyles.info}>
        <Text style={[pcStyles.name, { color: colors.foreground }]} numberOfLines={1}>{patient.nameEn}</Text>
        <Text style={[pcStyles.sub, { color: colors.mutedForeground }]}>
          MRN: {patient.mrn}{age !== null ? ` · ${age}y` : ''}{patient.gender ? ` · ${patient.gender}` : ''}
        </Text>
        {patient.patientType && (
          <Text style={[pcStyles.type, { color: colors.accent }]}>
            {patient.patientType === 'inpatient' ? 'Inpatient' : 'Outpatient'}
          </Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <View style={[pcStyles.badge, {
          backgroundColor: isActive ? colors.successLight : isDischarged ? colors.muted : colors.warningLight,
        }]}>
          <Text style={[pcStyles.badgeText, {
            color: isActive ? colors.success : isDischarged ? colors.mutedForeground : colors.warning,
          }]}>
            {isActive ? 'Active' : isDischarged ? 'Discharged' : patient.status}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const pcStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 14, marginBottom: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontFamily: 'Tajawal_700Bold', fontSize: 16 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontFamily: 'Tajawal_700Bold', marginBottom: 2 },
  sub: { fontSize: 12, fontFamily: 'Tajawal_400Regular' },
  type: { fontSize: 11, fontFamily: 'Tajawal_500Medium', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: 'Tajawal_500Medium' },
});

export default function PatientsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data, isLoading, refetch, error } = useQuery<Patient[] | { patients?: Patient[] }>({
    queryKey: ['/patients'],
    retry: false,
  });

  const patients: Patient[] = Array.isArray(data) ? data : (data as any)?.patients ?? [];

  const filtered = patients.filter(p => {
    const matchSearch = !search ||
      p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()) ||
      (p.nameAr ?? '').includes(search);
    const matchFilter = filter === 'all' ? true
      : filter === 'inpatient' ? p.patientType === 'inpatient'
      : filter === 'outpatient' ? p.patientType === 'outpatient'
      : filter === 'active' ? (p.status === 'active' || p.status === 'admitted')
      : filter === 'discharged' ? p.status === 'discharged'
      : true;
    return matchSearch && matchFilter;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'inpatient', label: 'Inpatient' },
    { key: 'outpatient', label: 'Outpatient' },
    { key: 'discharged', label: 'Discharged' },
  ];

  const s = pStyles(colors);

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Patients</Text>
        <Text style={s.count}>{patients.length} total</Text>
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or MRN…"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Pills */}
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={filters}
        keyExtractor={i => i.key}
        contentContainerStyle={s.pillsContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.pill, filter === item.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[s.pillText, { color: filter === item.key ? '#FFFFFF' : colors.mutedForeground }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        style={{ maxHeight: 48 }}
      />

      {/* List */}
      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.destructive} />
          <Text style={s.errorText}>Failed to load patients</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={filtered.length > 0}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>{search ? 'No results' : 'No patients'}</Text>
              <Text style={s.emptySubtitle}>{search ? 'Try a different search' : 'Add your first patient below'}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <PatientCard
              patient={item}
              onPress={() => router.push(`/patient/${item.id}`)}
            />
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/new-patient'); }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const pStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 },
  title: { fontSize: 28, fontFamily: 'Tajawal_700Bold', color: c.foreground },
  count: { fontSize: 13, color: c.mutedForeground, fontFamily: 'Tajawal_400Regular' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: c.card, borderRadius: 14, marginHorizontal: 20, marginBottom: 12,
    paddingHorizontal: 14, height: 46,
    borderWidth: 1, borderColor: c.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: c.foreground, fontFamily: 'Tajawal_400Regular' },
  pillsContainer: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: c.border, backgroundColor: c.card,
  },
  pillText: { fontSize: 13, fontFamily: 'Tajawal_500Medium' },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  errorText: { fontSize: 15, color: c.destructive, fontFamily: 'Tajawal_500Medium' },
  retryBtn: { backgroundColor: c.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  retryText: { color: '#FFF', fontFamily: 'Tajawal_500Medium', fontSize: 14 },
  emptyTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold', color: c.foreground },
  emptySubtitle: { fontSize: 14, color: c.mutedForeground, fontFamily: 'Tajawal_400Regular' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0A66C2', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
