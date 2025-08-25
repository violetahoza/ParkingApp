from datetime import datetime

class ParkingLot:
    def __init__(self, lot_id, name, latitude, longitude, total_spots):
        self.lot_id = lot_id
        self.name = name
        self.latitude = latitude
        self.longitude = longitude
        self.total_spots = total_spots
        self.occupied_spots = 0
        self.last_update = None
        
    def update_occupancy(self, occupied_count):
        """Update occupancy with bounds checking"""
        self.occupied_spots = min(max(0, occupied_count), self.total_spots)
        self.last_update = self._get_current_timestamp()
        
    def get_availability(self):
        """Get number of available spots"""
        return self.total_spots - self.occupied_spots
    
    def get_occupancy_rate(self):
        """Get occupancy rate as percentage"""
        if self.total_spots == 0:
            return 0
        return (self.occupied_spots / self.total_spots) * 100
    
    def to_dict(self):
        return {
            "lot_id": self.lot_id,
            "name": self.name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "total_spots": self.total_spots,
            "occupied_spots": self.occupied_spots,
            "available_spots": self.get_availability(),
            "occupancy_rate": self.get_occupancy_rate(),
            "last_update": self.last_update
        }
    
    def _get_current_timestamp(self):
        return datetime.now().isoformat()
    
    def __str__(self):
        return f"{self.name} ({self.lot_id}): {self.get_availability()}/{self.total_spots} available"