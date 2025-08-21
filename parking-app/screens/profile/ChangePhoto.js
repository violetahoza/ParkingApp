import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Image, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { globalStyles } from '../../theme/styles';
import { colors } from '../../theme/colors';
import ParkingAPI from '../../services/api';

const ChangePhoto = ({ navigation, route }) => {
  const [user, setUser] = useState(route.params?.user);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(user?.profileImageUrl);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Please grant camera and photo library permissions to change your profile photo.',
        [{ text: 'OK' }]
      );
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to open photo library');
    }
  };

  const removePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUploading(true);
              await ParkingAPI.removeProfilePhoto();
              setCurrentPhoto(null);
              setSelectedImage(null);
              Alert.alert('Success', 'Profile photo removed successfully!');
            } catch (error) {
              console.error('Remove photo error:', error);
              Alert.alert('Error', 'Failed to remove profile photo');
            } finally {
              setIsUploading(false);
            }
          },
        },
      ]
    );
  };

  const uploadPhoto = async () => {
    if (!selectedImage) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: selectedImage.uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });

      const response = await ParkingAPI.uploadProfilePhoto(formData);
      
      if (response.success) {
        setCurrentPhoto(response.photoUrl);
        setSelectedImage(null);
        Alert.alert(
          'Success! 🎉',
          'Your profile photo has been updated successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const getDisplayImage = () => {
    if (selectedImage) return selectedImage.uri;
    if (currentPhoto) {
      if (currentPhoto.startsWith('http')) {
        return currentPhoto;
      } else {
        return `http://192.168.100.20:3000${currentPhoto}`;
      }
    }
    return null;
  };

  const getDisplayInitials = () => {
    if (!user) return 'U';
    return `${user.firstName?.charAt(0) || 'U'}${user.lastName?.charAt(0) || ''}`;
  };

  const hasCurrentPhoto = currentPhoto && !selectedImage;

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.header}>
        <View style={globalStyles.spaceBetween}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={globalStyles.headerTitle}>Profile Photo</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <View style={[globalStyles.center, { flex: 0, padding: 10 }]}>
        <View style={{ marginBottom: 20, alignItems: 'center' }}>
          <View style={{
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}>
            {getDisplayImage() ? (
              <Image
                source={{ uri: getDisplayImage() }}
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{
                fontSize: 64,
                fontWeight: 'bold',
                color: colors.white,
              }}>
                {getDisplayInitials()}
              </Text>
            )}
          </View>

          {selectedImage && (
            <View style={[globalStyles.center, { marginBottom: 16 }]}>
              <View style={{
                backgroundColor: colors.info + '20',
                borderRadius: 8,
                paddingVertical: 8,
                paddingHorizontal: 16,
              }}>
                <Text style={[globalStyles.caption, { color: colors.info, textAlign: 'center' }]}>
                  📸 New photo selected
                </Text>
              </View>
            </View>
          )}

          <Text style={[globalStyles.heading, { textAlign: 'center', marginBottom: 8 }]}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={[globalStyles.caption, { textAlign: 'center' }]}>
            {selectedImage ? 'Tap Save Photo to update your profile picture' : 'Choose how you want to update your profile photo'}
          </Text>
        </View>

        <View style={{ width: '100%', maxWidth: 300 }}>
          {selectedImage ? (
            <>
              <TouchableOpacity
                style={[
                  globalStyles.button,
                  { 
                    marginBottom: 16,
                    opacity: isUploading ? 0.6 : 1 
                  }
                ]}
                onPress={uploadPhoto}
                disabled={isUploading}
              >
                {isUploading ? (
                  <View style={globalStyles.row}>
                    <ActivityIndicator color={colors.white} />
                    <Text style={[globalStyles.buttonText, { marginLeft: 8 }]}>
                      Uploading...
                    </Text>
                  </View>
                ) : (
                  <View style={globalStyles.row}>
                    <Ionicons name="cloud-upload" size={20} color={colors.white} />
                    <Text style={[globalStyles.buttonText, { marginLeft: 8 }]}>
                      Save Photo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[globalStyles.buttonSecondary, { marginBottom: 16 }]}
                onPress={() => setSelectedImage(null)}
                disabled={isUploading}
              >
                <Text style={globalStyles.buttonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[globalStyles.button, { marginBottom: 16 }]}
                onPress={takePhoto}
              >
                <View style={globalStyles.row}>
                  <Ionicons name="camera" size={20} color={colors.white} />
                  <Text style={[globalStyles.buttonText, { marginLeft: 8 }]}>
                    Take Photo
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[globalStyles.buttonSecondary, { marginBottom: 16 }]}
                onPress={pickImage}
              >
                <View style={globalStyles.row}>
                  <Ionicons name="images-outline" size={20} color={colors.primary} />
                  <Text style={[globalStyles.buttonTextSecondary, { marginLeft: 8 }]}>
                    Choose from Library
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  globalStyles.buttonSecondary,
                  { 
                    borderColor: colors.error,
                    marginBottom: 16,
                    opacity: hasCurrentPhoto ? 1 : 0.5
                  }
                ]}
                onPress={removePhoto}
                disabled={!hasCurrentPhoto}
              >
                <View style={globalStyles.row}>
                  <Ionicons name="trash-outline" size={20} color={hasCurrentPhoto ? colors.error : colors.textMuted} />
                  <Text style={[
                    globalStyles.buttonTextSecondary, 
                    { 
                      color: hasCurrentPhoto ? colors.error : colors.textMuted,
                      marginLeft: 8 
                    }
                  ]}>
                    Remove Photo
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={[globalStyles.card, { marginTop: 40, maxWidth: 300 }]}>
          <Text style={[globalStyles.subheading, { marginBottom: 12, textAlign: 'center' }]}>
            📋 Photo Guidelines
          </Text>
          
          <View style={{ marginBottom: 8 }}>
            <View style={[globalStyles.row, { marginBottom: 4 }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[globalStyles.caption, { marginLeft: 8 }]}>
                Use a clear, recent photo of yourself
              </Text>
            </View>
            
            <View style={[globalStyles.row, { marginBottom: 4 }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[globalStyles.caption, { marginLeft: 8 }]}>
                Square format works best
              </Text>
            </View>
            
            <View style={[globalStyles.row, { marginBottom: 4 }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[globalStyles.caption, { marginLeft: 8 }]}>
                Good lighting and contrast
              </Text>
            </View>
            
            <View style={globalStyles.row}>
              <Ionicons name="information-circle" size={16} color={colors.info} />
              <Text style={[globalStyles.caption, { marginLeft: 8 }]}>
                Maximum file size: 5MB
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ChangePhoto;