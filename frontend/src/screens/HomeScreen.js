import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { GestureHandlerRootView, RectButton, Swipeable } from 'react-native-gesture-handler';
import { API_BASE_URL } from '../config/api';

const THEME_KEY = 'agenda_theme';
const PROFILE_PHOTO_KEY = 'agenda_profile_photo';
const ACTIVE_TAB_KEY = 'agenda_active_tab';
const NOTIFICATIONS_KEY = 'agenda_notifications_enabled';
const LANGUAGE_KEY = 'agenda_language';
const NOTIFICATION_HOUR_KEY = 'agenda_notification_hour';
const NOTIFICATION_MINUTE_KEY = 'agenda_notification_minute';
const MAX_JOURNAL_PHOTO_LENGTH = 2_500_000;
const JOURNAL_PHOTO_WIDTH = 160;
const JOURNAL_PHOTO_HEIGHT = 120;
const JOURNAL_PHOTO_BOTTOM_RESERVED = 52;
const DEFAULT_JOURNAL_PHOTO_OFFSET = { x: 12, y: 52 };

const clampJournalPhotoOffset = (x, y, wrapWidth, wrapHeight) => {
  if (!wrapWidth || !wrapHeight) {
    return { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) };
  }
  const maxX = Math.max(0, wrapWidth - JOURNAL_PHOTO_WIDTH);
  const maxY = Math.max(0, wrapHeight - JOURNAL_PHOTO_HEIGHT - JOURNAL_PHOTO_BOTTOM_RESERVED);
  return {
    x: Math.min(Math.max(0, Math.round(x)), maxX),
    y: Math.min(Math.max(0, Math.round(y)), maxY),
  };
};

const isValidJournalPhotoDataUrl = (value) =>
  typeof value === 'string' && value.startsWith('data:image/') && value.length <= MAX_JOURNAL_PHOTO_LENGTH;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const AGENDA_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatStopwatchDisplay = (totalMs) => {
  const clamped = Math.max(0, totalMs);
  const centi = Math.floor((clamped % 1000) / 10);
  const totalSec = Math.floor(clamped / 1000);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60) % 60;
  const hour = Math.floor(totalSec / 3600);
  const pad2 = (n) => String(n).padStart(2, '0');
  if (hour > 0) {
    return `${hour}:${pad2(min)}:${pad2(sec)}.${pad2(centi)}`;
  }
  return `${pad2(min)}:${pad2(sec)}.${pad2(centi)}`;
};

const parseDateKey = (dateKey) => {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  if (!year || !month || !day) {
    return new Date();
  }
  return new Date(year, month - 1, day);
};

const addDays = (date, amount) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
};

const toColorWithAlpha = (hexColor, alpha = 0.2) => {
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  const normalized = String(hexColor || '').trim();
  const validHex = /^#([A-Fa-f0-9]{6})$/.test(normalized);
  if (!validHex) {
    return `rgba(245, 158, 11, ${safeAlpha})`;
  }
  const red = parseInt(normalized.slice(1, 3), 16);
  const green = parseInt(normalized.slice(3, 5), 16);
  const blue = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
};

const getMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const getMonthGridDays = (monthDate) => {
  const monthStart = getMonthStart(monthDate);
  const firstWeekDayIndex = (monthStart.getDay() + 6) % 7;
  const gridStart = addDays(monthStart, -firstWeekDayIndex);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
};

const buildDateStrip = (days = 10, baseDate = new Date()) => {
  return Array.from({ length: days }, (_, index) => {
    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + index);
    return {
      key: toDateKey(nextDate),
      dayNumber: nextDate.getDate(),
      dayShort: nextDate.toLocaleDateString('tr-TR', { weekday: 'short' }).replace('.', ''),
    };
  });
};

