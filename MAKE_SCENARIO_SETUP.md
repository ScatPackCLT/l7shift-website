# Make.com Scenario Setup for Lead Classification

This document outlines how to set up the Make.com scenario for automated lead classification.

## Overview

The lead classification flow works as follows:

```
Contact Form (l7shift.com)
         |
         v
   Make.com Webhook <--- Trigger
         |
         v
POST /api/webhooks/make
         |
         v
Claude API (classification)
         |
         v
ShiftBoard Updated (tier + ai_assessment)
         |
         v
   Make.com Router ---> Routes based on tier
         |
         +---> SOFTBALL: Slack #hot-leads + Calendar Email
         |
         +---> MEDIUM: Case Study Email
         |
         +---> HARD: Info Packet Email
         |
         +---> DISQUALIFY: Polite Decline Email
```

---

## Environment Variables Required

Add these to your Vercel environment variables:

```bash
# Already configured
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Add these new ones
ANTHROPIC_API_KEY=sk-ant-...
MAKE_WEBHOOK_SECRET=your-secure-random-string  # Optional but recommended
```

---

## Make.com Scenario Configuration

### Step 1: Create New Scenario

1. Go to Make.com and create a new scenario
2. Name it: "L7 Shift Lead Classification"

### Step 2: Add Webhook Trigger

