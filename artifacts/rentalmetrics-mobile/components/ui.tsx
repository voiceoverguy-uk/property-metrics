import React, { useState } from 'react';
import {
  Image, Keyboard, Linking, Modal, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text,
  TextInput, TextProps, View, ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { amount } from '@/lib/deals';

export const HEADING = 'Manrope-SemiBold';
export const tap = () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); };
export const success = () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); };
export const warn = () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); };
export const WEBSITE = 'https://rentalmetrics.co.uk';
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');
export const signed = (n: number, fmt: (n: number) => string) => `${n < 0 ? '\u2212' : '+'}${fmt(Math.abs(n))}`;

type Variant = 'display' | 'title' | 'heading' | 'body' | 'small' | 'label' | 'metric';
type Tone = 'default' | 'muted' | 'primary' | 'destructive' | 'inverse' | 'success';

export function T({ variant = 'body', tone = 'default', style, ...rest }: TextProps & { variant?: Variant; tone?: Tone }) {
  const c = useColors();
  const colour = { default: c.foreground, muted: c.mutedForeground, primary: c.primary, destructive: c.destructive, inverse: c.charcoalForeground, success: c.success }[tone];
  const v: Record<Variant, object> = {
    display: { fontFamily: HEADING, fontSize: 28, lineHeight: 36 },
    title: { fontFamily: HEADING, fontSize: 22, lineHeight: 30 },
    heading: { fontFamily: HEADING, fontSize: 17, lineHeight: 24 },
    body: { fontSize: 16, lineHeight: 23 },
    small: { fontSize: 14, lineHeight: 20 },
    label: { fontFamily: HEADING, fontSize: 12, lineHeight: 17, letterSpacing: 0.7, textTransform: 'uppercase' },
    metric: { fontFamily: HEADING, fontSize: 26, lineHeight: 34 },
  };
  return <Text {...rest} style={[{ color: colour, flexShrink: 1 }, v[variant], style]} />;
}

export function Card({ children, style, tone }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'plain' | 'soft' }) {
  const c = useColors();
  return (
    <View style={[{ backgroundColor: tone === 'soft' ? c.muted : c.card, borderRadius: c.radius, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, padding: 16, gap: 12 }, style]}>
      {children}
    </View>
  );
}

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, testID, style }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'brand';
  icon?: React.ComponentProps<typeof Feather>['name']; loading?: boolean; disabled?: boolean; testID?: string; style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const map = {
    primary: { bg: c.charcoal, fg: c.charcoalForeground, bd: c.charcoal },
    brand: { bg: c.primary, fg: c.primaryForeground, bd: c.primary },
    secondary: { bg: c.card, fg: c.foreground, bd: c.input },
    ghost: { bg: 'transparent', fg: c.foreground, bd: 'transparent' },
    danger: { bg: c.card, fg: c.destructive, bd: c.destructive },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [{
        minHeight: 48, paddingHorizontal: 18, paddingVertical: 10, borderRadius: c.radius, borderWidth: 1.5, backgroundColor: map.bg, borderColor: map.bd,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: off ? 0.5 : pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      }, style]}
    >
      {icon ? <Feather name={icon} size={18} color={map.fg} /> : null}
      <Text style={{ color: map.fg, fontFamily: HEADING, fontSize: 16, flexShrink: 1, textAlign: 'center' }}>{loading ? 'Working\u2026' : label}</Text>
    </Pressable>
  );
}

export function IconButton({ name, label, onPress, testID, tone }: { name: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void; testID?: string; tone?: 'default' | 'destructive' }) {
  const c = useColors();
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, opacity: pressed ? 0.55 : 1 })}>
      <Feather name={name} size={21} color={tone === 'destructive' ? c.destructive : c.foreground} />
    </Pressable>
  );
}

