import { Platform } from 'react-native';
import { NativeModules } from 'react-native';

const normalizeUrl = (url) => url.replace(/\/$/, '');

const getMetroHost = () => {
  const scriptUrl = NativeModules?.SourceCode?.scriptURL;
  if (!scriptUrl) {
    return null;
  }

  try {
    return new URL(scriptUrl).hostname;
  } catch {
    return null;
  }
};

const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return normalizeUrl(envUrl);
  }

  // For browser tests on the same machine, use local backend directly.
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }

  const metroHost = getMetroHost();
  if (metroHost) {
    return `http://${metroHost}:8000`;
  }

  // Android emulator uses 10.0.2.2 to reach the host machine.
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  // iOS simulator and web can typically use localhost.
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();