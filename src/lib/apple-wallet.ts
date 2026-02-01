/**
 * ShiftCards™ - Apple Wallet Pass Generation
 *
 * Creates signed .pkpass files for Apple Wallet.
 *
 * Requirements:
 * 1. Pass Type ID registered in Apple Developer Portal
 * 2. Pass Type ID Certificate (exported as .p12 → converted to .pem)
 * 3. WWDR Intermediate Certificate from Apple
 *
 * Environment Variables:
 * - APPLE_PASS_TYPE_ID: e.g., "pass.com.l7shift.shiftcard"
 * - APPLE_TEAM_ID: Your Apple Developer Team ID
 * - APPLE_PASS_CERT: Base64-encoded .pem certificate content (or path)
 * - APPLE_PASS_KEY: Base64-encoded private key content (or path)
 * - APPLE_PASS_KEY_PASSPHRASE: Optional passphrase for private key
 * - APPLE_WWDR_CERT: Base64-encoded WWDR certificate (or path)
 */

// Dynamic import to prevent build-time analysis of passkit-generator
// This fixes the "Collecting build traces" hanging issue
import { CardHolder, getTheme, WalletTheme } from './wallet-templates'
import path from 'path'
import fs from 'fs'

// =============================================================================
// TYPES
// =============================================================================

export interface AppleWalletConfig {
  passTypeIdentifier: string
  teamIdentifier: string
  signerCert: string | Buffer
  signerKey: string | Buffer
  signerKeyPassphrase?: string
  wwdr: string | Buffer
}

export interface PassGenerationResult {
  success: boolean
  buffer?: Buffer
  error?: string
  filename?: string
}

// =============================================================================
// CERTIFICATE HELPERS
// =============================================================================

/**
 * Load certificate from environment variable or file path
 * Supports base64-encoded content or file paths
 */
function loadCertificate(envValue: string | undefined): Buffer | null {
  if (!envValue) return null

  // Check if it's a file path
  if (envValue.startsWith('/') || envValue.startsWith('./')) {
    try {
      return fs.readFileSync(envValue)
    } catch {
      console.error(`Failed to read certificate file: ${envValue}`)
      return null
    }
  }

  // Check if it's base64 encoded
  if (envValue.includes('-----BEGIN')) {
    return Buffer.from(envValue)
  }

  // Assume base64 encoded
  try {
    return Buffer.from(envValue, 'base64')
  } catch {
    console.error('Failed to decode certificate from base64')
    return null
  }
}

/**
 * Get Apple Wallet configuration from environment
 */
export function getAppleWalletConfig(): AppleWalletConfig | null {
  const passTypeId = process.env.APPLE_PASS_TYPE_ID
  const teamId = process.env.APPLE_TEAM_ID
  const certEnv = process.env.APPLE_PASS_CERT
  const keyEnv = process.env.APPLE_PASS_KEY
  const wwdrEnv = process.env.APPLE_WWDR_CERT

  if (!passTypeId || !teamId) {
    console.error('Missing APPLE_PASS_TYPE_ID or APPLE_TEAM_ID')
    return null
  }

  const signerCert = loadCertificate(certEnv)
  const signerKey = loadCertificate(keyEnv)
  const wwdr = loadCertificate(wwdrEnv)

  if (!signerCert || !signerKey || !wwdr) {
    console.error('Missing or invalid Apple Wallet certificates')
    return null
  }

  return {
    passTypeIdentifier: passTypeId,
    teamIdentifier: teamId,
    signerCert,
    signerKey,
    signerKeyPassphrase: process.env.APPLE_PASS_KEY_PASSPHRASE,
    wwdr,
  }
}

// =============================================================================
// PASS GENERATION
// =============================================================================

/**
 * Generate a signed .pkpass file for Apple Wallet
 */
