# DaruBahi

DaruBahi is a comprehensive full-stack application built to simplify user interactions. It features a modern, responsive mobile app frontend and a robust, scalable backend. The application is designed to be easily deployable on cloud platforms like Railway and Expo.

## Tech Stack

### Frontend
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: React Context
- **Build System**: Expo Application Services (EAS)

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (via Motor for async support)
- **Authentication**: JWT (JSON Web Tokens)
- **External Services**: Twilio (for OTP and SMS verification)
- **Deployment**: Railway

## Features
- Complete OTP-based phone authentication via Twilio.
- Secure, token-based authentication system (JWT).
- High-performance asynchronous backend architecture using FastAPI and Motor.
- Seamless mobile application ready to be built into an Android APK or iOS App via EAS.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- MongoDB instance (local or Atlas)
- Twilio Account (for OTP features)
- Expo CLI

### 1. Backend Setup
Navigate into the backend directory and install the requirements:
```bash
cd backend
python -m venv venv
# Activate the virtual environment:
# On Windows: .\venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate
pip install -r requirements_prod.txt
```

Create a `.env` file in the `backend/` directory with the following variables:
```env
MONGO_URL=your_mongodb_connection_string
JWT_SECRET=your_secret_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_VERIFY_SERVICE_SID=your_twilio_verify_service_sid
NODE_ENV=development
```

Start the backend server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### 2. Frontend Setup
Navigate into the frontend directory and install dependencies:
```bash
cd frontend
npm install
```

Start the Expo development server:
```bash
npx expo start
```
*Note: Make sure your `EXPO_PUBLIC_BACKEND_URL` in `eas.json` or `.env` points to your backend URL (e.g., `http://<your-local-ip>:8001` for local development).*

## Deployment

### Backend (Railway)
The backend is configured to be deployed effortlessly on [Railway](https://railway.app/).
1. Connect this repository to a new Railway project.
2. Railway will automatically detect the `Procfile` and use the Python Nixpacks builder.
3. Ensure you add all backend `.env` variables to your Railway Service Settings.

### Frontend (Expo EAS)
The frontend can be built into an APK or App Bundle using Expo Application Services (EAS).
```bash
cd frontend
npx eas build --platform android --profile preview
```
Make sure to update the `EXPO_PUBLIC_BACKEND_URL` in `frontend/eas.json` before building!

## License
MIT
