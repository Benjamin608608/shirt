import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

import AuthScreen from '../screens/AuthScreen';
import WardrobeScreen from '../screens/WardrobeScreen';
import AddGarmentScreen from '../screens/AddGarmentScreen';
import ProfilePhotoScreen from '../screens/ProfilePhotoScreen';
import TryOnScreen from '../screens/TryOnScreen';
import TryOnResultScreen from '../screens/TryOnResultScreen';
import TryOnHistoryScreen from '../screens/TryOnHistoryScreen';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <Stack.Navigator id="auth" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator id="main">
          <Stack.Screen
            name="Wardrobe"
            component={WardrobeScreen}
            options={{ title: '我的衣櫃' }}
          />
          <Stack.Screen
            name="AddGarment"
            component={AddGarmentScreen}
            options={{ title: '新增衣服' }}
          />
          <Stack.Screen
            name="ProfilePhoto"
            component={ProfilePhotoScreen}
            options={{ title: '個人照片' }}
          />
          <Stack.Screen
            name="TryOn"
            component={TryOnScreen}
            options={{ title: '虛擬試穿' }}
          />
          <Stack.Screen
            name="TryOnResult"
            component={TryOnResultScreen}
            options={{ title: '試穿結果' }}
          />
          <Stack.Screen
            name="TryOnHistory"
            component={TryOnHistoryScreen}
            options={{ title: '試穿記錄' }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
