import random
from datetime import datetime

class ParkingSensor:
    def __init__(self, sensor_id, parking_lot, spot_number, 
                 detection_range=(0.5, 4.0), noise_level=0.1, error_probability=0.05):
        self.sensor_id = sensor_id
        self.parking_lot = parking_lot
        self.spot_number = spot_number
        self.detection_range = detection_range
        self.noise_level = noise_level
        self.error_probability = error_probability
        self.is_occupied = False
        self.last_detection_time = None
        self.reading_count = 0
        self.transmission_count = 0
        
    def measure_distance(self):
        """Simulate ultrasonic distance measurement with noise"""
        if self.is_occupied:
            # Vehicle present - distance between 0.5m and 1.5m
            base_distance = random.uniform(0.5, 1.5)
        else:
            # No vehicle - distance beyond detection range
            base_distance = random.uniform(2.5, 4.5)
            
        # Add Gaussian noise
        measured_distance = base_distance + random.gauss(0, self.noise_level)
        
        return max(0.1, measured_distance)  # ensure positive distance
    
    def detect_occupancy(self, distance_threshold=2.0):
        """Determine occupancy based on distance measurement"""
        distance = self.measure_distance()
        
        # Threshold-based detection
        is_occupied = distance < distance_threshold
        
        # Simulate sensor errors
        if random.random() < self.error_probability:
            is_occupied = not is_occupied
            
        return is_occupied, distance, distance_threshold
    
    def generate_reading(self):
        """Generate a complete sensor reading"""
        is_occupied, distance, threshold = self.detect_occupancy()
        timestamp = datetime.now().isoformat()
        self.reading_count += 1
        
        # Calculate confidence based on distance from threshold
        confidence = self._calculate_confidence(distance, threshold)
        
        # Update sensor state
        self.is_occupied = is_occupied
        self.last_detection_time = timestamp
        
        return {
            "sensor_id": self.sensor_id,
            "lot_id": self.parking_lot.lot_id,
            "spot_number": self.spot_number,
            "timestamp": timestamp,
            "distance": round(distance, 3),
            "is_occupied": is_occupied,
            "confidence": round(confidence, 3),
            "battery_level": round(random.uniform(80, 100), 1),
            "signal_strength": round(random.uniform(-80, -40), 1),
            "reading_count": self.reading_count
        }
    
    def _calculate_confidence(self, distance, threshold):
        """Calculate confidence score based on distance from threshold"""
        margin = abs(distance - threshold)
        if margin > 1.0:
            return 0.95 # high confidence
        elif margin > 0.5:
            return 0.8 # medium confidence
        else:
            return 0.6 # low confidence (near threshold)
    
    def __str__(self):
        status = "occupied" if self.is_occupied else "available"
        return f"Sensor {self.sensor_id} - Spot {self.spot_number} - {status}"