import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeHidden = searchParams.get('include_hidden') === 'true'
    
    // Build query based on whether to include hidden templates
    let query = supabase
      .from('templates')
      .select('id, url, file_name, prompt, created_at, is_visible')
      .order('created_at', { ascending: false })

    // Only show visible templates for regular users
    if (!includeHidden) {
      query = query.eq('is_visible', true)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Supabase templates error:', error)
      return NextResponse.json({ templates: [] }, { status: 200 })
    }

    // Log summary only
    console.log(`API: /api/templates/list - Found ${templates?.length || 0} templates (includeHidden: ${includeHidden})`)

    // Return templates with their prompts
    return NextResponse.json({ templates: templates || [] }, { status: 200 })
  } catch (err) {
    console.error('Template list error:', err)
    // If Supabase is not configured/available, still return empty
    return NextResponse.json({ templates: [] }, { status: 200 })
  }
}
