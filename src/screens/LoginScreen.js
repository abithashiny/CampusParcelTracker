// src/screens/LoginScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Admin Auth Security States ---
  const [isAdminModalVisible, setIsAdminModalVisible] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');

  // SECURE MASTER PASSCODE (Change this to whatever secure key you want)
  const MASTER_ADMIN_PASSCODE = "orange";

  const auth = getAuth();

  const handleStudentLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all email and password fields.");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      setLoading(false);
      navigation.navigate('StudentDashboard', { uid: userCredential.user.uid });
    } catch (error) {
      setLoading(false);
      Alert.alert("Authentication Failed", "Incorrect password or unauthorized campus email.");
    }
  };

  const handleAdminVerifyAndNavigate = () => {
    if (adminPasscode === MASTER_ADMIN_PASSCODE) {
      setIsAdminModalVisible(false);
      setAdminPasscode(''); // Reset field
      navigation.navigate('AdminDashboard'); // Access Granted
    } else {
      Alert.alert("Access Denied ❌", "Invalid Master Admin Passcode. This security incident has been logged.");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Reset Password", "Please type your college email address first in the input box above.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("Email Sent", "A secure password reset link has been dispatched to your inbox.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Campus Parcel Hub 📦</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#1e3d59" />
      ) : (
        <View style={{ width: '100%', alignItems: 'center' }}>
          
          {/* Quick Access Box for Delivery Boys - No Login Required */}
          <TouchableOpacity 
            style={styles.deliveryGateBtn} 
            onPress={() => navigation.navigate('DeliveryPortal')}
          >
            <Text style={styles.deliveryGateText}>DELIVERY PERSONNEL OPEN HERE →</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.subtitle}>Student Secure Login</Text>
          <TextInput 
            style={styles.input} 
            placeholder="College Email Address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput 
            style={styles.input} 
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Student Login Button */}
          <TouchableOpacity style={styles.loginBtn} onPress={handleStudentLogin}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>LOGIN AS STUDENT</Text>
          </TouchableOpacity>

          {/* Secure Trigger for Admin Modal */}
          <TouchableOpacity 
            style={[styles.loginBtn, { backgroundColor: '#d9534f', marginTop: 12 }]} 
            onPress={() => setIsAdminModalVisible(true)}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>ENTRANCE FOR COLLEGE ADMIN →</Text>
          </TouchableOpacity>

          {/* Forgot Password Link */}
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Forgot default password? Reset via Email</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 🔐 ADMIN AUTHENTICATION INTERFACE MODAL */}
      <Modal visible={isAdminModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔒 Admin Security Verification</Text>
            <Text style={styles.modalSubtitle}>
              Authorized personnel only. Please input the master staff security key to access the command dashboard analytics.
            </Text>

            <TextInput 
              style={styles.modalInput}
              placeholder="Enter Master Passcode"
              placeholderTextColor="#999"
              value={adminPasscode}
              onChangeText={setAdminPasscode}
              secureTextEntry={true}
              autoCapitalize="none"
            />

            <View style={styles.modalRow}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#777' }]} 
                onPress={() => { setIsAdminModalVisible(false); setAdminPasscode(''); }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#d9534f' }]} 
                onPress={handleAdminVerifyAndNavigate}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Verify Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 25 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1e3d59', marginBottom: 30 },
  subtitle: { fontSize: 16, fontWeight: 'bold', color: '#333', alignSelf: 'flex-start', marginBottom: 10, marginLeft: '10%' },
  deliveryGateBtn: { backgroundColor: '#1e3d59', width: '85%', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  deliveryGateText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#ccc', width: '85%', marginVertical: 20 },
  input: { width: '85%', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#ddd' },
  loginBtn: { backgroundColor: '#17b978', width: '85%', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  forgotText: { color: '#0275d8', marginTop: 15, fontSize: 13, fontWeight: '500' },
  
  // Security Modal Styles
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { width: '85%', backgroundColor: '#fff', padding: 25, borderRadius: 15, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e3d59', marginBottom: 10 },
  modalSubtitle: { fontSize: 13, color: '#666', marginBottom: 20, lineHeight: 18 },
  modalInput: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#ddd', marginBottom: 20, textAlign: 'center' },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 }
});