import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const files = form.getAll("files") as File[]
    const prompts = form.getAll("prompts") as string[]
    const categories = form.getAll("categories") as string[]
    const brands = form.getAll("brands") as string[]
    const nCountries = form.getAll("n_countries") as string[]
    const reaches = form.getAll("reaches") as string[]
    const source = (form.get("source") as string | null) || null

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

      // Attempt extended insert with optional fields, fallback if columns don't exist
      const cat = (categories && categories[i]) ? String(categories[i]) : null
      const brand = (brands && brands[i]) ? String(brands[i]) : null
      const nCountriesNum = (nCountries && nCountries[i]) ? parseInt(String(nCountries[i])) : null
      const reachNum = (reaches && reaches[i]) ? parseInt(String(reaches[i])) : null

      const baseRow: any = {
        url: urlData.publicUrl,
        file_name: fileName,
        prompt: prompt,
        is_visible: true,
      }
      const extendedRow: any = { ...baseRow }
      if (source) extendedRow.src = source
      if (cat) extendedRow.category = cat
      if (brand) extendedRow.brand = brand
      if (nCountriesNum && nCountriesNum > 0) extendedRow.n_countries = nCountriesNum
      if (reachNum && reachNum > 0) extendedRow.reach = reachNum

      let insertError: any = null
      let dbRes = await supabase.from('templates').insert(extendedRow).select('id')
      insertError = dbRes.error
      if (insertError) {
        console.warn('Extended insert failed, retrying with base fields:', insertError?.message)
        await supabase.from('templates').insert(baseRow).select('id')
      }
    }

    // Log summary only
    console.log(`API: /api/templates/upload - Uploaded ${files.length} template(s)`)

    return NextResponse.json({ uploaded }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 })
  }
}