export function Segmented<V extends string>({ options, value, onChange, testID }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; testID?: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} testID={testID ? `${testID}-${o.value}` : undefined} accessibilityRole="radio" accessibilityState={{ selected: on }}
            onPress={() => { tap(); onChange(o.value); }}
            style={({ pressed }) => ({
              flexGrow: 1, minWidth: 130, minHeight: 46, paddingHorizontal: 12, paddingVertical: 8, borderRadius: c.radius, alignItems: 'center', justifyContent: 'center',
              borderWidth: on ? 2 : 1, borderColor: on ? c.primary : c.input, backgroundColor: on ? c.primarySoft : c.card, opacity: pressed ? 0.8 : 1,
            })}>
            <Text style={{ color: on ? c.accentForeground : c.foreground, fontFamily: on ? HEADING : undefined, fontSize: 15, textAlign: 'center' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, value, onChangeText, numeric, prefix, suffix, hint, placeholder, multiline, testID, autoCapitalize }: {
  label: string; value: string; onChangeText: (t: string) => void; numeric?: boolean; prefix?: string; suffix?: string; hint?: string;
  placeholder?: string; multiline?: boolean; testID?: string; autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  const c = useColors();
  const [focus, setFocus] = useState(false);
  const n = numeric && prefix === '£' ? amount(value) : NaN;
  return (
    <View style={{ gap: 6 }}>
      <T variant="small" style={{ fontFamily: HEADING }}>{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 50, borderRadius: c.radius, borderWidth: focus ? 2 : 1, borderColor: focus ? c.primary : c.input, backgroundColor: c.card, paddingHorizontal: 12, gap: 6 }}>
        {prefix ? <T tone="muted">{prefix}</T> : null}
        <TextInput
          testID={testID} accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.mutedForeground}
          keyboardType={numeric ? 'decimal-pad' : 'default'} multiline={multiline} autoCapitalize={autoCapitalize ?? (numeric ? 'none' : 'sentences')} autoCorrect={false}
          returnKeyType="done" blurOnSubmit onFocus={() => setFocus(true)} onBlur={() => {
            setFocus(false);
            if (value.trim() && Number.isFinite(n)) onChangeText(new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(n));
          }}
          style={{ flex: 1, minHeight: 46, fontSize: 16, color: c.foreground, paddingVertical: 8, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}) }}
        />
        {suffix ? <T tone="muted">{suffix}</T> : null}
        {numeric && focus ? (
          <Pressable testID={testID ? `${testID}-done` : undefined} accessibilityRole="button" accessibilityLabel="Done, hide keyboard" onPress={() => Keyboard.dismiss()}
            style={{ minHeight: 44, minWidth: 54, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.primary, fontFamily: HEADING, fontSize: 15 }}>Done</Text>
          </Pressable>
        ) : null}
      </View>
      {hint ? <T variant="small" tone="muted">{hint}</T> : null}
    </View>
  );
}

