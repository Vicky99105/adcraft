import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Heuristic collector similar to the client-side ResultGrid extractor
function extractImageStrings(input: any): string[] {
	const out = new Set<string>()
	const pushIfImage = (v: unknown) => {
		if (typeof v !== "string") return
		if (v.startsWith("http") || v.startsWith("data:image")) out.add(v)
	}
	const walk = (node: any) => {
		if (node == null) return
		if (Array.isArray(node)) {
			node.forEach(walk)
		} else if (typeof node === "object") {
			Object.values(node).forEach(walk)
		} else {
			pushIfImage(node)
		}
	}
	walk(input)
	return Array.from(out)
}

function isTemplateOrUploadUrl(url: string): boolean {
	// Exclude obvious non-result assets
	return url.includes("/templates/") || url.includes("/uploads/")
}

export async function POST(request: Request) {
	try {
		const body = await request.json().catch(() => ({}))
		// Accept many shapes; allow callers to send { results } or any JSON that contains images
		const candidate = Array.isArray(body?.results) ? body.results : body
		const images = extractImageStrings(candidate)

		// Build an exclusion set from metadata
		const meta = body?.metadata || {}
		const templates: string[] = Array.isArray(meta?.templates) ? meta.templates : []
		const userImageUrl: string | undefined = typeof meta?.userImageUrl === "string" ? meta.userImageUrl : undefined
		const executionId: string | undefined = typeof meta?.execution_id === "string" ? meta.execution_id : undefined
		const exclusionSet = new Set<string>([...templates, userImageUrl].filter(Boolean) as string[])

		// Filter out original product image, templates, and anything from templates/uploads buckets
		const filtered = images
			.filter((u) => !exclusionSet.has(u))
			.filter((u) => !isTemplateOrUploadUrl(u))

		if (filtered.length === 0) {
			return NextResponse.json({ uploaded: [], count: 0 }, { status: 200 })
		}

		const uploadedResults: string[] = []

		for (let i = 0; i < filtered.length; i++) {
			const result = filtered[i]
			let fileBuffer: ArrayBuffer
			let fileName: string
			let contentType: string

			if (result.startsWith("data:")) {
				// Handle base64 data URLs
				const [header, base64Data] = result.split(",")
				const mimeMatch = header.match(/data:([^;]+)/)
				contentType = mimeMatch ? mimeMatch[1] : "image/png"
				const extension = (contentType.split("/")[1] || "png").split(";")[0]
				const nodeBuffer = Buffer.from(base64Data, "base64")
				fileBuffer = nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength)
				fileName = `result-${Date.now()}-${i}.${extension}`
			} else {
				// HTTP(S) URL
				try {
					const response = await fetch(result)
					if (!response.ok) continue
					fileBuffer = await response.arrayBuffer()
					contentType = response.headers.get("content-type") || "image/png"
					const extension = (contentType.split("/")[1] || "png").split(";")[0]
					fileName = `result-${Date.now()}-${i}.${extension}`
				} catch (fetchError) {
					console.error("Failed to fetch image:", fetchError)
					continue
				}
			}

			// Upload to Supabase Storage under the results bucket
			const filePath = `generated/${fileName}`
			const { error } = await supabase.storage
				.from("results")
				.upload(filePath, fileBuffer, {
					contentType,
					upsert: false,
				})
			if (error) {
				console.error("Supabase upload error:", error)
				continue
			}

			const { data: urlData } = supabase.storage
				.from("results")
				.getPublicUrl(filePath)
			uploadedResults.push(urlData.publicUrl)

			// Log result row
			await supabase.from('results').insert({
				execution_id: executionId,
				url: urlData.publicUrl,
				file_name: fileName,
			})
		}

		// Optional metadata passthrough (best-effort)
		const metadata = body?.metadata
		if (metadata && uploadedResults.length > 0) {
			const { error: metadataError } = await supabase
				.from("results_metadata")
				.insert({
					result_urls: uploadedResults,
					metadata,
					created_at: new Date().toISOString(),
				})
			if (metadataError) {
				console.error("Metadata storage error:", metadataError)
			}
		}

		return NextResponse.json({ uploaded: uploadedResults, count: uploadedResults.length }, { status: 201 })
	} catch (err: any) {
		console.error("Results upload error:", err)
		return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 })
	}
}
