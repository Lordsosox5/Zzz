import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Dimensions, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const passwordRef = useRef<TextInput>(null);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      shake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setError('');
    setIsLoading(true);
    Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true }).start();
    try {
      await login(username.trim(), password.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || 'Invalid credentials.');
      shake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
      Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const s = styles(colors);

  return (
    <View style={[s.bg, { paddingTop: topPad }]}>
      {/* Background gradient accent */}
      <View style={s.bgCircle1} />
      <View style={s.bgCircle2} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: botPad + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Branding */}
          <View style={s.logoSection}>
            <View style={s.logoCircle}>
              <View style={s.crossH} />
              <View style={s.crossV} />
            </View>
            <Text style={s.hospitalName}>Almuzini</Text>
            <Text style={s.hospitalSub}>Children Hospital EHR</Text>
          </View>

          {/* Card */}
          <Animated.View style={[s.card, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={s.cardTitle}>Sign In</Text>
            <Text style={s.cardSubtitle}>Enter your credentials to continue</Text>

            {error ? (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.destructive} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Username */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Username</Text>
              <View style={s.inputRow}>
                <Ionicons name="person-outline" size={18} color={colors.mutedForeground} style={s.inputIcon} />
                <TextInput
                  testID="username-input"
                  style={s.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter your username"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>

            {/* Password */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Password</Text>
              <View style={s.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} style={s.inputIcon} />
                <TextInput
                  testID="password-input"
                  ref={passwordRef}
                  style={[s.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                testID="login-button"
                style={[s.loginBtn, isLoading && s.loginBtnDisabled]}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.loginBtnText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          <Text style={s.footer}>Almuzini Children Hospital © 2025</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  bg: { flex: 1, backgroundColor: c.primary },
  bgCircle1: {
    position: 'absolute', width: 400, height: 400, borderRadius: 200,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -120, right: -100,
  },
  bgCircle2: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: 80, left: -80,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 20 },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 16,
  },
  crossH: {
    position: 'absolute', width: 36, height: 10,
    backgroundColor: '#FFFFFF', borderRadius: 5,
  },
  crossV: {
    position: 'absolute', width: 10, height: 36,
    backgroundColor: '#FFFFFF', borderRadius: 5,
  },
  hospitalName: {
    fontSize: 28, fontFamily: 'Tajawal_700Bold', color: '#FFFFFF', letterSpacing: 0.5,
  },
  hospitalSub: {
    fontSize: 14, fontFamily: 'Tajawal_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2,
  },
  card: {
    backgroundColor: c.card, borderRadius: 20, padding: 28,
    shadowColor: 'rgba(0,0,0,0.25)', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1, shadowRadius: 24, elevation: 12,
  },
  cardTitle: { fontSize: 24, fontFamily: 'Tajawal_700Bold', color: c.foreground, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, fontFamily: 'Tajawal_400Regular', color: c.mutedForeground, marginBottom: 20 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.destructiveLight, borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: c.destructive, fontFamily: 'Tajawal_400Regular' },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: 'Tajawal_500Medium', color: c.foreground, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: c.border, borderRadius: 12,
    backgroundColor: c.background, paddingHorizontal: 12, height: 48,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1, fontSize: 15, color: c.foreground,
    fontFamily: 'Tajawal_400Regular',
  },
  eyeBtn: { padding: 4 },
  loginBtn: {
    backgroundColor: c.primary, borderRadius: 12,
    height: 52, alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: {
    color: '#FFFFFF', fontSize: 16, fontFamily: 'Tajawal_700Bold', letterSpacing: 0.3,
  },
  footer: {
    textAlign: 'center', color: 'rgba(255,255,255,0.5)',
    fontSize: 12, fontFamily: 'Tajawal_400Regular', marginTop: 32,
  },
});
