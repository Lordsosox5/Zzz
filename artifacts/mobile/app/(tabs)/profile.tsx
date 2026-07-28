import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  super_admin: { label: 'System Administrator', color: '#7C3AED', bg: '#EDE9FE' },
  pediatric_consultant: { label: 'Pediatric Consultant', color: '#1D4ED8', bg: '#DBEAFE' },
  pediatric_specialist: { label: 'Pediatric Specialist', color: '#0891B2', bg: '#CFFAFE' },
  nurse: { label: 'Nursing Staff', color: '#059669', bg: '#DCFCE7' },
  emergency_physician: { label: 'Emergency Physician', color: '#DC2626', bg: '#FEE2E2' },
  pharmacist: { label: 'Pharmacist', color: '#EA580C', bg: '#FFEDD5' },
  lab_technician: { label: 'Lab Technician', color: '#CA8A04', bg: '#FEF9C3' },
  billing_officer: { label: 'Billing Officer', color: '#059669', bg: '#DCFCE7' },
  house_officer: { label: 'House Officer', color: '#0D9488', bg: '#CCFBF1' },
  medical_officer: { label: 'Medical Officer', color: '#4338CA', bg: '#E0E7FF' },
  registrar: { label: 'Registrar', color: '#BE185D', bg: '#FCE7F3' },
  accounts_manager: { label: 'Accounts Manager', color: '#475569', bg: '#F1F5F9' },
  administrative: { label: 'Administrative', color: '#92400E', bg: '#FEF3C7' },
  data_analyser: { label: 'Data Analyser', color: '#6D28D9', bg: '#EDE9FE' },
};

function SettingRow({ icon, label, value, onPress, danger = false }: {
  icon: string; label: string; value?: string; onPress?: () => void; danger?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[srStyles.row, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[srStyles.iconWrap, { backgroundColor: danger ? colors.destructiveLight : colors.muted }]}>
        <Ionicons name={icon as any} size={18} color={danger ? colors.destructive : colors.primary} />
      </View>
      <Text style={[srStyles.label, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
      <View style={srStyles.right}>
        {value ? <Text style={[srStyles.value, { color: colors.mutedForeground }]}>{value}</Text> : null}
        {onPress && <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />}
      </View>
    </TouchableOpacity>
  );
}

const srStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 14, marginBottom: 8,
  },
  iconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 15, fontFamily: 'Tajawal_500Medium' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontSize: 13, fontFamily: 'Tajawal_400Regular' },
});

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const initials = (user?.nameEn ?? '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const roleInfo = ROLE_LABELS[user?.role ?? ''] ?? { label: user?.role ?? 'Staff', color: colors.primary, bg: colors.primaryLight };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (Platform.OS === 'web') {
      logout().then(() => router.replace('/login'));
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: () => logout().then(() => router.replace('/login')),
      },
    ]);
  };

  const s = profStyles(colors);

  return (
    <ScrollView style={s.root} contentContainerStyle={[s.content, { paddingTop: topPad + 8, paddingBottom: botPad + 24 }]}>
      {/* Avatar section */}
      <View style={s.avatarSection}>
        <View style={[s.avatar, { backgroundColor: colors.primary }]}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{user?.nameEn ?? '—'}</Text>
        {user?.nameAr && <Text style={s.nameAr}>{user.nameAr}</Text>}
        <View style={[s.roleBadge, { backgroundColor: roleInfo.bg }]}>
          <Text style={[s.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
        </View>
        {user?.department && (
          <View style={s.deptRow}>
            <Ionicons name="business-outline" size={14} color={colors.mutedForeground} />
            <Text style={[s.dept, { color: colors.mutedForeground }]}>{user.department}</Text>
          </View>
        )}
      </View>

      {/* Account info */}
      <Text style={s.sectionLabel}>Account</Text>
      <SettingRow icon="person-outline" label="Username" value={`@${user?.username ?? '—'}`} />
      {user?.email && <SettingRow icon="mail-outline" label="Email" value={user.email} />}
      {user?.phone && <SettingRow icon="call-outline" label="Phone" value={user.phone} />}

      {/* App */}
      <Text style={s.sectionLabel}>Application</Text>
      <SettingRow icon="information-circle-outline" label="Version" value="1.0.0" />
      <SettingRow icon="shield-checkmark-outline" label="Security" value="Active" />

      {/* Sign out */}
      <Text style={s.sectionLabel}>Session</Text>
      <SettingRow icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger />
    </ScrollView>
  );
}

const profStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 32, marginTop: 8 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: '#0A66C2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  avatarText: { fontSize: 36, fontFamily: 'Tajawal_700Bold', color: '#FFFFFF' },
  name: { fontSize: 24, fontFamily: 'Tajawal_700Bold', color: c.foreground, marginBottom: 2 },
  nameAr: { fontSize: 16, fontFamily: 'Tajawal_400Regular', color: c.mutedForeground, marginBottom: 8 },
  roleBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  roleText: { fontSize: 13, fontFamily: 'Tajawal_700Bold' },
  deptRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dept: { fontSize: 13, fontFamily: 'Tajawal_400Regular' },
  sectionLabel: { fontSize: 12, fontFamily: 'Tajawal_700Bold', color: c.mutedForeground, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 20, paddingHorizontal: 4 },
});
