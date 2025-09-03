import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    console.log('Listing templates from Supabase database...')
    
    // Fetch templates from the database table instead of storage listing
    const { data: templates, error } = await supabase
      .from('templates')
      .select('id, url, file_name, prompt, created_at')
      .order('created_at', { ascending: false })

    console.log('Supabase templates response:', { templates, error })

    if (error) {
      console.error('Supabase templates error:', error)
      return NextResponse.json({ templates: [] }, { status: 200 })
    }

    console.log('Templates found:', templates?.length || 0)
    if (templates && templates.length > 0) {
      console.log('Template URLs:', templates.map(t => t.url))
    }

    // Return templates with their prompts
    return NextResponse.json({ templates: templates || [] }, { status: 200 })
  } catch (err) {
    console.error('Template list error:', err)
    // If Supabase is not configured/available, still return empty
    return NextResponse.json({ templates: [] }, { status: 200 })
  }
}
