# 🚀 Render Deployment Guide

## Prerequisites
- GitHub account
- Render account (free)

## Step 1: Push to GitHub
1. Create a new repository on GitHub
2. Push this `backend-render` folder to your GitHub repo
3. Make sure the repo is public (required for free Render plan)

## Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub account
4. Select your repository
5. Configure the service:
   - **Name**: `mmc-backend` (or any name you prefer)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

## Step 3: Set Environment Variables
In Render dashboard, go to your service → Environment:
- `NODE_ENV` = `production`
- `PORT` = `10000`
- `MONGO_URI` = `mongodb+srv://ashayjinturkar2:IvkQd5ZfCHzQPYo2@mmc.hkirdlo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

## Step 4: Deploy
1. Click "Create Web Service"
2. Wait for build to complete (5-10 minutes)
3. Your backend will be available at: `https://your-service-name.onrender.com`

## Step 5: Update Frontend
Update your frontend API configuration to use the new Render URL:
```javascript
// In src/config.js
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-service-name.onrender.com/api'
  : 'http://localhost:5000/api';
```

## ⚠️ Important Notes
- Free plan has limitations: 15 minutes of inactivity timeout
- First request after inactivity will be slow (cold start)
- Service will sleep after 15 minutes of inactivity
- Perfect for development and small projects
