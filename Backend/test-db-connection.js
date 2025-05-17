const mongoose = require('mongoose');
require('dotenv').config();

console.log('Testing MongoDB Atlas connection...');
console.log('MongoDB URI (first few characters):', process.env.MONGODB_URI?.substring(0, 25) + '...');

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 30000,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 30000,
};

// Extract username and database from connection string for visibility
const connectionString = process.env.MONGODB_URI || '';
let visibleInfo = '';
try {
  // Extract just the username and database parts for debugging without exposing password
  const matches = connectionString.match(/@([^/]+)\/([^?]+)/);
  if (matches && matches.length >= 3) {
    const host = matches[1];
    const database = matches[2];
    visibleInfo = `Host: ${host}, Database: ${database}`;
    console.log('Connection details:', visibleInfo);
  }
} catch (err) {
  console.log('Could not parse connection string');
}

// Test the connection
mongoose.connect(process.env.MONGODB_URI, options)
  .then(() => {
    console.log('✅ MongoDB connection successful');
    console.log('Connected to database');
    
    // List all collections in the database
    return mongoose.connection.db.listCollections().toArray();
  })
  .then(collections => {
    console.log('Available collections:', collections.map(c => c.name).join(', '));
    console.log('Connection test complete. You can now use your database!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    
    // Provide more specific error guidance
    if (err.message.includes('bad auth')) {
      console.error('Authentication failed. Please check your username and password in the connection string.');
    } else if (err.message.includes('ENOTFOUND')) {
      console.error('Could not resolve the hostname. Check your connection string for typos.');
    } else if (err.message.includes('timed out')) {
      console.error('Connection timed out. Check your network or firewall settings.');
    }
    
    process.exit(1);
  }); 