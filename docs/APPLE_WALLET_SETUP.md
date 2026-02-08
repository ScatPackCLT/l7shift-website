# Apple Wallet Setup Guide - ShiftCards™

## Overview

This guide walks through setting up Apple Wallet pass generation for ShiftCards digital business cards.

## Current Implementation Status

✅ **Completed:**
- `passkit-generator` package installed
- Apple Wallet API route (`/api/wallet/apple`)
- Pass generation library (`/lib/apple-wallet.ts`)
- Card page with Apple Wallet button (device-aware)
- All required image assets generated
- Certificate setup helper script

⏳ **Pending (Your Action Required):**
- Create Pass Type ID in Apple Developer Portal
- Generate and configure certificates

## Step-by-Step Certificate Setup

### 1. Create Pass Type ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Identifiers** in the sidebar
4. Click the **+** button
5. Select **Pass Type IDs** and click Continue
6. Enter:
   - **Description:** L7 Shift ShiftCard
   - **Identifier:** `pass.com.l7shift.shiftcard`
7. Click **Register**

### 2. Create Pass Type ID Certificate

1. In Identifiers, click on your Pass Type ID
2. Under **Production Certificates**, click **Create Certificate**
3. Follow the Certificate Signing Request (CSR) instructions:
   - Open **Keychain Access** on your Mac
   - Go to **Keychain Access → Certificate Assistant → Request a Certificate**
   - Enter your email and select **Saved to disk**
4. Upload the CSR file
5. Download the certificate
6. Double-click to install in Keychain

### 3. Export Certificate as .p12

1. Open **Keychain Access**
2. Find your Pass Type ID certificate (look for "Pass Type ID: pass.com.l7shift.shiftcard")
3. Right-click → **Export**
4. Save as `.p12` format
5. Set a password (remember this)

### 4. Convert to PEM Files

Run the provided setup script:

```bash
cd /Users/kjleftwich/Desktop/claude-projects/L7Shift/website
./scripts/setup-apple-wallet-certs.sh /path/to/your/exported.p12
```

Or manually:

```bash
# Extract certificate
openssl pkcs12 -in cert.p12 -clcerts -nokeys -out signerCert.pem

# Extract private key
openssl pkcs12 -in cert.p12 -nocerts -out signerKey.pem

# Remove passphrase from key (optional)
openssl rsa -in signerKey.pem -out signerKey.pem

# Download WWDR certificate
curl -o AppleWWDRCAG4.cer https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
```

### 5. Set Environment Variables

#### For Local Development (.env.local)

```bash
# Find your Team ID in Keychain Access (certificate info → Organizational Unit)
APPLE_PASS_TYPE_ID=pass.com.l7shift.shiftcard
APPLE_TEAM_ID=YOUR_TEAM_ID

# Base64 encode the PEM files:
# cat signerCert.pem | base64 | tr -d '\n'
APPLE_PASS_CERT="<base64-encoded-signerCert.pem>"

# cat signerKey.pem | base64 | tr -d '\n'
APPLE_PASS_KEY="<base64-encoded-signerKey.pem>"

# If you set a passphrase on the key:
APPLE_PASS_KEY_PASSPHRASE=your-passphrase

# cat wwdr.pem | base64 | tr -d '\n'
APPLE_WWDR_CERT="<base64-encoded-wwdr.pem>"
```

#### For Vercel Production

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable above
3. Redeploy

## Testing

### Local Test

1. Start the dev server: `npm run dev`
2. Visit `http://localhost:3000/card/ken`
3. Click "Add to Apple Wallet" (on iOS) or both buttons (on desktop)
4. The pass should download as `Ken_Leftwich_ShiftCard.pkpass`

### iOS Simulator Test

1. Build the pass using the API
2. Drag the `.pkpass` file into iOS Simulator
3. The pass should display and offer to add to Wallet

## Sharing Capabilities

### Sharing Methods Overview

| Method | Description | Platform |
|--------|-------------|----------|
| **NameDrop (NFC)** | Tap iPhones together | iPhone ↔ iPhone (iOS 17+) |
| **QR Code** | Scan QR on Wallet pass | Any device |
| **AirDrop** | Share .pkpass or link | Apple devices |
| **Messages/Email** | Send link | Any device |
| **Website** | Visit l7shift.com/card/ken | Any device |

### NameDrop (iOS 17+ NFC Sharing)

NameDrop allows iPhone users to share contact info by tapping phones together.

**Important:** NameDrop shares your **Contact Card** (from Contacts app), NOT your Wallet Pass.

**Setup for Ken to use NameDrop:**
1. Visit `l7shift.com/card/ken` on iPhone
2. Click "Save Contact" → adds Ken to Contacts
3. Go to Settings → Contacts → My Card → select Ken's card
4. Now NameDrop shares Ken's info when tapping phones

**What gets shared via NameDrop:**
- Name, title, company
- Phone, email, website
- Digital card URL (in notes field)

**Requirements:**
- Both iPhones running iOS 17+
- AirDrop enabled on both devices
- Settings → General → AirDrop → "Bringing Devices Together" ON

### Cross-Platform Flow (iPhone → Android)

NameDrop doesn't work with Android. Use the QR code instead:

1. Ken opens Wallet pass on iPhone
2. Shows QR code on pass
3. Android user scans QR
4. Opens `l7shift.com/card/ken` in browser
5. Android user clicks "Add to Google Wallet"

### Physical NFC Card Option

For true tap-to-share to ANY phone (iPhone or Android):

1. Get a blank NFC card/tag (Amazon, ~$2-5 each)
2. Use NFC Tools app to write URL: `https://l7shift.com/card/ken`
3. When anyone taps their phone to it → opens digital card
4. They can add to Apple Wallet or Google Wallet from there

This gives you:
- Tap to share with ANY smartphone
- No app needed on recipient's phone
- Works with both iPhone and Android

## File Locations

| File | Purpose |
|------|---------|
| `/src/lib/apple-wallet.ts` | Pass generation library |
| `/src/app/api/wallet/apple/route.ts` | API endpoint |
| `/src/app/card/[slug]/page.tsx` | Card page with wallet buttons |
| `/public/wallet-assets/l7/*.png` | Pass images |
| `/scripts/setup-apple-wallet-certs.sh` | Certificate setup helper |
| `/certs/` | Generated certificate files (gitignored) |

## Troubleshooting

### "Apple Wallet not configured"
- Check all 5 environment variables are set
- Verify PEM files are valid: `openssl x509 -in signerCert.pem -text -noout`

### Pass won't add to Wallet
- Verify Pass Type ID matches certificate exactly
- Check Team ID is correct
- Ensure WWDR certificate is the G4 version (current)
- Check Xcode/Simulator console for errors

### Certificate errors
- Make sure you're using the Pass Type ID certificate, not a regular developer cert
- The certificate must be issued for your specific Pass Type ID
- WWDR intermediate cert must be included

## Resources

- [Apple Wallet Developer Guide](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/)
- [Building a Pass](https://developer.apple.com/documentation/walletpasses/building-a-pass)
- [Apple Certificate Authority](https://www.apple.com/certificateauthority/)
- [passkit-generator Documentation](https://github.com/alexandercerutti/passkit-generator)
