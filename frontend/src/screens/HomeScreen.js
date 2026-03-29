import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar, TextInput, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/api';

export default function HomeScreen({ authToken, onLogout }) {
  const [activeTab, setActiveTab] = useState('Ajanda');
  const [journalText, setJournalText] = useState('');
  const [journalEntries, setJournalEntries] = useState([]);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const notebookLines = Array.from({ length: 28 });

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

    return {
      title: 'Ajanda',
      subtitle: 'Ajanda gorunumu bu bolumde yer alacak.',
    };
  }, [activeTab]);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8E8" />
      <View style={styles.content}>
        {activeTab === 'Gunluk' ? (
          <View style={styles.journalLayout}>
            <View style={styles.journalSidebar}>
              <Text style={styles.sidebarTitle}>Kaydedilenler</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarScrollContent}>
                {journalEntries.length === 0 ? (
                  <View />
                ) : (
                  journalEntries.map((entry) => (
                    <TouchableOpacity
                      key={entry.id}
                      style={[styles.entryCard, selectedEntryId === entry.id && styles.entryCardActive]}
                      activeOpacity={0.8}
                      onPress={() => handleSelectEntry(entry)}
                    >
                      <Text style={styles.entryDate}>{formatDateLabel(entry.created_at)}</Text>
                      <Text style={styles.entryPreview} numberOfLines={2}>{entry.content}</Text>
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

            <View style={styles.notebookContainer}>
              <View style={styles.notebookMarginLine} />
              <View style={styles.notebookLinesLayer} pointerEvents="none">
                {notebookLines.map((_, index) => (
                  <View key={index} style={styles.notebookLine} />
                ))}
              </View>
              <View style={styles.notebookTextWrap}>
                <TextInput
                  style={styles.journalInput}
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
        ) : (
          <>
            <Text style={styles.title}>{screenContent.title}</Text>
            <Text style={styles.subtitle}>{screenContent.subtitle}</Text>
          </>
        )}
        {activeTab !== 'Gunluk' && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={onLogout}
          >
            <Text style={styles.logoutButtonText}>Cikis Yap</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Kronometre' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Kronometre')}
        >
          <Ionicons
            name="timer-outline"
            size={18}
            style={styles.tabIcon}
            color={activeTab === 'Kronometre' ? '#3F2A00' : '#8A6A00'}
          />
          <Text style={[styles.tabText, activeTab === 'Kronometre' && styles.tabTextActive]}>Kronometre</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Gunluk' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Gunluk')}
        >
          <Ionicons
            name="book-outline"
            size={18}
            style={styles.tabIcon}
            color={activeTab === 'Gunluk' ? '#3F2A00' : '#8A6A00'}
          />
          <Text style={[styles.tabText, activeTab === 'Gunluk' && styles.tabTextActive]}>Gunluk</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Ajanda' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Ajanda')}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            style={styles.tabIcon}
            color={activeTab === 'Ajanda' ? '#3F2A00' : '#8A6A00'}
          />
          <Text style={[styles.tabText, activeTab === 'Ajanda' && styles.tabTextActive]}>Ajanda</Text>
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
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
    fontSize: 13,
    fontWeight: '700',
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
});
