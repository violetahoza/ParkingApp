import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles } from '../../theme/styles';
import { colors } from '../../theme/colors';
import ParkingAPI from '../../services/api';

const ChangePassword = ({ navigation }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword === formData.newPassword && formData.currentPassword.trim()) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      await ParkingAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      
      Alert.alert(
        'Success! 🎉',
        'Your password has been changed successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Password change error:', error);
      
      let errorMessage = 'Failed to change password. Please try again.';
      
      if (error.message.includes('Current password is incorrect')) {
        errorMessage = 'Current password is incorrect. Please try again.';
      } else if (error.message.includes('Authentication required')) {
        errorMessage = 'Please log in again to change your password.';
      }
      
      Alert.alert('Error', errorMessage);
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

  const togglePasswordVisibility = (field) => { setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] }); };

  const renderPasswordInput = (
    label,
    placeholder,
    field,
    showPasswordKey
  ) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={globalStyles.inputLabel}>{label}</Text>
      <View style={{ position: 'relative' }}>
        <TextInput
          style={[
            globalStyles.input,
            errors[field] && { borderColor: colors.error },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={formData[field]}
          onChangeText={(text) => updateFormData(field, text)}
          secureTextEntry={!showPasswords[showPasswordKey]}
          autoComplete="password"
        />
        <TouchableOpacity
          style={{
            position: 'absolute',
            right: 16,
            top: 18,
          }}
          onPress={() => togglePasswordVisibility(showPasswordKey)}
        >
          <Ionicons
            name={showPasswords[showPasswordKey] ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>
      {errors[field] && (
        <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
          {errors[field]}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={globalStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={globalStyles.header}>
          <View style={globalStyles.spaceBetween}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={globalStyles.headerTitle}>Change Password</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[globalStyles.center, { marginBottom: 32 }]}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.primary + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
            </View>
            <Text style={[globalStyles.heading, { marginBottom: 8 }]}>
              Update Your Password
            </Text>
            <Text style={[globalStyles.caption, { textAlign: 'center', marginBottom: 32 }]}>
              Choose a strong password to keep your account secure
            </Text>
          </View>

          {renderPasswordInput(
            'Current Password',
            'Enter your current password',
            'currentPassword',
            'current'
          )}

          {renderPasswordInput(
            'New Password',
            'Enter your new password',
            'newPassword',
            'new'
          )}

          {renderPasswordInput(
            'Confirm New Password',
            'Confirm your new password',
            'confirmPassword',
            'confirm'
          )}

          <View style={[globalStyles.card, { marginBottom: 32 }]}>
            <Text style={[globalStyles.subheading, { marginBottom: 12 }]}>
              Password Requirements
            </Text>
            
            <View style={[globalStyles.row, { marginBottom: 8 }]}>
              <Ionicons 
                name={formData.newPassword.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'} 
                size={16} 
                color={formData.newPassword.length >= 6 ? colors.success : colors.textMuted} 
              />
              <Text style={[globalStyles.caption, { marginLeft: 8 }]}>
                At least 6 characters
              </Text>
            </View>
            
            <View style={[globalStyles.row, { marginBottom: 8 }]}>
              <Ionicons 
                name={formData.newPassword !== formData.currentPassword && formData.newPassword.length > 0 ? 'checkmark-circle' : 'ellipse-outline'} 
                size={16} 
                color={formData.newPassword !== formData.currentPassword && formData.newPassword.length > 0 ? colors.success : colors.textMuted} 
              />
              <Text style={[globalStyles.caption, { marginLeft: 8 }]}>
                Different from current password
              </Text>
            </View>
            
            <View style={globalStyles.row}>
              <Ionicons 
                name={formData.newPassword === formData.confirmPassword && formData.newPassword.length > 0 ? 'checkmark-circle' : 'ellipse-outline'} 
                size={16} 
                color={formData.newPassword === formData.confirmPassword && formData.newPassword.length > 0 ? colors.success : colors.textMuted} 
              />
              <Text style={[globalStyles.caption, { marginLeft: 8 }]}>
                Passwords match
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              globalStyles.button,
              { 
                marginBottom: 100,
                opacity: isLoading ? 0.6 : 1,
              }
            ]}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={globalStyles.buttonText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChangePassword;