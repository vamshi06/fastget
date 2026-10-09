import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TABS, TabKey } from './routes';
import { colors } from './theme';

type Props = {
  active: TabKey | null;
  labels: Partial<Record<TabKey, string>>;
  onPress: (key: TabKey, path: string) => void;
};

/**
 * Bottom navigation in the style of Indian quick-commerce apps: no indicator
 * box - the active tab is a filled icon in the brand colour with a short
 * accent line above it; the rest are thin grey outlines.
 */
export default function TabBar({ active, labels, onPress }: Props) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const label = labels[tab.key] || tab.fallbackLabel;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onPress(tab.key, tab.path)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
            android_ripple={{ color: 'rgba(245,166,35,0.16)', borderless: true, radius: 40 }}
            style={styles.tab}
          >
            <View style={[styles.accent, isActive && styles.accentActive]} />
            <MaterialCommunityIcons
              name={(isActive ? tab.activeIcon : tab.icon) as any}
              size={26}
              color={isActive ? colors.primary : colors.steel}
            />
            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CountBadge({ count, style }: { count: number; style?: ViewStyle }) {
  if (count <= 0) return null;
  return (
    <View style={[styles.countBadge, style]} pointerEvents="none">
      <Text style={styles.countText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  // Sits at the very top edge of the bar, above the active icon.
  accent: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: 'transparent',
  },
  accentActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.steel,
  },
  labelActive: {
    color: colors.charcoal,
    fontWeight: '700',
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.badge,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
