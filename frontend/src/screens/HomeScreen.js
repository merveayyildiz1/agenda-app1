import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar, TextInput, ScrollView, Platform, Alert, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { API_BASE_URL } from '../config/api';

const THEME_KEY = 'agenda_theme';
const PROFILE_PHOTO_KEY = 'agenda_profile_photo';
const ACTIVE_TAB_KEY = 'agenda_active_tab';
const NOTIFICATIONS_KEY = 'agenda_notifications_enabled';
const LANGUAGE_KEY = 'agenda_language';
const NOTIFICATION_HOUR_KEY = 'agenda_notification_hour';
const NOTIFICATION_MINUTE_KEY = 'agenda_notification_minute';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function HomeScreen({ authToken, onLogout }) {
  const [activeTab, setActiveTab] = useState('Ajanda');
  const [journalText, setJournalText] = useState('');
  const [journalEntries, setJournalEntries] = useState([]);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [theme, setTheme] = useState('light');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationHour, setNotificationHour] = useState('21');
  const [notificationMinute, setNotificationMinute] = useState('00');
  const [language, setLanguage] = useState('tr');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSectionExpanded, setPasswordSectionExpanded] = useState(false);
  const notebookLines = Array.from({ length: 28 });
  const { height: windowHeight } = useWindowDimensions();

  const isDarkTheme = theme === 'dark';

  const palette = isDarkTheme
    ? {
        pageBg: '#111827',
        cardBg: '#1F2937',
        textPrimary: '#E5E7EB',
        textSecondary: '#9CA3AF',
        bottomBg: '#111827',
        border: '#334155',
        tabBg: '#1F2937',
        tabActiveBg: '#374151',
        tabText: '#D1D5DB',
        tabTextActive: '#FFFFFF',
        settingsInputBg: '#111827',
      }
    : {
        pageBg: '#FFF8E8',
        cardBg: '#FFF3DE',
        textPrimary: '#6B3E00',
        textSecondary: '#9A5C00',
        bottomBg: '#FFF1D6',
        border: '#F2D7A6',
        tabBg: '#FFECC8',
        tabActiveBg: '#FFDEAC',
        tabText: '#8A5A00',
        tabTextActive: '#5A3400',
        settingsInputBg: '#FFFBF2',
      };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const savedTheme = globalThis?.localStorage?.getItem(THEME_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
      const savedPhoto = globalThis?.localStorage?.getItem(PROFILE_PHOTO_KEY);
      if (savedPhoto) {
        setProfilePhoto(savedPhoto);
      }
      const savedTab = globalThis?.localStorage?.getItem(ACTIVE_TAB_KEY);
      if (savedTab === 'Kronometre' || savedTab === 'Gunluk' || savedTab === 'Ajanda' || savedTab === 'Ayarlar') {
        setActiveTab(savedTab);
      }
      const savedNotifications = globalThis?.localStorage?.getItem(NOTIFICATIONS_KEY);
      if (savedNotifications === 'true' || savedNotifications === 'false') {
        setNotificationsEnabled(savedNotifications === 'true');
      }
      const savedLanguage = globalThis?.localStorage?.getItem(LANGUAGE_KEY);
      if (savedLanguage === 'tr' || savedLanguage === 'en') {
        setLanguage(savedLanguage);
      }
      const savedHour = globalThis?.localStorage?.getItem(NOTIFICATION_HOUR_KEY);
      const savedMinute = globalThis?.localStorage?.getItem(NOTIFICATION_MINUTE_KEY);
      if (savedHour && /^\d{1,2}$/.test(savedHour)) {
        setNotificationHour(savedHour);
      }
      if (savedMinute && /^\d{1,2}$/.test(savedMinute)) {
        setNotificationMinute(savedMinute);
      }
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      globalThis?.localStorage?.setItem(ACTIVE_TAB_KEY, activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      globalThis?.localStorage?.setItem(NOTIFICATIONS_KEY, String(notificationsEnabled));
    }
  }, [notificationsEnabled]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      globalThis?.localStorage?.setItem(LANGUAGE_KEY, language);
    }
  }, [language]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      globalThis?.localStorage?.setItem(NOTIFICATION_HOUR_KEY, notificationHour);
      globalThis?.localStorage?.setItem(NOTIFICATION_MINUTE_KEY, notificationMinute);
    }
  }, [notificationHour, notificationMinute]);

  useEffect(() => {
    const loadJournalEntries = async () => {
      if (!authToken) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/journal`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        const data = await response.json();
        if (response.status === 401) {
          onLogout?.();
          return;
        }
        if (response.ok && Array.isArray(data)) {
          setJournalEntries(data);
        }
      } catch (error) {
        console.error('Gunluk kayitlari yuklenemedi:', error);
      }
    };

    loadJournalEntries();
  }, [authToken, onLogout]);

  const screenContent = useMemo(() => {
    if (activeTab === 'Kronometre') {
      return {
        title: 'Kronometre',
        subtitle: 'Kronometre modulu yakinda burada olacak.',
      };
    }

    if (activeTab === 'Gunluk') {
      return {
        title: 'Gunluk',
        subtitle: 'Gunluk notlarinizi bu bolumde tutacaksiniz.',
      };
    }
    if (activeTab === 'Ayarlar') {
      return {
        title: 'Ayarlar',
        subtitle: 'Hesabinizla ilgili islemleri buradan yonetin.',
      };
    }

    return {
      title: 'Ajanda',
      subtitle: 'Ajanda gorunumu bu bolumde yer alacak.',
    };
  }, [activeTab]);

  const applyTheme = (nextTheme) => {
    setTheme(nextTheme);
    if (Platform.OS === 'web') {
      globalThis?.localStorage?.setItem(THEME_KEY, nextTheme);
    }
  };

  const t = useMemo(() => {
    if (language === 'en') {
      return {
        settingsTitle: 'Account Settings',
        settingsSubtitle: 'Profile photo and account preferences.',
        themeTitle: '',
        lightTheme: 'Light',
        darkTheme: 'Dark',
        notificationsTitle: 'Notifications',
        notificationsHint: 'Daily reminder notifications for journal writing.',
        notificationTimeLabel: 'Reminder time',
        notificationsOn: 'Enabled',
        notificationsOff: 'Disabled',
        languageTitle: 'Language',
        securityTitle: 'Change Password',
        securityHint: 'Choose a new password with at least 6 characters.',
        currentPassword: 'Current password',
        newPassword: 'New password',
        confirmPassword: 'Confirm new password',
        updatePassword: 'Update Password',
        tabTimer: 'Timer',
        tabJournal: 'Journal',
        tabAgenda: 'Agenda',
        tabSettings: 'Settings',
      };
    }
    return {
      settingsTitle: 'Hesap Ayarlari',
      settingsSubtitle: 'Profil fotografi ve hesap tercihlerin.',
      themeTitle: '',
      lightTheme: 'Acik Tema',
      darkTheme: 'Koyu Tema',
      notificationsTitle: 'Bildirimler',
      notificationsHint: 'Gunluk yazma hatirlatma bildirimleri.',
      notificationTimeLabel: 'Bildirim Saati',
      notificationsOn: 'Acik',
      notificationsOff: 'Kapali',
      languageTitle: 'Dil',
      securityTitle: 'Sifre Degistir',
      securityHint: 'Guvenlik icin en az 6 karakterli yeni bir sifre belirle.',
      currentPassword: 'Mevcut sifre',
      newPassword: 'Yeni sifre',
      confirmPassword: 'Yeni sifre (tekrar)',
      updatePassword: 'Sifreyi Guncelle',
      tabTimer: 'Kronometre',
      tabJournal: 'Gunluk',
      tabAgenda: 'Ajanda',
      tabSettings: 'Ayarlar',
    };
  }, [language]);

  const pickProfilePhoto = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Bilgi', 'Mobil tarafta profil foto yukleme ozelligini sonraki adimda ekleyebilirim.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (event) => {
      const file = event?.target?.files?.[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result;
        if (typeof imageData === 'string') {
          setProfilePhoto(imageData);
          globalThis?.localStorage?.setItem(PROFILE_PHOTO_KEY, imageData);
        }
      };
      reader.readAsDataURL(file);
    };

    input.click();
  };

  const setDailyReminder = async () => {
    if (Platform.OS === 'web') {
      return false;
    }

    const permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      return false;
    }

    const parsedHour = Number(notificationHour);
    const parsedMinute = Number(notificationMinute);
    const isHourValid = Number.isInteger(parsedHour) && parsedHour >= 0 && parsedHour <= 23;
    const isMinuteValid = Number.isInteger(parsedMinute) && parsedMinute >= 0 && parsedMinute <= 59;
    if (!isHourValid || !isMinuteValid) {
      return false;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: language === 'en' ? 'Journal Reminder' : 'Gunluk Hatirlatmasi',
        body: language === 'en' ? 'Write a short note for today.' : 'Bugun icin kisa bir gunluk notu yaz.',
      },
      trigger: {
        hour: parsedHour,
        minute: parsedMinute,
        repeats: true,
      },
    });

    return id;
  };

  const handleNotificationsToggle = async () => {
    const parsedHour = Number(notificationHour);
    const parsedMinute = Number(notificationMinute);
    const isHourValid = Number.isInteger(parsedHour) && parsedHour >= 0 && parsedHour <= 23;
    const isMinuteValid = Number.isInteger(parsedMinute) && parsedMinute >= 0 && parsedMinute <= 59;
    if (!isHourValid || !isMinuteValid) {
      Alert.alert(
        language === 'en' ? 'Invalid time' : 'Gecersiz saat',
        language === 'en' ? 'Please enter a valid HH:MM value.' : 'Lutfen gecerli bir SS:DD degeri girin.'
      );
      return;
    }

    if (notificationsEnabled) {
      if (Platform.OS !== 'web') {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
      setNotificationsEnabled(false);
      return;
    }

    try {
      const result = await setDailyReminder();
      if (!result) {
        Alert.alert(
          language === 'en' ? 'Permission required' : 'Izin gerekli',
          language === 'en'
            ? 'Please allow notifications from device settings.'
            : 'Lutfen cihaz ayarlarindan bildirim izni verin.'
        );
        return;
      }
      setNotificationsEnabled(true);
    } catch (error) {
      console.error('Notification setup failed:', error);
      Alert.alert(
        language === 'en' ? 'Error' : 'Hata',
        language === 'en' ? 'Could not configure notifications.' : 'Bildirim ayarlanamadi.'
      );
    }
  };

  const formatDateLabel = (isoDate) => {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return parsed.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const saveJournalEntry = async () => {
    const trimmedText = journalText.trim();
    if (!trimmedText || !authToken) {
      return;
    }

    try {
      const isUpdating = Boolean(selectedEntryId);
      const response = await fetch(
        isUpdating ? `${API_BASE_URL}/journal/${selectedEntryId}` : `${API_BASE_URL}/journal`,
        {
          method: isUpdating ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ content: trimmedText }),
        }
      );
      const data = await response.json();

      if (response.status === 401) {
        onLogout?.();
        return;
      }

      if (!response.ok) {
        alert(data.detail || 'Gunluk kaydi eklenemedi.');
        return;
      }

      setJournalEntries((prev) => {
        if (isUpdating) {
          return prev.map((entry) => (entry.id === data.id ? data : entry));
        }
        return [data, ...prev];
      });
      setJournalText('');
      setSelectedEntryId(null);
    } catch (error) {
      console.error('Gunluk kaydi eklenemedi:', error);
      alert('Sunucuya baglanilamadi.');
    }
  };

  const handleSelectEntry = (entry) => {
    setSelectedEntryId(entry.id);
    setJournalText(entry.content || '');
  };

  const handleChangePassword = async () => {
    if (!authToken) {
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Eksik bilgi', 'Lutfen tum sifre alanlarini doldurun.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Yeni sifre ve tekrar sifresi ayni olmali.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Hata', 'Yeni sifre en az 6 karakter olmali.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/me/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await response.json();

      if (response.status === 401) {
        onLogout?.();
        return;
      }
      if (!response.ok) {
        Alert.alert('Hata', data.detail || 'Sifre degistirilemedi.');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSectionExpanded(false);
      Alert.alert('Basarili', 'Sifreniz guncellendi.');
    } catch (error) {
      console.error('Sifre degistirme hatasi:', error);
      Alert.alert('Hata', 'Sunucuya baglanirken bir sorun olustu.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.pageBg }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={palette.pageBg} />
      <View style={[styles.content, activeTab === 'Ayarlar' && styles.contentSettings]}>
        {activeTab === 'Gunluk' ? (
          <View style={styles.journalLayout}>
            <View style={[styles.journalSidebar, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
              <Text style={[styles.sidebarTitle, { color: palette.textPrimary }]}>Kaydedilenler</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarScrollContent}>
                {journalEntries.length === 0 ? (
                  <View />
                ) : (
                  journalEntries.map((entry) => (
                    <TouchableOpacity
                      key={entry.id}
                      style={[
                        styles.entryCard,
                        { borderColor: palette.border, backgroundColor: isDarkTheme ? '#273449' : '#FFF8E6' },
                        selectedEntryId === entry.id && styles.entryCardActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleSelectEntry(entry)}
                    >
                      <Text style={[styles.entryDate, { color: isDarkTheme ? '#FBBF24' : '#A16207' }]}>{formatDateLabel(entry.created_at)}</Text>
                      <Text style={[styles.entryPreview, { color: palette.textPrimary }]} numberOfLines={2}>{entry.content}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.sidebarLogoutButton}
                onPress={onLogout}
              >
                <Text style={styles.sidebarLogoutButtonText}>Cikis Yap</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.notebookContainer, { backgroundColor: isDarkTheme ? '#1F2937' : '#FFFDF6' }]}>
              <View style={styles.notebookMarginLine} />
              <View style={styles.notebookLinesLayer} pointerEvents="none">
                {notebookLines.map((_, index) => (
                  <View key={index} style={[styles.notebookLine, { backgroundColor: isDarkTheme ? '#334155' : '#E9D8AE' }]} />
                ))}
              </View>
              <View style={styles.notebookTextWrap}>
                <TextInput
                  style={[styles.journalInput, { color: palette.textPrimary }]}
                  value={journalText}
                  onChangeText={setJournalText}
                  placeholder=""
                  placeholderTextColor="#B8985A"
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity style={styles.saveButton} onPress={saveJournalEntry}>
                  <Text style={styles.saveButtonText}>{selectedEntryId ? 'Guncelle' : 'Kaydet'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : activeTab === 'Ayarlar' ? (
          <ScrollView
            style={styles.settingsLayout}
            contentContainerStyle={[
              styles.settingsScrollContent,
              {
                paddingBottom: Math.max(40, Math.round(windowHeight * 0.08)),
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.settingsTopLeft}>
              <View style={styles.settingsHeader}>
                <TouchableOpacity
                  style={[styles.profilePhotoButton, { borderColor: palette.border, backgroundColor: isDarkTheme ? '#1E293B' : '#FFFDF6' }]}
                  onPress={pickProfilePhoto}
                  activeOpacity={0.85}
                >
                  {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.profilePhotoImage} />
                  ) : (
                    <Ionicons name="person-outline" size={26} color={palette.textPrimary} />
                  )}
                  <View style={styles.profileEditBadge}>
                    <Ionicons name="camera-outline" size={11} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <View style={styles.settingsHeaderTextWrap}>
                  <Text style={[styles.settingsMainTitle, { color: palette.textPrimary }]}>{t.settingsTitle}</Text>
                  <Text style={[styles.settingsMainSubtitle, { color: palette.textSecondary }]}>
                    {t.settingsSubtitle}
                  </Text>
                </View>
              </View>
              <View style={[styles.settingsHeaderDivider, { backgroundColor: palette.border }]} />
              <View style={styles.settingsThemeBelowHeader}>
                <View style={styles.themeRow}>
                  <TouchableOpacity
                    style={[
                      styles.themeChoiceButton,
                      {
                        backgroundColor: !isDarkTheme ? '#E8A24D' : palette.settingsInputBg,
                        borderColor: palette.border,
                      },
                    ]}
                    onPress={() => applyTheme('light')}
                  >
                    <Ionicons name="sunny-outline" size={16} color={!isDarkTheme ? '#FFFFFF' : palette.textPrimary} />
                    <Text style={[styles.themeChoiceText, { color: !isDarkTheme ? '#FFFFFF' : palette.textPrimary }]}>{t.lightTheme}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.themeChoiceButton,
                      {
                        backgroundColor: isDarkTheme ? '#E8A24D' : palette.settingsInputBg,
                        borderColor: palette.border,
                      },
                    ]}
                    onPress={() => applyTheme('dark')}
                  >
                    <Ionicons name="moon-outline" size={16} color={isDarkTheme ? '#FFFFFF' : palette.textPrimary} />
                    <Text style={[styles.themeChoiceText, { color: isDarkTheme ? '#FFFFFF' : palette.textPrimary }]}>{t.darkTheme}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.settingsCenterArea}>
              <View style={[styles.settingsSectionDivider, { backgroundColor: palette.border }]} />

              <View style={styles.settingsSection}>
                <View style={styles.settingsSectionHeader}>
                  <Text style={[styles.settingsTitle, { color: palette.textPrimary }]}>{t.notificationsTitle}</Text>
                </View>
                <Text style={[styles.settingsHintText, { color: palette.textSecondary }]}>{t.notificationsHint}</Text>
                <Text style={[styles.settingsTimeLabel, { color: palette.textPrimary }]}>{t.notificationTimeLabel}</Text>
                <View style={styles.notificationTimeRow}>
                  <TextInput
                    value={notificationHour}
                    onChangeText={(value) => setNotificationHour(value.replace(/[^0-9]/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    placeholder="21"
                    placeholderTextColor={isDarkTheme ? '#94A3B8' : '#9CA3AF'}
                    style={[styles.notificationTimeInput, { backgroundColor: palette.settingsInputBg, color: palette.textPrimary, borderColor: palette.border }]}
                  />
                  <Text style={[styles.notificationTimeColon, { color: palette.textPrimary }]}>:</Text>
                  <TextInput
                    value={notificationMinute}
                    onChangeText={(value) => setNotificationMinute(value.replace(/[^0-9]/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    placeholder="00"
                    placeholderTextColor={isDarkTheme ? '#94A3B8' : '#9CA3AF'}
                    style={[styles.notificationTimeInput, { backgroundColor: palette.settingsInputBg, color: palette.textPrimary, borderColor: palette.border }]}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.notificationToggleButton,
                    {
                      backgroundColor: notificationsEnabled ? '#E8A24D' : palette.settingsInputBg,
                      borderColor: palette.border,
                    },
                  ]}
                  onPress={handleNotificationsToggle}
                >
                  <Ionicons
                    name={notificationsEnabled ? 'notifications' : 'notifications-off'}
                    size={16}
                    color={notificationsEnabled ? '#FFFFFF' : palette.textPrimary}
                  />
                  <Text style={[styles.notificationToggleText, { color: notificationsEnabled ? '#FFFFFF' : palette.textPrimary }]}>
                    {notificationsEnabled ? t.notificationsOn : t.notificationsOff}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.settingsSectionDivider, { backgroundColor: palette.border }]} />

              <View style={styles.settingsSection}>
                <View style={styles.settingsSectionHeader}>
                  <Text style={[styles.settingsTitle, { color: palette.textPrimary }]}>{t.languageTitle}</Text>
                </View>
                <View style={styles.themeRow}>
                  <TouchableOpacity
                    style={[
                      styles.themeChoiceButton,
                      {
                        backgroundColor: language === 'tr' ? '#E8A24D' : palette.settingsInputBg,
                        borderColor: palette.border,
                      },
                    ]}
                    onPress={() => setLanguage('tr')}
                  >
                    <Text style={[styles.themeChoiceText, { color: language === 'tr' ? '#FFFFFF' : palette.textPrimary }]}>TR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.themeChoiceButton,
                      {
                        backgroundColor: language === 'en' ? '#E8A24D' : palette.settingsInputBg,
                        borderColor: palette.border,
                      },
                    ]}
                    onPress={() => setLanguage('en')}
                  >
                    <Text style={[styles.themeChoiceText, { color: language === 'en' ? '#FFFFFF' : palette.textPrimary }]}>EN</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.settingsSectionDivider, { backgroundColor: palette.border }]} />

              <View style={[styles.settingsSection]}>
                <TouchableOpacity
                  style={[
                    styles.passwordSectionToggle,
                    {
                      borderColor: palette.border,
                      backgroundColor: passwordSectionExpanded ? 'rgba(232, 162, 77, 0.2)' : palette.settingsInputBg,
                    },
                  ]}
                  onPress={() => setPasswordSectionExpanded((open) => !open)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.settingsTitle, { color: palette.textPrimary }]}>{t.securityTitle}</Text>
                  <Ionicons
                    name={passwordSectionExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={palette.textPrimary}
                  />
                </TouchableOpacity>
                {passwordSectionExpanded ? (
                  <>
                    <Text style={[styles.settingsHintText, { color: palette.textSecondary }]}>
                      {t.securityHint}
                    </Text>
                    <TextInput
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry
                      placeholder={t.currentPassword}
                      placeholderTextColor={isDarkTheme ? '#94A3B8' : '#9CA3AF'}
                      style={[styles.settingsInput, { backgroundColor: palette.settingsInputBg, color: palette.textPrimary, borderColor: palette.border }]}
                    />
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      placeholder={t.newPassword}
                      placeholderTextColor={isDarkTheme ? '#94A3B8' : '#9CA3AF'}
                      style={[styles.settingsInput, { backgroundColor: palette.settingsInputBg, color: palette.textPrimary, borderColor: palette.border }]}
                    />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      placeholder={t.confirmPassword}
                      placeholderTextColor={isDarkTheme ? '#94A3B8' : '#9CA3AF'}
                      style={[styles.settingsInput, { backgroundColor: palette.settingsInputBg, color: palette.textPrimary, borderColor: palette.border }]}
                    />
                    <TouchableOpacity style={styles.changePasswordButton} onPress={handleChangePassword}>
                      <Text style={styles.changePasswordButtonText}>{t.updatePassword}</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>
          </ScrollView>
        ) : (
          <>
            <Text style={[styles.title, { color: palette.textPrimary }]}>{screenContent.title}</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{screenContent.subtitle}</Text>
          </>
        )}
        {activeTab !== 'Gunluk' && activeTab !== 'Ayarlar' && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={onLogout}
          >
            <Text style={styles.logoutButtonText}>Cikis Yap</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.bottomBar, { backgroundColor: palette.bottomBg, borderTopColor: palette.border }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: palette.tabBg },
            activeTab === 'Kronometre' && styles.tabButtonActive,
            activeTab === 'Kronometre' && { backgroundColor: palette.tabActiveBg },
          ]}
          onPress={() => setActiveTab('Kronometre')}
        >
          <Ionicons
            name="timer-outline"
            size={18}
            style={styles.tabIcon}
            color={activeTab === 'Kronometre' ? palette.tabTextActive : palette.tabText}
          />
          <Text
            style={[styles.tabText, { color: palette.tabText }, activeTab === 'Kronometre' && { color: palette.tabTextActive }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {t.tabTimer}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: palette.tabBg },
            activeTab === 'Gunluk' && styles.tabButtonActive,
            activeTab === 'Gunluk' && { backgroundColor: palette.tabActiveBg },
          ]}
          onPress={() => setActiveTab('Gunluk')}
        >
          <Ionicons
            name="book-outline"
            size={18}
            style={styles.tabIcon}
            color={activeTab === 'Gunluk' ? palette.tabTextActive : palette.tabText}
          />
          <Text
            style={[styles.tabText, { color: palette.tabText }, activeTab === 'Gunluk' && { color: palette.tabTextActive }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {t.tabJournal}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: palette.tabBg },
            activeTab === 'Ajanda' && styles.tabButtonActive,
            activeTab === 'Ajanda' && { backgroundColor: palette.tabActiveBg },
          ]}
          onPress={() => setActiveTab('Ajanda')}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            style={styles.tabIcon}
            color={activeTab === 'Ajanda' ? palette.tabTextActive : palette.tabText}
          />
          <Text
            style={[styles.tabText, { color: palette.tabText }, activeTab === 'Ajanda' && { color: palette.tabTextActive }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {t.tabAgenda}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: palette.tabBg },
            activeTab === 'Ayarlar' && styles.tabButtonActive,
            activeTab === 'Ayarlar' && { backgroundColor: palette.tabActiveBg },
          ]}
          onPress={() => setActiveTab('Ayarlar')}
        >
          <Ionicons
            name="settings-outline"
            size={18}
            style={styles.tabIcon}
            color={activeTab === 'Ayarlar' ? palette.tabTextActive : palette.tabText}
          />
          <Text
            style={[styles.tabText, { color: palette.tabText }, activeTab === 'Ayarlar' && { color: palette.tabTextActive }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {t.tabSettings}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E8',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  contentSettings: {
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8A4B00',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#B26A00',
    marginBottom: 40,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#FFE8CC',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#B45309',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF2D6',
    borderTopWidth: 1,
    borderTopColor: '#F4D7A1',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: '#FFEBC9',
  },
  tabButtonActive: {
    backgroundColor: '#FFD68A',
  },
  tabIcon: {
    marginBottom: 4,
  },
  tabText: {
    color: '#8A6A00',
    fontSize: 12,
    fontWeight: '700',
    width: '100%',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#3F2A00',
  },
  notebookContainer: {
    flex: 1,
    minHeight: 360,
    borderRadius: 16,
    backgroundColor: '#FFFDF6',
    borderWidth: 0,
    overflow: 'hidden',
    paddingTop: 10,
    paddingBottom: 10,
  },
  journalLayout: {
    width: '100%',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  journalSidebar: {
    width: 170,
    borderRadius: 16,
    backgroundColor: '#FFF1D2',
    borderWidth: 1,
    borderColor: '#F1D7A5',
    padding: 12,
  },
  sidebarTitle: {
    color: '#8A4B00',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  sidebarScrollContent: {
    flexGrow: 1,
    paddingBottom: 12,
    gap: 8,
  },
  sidebarLogoutButton: {
    marginTop: 8,
    alignSelf: 'stretch',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: 'center',
  },
  sidebarLogoutButtonText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '800',
  },
  entryCard: {
    backgroundColor: '#FFF8E6',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F3DCAA',
  },
  entryCardActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFECC2',
  },
  entryDate: {
    color: '#A16207',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  entryPreview: {
    color: '#6B4F00',
    fontSize: 12,
  },
  notebookMarginLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 48,
    width: 2,
    backgroundColor: '#F3A4A4',
    opacity: 0.85,
  },
  notebookLinesLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  notebookLine: {
    height: 1,
    backgroundColor: '#E9D8AE',
  },
  notebookTextWrap: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    left: 64,
    right: 16,
  },
  journalInput: {
    marginTop: 0,
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#5B3A00',
    fontSize: 15,
    lineHeight: 23,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  saveButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveButtonText: {
    color: '#3F2A00',
    fontSize: 14,
    fontWeight: '800',
  },
  settingsLayout: {
    flex: 1,
    width: '100%',
  },
  settingsScrollContent: {
    flexGrow: 1,
    paddingTop: 16,
  },
  settingsTopLeft: {
    alignSelf: 'flex-start',
    width: '100%',
    paddingTop: 6,
    marginBottom: 6,
  },
  settingsCenterArea: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    gap: 16,
    paddingTop: 8,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 0,
    paddingBottom: 14,
    marginBottom: 0,
  },
  settingsHeaderDivider: {
    width: '100%',
    height: 1,
    opacity: 0.75,
    marginTop: 4,
    marginBottom: 12,
  },
  settingsThemeBelowHeader: {
    width: '100%',
    marginBottom: 4,
  },
  settingsHeaderTextWrap: {
    flex: 1,
  },
  profilePhotoButton: {
    width: 58,
    height: 58,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  profilePhotoImage: {
    width: '100%',
    height: '100%',
  },
  profileEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E8A24D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  settingsMainSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  settingsSection: {
    gap: 8,
  },
  settingsSectionDivider: {
    height: 1,
    opacity: 0.45,
    marginVertical: 5,
  },
  settingsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  settingsHintText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeChoiceButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  themeChoiceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  notificationToggleButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  notificationToggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingsTimeLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  notificationTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  notificationTimeInput: {
    width: 54,
    borderWidth: 1,
    borderRadius: 10,
    textAlign: 'center',
    paddingVertical: 9,
    fontSize: 15,
    fontWeight: '700',
  },
  notificationTimeColon: {
    fontSize: 18,
    fontWeight: '700',
  },
  settingsInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  changePasswordButton: {
    marginTop: 4,
    backgroundColor: '#E8A24D',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  changePasswordButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  passwordSectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
});
