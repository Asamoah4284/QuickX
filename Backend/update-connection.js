const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n===== MongoDB Atlas Connection String Updater =====\n');
console.log('This utility will help you update your MongoDB connection string.');
console.log('Current connection string (partially hidden):');

const connectionString = process.env.MONGODB_URI || '';
// Show only parts of the connection string to avoid exposing the password
let maskedString = '';
if (connectionString) {
  try {
    // Replace the password part with asterisks
    maskedString = connectionString.replace(
      /(mongodb(\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/,
      '$1*****$4'
    );
  } catch (e) {
    maskedString = 'Invalid connection string format';
  }
}

console.log(maskedString || 'No connection string found');
console.log('\nPlease enter your MongoDB Atlas connection details:');

rl.question('Username: ', (username) => {
  rl.question('Password: ', (password) => {
    rl.question('Cluster URL (e.g., cluster0.abc123.mongodb.net): ', (cluster) => {
      rl.question('Database name: ', (database) => {
        
        // Construct the new connection string
        const newConnectionString = `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority`;
        
        // Load current .env file
        const envPath = path.join(__dirname, '.env');
        let envContent = '';
        
        try {
          envContent = fs.readFileSync(envPath, 'utf8');
        } catch (err) {
          console.error('Could not read .env file:', err.message);
          envContent = '';
        }
        
        // Update or add the MONGODB_URI
        if (envContent.includes('MONGODB_URI=')) {
          envContent = envContent.replace(
            /MONGODB_URI=.*/,
            `MONGODB_URI=${newConnectionString}`
          );
        } else {
          envContent += `\nMONGODB_URI=${newConnectionString}\n`;
        }
        
        // Write back to .env file
        try {
          fs.writeFileSync(envPath, envContent);
          console.log('\n✅ Connection string updated successfully!');
          console.log('You can now test the connection using:');
          console.log('  node test-db-connection.js\n');
        } catch (err) {
          console.error('Error saving .env file:', err.message);
        }
        
        rl.close();
      });
    });
  });
}); 