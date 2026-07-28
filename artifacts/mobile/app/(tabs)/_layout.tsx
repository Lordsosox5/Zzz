import { Tabs } from 'expo-router';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

function TabIcon({ name, color, focused }: { name: any; color: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={24} color={color} />
      {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginTop: 3 }} />}
    </View>
  );
}

export default function TabsLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'web' ? 84 : 60 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Tajawal_500Medium',
          marginTop: 2,
        },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'grid' : 'grid-outline'} color={color} focused={false} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} color={color} focused={false} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'calendar' : 'calendar-outline'} color={color} focused={false} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'person-circle' : 'person-circle-outline'} color={color} focused={false} />
          ),
        }}
      />
    </Tabs>
  );
}
