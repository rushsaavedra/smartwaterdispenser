import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface UsageHistoryItem {
  timestamp: Date;
  amount: number;
}

interface AppSettings {
  lowWaterThreshold: number;
  dispensingSpeed: number;
  dispensingVolume: number;
}

interface UsageHistoryItem {
  timestamp: Date;
  amount: number; // For dispensing amounts
  event?: string; // Optional field for event type like "Refill"
}

const SmartWaterDispenser = () => {
  // State Variables
  const [isDispensing, setIsDispensing] = useState(false);
  const [waterLevel, setWaterLevel] = useState(100);
  const [usageHistory, setUsageHistory] = useState<UsageHistoryItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    lowWaterThreshold: 20,
    dispensingSpeed: 100, // milliseconds per 1% water
    dispensingVolume: 10, // ml per 1%
  });

  // Notification State
  const [hasShownLowWaterNotification, setHasShownLowWaterNotification] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  // Refs
  const dispensingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startLevel = useRef<number>(100);

  // Load Settings and Request Notifications on Mount
  useEffect(() => {
    loadSettings();
    requestNotificationPermission();
  }, []);

  // Monitor water level and send notifications
useEffect(() => {
  if (waterLevel <= settings.lowWaterThreshold && !hasShownLowWaterNotification) {
    sendLowWaterLevelNotification();
    setHasShownLowWaterNotification(true);
  } else if (waterLevel > settings.lowWaterThreshold) {
    setHasShownLowWaterNotification(false);
  }

  if (waterLevel === 0) {
    sendEmptyWaterNotification();
  }
}, [waterLevel, settings.lowWaterThreshold]);


  // Load Saved Settings
  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('waterDispenserSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Save Settings
  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem('waterDispenserSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      setIsSettingsModalVisible(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Save Error', 'Could not save settings');
    }
  }

  // Notification Permission Request
  const requestNotificationPermission = async () => {
    try {
      const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        if (canAskAgain) {
          Alert.alert(
            'Notification Permission',
            'Please enable notifications to receive water level alerts.',
            [
              { 
                text: 'OK', 
                style: 'default'
              }
            ]
          );
        }
        setNotificationError('Notifications not permitted');
      }
    } catch (error) {
      console.error('Notification permission error:', error);
      setNotificationError('Could not request notification permissions');
    }
  };

  // Low Water Level Notification
  const sendLowWaterLevelNotification = async () => {
    if (notificationError) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Low Water Level",
          body: `Water dispenser is below ${settings.lowWaterThreshold}%! Please refill soon.`,
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Notification scheduling error:', error);
      setNotificationError('Could not send notification');
    }
  };

  const sendEmptyWaterNotification = async () => {
    if (notificationError) return;
  
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Water Dispenser Empty",
          body: "The water level is at 0%. Please refill immediately to continue usage.",
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.error("Notification scheduling error:", error);
      setNotificationError("Could not send empty water notification");
    }
  };
  

  const theme = {
    background: isDarkMode ? '#1F2937' : 'white',
    cardBackground: isDarkMode ? '#374151' : 'white',
    text: isDarkMode ? '#F3F4F6' : '#1F2937',
    secondaryText: isDarkMode ? '#D1D5DB' : '#4B5563',
    border: isDarkMode ? '#4B5563' : '#E5E7EB',
    progressBackground: isDarkMode ? '#4B5563' : '#E5E7EB',
    accent: '#3B82F6',
    danger: '#EF4444'
  };

  const formatDateTime = (date: Date) => {
    return {
      date: date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const recordUsage = (finalLevel: number) => {
    const amountDispensed = (startLevel.current - finalLevel) * 10;
    if (amountDispensed > 0) {
      setUsageHistory(prev => [...prev, {
        timestamp: new Date(),
        amount: amountDispensed,
      }].slice(-5));
    }
  };

  // Dispensing Logic with Customizable Speed
  const handleDispense = () => {
    if (waterLevel > 0) {
      startLevel.current = waterLevel;
      setIsDispensing(true);
      
      dispensingTimer.current = setInterval(() => {
        setWaterLevel(prev => {
          const newLevel = prev - 1;
          if (newLevel <= 0) {
            recordUsage(0);
            handleStopDispensing();
            return 0;
          }
          return newLevel;
        });
      }, settings.dispensingSpeed);
    }
  };

  const handleStopDispensing = () => {
    if (dispensingTimer.current) {
      clearInterval(dispensingTimer.current);
      dispensingTimer.current = null;
    }
    
    if (isDispensing) { // Only record if we were actually dispensing
      recordUsage(waterLevel);
    }
    
    setIsDispensing(false);
  };

  const handleRefill = async () => {
    if (!isDispensing) {
      setWaterLevel(100);
      startLevel.current = 100;
      setHasShownLowWaterNotification(false);
  
      // Add a log for refill
      setUsageHistory((prev) => [
        ...prev,
        {
          timestamp: new Date(),
          amount: 0, // Amount is 0 for refill
          event: "Refill", // Add a label for the refill event
        },
      ].slice(-5)); // Limit to the last 5 entries
  
      // Send a notification about refill
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Water Refilled",
            body: "The water dispenser has been refilled to 100%.",
            sound: true,
          },
          trigger: null,
        });
      } catch (error) {
        console.error("Notification scheduling error:", error);
      }
    }
  };
  
  

  const SettingsModal = () => {
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  
    return (
      <Modal
        visible={isSettingsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSettingsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Dispenser Settings
            </Text>
  
            {/* Dark Mode Toggle */}
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Dark Mode
              </Text>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={isDarkMode ? '#F3F4F6' : '#F9FAFB'}
              />
            </View>
  
            {/* Low Water Alert Threshold */}
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Low Water Alert Threshold (%)
              </Text>
              <TextInput
                style={[styles.settingInput, { color: theme.text, borderColor: theme.border }]}
                keyboardType="numeric"
                value={localSettings.lowWaterThreshold.toString()}
                onChangeText={(text) =>
                  setLocalSettings(prev => ({ ...prev, lowWaterThreshold: Number(text) }))
                }
              />
            </View>
  
            {/* Dispensing Speed */}
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Dispensing Speed (ms per 1%)
              </Text>
              <TextInput
                style={[styles.settingInput, { color: theme.text, borderColor: theme.border }]}
                keyboardType="numeric"
                value={localSettings.dispensingSpeed.toString()}
                onChangeText={(text) =>
                  setLocalSettings(prev => ({ ...prev, dispensingSpeed: Number(text) }))
                }
              />
            </View>
  
            {/* Dispensing Volume */}
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Dispensing Volume (ml per 1%)
              </Text>
              <TextInput
                style={[styles.settingInput, { color: theme.text, borderColor: theme.border }]}
                keyboardType="numeric"
                value={localSettings.dispensingVolume.toString()}
                onChangeText={(text) =>
                  setLocalSettings(prev => ({ ...prev, dispensingVolume: Number(text) }))
                }
              />
            </View>
  
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.accent }]}
                onPress={() => saveSettings(localSettings)}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsSettingsModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
                <View style={styles.content}>
          {/* Water Level Indicator */}
          <View style={styles.section}>
  <View style={styles.row}>
    <Feather
      name="droplet"
      size={20}
      color={waterLevel > 20 ? theme.accent : theme.danger}
      style={{ marginRight: 8 }}
    />
    <Text
      style={[
        styles.sectionTitle,
        { color: waterLevel <= 20 ? theme.danger : theme.text },
      ]}
    >
      Water Level: {waterLevel}%
    </Text>
  </View>
  <View style={[styles.progressContainer, { backgroundColor: theme.progressBackground }]}>
    <View
      style={[
        styles.progressBar,
        {
          width: `${waterLevel}%`,
          backgroundColor: waterLevel <= 20 ? theme.danger : theme.accent,
        },
      ]}
    />
  </View>
