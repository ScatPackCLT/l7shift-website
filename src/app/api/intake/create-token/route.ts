/**
 * POST /api/intake/create-token
 * Creates a new intake token for a lead
 *
 * This endpoint is called when a lead is approved to receive the full intake questionnaire.
 * Can be triggered from Make.com automation or internal admin tools.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lead_id, expires_in_days = 7 } = body

    // Validate lead_id
    if (!lead_id) {
      return NextResponse.json(
        { error: 'lead_id is required' },
        { status: 400 }
      )
    }

    // Generate a secure random token
    const token = randomBytes(32).toString('hex')

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expires_in_days)

    try {
      const supabase = createServerClient()

      // Type definitions for Supabase responses
      type LeadRow = { id: number; name: string | null; email: string | null }
      type TokenRow = { token: string; expires_at: string }

      // First, verify the lead exists
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('id, name, email')
        .eq('id', lead_id)
        .single() as { data: LeadRow | null; error: unknown }

      if (leadError || !leadData) {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        )
      }

      // Check if there's already an unused token for this lead
      const { data: existingToken } = await supabase
        .from('intake_tokens')
        .select('token, expires_at')
        .eq('lead_id', lead_id)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single() as { data: TokenRow | null; error: unknown }

      if (existingToken) {
        // Return existing valid token
        const intakeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://l7shift.com'}/intake/${existingToken.token}`
        return NextResponse.json({
          success: true,
          token: existingToken.token,
          intake_url: intakeUrl,
          expires_at: existingToken.expires_at,
          lead: {
            id: leadData.id,
            name: leadData.name,
            email: leadData.email,
          },
          message: 'Existing valid token returned',
        })
      }

      // Create new token
      const { error: insertError } = await supabase
        .from('intake_tokens')
        .insert({
          lead_id: lead_id,
          token: token,
          expires_at: expiresAt.toISOString(),
        } as never)

      if (insertError) {
        console.error('Failed to create intake token:', insertError)
        return NextResponse.json(
          { error: 'Failed to create intake token' },
          { status: 500 }
        )
      }

      const intakeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://l7shift.com'}/intake/${token}`

      return NextResponse.json({
        success: true,
        token: token,
        intake_url: intakeUrl,
        expires_at: expiresAt.toISOString(),
        lead: {
          id: leadData.id,
          name: leadData.name,
          email: leadData.email,
        },
      })

    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Create intake token error:', error)
    return NextResponse.json(
      { error: 'Failed to create intake token' },
      { status: 500 }
    )
  }
}
