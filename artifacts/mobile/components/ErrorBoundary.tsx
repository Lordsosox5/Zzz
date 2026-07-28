import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reloadAppAsync } from 'expo';

function ErrorFallback({ error }: { error: Error }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{error.message || 'An unexpected error occurred.'}</Text>
      <TouchableOpacity style={styles.button} onPress={reloadAppAsync}>
        <Text style={styles.buttonText}>Restart App</Text>
      </TouchableOpacity>
    </View>
  );
}

interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError && this.state.error) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F6F9FC' },
  title: { fontSize: 22, fontWeight: '700', color: '#0D1B2A', marginTop: 16, marginBottom: 8 },
  message: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  button: { backgroundColor: '#0A66C2', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
