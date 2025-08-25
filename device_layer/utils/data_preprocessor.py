from datetime import datetime

class DataPreprocessor:
    def __init__(self, confidence_threshold=0.6, heartbeat_interval=10):
        self.confidence_threshold = confidence_threshold
        self.heartbeat_interval = heartbeat_interval
        self.sensor_states = {}  # track previous states
    
    def preprocess_sensor_data(self, sensor_data):
        """Apply device-level preprocessing to sensor data"""
        processed_data = sensor_data.copy()
        sensor_id = sensor_data['sensor_id']
        
        # Filter low-confidence readings
        if sensor_data['confidence'] < self.confidence_threshold:
            processed_data['is_occupied'] = None
            processed_data['should_transmit'] = False
        else:
            processed_data['should_transmit'] = True
        
        # Check for state changes (remove redundancy)
        previous_state = self.sensor_states.get(sensor_id, {})
        if previous_state:
            state_changed = (previous_state.get('is_occupied') != 
                           processed_data['is_occupied'])
            processed_data['state_changed'] = state_changed
            
            # Don't transmit if state hasn't changed (unless heartbeat)
            if not state_changed:
                processed_data['should_transmit'] = (
                    processed_data['reading_count'] % self.heartbeat_interval == 0
                )
        
        # Update state tracking
        self.sensor_states[sensor_id] = {
            'is_occupied': processed_data['is_occupied'],
            'timestamp': processed_data['timestamp'],
            'reading_count': processed_data['reading_count']
        }
        
        processed_data.update({
            'processed_at': datetime.now().isoformat(),
            'preprocessor_version': 'v1.0',
            'transmission_required': processed_data['should_transmit']
        })
        
        return processed_data
    
    def should_transmit(self, processed_data):
        """Determine if data should be transmitted"""
        return processed_data.get('transmission_required', True)