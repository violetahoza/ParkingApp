import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles } from '../theme/styles';
import { colors } from '../theme/colors';
import { useRealTimeData } from '../hooks/useRealTimeData';
import ParkingAPI from '../services/api';

const Navigation = ({ navigation, route }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLot, setSelectedLot] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [parkingSpots, setParkingSpots] = useState([]);
  const [loadingSpots, setLoadingSpots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(2); // Default 2 hours
  const [userLocation] = useState({
    latitude: 46.7712,
    longitude: 23.6236,
    address: 'Cluj-Napoca, Romania'
  });

  const { locations, loading, refreshData } = useRealTimeData();

  const durationOptions = [
  { value: 0.5, label: '30 mins', price: (rate) => rate ? (rate * 0.5) : 0 },
  { value: 1, label: '1 hour', price: (rate) => rate ? (rate * 1) : 0 },
  { value: 2, label: '2 hours', price: (rate) => rate ? (rate * 2) : 0 },
  { value: 3, label: '3 hours', price: (rate) => rate ? (rate * 3) : 0 },
  { value: 4, label: '4 hours', price: (rate) => rate ? (rate * 4) : 0 },
  { value: 6, label: '6 hours', price: (rate) => rate ? (rate * 6) : 0 },
  { value: 8, label: '8 hours', price: (rate) => rate ? (rate * 8) : 0 },
  { value: 16, label: '16 hours', price: (rate) => rate ? (rate * 16) : 0 },
  { value: 24, label: '24 hours', price: (rate) => rate ? (rate * 24) : 0 },
];

  useEffect(() => {
    if (route.params?.selectedLot) {
      setSelectedLot(route.params.selectedLot);
      loadParkingSpots(route.params.selectedLot.id);
    }
  }, [route.params]);

  useEffect(() => {
    global.refreshParkingData = () => {
      console.log('🔄 Global parking data refresh triggered');
      refreshData();
      if (selectedLot) {
        loadParkingSpots(selectedLot.id);
      }
    };

    return () => {
      global.refreshParkingData = null;
    };
  }, [refreshData, selectedLot]);

  const loadParkingSpots = async (lotId) => {
    try {
      setLoadingSpots(true);
      const spots = await ParkingAPI.getParkingSpots(lotId);
      setParkingSpots(spots);
    } catch (error) {
      console.error('Failed to load parking spots:', error);
      Alert.alert('Error', 'Failed to load parking spots');
    } finally {
      setLoadingSpots(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const filteredLocations = locations.filter(
    location =>
      location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectLot = (lot) => {
    setSelectedLot(lot);
    loadParkingSpots(lot.id);
    setSearchQuery('');
  };

  const openMapsNavigation = () => {
    if (!selectedLot) return;

    const { latitude, longitude, name } = selectedLot;
    const label = encodeURIComponent(name);
    
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
    });

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
          return Linking.openURL(webUrl);
        }
      })
      .catch((err) => {
        console.error('Error opening maps:', err);
        Alert.alert('Error', 'Could not open maps application');
      });
  };

  const handleBookSpot = () => {
    if (!selectedLot) return;
    setShowBookingModal(true);
  };

  const confirmBooking = async (spotId) => {
    try {
      setBookingLoading(true);
      
      const now = new Date();
      const endTime = new Date(now.getTime() + selectedDuration * 60 * 60 * 1000);
      
      console.log('🎯 BOOKING: Creating reservation with data:', {
        spotId,
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        duration: selectedDuration,
        totalCost: selectedLot.hourly_rate * selectedDuration,
        selectedLot: selectedLot.name
      });
      
      const reservationData = {
        spotId: parseInt(spotId), 
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        totalCost: selectedLot.hourly_rate ? parseFloat((selectedLot.hourly_rate * selectedDuration).toFixed(2)) : 0,
        duration: selectedDuration,
      };

      console.log('🎯 BOOKING: Sending reservation data:', reservationData);

      const response = await ParkingAPI.createReservation(reservationData);
      
      console.log('🎯 BOOKING: API Response:', response);
      
      if (response.success) {
        setShowBookingModal(false);
        
        setTimeout(() => {
          refreshData();
          loadParkingSpots(selectedLot.id);
        }, 100);
        
        Alert.alert(
          'Booking Confirmed!',
          `Your parking spot has been reserved for ${selectedDuration} ${selectedDuration === 1 ? 'hour' : 'hours'} at ${selectedLot.name}`,
          [
            {
              text: 'View Reservations',
              onPress: () => navigation.navigate('Reservations'),
            },
            {
              text: 'Navigate There',
              onPress: openMapsNavigation,
            },
          ]
        );
      } else {
        console.log('❌ BOOKING: Response success was false');
        throw new Error(response.error || 'Booking failed');
      }
    } catch (error) {
      console.error('❌ BOOKING: Booking failed:', error);
      
      let errorMessage = 'Please try again.';
      
      if (error.message.includes('not available')) {
        errorMessage = 'This parking spot is no longer available. Please select another spot.';
      } else if (error.message.includes('conflicts')) {
        errorMessage = 'Time slot conflicts with existing reservation. Please try a different time.';
      } else if (error.message.includes('Network error')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Booking Failed', errorMessage);
    } finally {
      setBookingLoading(false);
    }
  };

  const renderParkingLot = ({ item }) => {
    const distance = ParkingAPI.getDistance(
      userLocation.latitude,
      userLocation.longitude,
      item.latitude,
      item.longitude
    );

    return (
      <TouchableOpacity
        style={[
          globalStyles.card,
          selectedLot?.id === item.id && { borderColor: colors.primary, borderWidth: 2 }
        ]}
        onPress={() => handleSelectLot(item)}
      >
        <View style={globalStyles.spaceBetween}>
          <View style={{ flex: 1 }}>
            <Text style={globalStyles.subheading}>{item.name}</Text>
            <Text style={[globalStyles.caption, { marginVertical: 8 }]}>
              {item.address}
            </Text>
            
            <View style={[globalStyles.row, { marginBottom: 12 }]}>
              <View style={[
                item.available_spots > 0 ? globalStyles.statusAvailable : globalStyles.statusOccupied,
                { marginRight: 12 }
              ]}>
                <Text style={globalStyles.statusText}>
                  {item.available_spots || 0} Available
                </Text>
              </View>
              <Text style={globalStyles.caption}>
                RON{item.hourly_rate}/hour
              </Text>
            </View>
            
            <View style={globalStyles.row}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={[globalStyles.caption, { marginLeft: 4 }]}>
                {distance.toFixed(1)} km away
              </Text>
            </View>
          </View>
          
          <View style={{ alignItems: 'flex-end' }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: 8,
                padding: 8,
                marginBottom: 8,
              }}
              onPress={openMapsNavigation}
            >
              <Ionicons name="navigate" size={20} color={colors.white} />
            </TouchableOpacity>
            
            {selectedLot?.id === item.id && (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.success,
                  borderRadius: 8,
                  padding: 8,
                }}
                onPress={handleBookSpot}
                disabled={!item.available_spots}
              >
                <Ionicons name="bookmark" size={20} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDurationOption = ({ item }) => {
    const price = selectedLot ? item.price(selectedLot.hourly_rate) : 0;
    const formattedPrice = typeof price === 'number' ? price.toFixed(2) : '0.00';
    
    return (
      <TouchableOpacity
        style={[
          globalStyles.cardSmall,
          {
            backgroundColor: selectedDuration === item.value ? colors.primary : colors.card,
            marginBottom: 8,
            marginHorizontal: 4,
          }
        ]}
        onPress={() => setSelectedDuration(item.value)}
      >
        <View style={{ alignItems: 'center' }}>
          <Text style={[
            globalStyles.subheading,
            {
              color: selectedDuration === item.value ? colors.white : colors.textPrimary,
              fontSize: 16,
              marginBottom: 4,
            }
          ]}>
            {item.label}
          </Text>
          <Text style={[
            globalStyles.caption,
            {
              color: selectedDuration === item.value ? colors.white : colors.textSecondary,
              fontSize: 12,
            }
          ]}>
            RON{formattedPrice}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderParkingSpot = ({ item }) => (
    <TouchableOpacity
      style={[
        globalStyles.cardSmall,
        { 
          backgroundColor: item.is_available ? colors.card : colors.surface,
          opacity: item.is_available ? 1 : 0.6,
        }
      ]}
      onPress={() => item.is_available && confirmBooking(item.id)}
      disabled={!item.is_available || bookingLoading}
    >
      <View style={globalStyles.spaceBetween}>
        <View>
          <Text style={globalStyles.subheading}>Spot {item.spot_number}</Text>
          <Text style={globalStyles.caption}>Type: {item.spot_type}</Text>
        </View>
        <View style={[
          item.is_available ? globalStyles.statusAvailable : globalStyles.statusOccupied
        ]}>
          <Text style={globalStyles.statusText}>
            {item.is_available ? 'Available' : 'Occupied'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.header}>
        <View style={globalStyles.spaceBetween}>
          <Text style={globalStyles.headerTitle}>Find Parking</Text>
          <TouchableOpacity onPress={refreshData}>
            <Ionicons name="refresh" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={globalStyles.paddingHorizontal}>
        <View style={{ position: 'relative', marginBottom: 16 }}>
          <TextInput
            style={[globalStyles.input, { paddingLeft: 50 }]}
            placeholder="Search parking lots..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <Ionicons
            name="search"
            size={20}
            color={colors.textMuted}
            style={{
              position: 'absolute',
              left: 16,
              top: 18,
            }}
          />
        </View>

        <View style={[globalStyles.row, { marginBottom: 16 }]}>
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text style={[globalStyles.caption, { marginLeft: 8, flex: 1 }]}>
            Current: {userLocation.address}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={globalStyles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[globalStyles.bodyText, { marginTop: 16 }]}>
            Loading parking lots...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredLocations}
          renderItem={renderParkingLot}
          keyExtractor={(item) => item.id.toString()}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={globalStyles.centerContainer}>
              <Ionicons name="car-outline" size={64} color={colors.textMuted} />
              <Text style={[globalStyles.bodyText, { marginTop: 16, textAlign: 'center' }]}>
                No parking lots found{'\n'}Try adjusting your search
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showBookingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 40,
            maxHeight: '90%',
          }}>
            <View style={[globalStyles.spaceBetween, { marginBottom: 20 }]}>
              <Text style={globalStyles.heading}>Select Duration & Spot</Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedLot && (
              <View style={[globalStyles.card, { marginBottom: 16 }]}>
                <Text style={globalStyles.subheading}>{selectedLot.name}</Text>
                <Text style={globalStyles.caption}>{selectedLot.address}</Text>
                <Text style={[globalStyles.bodyText, { marginTop: 8 }]}>
                  Rate: RON{selectedLot.hourly_rate}/hour
                </Text>
              </View>
            )}

            <ScrollView style={{ maxHeight: '60%' }} showsVerticalScrollIndicator={false}>
              <Text style={[globalStyles.subheading, { marginBottom: 12 }]}>
                Choose Duration:
              </Text>
              
              <View style={{ 
                flexDirection: 'row', 
                flexWrap: 'wrap', 
                justifyContent: 'space-between',
                marginBottom: 20 
              }}>
                {durationOptions.map((option) => (
                  <View key={option.value} style={{ width: '33%', marginBottom: 2 }}>
                    {renderDurationOption({ item: option })}
                  </View>
                ))}
              </View>

              {selectedDuration && selectedLot && (
                <View style={[
                  globalStyles.card, 
                  { 
                    backgroundColor: colors.primary + '20', 
                    borderColor: colors.primary, 
                    borderWidth: 1,
                    marginBottom: 16 
                  }
                ]}>
                  <Text style={[globalStyles.subheading, { marginBottom: 8 }]}>
                    Booking Summary
                  </Text>
                  <Text style={globalStyles.bodyText}>
                    Duration: {selectedDuration} {selectedDuration === 1 ? 'hour' : 'hours'}
                  </Text>
                  <Text style={[globalStyles.bodyText, { color: colors.primary, fontWeight: 'bold' }]}>
                    Total Cost: RON{selectedLot.hourly_rate ? (selectedLot.hourly_rate * selectedDuration).toFixed(2) : '0.00'}
                  </Text>
                </View>
              )}

              <Text style={[globalStyles.subheading, { marginBottom: 12 }]}>
                Available Spots:
              </Text>

              {loadingSpots ? (
                <View style={[globalStyles.center, { height: 100 }]}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[globalStyles.caption, { marginTop: 12 }]}>
                    Loading available spots...
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={parkingSpots.filter(spot => spot.is_available)}
                  renderItem={renderParkingSpot}
                  keyExtractor={(item) => item.id.toString()}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                  ListEmptyComponent={
                    <View style={[globalStyles.center, { height: 100 }]}>
                      <Text style={globalStyles.bodyText}>No available spots</Text>
                    </View>
                  }
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Navigation;