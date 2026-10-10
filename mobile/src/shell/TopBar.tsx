import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ShellColors, useShellColors } from './theme';
import { CountBadge } from './TabBar';

type Props = {
  title: string;
  cartCount: number;
  showCart: boolean;
  onBack: () => void;
  onCart: () => void;
};

/** Material-style top app bar for sub-pages: back arrow, title, cart shortcut. */
export default function TopBar({ title, cartCount, showCart, onBack, onCart }: Props) {
  const colors = useShellColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        android_ripple={{ color: colors.ripple, borderless: true, radius: 22 }}
        style={styles.iconButton}
        hitSlop={6}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.charcoal} />
      </Pressable>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {showCart ? (
        <Pressable
          onPress={onCart}
          accessibilityRole="button"
          accessibilityLabel={cartCount > 0 ? `Cart, ${cartCount} items` : 'Cart'}
          android_ripple={{ color: colors.ripple, borderless: true, radius: 22 }}
          style={styles.iconButton}
          hitSlop={6}
        >
          <MaterialCommunityIcons name="cart-outline" size={24} color={colors.charcoal} />
          <CountBadge count={cartCount} style={styles.badge} />
        </Pressable>
      ) : (
        <View style={styles.iconButton} />
      )}
    </View>
  );
}

const makeStyles = (colors: ShellColors) => StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    elevation: 2,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    marginLeft: 4,
    fontSize: 18,
    fontWeight: '600',
    color: colors.charcoal,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
  },
});
