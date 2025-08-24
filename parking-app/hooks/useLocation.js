import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export const useLocation = (options = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 10000,
    distanceInterval = 10, // meters
    timeInterval = 5000, // milliseconds
    enableBackground = false,
  } = options;

  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const watcherRef = useRef(null);
  const mountedRef = useRef(true);

  const requestPermissions = async () => {
    try {
      console.log('📍 Requesting location permissions...');
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Location permission denied');
        setPermissionStatus('denied');
        setLoading(false);
        return false;
      }

      console.log('✅ Foreground location permission granted');

      if (enableBackground) {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.log('⚠️ Background location permission denied, continuing with foreground only');
        } else {
          console.log('✅ Background location permission granted');
        }
      }

      setPermissionStatus('granted');
      return true;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      setError('Failed to request permissions');
      setPermissionStatus('denied');
      setLoading(false);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📍 Getting current location...');

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: enableHighAccuracy ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced,
        timeout,
        maximumAge,
      });

      console.log('✅ Current location obtained:', {
        lat: currentLocation.coords.latitude.toFixed(6),
        lng: currentLocation.coords.longitude.toFixed(6),
        accuracy: currentLocation.coords.accuracy
      });

      if (mountedRef.current) {
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy,
          timestamp: currentLocation.timestamp,
        });

        await reverseGeocode(currentLocation.coords.latitude, currentLocation.coords.longitude);
      }

      return currentLocation;
    } catch (error) {
      console.error('❌ Failed to get current location:', error);
      
      let errorMessage = 'Failed to get location';
      
      if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage = 'Location services are unavailable';
      } else if (error.code === 'E_LOCATION_TIMEOUT') {
        errorMessage = 'Location request timed out';
      } else if (error.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
        errorMessage = 'Location settings need to be enabled';
      }

      if (mountedRef.current) {
        setError(errorMessage);
      }
      
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const startTracking = async () => {
    try {
      console.log('🎯 Starting location tracking...');
      
      if (watcherRef.current) {
        await Location.removeLocationUpdatesAsync(watcherRef.current);
      }

      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: enableHighAccuracy ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced,
          timeInterval,
          distanceInterval,
        },
        (newLocation) => {
          console.log('📍 Location update:', {
            lat: newLocation.coords.latitude.toFixed(6),
            lng: newLocation.coords.longitude.toFixed(6),
            accuracy: newLocation.coords.accuracy
          });

          if (mountedRef.current) {
            setLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              accuracy: newLocation.coords.accuracy,
              timestamp: newLocation.timestamp,
            });

            // Update address occasionally (not every update to avoid too many API calls)
            if (Math.random() < 0.3) { // 30% chance to update address
              reverseGeocode(newLocation.coords.latitude, newLocation.coords.longitude);
            }
          }
        }
      );

      setIsTracking(true);
      console.log('✅ Location tracking started');
    } catch (error) {
      console.error('❌ Failed to start location tracking:', error);
      setError('Failed to start location tracking');
      throw error;
    }
  };

  const stopTracking = async () => {
    try {
      if (watcherRef.current) {
        await Location.removeLocationUpdatesAsync(watcherRef.current);
        watcherRef.current = null;
        setIsTracking(false);
        console.log('⏹️ Location tracking stopped');
      }
    } catch (error) {
      console.error('❌ Failed to stop location tracking:', error);
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      console.log('🏠 Getting address for coordinates...');
      
      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (geocode && geocode.length > 0) {
        const result = geocode[0];
        const formattedAddress = [
          result.street,
          result.streetNumber,
          result.city,
          result.region,
          result.country
        ].filter(Boolean).join(', ');

        console.log('✅ Address obtained:', formattedAddress);

        if (mountedRef.current) {
          setAddress({
            formatted: formattedAddress,
            street: result.street,
            streetNumber: result.streetNumber,
            city: result.city,
            region: result.region,
            postalCode: result.postalCode,
            country: result.country,
          });
        }
      }
    } catch (error) {
      console.error('❌ Reverse geocoding failed:', error);
      // Don't set error state for geocoding failures as location still works
    }
  };

  const checkLocationServices = async () => {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to use this feature.',
          [
            { text: 'OK' },
            { 
              text: 'Open Settings', 
              onPress: () => Location.enableNetworkProviderAsync() 
            }
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to check location services:', error);
      return false;
    }
  };

  const initializeLocation = async () => {
    try {
      const servicesEnabled = await checkLocationServices();
      if (!servicesEnabled) return;

      const permissionGranted = await requestPermissions();
      if (!permissionGranted) return;

      // Get initial location
      await getCurrentLocation();
    } catch (error) {
      console.error('❌ Location initialization failed:', error);
    }
  };

  const refreshLocation = async () => {
    try {
      await getCurrentLocation();
    } catch (error) {
      console.error('❌ Failed to refresh location:', error);
    }
  };

  // Get distance between two points
  const getDistanceTo = (targetLat, targetLng) => {
    if (!location) return null;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (targetLat - location.latitude) * Math.PI / 180;
    const dLng = (targetLng - location.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(location.latitude * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  };

  // Check if location is recent (within last 5 minutes)
  const isLocationRecent = () => {
    if (!location || !location.timestamp) return false;
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return location.timestamp > fiveMinutesAgo;
  };

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopTracking();
    };
  }, []);

  return {
    // State
    location,
    address,
    loading,
    error,
    permissionStatus,
    isTracking,
    
    // Actions
    initializeLocation,
    getCurrentLocation,
    startTracking,
    stopTracking,
    refreshLocation,
    requestPermissions,
    checkLocationServices,
    
    // Utilities
    getDistanceTo,
    isLocationRecent,
    
    // Computed values
    hasLocation: !!location,
    isLocationAvailable: !!location && permissionStatus === 'granted',
    formattedAddress: address?.formatted || (location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Unknown location'),
  };
};