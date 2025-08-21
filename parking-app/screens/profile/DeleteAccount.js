import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles } from '../../theme/styles';
import { colors } from '../../theme/colors';
import ParkingAPI from '../../services/api';

const DeleteAccount = ({ navigation }) => {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // 1: Warning, 2: Confirmation

  const CONFIRM_TEXT = 'DELETE MY ACCOUNT';

  const validateForm = () => {
    const newErrors = {};

    if (!password.trim()) {
      newErrors.password = 'Password is required to delete your account';
    }

    if (confirmText !== CONFIRM_TEXT) {
      newErrors.confirmText = `Please type "${CONFIRM_TEXT}" exactly as shown`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDeleteAccount = async () => {
    console.log('🔥 DELETE ACCOUNT: Starting deletion process...');
    
    if (!validateForm()) {
      console.log('❌ DELETE ACCOUNT: Form validation failed');
      return;
    }

    Alert.alert(
      'Final Confirmation',
      'This action cannot be undone. Are you absolutely sure you want to delete your account permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete Forever',
          style: 'destructive',
          onPress: async () => {
            console.log('🔥 DELETE ACCOUNT: User confirmed final deletion');
            setIsLoading(true);
            
            try {
              console.log('🔥 DELETE ACCOUNT: Calling API deleteAccount with password...');
              console.log('🔥 DELETE ACCOUNT: Password length:', password.length);
              
              const response = await ParkingAPI.deleteAccount(password);
              
              console.log('🔥 DELETE ACCOUNT: API Response:', response);
              
              if (response && response.success) {
                console.log('✅ DELETE ACCOUNT: Account deletion successful');
                
                Alert.alert(
                  'Account Deleted',
                  'Your account has been permanently deleted. We\'re sorry to see you go!',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        console.log('🔥 DELETE ACCOUNT: Triggering auth refresh...');
                        if (global.refreshAuth) {
                          setTimeout(() => global.refreshAuth(), 100);
                        }
                      },
                    },
                  ]
                );
              } else {
                console.log('❌ DELETE ACCOUNT: API returned success=false');
                throw new Error(response?.error || 'Unknown error occurred');
              }
            } catch (error) {
              console.error('❌ DELETE ACCOUNT: Error occurred:', error);
              console.error('❌ DELETE ACCOUNT: Error message:', error.message);
              console.error('❌ DELETE ACCOUNT: Error stack:', error.stack);
              
              let errorMessage = 'Failed to delete account. Please try again.';
              
              if (error.message.includes('Incorrect password')) {
                console.log('❌ DELETE ACCOUNT: Incorrect password error');
                errorMessage = 'Incorrect password. Please try again.';
                setErrors({ password: 'Incorrect password' });
              } else if (error.message.includes('active reservations')) {
                console.log('❌ DELETE ACCOUNT: Active reservations error');
                errorMessage = 'You have active reservations. Please cancel them before deleting your account.';
              } else if (error.message.includes('Authentication required')) {
                console.log('❌ DELETE ACCOUNT: Authentication error');
                errorMessage = 'Authentication required. Please log in again.';
              } else if (error.message.includes('Network error')) {
                console.log('❌ DELETE ACCOUNT: Network error');
                errorMessage = 'Network error. Please check your connection and try again.';
              }
              
              Alert.alert('Error', errorMessage);
            } finally {
              console.log('🔥 DELETE ACCOUNT: Cleaning up, setting loading to false');
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderStep1 = () => (
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
          backgroundColor: colors.error + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <Ionicons name="warning" size={40} color={colors.error} />
        </View>
        <Text style={[globalStyles.heading, { color: colors.error, marginBottom: 8 }]}>
          Delete Account
        </Text>
        <Text style={[globalStyles.caption, { textAlign: 'center' }]}>
          This action is permanent and cannot be undone
        </Text>
      </View>

      <View style={[globalStyles.card, { backgroundColor: colors.error + '10', borderColor: colors.error, borderWidth: 1, marginBottom: 24 }]}>
        <Text style={[globalStyles.subheading, { color: colors.error, marginBottom: 16 }]}>
          ⚠️ What will happen when you delete your account:
        </Text>
        
        <View style={{ marginBottom: 12 }}>
          <Text style={[globalStyles.caption, { marginBottom: 8 }]}>
            • All your personal information will be permanently deleted
          </Text>
          <Text style={[globalStyles.caption, { marginBottom: 8 }]}>
            • Your reservation history will be removed
          </Text>
          <Text style={[globalStyles.caption, { marginBottom: 8 }]}>
            • Saved vehicles and payment methods will be deleted
          </Text>
          <Text style={[globalStyles.caption, { marginBottom: 8 }]}>
            • You will lose access to any active reservations
          </Text>
          <Text style={[globalStyles.caption, { marginBottom: 8 }]}>
            • This action cannot be reversed
          </Text>
        </View>
      </View>

      <View style={[globalStyles.card, { marginBottom: 32 }]}>
        <Text style={[globalStyles.subheading, { marginBottom: 16 }]}>
          Consider these alternatives:
        </Text>
        
        <TouchableOpacity
          style={[globalStyles.row, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceLight }]}
          onPress={() => Alert.alert('Coming Soon', 'Temporarily deactivate account feature will be available soon!')}
        >
          <Ionicons name="pause-circle-outline" size={20} color={colors.warning} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={globalStyles.bodyText}>Temporarily deactivate account</Text>
            <Text style={globalStyles.caption}>Hide your account without deleting data</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[globalStyles.row, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceLight }]}
          onPress={() => Alert.alert('Coming Soon', 'Export data feature will be available soon!')}
        >
          <Ionicons name="download-outline" size={20} color={colors.info} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={globalStyles.bodyText}>Export your data</Text>
            <Text style={globalStyles.caption}>Download a copy of your information</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[globalStyles.row, { paddingVertical: 12 }]}
          onPress={() => Alert.alert('Contact Support', 'Email: support@smartparking.com\nPhone: +40 123 456 789')}
        >
          <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={globalStyles.bodyText}>Contact support</Text>
            <Text style={globalStyles.caption}>Get help with your account issues</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[globalStyles.button, { backgroundColor: colors.error, marginBottom: 16 }]}
        onPress={() => {
          console.log('🔥 DELETE ACCOUNT: Moving to step 2');
          setStep(2);
        }}
      >
        <Text style={globalStyles.buttonText}>I understand, continue with deletion</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={globalStyles.buttonSecondary}
        onPress={() => {
          console.log('🔥 DELETE ACCOUNT: User cancelled, going back');
          navigation.goBack();
        }}
      >
        <Text style={globalStyles.buttonTextSecondary}>Cancel and go back</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStep2 = () => (
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
          backgroundColor: colors.error + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <Ionicons name="shield-outline" size={40} color={colors.error} />
        </View>
        <Text style={[globalStyles.heading, { color: colors.error, marginBottom: 8 }]}>
          Confirm Account Deletion
        </Text>
        <Text style={[globalStyles.caption, { textAlign: 'center' }]}>
          Please verify your identity to proceed
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={globalStyles.inputLabel}>Enter your password</Text>
        <TextInput
          style={[
            globalStyles.input,
            errors.password && { borderColor: colors.error },
          ]}
          placeholder="Enter your current password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={(text) => {
            console.log('🔥 DELETE ACCOUNT: Password changed, length:', text.length);
            setPassword(text);
            if (errors.password) {
              setErrors({ ...errors, password: null });
            }
          }}
          secureTextEntry={true}
          autoComplete="password"
        />
        {errors.password && (
          <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
            {errors.password}
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={globalStyles.inputLabel}>
          Type "{CONFIRM_TEXT}" to confirm
        </Text>
        <TextInput
          style={[
            globalStyles.input,
            errors.confirmText && { borderColor: colors.error },
          ]}
          placeholder={CONFIRM_TEXT}
          placeholderTextColor={colors.textMuted}
          value={confirmText}
          onChangeText={(text) => {
            console.log('🔥 DELETE ACCOUNT: Confirm text changed:', text);
            setConfirmText(text);
            if (errors.confirmText) {
              setErrors({ ...errors, confirmText: null });
            }
          }}
          autoCapitalize="characters"
        />
        {errors.confirmText && (
          <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
            {errors.confirmText}
          </Text>
        )}
        <Text style={[globalStyles.caption, { marginTop: 4, color: colors.textMuted }]}>
          This confirms you understand the consequences
        </Text>
      </View>

      <View style={[globalStyles.card, { backgroundColor: colors.error + '10', borderColor: colors.error, borderWidth: 1, marginBottom: 32 }]}>
        <Text style={[globalStyles.subheading, { color: colors.error, marginBottom: 8 }]}>
          🚨 Last Warning
        </Text>
        <Text style={[globalStyles.caption, { color: colors.error }]}>
          Once you click "Delete Account Forever", your account and all associated data will be permanently removed. This action cannot be undone.
        </Text>
      </View>

      <TouchableOpacity
        style={[
          globalStyles.button,
          { 
            backgroundColor: colors.error,
            marginBottom: 16,
            opacity: isLoading ? 0.6 : 1,
          }
        ]}
        onPress={handleDeleteAccount}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={globalStyles.buttonText}>Delete Account Forever</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={globalStyles.buttonSecondary}
        onPress={() => {
          console.log('🔥 DELETE ACCOUNT: Going back to step 1');
          setStep(1);
        }}
        disabled={isLoading}
      >
        <Text style={globalStyles.buttonTextSecondary}>Go back</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.header}>
        <View style={globalStyles.spaceBetween}>
          <TouchableOpacity onPress={() => step === 1 ? navigation.goBack() : setStep(1)}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={globalStyles.headerTitle}>
            {step === 1 ? 'Delete Account' : 'Confirm Deletion'}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {step === 1 ? renderStep1() : renderStep2()}
    </SafeAreaView>
  );
};

export default DeleteAccount;