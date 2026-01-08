import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

import AuthScreen from '../screens/AuthScreen';
import WardrobeScreen from '../screens/WardrobeScreen';
import AddGarmentScreen from '../screens/AddGarmentScreen';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator>
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
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
