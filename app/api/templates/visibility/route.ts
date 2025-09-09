import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function PATCH(request: Request) {
  try {
    const { templateId, isVisible } = await request.json()

    if (!templateId || typeof isVisible !== 'boolean') {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    // Update template visibility
    const { data, error } = await supabase
      .from('templates')
      .update({ is_visible: isVisible })
      .eq('id', templateId)
      .select('id, is_visible')

    if (error) {
      console.error('Supabase visibility update error:', error)
      return NextResponse.json({ error: "Failed to update template visibility" }, { status: 500 })
    }

    // Log summary only
    console.log(`API: /api/templates/visibility - Template ${templateId} visibility set to ${isVisible}`)

    return NextResponse.json({ success: true, template: data?.[0] }, { status: 200 })
  } catch (err: any) {
    console.error('Template visibility update error:', err)
    return NextResponse.json({ error: err?.message || "Update failed" }, { status: 500 })
  }
}
