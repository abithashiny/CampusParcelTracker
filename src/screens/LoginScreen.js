// src/screens/LoginScreen.js

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';

import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin login states
  const [isAdminModalVisible, setIsAdminModalVisible] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const auth = getAuth();

  // --------------------------------------------------
  // STUDENT LOGIN
  // --------------------------------------------------

  const handleStudentLogin = async () => {
    if (!email || !password) {
      Alert.alert(
        'Error',
        'Please fill in all email and password fields.'
      );
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      setLoading(false);

      navigation.navigate('StudentDashboard', {
        uid: userCredential.user.uid
      });

    } catch (error) {
      setLoading(false);

      Alert.alert(
        'Authentication Failed',
        'Incorrect password or unauthorized campus email.'
      );
    }
  };

  // --------------------------------------------------
  // ADMIN LOGIN
  // --------------------------------------------------

  const handleAdminLogin = async () => {
    if (!adminEmail || !adminPassword) {
      Alert.alert(
        'Error',
        'Please enter admin email and password.'
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Login through Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        adminEmail.trim(),
        adminPassword
      );

      const user = userCredential.user;

      // 2. Check whether this user exists in admins collection
      const adminRef = doc(db, 'admins', user.uid);
      const adminSnap = await getDoc(adminRef);

      // 3. User is authenticated but is NOT an admin
      if (!adminSnap.exists()) {
        await signOut(auth);

        setLoading(false);

        Alert.alert(
          'Access Denied',
          'This account is not authorized as an administrator.'
        );

        return;
      }

      // 4. Check role
      const adminData = adminSnap.data();

      if (adminData.role !== 'admin') {
        await signOut(auth);

        setLoading(false);

        Alert.alert(
          'Access Denied',
          'This account does not have administrator privileges.'
        );

        return;
      }

      // 5. Admin successfully verified
      setLoading(false);

      setIsAdminModalVisible(false);
      setAdminEmail('');
      setAdminPassword('');

      navigation.navigate('AdminDashboard');

    } catch (error) {
      setLoading(false);

      Alert.alert(
        'Admin Login Failed',
        'Invalid admin email or password.'
      );
    }
  };

  // --------------------------------------------------
  // FORGOT PASSWORD
  // --------------------------------------------------

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(
        'Reset Password',
        'Please type your college email address first in the input box above.'
      );
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());

      Alert.alert(
        'Email Sent',
        'A secure password reset link has been dispatched to your inbox.'
      );

    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // --------------------------------------------------
  // SCREEN
  // --------------------------------------------------

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Campus Parcel Hub 📦
      </Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#1e3d59"
        />
      ) : (
        <View style={{ width: '100%', alignItems: 'center' }}>

          {/* DELIVERY PORTAL */}

          <TouchableOpacity
            style={styles.deliveryGateBtn}
            onPress={() => navigation.navigate('DeliveryPortal')}
          >
            <Text style={styles.deliveryGateText}>
              DELIVERY PERSONNEL OPEN HERE →
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* STUDENT LOGIN */}

          <Text style={styles.subtitle}>
            Student Secure Login
          </Text>

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

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleStudentLogin}
          >
            <Text style={styles.buttonText}>
              LOGIN AS STUDENT
            </Text>
          </TouchableOpacity>

          {/* ADMIN BUTTON */}

          <TouchableOpacity
            style={[
              styles.loginBtn,
              {
                backgroundColor: '#d9534f',
                marginTop: 12
              }
            ]}
            onPress={() => setIsAdminModalVisible(true)}
          >
            <Text style={styles.buttonText}>
              ENTRANCE FOR COLLEGE ADMIN →
            </Text>
          </TouchableOpacity>

          {/* FORGOT PASSWORD */}

          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>
              Forgot default password? Reset via Email
            </Text>
          </TouchableOpacity>

        </View>
      )}

      {/* --------------------------------------------------
          ADMIN LOGIN MODAL
          -------------------------------------------------- */}

      <Modal
        visible={isAdminModalVisible}
        animationType="fade"
        transparent={true}
      >

        <View style={styles.modalContainer}>

          <View style={styles.modalContent}>

            <Text style={styles.modalTitle}>
              🔒 Admin Login
            </Text>

            <Text style={styles.modalSubtitle}>
              Authorized college administrators only.
            </Text>

            {/* ADMIN EMAIL */}

            <TextInput
              style={styles.modalInput}
              placeholder="Admin Username / Email"
              placeholderTextColor="#999"
              value={adminEmail}
              onChangeText={setAdminEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* ADMIN PASSWORD */}

            <TextInput
              style={styles.modalInput}
              placeholder="Admin Password"
              placeholderTextColor="#999"
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry={true}
              autoCapitalize="none"
            />

            {/* BUTTONS */}

            <View style={styles.modalRow}>

              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: '#777' }
                ]}
                onPress={() => {
                  setIsAdminModalVisible(false);
                  setAdminEmail('');
                  setAdminPassword('');
                }}
              >
                <Text style={styles.buttonText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: '#d9534f' }
                ]}
                onPress={handleAdminLogin}
              >
                <Text style={styles.buttonText}>
                  Login
                </Text>
              </TouchableOpacity>

            </View>

          </View>

        </View>

      </Modal>

    </View>
  );
}


// --------------------------------------------------
// STYLES
// --------------------------------------------------

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 25
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1e3d59',
    marginBottom: 30
  },

  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    alignSelf: 'flex-start',
    marginBottom: 10,
    marginLeft: '10%'
  },

  deliveryGateBtn: {
    backgroundColor: '#1e3d59',
    width: '85%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15
  },

  deliveryGateText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },

  divider: {
    height: 1,
    backgroundColor: '#ccc',
    width: '85%',
    marginVertical: 20
  },

  input: {
    width: '85%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd'
  },

  loginBtn: {
    backgroundColor: '#17b978',
    width: '85%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold'
  },

  forgotText: {
    color: '#0275d8',
    marginTop: 15,
    fontSize: 13,
    fontWeight: '500'
  },

  // Admin Modal

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)'
  },

  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    elevation: 10
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e3d59',
    marginBottom: 10
  },

  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
    lineHeight: 18
  },

  modalInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    textAlign: 'left'
  },

  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },

  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5
  }

});