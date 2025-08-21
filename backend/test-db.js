const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function testDatabaseConnection() {
    try {
        console.log('🔍 Testing database connection...');
        console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set ✅' : 'Not set ❌');
        
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found in environment variables');
            return;
        }

        console.log('📡 Attempting to connect to MongoDB...');
        
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log('✅ MongoDB Connected Successfully!');
        console.log('📊 Connection details:');
        console.log('  - Host:', mongoose.connection.host);
        console.log('  - Database:', mongoose.connection.name);
        console.log('  - Ready State:', mongoose.connection.readyState);
        
        // Test a simple operation
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📁 Available collections:', collections.length);
        
        // Close connection
        await mongoose.connection.close();
        console.log('🔒 Database connection closed');
        
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error:', error.message);
        
        if (error.message.includes('authentication failed')) {
            console.log('💡 Suggestion: Check your MongoDB username and password');
        } else if (error.message.includes('hostname')) {
            console.log('💡 Suggestion: Check your MongoDB cluster URL');
        } else if (error.message.includes('network')) {
            console.log('💡 Suggestion: Check your internet connection and MongoDB Atlas network access');
        }
    }
}

// Run the test
testDatabaseConnection();
