const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
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

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT token
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

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, licensePlate } = req.body;

    // Check if user exists
    const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [userResult] = await pool.execute(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email, hashedPassword]
    );

    // Create user profile
    await pool.execute(
      'INSERT INTO user_profiles (user_id, first_name, last_name, phone, license_plate) VALUES (?, ?, ?, ?, ?)',
      [userResult.insertId, firstName, lastName, phone, licensePlate]
    );

    // Generate JWT
    const token = jwt.sign({ userId: userResult.insertId, email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: userResult.insertId,
        email,
        firstName,
        lastName,
        phone,
        licensePlate
      }
    });
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
app.post('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const { spotId, startTime, endTime, totalCost } = req.body;

    // Check if spot is available
    const [spots] = await pool.execute(
      'SELECT is_available FROM parking_spots WHERE id = ?',
      [spotId]
    );

    if (spots.length === 0) {
      return res.status(404).json({ error: 'Parking spot not found' });
    }

    if (!spots[0].is_available) {
      return res.status(400).json({ error: 'Parking spot is not available' });
    }

    // Check for conflicting reservations
    const [conflicts] = await pool.execute(
      `SELECT id FROM reservations 
       WHERE spot_id = ? AND status = 'active' 
       AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))`,
      [spotId, startTime, startTime, endTime, endTime]
    );

    if (conflicts.length > 0) {
      return res.status(400).json({ error: 'Time slot conflicts with existing reservation' });
    }

    // Create reservation
    const [result] = await pool.execute(
      'INSERT INTO reservations (user_id, spot_id, start_time, end_time, total_cost) VALUES (?, ?, ?, ?, ?)',
      [req.user.userId, spotId, startTime, endTime, totalCost]
    );

    // Mark spot as unavailable
    await pool.execute(
      'UPDATE parking_spots SET is_available = FALSE WHERE id = ?',
      [spotId]
    );

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      reservationId: result.insertId
    });
  } catch (error) {
    console.error('Reservation creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

app.put('/api/reservations/:reservationId/cancel', authenticateToken, async (req, res) => {
  try {
    const { reservationId } = req.params;

    // Get reservation details
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

    // Cancel reservation
    await pool.execute(
      'UPDATE reservations SET status = ? WHERE id = ?',
      ['cancelled', reservationId]
    );

    // Make spot available again
    await pool.execute(
      'UPDATE parking_spots SET is_available = TRUE WHERE id = ?',
      [reservation.spot_id]
    );

    res.json({
      success: true,
      message: 'Reservation cancelled successfully'
    });
  } catch (error) {
    console.error('Reservation cancellation error:', error);
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
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Smart Parking API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📱 Ready for mobile app connections`);
});