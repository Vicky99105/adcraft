import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function PATCH(request: Request) {
  try {
    const { templateId, prompt } = await request.json()

    if (!templateId || !prompt) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    // Update template prompt
    const { data, error } = await supabase
      .from('templates')
      .update({ prompt: prompt })
      .eq('id', templateId)
      .select('id, prompt')

    if (error) {
      console.error('Supabase prompt update error:', error)
      return NextResponse.json({ error: "Failed to update template prompt" }, { status: 500 })
    }

    // Log summary only
    console.log(`API: /api/templates/prompt - Template ${templateId} prompt updated`)

    return NextResponse.json({ success: true, template: data?.[0] }, { status: 200 })
  } catch (err: any) {
    console.error('Template prompt update error:', err)
    return NextResponse.json({ error: err?.message || "Update failed" }, { status: 500 })
  }
}
