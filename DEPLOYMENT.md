# Deployment Instructions

## Backend Deployment (Render)

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Deploy on Render**:
   - Go to [render.com](https://render.com) and sign up/log in
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `monad-visualizer` repository
   - Configure the service:
     - **Name**: `monad-visualizer-backend`
     - **Root Directory**: `backend`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT server:app`
   - Add Environment Variables:
     - `HYPERSYNC_BEARER_TOKEN`: (your actual token)
   - Click "Create Web Service"

3. **Note your backend URL**: After deployment, you'll get a URL like `https://your-app-name.onrender.com`

## Frontend Deployment (Vercel)

1. **Update the production API URL**:
   - Edit `frontend/.env.production` and replace `your-backend-url.onrender.com` with your actual Render URL from step 3 above

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign up/log in
   - Click "New Project"
   - Import your GitHub repository
   - Configure the project:
     - **Framework Preset**: Vite
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   - Add Environment Variables:
     - `VITE_API_URL`: `https://your-backend-url.onrender.com` (from Render deployment)
   - Click "Deploy"

## Important Notes

- **CORS**: Make sure your backend allows requests from your Vercel domain
- **Environment Variables**: Keep your `HYPERSYNC_BEARER_TOKEN` secure
- **Database**: If you add a database later, consider using Render's PostgreSQL or another service
- **Domain**: You can add custom domains to both Render and Vercel

## Local Development

- Backend: Use `python server.py` in the backend folder
- Frontend: Use `npm run dev` in the frontend folder
- Environment files are set up for both development and production

## Troubleshooting

- Check deployment logs in both Render and Vercel dashboards
- Ensure all environment variables are set correctly
- Verify that the API URL in production matches your Render deployment URL
