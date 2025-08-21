import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles } from '../theme/styles';
import { colors } from '../theme/colors';
import ParkingAPI from '../services/api';
import { useRealTimeData } from '../hooks/useRealTimeData';

const { width } = Dimensions.get('window');

const Home = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [recentReservations, setRecentReservations] = useState([]);
  const [activeBookings, setActiveBookings] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const { locations, loading: lotsLoading, refreshData } = useRealTimeData();

  useEffect(() => {
    loadUserData();
    loadReservationsData();
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

  const loadReservationsData = async () => {
    try {
      const reservations = await ParkingAPI.getUserReservations();
      
      setRecentReservations(reservations.slice(0, 3));
      
      const activeBookingsCount = reservations.filter(reservation => {
        return reservation.status === 'active';
      }).length;
      
      console.log('📊 Active bookings calculation:', {
        totalReservations: reservations.length,
        activeBookings: activeBookingsCount,
        reservationStatuses: reservations.map(r => ({
          id: r.id,
          status: r.status,
          isActive: r.status === 'active'
        }))
      });
      
      setActiveBookings(activeBookingsCount);
    } catch (error) {
      console.error('Failed to load reservations:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadUserData(),
      loadReservationsData(),
      refreshData(),
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

  const renderParkingLot = ({ item }) => (
    <TouchableOpacity
      style={[globalStyles.card, { marginBottom: 8, padding: 12 }]}
      onPress={() => navigation.navigate('Navigation', { selectedLot: item })}
    >
      <View>
        <Text style={[globalStyles.subheading, { fontSize: 16, marginBottom: 4 }]}>{item.name}</Text>
        <Text style={[globalStyles.caption, { marginBottom: 6, fontSize: 12 }]} numberOfLines={1}>
          {item.address}
        </Text>
        <View style={[globalStyles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={[globalStyles.statusAvailable, { paddingVertical: 2, paddingHorizontal: 8 }]}>
            <Text style={[globalStyles.statusText, { fontSize: 10 }]}>
              {item.available_spots || 0} Available
            </Text>
          </View>
          <Text style={[globalStyles.caption, { fontSize: 12 }]}>
            RON{item.hourly_rate}/hr
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
      title: 'Find Parking',
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
                {activeBookings}
              </Text>
              <Text style={[globalStyles.caption, { color: colors.white, opacity: 0.8, fontSize: 12 }]}>
                Active Bookings
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[globalStyles.title, { color: colors.white, fontSize: 18, marginBottom: 0 }]}>
                {locations.reduce((sum, lot) => sum + (lot.available_spots || 0), 0)}
              </Text>
              <Text style={[globalStyles.caption, { color: colors.white, opacity: 0.8, fontSize: 12 }]}>
                Available
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: 20 }}>
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
            <Text style={[globalStyles.heading, { fontSize: 18 }]}>Nearby Parking</Text>
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
          ) : locations.length > 0 ? (
            locations.slice(0, 3).map((item) => (
              <View key={item.id.toString()}>
                {renderParkingLot({ item })}
              </View>
            ))
          ) : (
            <View style={[globalStyles.center, { height: 80, backgroundColor: colors.card, borderRadius: 12 }]}>
              <Text style={[globalStyles.caption, { fontSize: 12 }]}>No parking lots found</Text>
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