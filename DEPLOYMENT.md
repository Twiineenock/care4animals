# Care4Animals V2 Deployment Guide

This guide provides step-by-step instructions for deploying the Care4Animals V2 platform.

## 1. Backend Deployment (Render)

1. **Create a Render Account**: Sign up at [render.com](https://render.com).
2. **New Web Service**:
   - Connect your GitHub repository.
   - Select the `Care4AnimalsV2` repository.
   - Render should automatically detect the `render.yaml` file. If not, use these settings:
     - **Runtime**: `Python 3`
     - **Build Command**: `pip install -r backend/requirements.txt`
     - **Start Command**: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker --chdir backend app.main:app`
3. **Environment Variables**: Add the following in the Render Dashboard:
   - `DATABASE_URL`: Your Supabase connection string (already configured in `.env`).
   - `FRONTEND_URL`: The URL of your Vercel deployment (e.g., `https://care4animals.vercel.app`).
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key.

## 2. Frontend Deployment (Vercel)

1. **Create a Vercel Account**: Sign up at [vercel.com](https://vercel.com).
2. **New Project**:
   - Connect your GitHub repository.
   - Select the `Care4AnimalsV2` repository.
   - **Root Directory**: Select the `frontend` folder.
   - **Framework Preset**: Vite (should be auto-detected).
3. **Environment Variables**: Add the following in the Vercel Dashboard:
   - `VITE_API_URL`: The URL of your Render backend (e.g., `https://care4animals-backend.onrender.com`).

## 3. Post-Deployment Verification

1. Access your Vercel URL.
2. Check if data is loading from the backend (check the Network tab in your browser's Developer Tools if there are issues).
3. Ensure the Admin Dashboard can fetch analytics.

> [!NOTE]
> Render's free tier services "spin down" after inactivity. The first request after a period of inactivity may take 30-60 seconds to respond.
