const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static('uploads'));

const uploadsDir = 'uploads/profiles';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${req.user.userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// const mqtt = require('mqtt');

// const WSL_IP = '192.168.183.170';
// let mqttClient = null;

// const LOT_ID_MAPPING = {
//   'CLJ_001': 'Piața Unirii Parking',
//   'CLJ_002': 'Iulius Mall Parking', 
//   'CLJ_006': 'Central Park Parking',
//   'CLJ_003': 'BT Arena Parking',
//   'CLJ_004': 'Vivo! Cluj Parking'
// };


// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, licensePlate, vehicleMake, vehicleModel } = req.body;

    const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Start transaction to ensure data consistency
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create user
      const [userResult] = await connection.execute(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        [email, hashedPassword]
      );

      const userId = userResult.insertId;

      // Create user profile
      await connection.execute(
        'INSERT INTO user_profiles (user_id, first_name, last_name, phone, license_plate) VALUES (?, ?, ?, ?, ?)',
        [userId, firstName, lastName, phone, licensePlate]
      );

      // Create primary vehicle 
      await connection.execute(
        'INSERT INTO user_vehicles (user_id, license_plate, make, model, color, year, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, licensePlate, vehicleMake, vehicleModel, null, null, true]
      );

      await connection.commit();
      connection.release();

      // Generate JWT
      const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          phone,
          licensePlate,
          vehicleMake,
          vehicleModel
        }
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const [users] = await pool.execute(
      `SELECT u.id, u.email, u.password_hash, up.first_name, up.last_name, up.phone, up.license_plate, up.profile_image_url
       FROM users u 
       LEFT JOIN user_profiles up ON u.id = up.user_id 
       WHERE u.email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        licensePlate: user.license_plate,
        profileImageUrl: user.profile_image_url
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profile Routes
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT u.id, u.email, up.first_name, up.last_name, up.phone, up.license_plate, up.profile_image_url
       FROM users u 
       JOIN user_profiles up ON u.id = up.user_id 
       WHERE u.id = ?`,
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        licensePlate: user.license_plate,
        profileImageUrl: user.profile_image_url
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, licensePlate } = req.body;

    await pool.execute(
      'UPDATE user_profiles SET first_name = ?, last_name = ?, phone = ?, license_plate = ? WHERE user_id = ?',
      [firstName, lastName, phone, licensePlate, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change Password Route
app.put('/api/profile/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get current user
    const [users] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedNewPassword, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profile Photo Routes
app.post('/api/profile/upload-photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;

    // Get current photo to delete it
    const [users] = await pool.execute(
      'SELECT up.profile_image_url FROM user_profiles up WHERE up.user_id = ?',
      [req.user.userId]
    );

    const currentPhoto = users[0]?.profile_image_url;

    // Update database
    await pool.execute(
      'UPDATE user_profiles SET profile_image_url = ? WHERE user_id = ?',
      [photoUrl, req.user.userId]
    );

    // Delete old photo if it exists
    if (currentPhoto && currentPhoto.startsWith('/uploads/')) {
      const oldPhotoPath = path.join(__dirname, currentPhoto);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      photoUrl: photoUrl
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/profile/remove-photo', authenticateToken, async (req, res) => {
  try {
    // Get current photo
    const [users] = await pool.execute(
      'SELECT up.profile_image_url FROM user_profiles up WHERE up.user_id = ?',
      [req.user.userId]
    );

    const currentPhoto = users[0]?.profile_image_url;

    // Remove from database
    await pool.execute(
      'UPDATE user_profiles SET profile_image_url = NULL WHERE user_id = ?',
      [req.user.userId]
    );

    // Delete file if it exists
    if (currentPhoto && currentPhoto.startsWith('/uploads/')) {
      const photoPath = path.join(__dirname, currentPhoto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    res.json({
      success: true,
      message: 'Profile photo removed successfully'
    });
  } catch (error) {
    console.error('Remove photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vehicle Management Routes
app.get('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const [vehicles] = await pool.execute(
      `SELECT id, license_plate, make, model, color, year, is_primary, created_at 
       FROM user_vehicles 
       WHERE user_id = ? 
       ORDER BY is_primary DESC, created_at DESC`,
      [req.user.userId]
    );

    res.json({
      success: true,
      vehicles
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const { licensePlate, make, model, color, year } = req.body;

    const [existingVehicle] = await pool.execute(
      'SELECT id FROM user_vehicles WHERE user_id = ? AND license_plate = ?',
      [req.user.userId, licensePlate]
    );

    if (existingVehicle.length > 0) {
      return res.status(400).json({ error: 'Vehicle with this license plate already exists' });
    }

    const [existingVehicles] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_vehicles WHERE user_id = ?',
      [req.user.userId]
    );

    const isPrimary = existingVehicles[0].count === 0;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute(
        'INSERT INTO user_vehicles (user_id, license_plate, make, model, color, year, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.user.userId, licensePlate, make, model, color || null, year || null, isPrimary]
      );

      if (isPrimary) {
        await connection.execute(
          'UPDATE user_profiles SET license_plate = ? WHERE user_id = ?',
          [licensePlate, req.user.userId]
        );
      }

      await connection.commit();
      connection.release();

      res.status(201).json({
        success: true,
        message: 'Vehicle added successfully'
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/vehicles/:vehicleId', authenticateToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { licensePlate, make, model, color, year } = req.body;

    // Verify vehicle belongs to user
    const [vehicles] = await pool.execute(
      'SELECT id FROM user_vehicles WHERE id = ? AND user_id = ?',
      [vehicleId, req.user.userId]
    );

    if (vehicles.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    await pool.execute(
      'UPDATE user_vehicles SET license_plate = ?, make = ?, model = ?, color = ?, year = ? WHERE id = ? AND user_id = ?',
      [licensePlate, make, model, color || null, year || null, vehicleId, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Vehicle updated successfully'
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set Primary Vehicle Route
app.put('/api/vehicles/:vehicleId/set-primary', authenticateToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // Verify vehicle belongs to user
    const [vehicles] = await pool.execute(
      'SELECT id FROM user_vehicles WHERE id = ? AND user_id = ?',
      [vehicleId, req.user.userId]
    );

    if (vehicles.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Remove primary status from all user vehicles
    await pool.execute(
      'UPDATE user_vehicles SET is_primary = FALSE WHERE user_id = ?',
      [req.user.userId]
    );

    // Set this vehicle as primary
    await pool.execute(
      'UPDATE user_vehicles SET is_primary = TRUE WHERE id = ? AND user_id = ?',
      [vehicleId, req.user.userId]
    );

    // Update user profile with primary vehicle license plate
    const [primaryVehicle] = await pool.execute(
      'SELECT license_plate FROM user_vehicles WHERE id = ?',
      [vehicleId]
    );

    if (primaryVehicle.length > 0) {
      await pool.execute(
        'UPDATE user_profiles SET license_plate = ? WHERE user_id = ?',
        [primaryVehicle[0].license_plate, req.user.userId]
      );
    }

    res.json({
      success: true,
      message: 'Primary vehicle updated successfully'
    });
  } catch (error) {
    console.error('Set primary vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/vehicles/:vehicleId', authenticateToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // Verify vehicle belongs to user
    const [vehicles] = await pool.execute(
      'SELECT is_primary FROM user_vehicles WHERE id = ? AND user_id = ?',
      [vehicleId, req.user.userId]
    );

    if (vehicles.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check total number of vehicles for this user
    const [vehicleCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_vehicles WHERE user_id = ?',
      [req.user.userId]
    );

    // Prevent deletion if this is the only vehicle
    if (vehicleCount[0].count === 1) {
      return res.status(400).json({ error: 'Cannot delete your only vehicle. Add another vehicle first.' });
    }

    // Prevent deletion of primary vehicle without setting another as primary
    if (vehicles[0].is_primary) {
      return res.status(400).json({ error: 'Cannot delete primary vehicle. Set another vehicle as primary first.' });
    }

    await pool.execute(
      'DELETE FROM user_vehicles WHERE id = ? AND user_id = ?',
      [vehicleId, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Account Route
app.delete('/api/profile/delete-account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    console.log('Delete account request for user:', req.user.userId);

    // Verify password
    const [users] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(password, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    // Check for active reservations
    const [activeReservations] = await pool.execute(
      'SELECT COUNT(*) as count FROM reservations WHERE user_id = ? AND status = ? AND end_time > NOW()',
      [req.user.userId, 'active']
    );

    if (activeReservations[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete account with active reservations' });
    }

    // Get profile photo to delete
    const [profiles] = await pool.execute(
      'SELECT profile_image_url FROM user_profiles WHERE user_id = ?',
      [req.user.userId]
    );

    const profilePhoto = profiles[0]?.profile_image_url;

    // Start transaction to ensure data consistency
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Delete in correct order due to foreign key constraints
      await connection.execute('DELETE FROM reservations WHERE user_id = ?', [req.user.userId]);
      await connection.execute('DELETE FROM user_vehicles WHERE user_id = ?', [req.user.userId]);
      await connection.execute('DELETE FROM user_profiles WHERE user_id = ?', [req.user.userId]);
      await connection.execute('DELETE FROM users WHERE id = ?', [req.user.userId]);

      await connection.commit();
      connection.release();

      // Delete profile photo if exists
      if (profilePhoto && profilePhoto.startsWith('/uploads/')) {
        const photoPath = path.join(__dirname, profilePhoto);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      }

      console.log('Account deleted successfully for user:', req.user.userId);

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Parking Lots Routes
app.get('/api/parking-lots', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    // Simple query without complex distance calculation for now
    let query = `
      SELECT 
        pl.id,
        pl.name,
        pl.address,
        pl.latitude,
        pl.longitude,
        pl.total_spots,
        pl.hourly_rate,
        pl.operating_hours_start,
        pl.operating_hours_end,
        pl.description,
        pl.amenities,
        COUNT(CASE WHEN ps.is_available = TRUE THEN 1 END) as available_spots
      FROM parking_lots pl
      LEFT JOIN parking_spots ps ON pl.id = ps.lot_id
      GROUP BY pl.id, pl.name, pl.address, pl.latitude, pl.longitude, pl.total_spots, pl.hourly_rate, pl.operating_hours_start, pl.operating_hours_end, pl.description, pl.amenities
      ORDER BY pl.name
    `;

    const [lots] = await pool.execute(query);

    res.json({
      success: true,
      parkingLots: lots.map(lot => ({
        ...lot,
        amenities: typeof lot.amenities === 'string' ? JSON.parse(lot.amenities || '{}') : (lot.amenities || {})
      }))
    });
  } catch (error) {
    console.error('Parking lots fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/parking-lots/:lotId/spots', async (req, res) => {
  try {
    const { lotId } = req.params;

    const [spots] = await pool.execute(
      `SELECT id, spot_number, is_available, spot_type 
       FROM parking_spots 
       WHERE lot_id = ? 
       ORDER BY spot_number`,
      [lotId]
    );

    res.json({
      success: true,
      spots
    });
  } catch (error) {
    console.error('Parking spots fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reservations Routes
app.get('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const [reservations] = await pool.execute(
      `SELECT 
        r.id,
        r.start_time,
        r.end_time,
        r.total_cost,
        r.status,
        r.payment_status,
        r.created_at,
        ps.spot_number,
        pl.name as parking_lot_name,
        pl.address,
        pl.latitude,
        pl.longitude
       FROM reservations r
       JOIN parking_spots ps ON r.spot_id = ps.id
       JOIN parking_lots pl ON ps.lot_id = pl.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.userId]
    );

    res.json({
      success: true,
      reservations
    });
  } catch (error) {
    console.error('Reservations fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const { spotId, startTime, endTime, totalCost } = req.body;

    console.log('🎯 Creating reservation with data:', {
      spotId,
      startTime,
      endTime,
      totalCost,
      userId: req.user.userId
    });

    const formatDateForMySQL = (isoString) => {
      const date = new Date(isoString);
      
      const formatted = date.toLocaleString('sv-SE', {
        timeZone: 'Europe/Bucharest',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace('T', ' ');
      
      console.log('🕐 TIME CONVERSION:', {
        original_iso: isoString,
        romania_mysql: formatted
      });
      
      return formatted;
    };

    const formattedStartTime = formatDateForMySQL(startTime);
    const formattedEndTime = formatDateForMySQL(endTime);

    console.log('🎯 Formatted times for Romania timezone:', {
      original_start: startTime,
      formatted_start: formattedStartTime,
      original_end: endTime,
      formatted_end: formattedEndTime
    });

    const [spots] = await pool.execute(
      'SELECT is_available FROM parking_spots WHERE id = ?',
      [spotId]
    );

    if (spots.length === 0) {
      console.log('❌ Parking spot not found:', spotId);
      return res.status(404).json({ error: 'Parking spot not found' });
    }

    if (!spots[0].is_available) {
      console.log('❌ Parking spot not available:', spotId);
      return res.status(400).json({ error: 'Parking spot is not available' });
    }

    const [conflicts] = await pool.execute(
      `SELECT id FROM reservations 
       WHERE spot_id = ? AND status = 'active' 
       AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))`,
      [spotId, formattedStartTime, formattedStartTime, formattedEndTime, formattedEndTime]
    );

    if (conflicts.length > 0) {
      console.log('❌ Time slot conflicts with existing reservation');
      return res.status(400).json({ error: 'Time slot conflicts with existing reservation' });
    }

    console.log('✅ All checks passed, creating reservation...');

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [result] = await connection.execute(
        'INSERT INTO reservations (user_id, spot_id, start_time, end_time, total_cost) VALUES (?, ?, ?, ?, ?)',
        [req.user.userId, spotId, formattedStartTime, formattedEndTime, totalCost]
      );

      console.log('✅ Reservation created with ID:', result.insertId);

      await connection.execute(
        'UPDATE parking_spots SET is_available = FALSE WHERE id = ?',
        [spotId]
      );

      console.log('✅ Spot marked as unavailable');

      await connection.commit();
      connection.release();

      res.status(201).json({
        success: true,
        message: 'Reservation created successfully',
        reservationId: result.insertId
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Reservation creation error:', error);
    
    if (error.code === 'ER_TRUNCATED_WRONG_VALUE') {
      console.error('❌ DateTime format error:', error.sqlMessage);
      return res.status(400).json({ error: 'Invalid date/time format' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/reservations/check-expired', async (req, res) => {
  try {
    const now = new Date().toLocaleString('sv-SE', {
      timeZone: 'Europe/Bucharest',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace('T', ' ');

    console.log('🕐 Checking expired reservations at:', now);

    const [expiredReservations] = await pool.execute(
      'SELECT id, spot_id FROM reservations WHERE status = ? AND end_time <= ?',
      ['active', now]
    );

    if (expiredReservations.length > 0) {
      console.log(`🕐 Found ${expiredReservations.length} expired reservations`);

      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        const reservationIds = expiredReservations.map(r => r.id);
        await connection.execute(
          `UPDATE reservations SET status = 'completed' WHERE id IN (${reservationIds.map(() => '?').join(',')})`,
          reservationIds
        );

        const spotIds = expiredReservations.map(r => r.spot_id);
        await connection.execute(
          `UPDATE parking_spots SET is_available = TRUE WHERE id IN (${spotIds.map(() => '?').join(',')})`,
          spotIds
        );

        await connection.commit();
        connection.release();

        console.log('✅ Expired reservations processed successfully');
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    }

    res.json({
      success: true,
      expiredCount: expiredReservations.length,
      message: `Processed ${expiredReservations.length} expired reservations`
    });
  } catch (error) {
    console.error('❌ Error checking expired reservations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/reservations/:reservationId/cancel', authenticateToken, async (req, res) => {
  try {
    const { reservationId } = req.params;

    const [reservations] = await pool.execute(
      'SELECT spot_id, user_id, status FROM reservations WHERE id = ?',
      [reservationId]
    );

    if (reservations.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = reservations[0];

    if (reservation.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (reservation.status !== 'active') {
      return res.status(400).json({ error: 'Reservation cannot be cancelled' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute(
        'UPDATE reservations SET status = ? WHERE id = ?',
        ['cancelled', reservationId]
      );

      await connection.execute(
        'UPDATE parking_spots SET is_available = TRUE WHERE id = ?',
        [reservation.spot_id]
      );

      await connection.commit();
      connection.release();

      console.log('✅ Reservation cancelled and spot made available:', {
        reservationId,
        spotId: reservation.spot_id
      });

      res.json({
        success: true,
        message: 'Reservation cancelled successfully'
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Reservation cancellation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/reservations/:reservationId/extend', authenticateToken, async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { additionalHours } = req.body;

    console.log('🔄 Extending reservation:', { reservationId, additionalHours, userId: req.user.userId });

    if (!additionalHours || additionalHours < 1 || additionalHours > 6) {
      return res.status(400).json({ error: 'Additional hours must be between 1 and 6' });
    }

    const [reservations] = await pool.execute(
      `SELECT r.*, ps.lot_id, pl.hourly_rate 
       FROM reservations r
       JOIN parking_spots ps ON r.spot_id = ps.id
       JOIN parking_lots pl ON ps.lot_id = pl.id
       WHERE r.id = ?`,
      [reservationId]
    );

    if (reservations.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = reservations[0];

    if (reservation.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (reservation.status !== 'active') {
      return res.status(400).json({ error: 'Only active reservations can be extended' });
    }

    const now = new Date().toLocaleString('sv-SE', {
      timeZone: 'Europe/Bucharest',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace('T', ' ');

    if (new Date(reservation.end_time) <= new Date(now)) {
      return res.status(400).json({ error: 'Cannot extend expired reservation' });
    }

    const currentEndTime = new Date(reservation.end_time);
    const newEndTime = new Date(currentEndTime.getTime() + (additionalHours * 60 * 60 * 1000));
    
    const formattedNewEndTime = newEndTime.toLocaleString('sv-SE', {
      timeZone: 'Europe/Bucharest',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace('T', ' ');

    const additionalCost = parseFloat((reservation.hourly_rate * additionalHours).toFixed(2));
    const newTotalCost = parseFloat((parseFloat(reservation.total_cost) + additionalCost).toFixed(2));

    const [conflicts] = await pool.execute(
      `SELECT id FROM reservations 
       WHERE spot_id = ? AND status = 'active' AND id != ?
       AND start_time < ? AND end_time > ?`,
      [reservation.spot_id, reservationId, formattedNewEndTime, reservation.end_time]
    );

    if (conflicts.length > 0) {
      return res.status(400).json({ error: 'Extension conflicts with another reservation' });
    }

    console.log('🔄 Extension details:', {
      currentEndTime: reservation.end_time,
      newEndTime: formattedNewEndTime,
      additionalCost,
      newTotalCost
    });

    await pool.execute(
      'UPDATE reservations SET end_time = ?, total_cost = ? WHERE id = ?',
      [formattedNewEndTime, newTotalCost, reservationId]
    );

    console.log('✅ Reservation extended successfully');

    res.json({
      success: true,
      message: 'Reservation extended successfully',
      extension: {
        additionalHours,
        additionalCost,
        newEndTime: formattedNewEndTime,
        newTotalCost
      }
    });
  } catch (error) {
    console.error('❌ Extend reservation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Demo user creation endpoint
app.post('/api/create-demo-user', async (req, res) => {
  try {
    const demoEmail = 'demo@parking.com';
    const demoPassword = 'demo123';

    // Check if demo user already exists
    const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [demoEmail]);
    
    if (existingUsers.length > 0) {
      return res.json({ success: true, message: 'Demo user already exists' });
    }

    // Create demo user
    const hashedPassword = await bcrypt.hash(demoPassword, 10);
    
    const [userResult] = await pool.execute(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [demoEmail, hashedPassword]
    );

    // Create demo user profile
    await pool.execute(
      'INSERT INTO user_profiles (user_id, first_name, last_name, phone, license_plate) VALUES (?, ?, ?, ?, ?)',
      [userResult.insertId, 'Demo', 'User', '+40712345999', 'CJ99DEMO']
    );

    res.json({
      success: true,
      message: 'Demo user created successfully',
      credentials: {
        email: demoEmail,
        password: demoPassword
      }
    });
  } catch (error) {
    console.error('Demo user creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await pool.execute('SELECT 1');
    res.json({ 
      success: true, 
      message: 'Server is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database connection failed' 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
  }
  
  res.status(500).json({ error: 'Internal server error' });
});



// Start server
app.listen(PORT, () => {
  console.log(`🚀 Smart Parking API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📱 Ready for mobile app connections`);
  
});