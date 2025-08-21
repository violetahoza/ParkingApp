import { useState, useEffect, useRef } from 'react';
import ParkingAPI from '../services/api';

export const useRealTimeData = (pollInterval = 30000) => {
  const [data, setData] = useState({
    locations: [],
    stats: { 
      available: 0, 
      occupied: 0, 
      total: 0, 
      reserved: 0,
      occupancyRate: 0,
      totalLocations: 0
    },
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchData = async () => {
    try {
      console.log('🔄 Fetching real-time parking data...');
      
      // Get parking lots near Cluj-Napoca
      const locations = await ParkingAPI.getParkingLots(46.7712, 23.6236, 50);
      
      // Calculate stats from locations
      const stats = {
        totalLocations: locations.length,
        total: locations.reduce((sum, loc) => sum + (loc.total_spots || 0), 0),
        available: locations.reduce((sum, loc) => sum + (loc.available_spots || 0), 0),
        occupied: locations.reduce((sum, loc) => sum + ((loc.total_spots || 0) - (loc.available_spots || 0)), 0),
        reserved: 0, // We can add this later
        occupancyRate: 0
      };
      
      stats.occupancyRate = stats.total > 0 ? (stats.occupied / stats.total) * 100 : 0;

      if (mountedRef.current) {
        setData({
          locations,
          stats,
          loading: false,
          error: null,
          lastUpdated: new Date().toISOString(),
        });
        
        console.log('✅ Real-time data updated:', {
          locationsCount: locations.length,
          totalSpots: stats.total,
          availableSpots: stats.available,
        });
      }
    } catch (error) {
      console.error('❌ Failed to fetch real-time data:', error);
      
      if (mountedRef.current) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      }
    }
  };

  const startPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Initial fetch
    fetchData();
    
    // Start polling
    intervalRef.current = setInterval(fetchData, pollInterval);
    console.log(`🔄 Started polling every ${pollInterval/1000}s`);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('⏹️ Stopped polling');
    }
  };

  const refetch = async () => {
    setData(prev => ({ ...prev, loading: true }));
    await fetchData();
  };

  const refreshData = () => {
    fetchData();
  };

  useEffect(() => {
    mountedRef.current = true;
    startPolling();

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [pollInterval]);

  return { 
    ...data, 
    refetch, 
    refreshData,
    startPolling, 
    stopPolling,
    isPolling: intervalRef.current !== null 
  };
};

export const useParkingSearch = () => {
  const [searchResults, setSearchResults] = useState({
    results: [],
    loading: false,
    error: null,
    searchLocation: null,
    totalFound: 0,
  });

  const searchParking = async (query, userLocation) => {
    if (!query || query.length < 2) {
      setSearchResults(prev => ({ ...prev, results: [], totalFound: 0 }));
      return;
    }

    setSearchResults(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log(`🔍 Searching parking for: ${query}`);
      
      // Get all parking lots
      const allLots = await ParkingAPI.getParkingLots(
        userLocation?.latitude || 46.7712,
        userLocation?.longitude || 23.6236,
        50
      );
      
      // Filter by search query
      const filteredResults = allLots.filter(lot =>
        lot.name.toLowerCase().includes(query.toLowerCase()) ||
        lot.address.toLowerCase().includes(query.toLowerCase())
      );
      
      // Sort by available spots
      const sortedResults = filteredResults.sort((a, b) => 
        (b.available_spots || 0) - (a.available_spots || 0)
      );
      
      setSearchResults({
        results: sortedResults,
        loading: false,
        error: null,
        searchLocation: userLocation,
        totalFound: sortedResults.length,
      });

      console.log(`✅ Found ${sortedResults.length} parking locations`);
      
      return {
        results: sortedResults,
        totalFound: sortedResults.length,
        searchLocation: userLocation
      };
    } catch (error) {
      console.error('❌ Search failed:', error);
      
      setSearchResults(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      
      throw error;
    }
  };

  const clearSearch = () => {
    setSearchResults({
      results: [],
      loading: false,
      error: null,
      searchLocation: null,
      totalFound: 0,
    });
  };

  return {
    ...searchResults,
    searchParking,
    clearSearch,
  };
};

export const useReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userReservations = await ParkingAPI.getUserReservations();
      setReservations(userReservations);
    } catch (err) {
      console.error('Failed to load reservations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createReservation = async (reservationData) => {
    try {
      const response = await ParkingAPI.createReservation(reservationData);
      if (response.success) {
        await loadReservations(); // Refresh the list
      }
      return response;
    } catch (err) {
      console.error('Failed to create reservation:', err);
      throw err;
    }
  };

  const cancelReservation = async (reservationId) => {
    try {
      const response = await ParkingAPI.cancelReservation(reservationId);
      if (response.success) {
        await loadReservations(); // Refresh the list
      }
      return response;
    } catch (err) {
      console.error('Failed to cancel reservation:', err);
      throw err;
    }
  };

  return {
    reservations,
    loading,
    error,
    loadReservations,
    createReservation,
    cancelReservation
  };
};

// Hook for system health monitoring
export const useSystemHealth = () => {
  const [health, setHealth] = useState({
    status: 'unknown',
    isHealthy: false,
    lastCheck: null,
    error: null,
  });

  const checkHealth = async () => {
    try {
      const healthData = await ParkingAPI.checkHealth();
      setHealth({
        status: healthData.success ? 'healthy' : 'unhealthy',
        isHealthy: healthData.success || false,
        lastCheck: new Date().toISOString(),
        error: null,
      });
      
      return healthData;
    } catch (error) {
      setHealth({
        status: 'unhealthy',
        isHealthy: false,
        lastCheck: new Date().toISOString(),
        error: error.message,
      });
      
      throw error;
    }
  };

  useEffect(() => {
    checkHealth();
    
    // Check health every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return { ...health, checkHealth };
};