import json
import paho.mqtt.client as mqtt
from datetime import datetime
from collections import defaultdict

class EdgeGateway:
    def __init__(self):
        self.sensor_data = defaultdict(list)
        
        self.mqtt_client = mqtt.Client(client_id="edge_gateway_001")
        self.mqtt_client.on_connect = self.on_connect
        self.mqtt_client.on_message = self.on_message
        
    def on_connect(self, client, userdata, flags, rc):
        print(f"✅ Edge Gateway connected (code: {rc})")
        client.subscribe("lora/sensors/+")
        
    def on_message(self, client, userdata, msg):
        try:
            data = json.loads(msg.payload.decode())
            sensor_id = data.get('i', data.get('id', 'unknown'))
            print(f"📥 Received from {sensor_id}")
            
            # Procesează și trimite către cloud
            cloud_topic = f"edge/parking/processed"
            processed_data = {
                'sensor_id': sensor_id,
                'occupied': data.get('o', False),
                'timestamp': datetime.now().isoformat(),
                'processed_by': 'edge_gateway_001'
            }
            
            client.publish(cloud_topic, json.dumps(processed_data))
            print(f"📤 Forwarded to cloud: {sensor_id}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    def start(self):
        print("🚀 Starting Edge Gateway...")
        self.mqtt_client.connect("localhost", 1883, 60)
        self.mqtt_client.loop_forever()

if __name__ == "__main__":
    gateway = EdgeGateway()
    gateway.start()