export async function generateAppleWalletPass(
  holder: CardHolder,
  config?: AppleWalletConfig
): Promise<PassGenerationResult> {
  const walletConfig = config || getAppleWalletConfig()

  if (!walletConfig) {
    return {
      success: false,
      error: 'Apple Wallet not configured. Missing certificates or environment variables.',
    }
  }

  const theme = getTheme(holder.themeId || 'l7-shift')
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://l7shift.com'
  const serialNumber = `${holder.id}-${Date.now()}`

  try {
    // Dynamic import to prevent build-time trace analysis
    const { PKPass } = await import('passkit-generator')

    // Create the pass
    const pass = new PKPass(
      {},
      {
        signerCert: walletConfig.signerCert,
        signerKey: walletConfig.signerKey,
        signerKeyPassphrase: walletConfig.signerKeyPassphrase,
        wwdr: walletConfig.wwdr,
      },
      {
        formatVersion: 1,
        passTypeIdentifier: walletConfig.passTypeIdentifier,
        serialNumber,
        teamIdentifier: walletConfig.teamIdentifier,
        organizationName: theme.organizationName,
        description: `${holder.name} - Digital Business Card`,
        logoText: theme.logoText || theme.organizationName,

        // Colors (RGB format)
        backgroundColor: hexToRgb(theme.backgroundColor),
        foregroundColor: hexToRgb(theme.foregroundColor),
        labelColor: hexToRgb(theme.labelColor),

        // Web service for updates
        webServiceURL: `${baseUrl}/api/wallet/apple`,
        authenticationToken: serialNumber,
      }
    )

    // Set pass type to generic (best for business cards)
    pass.type = 'generic'

    // Primary fields - Name
    pass.primaryFields.push({
      key: 'name',
      label: 'NAME',
      value: holder.name,
    })

    // Secondary fields - Title & Company
    pass.secondaryFields.push(
      {
        key: 'title',
        label: 'TITLE',
        value: holder.title,
      },
      {
        key: 'company',
        label: 'COMPANY',
        value: holder.company,
      }
    )

    // Auxiliary fields - Contact info
    pass.auxiliaryFields.push(
      {
        key: 'email',
        label: 'EMAIL',
        value: holder.email,
      },
      {
        key: 'phone',
        label: 'PHONE',
        value: holder.phone,
      }
    )

    // Back fields - Additional info
    pass.backFields.push(
      {
        key: 'website',
        label: 'WEBSITE',
        value: holder.website,
      }
    )

    if (holder.socials?.linkedin) {
      pass.backFields.push({
        key: 'linkedin',
        label: 'LINKEDIN',
        value: holder.socials.linkedin,
      })
    }

    if (holder.socials?.twitter) {
      pass.backFields.push({
        key: 'twitter',
        label: 'X / TWITTER',
        value: holder.socials.twitter,
      })
    }

    if (holder.tagline) {
      pass.backFields.push({
        key: 'about',
        label: 'ABOUT',
        value: holder.tagline,
      })
    }

    pass.backFields.push({
      key: 'poweredBy',
      label: 'POWERED BY',
      value: 'ShiftCards™ by L7 Shift',
    })

    // QR Code linking to digital profile
    pass.setBarcodes({
      format: 'PKBarcodeFormatQR',
      message: `${baseUrl}/card/${holder.id}`,
      messageEncoding: 'iso-8859-1',
      altText: 'Scan for full profile',
    })

    // NOTE: NFC in Apple Wallet passes
    // - Requires VAS-compliant terminals (Apple NDA protocol)
    // - Does NOT support phone-to-phone tap transfer
    // - setNFC() has known issues that can break passes
    // - For business cards, QR code is the standard sharing method
    //
    // If NFC reader integration is needed later, it requires:
    // 1. VAS-compliant terminal hardware
    // 2. Merchant ID registration with Apple
    // 3. NFC-specific entitlements

    // Add images
    await addPassImages(pass, theme, baseUrl)

    // Generate the .pkpass buffer
    const buffer = pass.getAsBuffer()

    return {
      success: true,
      buffer,
      filename: `${holder.name.replace(/\s+/g, '_')}_ShiftCard.pkpass`,
    }
  } catch (error) {
    console.error('Failed to generate Apple Wallet pass:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating pass',
    }
  }
}

/**
 * Add images to the pass
 */
