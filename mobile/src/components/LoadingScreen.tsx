import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { APP_CONFIG } from '../constants/config';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>{APP_CONFIG.name}</Text>
      <ActivityIndicator size="large" color="#ffffff" style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -1,
    marginBottom: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: 'rgba(28, 28, 30, 0.65)',
    letterSpacing: 0.3,
  },
});
