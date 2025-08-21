// =====================================
// 🌐 IP ADDRESS CHECKER FOR MONGODB ATLAS
// =====================================

const https = require('https');

async function getCurrentIP() {
    console.log('🔍 আপনার Current IP Address খুঁজে বের করা হচ্ছে...\n'.cyan.bold);
    
    try {
        // Method 1: Using ipify service
        const ipifyPromise = new Promise((resolve, reject) => {
            https.get('https://api.ipify.org?format=json', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        resolve(result.ip);
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', reject);
        });
        
        const ip = await ipifyPromise;
        console.log('🌐 আপনার Public IP Address:', ip.green.bold);
        
        console.log('\n📋 MongoDB Atlas IP Whitelist এ এই steps follow করুন:'.yellow.bold);
        console.log('1. MongoDB Atlas Dashboard এ login করুন');
        console.log('2. আপনার Cluster select করুন');
        console.log('3. "Network Access" tab এ যান');
        console.log('4. "Add IP Address" button এ click করুন');
        console.log('5. "Add Current IP Address" select করুন অথবা');
        console.log(`6. Manually এই IP add করুন: ${ip}`);
        console.log('7. অথবা সব IP allow করতে: 0.0.0.0/0 add করুন');
        
        console.log('\n⚠️ Security Note:'.red.bold);
        console.log('Production এ 0.0.0.0/0 use করবেন না। শুধু development এ।');
        
        console.log('\n🔄 Alternative IPs to try:'.magenta.bold);
        console.log('- Current IP:', ip);
        console.log('- Allow All: 0.0.0.0/0');
        console.log('- Local Range: 192.168.0.0/16');
        console.log('- Private Range: 10.0.0.0/8');
        
        return ip;
        
    } catch (error) {
        console.log('❌ IP Address পেতে সমস্যা:', error.message.red);
        console.log('\n💡 Manual IP check করুন:');
        console.log('- Google এ search করুন: "what is my ip"');
        console.log('- অথবা visit করুন: https://whatismyipaddress.com/');
    }
}

async function testMongoDBAtlasAccess() {
    console.log('\n🧪 MongoDB Atlas Access Test করা হচ্ছে...\n'.cyan.bold);
    
    const testHosts = [
        'gayanguru.qru9o30.mongodb.net',
        'cluster0.mongodb.net',
        'atlas.mongodb.com'
    ];
    
    for (const host of testHosts) {
        try {
            console.log(`🔍 Testing ${host}...`);
            
            const testPromise = new Promise((resolve, reject) => {
                const req = https.request({
                    hostname: host,
                    port: 443,
                    path: '/',
                    method: 'HEAD',
                    timeout: 5000
                }, (res) => {
                    resolve(res.statusCode);
                });
                
                req.on('error', reject);
                req.on('timeout', () => reject(new Error('Timeout')));
                req.end();
            });
            
            await testPromise;
            console.log(`✅ ${host}: Accessible`.green);
            
        } catch (error) {
            console.log(`❌ ${host}: ${error.message}`.red);
        }
    }
}

function generateCompassInstructions() {
    console.log('\n🧭 MongoDB Compass এ Connect করার Instructions:'.yellow.bold);
    console.log('=' * 60);
    
    console.log('\n📝 Step-by-Step Guide:');
    console.log('1. MongoDB Compass application open করুন');
    console.log('2. Welcome screen এ "New Connection" click করুন');
    console.log('3. Connection String field এ paste করুন:');
    console.log('   mongodb+srv://dhiman:dhiman%402003@gayanguru.qru9o30.mongodb.net/gyanguru'.green);
    console.log('4. "Connect" button এ click করুন');
    
    console.log('\n🔧 যদি উপরের method কাজ না করে:');
    console.log('1. "Fill in connection fields individually" select করুন');
    console.log('2. এই values দিন:');
    console.log('   - Hostname: gayanguru.qru9o30.mongodb.net');
    console.log('   - Port: 27017');
    console.log('   - Authentication: Username/Password');
    console.log('   - Username: dhiman');
    console.log('   - Password: dhiman@2003');
    console.log('   - Authentication Database: admin');
    console.log('   - SSL: Yes');
    
    console.log('\n⚡ Quick Fixes:');
    console.log('- Compass restart করুন');
    console.log('- Windows restart করুন');
    console.log('- Different WiFi/Mobile data try করুন');
    console.log('- VPN disable করুন');
    console.log('- Antivirus temporarily disable করুন');
}

async function main() {
    const colors = require('colors');
    
    console.log('🧭 MongoDB Compass Connection Helper'.rainbow.bold);
    console.log('=====================================\n');
    
    await getCurrentIP();
    await testMongoDBAtlasAccess();
    generateCompassInstructions();
    
    console.log('\n🎯 সারাংশ:'.magenta.bold);
    console.log('✅ Application connection কাজ করছে');
    console.log('❓ Compass connection এর জন্য উপরের steps follow করুন');
    console.log('📞 যদি সমস্যা থাকে, IP whitelist check করুন');
}

main().catch(console.error);
