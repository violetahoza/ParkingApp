import json
import random

class LoRaSimulator:
    def __init__(self, payload_size_limit=51, transmission_probability=0.8):
        self.payload_size_limit = payload_size_limit
        self.transmission_probability = transmission_probability
        self.transmission_count = 0
        self.failed_transmissions = 0
    
    def prepare_payload(self, sensor_data):
        """Prepare data for LoRaWAN transmission"""
        payload = {
            'id': sensor_data['sensor_id'],
            't': sensor_data['timestamp'],
            'o': sensor_data['is_occupied'],
            'b': sensor_data['battery_level'],
            'c': sensor_data['confidence']
        }
        
        # Convert to JSON and check size
        json_payload = json.dumps(payload)
        payload_size = len(json_payload.encode('utf-8'))
        
        if payload_size > self.payload_size_limit:
            # Further compress payload if needed
            payload = self._compress_payload(payload)
            json_payload = json.dumps(payload)
        
        return json_payload, payload_size
    
    def _compress_payload(self, payload):
        """Compress payload to fit LoRaWAN constraints"""
        # Shorten field names and values
        compressed = {
            'i': payload['id'],      # sensor_id
            't': payload['t'][11:19], # time only (HH:MM:SS)
            'o': 1 if payload['o'] else 0,  # occupied as 1/0
            'b': int(payload['b']),   # battery as integer
            'c': int(payload['c'] * 100)  # confidence as percentage
        }
        return compressed
    
    def simulate_transmission(self, payload):
        """Simulate LoRaWAN transmission with success probability"""
        success = random.random() < self.transmission_probability
        self.transmission_count += 1
        
        if not success:
            self.failed_transmissions += 1
            
        return success
    
    def get_stats(self):
        """Get transmission statistics"""
        success_rate = ((self.transmission_count - self.failed_transmissions) / 
                       self.transmission_count * 100) if self.transmission_count > 0 else 0
        
        return {
            'total_transmissions': self.transmission_count,
            'failed_transmissions': self.failed_transmissions,
            'success_rate': round(success_rate, 1)
        }