import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const baseUrl = 'https://l7shift.com'

/**
 * Dynamic sitemap generation for L7 Shift
 *
 * Includes:
 * - Static public pages
 * - Dynamic ShiftCard pages (from database)
 * - Blog/Insights articles
 *
 * Excludes (via robots.txt):
 * - /internal/* (admin dashboard)
 * - /portal/* (client portals)
 * - /client/* (client areas)
 * - /login, /wakeup, /discovery/*
 * - /api/* (API routes)
 * - /intake/* (private intake links)
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  // ==========================================================================
  // STATIC PAGES
  // ==========================================================================

  // Homepage - highest priority
  entries.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  })

  // Start/Contact page
  entries.push({
    url: `${baseUrl}/start`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.9,
  })

  // Brand guide
  entries.push({
    url: `${baseUrl}/brand-guide`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  })

  // Insights hub
  entries.push({
    url: `${baseUrl}/insights`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  })

  // ==========================================================================
  // BLOG/INSIGHTS ARTICLES
  // ==========================================================================

  // Static blog posts (add more as you create them)
  const blogPosts = [
    { slug: 'my-weekend-at-claudes', date: '2026-01-20' },
  ]

  for (const post of blogPosts) {
    entries.push({
      url: `${baseUrl}/insights/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  // ==========================================================================
  // DYNAMIC SHIFTCARD PAGES
  // ==========================================================================

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Fetch published ShiftCards
      const { data: cards } = await supabase
        .from('shiftcards')
        .select('slug, updated_at')
        .eq('published', true)

      if (cards) {
        for (const card of cards) {
          entries.push({
            url: `${baseUrl}/card/${card.slug}`,
            lastModified: new Date(card.updated_at || new Date()),
            changeFrequency: 'monthly',
            priority: 0.5,
          })
        }
      }
    } catch (error) {
      console.error('Sitemap: Failed to fetch ShiftCards:', error)
    }
  }

  return entries
}
