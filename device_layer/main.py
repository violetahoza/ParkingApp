import json
import time
import random
from datetime import datetime
from models.parking_lot import ParkingLot
from models.parking_sensor import ParkingSensor
from utils.data_preprocessor import DataPreprocessor
from utils.lora_simulator import LoRaSimulator
import config

class ParkingSystemSimulator:
    def __init__(self):
        self.parking_lots = []
        self.sensors = []
        self.preprocessor = DataPreprocessor(
            config.CONFIDENCE_THRESHOLD,
            config.HEARTBEAT_INTERVAL
        )
        self.lora_simulator = LoRaSimulator(
            config.LORA_PAYLOAD_SIZE,
            config.TRANSMISSION_PROBABILITY
        )
        self.setup_parking_lots()
        
    def setup_parking_lots(self):
        print("Setting up parking lots...")
        
        for i, lot_config in enumerate(config.PARKING_LOTS_CONFIG, 1):
            lot_id = f"CLJ_{i:03d}"
            lot = ParkingLot(
                lot_id,
                lot_config["name"],
                lot_config["lat"],
                lot_config["lon"],
                lot_config["spots"]
            )
            self.parking_lots.append(lot)
            
            for spot_num in range(1, lot_config["spots"] + 1):
                sensor_id = f"SENSOR_{lot_id}_{spot_num:04d}"
                sensor = ParkingSensor(
                    sensor_id, lot, spot_num,
                    config.ULTRASONIC_RANGE,
                    config.NOISE_LEVEL,
                    config.ERROR_PROBABILITY
                )
                self.sensors.append(sensor)
        
        print(f"Created {len(self.parking_lots)} parking lots with {len(self.sensors)} sensors")
    
    def simulate(self, duration_hours=1, interval_seconds=10):
        print(f"\nStarting simulation for {duration_hours} hour(s)...")
        print(f"Update interval: {interval_seconds} seconds")
        print("-" * 60)
        
        start_time = time.time()
        end_time = start_time + (duration_hours * 3600)
        cycle = 0
        
        try:
            while time.time() < end_time:
                cycle += 1
                current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                print(f"\nCycle {cycle} - {current_time}")
                
                readings = self.generate_sensor_readings()
                self.process_and_transmit(readings)
                self.update_parking_occupancy()
                self.display_status()
                
                time.sleep(interval_seconds)
                
        except KeyboardInterrupt:
            print("\nSimulation stopped by user")
        
        finally:
            self.display_final_stats()
    
    def generate_sensor_readings(self):
        readings = []
        for sensor in self.sensors:
            reading = sensor.generate_reading()
            readings.append(reading)
        return readings
    
    def process_and_transmit(self, readings):
        transmitted_data = []
        
        for reading in readings:
            # Device-level preprocessing
            processed = self.preprocessor.preprocess_sensor_data(reading)
            
            if self.preprocessor.should_transmit(processed):
                # Prepare for LoRaWAN transmission
                payload, size = self.lora_simulator.prepare_payload(processed)
                
                success = self.lora_simulator.simulate_transmission(payload)
                
                if success:
                    transmitted_data.append({
                        'sensor_id': processed['sensor_id'],
                        'payload_size': size,
                        'timestamp': processed['timestamp']
                    })
        
        print(f"Transmitted {len(transmitted_data)} readings via LoRaWAN")
        return transmitted_data
    
    def update_parking_occupancy(self):
        for lot in self.parking_lots:
            occupied_count = sum(1 for sensor in self.sensors 
                               if sensor.parking_lot.lot_id == lot.lot_id 
                               and sensor.is_occupied)
            
            # Add some randomness to simulate real-world variations
            occupied_count = max(0, min(lot.total_spots, 
                                      occupied_count + random.randint(-2, 2)))
            
            lot.update_occupancy(occupied_count)
    
    def display_status(self):
        print("\nCurrent Parking Status:")
        print("=" * 50)
        for lot in self.parking_lots:  
            print(f"{lot.name}: {lot.get_availability()}/{lot.total_spots} available "
                  f"({lot.get_occupancy_rate():.1f}% occupied)")
        
    
    def display_final_stats(self):
        print("\n" + "="*60)
        print("SIMULATION STATISTICS")
        print("="*60)
        
        lora_stats = self.lora_simulator.get_stats()
        print(f"LoRaWAN Transmissions: {lora_stats['total_transmissions']}")
        print(f"Failed transmissions: {lora_stats['failed_transmissions']}")
        print(f"Success rate: {lora_stats['success_rate']}%")
        
        total_readings = sum(sensor.reading_count for sensor in self.sensors)
        print(f"Total sensor readings: {total_readings}")
        
        total_spots = sum(lot.total_spots for lot in self.parking_lots)
        occupied_spots = sum(lot.occupied_spots for lot in self.parking_lots)
        occupancy_rate = (occupied_spots / total_spots) * 100 if total_spots > 0 else 0
        print(f"Overall occupancy: {occupancy_rate:.1f}% ({occupied_spots}/{total_spots} spots)")
    
    def generate_test_data(self, num_samples=1000):
        print(f"Generating {num_samples} test samples...")
        test_data = []
        
        for _ in range(num_samples):
            sensor = random.choice(self.sensors)
            reading = sensor.generate_reading()
            processed = self.preprocessor.preprocess_sensor_data(reading)
            test_data.append(processed)
            
            # Occasionally change state for variety
            if random.random() < 0.3:
                sensor.is_occupied = not sensor.is_occupied
        
        filename = f"data/parking_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w') as f:
            json.dump(test_data, f, indent=2)
        
        print(f"Test data saved to {filename}")
        return test_data

def main():
    simulator = ParkingSystemSimulator()
    
    #simulator.generate_test_data(500)
    
    simulator.simulate(duration_hours=1, interval_seconds=10)

if __name__ == "__main__":
    main()