#!/bin/bash

# =============================================================================
# Apple Wallet Certificate Setup Script
# ShiftCards™ by L7 Shift
# =============================================================================
#
# This script helps convert Apple Wallet certificates to the format needed
# for the passkit-generator library.
#
# Prerequisites:
# 1. Apple Developer account with Wallet capability
# 2. Pass Type ID created (e.g., pass.com.l7shift.shiftcard)
# 3. Certificate downloaded and installed in Keychain
# 4. Certificate exported as .p12 file
#
# Usage:
#   ./scripts/setup-apple-wallet-certs.sh <path-to-p12-file>
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CERTS_DIR="$SCRIPT_DIR/../certs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Apple Wallet Certificate Setup - ShiftCards™           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if p12 file provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: No .p12 file provided${NC}"
    echo ""
    echo "Usage: $0 <path-to-p12-file>"
    echo ""
    echo "Steps to get your .p12 file:"
    echo "1. Open Keychain Access"
    echo "2. Find your Pass Type ID certificate"
    echo "3. Right-click → Export"
    echo "4. Save as .p12 format"
    echo ""
    exit 1
fi

P12_FILE="$1"

if [ ! -f "$P12_FILE" ]; then
    echo -e "${RED}Error: File not found: $P12_FILE${NC}"
    exit 1
fi

# Create certs directory
mkdir -p "$CERTS_DIR"

echo -e "${CYAN}Converting certificate...${NC}"
echo ""

# Extract certificate
echo "→ Extracting signer certificate..."
openssl pkcs12 -in "$P12_FILE" -clcerts -nokeys -out "$CERTS_DIR/signerCert.pem" -passin pass: 2>/dev/null || \
openssl pkcs12 -in "$P12_FILE" -clcerts -nokeys -out "$CERTS_DIR/signerCert.pem" -legacy -passin pass: 2>/dev/null || \
(echo "Enter the password for your .p12 file:" && openssl pkcs12 -in "$P12_FILE" -clcerts -nokeys -out "$CERTS_DIR/signerCert.pem")

# Extract private key
echo "→ Extracting private key..."
openssl pkcs12 -in "$P12_FILE" -nocerts -out "$CERTS_DIR/signerKey.pem" -passin pass: -passout pass: 2>/dev/null || \
openssl pkcs12 -in "$P12_FILE" -nocerts -out "$CERTS_DIR/signerKey.pem" -legacy -passin pass: -passout pass: 2>/dev/null || \
(echo "Enter the password for your .p12 file:" && openssl pkcs12 -in "$P12_FILE" -nocerts -out "$CERTS_DIR/signerKey.pem")

# Remove passphrase from key (optional, makes deployment easier)
echo "→ Processing private key..."
openssl rsa -in "$CERTS_DIR/signerKey.pem" -out "$CERTS_DIR/signerKey.pem" 2>/dev/null || true

echo ""
echo -e "${CYAN}Downloading Apple WWDR Certificate...${NC}"

# Download WWDR certificate (G4 - current)
curl -s -o "$CERTS_DIR/AppleWWDRCAG4.cer" https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
openssl x509 -inform der -in "$CERTS_DIR/AppleWWDRCAG4.cer" -out "$CERTS_DIR/wwdr.pem"

echo ""
echo -e "${GREEN}✅ Certificates generated successfully!${NC}"
echo ""
echo "Files created in $CERTS_DIR:"
ls -la "$CERTS_DIR"

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Base64 encode the certificates for environment variables:"
echo ""
echo -e "   ${GREEN}# Certificate:${NC}"
echo "   cat $CERTS_DIR/signerCert.pem | base64 | tr -d '\n'"
echo ""
echo -e "   ${GREEN}# Private key:${NC}"
echo "   cat $CERTS_DIR/signerKey.pem | base64 | tr -d '\n'"
echo ""
echo -e "   ${GREEN}# WWDR certificate:${NC}"
echo "   cat $CERTS_DIR/wwdr.pem | base64 | tr -d '\n'"
echo ""
echo "2. Set environment variables in Vercel or .env.local:"
echo ""
echo "   APPLE_PASS_TYPE_ID=pass.com.l7shift.shiftcard"
echo "   APPLE_TEAM_ID=<your-team-id>"
echo "   APPLE_PASS_CERT=<base64-encoded-signerCert.pem>"
echo "   APPLE_PASS_KEY=<base64-encoded-signerKey.pem>"
echo "   APPLE_WWDR_CERT=<base64-encoded-wwdr.pem>"
echo ""
echo "3. Find your Team ID:"
echo "   - Open Keychain Access"
echo "   - Select your certificate → Get Info"
echo "   - Look for 'Organizational Unit'"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Generate env var values
echo "Would you like to generate the base64 values now? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo "# Add these to your .env.local or Vercel environment variables:"
    echo ""
    echo "APPLE_PASS_CERT=\"$(cat "$CERTS_DIR/signerCert.pem" | base64 | tr -d '\n')\""
    echo ""
    echo "APPLE_PASS_KEY=\"$(cat "$CERTS_DIR/signerKey.pem" | base64 | tr -d '\n')\""
    echo ""
    echo "APPLE_WWDR_CERT=\"$(cat "$CERTS_DIR/wwdr.pem" | base64 | tr -d '\n')\""
    echo ""
fi