export default function HomeScreen({ authToken, onLogout }) {
  const todayRef = useRef(new Date());
  const [activeTab, setActiveTab] = useState('Ajanda');
  const [journalText, setJournalText] = useState('');
  const [journalPhoto, setJournalPhoto] = useState(null);
  const [journalPhotoOffset, setJournalPhotoOffset] = useState(DEFAULT_JOURNAL_PHOTO_OFFSET);
  const [notebookWrapSize, setNotebookWrapSize] = useState({ width: 0, height: 0 });
  const journalPhotoOffsetRef = useRef(DEFAULT_JOURNAL_PHOTO_OFFSET);
  const journalPhotoDragOriginRef = useRef(DEFAULT_JOURNAL_PHOTO_OFFSET);
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
  const [agendaTasks, setAgendaTasks] = useState([]);
  const [agendaMonthTasks, setAgendaMonthTasks] = useState([]);
  const [agendaTaskText, setAgendaTaskText] = useState('');
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(() => toDateKey(new Date()));
  const [agendaViewMode, setAgendaViewMode] = useState('list');
  const [agendaCalendarMonthDate, setAgendaCalendarMonthDate] = useState(() => getMonthStart(new Date()));
  const [agendaStripStartOffset, setAgendaStripStartOffset] = useState(-7);
  const [selectedTaskColor, setSelectedTaskColor] = useState(AGENDA_COLORS[0]);
  const notebookLines = Array.from({ length: 28 });
  const agendaDateStrip = useMemo(
    () => buildDateStrip(21, addDays(todayRef.current, agendaStripStartOffset)),
    [agendaStripStartOffset]
  );
  const agendaDateScrollRef = useRef(null);
  const agendaDateScrollXRef = useRef(0);
  const [agendaStripViewportWidth, setAgendaStripViewportWidth] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchRenderTick, setStopwatchRenderTick] = useState(0);
  const stopwatchAccumulatedRef = useRef(0);
  const stopwatchSegmentStartRef = useRef(null);
  const [statsAgendaAll, setStatsAgendaAll] = useState([]);
  const [statsAgendaLoading, setStatsAgendaLoading] = useState(false);

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
      if (
        savedTab === 'Kronometre' ||
        savedTab === 'Gunluk' ||
        savedTab === 'Ajanda' ||
        savedTab === 'Ayarlar' ||
        savedTab === 'Istatistik'
      ) {
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

  useEffect(() => {
    const loadAgendaTasks = async () => {
      if (!authToken) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/agenda?task_date=${selectedAgendaDate}`, {
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
          setAgendaTasks(data);
        }
      } catch (error) {
        console.error('Ajanda gorevleri yuklenemedi:', error);
      }
    };

    loadAgendaTasks();
  }, [authToken, onLogout, selectedAgendaDate]);

  useEffect(() => {
    if (activeTab !== 'Ajanda' || agendaViewMode !== 'calendar' || !authToken) {
      return;
    }

    const loadAgendaMonthTasks = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/agenda`, {
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
          setAgendaMonthTasks(data);
        }
      } catch (error) {
        console.error('Ajanda takvim gorevleri yuklenemedi:', error);
      }
    };

    loadAgendaMonthTasks();
  }, [activeTab, agendaViewMode, authToken, onLogout]);

  useEffect(() => {
    if (activeTab !== 'Istatistik' || !authToken) {
      return;
    }

    const loadAllAgendaForStats = async () => {
      setStatsAgendaLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/agenda`, {
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
          setStatsAgendaAll(data);
        }
      } catch (error) {
        console.error('Istatistik ajanda yuklenemedi:', error);
      } finally {
        setStatsAgendaLoading(false);
      }
    };

    loadAllAgendaForStats();
  }, [activeTab, authToken, onLogout]);

  useEffect(() => {
    setAgendaCalendarMonthDate(getMonthStart(parseDateKey(selectedAgendaDate)));
  }, [selectedAgendaDate]);

  const screenContent = useMemo(() => {
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

  useEffect(() => {
    if (!stopwatchRunning) {
      return undefined;
    }
    const id = setInterval(() => {
      setStopwatchRenderTick((n) => n + 1);
    }, 100);
    return () => clearInterval(id);
  }, [stopwatchRunning]);

  const stopwatchElapsedMs = useMemo(() => {
    const segment =
      stopwatchRunning && stopwatchSegmentStartRef.current != null
        ? Date.now() - stopwatchSegmentStartRef.current
        : 0;
    return stopwatchAccumulatedRef.current + segment;
  }, [stopwatchRunning, stopwatchRenderTick]);

  const handleStopwatchPrimaryPress = () => {
    if (stopwatchRunning) {
      if (stopwatchSegmentStartRef.current != null) {
        stopwatchAccumulatedRef.current += Date.now() - stopwatchSegmentStartRef.current;
        stopwatchSegmentStartRef.current = null;
      }
      setStopwatchRunning(false);
      return;
    }
    stopwatchSegmentStartRef.current = Date.now();
    setStopwatchRunning(true);
  };

  const handleStopwatchResetPress = () => {
    stopwatchAccumulatedRef.current = 0;
    stopwatchSegmentStartRef.current = null;
    setStopwatchRunning(false);
    setStopwatchRenderTick((n) => n + 1);
  };

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
        tabStats: 'Stats',
        statScreenTitle: 'Statistics',
        statJournalCard: 'Journal',
        statJournalEntriesLabel: 'Saved entries',
        statAgendaCard: 'Agenda',
        statAgendaTotalLabel: 'All tasks',
        statAgendaDoneLabel: 'Completed',
        statLoadingAgenda: 'Loading agenda…',
        chronoStart: 'Start',
        chronoPause: 'Pause',
        chronoResume: 'Resume',
        chronoReset: 'Reset',
        journalAddPhoto: 'Add photo',
        journalRemovePhoto: 'Remove photo',
        journalPhotoBadge: 'Photo',
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
      tabStats: 'Istatistik',
      statScreenTitle: 'Istatistik',
      statJournalCard: 'Gunluk',
      statJournalEntriesLabel: 'Kayitli gunluk sayisi',
      statAgendaCard: 'Ajanda',
      statAgendaTotalLabel: 'Toplam gorev',
      statAgendaDoneLabel: 'Tamamlanan',
      statLoadingAgenda: 'Ajanda yukleniyor...',
      chronoStart: 'Basla',
      chronoPause: 'Duraklat',
      chronoResume: 'Devam',
      chronoReset: 'Sifirla',
      journalAddPhoto: 'Fotograf ekle',
      journalRemovePhoto: 'Fotografi kaldir',
      journalPhotoBadge: 'Fotograf',
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

  const applyJournalPhotoDataUrl = (imageData) => {
    if (!isValidJournalPhotoDataUrl(imageData)) {
      Alert.alert(
        language === 'en' ? 'Photo too large' : 'Fotograf cok buyuk',
        language === 'en'
          ? 'Please choose a smaller image.'
          : 'Lutfen daha kucuk bir gorsel secin.'
      );
      return;
    }
    setJournalPhoto(imageData);
    setJournalPhotoOffset(DEFAULT_JOURNAL_PHOTO_OFFSET);
  };

  const clearJournalPhoto = () => {
    setJournalPhoto(null);
    setJournalPhotoOffset(DEFAULT_JOURNAL_PHOTO_OFFSET);
  };

  const pickJournalPhoto = async () => {
    if (Platform.OS === 'web') {
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
          if (typeof reader.result === 'string') {
            applyJournalPhotoDataUrl(reader.result);
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert(
        language === 'en' ? 'Permission required' : 'Izin gerekli',
        language === 'en'
          ? 'Allow gallery access to add a photo.'
          : 'Fotograf eklemek icin galeri izni verin.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    const mime = asset.mimeType || 'image/jpeg';
    if (!asset.base64) {
      Alert.alert(
        language === 'en' ? 'Error' : 'Hata',
        language === 'en' ? 'Could not load the selected image.' : 'Secilen gorsel yuklenemedi.'
      );
      return;
    }
    applyJournalPhotoDataUrl(`data:${mime};base64,${asset.base64}`);
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

 
    if (Platform.OS === 'web') {
      setNotificationsEnabled(true);
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

  useEffect(() => {
    journalPhotoOffsetRef.current = journalPhotoOffset;
  }, [journalPhotoOffset]);

  useEffect(() => {
    if (!journalPhoto || !notebookWrapSize.width) {
      return;
    }
    setJournalPhotoOffset((prev) =>
      clampJournalPhotoOffset(prev.x, prev.y, notebookWrapSize.width, notebookWrapSize.height),
    );
  }, [notebookWrapSize.width, notebookWrapSize.height, journalPhoto]);

  const journalPhotoPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          journalPhotoDragOriginRef.current = { ...journalPhotoOffsetRef.current };
        },
        onPanResponderMove: (_, gestureState) => {
          const next = clampJournalPhotoOffset(
            journalPhotoDragOriginRef.current.x + gestureState.dx,
            journalPhotoDragOriginRef.current.y + gestureState.dy,
            notebookWrapSize.width,
            notebookWrapSize.height,
          );
          setJournalPhotoOffset(next);
        },
      }),
    [notebookWrapSize.width, notebookWrapSize.height],
  );

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
    if ((!trimmedText && !journalPhoto) || !authToken) {
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
          body: JSON.stringify({
            content: trimmedText,
            photo: journalPhoto,
            photo_offset_x: journalPhoto ? journalPhotoOffset.x : 0,
            photo_offset_y: journalPhoto ? journalPhotoOffset.y : 0,
          }),
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
      clearJournalPhoto();
      setSelectedEntryId(null);
    } catch (error) {
      console.error('Gunluk kaydi eklenemedi:', error);
      alert('Sunucuya baglanilamadi.');
    }
  };

  const handleSelectEntry = (entry) => {
    setSelectedEntryId(entry.id);
    setJournalText(entry.content || '');
    setJournalPhoto(entry.photo || null);
    setJournalPhotoOffset(
      clampJournalPhotoOffset(
        Number(entry.photo_offset_x) || 0,
        Number(entry.photo_offset_y) || 0,
        notebookWrapSize.width,
        notebookWrapSize.height,
      ),
    );
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

  const saveAgendaTask = async () => {
    const trimmedTask = agendaTaskText.trim();
    if (!trimmedTask || !authToken) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/agenda`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          task_date: selectedAgendaDate,
          content: trimmedTask,
          color: selectedTaskColor,
        }),
      });
      const data = await response.json();

      if (response.status === 401) {
        onLogout?.();
        return;
      }
      if (!response.ok) {
        Alert.alert('Hata', data.detail || 'Gorev kaydedilemedi.');
        return;
      }

      setAgendaTasks((prev) => [...prev, data]);
      setAgendaMonthTasks((prev) => [...prev, data]);
      setAgendaTaskText('');
    } catch (error) {
      console.error('Ajanda gorevi kaydedilemedi:', error);
      Alert.alert('Hata', 'Sunucuya baglanirken bir sorun olustu.');
    }
  };

  const deleteAgendaTask = async (taskId) => {
    if (!authToken) {
      return;
    }

    const id = Number(taskId);
    if (!Number.isFinite(id)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/agenda/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      let data = {};
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (response.status === 401) {
        onLogout?.();
        return;
      }
      if (!response.ok) {
        const detail = typeof data.detail === 'string' ? data.detail : 'Gorev silinemedi.';
        Alert.alert('Hata', detail);
        return;
      }

      setAgendaTasks((prev) => prev.filter((task) => Number(task.id) !== id));
      setAgendaMonthTasks((prev) => prev.filter((task) => Number(task.id) !== id));
    } catch (error) {
      console.error('Ajanda gorevi silinemedi:', error);
      Alert.alert('Hata', 'Sunucuya baglanirken bir sorun olustu.');
    }
  };

  const toggleAgendaTaskCompleted = async (taskId, completed) => {
    if (!authToken) {
      return;
    }

    const id = Number(taskId);
    if (!Number.isFinite(id)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/agenda/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ completed }),
      });
      const data = await response.json();

      if (response.status === 401) {
        onLogout?.();
        return;
      }
      if (!response.ok) {
        Alert.alert('Hata', data.detail || 'Gorev durumu guncellenemedi.');
        return;
      }

      setAgendaTasks((prev) => prev.map((task) => (Number(task.id) === id ? data : task)));
      setAgendaMonthTasks((prev) => prev.map((task) => (Number(task.id) === id ? data : task)));
    } catch (error) {
      console.error('Ajanda gorevi durumu guncellenemedi:', error);
      Alert.alert('Hata', 'Sunucuya baglanirken bir sorun olustu.');
    }
  };

  const agendaCalendarCells = useMemo(() => {
    const selectedMonth = agendaCalendarMonthDate.getMonth();
    const selectedYear = agendaCalendarMonthDate.getFullYear();
    const monthTasksByDate = agendaMonthTasks.reduce((acc, task) => {
      if (typeof task?.task_date !== 'string') {
        return acc;
      }
      const parsedTaskDate = parseDateKey(task.task_date);
      if (parsedTaskDate.getMonth() !== selectedMonth || parsedTaskDate.getFullYear() !== selectedYear) {
        return acc;
      }
      if (!acc[task.task_date]) {
        acc[task.task_date] = [];
      }
      acc[task.task_date].push(task);
      return acc;
    }, {});

    return getMonthGridDays(agendaCalendarMonthDate).map((dateValue) => {
      const dateKey = toDateKey(dateValue);
      const dayTasks = monthTasksByDate[dateKey] || [];
      return {
        key: dateKey,
        dayNumber: dateValue.getDate(),
        inCurrentMonth:
          dateValue.getMonth() === selectedMonth && dateValue.getFullYear() === selectedYear,
        taskPreview: dayTasks.slice(0, 3),
      };
    });
  }, [agendaCalendarMonthDate, agendaMonthTasks]);

  const askDeleteAgendaTask = (taskId) => {
    const runDelete = () => deleteAgendaTask(taskId);
    if (Platform.OS === 'web') {
      const ok = typeof globalThis.confirm === 'function' && globalThis.confirm('Bu gorevi silmek istiyor musun?');
      if (ok) {
        runDelete();
      }
      return;
    }
    Alert.alert('Gorev Sil', 'Bu gorevi silmek istiyor musun?', [
      { text: 'Vazgec', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: runDelete,
      },
    ]);
  };

  const renderAgendaRightAction = (taskId) => (
    <RectButton style={styles.agendaSwipeDeleteAction} onPress={() => askDeleteAgendaTask(taskId)}>
      <Ionicons name="trash" size={16} color="#FFFFFF" />
      <Text style={styles.agendaSwipeDeleteText}>Sil</Text>
    </RectButton>
  );

  const handleAgendaDateStripScroll = (event) => {
    agendaDateScrollXRef.current = event?.nativeEvent?.contentOffset?.x || 0;
  };

  useEffect(() => {
    const stripDateKeys = new Set(agendaDateStrip.map((item) => item.key));
    if (stripDateKeys.has(selectedAgendaDate)) {
      return;
    }

    const selectedDate = parseDateKey(selectedAgendaDate);
    const dayDiff = Math.round((selectedDate.getTime() - todayRef.current.getTime()) / (1000 * 60 * 60 * 24));
    setAgendaStripStartOffset(dayDiff - 7);
  }, [agendaDateStrip, selectedAgendaDate]);

  useEffect(() => {
    if (!agendaDateStrip.length) {
      return;
    }

    const selectedIndex = agendaDateStrip.findIndex((item) => item.key === selectedAgendaDate);
    if (selectedIndex < 0) {
      return;
    }

    const pillWidth = 64;
    const pillGap = 10;
    const contentPaddingLeft = 40;
    const selectedPillCenterX = contentPaddingLeft + (selectedIndex * (pillWidth + pillGap)) + (pillWidth / 2);
    const viewportHalf = agendaStripViewportWidth > 0 ? agendaStripViewportWidth / 2 : 120;
    const targetOffset = Math.max(0, selectedPillCenterX - viewportHalf);

    agendaDateScrollRef.current?.scrollTo({ x: targetOffset, animated: true });
  }, [agendaDateStrip, selectedAgendaDate, agendaStripViewportWidth]);

  const shiftSelectedAgendaDate = (amount) => {
    setSelectedAgendaDate((prevDateKey) => toDateKey(addDays(parseDateKey(prevDateKey), amount)));
  };

  const scrollAgendaDateStripRight = () => {
    shiftSelectedAgendaDate(1);
  };

  const scrollAgendaDateStripLeft = () => {
    shiftSelectedAgendaDate(-1);
  };

  const statsAgendaCompleted = useMemo(
    () => statsAgendaAll.filter((task) => Boolean(task.completed)).length,
    [statsAgendaAll],
  );

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
    <SafeAreaView style={[styles.container, { backgroundColor: palette.pageBg }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={palette.pageBg} />
      <View style={[styles.content, (activeTab === 'Ayarlar' || activeTab === 'Ajanda' || activeTab === 'Kronometre' || activeTab === 'Istatistik') && styles.contentSettings]}>
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
                      {entry.photo ? (
                        <Image source={{ uri: entry.photo }} style={styles.entryCardThumb} />
                      ) : null}
                      <Text style={[styles.entryPreview, { color: palette.textPrimary }]} numberOfLines={2}>
                        {entry.content?.trim() ? entry.content : t.journalPhotoBadge}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>

            <View style={[styles.notebookContainer, { backgroundColor: isDarkTheme ? '#1F2937' : '#FFFDF6' }]}>
              <View style={styles.notebookLinesLayer} pointerEvents="none">
                {notebookLines.map((_, index) => (
                  <View key={index} style={[styles.notebookLine, { backgroundColor: isDarkTheme ? '#334155' : '#E9D8AE' }]} />
                ))}
              </View>
              <View
                style={styles.notebookTextWrap}
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setNotebookWrapSize({ width, height });
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.journalPhotoIconButton,
                    styles.journalPhotoIconButtonCorner,
                    { borderColor: palette.border, backgroundColor: isDarkTheme ? '#273449' : '#FFF8E6' },
                  ]}
                  onPress={pickJournalPhoto}
                  activeOpacity={0.85}
                  accessibilityLabel={t.journalAddPhoto}
                >
                  <Ionicons name="image-outline" size={18} color={palette.textPrimary} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.journalInput, { color: palette.textPrimary }]}
                  value={journalText}
                  onChangeText={setJournalText}
                  placeholder=""
                  placeholderTextColor="#B8985A"
                  multiline
                  textAlignVertical="top"
                />
                {journalPhoto ? (
                  <View
                    style={[
                      styles.journalPhotoDraggable,
                      {
                        left: journalPhotoOffset.x,
                        top: journalPhotoOffset.y,
                      },
                    ]}
                    {...journalPhotoPanResponder.panHandlers}
                  >
                    <Image source={{ uri: journalPhoto }} style={styles.journalPhotoPreview} resizeMode="cover" />
                    <TouchableOpacity
                      style={[styles.journalPhotoRemoveButton, { borderColor: palette.border }]}
                      onPress={clearJournalPhoto}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="close" size={16} color={palette.textPrimary} />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <View style={styles.journalActionsRow}>
                  <TouchableOpacity style={styles.saveButton} onPress={saveJournalEntry}>
                    <Text style={styles.saveButtonText}>{selectedEntryId ? 'Guncelle' : 'Kaydet'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ) : activeTab === 'Ajanda' ? (
          <View style={styles.agendaLayout}>
            <View style={styles.agendaViewSwitchRow}>
              <TouchableOpacity
                style={[
                  styles.agendaViewSwitchButton,
                  {
                    borderColor: palette.border,
                    backgroundColor: agendaViewMode === 'list' ? '#F59E0B' : (isDarkTheme ? '#1E293B' : '#FFF8E8'),
                  },
                ]}
                onPress={() => setAgendaViewMode('list')}
                activeOpacity={0.85}
              >
                <Ionicons name="list-outline" size={15} color={agendaViewMode === 'list' ? '#FFFFFF' : palette.textPrimary} />
                <Text style={[styles.agendaViewSwitchText, { color: agendaViewMode === 'list' ? '#FFFFFF' : palette.textPrimary }]}>Liste</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.agendaViewSwitchButton,
                  {
                    borderColor: palette.border,
                    backgroundColor: agendaViewMode === 'calendar' ? '#F59E0B' : (isDarkTheme ? '#1E293B' : '#FFF8E8'),
                  },
                ]}
                onPress={() => setAgendaViewMode('calendar')}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-outline" size={15} color={agendaViewMode === 'calendar' ? '#FFFFFF' : palette.textPrimary} />
                <Text style={[styles.agendaViewSwitchText, { color: agendaViewMode === 'calendar' ? '#FFFFFF' : palette.textPrimary }]}>Takvim</Text>
              </TouchableOpacity>
            </View>

            {agendaViewMode === 'list' ? (
              <View
                style={[styles.agendaDateStripWrap, { borderColor: palette.border, backgroundColor: palette.cardBg }]}
                onLayout={(event) => {
                  const width = event?.nativeEvent?.layout?.width || 0;
                  setAgendaStripViewportWidth(width);
                }}
              >
                <ScrollView
                  ref={agendaDateScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.agendaDateStripContent}
                  onScroll={handleAgendaDateStripScroll}
                  scrollEventThrottle={16}
                >
                  {agendaDateStrip.map((dateItem) => {
                    const isActive = selectedAgendaDate === dateItem.key;
                    return (
                      <TouchableOpacity
                        key={dateItem.key}
                        style={[
                          styles.agendaDatePill,
                          {
                            borderColor: isActive ? '#F59E0B' : palette.border,
                            backgroundColor: isActive ? '#FDE7C0' : isDarkTheme ? '#243244' : '#FFF8E8',
                          },
                        ]}
                        onPress={() => setSelectedAgendaDate(dateItem.key)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.agendaDateDay, { color: palette.textPrimary }]}>{dateItem.dayShort}</Text>
                        <Text style={[styles.agendaDateNumber, { color: palette.textPrimary }]}>{dateItem.dayNumber}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.agendaDateStripArrowHint, styles.agendaDateStripArrowHintLeft]}
                  onPress={scrollAgendaDateStripLeft}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chevron-back" size={18} color="#E67E22" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.agendaDateStripArrowHint, styles.agendaDateStripArrowHintRight]}
                  onPress={scrollAgendaDateStripRight}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chevron-forward" size={18} color="#E67E22" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.agendaCalendarCard, { borderColor: palette.border, backgroundColor: palette.cardBg }]}>
                <View style={styles.agendaCalendarHeader}>
                  <TouchableOpacity
                    style={[styles.agendaCalendarMonthNavButton, { borderColor: palette.border }]}
                    onPress={() => setAgendaCalendarMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="chevron-back" size={16} color={palette.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.agendaCalendarMonthTitle, { color: palette.textPrimary }]}>
                    {agendaCalendarMonthDate.toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <TouchableOpacity
                    style={[styles.agendaCalendarMonthNavButton, { borderColor: palette.border }]}
                    onPress={() => setAgendaCalendarMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="chevron-forward" size={16} color={palette.textPrimary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.agendaCalendarWeekRow}>
                  {['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'].map((weekDay) => (
                    <Text key={weekDay} style={[styles.agendaCalendarWeekDay, { color: palette.textSecondary }]}>
                      {weekDay}
                    </Text>
                  ))}
                </View>
                <View style={styles.agendaCalendarGrid}>
                  {agendaCalendarCells.map((cell) => {
                    const isSelected = selectedAgendaDate === cell.key;
                    return (
                      <TouchableOpacity
                        key={cell.key}
                        style={[
                          styles.agendaCalendarDayCell,
                          {
                            borderColor: isSelected ? '#F59E0B' : palette.border,
                            backgroundColor: isSelected ? '#FDE7C0' : (isDarkTheme ? '#1E293B' : '#FFFFFF'),
                            opacity: cell.inCurrentMonth ? 1 : 0.45,
                          },
                        ]}
                        onPress={() => setSelectedAgendaDate(cell.key)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.agendaCalendarDayNumber, { color: palette.textPrimary }]}>{cell.dayNumber}</Text>
                        <View style={styles.agendaCalendarTaskSlots}>
                          {Array.from({ length: 3 }).map((_, slotIndex) => {
                            const previewTask = cell.taskPreview[slotIndex];
                            return (
                              <View
                                key={`${cell.key}-slot-${slotIndex}`}
                                style={[
                                  styles.agendaCalendarTaskSlot,
                                  {
                                    borderColor: previewTask?.color || palette.border,
                                    backgroundColor: previewTask
                                      ? (
                                        previewTask.completed
                                          ? toColorWithAlpha(previewTask.color, 0.2)
                                          : toColorWithAlpha(previewTask.color, isDarkTheme ? 0.36 : 0.24)
                                      )
                                      : 'transparent',
                                  },
                                ]}
                              >
                                {previewTask ? (
                                  <Text
                                    numberOfLines={1}
                                    style={[
                                      styles.agendaCalendarTaskSlotText,
                                      { color: palette.textPrimary },
                                      previewTask.completed && styles.agendaCalendarTaskSlotTextCompleted,
                                    ]}
                                  >
                                    {previewTask.content}
                                  </Text>
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={[styles.agendaTasksCard, { borderColor: palette.border, backgroundColor: palette.cardBg }]}>
              <Text style={[styles.agendaTasksTitle, { color: palette.textPrimary }]}>
                {new Date(selectedAgendaDate).toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>

              <ScrollView
                style={styles.agendaTaskList}
                contentContainerStyle={styles.agendaTaskListContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {agendaTasks.length === 0 ? (
                  <Text style={[styles.agendaEmptyText, { color: palette.textSecondary }]}>
                    Bu gun icin henuz gorev eklenmedi.
                  </Text>
                ) : (
                  agendaTasks.map((task) => (
                    <Swipeable
                      key={task.id}
                      overshootRight={false}
                      renderRightActions={() => renderAgendaRightAction(task.id)}
                    >
                      <View style={[styles.agendaTaskRow, { borderColor: palette.border, backgroundColor: isDarkTheme ? '#1E293B' : '#FFFDF5' }]}>
                        <View style={[styles.agendaTaskColorStripe, { backgroundColor: task.color || '#EF4444' }]} />
                        <View style={styles.agendaTaskBody}>
                          <View style={styles.agendaTaskMain}>
                            <TouchableOpacity
                              style={[
                                styles.agendaTaskCheckButton,
                                {
                                  borderColor: task.completed ? '#22C55E' : palette.border,
                                  backgroundColor: task.completed ? '#DCFCE7' : (isDarkTheme ? '#1E293B' : '#FFFFFF'),
                                },
                              ]}
                              onPress={() => toggleAgendaTaskCompleted(task.id, !task.completed)}
                              activeOpacity={0.85}
                            >
                              {task.completed ? <Ionicons name="checkmark" size={14} color="#15803D" /> : null}
                            </TouchableOpacity>
                            <Text
                              style={[
                                styles.agendaTaskText,
                                { color: palette.textPrimary },
                                task.completed && styles.agendaTaskTextCompleted,
                              ]}
                            >
                              {task.content}
                            </Text>
                          </View>
                          <View style={styles.agendaTaskActions}>
                            <View style={[styles.agendaTaskColorBadge, { backgroundColor: task.color || '#EF4444' }]} />
                            <View style={[styles.agendaSwipeHintBadge, { backgroundColor: isDarkTheme ? '#7F1D1D' : '#FEE2E2' }]}>
                              <Ionicons name="chevron-back" size={12} color={isDarkTheme ? '#FCA5A5' : '#B91C1C'} />
                            </View>
                          </View>
                        </View>
                      </View>
                    </Swipeable>
                  ))
                )}
              </ScrollView>

              <View style={[styles.agendaComposer, { borderColor: palette.border, backgroundColor: isDarkTheme ? '#0F172A' : '#FFF8EA' }]}>
                <TextInput
                  value={agendaTaskText}
                  onChangeText={setAgendaTaskText}
                  placeholder="Bugun ne yapacaksin?"
                  placeholderTextColor={isDarkTheme ? '#94A3B8' : '#9CA3AF'}
                  style={[styles.agendaInput, { color: palette.textPrimary }]}
                />
                <Text style={[styles.agendaColorHint, { color: palette.textSecondary }]}>Gorevin onemini bir renk secerek belirt.</Text>
                <View style={styles.agendaColorRow}>
                  {AGENDA_COLORS.map((color) => {
                    const selected = selectedTaskColor === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.agendaColorSwatch,
                          {
                            backgroundColor: color,
                            borderColor: selected ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                            transform: [{ scale: selected ? 1.03 : 1 }],
                          },
                        ]}
                        onPress={() => setSelectedTaskColor(color)}
                        activeOpacity={0.9}
                      >
                        {selected ? <Ionicons name="checkmark" size={17} color="#FFFFFF" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity style={styles.agendaSaveButton} onPress={saveAgendaTask}>
                  <Text style={styles.agendaSaveButtonText}>Kaydet</Text>
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
        ) : activeTab === 'Kronometre' ? (
          <View style={styles.chronometerLayout}>
            <View style={[styles.chronometerCard, { borderColor: palette.border, backgroundColor: palette.cardBg }]}>
              <Text style={[styles.chronometerTime, { color: palette.textPrimary }]}>
                {formatStopwatchDisplay(stopwatchElapsedMs)}
              </Text>
              <View style={styles.chronometerButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.chronometerPrimaryButton,
                    {
                      backgroundColor: stopwatchRunning ? palette.settingsInputBg : '#E8A24D',
                      borderColor: stopwatchRunning ? palette.border : '#D97706',
                    },
                  ]}
                  onPress={handleStopwatchPrimaryPress}
                  activeOpacity={0.88}
                >
                  <Ionicons
                    name={stopwatchRunning ? 'pause' : 'play'}
                    size={18}
                    color={stopwatchRunning ? palette.textPrimary : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.chronometerPrimaryButtonText,
                      { color: stopwatchRunning ? palette.textPrimary : '#FFFFFF' },
                    ]}
                  >
                    {stopwatchRunning ? t.chronoPause : stopwatchElapsedMs > 0 ? t.chronoResume : t.chronoStart}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.chronometerSecondaryButton,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.settingsInputBg,
                      opacity: stopwatchRunning || stopwatchElapsedMs > 0 ? 1 : 0.45,
                    },
                  ]}
                  onPress={handleStopwatchResetPress}
                  disabled={!stopwatchRunning && stopwatchElapsedMs === 0}
                  activeOpacity={0.88}
                >
                  <Ionicons name="refresh" size={17} color={palette.textPrimary} />
                  <Text style={[styles.chronometerSecondaryButtonText, { color: palette.textPrimary }]}>{t.chronoReset}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : activeTab === 'Istatistik' ? (
          <ScrollView
            style={styles.statsLayout}
            contentContainerStyle={[
              styles.statsScrollContent,
              { paddingBottom: Math.max(32, Math.round(windowHeight * 0.06)) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.statsScreenTitle, { color: palette.textPrimary }]}>{t.statScreenTitle}</Text>

            {statsAgendaLoading ? (
              <View style={styles.statsLoadingRow}>
                <ActivityIndicator color="#E8A24D" />
                <Text style={[styles.statsLoadingText, { color: palette.textSecondary }]}>{t.statLoadingAgenda}</Text>
              </View>
            ) : null}

            <View style={[styles.statsCard, { borderColor: palette.border, backgroundColor: palette.cardBg }]}>
              <View style={styles.statsCardHeader}>
                <Ionicons name="book-outline" size={20} color="#E8A24D" />
                <Text style={[styles.statsCardTitle, { color: palette.textPrimary }]}>{t.statJournalCard}</Text>
              </View>
              <View style={[styles.statsRow, { borderTopColor: palette.border }]}>
                <Text style={[styles.statsRowLabel, { color: palette.textSecondary }]}>{t.statJournalEntriesLabel}</Text>
                <Text style={[styles.statsRowValue, { color: palette.textPrimary }]}>{journalEntries.length}</Text>
              </View>
            </View>

            <View style={[styles.statsCard, { borderColor: palette.border, backgroundColor: palette.cardBg }]}>
              <View style={styles.statsCardHeader}>
                <Ionicons name="calendar-outline" size={20} color="#E8A24D" />
                <Text style={[styles.statsCardTitle, { color: palette.textPrimary }]}>{t.statAgendaCard}</Text>
              </View>
              <View style={[styles.statsRow, { borderTopColor: palette.border }]}>
                <Text style={[styles.statsRowLabel, { color: palette.textSecondary }]}>{t.statAgendaTotalLabel}</Text>
                <Text style={[styles.statsRowValue, { color: palette.textPrimary }]}>{statsAgendaAll.length}</Text>
              </View>
              <View style={[styles.statsRow, { borderTopColor: palette.border }]}>
                <Text style={[styles.statsRowLabel, { color: palette.textSecondary }]}>{t.statAgendaDoneLabel}</Text>
                <Text style={[styles.statsRowValue, { color: palette.textPrimary }]}>{statsAgendaCompleted}</Text>
              </View>
            </View>
          </ScrollView>
        ) : (
          <>
            <Text style={[styles.title, { color: palette.textPrimary }]}>{screenContent.title}</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{screenContent.subtitle}</Text>
          </>
        )}
        {activeTab !== 'Gunluk' && activeTab !== 'Ayarlar' && activeTab !== 'Ajanda' && activeTab !== 'Kronometre' && activeTab !== 'Istatistik' && (
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
            activeTab === 'Istatistik' && styles.tabButtonActive,
            activeTab === 'Istatistik' && { backgroundColor: palette.tabActiveBg },
          ]}
          onPress={() => setActiveTab('Istatistik')}
        >
          <Ionicons
            name="stats-chart-outline"
            size={18}
            style={styles.tabIcon}
            color={activeTab === 'Istatistik' ? palette.tabTextActive : palette.tabText}
          />
          <Text
            style={[styles.tabText, { color: palette.tabText }, activeTab === 'Istatistik' && { color: palette.tabTextActive }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {t.tabStats}
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
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
  agendaLayout: {
    width: '100%',
    flex: 1,
    gap: 12,
    marginBottom: 12,
  },
  chronometerLayout: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chronometerCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 22,
  },
  chronometerTime: {
    fontSize: 44,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: 1,
  },
  chronometerButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  chronometerPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 148,
  },
  chronometerPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  chronometerSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 132,
  },
  chronometerSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  statsLayout: {
    width: '100%',
    flex: 1,
  },
  statsScrollContent: {
    gap: 14,
    paddingTop: 4,
  },
  statsScreenTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statsLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  statsLoadingText: {
    fontSize: 14,
  },
  statsCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 0,
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statsCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statsRowLabel: {
    fontSize: 14,
    flex: 1,
    paddingRight: 10,
  },
  statsRowValue: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  agendaViewSwitchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  agendaViewSwitchButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  agendaViewSwitchText: {
    fontSize: 13,
    fontWeight: '700',
  },
  agendaDateStripWrap: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    position: 'relative',
  },
  agendaCalendarCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  agendaCalendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agendaCalendarMonthNavButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaCalendarMonthTitle: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  agendaCalendarWeekRow: {
    flexDirection: 'row',
  },
  agendaCalendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  agendaCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  agendaCalendarDayCell: {
    width: '14.2857%',
    minHeight: 90,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaCalendarDayNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  agendaCalendarTaskSlots: {
    width: '100%',
    marginTop: 4,
    gap: 3,
  },
  agendaCalendarTaskSlot: {
    width: '100%',
    minHeight: 16,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  agendaCalendarTaskSlotText: {
    fontSize: 9,
    fontWeight: '600',
  },
  agendaCalendarTaskSlotTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  agendaDateStripArrowHint: {
    position: 'absolute',
    top: '50%',
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(230, 126, 34, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaDateStripArrowHintLeft: {
    left: 6,
  },
  agendaDateStripArrowHintRight: {
    right: 6,
  },
  agendaDateStripContent: {
    gap: 10,
    paddingLeft: 40,
    paddingRight: 40,
  },
  agendaDatePill: {
    width: 64,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  agendaDateDay: {
    fontSize: 11,
    textTransform: 'capitalize',
    marginBottom: 3,
  },
  agendaDateNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  agendaTasksCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  agendaTasksTitle: {
    fontSize: 17,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  agendaTaskList: {
    flex: 1,
  },
  agendaTaskListContent: {
    gap: 8,
    paddingBottom: 8,
  },
  agendaTaskRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  agendaTaskColorStripe: {
    width: 8,
    alignSelf: 'stretch',
    borderRadius: 99,
  },
  agendaTaskBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  agendaTaskMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  agendaTaskCheckButton: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  agendaTaskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agendaTaskText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  agendaTaskTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.65,
  },
  agendaTaskColorBadge: {
    width: 16,
    height: 16,
    borderRadius: 999,
  },
  agendaSwipeHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 999,
  },
  agendaSwipeDeleteAction: {
    width: 84,
    borderRadius: 12,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    gap: 2,
  },
  agendaSwipeDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  agendaEmptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
  agendaComposer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  agendaInput: {
    borderWidth: 0,
    borderRadius: 10,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  agendaColorRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  agendaColorHint: {
    fontSize: 12,
  },
  agendaColorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    elevation: 2,
  },
  agendaSaveButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  agendaSaveButtonText: {
    color: '#3F2A00',
    fontSize: 13,
    fontWeight: '800',
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
    left: 16,
    right: 16,
    overflow: 'hidden',
  },
  journalInput: {
    marginTop: 0,
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingTop: 40,
    paddingBottom: 8,
    color: '#5B3A00',
    fontSize: 15,
    lineHeight: 23,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  journalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  journalPhotoIconButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalPhotoIconButtonCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
  },
  journalPhotoDraggable: {
    position: 'absolute',
    zIndex: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  journalPhotoPreview: {
    width: JOURNAL_PHOTO_WIDTH,
    height: JOURNAL_PHOTO_HEIGHT,
    borderRadius: 12,
  },
  journalPhotoRemoveButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryCardThumb: {
    width: '100%',
    height: 56,
    borderRadius: 8,
    marginBottom: 6,
  },
  saveButton: {
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
