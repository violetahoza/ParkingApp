import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles } from '../../theme/styles';
import { colors } from '../../theme/colors';
import ParkingAPI from '../../services/api';

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const response = await ParkingAPI.login(email, password);
      
      if (response.success) {
        console.log('✅ Login successful:', response.user);
        // Trigger auth refresh
        if (global.refreshAuth) {
          setTimeout(() => global.refreshAuth(), 100);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password', 
      'Password reset functionality will be implemented soon.',
      [{ text: 'OK' }]
    );
  };

  // const fillDemoCredentials = () => {
  //   setEmail('demo@parking.com');
  //   setPassword('demo123');
  // };

  return (
    <SafeAreaView style={globalStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[globalStyles.scrollContainer, globalStyles.padding]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingTop: 60 }}>
            {/* Header */}
            <View style={[globalStyles.center, { marginBottom: 40 }]}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 8,
              }}>
                <Ionicons name="car" size={40} color={colors.white} />
              </View>
              
              <Text style={globalStyles.title}>Welcome Back</Text>
              <Text style={globalStyles.subtitle}>Sign in to continue parking</Text>
            </View>

            {/* Demo Credentials Button
            <TouchableOpacity
              style={{
                backgroundColor: colors.info,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 8,
                alignSelf: 'center',
                marginBottom: 24,
              }}
              onPress={fillDemoCredentials}
            >
              <Text style={[globalStyles.caption, { color: colors.white }]}>
                Use Demo Credentials
              </Text>
            </TouchableOpacity> */}

            {/* Email Input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={globalStyles.inputLabel}>Email Address</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[
                    globalStyles.input,
                    errors.email && { borderColor: colors.error },
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) {
                      setErrors({ ...errors, email: null });
                    }
                  }}
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

            {/* Password Input */}
            <View style={{ marginBottom: 24 }}>
              <Text style={globalStyles.inputLabel}>Password</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[
                    globalStyles.input,
                    errors.password && { borderColor: colors.error },
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors({ ...errors, password: null });
                    }
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
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

            {/* Forgot Password */}
            <TouchableOpacity
              style={{ alignSelf: 'flex-end', marginBottom: 32 }}
              onPress={handleForgotPassword}
            >
              <Text style={[globalStyles.caption, { color: colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                globalStyles.button,
                isLoading && { opacity: 0.6 },
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={globalStyles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={[globalStyles.row, { justifyContent: 'center', marginTop: 24 }]}>
              <Text style={globalStyles.bodyText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[globalStyles.bodyText, { color: colors.primary, fontWeight: '600' }]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;