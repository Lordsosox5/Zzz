import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  Animated, Dimensions, Platform, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { apiRequest } from '@/lib/api';
import { queryClient } from '@/lib/query-client';

const { width: SCREEN_W } = Dimensions.get('window');
const TOTAL_STEPS = 5;

// ─── Types ────────────────────────────────────────────────────────────────────
interface NewPatientForm {
  patientType: 'inpatient' | 'outpatient' | '';
  nameEn: string; nameAr: string;
  dob: string; gender: 'Male' | 'Female' | '';
  bloodGroup: string; weight: string; height: string; nationality: string;
  guardianName: string; guardianRelation: string; guardianPhone: string; address: string;
  chiefComplaint: string; admissionDate: string; unitId: string;
}

const INITIAL_FORM: NewPatientForm = {
  patientType: '', nameEn: '', nameAr: '', dob: '', gender: '',
  bloodGroup: '', weight: '', height: '', nationality: '',
  guardianName: '', guardianRelation: '', guardianPhone: '', address: '',
  chiefComplaint: '', admissionDate: new Date().toISOString().split('T')[0], unitId: '',
};

const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'O+', 'O−', 'AB+', 'AB−'];
const GENDERS = ['Male', 'Female'] as const;
const RELATIONS = ['Father', 'Mother', 'Sibling', 'Grandparent', 'Guardian', 'Other'];
const UNITS = ['General Ward', 'PICU', 'NICU', 'Nursery', 'Emergency', 'Outpatient Clinic'];

// ─── Step Progress Bar ────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  const colors = useColors();
  const progress = (step / TOTAL_STEPS) * 100;
  return (
    <View style={pbStyles.wrap}>
      <View style={[pbStyles.track, { backgroundColor: colors.muted }]}>
        <Animated.View style={[pbStyles.fill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={[pbStyles.counter, { color: colors.mutedForeground }]}>{step}/{TOTAL_STEPS}</Text>
    </View>
  );
}
const pbStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  counter: { fontSize: 12, fontFamily: 'Tajawal_500Medium', minWidth: 30, textAlign: 'right' },
});

// ─── SelectChip ───────────────────────────────────────────────────────────────
function SelectChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[chipStyles.chip, {
        backgroundColor: selected ? colors.primary : colors.card,
        borderColor: selected ? colors.primary : colors.border,
      }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[chipStyles.text, { color: selected ? '#FFF' : colors.foreground }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const chipStyles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, margin: 4 },
  text: { fontSize: 13, fontFamily: 'Tajawal_500Medium' },
});

// ─── Labeled Input ────────────────────────────────────────────────────────────
function LabeledInput({ label, value, onChangeText, placeholder, required, keyboardType, multiline, dir }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; required?: boolean; keyboardType?: any; multiline?: boolean; dir?: 'rtl';
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
          textAlign: dir === 'rtl' ? 'right' : 'left',
          paddingTop: multiline ? 12 : 0,
        }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
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

