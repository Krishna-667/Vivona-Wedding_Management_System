# Google OAuth 2.0 (PKCE) Setup Guide for Vivona

This document provides setup instructions for configuring Google Sign-In on Vivona.

---

## 1. Prerequisites
- A Google Cloud Platform (GCP) account: [console.cloud.google.com](https://console.cloud.google.com/)
- Admin access to your project.

---

## 2. Step-by-Step Configuration in Google Cloud Console

### Step 2.1: Create or Select a Project
1. Log in to [Google Cloud Console](https://console.cloud.google.com/).
2. Select your organization or click **New Project** (e.g. `Vivona Wedding Platform`).

### Step 2.2: Configure the OAuth Consent Screen
1. Navigate to **APIs & Services** &rarr; **OAuth consent screen**.
2. Select **External** (or **Internal** if using a Google Workspace organization).
3. Fill in the App Information:
   - **App name:** `Vivona`
   - **User support email:** Select your administrator email.
   - **Developer contact information:** Your tech/admin contact email.
4. Click **Save and Continue**.
5. In **Scopes**, click **Add or Remove Scopes** and select:
   - `.../auth/userinfo.email` (`openid`)
   - `.../auth/userinfo.profile` (`profile`)
   - `openid`
6. Click **Save and Continue**.
7. If the publishing status is "Testing", add test user Google accounts under **Test users**.

### Step 2.3: Create OAuth 2.0 Web Client Credentials
1. Navigate to **APIs & Services** &rarr; **Credentials**.
2. Click **Create Credentials** &rarr; **OAuth client ID**.
3. Choose **Application type:** `Web application`.
4. Enter a name: `Vivona Web Client`.
5. Under **Authorized JavaScript origins**, add:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`
6. Under **Authorized redirect URIs**, add:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
7. Click **Create**.
8. Copy the generated **Client ID** and **Client Secret**.

---

## 3. Environment Variable Configuration

Add the credentials to your local `.env.local` file (never commit secrets to version control):

```env
# Google OAuth 2.0 Configuration
AUTH_GOOGLE_ENABLED=true
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-yourClientSecretKeyHere
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Security Directives
- `GOOGLE_CLIENT_SECRET` is strictly **server-only** and must never be prefixed with `NEXT_PUBLIC_`.
- If `AUTH_GOOGLE_ENABLED=true`, the server will validate the presence of these environment variables on boot and will refuse to start if keys are missing or contain placeholder values.
- If `AUTH_GOOGLE_ENABLED=false`, Google OAuth buttons will gracefully indicate that external OAuth is disabled.
