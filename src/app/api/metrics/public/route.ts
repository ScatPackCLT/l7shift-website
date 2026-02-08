import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

let cache: { data: Record<string, number>; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  }

  try {
    const supabase = createServerClient()

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('shift_hours, traditional_hours_estimate, status')

    if (error) throw error

    const totalShiftHours = (tasks || []).reduce(
      (sum: number, t: Record<string, number | null>) => sum + ((t.shift_hours as number) || 0), 0
    )
    const totalTraditionalHours = (tasks || []).reduce(
      (sum: number, t: Record<string, number | null>) => sum + ((t.traditional_hours_estimate as number) || 0), 0
    )
    const hoursSaved = totalTraditionalHours - totalShiftHours
    const multiplier = totalShiftHours > 0
      ? totalTraditionalHours / totalShiftHours
      : 1

    const { count: projectsCompleted } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .in('status', ['completed', 'active'])

    const result = {
      hoursSaved: Math.max(0, Math.round(hoursSaved)),
      multiplier: Math.round(multiplier * 10) / 10,
      projectsCompleted: projectsCompleted || 0,
      totalShiftHours: Math.round(totalShiftHours),
      totalTraditionalHours: Math.round(totalTraditionalHours),
    }

    cache = { data: result, timestamp: Date.now() }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (error) {
    console.error('Error fetching public metrics:', error)
    return NextResponse.json(
      cache?.data || { hoursSaved: 0, multiplier: 1, projectsCompleted: 0, totalShiftHours: 0, totalTraditionalHours: 0 },
      { status: cache ? 200 : 500 }
    )
  }
}
