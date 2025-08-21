import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles } from '../theme/styles';
import { colors } from '../theme/colors';
import { useReservations } from '../hooks/useRealTimeData';
import ParkingAPI from '../services/api';

const Reservations = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState('active'); // active, completed, cancelled
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const {
    reservations,
    loading,
    error,
    loadReservations,
    cancelReservation,
  } = useReservations();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadReservations();
    setIsRefreshing(false);
  };

  const getFilteredReservations = () => {
    return reservations.filter(reservation => {
      switch (selectedTab) {
        case 'active':
          return reservation.status === 'active';
        case 'completed':
          return reservation.status === 'completed';
        case 'cancelled':
          return reservation.status === 'cancelled';
        default:
          return true;
      }
    });
  };

  const handleCancelReservation = async (reservationId) => {
    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to cancel this reservation?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelLoading(true);
              await cancelReservation(reservationId);
              setShowDetailModal(false);
              Alert.alert('Success', 'Reservation cancelled successfully');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to cancel reservation');
            } finally {
              setCancelLoading(false);
            }
          },
        },
      ]
    );
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

  const getStatusStyle = (status) => {
    switch (status) {
      case 'active':
        return globalStyles.statusAvailable;
      case 'upcoming':
        return globalStyles.statusReserved;
      case 'completed':
        return { backgroundColor: colors.info, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 12 };
      case 'cancelled':
        return globalStyles.statusOccupied;
      case 'expired':
        return { backgroundColor: colors.textMuted, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 12 };
      default:
        return globalStyles.statusReserved;
    }
  };

  const renderTabButton = (tab, title) => (
    <TouchableOpacity
      style={{
        flex: 1,
        paddingVertical: 12,
        backgroundColor: selectedTab === tab ? colors.primary : colors.surface,
        borderRadius: 8,
        marginHorizontal: 4,
      }}
      onPress={() => setSelectedTab(tab)}
    >
      <Text style={[
        globalStyles.buttonText,
        {
          color: selectedTab === tab ? colors.white : colors.textSecondary,
          fontSize: 14,
          textAlign: 'center',
        }
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderReservation = ({ item }) => {
    const status = getReservationStatus(item);
    const canCancel = status === 'upcoming' || status === 'active';

    return (
      <TouchableOpacity
        style={globalStyles.card}
        onPress={() => {
          setSelectedReservation(item);
          setShowDetailModal(true);
        }}
      >
        <View style={globalStyles.spaceBetween}>
          <View style={{ flex: 1 }}>
            <Text style={globalStyles.subheading}>{item.parking_lot_name}</Text>
            <Text style={[globalStyles.caption, { marginVertical: 4 }]}>
              {item.address}
            </Text>
            <Text style={[globalStyles.caption, { marginBottom: 8 }]}>
              Spot {item.spot_number}
            </Text>
            
            <View style={[globalStyles.row, { marginBottom: 8 }]}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={[globalStyles.caption, { marginLeft: 4 }]}>
                {ParkingAPI.formatDate(item.start_time)} at {ParkingAPI.formatTime(item.start_time)}
              </Text>
            </View>
            
            <View style={globalStyles.row}>
              <Ionicons name="card-outline" size={16} color={colors.textMuted} />
              <Text style={[globalStyles.caption, { marginLeft: 4 }]}>
                ${item.total_cost}
              </Text>
            </View>
          </View>
          
          <View style={{ alignItems: 'flex-end' }}>
            <View style={getStatusStyle(status)}>
              <Text style={globalStyles.statusText}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
            
            {canCancel && (
              <TouchableOpacity
                style={{
                  marginTop: 8,
                  backgroundColor: colors.error,
                  borderRadius: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                }}
                onPress={() => handleCancelReservation(item.id)}
              >
                <Text style={[globalStyles.statusText, { fontSize: 10 }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    let message = '';
    let icon = '';
    
    switch (selectedTab) {
      case 'active':
        message = 'No active reservations\nFind parking to get started!';
        icon = 'bookmark-outline';
        break;
      case 'completed':
        message = 'No completed reservations yet';
        icon = 'checkmark-circle-outline';
        break;
      case 'cancelled':
        message = 'No cancelled reservations';
        icon = 'close-circle-outline';
        break;
    }

    return (
      <View style={[globalStyles.centerContainer, { paddingTop: 100 }]}>
        <Ionicons name={icon} size={64} color={colors.textMuted} />
        <Text style={[globalStyles.bodyText, { marginTop: 16, textAlign: 'center' }]}>
          {message}
        </Text>
        {selectedTab === 'active' && (
          <TouchableOpacity
            style={[globalStyles.button, { marginTop: 24, paddingVertical: 12 }]}
            onPress={() => navigation.navigate('Navigation')}
          >
            <Text style={globalStyles.buttonText}>Find Parking</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading && !isRefreshing) {
    return (
      <View style={globalStyles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[globalStyles.bodyText, { marginTop: 16 }]}>
          Loading reservations...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={[globalStyles.header, { marginBottom: 4 }]}>
        <Text style={globalStyles.headerTitle}>My Reservations</Text>
      </View>

      <View style={[globalStyles.paddingHorizontal, { marginBottom: 24, marginTop: 16 }]}>
        <View style={[globalStyles.row, { backgroundColor: colors.surface, borderRadius: 12, padding: 4 }]}>
          {renderTabButton('active', 'Active')}
          {renderTabButton('completed', 'Completed')}
          {renderTabButton('cancelled', 'Cancelled')}
        </View>
      </View>

      <FlatList
        data={getFilteredReservations()}
        renderItem={renderReservation}
        keyExtractor={(item) => item.id.toString()}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
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
          }}>
            {selectedReservation && (
              <>
                <View style={[globalStyles.spaceBetween, { marginBottom: 20 }]}>
                  <Text style={globalStyles.heading}>Reservation Details</Text>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <View style={globalStyles.card}>
                  <Text style={globalStyles.subheading}>{selectedReservation.parking_lot_name}</Text>
                  <Text style={[globalStyles.caption, { marginVertical: 8 }]}>
                    {selectedReservation.address}
                  </Text>
                  
                  <View style={[globalStyles.row, { marginBottom: 12 }]}>
                    <View style={getStatusStyle(getReservationStatus(selectedReservation))}>
                      <Text style={globalStyles.statusText}>
                        {getReservationStatus(selectedReservation).charAt(0).toUpperCase() + 
                         getReservationStatus(selectedReservation).slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <View style={[globalStyles.row, { marginBottom: 8 }]}>
                      <Ionicons name="location-outline" size={20} color={colors.textMuted} />
                      <Text style={[globalStyles.bodyText, { marginLeft: 8 }]}>
                        Spot {selectedReservation.spot_number}
                      </Text>
                    </View>
                    
                    <View style={[globalStyles.row, { marginBottom: 8 }]}>
                      <Ionicons name="time-outline" size={20} color={colors.textMuted} />
                      <Text style={[globalStyles.bodyText, { marginLeft: 8 }]}>
                        {ParkingAPI.formatDate(selectedReservation.start_time)} at {ParkingAPI.formatTime(selectedReservation.start_time)}
                      </Text>
                    </View>
                    
                    <View style={[globalStyles.row, { marginBottom: 8 }]}>
                      <Ionicons name="timer-outline" size={20} color={colors.textMuted} />
                      <Text style={[globalStyles.bodyText, { marginLeft: 8 }]}>
                        Until {ParkingAPI.formatTime(selectedReservation.end_time)}
                      </Text>
                    </View>
                    
                    <View style={globalStyles.row}>
                      <Ionicons name="card-outline" size={20} color={colors.textMuted} />
                      <Text style={[globalStyles.bodyText, { marginLeft: 8 }]}>
                        Total: ${selectedReservation.total_cost}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={[globalStyles.row, { marginTop: 20 }]}>
                  <TouchableOpacity
                    style={[globalStyles.buttonSecondary, { flex: 1, marginRight: 8 }]}
                    onPress={() => {
                      setShowDetailModal(false);
                      // Navigate to maps
                      const { latitude, longitude } = selectedReservation;
                      const url = Platform.select({
                        ios: `maps:0,0?q=${selectedReservation.parking_lot_name}@${latitude},${longitude}`,
                        android: `geo:0,0?q=${latitude},${longitude}(${selectedReservation.parking_lot_name})`,
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
                        .catch((err) => console.error('Error opening maps:', err));
                    }}
                  >
                    <View style={globalStyles.row}>
                      <Ionicons name="navigate" size={16} color={colors.primary} />
                      <Text style={[globalStyles.buttonTextSecondary, { marginLeft: 4 }]}>
                        Navigate
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {(getReservationStatus(selectedReservation) === 'upcoming' || 
                    getReservationStatus(selectedReservation) === 'active') && (
                    <TouchableOpacity
                      style={[
                        globalStyles.button,
                        { 
                          flex: 1, 
                          marginLeft: 8, 
                          backgroundColor: colors.error,
                          opacity: cancelLoading ? 0.6 : 1 
                        }
                      ]}
                      onPress={() => handleCancelReservation(selectedReservation.id)}
                      disabled={cancelLoading}
                    >
                      {cancelLoading ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text style={globalStyles.buttonText}>Cancel</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Reservations;