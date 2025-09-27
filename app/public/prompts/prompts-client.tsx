"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Home } from "lucide-react"
import type { Template } from "@/types"

interface TemplateWithPrompt {
  url: string
  prompt: string
}

type WorkflowSource = "meta" | "youtube"

type PromptsClientProps = {
  initialSource: WorkflowSource
}

const sanitizeFilePayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const { base64Data, previewUrl, ...rest } = payload

  const sanitized = {
    ...rest,
    uploaded: rest?.uploaded ?? Boolean(rest?.url),
  }

  return sanitized
}

const mergePromptsWithTemplates = (
  templates: Template[],
  stored: TemplateWithPrompt[] | null,
  defaultPrompt: string
): TemplateWithPrompt[] => {
  if (!templates || templates.length === 0) {
    return []
  }

  const promptMap = new Map<string, string>(
    (stored || [])
      .filter((item): item is TemplateWithPrompt => {
        return !!item && typeof item.url === 'string'
      })
      .map((item) => [item.url, typeof item.prompt === 'string' ? item.prompt : ''])
  )

  return templates.map((template) => {
    if (promptMap.has(template.url)) {
      return {
        url: template.url,
        prompt: promptMap.get(template.url) ?? '',
      }
    }

    return {
      url: template.url,
      prompt: template.prompt || defaultPrompt,
    }
  })
}

