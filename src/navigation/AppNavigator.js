// src/navigation/AppNavigator.js
import React from 'react';
import CommunityChatScreen from '../screens/CommunityChatScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboard from '../screens/AdminDashboard';
import NotificationScreen from '../screens/NotificationScreen';

import LoginScreen from '../screens/LoginScreen';
import DeliveryBoyScreen from '../screens/DeliveryBoyScreen';
import StudentDashboard from '../screens/StudentDashboard';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DeliveryPortal" component={DeliveryBoyScreen} options={{ title: 'Delivery Portal' }} />
        <Stack.Screen name="StudentDashboard" component={StudentDashboard} options={{ title: 'Student Hub' }} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ title: 'Admin Command Center' }} />
        <Stack.Screen 
          name="NotificationScreen" 
          component={NotificationScreen} 
          options={{ title: 'Alert Center 🔔' }} 
        />
        <Stack.Screen
        name="CommunityChat"
        component={CommunityChatScreen}
        options={{ title: '💬 Community Chat' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}