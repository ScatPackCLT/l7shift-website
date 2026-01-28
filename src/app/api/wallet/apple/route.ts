/**
 * ShiftCards™ - Apple Wallet API
 *
 * Generates Apple Wallet .pkpass files.
 * Requires: APPLE_PASS_TYPE_ID, APPLE_TEAM_ID, Apple Developer certificate files
 *
 * Certificate setup:
 * 1. Create Pass Type ID in Apple Developer portal
 * 2. Generate certificate for the Pass Type ID
 * 3. Export as .p12, convert to .pem files
 * 4. Store in environment or secure storage
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  generateApplePass,
  type CardHolder,
} from '@/lib/wallet-templates'

// Card holder data - will move to Supabase later
const cardHolders: Record<string, CardHolder> = {
  ken: {
    id: 'ken',
    name: 'Ken Leftwich',
    title: 'Founder & Chief Architect',
    company: 'L7 Shift',
    tagline: 'Digital transformation for the non-conformist.',
    email: 'ken@l7shift.com',
    phone: '(704) 839-9448',
    website: 'https://l7shift.com',
    socials: {
      linkedin: 'https://linkedin.com/in/kenleftwich',
      twitter: 'https://x.com/CharlotteAgency',
      github: 'https://github.com/ScatPackCLT',
    },
    themeId: 'l7-shift',
  },
}

/**
 * GET /api/wallet/apple?id=ken
 * Returns Apple Wallet pass (.pkpass file) or setup instructions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const holderId = searchParams.get('id')

    if (!holderId) {
      return NextResponse.json(
        { error: 'Missing card holder ID' },
        { status: 400 }
      )
    }

    const holder = cardHolders[holderId]
    if (!holder) {
      return NextResponse.json(
        { error: 'Card holder not found' },
        { status: 404 }
      )
    }

    // Check for required env vars
    const passTypeId = process.env.APPLE_PASS_TYPE_ID
    const teamId = process.env.APPLE_TEAM_ID
    const certPath = process.env.APPLE_PASS_CERT_PATH
    const certPassword = process.env.APPLE_PASS_CERT_PASSWORD

    // Generate serial number
    const serialNumber = `${holderId}-${Date.now()}`

    // Generate pass.json content
    const passJson = generateApplePass(holder, serialNumber)

    // Return pass definition - signing will be enabled once Apple Developer cert is configured
    // TODO: When cert is ready, install passkit-generator and implement signing
    return NextResponse.json({
      configured: !!(passTypeId && teamId && certPath),
      message: passTypeId && teamId && certPath
        ? 'Apple Wallet configured but signing not yet implemented. Pass definition generated.'
        : 'Apple Wallet certificates not configured. Pass definition generated for preview.',
      setupInstructions: {
        steps: [
          '1. Log into Apple Developer Portal (developer.apple.com)',
          '2. Go to Certificates, Identifiers & Profiles',
          '3. Create a new Pass Type ID (e.g., pass.com.l7shift.shiftcard)',
          '4. Create a certificate for the Pass Type ID',
          '5. Download and install the certificate',
          '6. Export as .p12 file from Keychain',
          '7. Convert to PEM: openssl pkcs12 -in cert.p12 -out cert.pem -nodes',
          '8. Set environment variables:',
          '   - APPLE_PASS_TYPE_ID=pass.com.l7shift.shiftcard',
          '   - APPLE_TEAM_ID=YOUR_TEAM_ID',
          '   - APPLE_PASS_CERT_PATH=/path/to/cert.pem',
          '9. Install passkit-generator: npm install passkit-generator',
        ],
        requiredEnvVars: ['APPLE_PASS_TYPE_ID', 'APPLE_TEAM_ID', 'APPLE_PASS_CERT_PATH'],
      },
      passDefinition: passJson,
    }, { status: 503 })
  } catch (error) {
    console.error('Apple Wallet error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Apple Wallet pass', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/wallet/apple/register
 * Web service endpoint for pass registration (for push updates)
 * Apple calls this when a pass is added to a device
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log device registration for pass updates
    console.log('Apple Wallet device registration:', body)

    // In production, store device token and pass serial for push updates
    // await db.passRegistrations.create({ ... })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Apple Wallet registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
