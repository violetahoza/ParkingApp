// SmartParkingUI/App.js - Fixed version with your colors
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './theme/colors';
import { globalStyles } from './theme/styles';

// Import screens
import Login from './screens/auth/Login';
import Register from './screens/auth/Register';
import Home from './screens/Home';
import Navigation from './screens/Navigation';
import Reservations from './screens/Reservations';
import Profile from './screens/profile/Profile';
import EditProfile from './screens/profile/EditProfile';

// Import API service
import ParkingAPI from './services/api';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Navigation':
              iconName = focused ? 'navigate' : 'navigate-outline';
              break;
            case 'Reservations':
              iconName = focused ? 'bookmark' : 'bookmark-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Ionicons name={iconName} size={size || 24} color={color || colors.primary} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false, // This fixes the "medium" property error
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.surfaceLight,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Navigation" component={Navigation} />
      <Tab.Screen name="Reservations" component={Reservations} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
};

const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Register} />
    </Stack.Navigator>
  );
};

const MainStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="EditProfile" component={EditProfile} />
    </Stack.Navigator>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      
      // Initialize API and check if user is authenticated
      await ParkingAPI.init();
      const authenticated = await ParkingAPI.isAuthenticated();
      
      console.log('🔍 Auth check result:', authenticated);
      
      if (authenticated) {
        // Try to get current user to verify token is valid
        try {
          const user = await ParkingAPI.getCurrentUser();
          console.log('✅ User authenticated:', user?.firstName);
          setIsAuthenticated(true);
        } catch (error) {
          console.log('❌ Token invalid:', error.message);
          await ParkingAPI.logout();
          setIsAuthenticated(false);
        }
      } else {
        console.log('🔓 User not authenticated');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a simple refresh function for login/logout
  global.refreshAuth = checkAuthStatus;

  if (isLoading) {
    return (
      <View style={globalStyles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[globalStyles.bodyText, { marginTop: 16, color: colors.textSecondary }]}>
          Loading Smart Parking...
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: colors.primary,
            background: colors.background,
            card: colors.surface,
            text: colors.textPrimary,
            border: colors.surfaceLight,
            notification: colors.error,
          },
        }}
      >
        {isAuthenticated ? <MainStack /> : <AuthStack />}
      </NavigationContainer>
    </>
  );
}