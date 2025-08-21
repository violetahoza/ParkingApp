import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles } from '../../theme/styles';
import { colors } from '../../theme/colors';
import ParkingAPI from '../../services/api';

const Register = ({ navigation }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    licensePlate: '',
    vehicleMake: '',
    vehicleModel: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

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

    if (!formData.vehicleMake.trim()) {
      newErrors.vehicleMake = 'Vehicle make is required';
    }

    if (!formData.vehicleModel.trim()) {
      newErrors.vehicleModel = 'Vehicle model is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const response = await ParkingAPI.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        licensePlate: formData.licensePlate,
        vehicleMake: formData.vehicleMake,
        vehicleModel: formData.vehicleModel,
        password: formData.password,
      });
      
      if (response.success) {
        Alert.alert(
          'Registration Successful! 🎉',
          `Welcome to Smart Parking, ${formData.firstName}! Your ${formData.vehicleMake} ${formData.vehicleModel} (${formData.licensePlate}) has been registered as your primary vehicle.`,
          [
            {
              text: 'Get Started',
              onPress: () => {
                if (global.refreshAuth) {
                  setTimeout(() => global.refreshAuth(), 100);
                }
                console.log('✅ Registration successful, user authenticated');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.message.includes('User already exists')) {
        errorMessage = 'An account with this email already exists. Please try logging in instead.';
      } else if (error.message.includes('Network error')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Registration Failed ❌',
        errorMessage,
        [
          {
            text: 'Try Again',
            style: 'default',
          },
          {
            text: 'Go to Login',
            style: 'cancel',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={globalStyles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={colors.gradientDark}
            style={{ flex: 1, minHeight: '100%' }}
          >
            <View style={[globalStyles.padding, { paddingTop: 40 }]}>
              <View style={globalStyles.center}>
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    padding: 8,
                  }}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                
                <Text style={globalStyles.title}>Create Account</Text>
                <Text style={globalStyles.subtitle}>Join Smart Parking today</Text>
              </View>

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

              <View style={{ marginBottom: 16 }}>
                <Text style={globalStyles.inputLabel}>Email Address</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[
                      globalStyles.input,
                      errors.email && { borderColor: colors.error },
                    ]}
                    placeholder="john.doe@example.com"
                    placeholderTextColor={colors.textMuted}
                    value={formData.email}
                    onChangeText={(text) => updateFormData('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
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
                {errors.email && (
                  <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
                    {errors.email}
                  </Text>
                )}
              </View>

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

              <View style={[globalStyles.card, { marginBottom: 16 }]}>
                <Text style={[globalStyles.subheading, { marginBottom: 16 }]}>
                  🚗 Primary Vehicle Information
                </Text>
                
                <View style={{ marginBottom: 16 }}>
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

                <View style={globalStyles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={globalStyles.inputLabel}>Make</Text>
                    <TextInput
                      style={[
                        globalStyles.input,
                        errors.vehicleMake && { borderColor: colors.error },
                      ]}
                      placeholder="Toyota"
                      placeholderTextColor={colors.textMuted}
                      value={formData.vehicleMake}
                      onChangeText={(text) => updateFormData('vehicleMake', text)}
                      autoCapitalize="words"
                    />
                    {errors.vehicleMake && (
                      <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
                        {errors.vehicleMake}
                      </Text>
                    )}
                  </View>
                  
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={globalStyles.inputLabel}>Model</Text>
                    <TextInput
                      style={[
                        globalStyles.input,
                        errors.vehicleModel && { borderColor: colors.error },
                      ]}
                      placeholder="Camry"
                      placeholderTextColor={colors.textMuted}
                      value={formData.vehicleModel}
                      onChangeText={(text) => updateFormData('vehicleModel', text)}
                      autoCapitalize="words"
                    />
                    {errors.vehicleModel && (
                      <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
                        {errors.vehicleModel}
                      </Text>
                    )}
                  </View>
                </View>

                <Text style={[globalStyles.caption, { marginTop: 8, textAlign: 'center' }]}>
                  This will be set as your primary vehicle for parking reservations
                </Text>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={globalStyles.inputLabel}>Password</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[
                      globalStyles.input,
                      errors.password && { borderColor: colors.error },
                    ]}
                    placeholder="Enter password"
                    placeholderTextColor={colors.textMuted}
                    value={formData.password}
                    onChangeText={(text) => updateFormData('password', text)}
                    secureTextEntry={!showPassword}
                    autoComplete="password-new"
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 16,
                      top: 18,
                    }}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
                    {errors.password}
                  </Text>
                )}
              </View>

              <View style={{ marginBottom: 32 }}>
                <Text style={globalStyles.inputLabel}>Confirm Password</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[
                      globalStyles.input,
                      errors.confirmPassword && { borderColor: colors.error },
                    ]}
                    placeholder="Confirm password"
                    placeholderTextColor={colors.textMuted}
                    value={formData.confirmPassword}
                    onChangeText={(text) => updateFormData('confirmPassword', text)}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 16,
                      top: 18,
                    }}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && (
                  <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
                    {errors.confirmPassword}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  globalStyles.button,
                  isLoading && { opacity: 0.6 },
                ]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={globalStyles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              <View style={[globalStyles.row, { justifyContent: 'center', marginTop: 24 }]}>
                <Text style={globalStyles.bodyText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={[globalStyles.bodyText, { color: colors.primary, fontWeight: '600' }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Register;