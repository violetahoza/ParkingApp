import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, Alert, ActivityIndicator, Modal, Linking, Platform, ScrollView, } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles } from '../theme/styles';
import { colors } from '../theme/colors';
import { useReservations } from '../hooks/useRealTimeData';
import ParkingAPI from '../services/api';
import PaymentService from '../services/paymentService';

const Reservations = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState('active');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [extendLoading, setExtendLoading] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState(1);

  const {
    reservations,
    loading,
    error,
    loadReservations,
    cancelReservation,
    extendReservation,
  } = useReservations();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const getHourlyRate = (reservation) => {
    if (reservation.hourly_rate) {
      return parseFloat(reservation.hourly_rate);
    }
    
    const startTime = new Date(reservation.start_time);
    const endTime = new Date(reservation.end_time);
    const durationHours = (endTime - startTime) / (1000 * 60 * 60);
    const hourlyRate = parseFloat(reservation.total_cost) / durationHours;
    
    console.log('📊 Calculated hourly rate:', {
      totalCost: reservation.total_cost,
      durationHours,
      calculatedRate: hourlyRate
    });
    
    return hourlyRate;
  };

  const isPaymentCompleted = (reservation) => {
    return reservation.payment_status === 'paid' || reservation.payment_status === 'completed';
  };

  const extensionOptions = [
    { hours: 1, label: '1 hour' },
    { hours: 2, label: '2 hours' },
    { hours: 3, label: '3 hours' },
    { hours: 4, label: '4 hours' },
    { hours: 5, label: '5 hours' },
    { hours: 6, label: '6 hours' },
  ];

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadReservations();
    setIsRefreshing(false);
  };

  const getFilteredReservations = () => {
    return reservations.filter(reservation => {
      const status = getReservationStatus(reservation);
      switch (selectedTab) {
        case 'active':
          return status === 'active' || status === 'upcoming';
        case 'completed':
          return status === 'completed' || status === 'expired';
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

  const handleExtendReservation = async () => {
    try {
      setExtendLoading(true);
      
      const response = await extendReservation(selectedReservation.id, selectedExtension);
      
      if (response.success) {
        setShowExtendModal(false);
        setShowDetailModal(false);
        Alert.alert(
          'Reservation Extended! 🎉',
          `Your reservation has been extended by ${selectedExtension} ${selectedExtension === 1 ? 'hour' : 'hours'}.`,
          [
            {
              text: 'OK',
              onPress: () => loadReservations(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Extend reservation error:', error);
      Alert.alert('Error', error.message || 'Failed to extend reservation');
    } finally {
      setExtendLoading(false);
    }
  };

  const handlePayment = async (paymentMethod) => {
    try {
      console.log('💳 Starting payment process:', { paymentMethod, reservation: selectedReservation.id });
      
      setShowPaymentModal(false);
      
      Alert.alert('Processing Payment', 'Please wait while we process your payment...');
      
      const paymentResult = await PaymentService.processPayment(
        paymentMethod, 
        parseFloat(selectedReservation.total_cost),
        { 
          reservationId: selectedReservation.id,
          parkingLot: selectedReservation.parking_lot_name,
          spot: selectedReservation.spot_number
        }
      );
      
      if (paymentResult.success) {
        await loadReservations();
        
        Alert.alert(
          'Payment Successful! 💳',
          `Your payment of RON${selectedReservation.total_cost} has been processed successfully via ${paymentMethod}.`,
          [
            {
              text: 'OK',
              onPress: () => setShowDetailModal(false),
            },
          ]
        );
      } else {
        throw new Error('Payment processing failed');
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      
      let errorMessage = 'Payment failed. Please try again.';
      
      if (error.message.includes('cancelled')) {
        errorMessage = 'Payment was cancelled.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      Alert.alert('Payment Failed', errorMessage);
      setShowPaymentModal(true); 
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

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('ro-RO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return dateString;
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ro-RO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
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
    const canCancel = (status === 'upcoming' || status === 'active') && item.status === 'active';
    const canExtend = status === 'active' && item.status === 'active';

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
              Spot {item.spot_number}
            </Text>
            
            <View style={[globalStyles.row, { marginBottom: 8 }]}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={[globalStyles.caption, { marginLeft: 4 }]}>
                {formatDate(item.start_time)} la {formatTime(item.start_time)}
              </Text>
            </View>
            
            <View style={globalStyles.row}>
              <Ionicons name="card-outline" size={16} color={colors.textMuted} />
              <Text style={[globalStyles.caption, { marginLeft: 4 }]}>
                RON{item.total_cost}
              </Text>
            </View>
          </View>
          
          <View style={{ alignItems: 'flex-end' }}>
            <View style={getStatusStyle(status)}>
              <Text style={globalStyles.statusText}>
                {status === 'upcoming' ? 'Upcoming' :
                 status === 'active' ? 'Active' :
                 status === 'expired' ? 'Expired' :
                 status === 'cancelled' ? 'Cancelled' :
                 status === 'completed' ? 'Completed' : status}
              </Text>
            </View>
            
            {canExtend && (
              <TouchableOpacity
                style={{
                  marginTop: 8,
                  backgroundColor: colors.warning,
                  borderRadius: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                }}
                onPress={() => {
                  setSelectedReservation(item);
                  setShowExtendModal(true);
                }}
              >
                <Text style={[globalStyles.statusText, { fontSize: 10 }]}>
                  Extend
                </Text>
              </TouchableOpacity>
            )}
            
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

  const renderExtensionOption = (option) => (
    <TouchableOpacity
      key={option.hours}
      style={[
        globalStyles.cardSmall,
        {
          backgroundColor: selectedExtension === option.hours ? colors.primary : colors.card,
          marginBottom: 8,
          marginHorizontal: 8,
          flex: 1,
        }
      ]}
      onPress={() => setSelectedExtension(option.hours)}
    >
      <View style={{ alignItems: 'center' }}>
        <Text style={[
          globalStyles.subheading,
          {
            color: selectedExtension === option.hours ? colors.white : colors.textPrimary,
            fontSize: 16,
            marginBottom: 4,
          }
        ]}>
          {option.label}
        </Text>
        {selectedReservation && (
          <Text style={[
            globalStyles.caption,
            {
              color: selectedExtension === option.hours ? colors.white : colors.textSecondary,
              fontSize: 12,
            }
          ]}>
            +RON{(getHourlyRate(selectedReservation) * option.hours).toFixed(2)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPaymentOption = (method, icon, color) => (
    <TouchableOpacity
      key={method}
      style={[
        globalStyles.card,
        {
          marginBottom: 12,
          borderColor: color,
          borderWidth: 1,
        }
      ]}
      onPress={() => handlePayment(method)}
    >
      <View style={[globalStyles.row, { alignItems: 'center' }]}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: color,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 16,
        }}>
          <Ionicons name={icon} size={20} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={globalStyles.subheading}>{method}</Text>
          <Text style={globalStyles.caption}>Fast and secure payment</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );

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
                    Spot {selectedReservation.spot_number}
                  </Text>
                  
                  <View style={[globalStyles.row, { marginBottom: 12 }]}>
                    <View style={getStatusStyle(getReservationStatus(selectedReservation))}>
                      <Text style={globalStyles.statusText}>
                        {(() => {
                          const status = getReservationStatus(selectedReservation);
                          return status === 'upcoming' ? 'Upcoming' :
                                 status === 'active' ? 'Active' :
                                 status === 'expired' ? 'Expired' :
                                 status === 'cancelled' ? 'Cancelled' :
                                 status === 'completed' ? 'Completed' : status;
                        })()}
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <View style={[globalStyles.row, { marginBottom: 8 }]}>
                      <Ionicons name="time-outline" size={20} color={colors.textMuted} />
                      <Text style={[globalStyles.bodyText, { marginLeft: 8 }]}>
                        {formatDate(selectedReservation.start_time)} la {formatTime(selectedReservation.start_time)}
                      </Text>
                    </View>
                    
                    <View style={[globalStyles.row, { marginBottom: 8 }]}>
                      <Ionicons name="timer-outline" size={20} color={colors.textMuted} />
                      <Text style={[globalStyles.bodyText, { marginLeft: 8 }]}>
                        Până la {formatTime(selectedReservation.end_time)}
                      </Text>
                    </View>
                    
                    <View style={globalStyles.row}>
                      <Ionicons name="card-outline" size={20} color={colors.textMuted} />
                      <Text style={[globalStyles.bodyText, { marginLeft: 8 }]}>
                        Total: RON{selectedReservation.total_cost}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[globalStyles.row, { marginTop: 20 }]}>
                  <TouchableOpacity
                    style={[globalStyles.buttonSecondary, { flex: 1, marginRight: 8 }]}
                    onPress={() => {
                      setShowDetailModal(false);
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

                  {(() => {
                    const status = getReservationStatus(selectedReservation);
                    const canExtend = status === 'active' && selectedReservation.status === 'active';
                    const canCancel = (status === 'upcoming' || status === 'active') && selectedReservation.status === 'active';
                    
                    if (canExtend) {
                      return (
                        <>
                          <TouchableOpacity
                            style={[
                              globalStyles.button,
                              { 
                                flex: 1, 
                                marginLeft: 4,
                                marginRight: 4,
                                backgroundColor: colors.warning,
                              }
                            ]}
                            onPress={() => {
                              setShowDetailModal(false);
                              setShowExtendModal(true);
                            }}
                          >
                            <Text style={globalStyles.buttonText}>Extend</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={[
                              globalStyles.button,
                              { 
                                flex: 1, 
                                marginLeft: 4,
                                backgroundColor: isPaymentCompleted(selectedReservation) ? colors.textMuted : colors.info,
                                opacity: isPaymentCompleted(selectedReservation) ? 0.6 : 1,
                              }
                            ]}
                            onPress={() => {
                              if (!isPaymentCompleted(selectedReservation)) {
                                setShowDetailModal(false);
                                setShowPaymentModal(true);
                              }
                            }}
                            disabled={isPaymentCompleted(selectedReservation)}
                          >
                            <View style={globalStyles.row}>
                              <Ionicons 
                                name={isPaymentCompleted(selectedReservation) ? "checkmark-circle" : "card"} 
                                size={16} 
                                color={colors.white} 
                              />
                              <Text style={[globalStyles.buttonText, { marginLeft: 4 }]}>
                                {isPaymentCompleted(selectedReservation) ? 'Paid' : 'Pay'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </>
                      );
                    }
                    
                    return canCancel && (
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
                    );
                  })()}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showExtendModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExtendModal(false)}
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
            paddingTop: 35,
            paddingBottom: 40,
          }}>
            <View style={[globalStyles.spaceBetween, { marginBottom: 1 }]}>
              <Text style={globalStyles.heading}>Extend Reservation</Text>
              <TouchableOpacity onPress={() => setShowExtendModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedReservation && (
              <View style={[globalStyles.card, { marginBottom: 16 }]}>
                <Text style={globalStyles.subheading}>{selectedReservation.parking_lot_name}</Text>
                <Text style={globalStyles.caption}>Spot {selectedReservation.spot_number}</Text>
                <Text style={[globalStyles.bodyText, { marginTop: 8 }]}>
                  Current end time: {formatTime(selectedReservation.end_time)}
                </Text>
              </View>
            )}

            <Text style={[globalStyles.subheading, { marginBottom: 12 }]}>
              Select extension duration:
            </Text>
            
            <ScrollView 
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ 
                flexDirection: 'row', 
                flexWrap: 'wrap', 
                justifyContent: 'space-between',
                marginBottom: 20 
              }}>
                {extensionOptions.map((option) => (
                  <View key={option.hours} style={{ width: '48%', marginBottom: 8 }}>
                    {renderExtensionOption(option)}
                  </View>
                ))}
              </View>
            </ScrollView>

            {selectedExtension && selectedReservation && (
              <View style={[
                globalStyles.card, 
                { 
                  backgroundColor: colors.warning + '20', 
                  borderColor: colors.warning, 
                  borderWidth: 1,
                  marginBottom: 16 
                }
              ]}>
                <Text style={[globalStyles.subheading, { marginBottom: 8 }]}>
                  Extension Summary
                </Text>
                <Text style={globalStyles.bodyText}>
                  Duration: {selectedExtension} {selectedExtension === 1 ? 'hour' : 'hours'}
                </Text>
                <Text style={[globalStyles.bodyText, { color: colors.warning, fontWeight: 'bold' }]}>
                  Additional Cost: RON{selectedReservation ? (getHourlyRate(selectedReservation) * selectedExtension).toFixed(2) : '0.00'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                globalStyles.button,
                { 
                  backgroundColor: colors.warning,
                  opacity: extendLoading ? 0.6 : 1,
                }
              ]}
              onPress={handleExtendReservation}
              disabled={extendLoading}
            >
              {extendLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={globalStyles.buttonText}>
                  Extend Reservation
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
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
            <View style={[globalStyles.spaceBetween, { marginBottom: 20 }]}>
              <Text style={globalStyles.heading}>Choose Payment Method</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedReservation && (
              <View style={[globalStyles.card, { marginBottom: 16 }]}>
                <Text style={globalStyles.subheading}>Payment for:</Text>
                <Text style={globalStyles.bodyText}>{selectedReservation.parking_lot_name}</Text>
                <Text style={[globalStyles.bodyText, { color: colors.primary, fontWeight: 'bold', marginTop: 8 }]}>
                  Amount: RON{selectedReservation.total_cost}
                </Text>
              </View>
            )}

            <Text style={[globalStyles.subheading, { marginBottom: 12 }]}>
              Select payment method:
            </Text>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {renderPaymentOption('Google Pay', 'logo-google', '#4285F4')}
              {renderPaymentOption('Apple Pay', 'logo-apple', '#000000')}
              {renderPaymentOption('PayPal', 'card', '#0070BA')}
              {renderPaymentOption('Credit Card', 'card-outline', colors.primary)}
              {renderPaymentOption('Bank Transfer', 'business-outline', colors.info)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Reservations;