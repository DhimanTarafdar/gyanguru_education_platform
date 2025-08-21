// =====================================
// 🧭 MONGODB COMPASS CONNECTION CHECKER
// =====================================
// MongoDB Compass এর সাথে connection issues diagnose এবং solve করার জন্য

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkCompassConnection() {
    console.log('🧭 MongoDB Compass Connection Diagnostics শুরু হচ্ছে...\n'.cyan.bold);
    
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
        console.log('❌ MONGODB_URI environment variable পাওয়া যায়নি!'.red.bold);
        return;
    }
    
    console.log('📋 Connection URI Analysis:'.yellow.bold);
    console.log('URI:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//[USERNAME]:[PASSWORD]@'));
    
    // Parse URI components
    try {
        const url = new URL(uri);
        console.log('✅ URI Format: Valid'.green);
        console.log('🏠 Host:', url.hostname);
        console.log('🔐 Username:', url.username);
        console.log('🗄️ Database:', url.pathname.replace('/', '') || 'Default');
        console.log('⚙️ Options:', url.search);
    } catch (error) {
        console.log('❌ URI Format: Invalid'.red.bold);
        console.log('Error:', error.message);
        return;
    }
    
    console.log('\n🔍 Connection Test শুরু হচ্ছে...');
    
    const client = new MongoClient(uri);
    
    try {
        // Connect to MongoDB
        console.log('📡 Connecting...');
        await client.connect();
        console.log('✅ Connection: Successful!'.green.bold);
        
        // Test database operations
        const db = client.db();
        console.log('🗄️ Database Name:', db.databaseName);
        
        // List collections
        const collections = await db.listCollections().toArray();
        console.log('📁 Collections Count:', collections.length);
        
        // Test ping
        const adminDb = client.db('admin');
        const pingResult = await adminDb.command({ ping: 1 });
        console.log('🏓 Ping Test:', pingResult.ok ? 'Success' : 'Failed');
        
        // Get server info
        const serverStatus = await adminDb.command({ serverStatus: 1 });
        console.log('🖥️ Server Version:', serverStatus.version);
        console.log('🏗️ Server Host:', serverStatus.host);
        
        console.log('\n✅ সব test successful! MongoDB Compass এও connect হবে।'.green.bold);
        
    } catch (error) {
        console.log('\n❌ Connection Failed!'.red.bold);
        console.log('Error Type:', error.name);
        console.log('Error Message:', error.message);
        
        // Provide specific solutions
        console.log('\n💡 সমাধানের উপায়:'.yellow.bold);
        
        if (error.message.includes('authentication failed')) {
            console.log('🔐 Authentication Error:');
            console.log('  - MongoDB Atlas এ username/password check করুন');
            console.log('  - Password এ special characters থাকলে URL encode করুন');
            console.log('  - @ = %40, # = %23, $ = %24');
        }
        
        if (error.message.includes('network') || error.message.includes('timeout')) {
            console.log('🌐 Network Error:');
            console.log('  - Internet connection check করুন');
            console.log('  - MongoDB Atlas Network Access এ IP address add করুন');
            console.log('  - Firewall settings check করুন');
        }
        
        if (error.message.includes('hostname') || error.message.includes('ENOTFOUND')) {
            console.log('🏠 Hostname Error:');
            console.log('  - Cluster URL সঠিক কিনা check করুন');
            console.log('  - DNS resolution check করুন');
        }
        
    } finally {
        await client.close();
        console.log('\n🔒 Connection closed.');
    }
}

// Generate Compass Connection String
function generateCompassConnectionString() {
    const uri = process.env.MONGODB_URI;
    
    console.log('\n🧭 MongoDB Compass Connection Guide:'.cyan.bold);
    console.log('=' * 50);
    
    if (!uri) {
        console.log('❌ MONGODB_URI not found!');
        return;
    }
    
    // Clean URI for Compass
    const compassUri = uri.replace(/\?.*$/, ''); // Remove query parameters for basic connection
    const fullUri = uri; // Keep full URI with parameters
    
    console.log('\n📋 Connection Options:'.yellow.bold);
    console.log('\n1️⃣ Basic Connection (Recommended):');
    console.log(compassUri);
    
    console.log('\n2️⃣ Full Connection with Parameters:');
    console.log(fullUri);
    
    console.log('\n📖 Compass এ কিভাবে connect করবেন:'.green.bold);
    console.log('Step 1: MongoDB Compass open করুন');
    console.log('Step 2: "New Connection" এ click করুন');
    console.log('Step 3: উপরের URI copy করে paste করুন');
    console.log('Step 4: "Connect" button এ click করুন');
    
    console.log('\n⚠️ Common Issues এবং Solutions:'.red.bold);
    console.log('❌ IP Whitelist: MongoDB Atlas এ 0.0.0.0/0 add করুন');
    console.log('❌ Password: Special characters URL encode করুন');
    console.log('❌ Network: VPN/Proxy disable করে try করুন');
    console.log('❌ Firewall: Port 27017 open করুন');
}

// Network diagnostics
async function networkDiagnostics() {
    console.log('\n🌐 Network Diagnostics:'.cyan.bold);
    
    const dns = require('dns').promises;
    const net = require('net');
    
    try {
        // Extract hostname from URI
        const uri = process.env.MONGODB_URI;
        const url = new URL(uri);
        const hostname = url.hostname;
        
        console.log('🔍 DNS Resolution Test...');
        const addresses = await dns.lookup(hostname);
        console.log('✅ DNS Resolution: Success');
        console.log('🏠 Resolved IP:', addresses.address);
        
        console.log('\n🔌 Port Connectivity Test...');
        const port = 27017;
        
        const socket = new net.Socket();
        const timeout = 5000;
        
        const portTest = new Promise((resolve, reject) => {
            socket.setTimeout(timeout);
            socket.connect(port, hostname, () => {
                socket.destroy();
                resolve(true);
            });
            socket.on('error', reject);
            socket.on('timeout', () => reject(new Error('Connection timeout')));
        });
        
        await portTest;
        console.log('✅ Port 27017: Accessible');
        
    } catch (error) {
        console.log('❌ Network Issue:', error.message);
        console.log('\n💡 Solutions:');
        console.log('  - Check internet connection');
        console.log('  - Disable VPN/Proxy temporarily');
        console.log('  - Check firewall settings');
        console.log('  - Try from different network');
    }
}

// Main function
async function main() {
    try {
        await checkCompassConnection();
        generateCompassConnectionString();
        await networkDiagnostics();
        
        console.log('\n🎯 Quick Fix Commands:'.magenta.bold);
        console.log('1. MongoDB restart: net stop MongoDB && net start MongoDB');
        console.log('2. DNS flush: ipconfig /flushdns');
        console.log('3. Compass reset: Delete %APPDATA%\\MongoDB Compass\\');
        
    } catch (error) {
        console.log('❌ Diagnostic failed:', error.message);
    }
}

// Add colors support
const colors = require('colors');

// Run diagnostics
main();
