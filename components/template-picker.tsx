import Image from "next/image"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
import { useState } from "react"
import type { Template } from "@/types"

export function TemplatePicker({
  templates,
  selected,
  onChange,
}: {
  templates: Template[]
  selected: Template[]
  onChange: (templates: Template[]) => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  function toggle(template: Template) {
    if (selected.some(t => t.id === template.id)) {
      onChange(selected.filter((t) => t.id !== template.id))
    } else {
      onChange([...selected, template])
    }
  }

  function handleImageClick(url: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setPreviewUrl(url)
  }

  const handleAddTemplate = () => {
    window.location.href = '/admin'
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-gray-400 mb-4">
          No templates found. Click the plus button to add templates.
        </div>
        <Button 
          onClick={handleAddTemplate}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Templates
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {/* Add Template Card */}
        <div
          className="group rounded-lg border-2 border-dashed border-gray-600 bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"
          onClick={handleAddTemplate}
        >
          <div className="relative aspect-square overflow-hidden rounded-t-lg flex items-center justify-center">
            <div className="text-center">
              <Plus className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Add Template</p>
            </div>
          </div>
        </div>

        {/* Template Cards */}
        {templates.map((template, idx) => {
          const isChecked = selected.some(t => t.id === template.id)
          return (
            <div
              key={template.id + idx}
              className="group rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 transition-colors relative cursor-pointer"
              onClick={() => toggle(template)}
            >
              <div className="relative aspect-square overflow-hidden rounded-t-lg">
                <Image
                  src={template.url || "/placeholder.svg?height=400&width=400&query=ad%20template%20thumbnail"}
                  alt={`Template ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 20vw"
                  unoptimized
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement
                    const fallback = "/template-image-missing.png"
                    if (target.src !== location.origin + fallback) {
                      target.src = fallback
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleImageClick(template.url, e)
                  }}
                />
                {/* Selection indicator */}
                {isChecked && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {/* Plus button overlay */}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-4 h-4" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="relative w-full h-96">
              <Image
                src={previewUrl}
                alt="Template Preview"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
