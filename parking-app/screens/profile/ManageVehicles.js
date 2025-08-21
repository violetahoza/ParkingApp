import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, TextInput, Alert, ActivityIndicator, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles } from '../../theme/styles';
import { colors } from '../../theme/colors';
import ParkingAPI from '../../services/api';

const ManageVehicles = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    licensePlate: '',
    make: '',
    model: '',
    color: '',
    year: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => { loadVehicles(); }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const userVehicles = await ParkingAPI.getUserVehicles();
      setVehicles(userVehicles);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
      Alert.alert('Error', 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'License plate is required';
    }

    if (!formData.make.trim()) {
      newErrors.make = 'Vehicle make is required';
    }

    if (!formData.model.trim()) {
      newErrors.model = 'Vehicle model is required';
    }

    if (formData.year && (isNaN(formData.year) || formData.year < 1900 || formData.year > new Date().getFullYear() + 1)) {
      newErrors.year = 'Please enter a valid year';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddVehicle = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await ParkingAPI.addVehicle(formData);
      await loadVehicles();
      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', 'Vehicle added successfully!');
    } catch (error) {
      console.error('Failed to add vehicle:', error);
      Alert.alert('Error', error.message || 'Failed to add vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditVehicle = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await ParkingAPI.updateVehicle(selectedVehicle.id, formData);
      await loadVehicles();
      setShowEditModal(false);
      resetForm();
      Alert.alert('Success', 'Vehicle updated successfully!');
    } catch (error) {
      console.error('Failed to update vehicle:', error);
      Alert.alert('Error', error.message || 'Failed to update vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVehicle = (vehicle) => {
    if (vehicle.is_primary || vehicle.is_primary === 1) {
      Alert.alert('Cannot Delete', 'You cannot delete your primary vehicle. Please set another vehicle as primary first.');
      return;
    }

    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete ${vehicle.make} ${vehicle.model} (${vehicle.license_plate})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ParkingAPI.deleteVehicle(vehicle.id);
              await loadVehicles();
              Alert.alert('Success', 'Vehicle deleted successfully!');
            } catch (error) {
              console.error('Failed to delete vehicle:', error);
              Alert.alert('Error', error.message || 'Failed to delete vehicle');
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (vehicle) => {
    if (vehicle.is_primary || vehicle.is_primary === 1) {
      return; 
    }

    try {
      await ParkingAPI.setPrimaryVehicle(vehicle.id);
      await loadVehicles();
      Alert.alert('Success', `${vehicle.make} ${vehicle.model} is now your primary vehicle!`);
    } catch (error) {
      console.error('Failed to set primary vehicle:', error);
      Alert.alert('Error', error.message || 'Failed to set primary vehicle');
    }
  };

  const openEditModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      licensePlate: vehicle.license_plate,
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color || '',
      year: vehicle.year ? vehicle.year.toString() : '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      licensePlate: '',
      make: '',
      model: '',
      color: '',
      year: '',
    });
    setErrors({});
    setSelectedVehicle(null);
  };

  const updateFormData = (field, value) => {
    if (field === 'licensePlate') {
      value = value.toUpperCase();
    }
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const renderVehicle = ({ item }) => (
    <View style={[globalStyles.card, { marginBottom: 12 }]}>
      <View style={globalStyles.spaceBetween}>
        <View style={{ flex: 1 }}>
          <View style={[globalStyles.row, { marginBottom: 8 }]}>
            <View style={{
              backgroundColor: colors.primary,
              borderRadius: 6,
              paddingVertical: 4,
              paddingHorizontal: 8,
              marginRight: 12,
            }}>
              <Text style={[globalStyles.statusText, { fontSize: 12 }]}>
                {item.license_plate}
              </Text>
            </View>
            {(item.is_primary || item.is_primary === 1) && (
              <View style={{
                backgroundColor: colors.success,
                borderRadius: 6,
                paddingVertical: 2,
                paddingHorizontal: 6,
              }}>
                <Text style={[globalStyles.statusText, { fontSize: 10 }]}>
                  PRIMARY
                </Text>
              </View>
            )}
          </View>
          
          <Text style={[globalStyles.subheading, { marginBottom: 4 }]}>
            {item.make} {item.model}
          </Text>
          
          <View style={[globalStyles.row, { marginBottom: 4 }]}>
            {item.year && (
              <Text style={[globalStyles.caption, { marginRight: 16 }]}>
                Year: {item.year}
              </Text>
            )}
            {item.color && (
              <Text style={globalStyles.caption}>
                Color: {item.color}
              </Text>
            )}
          </View>
          
          <Text style={[globalStyles.caption, { color: colors.textMuted }]}>
            Added {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          {!(item.is_primary || item.is_primary === 1) && (
            <TouchableOpacity
              style={{
                backgroundColor: colors.success,
                borderRadius: 8,
                padding: 8,
                marginBottom: 8,
              }}
              onPress={() => handleSetPrimary(item)}
            >
              <Text style={[globalStyles.statusText, { fontSize: 10 }]}>
                SET PRIMARY
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={{
              backgroundColor: colors.info,
              borderRadius: 8,
              padding: 8,
              marginBottom: 8,
            }}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create-outline" size={16} color={colors.white} />
          </TouchableOpacity>
          
          {!(item.is_primary || item.is_primary === 1) && (
            <TouchableOpacity
              style={{
                backgroundColor: colors.error,
                borderRadius: 8,
                padding: 8,
              }}
              onPress={() => handleDeleteVehicle(item)}
            >
              <Ionicons name="trash-outline" size={16} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderModal = (visible, onClose, onSubmit, title) => (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
      }}>
        <View style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 40,
          maxHeight: '80%',
        }}>
          <View style={[globalStyles.spaceBetween, { marginBottom: 20 }]}>
            <Text style={globalStyles.heading}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={globalStyles.inputLabel}>License Plate *</Text>
            <TextInput
              style={[
                globalStyles.input,
                errors.licensePlate && { borderColor: colors.error },
              ]}
              placeholder="CJ01ABC"
              placeholderTextColor={colors.textMuted}
              value={formData.licensePlate}
              onChangeText={(text) => updateFormData('licensePlate', text)}
              autoCapitalize="characters"
            />
            {errors.licensePlate && (
              <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
                {errors.licensePlate}
              </Text>
            )}
          </View>

          <View style={[globalStyles.row, { marginBottom: 16 }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={globalStyles.inputLabel}>Make *</Text>
              <TextInput
                style={[
                  globalStyles.input,
                  errors.make && { borderColor: colors.error },
                ]}
                placeholder="Toyota"
                placeholderTextColor={colors.textMuted}
                value={formData.make}
                onChangeText={(text) => updateFormData('make', text)}
                autoCapitalize="words"
              />
              {errors.make && (
                <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
                  {errors.make}
                </Text>
              )}
            </View>
            
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={globalStyles.inputLabel}>Model *</Text>
              <TextInput
                style={[
                  globalStyles.input,
                  errors.model && { borderColor: colors.error },
                ]}
                placeholder="Camry"
                placeholderTextColor={colors.textMuted}
                value={formData.model}
                onChangeText={(text) => updateFormData('model', text)}
                autoCapitalize="words"
              />
              {errors.model && (
                <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
                  {errors.model}
                </Text>
              )}
            </View>
          </View>

          <View style={[globalStyles.row, { marginBottom: 24 }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={globalStyles.inputLabel}>Color</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="Blue"
                placeholderTextColor={colors.textMuted}
                value={formData.color}
                onChangeText={(text) => updateFormData('color', text)}
                autoCapitalize="words"
              />
            </View>
            
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={globalStyles.inputLabel}>Year</Text>
              <TextInput
                style={[
                  globalStyles.input,
                  errors.year && { borderColor: colors.error },
                ]}
                placeholder="2023"
                placeholderTextColor={colors.textMuted}
                value={formData.year}
                onChangeText={(text) => updateFormData('year', text)}
                keyboardType="numeric"
                maxLength={4}
              />
              {errors.year && (
                <Text style={[globalStyles.caption, { color: colors.error, marginTop: 4 }]}>
                  {errors.year}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              globalStyles.button,
              { opacity: isSubmitting ? 0.6 : 1 }
            ]}
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={globalStyles.buttonText}>
                {title.includes('Add') ? 'Add Vehicle' : 'Update Vehicle'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={globalStyles.header}>
        <View style={globalStyles.spaceBetween}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={globalStyles.headerTitle}>Manage Vehicles</Text>
          <TouchableOpacity 
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={globalStyles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[globalStyles.bodyText, { marginTop: 16 }]}>
            Loading vehicles...
          </Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          renderItem={renderVehicle}
          keyExtractor={(item) => item.id.toString()}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={[globalStyles.centerContainer, { paddingTop: 100 }]}>
              <Ionicons name="car-outline" size={64} color={colors.textMuted} />
              <Text style={[globalStyles.bodyText, { marginTop: 16, textAlign: 'center' }]}>
                No vehicles added yet{'\n'}Add your first vehicle to get started!
              </Text>
              <TouchableOpacity
                style={[globalStyles.button, { marginTop: 24, paddingVertical: 12 }]}
                onPress={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
              >
                <Text style={globalStyles.buttonText}>Add Vehicle</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {renderModal(
        showAddModal,
        () => {
          setShowAddModal(false);
          resetForm();
        },
        handleAddVehicle,
        'Add New Vehicle'
      )}

      {renderModal(
        showEditModal,
        () => {
          setShowEditModal(false);
          resetForm();
        },
        handleEditVehicle,
        'Edit Vehicle'
      )}
    </SafeAreaView>
  );
};

export default ManageVehicles;