/*
React Native Mobile Screen - Core Lead Management
File: mobile/src/screens/LeadsScreen.tsx

Run: npx create-expo-app atlas-synapse-mobile
Then: npm install @react-navigation/native @react-navigation/bottom-tabs
      npm install @react-native-async-storage/async-storage
      npm install expo-notifications
*/

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { syncOfflineChanges, getSyncStatus } from '../lib/mobile-sync';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  leadCompany: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  syncStatus: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  syncText: {
    color: '#10b981',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export const LeadsScreen = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://atlas-synapse-crm.vercel.app/api/fetch-leads'
      );
      const data = await response.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
    setLoading(false);
  };

  const handleSync = async () => {
    await syncOfflineChanges('https://atlas-synapse-crm.vercel.app');
    setSyncStatus(getSyncStatus());
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Atlas Synapse</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" />
      ) : (
        <>
          {leads.slice(0, 10).map((lead: any) => (
            <View key={lead.id} style={styles.card}>
              <Text style={styles.leadName}>{lead.name}</Text>
              <Text style={styles.leadCompany}>{lead.company}</Text>
            </View>
          ))}

          <View style={styles.syncStatus}>
            <Text style={styles.syncText}>
              📊 Pending Sync: {syncStatus.pending}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={handleSync}
            >
              <Text style={styles.buttonText}>Sync Now</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
};
