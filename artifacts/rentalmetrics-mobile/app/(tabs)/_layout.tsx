import React from 'react';
import { Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { useColors } from '@/hooks/useColors';

function NativeTabLayout() {
  const colors = useColors();
  return (
    <NativeTabs tintColor={colors.primary}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
        <NativeTabs.Trigger.Label>Analyse</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Icon sf={{ default: 'tray.full', selected: 'tray.full.fill' }} />
        <NativeTabs.Trigger.Label>Saved Deals</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tools">
        <NativeTabs.Trigger.Icon sf={{ default: 'sterlingsign.circle', selected: 'sterlingsign.circle.fill' }} />
        <NativeTabs.Trigger.Label>Tools</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const icon = (sf: string, feather: React.ComponentProps<typeof Feather>['name']) =>
    ({ color }: { color: import("react-native").ColorValue }) =>
      isIOS ? <SymbolView name={sf as never} tintColor={color as string} size={24} /> : <Feather name={feather} size={22} color={color as string} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontFamily: 'Manrope-SemiBold', fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Analyse', tabBarIcon: icon('chart.bar', 'bar-chart-2') }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved Deals', tabBarIcon: icon('tray.full', 'bookmark') }} />
      <Tabs.Screen name="tools" options={{ title: 'Tools', tabBarIcon: icon('sterlingsign.circle', 'sliders') }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
