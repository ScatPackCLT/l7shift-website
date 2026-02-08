/**
 * /api/leads/classify - Lead Classification API
 *
 * POST - Classify a lead using Claude AI
 *
 * Request body:
 * - lead_id: UUID of the lead to classify
 *
 * Response:
 * - success: boolean
 * - data: updated lead with classification
 * - classification: the AI classification result
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import {
  classifyLead,
  getFallbackClassification,
  classificationToJson,
  type ClassificationResult,
} from '@/lib/classifier'
import type { Lead, LeadStatus } from '@/lib/database.types'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Map tier to status for automatic status updates
const TIER_STATUS_MAP: Record<string, LeadStatus> = {
  SOFTBALL: 'qualified',
  MEDIUM: 'qualified',
  HARD: 'incoming',
  DISQUALIFY: 'disqualified',
}

/**
 * POST /api/leads/classify
 * Classify a lead using Claude AI
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { lead_id } = body

    // Validate lead_id
    if (!lead_id || typeof lead_id !== 'string') {
      return NextResponse.json(
        { error: 'lead_id is required' },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(lead_id)) {
      return NextResponse.json(
        { error: 'Invalid lead_id format - must be a valid UUID' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Fetch the lead
    const { data: lead, error: fetchError } = await (supabase
      .from('leads') as ReturnType<typeof supabase.from>)
      .select('*')
      .eq('id', lead_id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching lead:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch lead' },
        { status: 500 }
      )
    }

    // Classify the lead
    let classification: ClassificationResult
    let usedFallback = false

    try {
      classification = await classifyLead(lead as Lead)
    } catch (classifyError) {
      console.error('Classification failed, using fallback:', classifyError)
      classification = getFallbackClassification(lead as Lead)
      usedFallback = true
    }

    // Determine new status based on tier
    const newStatus = TIER_STATUS_MAP[classification.tier] || 'incoming'

    // Update the lead with classification results
    const { data: updatedLead, error: updateError } = await (supabase
      .from('leads') as ReturnType<typeof supabase.from>)
      .update({
        tier: classification.tier,
        status: newStatus,
        ai_assessment: classificationToJson(classification),
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating lead with classification:', updateError)
      return NextResponse.json(
        {
          error: 'Classification succeeded but failed to update lead',
          classification,
        },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime

    console.log('Lead classification complete:', {
      lead_id,
      tier: classification.tier,
      confidence: classification.confidence,
      usedFallback,
      durationMs: duration,
    })

    return NextResponse.json({
      success: true,
      message: usedFallback
        ? 'Lead classified with fallback (Claude API failed)'
        : 'Lead classified successfully',
      data: updatedLead,
      classification,
      metadata: {
        usedFallback,
        durationMs: duration,
        classifiedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Classification endpoint error:', error)

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error during classification' },
      { status: 500 }
    )
  }
}
