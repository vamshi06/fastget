import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from './theme';

export type CartSummary = {
  count: number;
  itemsLabel: string;
  totalLabel: string;
  hint?: string;
  cta: string;
};

// Height the page has to leave free underneath (pill + its margins); passed
// to the site as --shell-overlay so the last row of content isn't hidden.
export const CART_PILL_SPACE = 84;

/**
 * Floating cart summary above the tab bar (Zepto/Blinkit style): item count,
 * total, an optional nudge, and "View cart". All text arrives pre-formatted
 * and translated from the site (CART_COUNT message).
 */
export default function CartPill({ summary, onPress }: { summary: CartSummary; onPress: () => void }) {
  // Slide up on first appearance; bump when the count changes.
  const rise = useRef(new Animated.Value(40)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(summary.count);

  useEffect(() => {
    Animated.timing(rise, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [rise]);

  useEffect(() => {
    if (summary.count !== prevCount.current) {
      prevCount.current = summary.count;
      scale.setValue(0.96);
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
    }
  }, [summary.count, scale]);

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: rise }, { scale }] }]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${summary.itemsLabel}, ${summary.totalLabel}. ${summary.cta}`}
        android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
        style={styles.pill}
      >
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="cart" size={22} color={colors.primary} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.primaryLine} numberOfLines={1}>
            {summary.itemsLabel} · {summary.totalLabel}
          </Text>
          {summary.hint ? (
            <Text style={styles.hint} numberOfLines={1}>
              {summary.hint}
            </Text>
          ) : null}
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{summary.cta}</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.charcoal} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  pill: {
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.charcoal,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 8,
    overflow: 'hidden',
    elevation: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245,166,35,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    marginHorizontal: 10,
  },
  primaryLine: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  hint: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 44,
    paddingLeft: 14,
    paddingRight: 6,
  },
  ctaText: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: '700',
  },
});
