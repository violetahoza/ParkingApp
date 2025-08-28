# Simulation parameters
SIMULATION_DURATION_HOURS = 24
UPDATE_INTERVAL_SECONDS = 60
SENSOR_UPDATE_FREQUENCY = 30 # seconds between sensor readings

PARKING_LOTS_CONFIG = [
    {"name": "Piața Unirii Parking", "lat": 46.7696, "lon": 23.5899, "spots": 150},
    {"name": "Iulius Mall Parking", "lat": 46.7712, "lon": 23.6234, "spots": 400},
    {"name": "Central Park Parking", "lat": 46.7645, "lon": 23.5943, "spots": 80},
    {"name": "BT Arena Parking", "lat": 46.7563, "lon": 23.5712, "spots": 300},
    {"name": "Vivo! Cluj Parking", "lat": 46.7491, "lon": 23.5734, "spots": 500},
]

# Sensor parameters
ULTRASONIC_RANGE = (0.5, 4.0) # meters
DETECTION_THRESHOLD = 2.0 # meters
NOISE_LEVEL = 0.1
ERROR_PROBABILITY = 0.05 # 5% chance of false reading

# LoRaWAN simulation parameters
LORA_PAYLOAD_SIZE = 51 # bytes (typical LoRaWAN payload limit)
TRANSMISSION_PROBABILITY = 0.8 # probability of successful transmission

# Data preprocessing parameters
CONFIDENCE_THRESHOLD = 0.6
HEARTBEAT_INTERVAL = 10 # send heartbeat every 10 readings