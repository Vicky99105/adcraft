import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function DELETE(request: Request) {
  try {
    const { templateIds } = await request.json()

    if (!templateIds || !Array.isArray(templateIds) || templateIds.length === 0) {
      return NextResponse.json({ error: "Invalid template IDs provided" }, { status: 400 })
    }

    // First, get the templates to get their file paths for storage deletion
    const { data: templates, error: fetchError } = await supabase
      .from('templates')
      .select('id, file_name, url')
      .in('id', templateIds)

    if (fetchError) {
      console.error('Error fetching templates for deletion:', fetchError)
      return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 })
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json({ error: "No templates found to delete" }, { status: 404 })
    }

    // Delete from storage bucket
    const filePaths = templates.map(t => `templates/${t.file_name}`)
    const { error: storageError } = await supabase.storage
      .from('templates')
      .remove(filePaths)

    if (storageError) {
      console.error('Storage deletion error:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('templates')
      .delete()
      .in('id', templateIds)

    if (dbError) {
      console.error('Database deletion error:', dbError)
      return NextResponse.json({ error: "Failed to delete templates from database" }, { status: 500 })
    }

    // Log summary only
    console.log(`API: /api/templates/bulk-delete - Deleted ${templates.length} template(s)`)

    return NextResponse.json({ 
      success: true, 
      deletedCount: templates.length,
      deletedTemplates: templates.map(t => ({ id: t.id, file_name: t.file_name }))
    }, { status: 200 })
  } catch (err: any) {
    console.error('Bulk delete error:', err)
    return NextResponse.json({ error: err?.message || "Bulk delete failed" }, { status: 500 })
  }
}