</View>

          {/* Control Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                isDispensing ? styles.stopButton : styles.dispenseButton,
                waterLevel <= 0 && styles.disabledButton
              ]}
              onPress={isDispensing ? handleStopDispensing : handleDispense}
              disabled={waterLevel <= 0}
            >
              <Text style={styles.buttonText}>
                {isDispensing ? 'Stop' : 'Dispense'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button, 
                styles.outlineButton,
                { borderColor: theme.accent },
                isDispensing && styles.disabledButton
              ]}
              onPress={handleRefill}
              disabled={isDispensing}
            >
              <Text style={[
                styles.outlineButtonText, 
                { color: theme.accent },
                isDispensing && styles.disabledText
              ]}>
                Refill
              </Text>
            </TouchableOpacity>
          </View>

          {/* Usage History */}
          <View style={styles.section}>
            <View style={styles.row}>
              <Feather name="clock" size={20} color={theme.text} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Recent Usage
              </Text>
            </View>
            {usageHistory.map((usage, index) => {
  const { date, time } = formatDateTime(usage.timestamp);
  return (
    <View key={index} style={styles.historyItem}>
      <View style={styles.historyDateTime}>
        <Text style={[styles.historyText, { color: theme.secondaryText }]}>
          {date}
        </Text>
        <Text style={[styles.historyText, { color: theme.secondaryText, marginLeft: 8 }]}>
          {time}
        </Text>
      </View>
      <Text style={[styles.historyText, { color: theme.secondaryText }]}>
        {usage.event === "Refill" ? "Refill" : `${Math.round(usage.amount)}ml`}
      </Text>
    </View>
  );
})}

          </View>
        </View>
        {/* Add Settings Button in Header */}
      <TouchableOpacity 
        style={styles.settingsButton} 
        onPress={() => setIsSettingsModalVisible(true)}
      >
        <Feather name="settings" size={24} color={theme.text} />
      </TouchableOpacity>

      {/* Notification Error Alert */}
      {notificationError && (
        <View style={[styles.notificationErrorContainer, { backgroundColor: theme.danger }]}>
          <Text style={styles.notificationErrorText}>{notificationError}</Text>
        </View>
      )}

      <SettingsModal />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    gap: 24,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  dispenseButton: {
    backgroundColor: '#3B82F6',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  outlineButtonText: {
    fontWeight: '500',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  historyDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyText: {
    fontSize: 14,
  },
  
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '85%',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  settingItem: {
    width: '100%',
    marginBottom: 15,
  },
  settingLabel: {
    marginBottom: 5,
  },
  settingInput: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#6B7280', // Gray color
  },
  settingsButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  notificationErrorContainer: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  notificationErrorText: {
    color: 'white',
    textAlign: 'center',
  },
});

export default SmartWaterDispenser;