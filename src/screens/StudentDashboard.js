// src/screens/StudentDashboard.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { db } from '../services/firebaseConfig';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';

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
  if (date.toDateString() === now.toDateString()) return `Today at ${timeString}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${timeString}`;
  return `${date.toLocaleDateString()} at ${timeString}`;
};

export default function StudentDashboard({ route, navigation }) {
  const { uid } = route.params;
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('myParcels');
  const [personalParcels, setPersonalParcels] = useState([]);
  const [missedFeeds, setMissedFeeds] = useState([]);
  const [alertsCount, setAlertsCount] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "students", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setStudentProfile(docSnap.data());
      } catch (err) {
        console.log("Error loading profile: ", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [uid]);

  useEffect(() => {
    if (!studentProfile) return;
    const q = query(collection(db, "parcels"), where("cpms", "==", studentProfile.cpms));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => { data.push({ id: doc.id, ...doc.data() }); });
      data.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return timeB - timeA;
      });
      setPersonalParcels(data);
    });
    return () => unsubscribe();
  }, [studentProfile]);

  useEffect(() => {
    const q = query(collection(db, "missed_board"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => { data.push({ id: doc.id, ...doc.data() }); });
      data.sort((a, b) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return tB - tA;
      });
      setMissedFeeds(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!studentProfile) return;
    const q = query(
      collection(db, "targeted_alerts"),
      where("cpms", "==", studentProfile.cpms),
      where("read", "==", false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAlertsCount(snapshot.size);
    }, (error) => {
      console.log("Notification badge listener error: ", error);
    });
    return () => unsubscribe();
  }, [studentProfile]);

  const markAsDelivered = async (parcelId) => {
    try {
      await updateDoc(doc(db, "parcels", parcelId), { status: 'Delivered', claimedAt: serverTimestamp() });
      Alert.alert("Success ✅", "Parcel safely cleared and logged as picked up!");
    } catch (error) {
      Alert.alert("Error", "Action failure.");
    }
  };

  const reportMissed = async (parcel) => {
    try {
      await updateDoc(doc(db, "parcels", parcel.id), { status: 'Reported Missing', reportedMissed: true });
      await addDoc(collection(db, "missed_board"), {
        cpms: parcel.cpms,
        originalOwner: studentProfile.name,
        foundBy: null,
        timestamp: serverTimestamp()
      });
      Alert.alert("Broadcasted", "Missing status updated. Posted to public campus feed.");
    } catch (error) {
      Alert.alert("Error", "Action failure.");
    }
  };

  const resolveFound = async (item) => {
    try {
      await updateDoc(doc(db, "missed_board", item.id), { foundBy: studentProfile.name });
      Alert.alert("Resolved", "Thank you for finding the package! Owner has been updated.");
    } catch (error) {
      Alert.alert("Error", "Action failure.");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1e3d59" /></View>;

  return (
    <View style={styles.container}>

      {/* Profile Header */}
      <View style={styles.headerProfileCard}>
        <View style={styles.headerRowLayout}>
          <View>
            <Text style={styles.welcomeUserText}>Welcome, {studentProfile?.name || 'Student'} 👋</Text>
            <Text style={styles.metaUserText}>ID: {studentProfile?.cpms}</Text>
          </View>
          <TouchableOpacity
            style={styles.bellButtonContainer}
            onPress={() => navigation.navigate('NotificationScreen', { cpmsCode: studentProfile?.cpms })}
          >
            <Text style={styles.bellIconStyle}>🔔</Text>
            {alertsCount > 0 && (
              <View style={styles.redNotificationBadge}>
                <Text style={styles.badgeTextCount}>{alertsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar — 3 tabs including Chat */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'myParcels' && styles.activeTab]}
          onPress={() => setActiveTab('myParcels')}
        >
          <Text style={styles.tabText}>My Notifications ({personalParcels.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'missedFeed' && styles.activeTab]}
          onPress={() => setActiveTab('missedFeed')}
        >
          <Text style={styles.tabText}>Missed Board</Text>
        </TouchableOpacity>

        {/* ✅ COMMUNITY CHAT TAB — NEW */}
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: '#1e3d59' }]}
          onPress={() => navigation.navigate('CommunityChat', {
            senderName: studentProfile?.name,
            senderCpms: studentProfile?.cpms,
            role: 'student',
          })}
        >
          <Text style={styles.tabText}>💬 Chat</Text>
        </TouchableOpacity>
      </View>

      {/* My Parcels List */}
      {activeTab === 'myParcels' ? (
        <FlatList
          data={personalParcels}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.boldText}>📦 Package: {item.cpms}</Text>
                <Text style={styles.logTimestampStyle}>
                  {item.status === 'Delivered'
                    ? `Picked: ${formatLogTimestamp(item.claimedAt)}`
                    : `Arrived: ${formatLogTimestamp(item.createdAt)}`}
                </Text>
              </View>
              <Text style={{ marginTop: 4 }}>Current Status: <Text style={{ fontWeight: 'bold', color: item.status === 'Delivered' ? 'green' : 'orange' }}>{item.status}</Text></Text>
              {item.status === 'Pending PickUp' && (
                <View style={styles.row}>
                  <TouchableOpacity style={styles.deliveredBtn} onPress={() => markAsDelivered(item.id)}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Received</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.missedBtn} onPress={() => reportMissed(item)}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Report Missing</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={missedFeeds}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.card, { borderColor: '#d9534f', borderWidth: 1 }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.boldText}>⚠️ Missing Alert: {item.cpms}</Text>
                <Text style={styles.logTimestampStyle}>{formatLogTimestamp(item.timestamp)}</Text>
              </View>
              <Text>Belongs to: {item.originalOwner}</Text>
              {item.foundBy ? (
                <Text style={styles.foundText}>✅ Found & Returned by: {item.foundBy}</Text>
              ) : (
                <TouchableOpacity style={styles.resolveBtn} onPress={() => resolveFound(item)}>
                  <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>I found this package</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', padding: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerProfileCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eaeaea' },
  headerRowLayout: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeUserText: { fontSize: 18, fontWeight: 'bold', color: '#1e3d59' },
  metaUserText: { fontSize: 13, color: '#666', marginTop: 2 },
  bellButtonContainer: { position: 'relative', padding: 8 },
  bellIconStyle: { fontSize: 24 },
  redNotificationBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#d9534f', borderRadius: 9, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeTextCount: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', marginBottom: 15, marginTop: 4 },
  tab: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#e0e0e0', borderRadius: 4, marginHorizontal: 2 },
  activeTab: { backgroundColor: '#17b978' },
  tabText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  card: { backgroundColor: '#fff', padding: 15, marginVertical: 6, borderRadius: 8, elevation: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  boldText: { fontSize: 16, fontWeight: 'bold' },
  logTimestampStyle: { fontSize: 12, color: '#666', fontWeight: '600' },
  row: { flexDirection: 'row', marginTop: 10, justifyContent: 'space-between' },
  deliveredBtn: { backgroundColor: '#17b978', padding: 10, borderRadius: 5, width: '48%', alignItems: 'center' },
  missedBtn: { backgroundColor: '#d9534f', padding: 10, borderRadius: 5, width: '48%', alignItems: 'center' },
  foundText: { color: 'green', marginTop: 8, fontWeight: 'bold' },
  resolveBtn: { backgroundColor: '#0275d8', padding: 10, borderRadius: 5, marginTop: 8 }
});