const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: false
  },
  isMemberOfMinistry: {
    type: Boolean,
    required: true
  },
  ministry: {
    type: String,
    required: function() {
      return this.isMemberOfMinistry === true;
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

// Routes

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Attendance API is running',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// Create new attendance record
app.post('/api/attendance', async (req, res) => {
  try {
    const { email, fullName, contact, isMemberOfMinistry, ministry } = req.body;

    // Validation
    if (!email || !fullName || isMemberOfMinistry === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['email', 'fullName', 'isMemberOfMinistry']
      });
    }

    if (isMemberOfMinistry && !ministry) {
      return res.status(400).json({ 
        error: 'Ministry is required when isMemberOfMinistry is true'
      });
    }

    const attendance = new Attendance({
      email,
      fullName,
      contact,
      isMemberOfMinistry,
      ministry: isMemberOfMinistry ? ministry : null
    });

    await attendance.save();

    res.status(201).json({ 
      message: 'Attendance recorded successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ 
      error: 'Failed to record attendance',
      details: error.message
    });
  }
});

// Get all attendance records
app.get('/api/attendance', async (req, res) => {
  try {
    const { startDate, endDate, ministry } = req.query;
    let query = {};

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (ministry) {
      query.ministry = ministry;
    }

    const records = await Attendance.find(query).sort({ timestamp: -1 });
    
    res.json({
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ 
      error: 'Failed to fetch attendance records',
      details: error.message
    });
  }
});

// Get attendance record by ID
app.get('/api/attendance/:id', async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json({ data: record });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ 
      error: 'Failed to fetch attendance record',
      details: error.message
    });
  }
});

// Delete attendance record
app.delete('/api/attendance/:id', async (req, res) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json({ 
      message: 'Record deleted successfully',
      data: record
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ 
      error: 'Failed to delete attendance record',
      details: error.message
    });
  }
});

// Get attendance statistics
app.get('/api/stats', async (req, res) => {
  try {
    const total = await Attendance.countDocuments();
    const withMinistry = await Attendance.countDocuments({ isMemberOfMinistry: true });
    const withoutMinistry = await Attendance.countDocuments({ isMemberOfMinistry: false });
    
    const ministryBreakdown = await Attendance.aggregate([
      { $match: { isMemberOfMinistry: true } },
      { $group: { _id: '$ministry', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      total,
      withMinistry,
      withoutMinistry,
      ministryBreakdown
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}`);
});
