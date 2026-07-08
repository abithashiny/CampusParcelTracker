// src/screens/DeliveryBoyScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera'; 
import * as ImagePicker from 'expo-image-picker'; 

import { processParcelOCR } from '../services/mockData';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export default function DeliveryBoyScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false); 
  
  let cameraRef = React.useRef(null);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need your permission to use the camera for scanning labels.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={{color:'#fff', fontWeight:'bold'}}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const uploadParcelToCloud = async (cpmsCode, studentName) => {
    setLoading(true);
    try {
      await addDoc(collection(db, "parcels"), {
        cpms: cpmsCode.toUpperCase().trim(),
        studentName: studentName,
        status: 'Pending PickUp',
        reportedMissed: false,
        createdAt: serverTimestamp()
      });
      
      Alert.alert("Parcel Logged! 📦", `Assigned to: ${studentName}\nCode: ${cpmsCode}`);
      setManualInput('');
      Keyboard.dismiss();
    } catch (error) {
      Alert.alert("Database Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const takePicture = async () => {
    if (!isCameraReady || !cameraRef.current) {
      Alert.alert("Camera Initializing", "Please wait a moment for the camera lens to focus.");
      return;
    }

    setLoading(true);
    let photo = null;

    try {
      // First Attempt
      photo = await cameraRef.current.takePictureAsync({ 
        quality: 0.6,
        shutterSound: true,
      });
    } catch (firstError) {
      console.log("First capture try failed, running hardware retry loop...", firstError);
      
      // FIX: Because the camera remains mounted, cameraRef.current will NOT be null here!
      try {
        await new Promise(resolve => setTimeout(resolve, 500)); // Increased to 500ms safety limit
        if (cameraRef.current) {
          photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
        }
      } catch (secondError) {
        console.log("Capture internal log check:", secondError);
        setLoading(false);
        Alert.alert(
          "Capture Error 📸", 
          "The phone camera lens is temporarily busy. Please try tapping scan again or use the MANUAL OVERRIDE input below!"
        );
        return;
      }
    }

    if (photo && photo.uri) {
      try {
        const result = await processParcelOCR(photo.uri);
        if (result.success && result.cpms) {
          await uploadParcelToCloud(result.cpms, result.studentName);
        } else {
          Alert.alert("OCR Failed ❌", "Could not read a CPMS code clearly. Try a better angle or type it manually below.");
        }
      } catch (ocrError) {
        Alert.alert("Processing Error", "Failed to analyze image text.");
      } finally {
        setLoading(false);
      }
    }
  };

  const pickFromGallery = async () => {
    const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!galleryStatus.granted) {
      Alert.alert("Permission Denied", "We need access to your gallery to process images.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setLoading(true);
      try {
        const ocrResult = await processParcelOCR(result.assets[0].uri);
        if (ocrResult.success && ocrResult.cpms) {
          await uploadParcelToCloud(ocrResult.cpms, ocrResult.studentName);
        } else {
          Alert.alert("OCR Failed ❌", "Could not read text from this image. Please type it manually below.");
        }
      } catch (e) {
        Alert.alert("Error", "Failed parsing image.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleManualSubmit = async () => {
    if (!manualInput.trim()) {
      Alert.alert("Input Empty", "Please type a CPMS code before pressing upload.");
      return;
    }

    const enteredCode = manualInput.trim().toUpperCase();
    setLoading(true);

    try {
      const studentQuery = query(collection(db, "students"), where("cpms", "==", enteredCode));
      const querySnapshot = await getDocs(studentQuery);
      
      let finalStudentName = 'Unregistered Student';
      
      if (!querySnapshot.empty) {
        const studentDoc = querySnapshot.docs[0].data();
        finalStudentName = studentDoc.name;
      }

      await uploadParcelToCloud(enteredCode, finalStudentName);
      
    } catch (error) {
      Alert.alert("Database Error", "Verification look-up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={{ flex: 1 }}>
          
          {/* Top Viewport: Live Camera Stream View */}
          <View style={styles.cameraContainer}>
            <CameraView 
              style={styles.camera} 
              ref={cameraRef}
              mode="picture"
              onCameraReady={() => setIsCameraReady(true)}
            />
            
            {/* FIX: Render loading indicator as an overlay so camera doesn't unmount */}
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#17b978" />
                <Text style={styles.loadingText}>Processing data...</Text>
              </View>
            )}
          </View>

          {/* Bottom Viewport: Action Deck Portal */}
          <View style={styles.actionPortalDeck}>
            <Text style={styles.sectionHeader}>IMAGE INPUT OPTIONS</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryActionBtn} onPress={pickFromGallery} disabled={loading}>
                <Text style={styles.secondaryActionText}>🖼️ GALLERY UPLOAD</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.primaryActionBtn, (!isCameraReady || loading) && { opacity: 0.5 }]} 
                onPress={takePicture}
                disabled={loading}
              >
                <Text style={styles.primaryActionText}>📸 SCAN LABEL</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionHeader}>MANUAL OVERRIDE INPUT</Text>
            <View style={styles.typeInputRow}>
              <TextInput 
                style={styles.textInputBox}
                placeholder="Type Code (e.g., CPMS101)"
                placeholderTextColor="#999"
                value={manualInput}
                onChangeText={setManualInput}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={handleManualSubmit}
                editable={!loading}
              />
              <TouchableOpacity style={styles.typeSubmitBtn} onPress={handleManualSubmit} disabled={loading}>
                <Text style={styles.typeSubmitText}>SUBMIT</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  cameraContainer: { flex: 0.45, backgroundColor: '#000', position: 'relative' },
  camera: { flex: 1 },
  
  // FIX: Absolute positioning keeping component references intact
  loadingOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { marginTop: 12, fontSize: 15, color: '#fff', fontWeight: '500' },
  
  actionPortalDeck: { 
    flex: 0.55, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20,
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 5
  },
  sectionHeader: { fontSize: 12, fontWeight: 'bold', color: '#777', letterSpacing: 1, marginBottom: 12 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  primaryActionBtn: { backgroundColor: '#17b978', flex: 0.48, paddingVertical: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
  primaryActionText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  secondaryActionBtn: { backgroundColor: '#f0f4f8', flex: 0.48, paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#d0dbe5' },
  secondaryActionText: { color: '#1e3d59', fontSize: 14, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#eee', width: '100%', marginVertical: 15 },
  typeInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textInputBox: { flex: 0.7, backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14, fontSize: 16, color: '#333', fontWeight: 'bold' },
  typeSubmitBtn: { flex: 0.26, backgroundColor: '#1e3d59', paddingVertical: 15, borderRadius: 12, alignItems: 'center', elevation: 2 },
  typeSubmitText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#fff' },
  permissionText: { textAlign: 'center', fontSize: 16, color: '#666', lineHeight: 24, marginBottom: 20 },
  permissionBtn: { backgroundColor: '#1e3d59', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 8 }
});