@echo off
echo =====================================
echo 🧭 MongoDB Compass Connection Fixer
echo =====================================
echo.

echo 🔧 Step 1: DNS Cache Clear করা হচ্ছে...
ipconfig /flushdns
echo ✅ DNS Cache cleared
echo.

echo 🔧 Step 2: Network Adapter Reset করা হচ্ছে...
ipconfig /release
ipconfig /renew
echo ✅ Network Adapter reset
echo.

echo 🔧 Step 3: Winsock Reset করা হচ্ছে...
netsh winsock reset
echo ✅ Winsock reset
echo.

echo 🔧 Step 4: Network Configuration Reset...
netsh int ip reset
echo ✅ Network Configuration reset
echo.

echo 🧭 MongoDB Compass Connection Strings:
echo.
echo 📋 Basic Connection (Copy this):
echo mongodb+srv://dhiman:dhiman%%402003@gayanguru.qru9o30.mongodb.net/gyanguru
echo.
echo 📋 Alternative Connection:
echo mongodb+srv://dhiman:dhiman%%402003@gayanguru.qru9o30.mongodb.net/
echo.

echo ⚠️  Important Notes:
echo 1. Restart your computer after running this script
echo 2. Make sure MongoDB Atlas IP whitelist includes your IP
echo 3. Try connecting with mobile hotspot if still not working
echo 4. Disable VPN/Proxy temporarily
echo.

echo 🎯 Manual Steps for Compass:
echo 1. Open MongoDB Compass
echo 2. Click "New Connection"
echo 3. Paste the connection string above
echo 4. Click "Connect"
echo.

echo 📞 If still not working, check:
echo - MongoDB Atlas Network Access List
echo - Windows Firewall settings
echo - Antivirus blocking Compass
echo - Corporate network restrictions
echo.

pause
