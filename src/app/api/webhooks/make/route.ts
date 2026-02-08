/**
 * /api/webhooks/make - Make.com Webhook Endpoint
 *
 * This endpoint receives callbacks from Make.com scenarios.
 * It can be used for:
 * 1. Receiving lead data and triggering classification
 * 2. Receiving status updates from Make.com workflows
 * 3. Handling other Make.com automation callbacks
 *
 * Authentication: Uses a shared secret in the x-make-secret header
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import {
  classifyLead,
  getFallbackClassification,
  classificationToJson,
  type ClassificationResult,
} from '@/lib/classifier'
import type { Lead, LeadInsert, LeadSource, LeadStatus, Json } from '@/lib/database.types'

// Valid sources for leads
const VALID_SOURCES: LeadSource[] = ['website', 'referral', 'linkedin', 'other']

// Map tier to status
const TIER_STATUS_MAP: Record<string, LeadStatus> = {
  SOFTBALL: 'qualified',
  MEDIUM: 'qualified',
  HARD: 'incoming',
  DISQUALIFY: 'disqualified',
}

// Webhook action types
type WebhookAction = 'create_and_classify' | 'classify' | 'status_update' | 'ping'

interface WebhookPayload {
  action: WebhookAction
  // For create_and_classify
  lead?: {
    name: string
    email: string
    company?: string
    phone?: string
    message?: string
    source?: LeadSource
    answers?: Record<string, unknown>
  }
  // For classify
  lead_id?: string
  // For status_update
  status?: string
  metadata?: Record<string, unknown>
}

/**
 * Verify the Make.com webhook secret
 */
function verifyWebhookSecret(request: NextRequest): boolean {
  const secret = process.env.MAKE_WEBHOOK_SECRET
  if (!secret) {
    // If no secret is configured, allow requests (dev mode)
    console.warn('MAKE_WEBHOOK_SECRET not configured - webhook authentication disabled')
    return true
  }

  const providedSecret = request.headers.get('x-make-secret')
  return providedSecret === secret
}

