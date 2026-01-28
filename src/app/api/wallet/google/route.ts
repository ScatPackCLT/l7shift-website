/**
 * ShiftCards™ - Google Wallet API
 *
 * Generates Google Wallet passes and "Add to Wallet" URLs.
 * Requires: GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SERVICE_EMAIL, GOOGLE_WALLET_PRIVATE_KEY
 */

import { NextRequest, NextResponse } from 'next/server'
import { SignJWT, importPKCS8 } from 'jose'
import { createClient } from '@supabase/supabase-js'
import {
  generateGooglePassObject,
  generateGooglePassClass,
  getTheme,
  type CardHolder,
} from '@/lib/wallet-templates'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * GET /api/wallet/google?id=ken
 * Returns a Google Wallet "Add to Wallet" URL
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

    // Fetch card from Supabase
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: cardData, error: dbError } = await supabase
      .from('shiftcards')
      .select('*')
      .eq('slug', holderId)
      .eq('published', true)
      .single()

    if (dbError || !cardData) {
      return NextResponse.json(
        { error: 'Card holder not found' },
        { status: 404 }
      )
    }

    // Map Supabase data to CardHolder format
    const holder: CardHolder = {
      id: cardData.slug,
      name: cardData.name,
      title: cardData.title || '',
      company: cardData.company || '',
      tagline: cardData.tagline || '',
      email: cardData.email || '',
      phone: cardData.phone || '',
      website: cardData.website || '',
      socials: cardData.socials || {},
      themeId: cardData.theme || 'l7-shift',
    }

    // Check for required env vars
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID
    const serviceEmail = process.env.GOOGLE_WALLET_SERVICE_EMAIL
    const privateKeyRaw = process.env.GOOGLE_WALLET_PRIVATE_KEY

    if (!issuerId || !serviceEmail || !privateKeyRaw) {
      return NextResponse.json(
        {
          error: 'Google Wallet not configured',
          configured: false,
          // Return pass data so frontend can show preview
          passData: generateGooglePassObject(holder, `${holderId}-${Date.now()}`),
        },
        { status: 503 }
      )
    }

    // Generate unique object ID (alphanumeric only for Google Wallet)
    const objectSuffix = `${holderId}_${Date.now()}`
    const objectId = `${issuerId}.${objectSuffix}`

    // Get theme and generate class
    const theme = getTheme(holder.themeId || 'l7-shift')
    const classId = `${issuerId}.shiftcard_${theme.id.replace(/-/g, '_')}`

    // Generate pass class (included in JWT for auto-creation)
    const passClass = {
      id: classId,
      classTemplateInfo: {
        cardTemplateOverride: {
          cardRowTemplateInfos: [
            {
              twoItems: {
                startItem: {
                  firstValue: {
                    fields: [{ fieldPath: "object.textModulesData['email']" }]
                  }
                },
                endItem: {
                  firstValue: {
                    fields: [{ fieldPath: "object.textModulesData['phone']" }]
                  }
                }
              }
            }
          ]
        }
      },
      imageModulesData: [
        {
          mainImage: {
            sourceUri: {
              uri: 'https://l7shift.com/wallet-assets/l7/hero.png'
            },
            contentDescription: {
              defaultValue: { language: 'en', value: theme.tagline || 'ShiftCards by L7 Shift' }
            }
          },
          id: 'hero_image'
        }
      ],
      linksModuleData: {
        uris: [
          { uri: theme.website, description: theme.organizationName + ' Website', id: 'website' }
        ]
      },
      enableSmartTap: true,
      hexBackgroundColor: theme.backgroundColor,
      securityAnimation: { animationType: 'FOIL_SHIMMER' }
    }

    // Generate pass object with correct classId
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://l7shift.com'
    const passObject = {
      id: objectId,
      classId: classId,
      state: 'ACTIVE',
      heroImage: {
        sourceUri: {
          uri: 'https://l7shift.com/wallet-assets/l7/hero.png'
        },
        contentDescription: {
          defaultValue: { language: 'en', value: theme.tagline || 'ShiftCards' }
        }
      },
      logo: {
        sourceUri: {
          uri: 'https://l7shift.com/wallet-assets/l7/logo-google.png'
        },
        contentDescription: {
          defaultValue: { language: 'en', value: theme.organizationName }
        }
      },
      cardTitle: {
        defaultValue: { language: 'en', value: holder.name }
      },
      subheader: {
        defaultValue: { language: 'en', value: holder.title }
      },
      header: {
        defaultValue: { language: 'en', value: holder.company }
      },
      textModulesData: [
        { id: 'email', header: 'EMAIL', body: holder.email },
        { id: 'phone', header: 'PHONE', body: holder.phone },
        ...(holder.tagline ? [{ id: 'about', header: 'ABOUT', body: holder.tagline }] : [])
      ],
      linksModuleData: {
        uris: [
          { id: 'website', uri: holder.website, description: 'Website' },
          { id: 'profile', uri: `${baseUrl}/card/${holder.id}`, description: 'Full Digital Card' },
          ...(holder.socials?.linkedin ? [{ id: 'linkedin', uri: holder.socials.linkedin, description: 'LinkedIn' }] : []),
          ...(holder.socials?.twitter ? [{ id: 'twitter', uri: holder.socials.twitter, description: 'X / Twitter' }] : [])
        ]
      },
      barcode: {
        type: 'QR_CODE',
        value: `${baseUrl}/card/${holder.id}`,
        alternateText: 'Scan for full profile'
      },
      hexBackgroundColor: theme.backgroundColor
    }

    // Create JWT with both class and object (class auto-created if not exists)
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n')
    const key = await importPKCS8(privateKey, 'RS256')

    const jwt = await new SignJWT({
      iss: serviceEmail,
      aud: 'google',
      origins: ['https://l7shift.com'],
      typ: 'savetowallet',
      payload: {
        genericClasses: [passClass],
        genericObjects: [passObject],
      },
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuedAt()
      .sign(key)

    const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`

    return NextResponse.json({
      success: true,
      saveUrl,
      passData: passObject,
    })
  } catch (error) {
    console.error('Google Wallet error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Google Wallet pass', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/wallet/google/class
 * Creates the Google Wallet pass class (one-time setup)
 */
export async function POST(request: NextRequest) {
  try {
    const { themeId } = await request.json()
    const theme = getTheme(themeId || 'l7-shift')
    const passClass = generateGooglePassClass(theme)

    // In production, this would call the Google Wallet API to create the class
    // For now, return the class definition

    return NextResponse.json({
      success: true,
      message: 'Pass class definition generated. Use Google Wallet API to create.',
      classDefinition: passClass,
    })
  } catch (error) {
    console.error('Google Wallet class error:', error)
    return NextResponse.json(
      { error: 'Failed to generate pass class' },
      { status: 500 }
    )
  }
}
