"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Home } from "lucide-react"
import type { Template, TriggerResponse } from "@/types"

interface TemplateWithPrompt {
  url: string
  prompt: string
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


export default function PromptsPage() {
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([])
  const [templatePrompts, setTemplatePrompts] = useState<TemplateWithPrompt[]>([])
  const [fileData, setFileData] = useState<any>(null)
  const [legacyBase64Data, setLegacyBase64Data] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [processingMessage, setProcessingMessage] = useState<string>('')
  const [selectedSource, setSelectedSource] = useState<"meta" | "youtube">("meta")

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

    // Handle the specific n8n response structure
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
    
    // Fallback: generic replacement for other structures
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
    // Check if we're navigating from another page
    const isNavigation = sessionStorage.getItem('navigating')
    if (!isNavigation) {
      window.location.href = '/public/templates'
      return
    }

    // Load data from sessionStorage
    const storedTemplates = sessionStorage.getItem('selectedTemplates')
    const storedPrompts = sessionStorage.getItem('templatePrompts')
    const storedFileData = sessionStorage.getItem('fileData')
    const storedSource = sessionStorage.getItem('selectedSource')

    if (storedSource === 'meta' || storedSource === 'youtube') {
      setSelectedSource(storedSource)
    }

    if (storedTemplates) {
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

        const initialPrompts = mergePromptsWithTemplates(templates, parsedPrompts, defaultPrompt)
        setTemplatePrompts(initialPrompts)
        sessionStorage.setItem('templatePrompts', JSON.stringify(initialPrompts))
      } catch (error) {
        console.error('Error parsing stored templates:', error)
        window.location.href = '/public/templates'
        return
      }
    } else {
      window.location.href = '/public/templates'
    }

