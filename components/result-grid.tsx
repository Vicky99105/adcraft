// Attempts to extract image URLs from a variety of response shapes.
// It shows a grid of images if any look like URLs or data URLs.
export function ResultGrid({ payload }: { payload: any }) {
  const handleDownloadImage = async (imageUrl: string, adNumber: number) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `AdCraft-Generated-Ad-${adNumber}.png`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      alert('Image downloaded.')
    } catch (error) {
      console.error('Error downloading image:', error)
      alert('Failed to download image. Please try again.')
    }
  }
  const handleCopyToClipboard = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const ClipboardItemCtor = (window as any).ClipboardItem || (globalThis as any).ClipboardItem
      // Preferred path: write image blob
      if (navigator.clipboard && ClipboardItemCtor) {
        await (navigator as any).clipboard.write([
          new ClipboardItemCtor({ [blob.type]: blob })
        ])
        alert('Image copied to clipboard.')
        return
      }

      // Fallback 1: copy data URL string (works in more browsers)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(dataUrl)
        alert('Image data URL copied to clipboard. Paste where supported.')
        return
      }

      // Fallback 2: open the image in a new tab as a last resort
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      alert('Opened image in a new tab. Please copy it manually.')
    } catch (error) {
      console.error('Error copying image to clipboard:', error)
      alert('Failed to copy image to clipboard.')
    }
  }
  const urls = extractImageUrls(payload)

  if (urls.length === 0) {
    return (
      <pre className="text-xs whitespace-pre-wrap break-words bg-gray-900 p-3 rounded-md text-white">
        {JSON.stringify(payload, null, 2)}
      </pre>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {urls.map((u, i) => (
        <figure key={u + i} className="rounded-lg border border-gray-700 overflow-hidden bg-gray-900 flex flex-col">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="flex-1 flex items-center justify-center bg-gray-800 p-4">
            <img 
              src={u || "/placeholder.svg"} 
              alt={`Generated Ad ${i + 1}`} 
              className="max-w-full max-h-[400px] w-auto h-auto object-contain" 
            />
          </div>
          <figcaption className="text-xs text-gray-300 p-3 text-center bg-gray-900 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span>Generated Ad {i + 1}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyToClipboard(u)}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors"
                >
                  Copy
                </button>
                <button
                  onClick={() => handleDownloadImage(u, i + 1)}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                >
                  Download
                </button>
              </div>
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

// Heuristic URL collector
function extractImageUrls(data: any): string[] {
  const out = new Set<string>()
  const pushIfUrl = (v: any) => {
    if (typeof v === "string" && (v.startsWith("http") || v.startsWith("data:image"))) {
      out.add(v)
    }
  }

  const walk = (node: any) => {
    if (node == null) return
    if (Array.isArray(node)) {
      node.forEach(walk)
    } else if (typeof node === "object") {
      Object.values(node).forEach(walk)
    } else {
      pushIfUrl(node)
    }
  }

  walk(data)

  return Array.from(out)
}
