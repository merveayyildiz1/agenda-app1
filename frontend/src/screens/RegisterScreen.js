import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Dimensions, StatusBar, ScrollView } from 'react-native';
import { API_BASE_URL } from '../config/api';

const { width } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }
    
    if (password !== confirmPassword) {
      alert("Şifreler eşleşmiyor!");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: name,
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Kayıt başarılı.");
        navigation.navigate("Login");
      } else {
        alert(data.detail || "Kayıt sırasında bir hata oluştu.");
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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Dekoratif Arka Plan Efektleri */}
          <View style={styles.decorationCircle1} />
          <View style={styles.decorationCircle2} />

          <View style={styles.contentContainer}>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Hesap Oluştur</Text>
              <Text style={styles.subtitle}>Aramıza katılın ve zamanınızı yönetmeye başlayın</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Ad Soyad</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedInput === 'name' && styles.inputFocused
                  ]}
                  placeholder="Adınız ve Soyadınız"
                  placeholderTextColor="#B8985A"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

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

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Şifre (Tekrar)</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedInput === 'confirmPassword' && styles.inputFocused
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor="#B8985A"
                  secureTextEntry
                  autoComplete="off"
                  textContentType="none"
                  importantForAutofill="no"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedInput('confirmPassword')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              <TouchableOpacity style={styles.registerButton} activeOpacity={0.8} onPress={handleRegister}>
                <Text style={styles.registerButtonText}>Kayıt Ol</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Zaten hesabınız var mı? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                <Text style={styles.loginText}>Giriş Yap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E8',
  },
  scrollContent: {
    flexGrow: 1,
  },
  decorationCircle1: {
    position: 'absolute',
    top: -width * 0.1,
    left: -width * 0.1,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: '#F59E0B',
    opacity: 0.15,
    transform: [{ scale: 1.2 }],
  },
  decorationCircle2: {
    position: 'absolute',
    bottom: -width * 0.2,
    right: -width * 0.2,
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    backgroundColor: '#FBBF24',
    opacity: 0.12,
  },
  innerContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
    zIndex: 1,
  },
  headerContainer: {
    marginBottom: 40,
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
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
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
  registerButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  registerButtonText: {
    color: '#3F2A00',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  footerText: {
    color: '#B26A00',
    fontSize: 15,
  },
  loginText: {
    color: '#8A4B00',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
