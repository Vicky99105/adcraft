import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const files = form.getAll("files") as File[]
    const prompts = form.getAll("prompts") as string[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const uploaded: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const prompt = prompts[i] || "Place the uploaded product onto this template image as a realistic ad composite. Keep aspect ratio and add soft shadow."
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `templates/${fileName}`

      // Convert file to buffer
      const fileBuffer = await file.arrayBuffer()

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('templates')
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          upsert: false
        })

      if (error) {
        console.error('Supabase upload error:', error)
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath)

      uploaded.push(urlData.publicUrl)

      // Log in DB
      const { data: dbData } = await supabase.from('templates').insert({ 
        url: urlData.publicUrl, 
        file_name: fileName,
        prompt: prompt,
        is_visible: true
      }).select('id')
    }

    // Log summary only
    console.log(`API: /api/templates/upload - Uploaded ${files.length} template(s)`)

    return NextResponse.json({ uploaded }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 })
  }
}