export function PromptsClient({ initialSource }: PromptsClientProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([])
  const [templatePrompts, setTemplatePrompts] = useState<TemplateWithPrompt[]>([])
  const [fileData, setFileData] = useState<any>(null)
  const [legacyBase64Data, setLegacyBase64Data] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [processingMessage, setProcessingMessage] = useState<string>('')
  const [selectedSource, setSelectedSource] = useState<WorkflowSource>(initialSource)

  const persistSelectedSource = useCallback((source: WorkflowSource) => {
    try {
      sessionStorage.setItem('selectedSource', source)
      document.cookie = `selectedSource=${source}; path=/; max-age=604800; SameSite=Lax`
    } catch (error) {
      console.warn('Failed to persist selected source:', error)
    }
  }, [])

  const defaultPrompt = "Place the uploaded product onto each template image as a realistic ad composite. Keep aspect ratio and add soft shadow."

  const replaceBase64WithUrls = (response: any, uploadedUrls: string[]): any => {
    if (!response) {
      return response
    }

    const isDataImageString = (value: unknown): value is string => {
      return typeof value === 'string' && value.startsWith('data:image')
    }

    const uploads = Array.isArray(uploadedUrls) ? uploadedUrls : []
    const usedIndexes = new Set<number>()

    const replacementFor = (() => {
      let urlIndex = 0
      return () => {
        while (urlIndex < uploads.length && usedIndexes.has(urlIndex)) {
          urlIndex += 1
        }

        if (urlIndex >= uploads.length) {
          return null
        }

        const nextUrl = uploads[urlIndex]
        usedIndexes.add(urlIndex)
        urlIndex += 1
        return nextUrl
      }
    })()

    if (response.results && Array.isArray(response.results)) {
      const processedResults = response.results.map((result: any, index: number) => {
        if (isDataImageString(result.generatedImageUrl)) {
          if (index < uploads.length) {
            usedIndexes.add(index)
            return {
              ...result,
              generatedImageUrl: uploads[index]
            }
          }

          const fallbackUrl = replacementFor()
          return {
            ...result,
            generatedImageUrl: fallbackUrl || null
          }
        }
        return result
      })
      
      return {
        ...response,
        results: processedResults
      }
    }

    const replaceInObject = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return obj
      }
      
      if (Array.isArray(obj)) {
        return obj.map(replaceInObject)
      }
      
      if (typeof obj === 'object') {
        const newObj: any = {}
        for (const [key, value] of Object.entries(obj)) {
          if (isDataImageString(value)) {
            const nextUrl = replacementFor()
            newObj[key] = nextUrl || null
          } else {
            newObj[key] = replaceInObject(value)
          }
        }
        return newObj
      }
      
      return obj
    }
    
    return replaceInObject(response)
  }

  useEffect(() => {
    const storedTemplates = sessionStorage.getItem('selectedTemplates')
    const storedPrompts = sessionStorage.getItem('templatePrompts')
    const storedFileData = sessionStorage.getItem('fileData')
    const storedSource = sessionStorage.getItem('selectedSource')

    if (storedSource === 'meta' || storedSource === 'youtube') {
      setSelectedSource(storedSource)
      persistSelectedSource(storedSource)
    } else {
      setSelectedSource(initialSource)
      persistSelectedSource(initialSource)
    }

    if (!storedTemplates) {
      window.location.href = '/public/templates'
      return
    }

    try {
      const templates = JSON.parse(storedTemplates)
      setSelectedTemplates(templates)

      let parsedPrompts: TemplateWithPrompt[] | null = null
      if (storedPrompts) {
        try {
          parsedPrompts = JSON.parse(storedPrompts)
        } catch (promptError) {
          console.error('Error parsing stored prompts:', promptError)
        }
      }

      const initialPromptsList = mergePromptsWithTemplates(templates, parsedPrompts, defaultPrompt)
      setTemplatePrompts(initialPromptsList)
      sessionStorage.setItem('templatePrompts', JSON.stringify(initialPromptsList))
    } catch (error) {
      console.error('Error parsing stored templates:', error)
      window.location.href = '/public/templates'
      return
    }

    if (!storedFileData) {
      window.location.href = '/public/upload'
      return
    }

    try {
      const parsed = JSON.parse(storedFileData)

      if (parsed?.base64Data) {
        setLegacyBase64Data(parsed.base64Data)
      }

      const sanitized = sanitizeFilePayload(parsed)

      if (!sanitized) {
        console.warn('Stored file data invalid, redirecting to upload.')
        window.location.href = '/public/upload'
        return
      }

      setFileData(sanitized)
      sessionStorage.setItem('fileData', JSON.stringify(sanitized))
    } catch (error) {
      console.error('Error parsing stored file data:', error)
      window.location.href = '/public/upload'
      return
    }

    sessionStorage.removeItem('navigating')
  }, [initialSource, persistSelectedSource])

  const workflowCopy = useMemo(() => ({
    meta: {
      headerTitle: "Customize Prompts",
      headerSubtitle: "Set specific instructions for each template",
      helperText: "💡 Tell the AI what to add, replace, or change in your templates for finalized ad results",
      generateCta: "Generate Ads",
      startOverLabel: "Restart",
      detailLabel: (index: number) => `Template ${index + 1}`,
      promptLabel: "Instructions for this template",
      promptPlaceholder: "Describe how the ad should look for this template...",
    },
    youtube: {
      headerTitle: "Customize Thumbnail Prompts",
      headerSubtitle: "Set instructions for each thumbnail",
      helperText: "💡 Describe colors, text, and subject focus for each thumbnail",
      generateCta: "Generate Thumbnails",
      startOverLabel: "Restart",
      detailLabel: (index: number) => `Thumbnail ${index + 1}`,
      promptLabel: "Instructions for this thumbnail",
      promptPlaceholder: "Describe how the thumbnail should look for this template...",
    },
  }), [])

  const currentCopy = workflowCopy[selectedSource]
  const sourceLabel = selectedSource === "youtube" ? "Thumbnail Studio" : "Ads Studio"

  const handleBack = () => {
    sessionStorage.setItem('navigating', 'true')
    window.location.href = '/public/upload'
  }

  const handleHome = () => {
    persistSelectedSource(selectedSource)
    sessionStorage.clear()
    persistSelectedSource(selectedSource)
    window.location.href = '/'
  }

  const handleStartOver = () => {
    persistSelectedSource(selectedSource)
    sessionStorage.clear()
    persistSelectedSource(selectedSource)
    window.location.href = '/public/templates'
  }

  const updateTemplatePrompt = (url: string, prompt: string) => {
    setTemplatePrompts(prev => {
      const updated = prev.map(tp => tp.url === url ? { ...tp, prompt } : tp)
      sessionStorage.setItem('templatePrompts', JSON.stringify(updated))
      return updated
    })
  }

  const handleGenerate = async () => {
    if (templatePrompts.length === 0) {
      alert('No templates selected. Please go back and select templates.')
      return
    }

    if (!fileData) {
      alert('No product image uploaded. Please go back and upload an image.')
      return
    }

    setSubmitting(true)
    setProcessingMessage('Initializing generation process...')

    try {
      let userImageUrl = fileData.url as string | null

      if (userImageUrl) {
        console.log('File already uploaded to Supabase:', userImageUrl)
      }

      setProcessingMessage('Creating execution record...')
      const execRes = await fetch('/api/executions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          templates: selectedTemplates.map(t => t.url),
          prompts: selectedTemplates.map(t => t.prompt)
        }),
      })
      const execJson = await execRes.json()
      if (!execRes.ok || !execJson?.execution_id) {
        throw new Error(execJson?.error || 'Failed to create execution')
      }
      const executionId: string = execJson.execution_id

      if (!userImageUrl) {
        setProcessingMessage('Uploading product image to Supabase...')

        try {
          if (!legacyBase64Data) {
            throw new Error('No image data available to upload')
          }

          const base64Response = await fetch(legacyBase64Data)
          const blob = await base64Response.blob()
          const fallbackName = fileData?.name || `product-${Date.now()}.png`
          const fallbackType = fileData?.type || blob.type || 'image/png'
          const file = new File([blob], fallbackName, { type: fallbackType })

          const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

          const formData = new FormData()
          formData.append('file', file)
          formData.append('sessionId', sessionId)
          formData.append('executionId', executionId)

          const uploadRes = await fetch('/api/file/upload', {
            method: 'POST',
            body: formData
          })

          const uploadJson = await uploadRes.json()

          if (!uploadRes.ok) {
            throw new Error(uploadJson?.error || 'Upload failed')
          }

          userImageUrl = uploadJson.url

          const updatedFileData = {
            ...fileData,
            uploaded: true,
            url: uploadJson.url,
            fileName: uploadJson.fileName,
            filePath: uploadJson.filePath,
            sessionId,
            uploadId: uploadJson.uploadId || null,
          }
          setFileData(updatedFileData)
          sessionStorage.setItem('fileData', JSON.stringify(updatedFileData))
        } catch (uploadError) {
          console.error('Failed to upload legacy file payload:', uploadError)
          throw uploadError
        }
      }

      setProcessingMessage('Triggering generation...')
      const triggerRes = await fetch('/api/trigger', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templates: templatePrompts,
          userImageUrl,
          execution_id: executionId,
          src: selectedSource,
        }),
      })
      const triggerJson = await triggerRes.json()

      setProcessingMessage('Saving results...')
      let processedResponse = triggerJson
      if (triggerRes.ok && triggerJson) {
        try {
          const resultsUploadRes = await fetch("/api/results/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              results: triggerJson,
              metadata: {
                templates: selectedTemplates,
                userImageUrl,
                templatePrompts,
                timestamp: new Date().toISOString(),
                execution_id: executionId,
              },
            }),
          })

          if (resultsUploadRes.ok) {
            const uploadData = await resultsUploadRes.json()
            const uploadedList = Array.isArray(uploadData.uploaded) ? uploadData.uploaded : []
            processedResponse = replaceBase64WithUrls(triggerJson, uploadedList)

            if (uploadedList.length === 0) {
              console.warn('No images uploaded to Supabase; stripped base64 payloads instead')
            }
          }
        } catch (uploadErr) {
          console.error("Failed to upload results to Supabase:", uploadErr)
          processedResponse = replaceBase64WithUrls(triggerJson, [])
        }
      }

      if (!triggerRes.ok) {
        throw new Error(triggerJson?.error || "n8n webhook returned error")
      }

      if (!triggerJson || (typeof triggerJson === 'object' && Object.keys(triggerJson).length === 0)) {
        throw new Error("No results generated. Please try again.")
      }

      if (triggerJson.raw === "" && triggerJson.execution_id) {
        throw new Error("Generation completed but no images were produced. Please check your prompts and try again.")
      }

      const response = {
        ok: true,
        data: processedResponse,
        error: undefined,
      }

      try {
        sessionStorage.setItem('generationResults', JSON.stringify(response))
        sessionStorage.setItem('navigating', 'true')
        window.location.href = '/public/results'
      } catch (storageError) {
        console.error('Failed to store results in sessionStorage:', storageError)
        alert('Results are too large to store. Please try with fewer templates or contact support.')
        setSubmitting(false)
        return
      }
    } catch (err: any) {
      const errorResponse = { 
        ok: false, 
        error: err?.message || "Something went wrong during generation" 
      }
      sessionStorage.setItem('generationResults', JSON.stringify(errorResponse))
      sessionStorage.setItem('navigating', 'true')
      window.location.href = '/public/results'
    } finally {
      try {
        const isNavigating = typeof window !== 'undefined' && sessionStorage.getItem('navigating') === 'true'
        if (!isNavigating) {
          setSubmitting(false)
          setProcessingMessage('')
        }
      } catch (_) {
        setSubmitting(false)
        setProcessingMessage('')
      }
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-gray-900 border-b border-gray-800 fixed top-0 inset-x-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-end">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl md:text-4xl font-bold leading-none text-white">AdCraft</h1>
            <span className="text-xs font-semibold leading-none text-blue-200/90">{sourceLabel}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button 
                onClick={handleBack} 
                disabled={submitting}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleGenerate} 
                disabled={submitting}
                className={!submitting ? "next-step-hint" : undefined}
              >
                {submitting ? "Generating..." : currentCopy.generateCta}
              </Button>
            </div>
            <Button 
              onClick={handleHome}
            >
              <Home className="w-4 h-4 mr-2" />
              {currentCopy.startOverLabel}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 pt-28 pb-24">
        <div className="space-y-6">
          {submitting ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-blue-700/60 bg-blue-900/40 px-6 py-4 shadow-[0_0_30px_rgba(37,99,235,0.15)] backdrop-blur">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white"></div>
                <span className="text-base font-medium text-white">{processingMessage || "Generating your ads..."}</span>
              </div>
              <p className="mt-4 text-sm text-gray-400">⏱️ Generation may take up to 10-15 seconds per image</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-3xl font-semibold mb-2 text-white">{currentCopy.headerTitle}</h2>
                <p className="text-gray-300">{currentCopy.headerSubtitle}</p>
                <p className="text-sm text-gray-400 mt-2">{currentCopy.helperText}</p>
              </div>
              
              <div className="grid gap-6 max-w-4xl mx-auto">
                {templatePrompts.map((template, index) => (
                  <Card key={template.url} className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">{currentCopy.detailLabel(index)}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-4">
                        <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-700">
                          <img 
                            src={template.url} 
                            alt={`Template ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <Label htmlFor={`prompt-${index}`} className="text-gray-300 mb-2 block">{currentCopy.promptLabel}</Label>
                          <Textarea
                            id={`prompt-${index}`}
                            value={template.prompt}
                            onChange={(e) => updateTemplatePrompt(template.url, e.target.value)}
                            placeholder={currentCopy.promptPlaceholder}
                            className="min-h-24 bg-gray-900 border-gray-700 text-white"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
