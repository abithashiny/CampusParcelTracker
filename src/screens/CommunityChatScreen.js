import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../services/firebaseConfig';
import {
  collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';

export default function CommunityChatScreen({ route }) {
  const { senderName, senderCpms, role } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, 'community_chat'),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    });
    return () => unsub();
  }, []);

  const sendText = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    try {
      await addDoc(collection(db, 'community_chat'), {
        senderName,
        senderCpms: senderCpms || null,
        role,
        text: trimmed,
        imageBase64: null,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      Alert.alert('Error', 'Could not send message.');
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow gallery access in your phone settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.3,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      convertAndSend(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow camera access in your phone settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.3,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      convertAndSend(result.assets[0]);
    }
  };

  const convertAndSend = async (asset) => {
    if (!asset.base64) {
      Alert.alert('Error', 'Could not read image.');
      return;
    }
    if (asset.base64.length > 900000) {
      Alert.alert('Too Large', 'Image is too large. Please pick a smaller one.');
      return;
    }
    setUploading(true);
    try {
      await addDoc(collection(db, 'community_chat'), {
        senderName,
        senderCpms: senderCpms || null,
        role,
        text: null,
        imageBase64: `data:image/jpeg;base64,${asset.base64}`,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      Alert.alert('Error', 'Could not send image. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderCpms === senderCpms && item.role === role;
    return (
      <View style={[
        styles.bubbleWrapper,
        isMe ? styles.myWrapper : styles.theirWrapper
      ]}>
        {!isMe && (
          <Text style={styles.senderLabel}>
            {item.role === 'admin' ? '🛡️ Admin' : item.senderName}
          </Text>
        )}
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
          {item.text ? (
            <Text style={[styles.msgText, isMe && styles.myMsgText]}>
              {item.text}
            </Text>
          ) : item.imageBase64 ? (
            <Image
              source={{ uri: item.imageBase64 }}
              style={styles.chatImage}
              resizeMode="cover"
            />
          ) : null}
        </View>
        <Text style={[styles.timeLabel, isMe && styles.myTimeLabel]}>
          {item.timestamp?.toDate
            ? item.timestamp.toDate().toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit'
              })
            : '...'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior='padding'
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No messages yet.</Text>
              <Text style={styles.emptySubText}>Be the first to say something!</Text>
            </View>
          }
        />

        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.uploadingText}>  Sending photo...</Text>
          </View>
        )}

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={pickFromGallery}>
            <Text style={styles.iconText}>🖼️</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={takePhoto}>
            <Text style={styles.iconText}>📷</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={sendText}
            disabled={!text.trim()}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  container: {
    flex: 1,
  },
  messagesList: {
    padding: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#555' },
  emptySubText: { fontSize: 13, color: '#999', marginTop: 4 },
  bubbleWrapper: {
    marginVertical: 4,
    maxWidth: '78%',
  },
  myWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  theirWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    padding: 10,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#1e3d59',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  msgText: {
    fontSize: 14,
    color: '#222',
    lineHeight: 20,
  },
  myMsgText: {
    color: '#ffffff',
  },
  chatImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  timeLabel: {
    fontSize: 10,
    color: '#aaa',
    marginTop: 2,
    marginRight: 4,
  },
  myTimeLabel: {
    textAlign: 'right',
  },
  uploadingBar: {
    flexDirection: 'row',
    backgroundColor: '#1e3d59',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 13,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  iconText: {
    fontSize: 24,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#222',
    marginHorizontal: 6,
  },
  sendBtn: {
    backgroundColor: '#17b978',
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#b2dfcc',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});