    if (storedFileData) {
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

        // Rewrite storage without base64 payloads
        sessionStorage.setItem('fileData', JSON.stringify(sanitized))
      } catch (error) {
        console.error('Error parsing stored file data:', error)
        window.location.href = '/public/upload'
        return
      }
    } else {
      window.location.href = '/public/upload'
    }

    // Clear navigation flag
    sessionStorage.removeItem('navigating')
  }, [])

  const handleBack = () => {
    sessionStorage.setItem('navigating', 'true')
    window.location.href = '/public/upload'
  }

  const handleHome = () => {
    // Restart: reset everything and go back to template selection
    sessionStorage.clear()
    window.location.href = '/public/templates'
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

      // 1) Create an execution
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

      // Upload file to Supabase if we only have legacy base64 data
      if (!userImageUrl) {
        setProcessingMessage('Uploading product image to Supabase...')
        console.log('Uploading legacy file payload to Supabase with execution ID:', executionId)
        
        try {
          if (!legacyBase64Data) {
            throw new Error('No image data available to upload')
          }

          // Convert base64 back to file
          const base64Response = await fetch(legacyBase64Data)
          const blob = await base64Response.blob()
          const fallbackName = fileData?.name || `product-${Date.now()}.png`
          const fallbackType = fileData?.type || blob.type || 'image/png'
          const file = new File([blob], fallbackName, { type: fallbackType })
          console.log('Recreated file from legacy base64:', file.name, file.size, file.type)
          
          // Generate a session ID for this upload
          const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          console.log('Generated session ID:', sessionId)
          
          // Upload file to Supabase with execution_id
          const formData = new FormData()
          formData.append('file', file)
          formData.append('sessionId', sessionId)
          formData.append('executionId', executionId)
          
          const uploadRes = await fetch('/api/file/upload', {
            method: 'POST',
            body: formData
          })
          
          const uploadJson = await uploadRes.json()
          console.log('Upload response:', uploadJson)
          
          if (!uploadRes.ok) {
            throw new Error(uploadJson?.error || 'Upload failed')
          }
          
          // Update fileData with the uploaded URL
          userImageUrl = uploadJson.url
          const updatedFileData = sanitizeFilePayload({
            ...fileData,
            url: uploadJson.url,
            fileName: uploadJson.fileName,
            filePath: uploadJson.filePath,
            sessionId: sessionId,
            uploaded: true,
            uploadId: uploadJson.uploadId
          })

          if (!updatedFileData) {
            throw new Error('Failed to sanitize uploaded file data')
          }

          setFileData(updatedFileData)
          setLegacyBase64Data(null)

          // Update sessionStorage with the uploaded file data
          sessionStorage.setItem('fileData', JSON.stringify(updatedFileData))
          sessionStorage.setItem('previewUrl', uploadJson.url)
          
          console.log('File successfully uploaded to Supabase with execution ID:', uploadJson.url)
        } catch (error) {
          console.error('Error uploading file to Supabase:', error)
          alert('Failed to upload file to Supabase. Please try again.')
          setSubmitting(false)
          return
        }
      }

      if (!userImageUrl) {
        alert('Product image is missing. Please upload again.')
        setSubmitting(false)
        return
      }

      // 2) Process templates with AI
      setProcessingMessage('Processing templates with AI...')

      // 2) Trigger n8n webhook with templates and prompts array
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL
      const triggerRes = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templates: templatePrompts, // Array of {url, prompt}
          userImageUrl,
          webhookUrl: webhookUrl,
          execution_id: executionId,
          src: selectedSource,
        }),
      })
      const triggerJson = await triggerRes.json()

      // 3) Upload results to Supabase and replace base64 with URLs
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
            console.log(`Uploaded ${uploadData.count} results to Supabase`)
            
            const uploadedList = Array.isArray(uploadData.uploaded) ? uploadData.uploaded : []
            processedResponse = replaceBase64WithUrls(triggerJson, uploadedList)

            if (uploadedList.length > 0) {
              console.log(`Replaced ${uploadedList.length} base64 images with Supabase URLs`)
            } else {
              console.warn('No images were uploaded to Supabase; stripped base64 payloads from response instead')
            }

            console.log('Processed response size:', JSON.stringify(processedResponse).length, 'bytes')
          }
        } catch (uploadErr) {
          console.error("Failed to upload results to Supabase:", uploadErr)
          processedResponse = replaceBase64WithUrls(triggerJson, [])
        }
      }

      // Check if we have valid results
      if (!triggerRes.ok) {
        throw new Error(triggerJson?.error || "n8n webhook returned error")
      }

      // Check for empty or invalid response
      if (!triggerJson || (typeof triggerJson === 'object' && Object.keys(triggerJson).length === 0)) {
        throw new Error("No results generated. Please try again.")
      }

      // Check if raw field is empty but we have execution_id
      if (triggerJson.raw === "" && triggerJson.execution_id) {
        throw new Error("Generation completed but no images were produced. Please check your prompts and try again.")
      }

      const response = {
        ok: true,
        data: processedResponse,
        error: undefined,
      }
      
      // Check response size before storing in sessionStorage
      const responseString = JSON.stringify(response)
      const responseSizeKB = Math.round(responseString.length / 1024)
      console.log(`Response size: ${responseSizeKB} KB`)
      
      if (responseSizeKB > 5000) { // 5MB warning
        console.warn(`Response size (${responseSizeKB} KB) is large and may cause sessionStorage issues`)
      }
      
      // Save results to sessionStorage and navigate to results page
      try {
        sessionStorage.setItem('generationResults', responseString)
        sessionStorage.setItem('navigating', 'true')
        window.location.href = '/public/results'
      } catch (storageError) {
        console.error('Failed to store results in sessionStorage:', storageError)
        alert('Results are too large to store. Please try with fewer templates or contact support.')
        setSubmitting(false)
        return
      }
    } catch (err: any) {
      // Handle error by saving to sessionStorage and redirecting to results page
      const errorResponse = { 
        ok: false, 
        error: err?.message || "Something went wrong during generation" 
      }
      sessionStorage.setItem('generationResults', JSON.stringify(errorResponse))
      sessionStorage.setItem('navigating', 'true')
      window.location.href = '/public/results'
    } finally {
      // Avoid brief flicker back to the prompts UI if we're navigating away
      try {
        const isNavigating = typeof window !== 'undefined' && sessionStorage.getItem('navigating') === 'true'
        if (!isNavigating) {
          setSubmitting(false)
          setProcessingMessage('')
        }
      } catch (_) {
        // If sessionStorage isn't available for some reason, fall back to resetting state
        setSubmitting(false)
        setProcessingMessage('')
      }
    }
  }

  const updateTemplatePrompt = (url: string, prompt: string) => {
    setTemplatePrompts(prev => {
      const updated = prev.map(tp => tp.url === url ? { ...tp, prompt } : tp)
      // Save to sessionStorage immediately
      sessionStorage.setItem('templatePrompts', JSON.stringify(updated))
      return updated
    })
  }


  const handleStartOver = () => {
    sessionStorage.clear()
    window.location.href = '/public/templates'
  }


  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">AdCraft</h1>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleBack} 
                disabled={submitting}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleGenerate} 
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? "Generating..." : "Generate Ads"}
              </Button>
            </div>
            <Button 
              variant="outline" 
              onClick={handleHome}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-black"
            >
              <Home className="w-4 h-4 mr-2" />
              Restart
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Processing Message */}
          {submitting ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-3 bg-blue-900 border border-blue-700 rounded-lg px-6 py-4 mb-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span className="text-white font-medium">{processingMessage || "Generating your ads..."}</span>
              </div>
              <p className="text-sm text-gray-400">⏱️ Generation may take up to 10-15 seconds per image</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-3xl font-semibold mb-2 text-white">Customize Prompts</h2>
                <p className="text-gray-300">Set specific instructions for each template</p>
                <p className="text-sm text-gray-400 mt-2">💡 Tell the AI what to add, replace, or change in your templates for finalized ad results</p>
              </div>
              
              <div className="grid gap-6 max-w-4xl mx-auto">
                {templatePrompts.map((template, index) => (
                <Card key={template.url} className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Template {index + 1}</CardTitle>
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
                        <Label htmlFor={`prompt-${index}`} className="text-gray-300 mb-2 block">Instructions for this template</Label>
                        <Textarea
                          id={`prompt-${index}`}
                          value={template.prompt}
                          onChange={(e) => updateTemplatePrompt(template.url, e.target.value)}
                          placeholder="Describe how the ad should look for this template..."
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
