import React from 'react';
import { Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="droplet" size={20} color="#3B82F6" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
              Smart Water Dispenser
            </Text>
          </View>
        ),
      }}
    />
  );
}
