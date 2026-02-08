/**
 * GET /api/intake/[token]
 * Fetches lead data for pre-filling the intake form
 *
 * Token is generated when a "Let's Talk" lead is approved for full intake
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Check for test token in development
    if (process.env.NODE_ENV === 'development' && token === 'test-token') {
      return NextResponse.json({
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Company',
      })
    }

    try {
      const supabase = createServerClient()

      // Look up token in Supabase
      // Type the response since tables may not exist yet
      type TokenRow = {
        lead_id: number | null
        used: boolean
        expires_at: string
      }

      const { data: tokenData, error: tokenError } = await supabase
        .from('intake_tokens')
        .select('lead_id, used, expires_at')
        .eq('token', token)
        .single() as { data: TokenRow | null; error: unknown }

      if (tokenError || !tokenData) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 404 }
        )
      }

      // Check if token is used or expired
      if (tokenData.used) {
        return NextResponse.json(
          { error: 'This intake form has already been submitted' },
          { status: 404 }
        )
      }

      if (new Date(tokenData.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'This intake link has expired' },
          { status: 404 }
        )
      }

      // Fetch the lead data
      if (!tokenData.lead_id) {
        // Token exists but has no associated lead - return empty form data
        return NextResponse.json({
          name: '',
          email: '',
          company: '',
        })
      }

      type LeadRow = {
        name: string | null
        email: string | null
        message: string | null
      }

      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('name, email, message')
        .eq('id', tokenData.lead_id)
        .single() as { data: LeadRow | null; error: unknown }

      if (leadError || !leadData) {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        )
      }

      // Extract company from message if present (legacy support)
      // Future leads should have a proper company field
      let company = ''
      if (leadData.message) {
        const companyMatch = leadData.message.match(/Company:\s*(.+?)(?:\n|$)/i)
        if (companyMatch) {
          company = companyMatch[1].trim()
        }
      }

      return NextResponse.json({
        name: leadData.name || '',
        email: leadData.email || '',
        company: company,
      })

    } catch (dbError) {
      console.error('Database error:', dbError)
      // If database is unavailable, return 404 to show invalid token page
      return NextResponse.json(
        { error: 'Unable to validate token' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Intake token lookup error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead data' },
      { status: 500 }
    )
  }
}
