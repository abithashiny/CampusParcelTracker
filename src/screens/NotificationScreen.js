// src/screens/NotificationScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { db } from '../services/firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';

// 🕒 INLINE DATE HELPER ENGINE (Bypasses external file path errors)
const formatLogTimestamp = (firestoreTime) => {
  if (!firestoreTime) return 'Pending...';
  
  const date = firestoreTime.toDate ? firestoreTime.toDate() : new Date(firestoreTime);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just Now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const options = { hour: '2-digit', minute: '2-digit', hour12: true };
  const timeString = date.toLocaleTimeString([], options);

  if (date.toDateString() === now.toDateString()) {
    return `Today at ${timeString}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${timeString}`;
  }

  return `${date.toLocaleDateString()} at ${timeString}`;
};

export default function NotificationScreen({ route }) {
  const { cpmsCode } = route.params; 
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // Real-time stream filtering for unread alerts specific to this student
    const q = query(
      collection(db, "targeted_alerts"), 
      where("cpms", "==", cpmsCode),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeAlerts = [];
      snapshot.forEach((doc) => {
        activeAlerts.push({ id: doc.id, ...doc.data() });
      });

      // Sort alerts in memory (Newest on top)
      activeAlerts.sort((a, b) => {
        const tA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const tB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return tB - tA;
      });

      setAlerts(activeAlerts);
      setLoading(false);
    }, (err) => {
      console.error("Alert screen stream error: ", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [cpmsCode]);

  const clearAlert = async (alertId) => {
    try { 
      await updateDoc(doc(db, "targeted_alerts", alertId), { read: true }); 
    } catch (e) {
      console.log("Error dismissing alert:", e);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3d59" />
        <Text style={{ marginTop: 10, color: '#666' }}>Fetching alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.screenHeader}>URGENT REMINDERS</Text>
      
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>You are completely caught up! No unread notifications.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.alertCard}>
            <View style={styles.alertContent}>
              <Text style={styles.alertText}>{item.message}</Text>
              <Text style={styles.alertTime}>{formatLogTimestamp(item.createdAt)}</Text>
            </View>
            <TouchableOpacity style={styles.clearBtn} onPress={() => clearAlert(item.id)}>
              <Text style={styles.clearBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screenHeader: { fontSize: 12, fontWeight: 'bold', color: '#6c757d', letterSpacing: 1, marginBottom: 15 },
  
  alertCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    marginVertical: 6, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderLeftWidth: 5,
    borderColor: '#ffc107',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  alertContent: { flex: 0.78 },
  alertText: { fontSize: 13, color: '#333', fontWeight: '600', lineHeight: 18 },
  alertTime: { fontSize: 11, color: '#888', marginTop: 6, fontWeight: '500' },
  
  clearBtn: { flex: 0.18, backgroundColor: '#fff3cd', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#ffeeba' },
  clearBtnText: { color: '#856404', fontSize: 12, fontWeight: 'bold' },
  
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyText: { color: '#6c757d', fontSize: 14, fontWeight: '500', textAlign: 'center', paddingHorizontal: 40 }
});