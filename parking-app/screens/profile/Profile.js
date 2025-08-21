import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles } from '../../theme/styles';
import { colors } from '../../theme/colors';
import ParkingAPI from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Profile = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReservations: 0,
    favoriteSpots: 0,
    vehicles: 1,
  });
  const [settings, setSettings] = useState({
    notifications: true,
    locationServices: true,
    autoReserve: false,
    darkMode: true,
  });

  useEffect(() => {
    loadUserData();
    loadSettings();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const currentUser = await ParkingAPI.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        
        // Get user reservations to calculate stats
        const reservations = await ParkingAPI.getUserReservations();
        const favorites = await ParkingAPI.getFavorites();
        
        setStats({
          totalReservations: reservations.length,
          favoriteSpots: favorites.length,
          vehicles: 1, // You can implement vehicles API later
        });
      }
    } catch (error) {
      console.error('❌ Failed to load user data:', error);
      // Don't try to navigate - let App.js handle auth state
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await ParkingAPI.logout();
              // Trigger auth refresh
              if (global.refreshAuth) {
                setTimeout(() => global.refreshAuth(), 100);
              }
              console.log('👋 User logged out successfully');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const renderStatCard = (title, value, icon, color) => (
    <View style={[globalStyles.cardSmall, { flex: 1, alignItems: 'center', marginHorizontal: 4 }]}>
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: color,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <Ionicons name={icon} size={20} color={colors.white} />
      </View>
      <Text style={[globalStyles.title, { fontSize: 20, marginBottom: 4 }]}>
        {value}
      </Text>
      <Text style={[globalStyles.caption, { textAlign: 'center' }]}>
        {title}
      </Text>
    </View>
  );

  const renderMenuOption = (title, subtitle, icon, onPress, rightComponent) => (
    <TouchableOpacity
      style={[globalStyles.cardSmall, { marginBottom: 8 }]}
      onPress={onPress}
    >
      <View style={globalStyles.spaceBetween}>
        <View style={globalStyles.row}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.primary + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
            <Ionicons name={icon} size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={globalStyles.subheading}>{title}</Text>
            {subtitle && (
              <Text style={globalStyles.caption}>{subtitle}</Text>
            )}
          </View>
        </View>
        {rightComponent || (
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSettingOption = (title, subtitle, settingKey) => (
    renderMenuOption(
      title,
      subtitle,
      'settings-outline',
      null,
      <Switch
        value={settings[settingKey]}
        onValueChange={(value) => updateSetting(settingKey, value)}
        trackColor={{ false: colors.surface, true: colors.primary + '40' }}
        thumbColor={settings[settingKey] ? colors.primary : colors.textMuted}
      />
    )
  );

  if (loading) {
    return (
      <View style={globalStyles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[globalStyles.bodyText, { marginTop: 16 }]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={colors.gradientPrimary}
          style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 30,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          }}
        >
          <View style={globalStyles.spaceBetween}>
            <Text style={[globalStyles.headerTitle, { color: colors.white }]}>Profile</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditProfile', { user })}
            >
              <Ionicons name="create-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* User Info */}
          <View style={[globalStyles.center, { marginTop: 20 }]}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Text style={{
                fontSize: 32,
                fontWeight: 'bold',
                color: colors.white,
              }}>
                {user?.firstName?.charAt(0) || 'U'}{user?.lastName?.charAt(0) || ''}
              </Text>
            </View>
            
            <Text style={[globalStyles.heading, { color: colors.white, marginBottom: 4 }]}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={[globalStyles.caption, { color: colors.white, opacity: 0.8 }]}>
              {user?.email}
            </Text>
            
            {user?.licensePlate && (
              <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 8,
                paddingVertical: 4,
                paddingHorizontal: 12,
                marginTop: 8,
              }}>
                <Text style={[globalStyles.caption, { color: colors.white }]}>
                  🚗 {user.licensePlate}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={[globalStyles.row, { padding: 20 }]}>
          {renderStatCard('Reservations', stats.totalReservations, 'bookmark', colors.primary)}
          {renderStatCard('Favorites', stats.favoriteSpots, 'heart', colors.secondary)}
          {renderStatCard('Vehicles', stats.vehicles, 'car', colors.info)}
        </View>

        {/* Menu Options */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={[globalStyles.heading, { marginBottom: 16 }]}>Account</Text>
          
          {renderMenuOption(
            'Edit Profile',
            'Update your personal information',
            'person-outline',
            () => navigation.navigate('EditProfile', { user })
          )}

          {renderMenuOption(
            'My Reservations',
            'View and manage your bookings',
            'bookmark-outline',
            () => navigation.navigate('Reservations')
          )}

          {renderMenuOption(
            'Payment Methods',
            'Manage your payment options',
            'card-outline',
            () => Alert.alert('Coming Soon', 'Payment management will be available soon!')
          )}

          {renderMenuOption(
            'Vehicle Information',
            'Manage your registered vehicles',
            'car-outline',
            () => Alert.alert('Coming Soon', 'Vehicle management will be available soon!')
          )}

          <Text style={[globalStyles.heading, { marginTop: 24, marginBottom: 16 }]}>Settings</Text>

          {renderSettingOption(
            'Push Notifications',
            'Get notified about reservations',
            'notifications'
          )}

          {renderSettingOption(
            'Location Services',
            'Find nearby parking automatically',
            'locationServices'
          )}

          {renderSettingOption(
            'Auto Reserve',
            'Automatically book your favorite spots',
            'autoReserve'
          )}

          <Text style={[globalStyles.heading, { marginTop: 24, marginBottom: 16 }]}>Support</Text>

          {renderMenuOption(
            'Help & FAQ',
            'Get answers to common questions',
            'help-circle-outline',
            () => Alert.alert('Coming Soon', 'Help section will be available soon!')
          )}

          {renderMenuOption(
            'Contact Support',
            'Get help from our team',
            'mail-outline',
            () => Alert.alert('Coming Soon', 'Support contact will be available soon!')
          )}

          {renderMenuOption(
            'About',
            'Learn more about Smart Parking',
            'information-circle-outline',
            () => Alert.alert('Smart Parking', 'Version 1.0.0\n\nBuilt with React Native and Expo')
          )}

          {/* Logout Button */}
          <TouchableOpacity
            style={[
              globalStyles.button,
              { 
                backgroundColor: colors.error,
                marginTop: 32,
                marginBottom: 100,
              }
            ]}
            onPress={handleLogout}
          >
            <View style={globalStyles.row}>
              <Ionicons name="log-out-outline" size={20} color={colors.white} />
              <Text style={[globalStyles.buttonText, { marginLeft: 8 }]}>
                Logout
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;