1. Add a **Custom Webhook** module
2. Create a new webhook named "L7 Shift Contact Form"
3. Copy the webhook URL (you'll need this for the contact form)

### Step 3: Call Classification API

Add an **HTTP Make a Request** module:

```
URL: https://l7shift.com/api/webhooks/make
Method: POST
Headers:
  - Content-Type: application/json
  - x-make-secret: {{YOUR_MAKE_WEBHOOK_SECRET}}

Body (JSON):
{
  "action": "create_and_classify",
  "lead": {
    "name": "{{1.name}}",
    "email": "{{1.email}}",
    "company": "{{1.company}}",
    "phone": "{{1.phone}}",
    "message": "{{1.message}}",
    "source": "{{1.source}}",
    "answers": {
      "role": "{{1.role}}",
      "company_size": "{{1.company_size}}",
      "industry": "{{1.industry}}",
      "project_type": "{{1.project_type}}",
      "vision_clarity": "{{1.vision_clarity}}",
      "timeline": "{{1.timeline}}",
      "budget": "{{1.budget}}",
      "decision_maker": "{{1.decision_maker}}",
      "current_tools": "{{1.current_tools}}",
      "frustration": "{{1.frustration}}",
      "past_experience": "{{1.past_experience}}",
      "success_criteria": "{{1.success_criteria}}"
    }
  }
}
```

### Step 4: Parse Response

Add a **JSON Parse** module to extract:
- `classification.tier`
- `classification.reasoning`
- `classification.recommended_action`
- `classification.confidence`
- `lead.id`

### Step 5: Router Based on Tier

Add a **Router** module with 4 routes:

#### Route 1: SOFTBALL
**Condition:** `{{4.classification.tier}}` equals `SOFTBALL`

Modules:
1. **Slack - Send Message**
   - Channel: #hot-leads
   - Message:
   ```
   :fire: *HOT LEAD ALERT* :fire:

   *Name:* {{1.name}}
   *Email:* {{1.email}}
   *Company:* {{1.company}}

   *AI Assessment:*
   - Tier: SOFTBALL ({{4.classification.confidence}}% confidence)
   - Reasoning: {{4.classification.reasoning}}

   *Recommended Action:* {{4.classification.recommended_action}}

   :link: <https://l7shift.com/shiftboard/leads/{{4.lead.id}}|View in ShiftBoard>
   ```

2. **Email (Resend/SendGrid) - Auto-Reply with Calendar**
   - To: `{{1.email}}`
   - Subject: "Let's connect - {{1.name}}"
   - Body: Calendar booking link email template

#### Route 2: MEDIUM
**Condition:** `{{4.classification.tier}}` equals `MEDIUM`

Modules:
1. **Email - Send Case Study**
   - To: `{{1.email}}`
   - Subject: "Here's what we built for a company like yours"
   - Body: Case study email (Scat Pack or Stitchwichs based on `suggested_case_study`)

#### Route 3: HARD
**Condition:** `{{4.classification.tier}}` equals `HARD`

Modules:
1. **Email - Send Info Packet**
   - To: `{{1.email}}`
   - Subject: "Thanks for reaching out - L7 Shift"
   - Body: General info packet email

#### Route 4: DISQUALIFY
**Condition:** `{{4.classification.tier}}` equals `DISQUALIFY`

Modules:
1. **Email - Polite Decline**
   - To: `{{1.email}}`
   - Subject: "Thanks for your interest"
   - Body: Polite decline with resource links

---

## Alternative: Direct API Integration

If you prefer to bypass Make.com for classification, you can call the classify endpoint directly:

### Classify Existing Lead

```bash
curl -X POST https://l7shift.com/api/leads/classify \
  -H "Content-Type: application/json" \
  -d '{"lead_id": "uuid-of-lead"}'
```

### Create and Classify in One Call

```bash
curl -X POST https://l7shift.com/api/webhooks/make \
  -H "Content-Type: application/json" \
  -H "x-make-secret: your-secret" \
  -d '{
    "action": "create_and_classify",
    "lead": {
      "name": "Test Lead",
      "email": "test@example.com",
      "company": "Test Corp",
      "message": "Interested in your services",
      "answers": {
        "role": "founder_owner",
        "budget": "8k_15k",
        "timeline": "asap"
      }
    }
  }'
```

---

## API Endpoints

### POST /api/leads/classify

Classify an existing lead.

**Request:**
```json
{
  "lead_id": "uuid-string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lead classified successfully",
  "data": { /* updated lead */ },
  "classification": {
    "tier": "SOFTBALL",
    "confidence": 95,
    "reasoning": "Perfect ICP match...",
    "red_flags": [],
    "green_flags": ["Referral source", "Clear vision"],
    "recommended_action": "Call within 2 hours",
    "suggested_case_study": "scat_pack",
    "estimated_deal_size": "$8,000 - $12,000",
    "urgency_score": 9,
    "fit_score": 10,
    "notes_for_kj": "Similar to Scat Pack"
  },
  "metadata": {
    "usedFallback": false,
    "durationMs": 1234,
    "classifiedAt": "2026-02-08T..."
  }
}
```

### POST /api/webhooks/make

Make.com webhook endpoint with multiple actions.

**Actions:**

1. `create_and_classify` - Create lead and classify in one call
2. `classify` - Classify existing lead by ID
3. `status_update` - Update lead status
4. `ping` - Test webhook connectivity

**Request (create_and_classify):**
```json
{
  "action": "create_and_classify",
  "lead": {
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Inc",
    "phone": "555-1234",
    "message": "Need help with scheduling",
    "source": "website",
    "answers": {
      "role": "founder_owner",
      "budget": "8k_15k",
      "timeline": "asap",
      "industry": "service_business"
    }
  }
}
```

### GET /api/webhooks/make

Health check endpoint.

**Response:**
```json
{
  "status": "active",
  "endpoint": "/api/webhooks/make",
  "supportedActions": ["create_and_classify", "classify", "status_update", "ping"],
  "timestamp": "2026-02-08T..."
}
```

---

## Testing Checklist

Before going live:

- [ ] Test SOFTBALL path (service business, clear vision, budget ready)
- [ ] Test MEDIUM path (funded startup, comparing options)
- [ ] Test HARD path (enterprise, procurement, committee)
- [ ] Test DISQUALIFY path (no budget, unclear scope)
- [ ] Verify ShiftBoard records created correctly
- [ ] Verify Slack notifications fire (SOFTBALL only)
- [ ] Verify auto-reply emails send correctly
- [ ] Check Claude's reasoning makes sense
- [ ] Test fallback behavior when Claude API fails

---

## Fallback Behavior

If Claude API fails:
- Lead is classified as MEDIUM (requires manual review)
- `ai_assessment.notes_for_kj` includes failure timestamp
- Lead still created/updated in ShiftBoard
- `metadata.usedFallback: true` in response

---

## Cost Estimate

Claude Sonnet per classification:
- ~500 input tokens (prompt + lead data)
- ~300 output tokens (JSON response)
- ~$0.002 per lead

At 100 leads/month = ~$0.20/month

Negligible cost.

---

## Security Notes

1. **Webhook Secret**: Set `MAKE_WEBHOOK_SECRET` in both Vercel and Make.com
2. **HTTPS Only**: All endpoints require HTTPS
3. **Rate Limiting**: Consider adding rate limiting for public endpoints
4. **API Key**: `ANTHROPIC_API_KEY` is server-side only, never exposed to client

---

*L7 Shift - Enabling The SymbAIotic Shift*
