import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WebViewScreen from '../screens/WebViewScreen';

/**
 * Root param list — extend this when adding native screens.
 * Example:
 *   Cart: { productId: string };
 *   OrderConfirmation: { orderId: string };
 */
export type RootStackParamList = {
  WebView: undefined;
  // NativeHome: undefined;   <- future native screen
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="WebView" component={WebViewScreen} />
        {/* Add native screens here as the app evolves */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
