// Attempts to extract image URLs from a variety of response shapes.
// It shows a grid of images if any look like URLs or data URLs.
export function ResultGrid({ payload }: { payload: any }) {
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
        <figure key={u + i} className="rounded-lg border border-gray-700 overflow-hidden bg-gray-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u || "/placeholder.svg"} alt={`Generated Ad ${i + 1}`} className="w-full h-80 sm:h-96 md:h-[28rem] object-contain" />
          <figcaption className="text-xs text-gray-300 p-3 text-center bg-gray-900">
            Generated Ad {i + 1}
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
