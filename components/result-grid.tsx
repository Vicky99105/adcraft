import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface ResultItem {
  instructions?: string | null
  generatedImageUrl?: string | null
  success: boolean
  error?: any
}

interface N8nResponse {
  success: boolean
  results?: ResultItem[]
}

// Updated component to handle individual result success statuses
export function ResultGrid({ response }: { response: any }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleImageClick = (url: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPreviewUrl(url)
  }

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

  // Handle n8n response format (support nested .data wrappers)
  const payload = response && typeof response === 'object' && 'data' in response
    ? (response as { data: unknown }).data
    : response

  const results = Array.isArray((payload as any)?.results)
    ? ((payload as any).results as ResultItem[])
    : Array.isArray(payload)
      ? (payload as ResultItem[])
      : []
  
  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <Alert className="bg-gray-800 border-gray-700">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-gray-300">
            No results found in the response.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Results grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {results.map((result, index) => (
          <ResultCard 
            key={index} 
            result={result} 
            index={index}
            onImageClick={handleImageClick}
            onDownload={handleDownloadImage}
            onCopy={handleCopyToClipboard}
          />
        ))}
      </div>
      
      {/* Preview Modal */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Generated Ad Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {previewUrl && (
              <img 
                src={previewUrl} 
                alt="Generated Ad Preview" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Individual result card component
function ResultCard({ 
  result, 
  index, 
  onImageClick, 
  onDownload, 
  onCopy 
}: { 
  result: ResultItem
  index: number
  onImageClick: (url: string, e: React.MouseEvent) => void
  onDownload: (url: string, adNumber: number) => void
  onCopy: (url: string) => void
}) {
  const { success = true, generatedImageUrl, instructions, error } = result

  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden bg-gray-900 flex flex-col h-[320px]">
      {/* Status badge */}
      <div className="p-2 border-b border-gray-700 bg-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          {success ? (
            <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Success
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              <XCircle className="w-3 h-3 mr-1" />
              Failed
            </Badge>
          )}
          <span className="text-xs text-gray-300">Ad {index + 1}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {success && generatedImageUrl && generatedImageUrl !== 'null' ? (
          <>
            {/* Image */}
            <div className="flex-1 bg-gray-800 p-2 cursor-pointer hover:bg-gray-700 transition-colors min-h-0">
              <img 
                src={generatedImageUrl} 
                alt={`Generated Ad ${index + 1}`} 
                className="w-full h-full max-h-[240px] object-contain block mx-auto" 
                onClick={(e) => onImageClick(generatedImageUrl, e)}
              />
            </div>

            {/* Actions */}
            <div className="p-2 border-t border-gray-700 bg-gray-900 flex-shrink-0">
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => onCopy(generatedImageUrl)}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors"
                >
                  Copy
                </button>
                <button
                  onClick={() => onDownload(generatedImageUrl, index + 1)}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                >
                  Download
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Error state */
          <div className="flex-1 flex items-center justify-center p-4 bg-gray-800 min-h-0">
            <div className="text-center">
              <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <h3 className="text-white font-medium mb-1 text-sm">Generation Failed</h3>
              <p className="text-gray-300 text-xs mb-2">
                {error === 'PROHIBITED_CONTENT' 
                  ? 'Content was flagged as prohibited. Please try with different content.'
                  : 'This ad could not be generated successfully.'
                }
              </p>
              {error && (
                <details className="text-left">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                    Error Details
                  </summary>
                  <pre className="text-xs text-red-300 mt-1 p-1 bg-gray-900 rounded overflow-auto max-h-20">
                    {JSON.stringify(error, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
