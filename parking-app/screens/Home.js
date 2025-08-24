import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Dimensions, FlatList, Image, Alert,} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles } from '../theme/styles';
import { colors } from '../theme/colors';
import ParkingAPI from '../services/api';
import { useRealTimeData } from '../hooks/useRealTimeData';
import { useLocation } from '../hooks/useLocation';

const { width } = Dimensions.get('window');

const Home = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [recentReservations, setRecentReservations] = useState([]);
  const [activeBookingsCount, setActiveBookingsCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const { locations, loading: lotsLoading, refreshData } = useRealTimeData();
  
  const {
    location: userLocation,
    address: userAddress,
    loading: locationLoading,
    error: locationError,
    isLocationAvailable,
    formattedAddress,
    initializeLocation,
    refreshLocation,
    getDistanceTo,
  } = useLocation({
    enableHighAccuracy: false, // use balanced accuracy for home screen to save battery
    distanceInterval: 100, // update every 100 meters
    timeInterval: 30000,   // update every 30 seconds
  });

  useEffect(() => {
    loadUserData();
    loadRecentReservations();
    initializeLocation();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await ParkingAPI.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReservationStatus = (reservation) => {
    if (reservation.status === 'cancelled') return 'cancelled';
    if (reservation.status === 'completed') return 'completed';
    
    const now = new Date();
    const startTime = new Date(reservation.start_time);
    const endTime = new Date(reservation.end_time);
    
    if (now < startTime) return 'upcoming';
    if (now >= startTime && now <= endTime) return 'active';
    return 'expired';
  };

  const loadRecentReservations = async () => {
    try {
      const reservations = await ParkingAPI.getUserReservations();
      
      const activeReservations = reservations.filter(reservation => {
        const status = getReservationStatus(reservation);
        return (status === 'active' || status === 'upcoming') && reservation.status === 'active';
      });
      
      console.log('📊 HOME STATS:', {
        totalReservations: reservations.length,
        activeBookings: activeReservations.length,
        recentShown: reservations.slice(0, 3).length
      });
      
      setActiveBookingsCount(activeReservations.length);
      setRecentReservations(reservations.slice(0, 3));
    } catch (error) {
      console.error('Failed to load reservations:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadUserData(),
      loadRecentReservations(),
      refreshData(),
      refreshLocation(),
    ]);
    setIsRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getProfileImageUrl = () => {
    if (!user?.profileImageUrl) return null;
    
    if (user.profileImageUrl.startsWith('http')) {
      return user.profileImageUrl;
    } else {
      return `http://192.168.100.20:3000${user.profileImageUrl}`;
    }
  };

  const handleLocationPress = async () => {
    if (locationError) {
      Alert.alert(
        'Location Error',
        'Unable to get your location. This helps us find parking lots near you.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Retry', 
            onPress: () => initializeLocation() 
          }
        ]
      );
    } else if (!isLocationAvailable) {
      Alert.alert(
        'Enable Location',
        'Allow location access to see nearby parking lots and get personalized recommendations.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { 
            text: 'Enable', 
            onPress: () => initializeLocation() 
          }
        ]
      );
    } else {
      refreshLocation();
    }
  };

  // Get nearby parking lots 
  const getNearbyParkingLots = () => {
    if (!userLocation) return locations.slice(0, 3);

    return locations
      .map(lot => ({
        ...lot,
        distance: getDistanceTo(lot.latitude, lot.longitude)
      }))
      .filter(lot => lot.distance && lot.distance <= 5) // within 5km
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  };

  const renderLocationWidget = () => {
    if (locationLoading) {
      return (
        <View style={[globalStyles.row, { backgroundColor: colors.info + '20', padding: 12, borderRadius: 8, marginBottom: 16 }]}>
          <ActivityIndicator size="small" color={colors.info} />
          <Text style={[globalStyles.caption, { marginLeft: 8, color: colors.info }]}>
            Getting your location...
          </Text>
        </View>
      );
    }

    if (locationError) {
      return (
        <TouchableOpacity 
          style={[globalStyles.row, { backgroundColor: colors.warning + '20', padding: 12, borderRadius: 8, marginBottom: 16 }]}
          onPress={handleLocationPress}
        >
          <Ionicons name="location-outline" size={20} color={colors.warning} />
          <Text style={[globalStyles.caption, { marginLeft: 8, flex: 1, color: colors.warning }]}>
            Enable location for better parking suggestions
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.warning} />
        </TouchableOpacity>
      );
    }

    if (!isLocationAvailable) {
      return (
        <TouchableOpacity 
          style={[globalStyles.row, { backgroundColor: colors.primary + '20', padding: 12, borderRadius: 8, marginBottom: 16 }]}
          onPress={handleLocationPress}
        >
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={[globalStyles.caption, { marginLeft: 8, flex: 1, color: colors.primary }]}>
            Tap to enable location for personalized results
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      );
    }

    const nearbyLots = getNearbyParkingLots();
    const totalNearbySpots = nearbyLots.reduce((sum, lot) => sum + (lot.available_spots || 0), 0);

    return (
      <TouchableOpacity 
        style={[globalStyles.row, { backgroundColor: colors.success + '20', padding: 12, borderRadius: 8, marginBottom: 16 }]}
        onPress={refreshLocation}
      >
        <Ionicons name="location" size={20} color={colors.success} />
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text style={[globalStyles.caption, { color: colors.success, fontWeight: 'bold' }]} numberOfLines={1}>
            📍 {userAddress?.city || 'Current Location'}
          </Text>
          <Text style={[globalStyles.caption, { color: colors.success, fontSize: 11 }]} numberOfLines={1}>
            {totalNearbySpots} spots available nearby
          </Text>
        </View>
        <Ionicons name="refresh" size={16} color={colors.success} />
      </TouchableOpacity>
    );
  };

  const renderQuickAction = ({ item }) => (
    <TouchableOpacity
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 12,
        marginRight: 8,
        width: (width - 60) / 2, 
        alignItems: 'center',
        marginBottom: 8,
      }}
      onPress={item.onPress}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: item.color,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Ionicons name={item.icon} size={20} color={colors.white} />
      </View>
      <Text style={[globalStyles.caption, { textAlign: 'center', color: colors.textPrimary, fontSize: 12 }]}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  const renderParkingLot = ({ item }) => {
    const distance = userLocation ? getDistanceTo(item.latitude, item.longitude) : null;
    
    return (
      <TouchableOpacity
        style={[globalStyles.card, { marginBottom: 8, padding: 12 }]}
        onPress={() => navigation.navigate('Navigation', { selectedLot: item })}
      >
        <View>
          <Text style={[globalStyles.subheading, { fontSize: 16, marginBottom: 4 }]}>{item.name}</Text>
          <Text style={[globalStyles.caption, { marginBottom: 6, fontSize: 12 }]} numberOfLines={1}>
            {item.address}
          </Text>
          <View style={[globalStyles.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }]}>
            <View style={[globalStyles.statusAvailable, { paddingVertical: 2, paddingHorizontal: 8 }]}>
              <Text style={[globalStyles.statusText, { fontSize: 10 }]}>
                {item.available_spots || 0} Available
              </Text>
            </View>
            <Text style={[globalStyles.caption, { fontSize: 12 }]}>
              RON{item.hourly_rate}/hr
            </Text>
          </View>
          {distance !== null && (
            <View style={[globalStyles.row, { alignItems: 'center' }]}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={[globalStyles.caption, { fontSize: 11, marginLeft: 2, color: colors.info }]}>
                {distance.toFixed(1)} km away
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderReservation = ({ item }) => (
    <TouchableOpacity
      style={[globalStyles.card, { marginBottom: 8, padding: 12 }]}
      onPress={() => navigation.navigate('Reservations')}
    >
      <View>
        <Text style={[globalStyles.subheading, { fontSize: 16, marginBottom: 4 }]}>{item.parking_lot_name}</Text>
        <Text style={[globalStyles.caption, { marginBottom: 2, fontSize: 12 }]}>
          Spot {item.spot_number}
        </Text>
        <Text style={[globalStyles.caption, { fontSize: 11 }]}>
          {ParkingAPI.formatDate(item.start_time)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const quickActions = [
    {
      id: '1',
      title: userLocation ? 'Find Nearby' : 'Find Parking',
      icon: 'search',
      color: colors.primary,
      onPress: () => navigation.navigate('Navigation'),
    },
    {
      id: '2',
      title: 'My Reservations',
      icon: 'bookmark',
      color: colors.secondary,
      onPress: () => navigation.navigate('Reservations'),
    },
    {
      id: '3',
      title: 'Quick Book',
      icon: 'flash',
      color: colors.warning,
      onPress: () => navigation.navigate('Navigation'),
    },
    {
      id: '4',
      title: 'Profile',
      icon: 'person',
      color: colors.info,
      onPress: () => navigation.navigate('Profile'),
    },
  ];

  if (loading) {
    return (
      <View style={globalStyles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[globalStyles.bodyText, { marginTop: 16 }]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  const nearbyParkingLots = getNearbyParkingLots();

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <LinearGradient
          colors={colors.gradientPrimary}
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 24,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
          }}
        >
          <View style={[globalStyles.spaceBetween, { marginBottom: 16 }]}>
            <View>
              <Text style={[globalStyles.caption, { color: colors.white, opacity: 0.8, fontSize: 14 }]}>
                {getGreeting()},
              </Text>
              <Text style={[globalStyles.heading, { color: colors.white, marginBottom: 0, fontSize: 20 }]}>
                {user?.firstName || 'User'}!
              </Text>
            </View>
            <TouchableOpacity
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => navigation.navigate('Profile')}
            >
              {getProfileImageUrl() ? (
                <Image
                  source={{ uri: getProfileImageUrl() }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={18} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>

          <View style={[globalStyles.row, { justifyContent: 'space-around' }]}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[globalStyles.title, { color: colors.white, fontSize: 18, marginBottom: 0 }]}>
                {activeBookingsCount}
              </Text>
              <Text style={[globalStyles.caption, { color: colors.white, opacity: 0.8, fontSize: 12 }]}>
                Active Bookings
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[globalStyles.title, { color: colors.white, fontSize: 18, marginBottom: 0 }]}>
                {nearbyParkingLots.reduce((sum, lot) => sum + (lot.available_spots || 0), 0)}
              </Text>
              <Text style={[globalStyles.caption, { color: colors.white, opacity: 0.8, fontSize: 12 }]}>
                {userLocation ? 'Nearby Spots' : 'Available'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: 20 }}>
          {renderLocationWidget()}
          
          <Text style={[globalStyles.heading, { marginBottom: 12, fontSize: 18 }]}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {quickActions.map((item) => (
              <View key={item.id} style={{ width: '48%', marginBottom: 8 }}>
                {renderQuickAction({ item })}
              </View>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={[globalStyles.spaceBetween, { marginBottom: 12 }]}>
            <Text style={[globalStyles.heading, { fontSize: 18 }]}>
              {userLocation ? 'Nearby Parking' : 'Popular Parking'}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Navigation')}>
              <Text style={[globalStyles.caption, { color: colors.primary, fontSize: 12 }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>
          
          {lotsLoading ? (
            <View style={[globalStyles.center, { height: 80 }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : nearbyParkingLots.length > 0 ? (
            nearbyParkingLots.map((item) => (
              <View key={item.id.toString()}>
                {renderParkingLot({ item })}
              </View>
            ))
          ) : (
            <View style={[globalStyles.center, { height: 80, backgroundColor: colors.card, borderRadius: 12 }]}>
              <Text style={[globalStyles.caption, { fontSize: 12 }]}>
                {userLocation ? 'No parking lots found nearby' : 'No parking lots found'}
              </Text>
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <View style={[globalStyles.spaceBetween, { marginBottom: 12 }]}>
            <Text style={[globalStyles.heading, { fontSize: 18 }]}>Recent Bookings</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Reservations')}>
              <Text style={[globalStyles.caption, { color: colors.primary, fontSize: 12 }]}>
                View All
              </Text>
            </TouchableOpacity>
          </View>
          
          {recentReservations.length > 0 ? (
            recentReservations.map((item) => (
              <View key={item.id.toString()}>
                {renderReservation({ item })}
              </View>
            ))
          ) : (
            <View style={[globalStyles.center, { height: 145, backgroundColor: colors.card, borderRadius: 12, padding: 16 }]}>
              <Ionicons name="bookmark-outline" size={32} color={colors.textMuted} />
              <Text style={[globalStyles.caption, { marginTop: 8, textAlign: 'center', fontSize: 12 }]}>
                No recent bookings{'\n'}Start by finding a parking spot!
              </Text>
              <TouchableOpacity
                style={[globalStyles.buttonSecondary, { marginTop: 10, paddingVertical: 6, paddingHorizontal: 16 }]}
                onPress={() => navigation.navigate('Navigation')}
              >
                <Text style={[globalStyles.buttonTextSecondary, { fontSize: 12 }]}>Find Parking</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;