/**
 * ShiftCards™ - Apple Wallet API
 *
 * GET /api/wallet/apple?id=ken
 * Returns a signed .pkpass file for Apple Wallet
 *
 * Setup Requirements:
 * 1. Create Pass Type ID in Apple Developer Portal (e.g., pass.com.l7shift.shiftcard)
 * 2. Create & download certificate for the Pass Type ID
 * 3. Export certificate as .p12 from Keychain Access
 * 4. Convert to PEM files:
 *    - openssl pkcs12 -in cert.p12 -clcerts -nokeys -out signerCert.pem
 *    - openssl pkcs12 -in cert.p12 -nocerts -out signerKey.pem
 * 5. Download WWDR certificate from https://www.apple.com/certificateauthority/
 * 6. Set environment variables (base64 encode the PEM contents):
 *    - APPLE_PASS_TYPE_ID=pass.com.l7shift.shiftcard
 *    - APPLE_TEAM_ID=YOUR_TEAM_ID
 *    - APPLE_PASS_CERT=<base64 of signerCert.pem>
 *    - APPLE_PASS_KEY=<base64 of signerKey.pem>
 *    - APPLE_PASS_KEY_PASSPHRASE=<your passphrase if set>
 *    - APPLE_WWDR_CERT=<base64 of AppleWWDRCA.pem>
 */

// Force dynamic rendering to prevent build-time bundling issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAppleWalletPass, getAppleWalletConfig, SHARING_INFO } from '@/lib/apple-wallet'
import type { CardHolder } from '@/lib/wallet-templates'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

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
        { error: 'Missing card holder ID. Use ?id=ken' },
        { status: 400 }
      )
    }

    // Fetch card data from Supabase
    let cardData: CardHolder | null = null

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const { data: card } = await supabase
        .from('shiftcards')
        .select('*')
        .eq('slug', holderId)
        .eq('published', true)
        .single()

      if (card) {
        cardData = {
          id: card.slug,
          name: card.name,
          title: card.title,
          company: card.company,
          email: card.email,
          phone: card.phone,
          website: card.website,
          tagline: card.tagline,
          photo: card.avatar_url,
          socials: card.socials,
          themeId: card.theme === 'black' ? 'l7-shift' : card.theme,
        }
      }
    }

    // Fallback to hardcoded Ken data if DB not available
    if (!cardData && holderId === 'ken') {
      cardData = {
        id: 'ken',
        name: 'Ken Leftwich',
        title: 'Founder & Chief SymbAIote',
        company: 'L7 Shift',
        email: 'ken@l7shift.com',
        phone: '(704) 839-9448',
        website: 'https://l7shift.com',
        tagline: 'Digital transformation for the non-conformist.',
        socials: {
          linkedin: 'https://www.linkedin.com/in/kennethleftwich/',
          twitter: 'https://x.com/KennethLeftwich',
        },
        themeId: 'l7-shift',
      }
    }

    if (!cardData) {
      return NextResponse.json(
        { error: 'Card holder not found' },
        { status: 404 }
      )
    }

    // Check if Apple Wallet is configured
    const config = getAppleWalletConfig()

    if (!config) {
      // Return setup instructions if not configured
      return NextResponse.json({
        configured: false,
        message: 'Apple Wallet certificates not configured. See setup instructions below.',
        cardHolder: {
          id: cardData.id,
          name: cardData.name,
          company: cardData.company,
        },
        setupInstructions: {
          overview: 'To enable Apple Wallet passes, you need to set up certificates in Apple Developer Portal.',
          steps: [
            '1. Log into Apple Developer Portal (developer.apple.com)',
            '2. Go to Certificates, Identifiers & Profiles → Identifiers',
            '3. Click + and select "Pass Type IDs"',
            '4. Create Pass Type ID: pass.com.l7shift.shiftcard',
            '5. Go to Certificates → click + → select "Pass Type ID Certificate"',
            '6. Select your Pass Type ID and generate certificate',
            '7. Download and install certificate in Keychain Access',
            '8. Export as .p12 file (right-click → Export)',
            '9. Convert to PEM files using openssl commands (see docs)',
            '10. Download WWDR certificate from apple.com/certificateauthority',
            '11. Base64 encode PEM files and set environment variables',
          ],
          requiredEnvVars: [
            'APPLE_PASS_TYPE_ID - e.g., pass.com.l7shift.shiftcard',
            'APPLE_TEAM_ID - Your Apple Developer Team ID',
            'APPLE_PASS_CERT - Base64 encoded signer certificate PEM',
            'APPLE_PASS_KEY - Base64 encoded private key PEM',
            'APPLE_PASS_KEY_PASSPHRASE - Private key passphrase (if set)',
            'APPLE_WWDR_CERT - Base64 encoded Apple WWDR certificate',
          ],
          opensslCommands: [
            '# Extract certificate:',
            'openssl pkcs12 -in cert.p12 -clcerts -nokeys -out signerCert.pem',
            '',
            '# Extract private key:',
            'openssl pkcs12 -in cert.p12 -nocerts -out signerKey.pem',
            '',
            '# Base64 encode for environment variable:',
            'cat signerCert.pem | base64 | tr -d "\\n"',
          ],
          wwdrCertificate: 'https://www.apple.com/certificateauthority/',
        },
        sharingInfo: SHARING_INFO,
      }, { status: 503 })
    }

    // Generate the .pkpass file
    const result = await generateAppleWalletPass(cardData, config)

    if (!result.success || !result.buffer) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate pass' },
        { status: 500 }
      )
    }

    // Track wallet add analytics
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey && supabaseUrl) {
      const serviceClient = createClient(supabaseUrl, serviceKey)
      void serviceClient
        .from('shiftcard_analytics')
        .insert({
          card_id: cardData.id,
          event_type: 'wallet_add',
          click_target: 'apple_wallet',
          referrer: request.headers.get('referer'),
          user_agent: request.headers.get('user-agent'),
        })
    }

    // Return the .pkpass file
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(result.buffer)
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Apple Wallet error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Apple Wallet pass', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/wallet/apple
 * Web service endpoint for pass registration (enables push updates)
 * Apple calls this when a pass is added to a device
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log device registration for pass updates
    console.log('Apple Wallet device registration:', body)

    // In production, store device token and pass serial for push updates
    // This enables updating passes remotely
    // await db.passRegistrations.create({
    //   deviceLibraryIdentifier: body.deviceLibraryIdentifier,
    //   passTypeIdentifier: body.passTypeIdentifier,
    //   serialNumber: body.serialNumber,
    //   pushToken: body.pushToken,
    // })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Apple Wallet registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/wallet/apple
 * Called when a pass is removed from a device
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const serialNumber = searchParams.get('serialNumber')

    console.log('Apple Wallet pass removed:', serialNumber)

    // In production, remove device registration
    // await db.passRegistrations.delete({ serialNumber })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Apple Wallet unregistration error:', error)
    return NextResponse.json(
      { error: 'Unregistration failed' },
      { status: 500 }
    )
  }
}
