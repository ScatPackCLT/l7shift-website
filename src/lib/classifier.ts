/**
 * Lead Classification Library
 * Uses Claude API to classify incoming leads for L7 Shift
 */

import type { Lead, LeadTier, Json } from './database.types'

// Classification output from Claude
export interface ClassificationResult {
  tier: LeadTier
  confidence: number
  reasoning: string
  red_flags: string[]
  green_flags: string[]
  recommended_action: string
  suggested_case_study: 'scat_pack' | 'stitchwichs' | 'none'
  estimated_deal_size: string
  urgency_score: number
  fit_score: number
  notes_for_kj: string
}

// The system prompt for Claude to classify leads
const SYSTEM_PROMPT = `You are the lead qualification system for L7 Shift, an AI-augmented development consultancy.

Your job: Analyze incoming leads and classify them as SOFTBALL, MEDIUM, HARD, or DISQUALIFY.

## About L7 Shift

We build custom software fast using The SymbAIotic Shift methodology - human strategy + AI execution. Our sweet spot:
- Service businesses replacing spreadsheets with software
- E-commerce stores optimizing Shopify
- Founders who know what they want built
- $3K-30K projects delivered in days/weeks, not months

## Our Proof Points
- Scat Pack CLT: Full SaaS (19 tables, Stripe, admin dashboard, crew portal) built in 24 hours
- Stitchwichs: Shopify optimization (in progress)

## Classification Tiers

### SOFTBALL (respond in 2 hours)
- High close probability
- Clear fit with our services
- Decision maker with budget
- Urgent timeline
- Service business or e-commerce
- Replacing spreadsheets/manual processes

### MEDIUM (respond in 24 hours)
- Good fit but needs nurturing
- Budget available but comparing options
- Funded startup needing MVP
- Slightly longer timeline
- May need discovery call to clarify scope

### HARD (respond in 48 hours)
- Potential but long sales cycle
- Multiple decision makers
- Enterprise/procurement involved
- Complex requirements
- High budget but slow to close

### DISQUALIFY (auto-decline)
- Budget too low for scope (<$3K for complex project)
- Looking for free advice
- Scope way outside our expertise
- Red flags (unclear on what they want + no budget + no timeline)
- Competitor research vibes

## Your Output Format

Return ONLY valid JSON:

{
  "tier": "SOFTBALL" | "MEDIUM" | "HARD" | "DISQUALIFY",
  "confidence": 0-100,
  "reasoning": "2-3 sentence explanation",
  "red_flags": ["list", "of", "concerns"] | [],
  "green_flags": ["list", "of", "positives"] | [],
  "recommended_action": "specific next step",
  "suggested_case_study": "scat_pack" | "stitchwichs" | "none",
  "estimated_deal_size": "$X - $Y" | "unclear",
  "urgency_score": 1-10,
  "fit_score": 1-10,
  "notes_for_kj": "anything else worth noting"
}`

/**
 * Build the user prompt from lead data
 */
function buildUserPrompt(lead: Lead): string {
  const answers = lead.answers as Record<string, unknown> | null

  // Build the prompt with available data
  const parts = [
    'Classify this incoming lead for L7 Shift:',
    '',
    '## Lead Information',
    `- **Name:** ${lead.name}`,
    `- **Email:** ${lead.email}`,
    `- **Company:** ${lead.company || 'Not provided'}`,
  ]

  // Add answers if available
  if (answers && typeof answers === 'object') {
    parts.push('')
    parts.push('## Their Answers')

    const fieldMappings: Record<string, string> = {
      role: 'Role',
      company_size: 'Company Size',
      industry: 'Industry',
      project_type: 'What they need',
      vision_clarity: 'Vision clarity',
      has_designs: 'Designs/specs',
      integrations: 'Integrations needed',
      timeline: 'Timeline',
      budget: 'Budget',
      decision_maker: 'Decision maker',
      current_tools: 'Current tools',
      frustration: 'Biggest frustration',
      past_experience: 'Past dev experience',
      success_criteria: 'Success looks like',
      source: 'How they found us',
    }

    for (const [key, label] of Object.entries(fieldMappings)) {
      if (answers[key] !== undefined) {
        const value = Array.isArray(answers[key])
          ? (answers[key] as string[]).join(', ')
          : String(answers[key])
        parts.push(`- **${label}:** ${value}`)
      }
    }
  }

  // Add message if available
  if (lead.message) {
    parts.push('')
    parts.push('## Additional Message')
    parts.push(lead.message)
  }

  parts.push('')
  parts.push('## Additional Context')
  parts.push(`- Submitted: ${lead.created_at}`)
  parts.push(`- Source: ${lead.source}`)
  parts.push('')
  parts.push('---')
  parts.push('')
  parts.push('Analyze this lead and return your classification as JSON.')

  return parts.join('\n')
}

