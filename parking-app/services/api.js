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

  async init() {
    try {
      this.token = await AsyncStorage.getItem('authToken');
      console.log('🔑 API initialized with token:', this.token ? 'Present' : 'None');
    } catch (error) {
      console.error('Failed to load auth token:', error);
    }
  }

  async setAuthToken(token) {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem('authToken', token);
      console.log('✅ Auth token saved');
    } else {
      await AsyncStorage.removeItem('authToken');
      console.log('🗑️ Auth token removed');
    }
    
    if (this.refreshAuthStatus) {
      setTimeout(() => this.refreshAuthStatus(), 100);
    }
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

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
      
      if (error.message.includes('401') || error.message.includes('403')) {
        await this.logout();
        throw new Error('Authentication required');
      }
      
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

  async changePassword(passwordData) {
    const response = await this.makeRequest('/profile/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
    return response;
  }

  async uploadProfilePhoto(formData) {
    const url = `${this.baseURL}/profile/upload-photo`;
    const config = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    };

    console.log(`🌐 API Request: POST ${url}`);

    const response = await fetch(url, config);
    const data = await response.json();

    console.log(`📡 API Response (${response.status}):`, data);

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  async removeProfilePhoto() {
    const response = await this.makeRequest('/profile/remove-photo', {
      method: 'DELETE',
    });
    return response;
  }

  // Delete Account
  async deleteAccount(password) {
    const response = await this.makeRequest('/profile/delete-account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
    
    // If account deletion is successful, clear the token
    if (response.success) {
      await this.logout();
    }
    
    return response;
  }

  // Vehicle Management endpoints
  async getUserVehicles() {
    const response = await this.makeRequest('/vehicles');
    return response.vehicles;
  }

  async addVehicle(vehicleData) {
    const response = await this.makeRequest('/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicleData),
    });
    return response;
  }

  async updateVehicle(vehicleId, vehicleData) {
    const response = await this.makeRequest(`/vehicles/${vehicleId}`, {
      method: 'PUT',
      body: JSON.stringify(vehicleData),
    });
    return response;
  }

  async deleteVehicle(vehicleId) {
    const response = await this.makeRequest(`/vehicles/${vehicleId}`, {
      method: 'DELETE',
    });
    return response;
  }

  async setPrimaryVehicle(vehicleId) {
    const response = await this.makeRequest(`/vehicles/${vehicleId}/set-primary`, {
      method: 'PUT',
    });
    return response;
  }

  async deleteAccount(password) {
    const response = await this.makeRequest('/profile/delete-account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
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
    console.log('🎯 API: Creating reservation with data:', reservationData);
    
    if (!reservationData.spotId || !reservationData.startTime || !reservationData.endTime || !reservationData.totalCost) {
      console.error('❌ API: Missing required reservation data');
      throw new Error('Missing required reservation data');
    }
    
    const response = await this.makeRequest('/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData),
    });
    
    console.log('🎯 API: Reservation response:', response);
    return response;
  }

  async getUserReservations() {
    console.log('🎯 API: Fetching user reservations...');
    const response = await this.makeRequest('/reservations');
    console.log('🎯 API: User reservations response:', response);
    return response.reservations;
  }

  async cancelReservation(reservationId) {
    console.log('🎯 API: Cancelling reservation:', reservationId);
    const response = await this.makeRequest(`/reservations/${reservationId}/cancel`, {
      method: 'PUT',
    });
    console.log('🎯 API: Cancel reservation response:', response);
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

  async isAuthenticated() {
    if (!this.token) {
      await this.init();
    }
    return !!this.token;
  }

  async getFavorites() {
    return [];
  }

  // Calculate estimated cost
  calculateCost(hourlyRate, hours) {
    return (hourlyRate * hours).toFixed(2);
  }

  // Get distance between two points (Haversine formula)
  getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // distance in kilometers
    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  formatTime(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('ro-RO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // use 24-hour format
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return dateString;
    }
  }

  formatDate(dateString) {
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
  }

  isReservationActive(reservation) {
    const now = new Date();
    const startTime = new Date(reservation.start_time);
    const endTime = new Date(reservation.end_time);
    
    console.log('🎯 CHECKING ACTIVE:', {
      now: now.toISOString(),
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      status: reservation.status,
      isActive: reservation.status === 'active' && now >= startTime && now <= endTime
    });
    
    return (
      reservation.status === 'active' &&
      now >= startTime &&
      now <= endTime
    );
  }

  isReservationUpcoming(reservation) {
    const now = new Date();
    const startTime = new Date(reservation.start_time);
    
    console.log('🎯 CHECKING UPCOMING:', {
      now: now.toISOString(),
      start: startTime.toISOString(),
      status: reservation.status,
      isUpcoming: reservation.status === 'active' && now < startTime
    });
    
    return (
      reservation.status === 'active' &&
      now < startTime
    );
  }

}

// Export singleton instance
const parkingAPI = new ParkingAPI();
export default parkingAPI;