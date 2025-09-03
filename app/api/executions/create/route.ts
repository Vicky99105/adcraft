import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { templates, prompts } = body || {}

    const { data, error } = await supabase
      .from('executions')
      .insert({ 
        status: 'started', 
        templates: templates || null, 
        prompts: prompts || null 
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ execution_id: data.id }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create execution' }, { status: 500 })
  }
}
