import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface UsageHistoryItem {
  timestamp: Date;
  amount: number;
}

const SmartWaterDispenser = () => {
  const [isDispensing, setIsDispensing] = useState(false);
  const [waterLevel, setWaterLevel] = useState(100);
  const [usageHistory, setUsageHistory] = useState<UsageHistoryItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const dispensingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startLevel = useRef<number>(100);

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

  const handleDispense = () => {
    if (waterLevel > 0) {
      startLevel.current = waterLevel;
      setIsDispensing(true);
      
      dispensingTimer.current = setInterval(() => {
        setWaterLevel(prev => {
          const newLevel = prev - 1;
          if (newLevel <= 0) {
            // Handle complete dispensing
            recordUsage(0);
            handleStopDispensing();
            return 0;
          }
          return newLevel;
        });
      }, 100);
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

  const handleRefill = () => {
    if (!isDispensing) {
      setWaterLevel(100);
      startLevel.current = 100;
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            Smart Water Dispenser
          </Text>
          <Feather 
            name="droplet" 
            size={24} 
            color={waterLevel > 20 ? theme.accent : theme.danger} 
          />
        </View>

        <View style={styles.content}>
          {/* Dark Mode Toggle */}
          <View style={styles.section}>
            <View style={styles.row}>
              <Feather 
                name={isDarkMode ? "moon" : "sun"} 
                size={20} 
                color={theme.text} 
              />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Dark Mode
              </Text>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={isDarkMode ? '#F3F4F6' : '#F9FAFB'}
                style={{ marginLeft: 'auto' }}
              />
            </View>
          </View>

          {/* Water Level Indicator */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Water Level: {waterLevel}%
            </Text>
            <View style={[styles.progressContainer, { backgroundColor: theme.progressBackground }]}>
              <View 
                style={[
                  styles.progressBar,
                  { width: `${waterLevel}%` }
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
                    {Math.round(usage.amount)}ml
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
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
});

export default SmartWaterDispenser;