// ─── Animated Type Card (with own press animation, never in map) ──────────────
function TypeCard({ selected, onPress, icon, title, subtitle, colors }: {
  selected: boolean; onPress: () => void; icon: string;
  title: string; subtitle: string; colors: ReturnType<typeof useColors>;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[tcStyles.card, {
          backgroundColor: selected ? colors.primaryLight : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1.5,
          shadowColor: selected ? colors.primary : colors.shadow,
        }]}
        onPress={() => { onPress(); Haptics.selectionAsync(); }}
        onPressIn={onIn}
        onPressOut={onOut}
        activeOpacity={1}
      >
        <View style={[tcStyles.iconCircle, { backgroundColor: selected ? colors.primary : colors.muted }]}>
          <Ionicons name={icon as any} size={30} color={selected ? '#FFF' : colors.primary} />
        </View>
        <Text style={[tcStyles.title, { color: selected ? colors.primary : colors.foreground }]}>{title}</Text>
        <Text style={[tcStyles.sub, { color: colors.mutedForeground }]}>{subtitle}</Text>
        {selected && (
          <View style={[tcStyles.checkMark, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={14} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
const tcStyles = StyleSheet.create({
  card: {
    borderRadius: 20, padding: 24, alignItems: 'center', flex: 1,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },
  iconCircle: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontFamily: 'Tajawal_700Bold', marginBottom: 6, textAlign: 'center' },
  sub: { fontSize: 13, fontFamily: 'Tajawal_400Regular', textAlign: 'center', lineHeight: 18 },
  checkMark: {
    position: 'absolute', top: 12, right: 12,
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
});

// ─── Step labels ──────────────────────────────────────────────────────────────
const STEP_META = [
  { title: 'Visit Type', subtitle: 'What kind of visit is this?' },
  { title: 'Patient Identity', subtitle: 'Personal information' },
  { title: 'Medical Profile', subtitle: 'Health & physical details' },
  { title: 'Guardian & Contact', subtitle: 'Emergency contact info' },
  { title: 'Admission Details', subtitle: 'Reason for visit' },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NewPatientScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<NewPatientForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof NewPatientForm, string>>>({});

  const slideX = useRef(new Animated.Value(0)).current;

  const set = <K extends keyof NewPatientForm>(key: K, value: NewPatientForm[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: undefined }));
  };

  const animateTo = (nextStep: number) => {
    const dir = nextStep > step ? 1 : -1;
    Animated.timing(slideX, { toValue: dir * -SCREEN_W, duration: 280, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      slideX.setValue(dir * SCREEN_W);
      Animated.spring(slideX, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 4 }).start();
    });
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (step === 0 && !form.patientType) e.patientType = 'Select a visit type';
    if (step === 1) {
      if (!form.nameEn.trim()) e.nameEn = 'Patient name is required';
      if (!form.gender) e.gender = 'Select gender';
    }
    if (step === 3 && !form.guardianName.trim()) e.guardianName = 'Guardian name is required';
    if (step === 4 && !form.chiefComplaint.trim()) e.chiefComplaint = 'Chief complaint is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest('/patients', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/patients'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
  });

  const handleNext = () => {
    if (!validate()) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    if (step < TOTAL_STEPS - 1) {
      Haptics.selectionAsync();
      animateTo(step + 1);
    } else {
      // Submit
      const payload = {
        nameEn: form.nameEn.trim(),
        nameAr: form.nameAr.trim() || undefined,
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        height: form.height ? Number(form.height) : undefined,
        nationality: form.nationality || undefined,
        guardianName: form.guardianName.trim() || undefined,
        guardianRelation: form.guardianRelation || undefined,
        guardianPhone: form.guardianPhone.trim() || undefined,
        address: form.address.trim() || undefined,
        patientType: form.patientType || undefined,
        chiefComplaint: form.chiefComplaint.trim() || undefined,
        admissionDate: form.admissionDate || new Date().toISOString().split('T')[0],
        unitName: form.unitId || undefined,
        status: form.patientType === 'inpatient' ? 'active' : 'outpatient',
      };
      mutation.mutate(payload);
    }
  };

  const handleBack = () => {
    if (step === 0) { router.back(); return; }
    Haptics.selectionAsync();
    animateTo(step - 1);
  };

  const s = wizStyles(colors);
  const stepMeta = STEP_META[step];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.root, { paddingTop: topPad }]}>
        {/* Toolbar */}
        <View style={s.toolbar}>
          <TouchableOpacity style={s.closeBtn} onPress={handleBack}>
            <Ionicons name={step === 0 ? 'close' : 'arrow-back'} size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={s.toolbarCenter}>
            <Text style={s.stepTitle}>{stepMeta.title}</Text>
            <ProgressBar step={step + 1} />
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* Step subtitle */}
        <View style={s.stepHeader}>
          <Text style={s.stepSubtitle}>{stepMeta.subtitle}</Text>
        </View>

        {/* Error summary */}
        {Object.keys(errors).length > 0 && (
          <View style={[s.errorBanner, { backgroundColor: colors.destructiveLight }]}>
            <Ionicons name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[s.errorText, { color: colors.destructive }]}>
              {Object.values(errors)[0]}
            </Text>
          </View>
        )}

        {/* Sliding content */}
        <Animated.View style={[s.slideWrap, { transform: [{ translateX: slideX }] }]}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.stepContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Step 0: Visit Type ── */}
            {step === 0 && (
              <View style={s.typeRow}>
                <TypeCard
                  selected={form.patientType === 'inpatient'}
                  onPress={() => set('patientType', 'inpatient')}
                  icon="bed-outline"
                  title="Inpatient"
                  subtitle="Hospital admission and ward stay"
                  colors={colors}
                />
                <View style={{ width: 14 }} />
                <TypeCard
                  selected={form.patientType === 'outpatient'}
                  onPress={() => set('patientType', 'outpatient')}
                  icon="walk-outline"
                  title="Outpatient"
                  subtitle="Clinic visit, no admission"
                  colors={colors}
                />
              </View>
            )}

            {/* ── Step 1: Identity ── */}
            {step === 1 && (
              <View>
                <LabeledInput label="Full Name (English)" value={form.nameEn} onChangeText={v => set('nameEn', v)} placeholder="e.g. Ahmed Ali" required />
                <LabeledInput label="Full Name (Arabic)" value={form.nameAr} onChangeText={v => set('nameAr', v)} placeholder="مثال: أحمد علي" dir="rtl" />
                <LabeledInput label="Date of Birth" value={form.dob} onChangeText={v => set('dob', v)} placeholder="YYYY-MM-DD" keyboardType="numeric" />
                <View style={{ marginBottom: 16 }}>
                  <Text style={[liStyles.label, { color: colors.foreground }]}>
                    Gender <Text style={{ color: colors.destructive }}>*</Text>
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {GENDERS.map(g => (
                      <TouchableOpacity
                        key={g}
                        style={[s.genderBtn, {
                          borderColor: form.gender === g ? colors.primary : colors.border,
                          backgroundColor: form.gender === g ? colors.primaryLight : colors.card,
                          flex: 1,
                        }]}
                        onPress={() => set('gender', g)}
                      >
                        <Ionicons
                          name={g === 'Male' ? 'male-outline' : 'female-outline'}
                          size={20}
                          color={form.gender === g ? colors.primary : colors.mutedForeground}
                        />
                        <Text style={[s.genderText, { color: form.gender === g ? colors.primary : colors.foreground }]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* ── Step 2: Medical Profile ── */}
            {step === 2 && (
              <View>
                <Text style={[liStyles.label, { color: colors.foreground, marginBottom: 10 }]}>Blood Group</Text>
                <View style={s.chipsWrap}>
                  {BLOOD_GROUPS.map(bg => (
                    <SelectChip
                      key={bg} label={bg}
                      selected={form.bloodGroup === bg}
                      onPress={() => set('bloodGroup', form.bloodGroup === bg ? '' : bg)}
                    />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <LabeledInput label="Weight (kg)" value={form.weight} onChangeText={v => set('weight', v)} placeholder="e.g. 25" keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <LabeledInput label="Height (cm)" value={form.height} onChangeText={v => set('height', v)} placeholder="e.g. 120" keyboardType="numeric" />
                  </View>
                </View>
                <LabeledInput label="Nationality" value={form.nationality} onChangeText={v => set('nationality', v)} placeholder="e.g. Saudi" />
              </View>
            )}

            {/* ── Step 3: Guardian ── */}
            {step === 3 && (
              <View>
                <LabeledInput label="Guardian Name" value={form.guardianName} onChangeText={v => set('guardianName', v)} placeholder="e.g. Ali Ahmed" required />
                <Text style={[liStyles.label, { color: colors.foreground, marginBottom: 8 }]}>Relationship</Text>
                <View style={s.chipsWrap}>
                  {RELATIONS.map(r => (
                    <SelectChip
                      key={r} label={r}
                      selected={form.guardianRelation === r}
                      onPress={() => set('guardianRelation', r)}
                    />
                  ))}
                </View>
                <View style={{ marginTop: 8 }}>
                  <LabeledInput label="Mobile Number" value={form.guardianPhone} onChangeText={v => set('guardianPhone', v)} placeholder="+966 5X XXX XXXX" keyboardType="phone-pad" />
                  <LabeledInput label="Address" value={form.address} onChangeText={v => set('address', v)} placeholder="City, District…" multiline />
                </View>
              </View>
            )}

            {/* ── Step 4: Admission ── */}
            {step === 4 && (
              <View>
                <LabeledInput
                  label="Chief Complaint" value={form.chiefComplaint}
                  onChangeText={v => set('chiefComplaint', v)}
                  placeholder="Describe the main reason for this visit…"
                  required multiline
                />
                {form.patientType === 'inpatient' && (
                  <>
                    <Text style={[liStyles.label, { color: colors.foreground, marginBottom: 8 }]}>Admission Unit</Text>
                    <View style={s.chipsWrap}>
                      {UNITS.map(u => (
                        <SelectChip key={u} label={u} selected={form.unitId === u} onPress={() => set('unitId', form.unitId === u ? '' : u)} />
                      ))}
                    </View>
                  </>
                )}
                <LabeledInput
                  label="Admission Date" value={form.admissionDate}
                  onChangeText={v => set('admissionDate', v)}
                  placeholder="YYYY-MM-DD" keyboardType="numeric"
                />
                {/* Summary preview */}
                <View style={[s.summary, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                  <Text style={[s.summaryTitle, { color: colors.primary }]}>Summary</Text>
                  {[
                    ['Patient', form.nameEn],
                    ['Type', form.patientType === 'inpatient' ? 'Inpatient' : 'Outpatient'],
                    ['DOB', form.dob],
                    ['Gender', form.gender],
                    ['Guardian', form.guardianName],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <View key={k} style={s.summaryRow}>
                      <Text style={[s.summaryKey, { color: colors.primary }]}>{k}</Text>
                      <Text style={[s.summaryVal, { color: colors.foreground }]}>{v}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {/* Bottom navigation */}
        <View style={[s.nav, { paddingBottom: botPad + 12, borderTopColor: colors.border }]}>
          {step > 0 ? (
            <TouchableOpacity style={[s.navBack, { borderColor: colors.border }]} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color={colors.foreground} />
            </TouchableOpacity>
          ) : <View style={{ width: 48 }} />}

          <TouchableOpacity
            style={[s.navNext, { backgroundColor: colors.primary, flex: 1, marginLeft: step > 0 ? 12 : 0 }]}
            onPress={handleNext}
            disabled={mutation.isPending}
            activeOpacity={0.85}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={s.navNextText}>{step === TOTAL_STEPS - 1 ? 'Register Patient' : 'Continue'}</Text>
                {step < TOTAL_STEPS - 1 && <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const wizStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: c.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, gap: 12,
  },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.muted, alignItems: 'center', justifyContent: 'center' },
  toolbarCenter: { flex: 1, gap: 6 },
  stepTitle: { fontSize: 17, fontFamily: 'Tajawal_700Bold', color: c.foreground },
  stepHeader: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  stepSubtitle: { fontSize: 15, color: c.mutedForeground, fontFamily: 'Tajawal_400Regular' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 4, borderRadius: 10, padding: 12,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Tajawal_400Regular' },
  slideWrap: { flex: 1 },
  stepContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  typeRow: { flexDirection: 'row', paddingTop: 16 },
  genderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 12, borderWidth: 1.5,
  },
  genderText: { fontSize: 15, fontFamily: 'Tajawal_500Medium' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 8 },
  summary: {
    borderRadius: 16, padding: 16, marginTop: 16,
    borderWidth: 1.5, gap: 8,
  },
  summaryTitle: { fontSize: 13, fontFamily: 'Tajawal_700Bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryKey: { fontSize: 13, fontFamily: 'Tajawal_500Medium' },
  summaryVal: { fontSize: 13, fontFamily: 'Tajawal_400Regular' },
  nav: {
    flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: c.card, borderTopWidth: StyleSheet.hairlineWidth,
  },
  navBack: {
    width: 48, height: 52, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  navNext: {
    height: 52, borderRadius: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
  },
  navNextText: { color: '#FFF', fontSize: 16, fontFamily: 'Tajawal_700Bold' },
});
