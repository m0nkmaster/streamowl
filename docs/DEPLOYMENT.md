# Deployment Guide - Deno Deploy

This guide covers deploying Stream Owl to Deno Deploy.

## Prerequisites

- A Deno Deploy account (sign up at https://deno.com/deploy)
- A GitHub repository with your code
- All required environment variables configured

## Step 1: Link Repository to Deno Deploy

1. Log in to [Deno Deploy Dashboard](https://dash.deno.com/)
2. Click "New Project"
3. Select "Import from GitHub repository"
4. Authorise Deno Deploy to access your GitHub account if prompted
5. Select the repository containing Stream Owl
6. Choose the branch to deploy (typically `main`)

## Step 2: Configure Project Settings

### Project Configuration

- **Project Name**: Set a descriptive name (e.g., `stream-owl`)
- **Entrypoint**: `main.ts` (this is the default)
- **Environment**: Production

### Environment Variables

Configure the following environment variables in the Deno Deploy dashboard:

#### Required Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# TMDB API Configuration
TMDB_API_KEY=your-tmdb-api-key-here

# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
```

#### Optional Variables

```bash
# Redis/Upstash Configuration (Optional - for caching)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-rest-token

# OpenAI API Configuration (Required for AI recommendations)
OPENAI_API_KEY=your-openai-api-key-here
```

### Setting Environment Variables

1. In your project settings, navigate to "Environment Variables"
2. Add each variable using the "Add Variable" button
3. Enter the variable name and value
4. Click "Save" after adding all variables

**Important**:

- Never commit actual secrets to the repository
- Use Deno Deploy's environment variable interface for production values
- Ensure `JWT_SECRET` is a strong random string (generate with:
  `openssl rand -hex 32`)

## Step 3: Configure Auto-Deployment

Deno Deploy automatically deploys on push to the configured branch:

1. In project settings, ensure "Auto Deploy" is enabled
2. Select the branch (typically `main`)
3. Deno Deploy will automatically deploy on every push

### Manual Deployment

You can also trigger manual deployments:

1. Go to your project in Deno Deploy dashboard
2. Click "Deploy" button
3. Select the branch and commit to deploy

## Step 4: Database Setup

Before deploying, ensure your production database is set up:

1. **Create Production Database**: Set up a PostgreSQL database (e.g., using
   Supabase, Neon, or Railway)
2. **Run Migrations**: Execute database migrations on production database:
   ```bash
   DATABASE_URL=your-production-database-url deno task migrate
   ```
3. **Verify Database Connection**: Test the connection from Deno Deploy
   environment

## Step 5: Verify Deployment

After deployment:

1. **Check Deployment Status**: Verify deployment succeeded in Deno Deploy
   dashboard
2. **Test Production URL**: Visit your production URL (e.g.,
   `https://your-project.deno.dev`)
3. **Verify Environment Variables**: Check that all environment variables are
   correctly set
4. **Test Key Functionality**:
   - Home page loads
   - Search functionality works
   - Authentication works
   - Database connections work

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Verify all required variables are configured in Deno Deploy dashboard
   - Check variable names match exactly (case-sensitive)

2. **Database Connection Failures**
   - Verify `DATABASE_URL` is correct
   - Ensure database allows connections from Deno Deploy IPs
   - Check database credentials are correct

3. **Build Failures**
   - Check `main.ts` entrypoint is correct
   - Verify all imports resolve correctly
   - Check Deno Deploy logs for specific errors

4. **Runtime Errors**
   - Check Deno Deploy logs in dashboard
   - Verify all dependencies are available
   - Ensure Fresh framework is correctly configured

### Viewing Logs

1. Go to your project in Deno Deploy dashboard
2. Click on a deployment
3. View "Logs" tab for runtime logs
4. Check "Build Logs" for build-time errors

## Post-Deployment Checklist

- [ ] Production site loads correctly
- [ ] Database migrations executed
- [ ] Environment variables configured
- [ ] Authentication works
- [ ] Search functionality works
- [ ] API endpoints respond correctly
- [ ] Error handling works
- [ ] Logs are accessible

## Continuous Deployment

With auto-deploy enabled, every push to the `main` branch will trigger a new
deployment. Ensure:

- All tests pass before pushing
- Database migrations are backward compatible
- Environment variables are updated if needed
- Breaking changes are documented

## Rollback

To rollback to a previous deployment:

1. Go to your project in Deno Deploy dashboard
2. Click on "Deployments"
3. Find the previous working deployment
4. Click "Promote" to make it the active deployment
