# ⚡ Quick Start - 5 Minutes Setup

## 🎯 Setup in 5 Commands

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Copy environment file (already configured with your Neon DB!)
cp .env.example .env

# 4. Run database migration
npm run migrate

# 5. Create super admin user
npm run create-admin

# 6. Start server
npm run dev
```

## ✨ That's it! Your backend is running!

### 🧪 Test It

```bash
# Test health
curl http://localhost:3000/health

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agrimodel.com","password":"Admin@123"}'
```

### 📱 Connect Flutter App

Your Flutter app is already configured!

Just run:
```bash
cd ..
flutter run
```

Login with:
- **Email:** admin@agrimodel.com
- **Password:** Admin@123

## 🎉 Done!

**Full documentation:** See `SETUP_GUIDE.md` for detailed instructions.

