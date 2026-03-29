import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, View } from 'react-native';

// Ekranları içe aktarıyoruz
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';

const Stack = createNativeStackNavigator();
const AUTH_TOKEN_KEY = 'agenda_auth_token';

export default function App() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const savedToken = globalThis?.localStorage?.getItem(AUTH_TOKEN_KEY);
      setIsAuthenticated(Boolean(savedToken));
      setAuthToken(savedToken || null);
    }

    setIsCheckingAuth(false);
  }, []);

  const handleLoginSuccess = (token) => {
    if (Platform.OS === 'web' && token) {
      globalThis?.localStorage?.setItem(AUTH_TOKEN_KEY, token);
    }
    setAuthToken(token || null);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      globalThis?.localStorage?.removeItem(AUTH_TOKEN_KEY);
    }
    setAuthToken(null);
    setIsAuthenticated(false);
  };

  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A192F' }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false, // Tasarımı ekranın tamamına yaydığımız için üstteki varsayılan başlığı gizliyoruz
          animation: 'fade',  // Ekran geçişleri için yumuşak bir fade efekti
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen name="Home">
            {(props) => <HomeScreen {...props} authToken={authToken} onLogout={handleLogout} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />}
            </Stack.Screen>
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