async function addPassImages(pass: any, theme: WalletTheme, baseUrl: string): Promise<void> {
  const publicDir = path.join(process.cwd(), 'public')

  // Icon (required) - 29x29 @1x, 58x58 @2x, 87x87 @3x
  const iconPath = theme.assets.appleIcon
    ? path.join(publicDir, theme.assets.appleIcon)
    : path.join(publicDir, 'wallet-assets/l7/icon.png')

  if (fs.existsSync(iconPath)) {
    pass.addBuffer('icon.png', fs.readFileSync(iconPath))
  } else {
    // Generate a simple icon placeholder
    pass.addBuffer('icon.png', await generatePlaceholderIcon(theme))
  }

  // Logo (optional) - 160x50 @1x
  const logoPath = theme.assets.appleLogo
    ? path.join(publicDir, theme.assets.appleLogo)
    : path.join(publicDir, 'wallet-assets/l7/logo.png')

  if (fs.existsSync(logoPath)) {
    pass.addBuffer('logo.png', fs.readFileSync(logoPath))
  }

  // Strip image (optional) - behind primary fields
  const stripPath = theme.assets.appleStrip
    ? path.join(publicDir, theme.assets.appleStrip)
    : path.join(publicDir, 'wallet-assets/l7/strip.png')

  if (fs.existsSync(stripPath)) {
    pass.addBuffer('strip.png', fs.readFileSync(stripPath))
  }
}

/**
 * Generate a placeholder icon if none exists
 * Uses sharp if available, otherwise returns a minimal valid PNG
 */
async function generatePlaceholderIcon(theme: WalletTheme): Promise<Buffer> {
  try {
    const sharp = require('sharp')

    // Create a simple colored square icon
    const svg = `
      <svg width="87" height="87" xmlns="http://www.w3.org/2000/svg">
        <rect width="87" height="87" fill="${theme.backgroundColor}"/>
        <text x="43.5" y="55" font-family="Helvetica, Arial, sans-serif" font-size="32"
              font-weight="bold" fill="${theme.labelColor}" text-anchor="middle">L7</text>
      </svg>
    `

    return await sharp(Buffer.from(svg))
      .png()
      .toBuffer()
  } catch {
    // Return a minimal 1x1 transparent PNG if sharp is not available
    // This is a valid PNG that won't cause errors
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABsAAAAbCAYAAACN1PRVAAAADklEQVRIx2NgGAWjYGgBAAK7AAE4o' +
        'mXCAAAAAElFTkSuQmCC',
      'base64'
    )
  }
}

/**
 * Convert hex color to RGB string format for Apple Wallet
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return 'rgb(10, 10, 10)'
  return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
}

// =============================================================================
// SHARING / NFC INFORMATION
// =============================================================================

/**
 * Apple Wallet Pass Sharing Capabilities
 *
 * How passes can be shared:
 *
 * 1. QR Code (built into pass)
 *    - Recipient scans QR → opens digital profile URL
 *    - Works cross-platform (iPhone → Android)
 *
 * 2. AirDrop
 *    - iPhone → iPhone/Mac
 *    - Sends .pkpass file directly
 *
 * 3. Messages/Email
 *    - Attach .pkpass file or share link
 *    - Works cross-platform
 *
 * 4. NameDrop (iOS 17+)
 *    - Note: NameDrop is for Contact Cards, not Wallet Passes
 *    - For business card sharing, use QR code or AirDrop
 *
 * 5. NFC
 *    - Apple Wallet passes do NOT support tap-to-transfer between devices
 *    - NFC in passes is for reading by NFC readers (e.g., door access)
 *    - For tap-sharing, the QR code approach is standard
 *
 * Cross-Platform Strategy:
 * - The QR code on the pass links to the web profile
 * - Web profile has "Add to Google Wallet" button
 * - This enables iPhone → Android sharing via scan
 */

export const SHARING_INFO = {
  qrCode: 'QR code links to digital profile - works on any device',
  airdrop: 'AirDrop sends .pkpass file to other Apple devices',
  messages: 'Share via Messages/Email - attach .pkpass or share profile link',
  nfc: 'NFC is for readers, not device-to-device transfer. Use QR code instead.',
  crossPlatform: 'iPhone → Android: Scan QR code on pass → opens web profile → Add to Google Wallet',
}