export function Check({ checked, label, onChange, testID }: { checked: boolean; label: string; onChange: (v: boolean) => void; testID?: string }) {
  const c = useColors();
  return (
    <Pressable testID={testID} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => { tap(); onChange(!checked); }}
      style={({ pressed }) => ({ flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 44, paddingVertical: 6, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: checked ? c.primary : c.input, backgroundColor: checked ? c.primary : c.card, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        {checked ? <Feather name="check" size={16} color={c.primaryForeground} /> : null}
      </View>
      <T style={{ flex: 1 }}>{label}</T>
    </Pressable>
  );
}

export function Banner({ tone = 'error', message, actionLabel, onAction, testID }: { tone?: 'error' | 'info' | 'success'; message: string; actionLabel?: string; onAction?: () => void; testID?: string }) {
  const c = useColors();
  const bg = tone === 'error' ? c.primarySoft : tone === 'success' ? c.successSoft : c.muted;
  const icon = tone === 'error' ? 'alert-circle' : tone === 'success' ? 'check-circle' : 'info';
  return (
    <View testID={testID} accessibilityRole="alert" style={{ backgroundColor: bg, borderRadius: c.radius, padding: 14, gap: 10, borderLeftWidth: 4, borderLeftColor: tone === 'error' ? c.primary : tone === 'success' ? c.success : c.mutedForeground }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Feather name={icon} size={20} color={tone === 'error' ? c.destructive : tone === 'success' ? c.success : c.foreground} style={{ marginTop: 2 }} />
        <T style={{ flex: 1 }}>{message}</T>
      </View>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" testID={testID ? `${testID}-action` : undefined} /> : null}
    </View>
  );
}

export function ErrorList({ errors, testID }: { errors: string[]; testID?: string }) {
  if (!errors.length) return null;
  return (
    <View testID={testID}>
      <Banner message={errors.length === 1 ? errors[0] : 'Please fix the following:'} />
      {errors.length > 1 ? (
        <View style={{ gap: 4, paddingTop: 8, paddingHorizontal: 4 }}>
          {errors.map((e, i) => <T key={i} variant="small" tone="destructive">{`\u2022 ${e}`}</T>)}
        </View>
      ) : null}
    </View>
  );
}

export function Row({ label, value, strong, note }: { label: string; value: string; strong?: boolean; note?: string }) {
  const c = useColors();
  return (
    <View style={{ paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, gap: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <T style={{ flex: 1, minWidth: 140 }} tone={strong ? 'default' : 'muted'}>{label}</T>
        <T style={{ fontFamily: strong ? HEADING : undefined, textAlign: 'right', flexShrink: 1 }}>{value}</T>
      </View>
      {note ? <T variant="small" tone="muted">{note}</T> : null}
    </View>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  const c = useColors();
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: lines }).map((_, i) => <View key={i} style={{ height: i === 0 ? 28 : 18, width: i === 0 ? '60%' : i % 2 ? '95%' : '80%', borderRadius: 8, backgroundColor: c.secondary }} />)}
    </View>
  );
}

export function Empty({ icon, title, body, children }: { icon: React.ComponentProps<typeof Feather>['name']; title: string; body: string; children?: React.ReactNode }) {
  const c = useColors();
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon} size={24} color={c.primary} />
      </View>
      <T variant="heading" style={{ textAlign: 'center' }}>{title}</T>
      <T tone="muted" style={{ textAlign: 'center' }}>{body}</T>
      {children}
    </Card>
  );
}

export function ConfirmDialog({ visible, title, message, confirmLabel, destructive, onConfirm, onCancel }: {
  visible: boolean; title: string; message: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(34,35,38,0.5)', justifyContent: 'center', padding: 24 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View style={{ backgroundColor: c.card, borderRadius: c.radius + 4, padding: 20, gap: 14 }} accessibilityViewIsModal>
            <T variant="title">{title}</T>
            <T tone="muted">{message}</T>
            <Button label={confirmLabel} onPress={onConfirm} variant={destructive ? 'brand' : 'primary'} testID="confirm-yes" />
            <Button label="Cancel" onPress={onCancel} variant="secondary" testID="confirm-cancel" />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export function ExternalLink({ label, url, testID }: { label: string; url: string; testID?: string }) {
  const c = useColors();
  const [failed, setFailed] = useState(false);
  return (
    <View>
      <Pressable testID={testID} accessibilityRole="link" accessibilityLabel={`${label}, opens in browser`}
        onPress={() => { tap(); Linking.openURL(url).then(() => setFailed(false)).catch(() => setFailed(true)); }}
        style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.6 : 1 })}>
        <Feather name="external-link" size={18} color={c.primary} />
        <T style={{ color: c.primary, fontFamily: HEADING, textDecorationLine: 'underline', flex: 1 }}>{label}</T>
      </Pressable>
      {failed ? <T variant="small" tone="destructive">Could not open the link. Check your connection or open {url} in a browser.</T> : null}
    </View>
  );
}

export function useBottomInset() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'web' ? 34 : insets.bottom;
}

export function Page({ children, headerRight, scrollRef }: { children: React.ReactNode; headerRight?: React.ReactNode; scrollRef?: React.RefObject<ScrollView | null> }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const top = Platform.OS === 'web' ? 67 : insets.top;
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ paddingTop: top + 8, paddingBottom: 8, paddingLeft: 20, paddingRight: 8, backgroundColor: c.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Image source={require('../assets/brand/wordmark.png')} resizeMode="contain" accessibilityLabel="RentalMetrics" style={{ width: 180, height: 18, flexShrink: 1 }} />
        <View style={{ flexDirection: 'row' }}>{headerRight}</View>
      </View>
      <KeyboardAwareScrollViewCompat
        ref={scrollRef as never} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 16 }}
        bottomOffset={24} contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag"
      >
        {children}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

