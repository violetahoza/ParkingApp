import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles } from '../../theme/styles';
import { colors } from '../../theme/colors';
import ParkingAPI from '../../services/api';

const EditProfile = ({ navigation, route }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    licensePlate: '',
  });
  const [originalData, setOriginalData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    // Check if there are any changes
    const changes = 
      formData.firstName !== originalData.firstName ||
      formData.lastName !== originalData.lastName ||
      formData.email !== originalData.email ||
      formData.phone !== originalData.phone ||
      formData.licensePlate !== originalData.licensePlate;
    
    setHasChanges(changes);
  }, [formData, originalData]);

  const loadUserProfile = async () => {
    try {
      setLoadingProfile(true);
      
      // Try to get user from route params first, then from API
      let userData = route.params?.user;
      
      if (!userData) {
        userData = await ParkingAPI.getCurrentUser();
      }
      
      if (userData) {
        const profileData = {
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          licensePlate: userData.licensePlate || '',
        };
        
        setFormData(profileData);
        setOriginalData(profileData);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoadingProfile(false);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[\+]?[0-9\-\(\)\s]{10,}$/;
    return phoneRegex.test(phone);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'License plate is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    setIsLoading(true);
    
    try {
      await ParkingAPI.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        licensePlate: formData.licensePlate,
      });
      
      Alert.alert(
        'Success',
        'Profile updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = () => {
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const updateFormData = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  if (loadingProfile) {
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={globalStyles.header}>
          <View style={globalStyles.spaceBetween}>
            <TouchableOpacity onPress={handleDiscard}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={globalStyles.headerTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading || !hasChanges}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={[
                  globalStyles.caption,
                  { 
                    color: hasChanges ? colors.primary : colors.textMuted,
                    fontWeight: '600',
                  }
                ]}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Picture */}
          <View style={[globalStyles.center, { marginBottom: 32 }]}>
            <View style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Text style={{
                fontSize: 36,
                fontWeight: 'bold',
                color: colors.white,
              }}>
                {formData.firstName?.charAt(0) || 'U'}{formData.lastName?.charAt(0) || ''}
              </Text>
            </View>
            
            <TouchableOpacity
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: colors.primary,
              }}
              onPress={() => Alert.alert('Coming Soon', 'Photo upload will be available soon!')}
            >
              <Text style={[globalStyles.caption, { color: colors.primary }]}>
                Change Photo
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name Fields */}
          <View style={globalStyles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={globalStyles.inputLabel}>First Name</Text>
              <TextInput
                style={[
                  globalStyles.input,
                  errors.firstName && { borderColor: colors.error },
                ]}
                placeholder="John"
                placeholderTextColor={colors.textMuted}
                value={formData.firstName}
                onChangeText={(text) => updateFormData('firstName', text)}
                autoCapitalize="words"
              />
              {errors.firstName && (
                <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
                  {errors.firstName}
                </Text>
              )}
            </View>
            
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={globalStyles.inputLabel}>Last Name</Text>
              <TextInput
                style={[
                  globalStyles.input,
                  errors.lastName && { borderColor: colors.error },
                ]}
                placeholder="Doe"
                placeholderTextColor={colors.textMuted}
                value={formData.lastName}
                onChangeText={(text) => updateFormData('lastName', text)}
                autoCapitalize="words"
              />
              {errors.lastName && (
                <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
                  {errors.lastName}
                </Text>
              )}
            </View>
          </View>

          {/* Email Input */}
          <View style={{ marginBottom: 16 }}>
            <Text style={globalStyles.inputLabel}>Email Address</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={[
                  globalStyles.input,
                  { backgroundColor: colors.surface, opacity: 0.6 },
                  errors.email && { borderColor: colors.error },
                ]}
                placeholder="john.doe@example.com"
                placeholderTextColor={colors.textMuted}
                value={formData.email}
                editable={false}
                selectTextOnFocus={false}
              />
              <Ionicons
                name="mail-outline"
                size={20}
                color={colors.textMuted}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: 18,
                }}
              />
            </View>
            <Text style={[globalStyles.caption, { marginTop: 4, color: colors.textMuted }]}>
              Email cannot be changed. Contact support if needed.
            </Text>
          </View>

          {/* Phone Input */}
          <View style={{ marginBottom: 16 }}>
            <Text style={globalStyles.inputLabel}>Phone Number</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={[
                  globalStyles.input,
                  errors.phone && { borderColor: colors.error },
                ]}
                placeholder="+40712345678"
                placeholderTextColor={colors.textMuted}
                value={formData.phone}
                onChangeText={(text) => updateFormData('phone', text)}
                keyboardType="phone-pad"
              />
              <Ionicons
                name="call-outline"
                size={20}
                color={colors.textMuted}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: 18,
                }}
              />
            </View>
            {errors.phone && (
              <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
                {errors.phone}
              </Text>
            )}
          </View>

          {/* License Plate Input */}
          <View style={{ marginBottom: 32 }}>
            <Text style={globalStyles.inputLabel}>License Plate</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={[
                  globalStyles.input,
                  errors.licensePlate && { borderColor: colors.error },
                ]}
                placeholder="CJ01ABC"
                placeholderTextColor={colors.textMuted}
                value={formData.licensePlate}
                onChangeText={(text) => updateFormData('licensePlate', text.toUpperCase())}
                autoCapitalize="characters"
              />
              <Ionicons
                name="car-outline"
                size={20}
                color={colors.textMuted}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: 18,
                }}
              />
            </View>
            {errors.licensePlate && (
              <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
                {errors.licensePlate}
              </Text>
            )}
          </View>

          {/* Additional Options */}
          <View style={globalStyles.card}>
            <Text style={[globalStyles.subheading, { marginBottom: 16 }]}>
              Additional Options
            </Text>
            
            <TouchableOpacity
              style={[globalStyles.row, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceLight }]}
              onPress={() => Alert.alert('Coming Soon', 'Password change will be available soon!')}
            >
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={globalStyles.bodyText}>Change Password</Text>
                <Text style={globalStyles.caption}>Update your account password</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[globalStyles.row, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceLight }]}
              onPress={() => Alert.alert('Coming Soon', 'Vehicle management will be available soon!')}
            >
              <Ionicons name="car-outline" size={20} color={colors.textMuted} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={globalStyles.bodyText}>Manage Vehicles</Text>
                <Text style={globalStyles.caption}>Add or remove vehicles</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[globalStyles.row, { paddingVertical: 12 }]}
              onPress={() => Alert.alert('Coming Soon', 'Account deletion will be available soon!')}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[globalStyles.bodyText, { color: colors.error }]}>Delete Account</Text>
                <Text style={globalStyles.caption}>Permanently delete your account</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              globalStyles.button,
              { 
                marginTop: 32,
                marginBottom: 100,
                opacity: hasChanges && !isLoading ? 1 : 0.6,
              }
            ]}
            onPress={handleSave}
            disabled={!hasChanges || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={globalStyles.buttonText}>
                {hasChanges ? 'Save Changes' : 'No Changes'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditProfile;