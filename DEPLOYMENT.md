# Deployment Guide for MMC Backend

## SSL/TLS Error Resolution

The error you're encountering (`ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR`) is typically caused by:

1. **MongoDB Atlas SSL certificate issues**
2. **Network/firewall restrictions**
3. **TLS version incompatibility**
4. **Missing or incorrect environment variables**

## Step-by-Step Deployment to Render

### 1. Environment Variables Setup

In your Render dashboard, add these environment variables:

```
MONGODB_URI=mongodb+srv://ashayjinturkar2:9pTfy35Fxqseef0M@cluster0.hkirdlo.mongodb.net/?retryWrites=true&w=majority&ssl=true&sslValidate=true
NODE_ENV=production
PORT=10000
```

**Important**: Replace the MongoDB URI with your actual connection string.

### 2. MongoDB Atlas Configuration

1. **Network Access**: Ensure your Render IP is whitelisted in MongoDB Atlas
   - Go to Network Access in MongoDB Atlas
   - Add `0.0.0.0/0` to allow all IPs (for development)
   - Or add Render's specific IP range

2. **Database User**: Verify your database user has proper permissions
   - Username: `ashayjinturkar2`
   - Password: `9pTfy35Fxqseef0M`
   - Role: `Atlas admin` or appropriate permissions

3. **SSL Settings**: Ensure SSL is enabled
   - Connection string must include `ssl=true&sslValidate=true`

### 3. Alternative MongoDB Connection String

If SSL issues persist, try this alternative format:

```
MONGODB_URI=mongodb+srv://ashayjinturkar2:9pTfy35Fxqseef0M@cluster0.hkirdlo.mongodb.net/?retryWrites=true&w=majority&ssl=true&sslValidate=true&tls=true&tlsAllowInvalidCertificates=false
```

### 4. Render Deployment Settings

1. **Build Command**: `npm install`
2. **Start Command**: `npm start`
3. **Environment**: `Node`
4. **Plan**: `Free` (or upgrade if needed)

### 5. Troubleshooting SSL Issues

#### Option A: Force TLS 1.2
Add to your environment variables:
```
NODE_OPTIONS=--tls-min-v1.2
```

#### Option B: Disable SSL Validation (NOT recommended for production)
```
MONGODB_URI=mongodb+srv://ashayjinturkar2:9pTfy35Fxqseef0M@cluster0.hkirdlo.mongodb.net/?retryWrites=true&w=majority&ssl=true&sslValidate=false
```

#### Option C: Use MongoDB Driver Options
The code now includes proper MongoDB connection options with:
- SSL validation enabled
- Connection pooling
- Timeout settings
- IPv4 forcing

### 6. Testing Connection

After deployment, test your connection:

1. **Health Check**: Visit `/api/test` endpoint
2. **Database Test**: Check if MongoDB connects successfully
3. **Logs**: Monitor Render logs for connection errors

### 7. Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| SSL Handshake Failed | Check MongoDB Atlas SSL settings |
| Connection Timeout | Verify network access and IP whitelisting |
| Authentication Failed | Check username/password in connection string |
| TLS Version Error | Add NODE_OPTIONS environment variable |

### 8. Security Notes

- ✅ **DO**: Use environment variables for sensitive data
- ✅ **DO**: Enable SSL validation in production
- ✅ **DO**: Use strong passwords and proper user roles
- ❌ **DON'T**: Hardcode credentials in source code
- ❌ **DON'T**: Disable SSL validation in production

### 9. Monitoring and Logs

1. **Render Logs**: Monitor deployment and runtime logs
2. **MongoDB Atlas**: Check connection logs and metrics
3. **Application Logs**: Monitor your app's connection attempts

### 10. Rollback Plan

If deployment fails:
1. Check environment variables
2. Verify MongoDB Atlas settings
3. Review Render logs
4. Test connection locally first
5. Use previous working deployment if needed

## Need Help?

If SSL issues persist:
1. Check MongoDB Atlas status page
2. Verify your connection string format
3. Test connection locally with the same credentials
4. Contact MongoDB Atlas support if needed
5. Check Render's network configuration
