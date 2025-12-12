# Mix & Match - Setup Guide

## Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project" and follow the steps
   - Enable Google Analytics (optional)

2. **Enable Authentication**
   - In Firebase Console, go to "Authentication" > "Sign-in method"
   - Enable "Google" provider
   - Add your domain to authorized domains

3. **Create Firestore Database**
   - Go to "Firestore Database" > "Create database"
   - Start in production mode
   - Choose a location close to your users

4. **Set Firestore Rules**
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

5. **Get Firebase Config**
   - Go to Project Settings > General
   - Scroll to "Your apps" > Web apps
   - Click "Add app" (</>) icon
   - Copy the config values

6. **Update Environment Variables**
   - Open `.env.local`
   - Replace placeholder values with your Firebase config:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

## Running the App

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Start development server**
   ```bash
   pnpm dev
   ```

3. **Seed ingredients**
   - Navigate to `/admin/ingredients`
   - Click "Seed Ingredients" button

## Features

- **Authentication**: Google sign-in with Firebase Auth
- **Group Creation/Join**: Create groups or join existing ones by name
- **Tinder-style Swiping**: Swipe or click to rate ingredient combinations
- **Real-time Feed**: See group activity in real-time
- **Results Page**: View top combinations and color-coded matrix
- **Admin Panel**: Add new ingredients easily

## Usage Flow

1. Sign in with Google
2. Create a new group or join an existing one
3. Swipe on ingredient combinations (like/dislike/pass)
4. View results to see top-rated combinations
5. Check the feed to see what others are voting on
6. Add new ingredients via `/admin/ingredients`

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript**
- **Tailwind CSS** with shadcn/ui
- **Firebase** (Auth + Firestore)
- **Framer Motion** for swipe animations
