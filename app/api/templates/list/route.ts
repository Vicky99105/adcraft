import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeHidden = searchParams.get('include_hidden') === 'true'
    
    // Try selecting with extended columns; fallback if they don't exist
    const baseSelect = 'id, url, file_name, prompt, created_at, is_visible'
    const extendedSelect = baseSelect + ', src, category, n_countries, brand, reach, views'

    async function runQuery(select: string) {
      let q = supabase
        .from('templates')
        .select(select)
        .order('created_at', { ascending: false })
      if (!includeHidden) q = q.eq('is_visible', true)
      return q
    }

    let { data: templates, error } = await runQuery(extendedSelect)
    if (error) {
      console.warn('Extended select failed, falling back to base columns:', error.message)
      const fallback = await runQuery(baseSelect)
      templates = fallback.data as any[] | null
      error = fallback.error
    }

    if (error) {
      console.error('Supabase templates error:', error)
      return NextResponse.json({ templates: [] }, { status: 200 })
    }

    console.log(`API: /api/templates/list - Found ${templates?.length || 0} templates (includeHidden: ${includeHidden})`)
    if (templates && templates.length > 0) {
      console.log('Sample template:', templates[0])
      console.log('Categories found:', templates.map(t => (t as any).category).filter(Boolean))
      console.log('Sources found:', templates.map(t => (t as any).src).filter(Boolean))
    }
    return NextResponse.json({ templates: templates || [] }, { status: 200 })
  } catch (err) {
    console.error('Template list error:', err)
    // If Supabase is not configured/available, still return empty
    return NextResponse.json({ templates: [] }, { status: 200 })
  }
}
