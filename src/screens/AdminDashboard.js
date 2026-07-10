// src/screens/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';

import { db } from '../services/firebaseConfig';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';

export default function AdminDashboard({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [parcels, setParcels] = useState([]);
  const [activeView, setActiveView] = useState('metrics');

  useEffect(() => {
    const q = query(collection(db, "parcels"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allParcels = [];
      snapshot.forEach((doc) => {
        allParcels.push({ id: doc.id, ...doc.data() });
      });
      setParcels(allParcels);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Admin Stream Error: ", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalReceivedToday = parcels.length;
  const totalPendingPickups = parcels.filter(p => p.status === 'Pending PickUp').length;
  const totalDeliveredToday = parcels.filter(p => p.status === 'Delivered').length;
  const totalReportedMissing = parcels.filter(p => p.status === 'Reported Missing').length;

  const limboParcels = parcels.filter(p => p.status === 'Pending PickUp');
  const missingParcels = parcels.filter(p => p.status === 'Reported Missing');

  const handleTargetedPing = async () => {
    setLoading(true);
    try {
      const pendingQuery = query(collection(db, "parcels"), where("status", "==", "Pending PickUp"));
      const querySnapshot = await getDocs(pendingQuery);

      if (querySnapshot.empty) {
        Alert.alert("Notice", "There are no unclaimed packages in the parcel room right now!");
        setLoading(false);
        return;
      }

      const uniqueCpmsToAlert = new Set();
      querySnapshot.forEach(doc => {
        uniqueCpmsToAlert.add(doc.data().cpms);
      });

      const promises = Array.from(uniqueCpmsToAlert).map(cpmsCode => {
        return addDoc(collection(db, "targeted_alerts"), {
          cpms: cpmsCode,
          message: "🚨 EMERGENCY REMINDER: The parcel room is closing soon! Please pick up your waiting package immediately.",
          createdAt: serverTimestamp(),
          read: false
        });
      });

      await Promise.all(promises);
      Alert.alert("Alert Sent! 🔔", `Targeted warning dispatched to ${uniqueCpmsToAlert.size} students.`);
    } catch (error) {
      Alert.alert("Error", "Could not dispatch targeted alerts.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e3d59" />
        <Text style={styles.loadingText}>Loading Admin Command Center...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ✅ COMMUNITY CHAT BUTTON — NEW */}
      <TouchableOpacity
        onPress={() => navigation.navigate('CommunityChat', {
          senderName: 'Admin',
          senderCpms: null,
          role: 'admin',
        })}
        style={styles.chatBtn}
      >
        <Text style={styles.chatBtnText}>💬 Community Chat</Text>
      </TouchableOpacity>

      {/* Tab Controls */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeView === 'metrics' && styles.activeTab]}
          onPress={() => setActiveView('metrics')}
        >
          <Text style={[styles.tabText, activeView === 'metrics' && styles.activeTabText]}>📊 Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeView === 'limbo' && styles.activeTab]}
          onPress={() => setActiveView('limbo')}
        >
          <Text style={[styles.tabText, activeView === 'limbo' && styles.activeTabText]}>⏳ In Limbo ({totalPendingPickups})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeView === 'missing' && styles.activeTab]}
          onPress={() => setActiveView('missing')}
        >
          <Text style={[styles.tabText, activeView === 'missing' && styles.activeTabText]}>⚠️ Missing ({totalReportedMissing})</Text>
        </TouchableOpacity>
      </View>

      {/* Stats View */}
      {activeView === 'metrics' && (
        <View style={styles.metricsWrapper}>
          <Text style={styles.sectionHeader}>CAMPUS PARCEL ANALYTICS OVERVIEW</Text>
          <View style={styles.gridRow}>
            <View style={[styles.metricCard, { backgroundColor: '#eef6f1', borderColor: '#17b978' }]}>
              <Text style={[styles.metricNumber, { color: '#17b978' }]}>{totalReceivedToday}</Text>
              <Text style={styles.metricLabel}>Total Arrived</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: '#fff3cd', borderColor: '#ffc107' }]}>
              <Text style={[styles.metricNumber, { color: '#b78103' }]}>{totalPendingPickups}</Text>
              <Text style={styles.metricLabel}>Still in Room</Text>
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={[styles.metricCard, { backgroundColor: '#d1ecf1', borderColor: '#17a2b8' }]}>
              <Text style={[styles.metricNumber, { color: '#17a2b8' }]}>{totalDeliveredToday}</Text>
              <Text style={styles.metricLabel}>Picked Up Safe</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: '#f8d7da', borderColor: '#dc3545' }]}>
              <Text style={[styles.metricNumber, { color: '#d9534f' }]}>{totalReportedMissing}</Text>
              <Text style={styles.metricLabel}>Reported Missing</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.broadcastBtn} onPress={handleTargetedPing}>
            <Text style={styles.broadcastBtnText}>🚨 PING TARGETED PENDING STUDENTS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Limbo View */}
      {activeView === 'limbo' && (
        <FlatList
          data={limboParcels}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>No packages in the parcel room!</Text>}
          renderItem={({ item }) => (
            <View style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.logCpms}>{item.cpms}</Text>
                <Text style={styles.badgeLimbo}>UNCLAIMED</Text>
              </View>
              <Text style={styles.logDetails}>Student Recipient: <Text style={{ fontWeight: 'bold' }}>{item.studentName}</Text></Text>
              <Text style={styles.logTime}>Status: Sitting inside campus central collection cage.</Text>
            </View>
          )}
        />
      )}

      {/* Missing View */}
      {activeView === 'missing' && (
        <FlatList
          data={missingParcels}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>Zero items flagged missing!</Text>}
          renderItem={({ item }) => (
            <View style={[styles.logCard, { borderColor: '#d9534f', borderWidth: 1 }]}>
              <View style={styles.logHeader}>
                <Text style={[styles.logCpms, { color: '#d9534f' }]}>{item.cpms}</Text>
                <Text style={styles.badgeMissing}>MISSING ALERT</Text>
              </View>
              <Text style={styles.logDetails}>Assigned Owner: <Text style={{ fontWeight: 'bold' }}>{item.studentName}</Text></Text>
              <Text style={styles.logTime}>Action Required: Cross-reference entry timestamp against security camera feeds.</Text>
            </View>
          )}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#555', fontWeight: '500' },
  chatBtn: { backgroundColor: '#1e3d59', padding: 12, borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  chatBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  tabContainer: { flexDirection: 'row', marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#e2e6ea', borderRadius: 8, marginHorizontal: 3, borderWidth: 1, borderColor: '#dae0e5' },
  activeTab: { backgroundColor: '#1e3d59', borderColor: '#1e3d59' },
  tabText: { color: '#495057', fontWeight: 'bold', fontSize: 12 },
  activeTabText: { color: '#fff' },
  metricsWrapper: { flex: 1, paddingHorizontal: 5 },
  sectionHeader: { fontSize: 11, fontWeight: 'bold', color: '#6c757d', letterSpacing: 1.5, marginBottom: 20, textAlign: 'center' },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  metricCard: { flex: 0.48, padding: 22, borderRadius: 14, borderWidth: 1, alignItems: 'center', elevation: 2 },
  metricNumber: { fontSize: 32, fontWeight: 'bold' },
  metricLabel: { fontSize: 12, color: '#495057', fontWeight: '700', marginTop: 6 },
  broadcastBtn: { backgroundColor: '#d9534f', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, elevation: 3 },
  broadcastBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5 },
  logCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginVertical: 6, borderWidth: 1, borderColor: '#e9ecef', elevation: 1 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  logCpms: { fontSize: 16, fontWeight: 'bold', color: '#1e3d59', letterSpacing: 0.5 },
  logDetails: { fontSize: 14, color: '#333', marginBottom: 4 },
  logTime: { fontSize: 12, color: '#868e96', fontStyle: 'italic', lineHeight: 16, marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#6c757d', fontSize: 14, marginTop: 45, fontWeight: '500', fontStyle: 'italic' },
  badgeLimbo: { backgroundColor: '#fff3cd', color: '#856404', fontSize: 11, fontWeight: 'bold', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, overflow: 'hidden' },
  badgeMissing: { backgroundColor: '#f8d7da', color: '#721c24', fontSize: 11, fontWeight: 'bold', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, overflow: 'hidden' }
});