import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A66C2' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return <Redirect href={user ? '/(tabs)' : '/login'} />;
}