/**
 * Parse Claude's response into a ClassificationResult
 */
function parseClassificationResponse(content: string): ClassificationResult {
  // Try to extract JSON from the response
  // Claude sometimes wraps JSON in markdown code blocks
  let jsonStr = content

  // Remove markdown code blocks if present
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]
  }

  // Try to find JSON object in the string
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    jsonStr = objectMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr)

    // Validate required fields
    if (!['SOFTBALL', 'MEDIUM', 'HARD', 'DISQUALIFY'].includes(parsed.tier)) {
      throw new Error(`Invalid tier: ${parsed.tier}`)
    }

    return {
      tier: parsed.tier as LeadTier,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
      reasoning: parsed.reasoning || 'No reasoning provided',
      red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags : [],
      green_flags: Array.isArray(parsed.green_flags) ? parsed.green_flags : [],
      recommended_action: parsed.recommended_action || 'Review manually',
      suggested_case_study: ['scat_pack', 'stitchwichs', 'none'].includes(parsed.suggested_case_study)
        ? parsed.suggested_case_study
        : 'none',
      estimated_deal_size: parsed.estimated_deal_size || 'unclear',
      urgency_score: typeof parsed.urgency_score === 'number' ? parsed.urgency_score : 5,
      fit_score: typeof parsed.fit_score === 'number' ? parsed.fit_score : 5,
      notes_for_kj: parsed.notes_for_kj || '',
    }
  } catch (error) {
    console.error('Failed to parse classification response:', error)
    console.error('Raw response:', content)
    throw new Error('Failed to parse Claude response as JSON')
  }
}

/**
 * Classify a lead using Claude API
 */
export async function classifyLead(lead: Lead): Promise<ClassificationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const userPrompt = buildUserPrompt(lead)

  console.log('Classifying lead:', {
    id: lead.id,
    name: lead.name,
    email: lead.email.replace(/(.{3}).*@/, '$1***@'),
  })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Claude API error:', response.status, errorText)
    throw new Error(`Claude API returned ${response.status}: ${errorText}`)
  }

  const data = await response.json()

  // Extract the text content from Claude's response
  const content = data.content?.[0]?.text
  if (!content) {
    throw new Error('No content in Claude response')
  }

  // Parse and return the classification
  const result = parseClassificationResponse(content)

  console.log('Classification result:', {
    leadId: lead.id,
    tier: result.tier,
    confidence: result.confidence,
    reasoning: result.reasoning,
  })

  return result
}

/**
 * Get fallback classification when Claude API fails
 */
export function getFallbackClassification(lead: Lead): ClassificationResult {
  return {
    tier: 'MEDIUM',
    confidence: 0,
    reasoning: 'Claude API classification failed - defaulting to MEDIUM for manual review',
    red_flags: ['Classification failed - needs manual review'],
    green_flags: [],
    recommended_action: 'Review this lead manually - automated classification failed',
    suggested_case_study: 'none',
    estimated_deal_size: 'unclear',
    urgency_score: 5,
    fit_score: 5,
    notes_for_kj: `Classification failed at ${new Date().toISOString()}. Please review manually.`,
  }
}

/**
 * Convert ClassificationResult to JSON for database storage
 */
export function classificationToJson(result: ClassificationResult): Json {
  return result as unknown as Json
}
