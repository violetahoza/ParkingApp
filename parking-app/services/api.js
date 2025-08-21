import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class ParkingAPI {
  constructor() {
    if (Platform.OS === 'web') {
      this.baseURL = 'http://localhost:3000/api';
    } else {
      this.baseURL = 'http://192.168.100.20:3000/api';
    }
    this.token = null;
    
    console.log(`🌐 ParkingAPI initialized for ${Platform.OS} with baseURL: ${this.baseURL}`);
  }

  // Initialize token from storage
  async init() {
    try {
      this.token = await AsyncStorage.getItem('authToken');
      console.log('🔑 API initialized with token:', this.token ? 'Present' : 'None');
    } catch (error) {
      console.error('Failed to load auth token:', error);
    }
  }

  // Set authentication token
  async setAuthToken(token) {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem('authToken', token);
      console.log('✅ Auth token saved');
    } else {
      await AsyncStorage.removeItem('authToken');
      console.log('🗑️ Auth token removed');
    }
    
    // Trigger auth status refresh if available
    if (this.refreshAuthStatus) {
      setTimeout(() => this.refreshAuthStatus(), 100);
    }
  }

  // Get authentication headers
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Make API request
  async makeRequest(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config = {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      };

      console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);

      const response = await fetch(url, config);
      const data = await response.json();

      console.log(`📡 API Response (${response.status}):`, data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`❌ API Error (${endpoint}):`, error.message);
      
      // Check if it's an authentication error
      if (error.message.includes('401') || error.message.includes('403')) {
        await this.logout();
        throw new Error('Authentication required');
      }
      
      // Check if it's a network error
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        throw new Error(`Network error - Please check if the backend server is running on ${this.baseURL}`);
      }
      
      throw error;
    }
  }

  // Auth endpoints
  async register(userData) {
    const response = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success && response.token) {
      await this.setAuthToken(response.token);
    }

    return response;
  }

  async login(email, password) {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.token) {
      await this.setAuthToken(response.token);
    }

    return response;
  }

  async logout() {
    await this.setAuthToken(null);
    this.token = null;
    console.log('👋 User logged out');
  }

  // Profile endpoints
  async getCurrentUser() {
    if (!this.token) {
      await this.init();
    }

    if (!this.token) {
      throw new Error('No authentication token');
    }

    const response = await this.makeRequest('/profile');
    return response.user;
  }

  async updateProfile(profileData) {
    const response = await this.makeRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    return response;
  }

  // Parking lots endpoints
  async getParkingLots(latitude, longitude, radius = 10) {
    let endpoint = '/parking-lots';
    
    if (latitude && longitude) {
      endpoint += `?latitude=${latitude}&longitude=${longitude}&radius=${radius}`;
    }

    const response = await this.makeRequest(endpoint);
    return response.parkingLots;
  }

  async getParkingSpots(lotId) {
    const response = await this.makeRequest(`/parking-lots/${lotId}/spots`);
    return response.spots;
  }

  // Reservations endpoints
  async createReservation(reservationData) {
    const response = await this.makeRequest('/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData),
    });
    return response;
  }

  async getUserReservations() {
    const response = await this.makeRequest('/reservations');
    return response.reservations;
  }

  async cancelReservation(reservationId) {
    const response = await this.makeRequest(`/reservations/${reservationId}/cancel`, {
      method: 'PUT',
    });
    return response;
  }

  // Utility endpoints
  async createDemoUser() {
    const response = await this.makeRequest('/create-demo-user', {
      method: 'POST',
    });
    return response;
  }

  async checkHealth() {
    const response = await this.makeRequest('/health');
    return response;
  }

  // Helper methods for app functionality
  async isAuthenticated() {
    if (!this.token) {
      await this.init();
    }
    return !!this.token;
  }

  // Mock methods for features not yet implemented
  async getFavorites() {
    // Mock data for now - implement this when you add favorites feature
    return [];
  }

  // Calculate estimated cost
  calculateCost(hourlyRate, hours) {
    return (hourlyRate * hours).toFixed(2);
  }

  // Get distance between two points (Haversine formula)
  getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // Format time for display
  formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Format date for display
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Check if reservation is active
  isReservationActive(reservation) {
    const now = new Date();
    const startTime = new Date(reservation.start_time);
    const endTime = new Date(reservation.end_time);
    
    return (
      reservation.status === 'active' &&
      now >= startTime &&
      now <= endTime
    );
  }

  // Check if reservation is upcoming
  isReservationUpcoming(reservation) {
    const now = new Date();
    const startTime = new Date(reservation.start_time);
    
    return (
      reservation.status === 'active' &&
      now < startTime
    );
  }
}

// Export singleton instance
const parkingAPI = new ParkingAPI();
export default parkingAPI;