import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Dimensions, StatusBar } from 'react-native';
import { API_BASE_URL } from '../config/api';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Lütfen e-posta ve şifrenizi girin.");
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onLoginSuccess?.(data.access_token);
      } else {
        alert(data.detail || "Giriş başarısız.");
      }
    } catch (error) {
      console.error(error);
      alert(`Sunucuya bağlanılamadı. Hedef: ${API_BASE_URL}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8E8" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.innerContainer}
      >
        {/* Dekoratif Arka Plan Efektleri */}
        <View style={styles.decorationCircle1} />
        <View style={styles.decorationCircle2} />

        <View style={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Hoş Geldiniz</Text>
            <Text style={styles.subtitle}>Uygulamaya devam etmek için giriş yapın</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>E-posta</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'email' && styles.inputFocused
                ]}
                placeholder="ornek@email.com"
                placeholderTextColor="#B8985A"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Şifre</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'password' && styles.inputFocused
                ]}
                placeholder="••••••••"
                placeholderTextColor="#B8985A"
                secureTextEntry
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <TouchableOpacity style={styles.forgotPassword} activeOpacity={0.7}>
              <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginButton} activeOpacity={0.8} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Hesabınız yok mu? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
              <Text style={styles.registerText}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E8',
  },
  decorationCircle1: {
    position: 'absolute',
    top: -width * 0.1,
    right: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: '#FBBF24',
    opacity: 0.15,
    transform: [{ scale: 1.3 }],
  },
  decorationCircle2: {
    position: 'absolute',
    bottom: -width * 0.2,
    left: -width * 0.3,
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    backgroundColor: '#F59E0B',
    opacity: 0.1,
  },
  innerContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 1,
  },
  headerContainer: {
    marginBottom: 50,
    marginTop: 20,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#8A4B00',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#B26A00',
    fontWeight: '400',
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#8A6A00',
    marginBottom: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#FFF3D9',
    borderRadius: 16,
    padding: 18,
    color: '#5B3A00',
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: '#F4D7A1',
  },
  inputFocused: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFEBC9',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 40,
  },
  forgotPasswordText: {
    color: '#B26A00',
    fontSize: 14,
    fontWeight: '700',
  },
  loginButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  loginButtonText: {
    color: '#3F2A00',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 50,
  },
  footerText: {
    color: '#B26A00',
    fontSize: 15,
  },
  registerText: {
    color: '#8A4B00',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