/**
 * POST /api/webhooks/make
 * Handle Make.com webhook callbacks
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // Verify webhook authentication
  if (!verifyWebhookSecret(request)) {
    console.error('Webhook authentication failed')
    return NextResponse.json(
      { error: 'Unauthorized - invalid webhook secret' },
      { status: 401 }
    )
  }

  try {
    const payload: WebhookPayload = await request.json()
    const action = payload.action || 'create_and_classify'

    console.log('Make.com webhook received:', {
      action,
      hasLead: !!payload.lead,
      hasLeadId: !!payload.lead_id,
    })

    // Handle ping action (for testing webhook connectivity)
    if (action === 'ping') {
      return NextResponse.json({
        success: true,
        message: 'Webhook is active',
        timestamp: new Date().toISOString(),
      })
    }

    const supabase = createServerClient()

    // Handle classify action (classify existing lead)
    if (action === 'classify') {
      if (!payload.lead_id) {
        return NextResponse.json(
          { error: 'lead_id is required for classify action' },
          { status: 400 }
        )
      }

      // Fetch the lead
      const { data: lead, error: fetchError } = await (supabase
        .from('leads') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('id', payload.lead_id)
        .single()

      if (fetchError || !lead) {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        )
      }

      // Classify
      let classification: ClassificationResult
      try {
        classification = await classifyLead(lead as Lead)
      } catch (error) {
        console.error('Classification failed:', error)
        classification = getFallbackClassification(lead as Lead)
      }

      // Update lead
      const { data: updatedLead, error: updateError } = await (supabase
        .from('leads') as ReturnType<typeof supabase.from>)
        .update({
          tier: classification.tier,
          status: TIER_STATUS_MAP[classification.tier] || 'incoming',
          ai_assessment: classificationToJson(classification),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.lead_id)
        .select()
        .single()

      if (updateError) {
        console.error('Failed to update lead:', updateError)
        return NextResponse.json(
          { error: 'Failed to update lead with classification' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'classify',
        lead: updatedLead,
        classification,
        durationMs: Date.now() - startTime,
      })
    }

    // Handle create_and_classify action (default)
    if (action === 'create_and_classify') {
      const leadData = payload.lead

      if (!leadData) {
        return NextResponse.json(
          { error: 'lead object is required for create_and_classify action' },
          { status: 400 }
        )
      }

      // Validate required fields
      if (!leadData.name || !leadData.email) {
        return NextResponse.json(
          { error: 'name and email are required in lead object' },
          { status: 400 }
        )
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(leadData.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }

      // Prepare lead for insertion
      const leadInsert: LeadInsert = {
        name: leadData.name.trim(),
        email: leadData.email.toLowerCase().trim(),
        company: leadData.company?.trim() || null,
        phone: leadData.phone?.trim() || null,
        message: leadData.message?.trim() || null,
        source: VALID_SOURCES.includes(leadData.source as LeadSource)
          ? (leadData.source as LeadSource)
          : 'website',
        status: 'incoming',
        tier: null,
        answers: (leadData.answers as Json) || null,
        ai_assessment: null,
      }

      // Insert the lead
      const { data: newLead, error: insertError } = await (supabase
        .from('leads') as ReturnType<typeof supabase.from>)
        .insert(leadInsert)
        .select()
        .single()

      if (insertError) {
        console.error('Failed to create lead:', insertError)

        // Handle duplicate email
        if (insertError.code === '23505') {
          return NextResponse.json(
            { error: 'A lead with this email already exists' },
            { status: 409 }
          )
        }

        return NextResponse.json(
          { error: 'Failed to create lead' },
          { status: 500 }
        )
      }

      // Classify the new lead
      let classification: ClassificationResult
      let usedFallback = false

      try {
        classification = await classifyLead(newLead as Lead)
      } catch (error) {
        console.error('Classification failed:', error)
        classification = getFallbackClassification(newLead as Lead)
        usedFallback = true
      }

      // Update lead with classification
      const { data: updatedLead, error: updateError } = await (supabase
        .from('leads') as ReturnType<typeof supabase.from>)
        .update({
          tier: classification.tier,
          status: TIER_STATUS_MAP[classification.tier] || 'incoming',
          ai_assessment: classificationToJson(classification),
          updated_at: new Date().toISOString(),
        })
        .eq('id', newLead.id)
        .select()
        .single()

      if (updateError) {
        console.error('Failed to update lead with classification:', updateError)
        // Still return success since lead was created
        return NextResponse.json({
          success: true,
          warning: 'Lead created but classification update failed',
          action: 'create_and_classify',
          lead: newLead,
          classification,
          usedFallback,
          durationMs: Date.now() - startTime,
        })
      }

      console.log('Lead created and classified:', {
        id: updatedLead.id,
        tier: classification.tier,
        confidence: classification.confidence,
        usedFallback,
        durationMs: Date.now() - startTime,
      })

      return NextResponse.json({
        success: true,
        action: 'create_and_classify',
        lead: updatedLead,
        classification,
        usedFallback,
        durationMs: Date.now() - startTime,
      })
    }

    // Handle status_update action
    if (action === 'status_update') {
      if (!payload.lead_id || !payload.status) {
        return NextResponse.json(
          { error: 'lead_id and status are required for status_update action' },
          { status: 400 }
        )
      }

      const { data: updatedLead, error: updateError } = await (supabase
        .from('leads') as ReturnType<typeof supabase.from>)
        .update({
          status: payload.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.lead_id)
        .select()
        .single()

      if (updateError) {
        console.error('Failed to update lead status:', updateError)
        return NextResponse.json(
          { error: 'Failed to update lead status' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'status_update',
        lead: updatedLead,
        durationMs: Date.now() - startTime,
      })
    }

    // Unknown action
    return NextResponse.json(
      { error: `Unknown action: ${action}. Valid actions: create_and_classify, classify, status_update, ping` },
      { status: 400 }
    )
  } catch (error) {
    console.error('Webhook processing error:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/make
 * Health check for the webhook endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/make',
    supportedActions: ['create_and_classify', 'classify', 'status_update', 'ping'],
    timestamp: new Date().toISOString(),
  })
}
