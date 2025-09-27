"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ResultGrid } from "@/components/result-grid"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"
import type { TriggerResponse, Template } from "@/types"

type WorkflowSource = "meta" | "youtube"

type ResultsClientProps = {
  initialSource: WorkflowSource
}

interface TemplateWithPrompt {
  url: string
  prompt: string
}

const sanitizeFilePayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const { base64Data, previewUrl, ...rest } = payload

  return {
    ...rest,
    uploaded: rest?.uploaded ?? Boolean(rest?.url),
  }
}

const FeedbackButton = ({ 
  onShowForm, 
  isVisible = true 
}: { 
  onShowForm: () => void
  isVisible?: boolean 
}) => {
  if (!isVisible) return null
  
  return (
    <Button 
      onClick={onShowForm}
    >
      Give Feedback
    </Button>
  )
}

const FeedbackForm = ({ onSubmit }: { onSubmit: (rating: number, feedback: string, email: string) => void }) => {
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return
    
    setSubmitting(true)
    await onSubmit(rating, feedback, email)
    setSubmitting(false)
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-lg text-white">Rate Your Experience</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-300 mb-2 block">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-2xl hover:scale-110 transition-transform"
                >
                  <Star 
                    className={`w-8 h-8 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} 
                  />
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label htmlFor="email" className="text-gray-300 mb-2 block">Email (optional)</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="feedback" className="text-gray-300 mb-2 block">Feedback (optional)</label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us how we can improve..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white min-h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={rating === 0 || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function ResultsClient({ initialSource }: ResultsClientProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([])
  const [templatePrompts, setTemplatePrompts] = useState<TemplateWithPrompt[]>([])
  const [fileData, setFileData] = useState<any>(null)
  const [resp, setResp] = useState<TriggerResponse | null>(null)
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [selectedSource, setSelectedSource] = useState<WorkflowSource>(initialSource)
  const hasHydrated = useRef(false)

  const persistSelectedSource = useCallback((source: WorkflowSource) => {
    try {
      sessionStorage.setItem('selectedSource', source)
      document.cookie = `selectedSource=${source}; path=/; max-age=604800; SameSite=Lax`
    } catch (error) {
      console.warn('Failed to persist selected source:', error)
    }
  }, [])

  useEffect(() => {
    if (hasHydrated.current) return
    hasHydrated.current = true

    const storedSource = sessionStorage.getItem('selectedSource')
    if (storedSource === 'meta' || storedSource === 'youtube') {
      setSelectedSource(storedSource)
      persistSelectedSource(storedSource)
    } else {
      setSelectedSource(initialSource)
      persistSelectedSource(initialSource)
    }

    const storedTemplates = sessionStorage.getItem('selectedTemplates')
    const storedPrompts = sessionStorage.getItem('templatePrompts')
    const storedFileData = sessionStorage.getItem('fileData')
    const storedSourceFromSession = sessionStorage.getItem('selectedSource')

    if (storedSourceFromSession === 'meta' || storedSourceFromSession === 'youtube') {
      setSelectedSource(storedSourceFromSession)
      persistSelectedSource(storedSourceFromSession)
    }
    
    if (storedTemplates) {
      try {
        setSelectedTemplates(JSON.parse(storedTemplates))
      } catch (error) {
        console.error('Error parsing stored templates:', error)
        window.location.href = '/public/templates'
      }
    } else {
      window.location.href = '/public/templates'
    }

    if (storedPrompts) {
      try {
        setTemplatePrompts(JSON.parse(storedPrompts))
      } catch (error) {
        console.error('Error parsing stored prompts:', error)
      }
    }

    if (storedFileData) {
      try {
        const parsed = JSON.parse(storedFileData)
        const sanitized = sanitizeFilePayload(parsed)

        if (sanitized) {
          setFileData(sanitized)
          sessionStorage.setItem('fileData', JSON.stringify(sanitized))
        }
      } catch (error) {
        console.error('Error parsing stored file data:', error)
        window.location.href = '/public/upload'
      }
    } else {
      window.location.href = '/public/upload'
    }

    const storedResults = sessionStorage.getItem('generationResults')
    if (storedResults) {
      try {
        const results = JSON.parse(storedResults)
        setResp(results)
        const sourceFromResponse = results?.data?.src || results?.src
        if ((sourceFromResponse === 'meta' || sourceFromResponse === 'youtube')) {
          setSelectedSource(sourceFromResponse)
          persistSelectedSource(sourceFromResponse)
        }

        if (results?.data?.execution_id) {
          setCurrentExecutionId(results.data.execution_id)
        }
      } catch (error) {
        console.error('Error parsing stored generation results:', error)
      }
    }
  }, [initialSource, persistSelectedSource])

  const workflowCopy = useMemo(() => ({
    meta: {
      heading: "Generated Ads",
      subheading: "Your AI-generated advertisements",
      tryAgain: "Try Again",
      startOver: "Start Over",
      retryRoute: '/public/prompts',
      startOverRoute: '/public/templates',
    },
    youtube: {
      heading: "Generated Thumbnails",
      subheading: "Your AI-generated thumbnails",
      tryAgain: "Try Again",
      startOver: "Start Over",
      retryRoute: '/public/prompts',
      startOverRoute: '/public/templates',
    },
  }), [])

  const currentCopy = workflowCopy[selectedSource]
  const sourceLabel = selectedSource === "youtube" ? "Thumbnail Studio" : "Ads Studio"

  const handleBack = () => {
    persistSelectedSource(selectedSource)
    window.location.href = currentCopy.retryRoute
  }

  const handleStartOver = () => {
    persistSelectedSource(selectedSource)
    sessionStorage.removeItem('selectedTemplates')
    sessionStorage.removeItem('templatePrompts')
    sessionStorage.removeItem('fileData')
    sessionStorage.removeItem('generationResults')
    window.location.href = currentCopy.startOverRoute
  }

  const handleHome = () => {
    persistSelectedSource(selectedSource)
    sessionStorage.clear()
    persistSelectedSource(selectedSource)
    window.location.href = '/'
  }

  const handleFeedbackSubmit = async (rating: number, feedback: string, email: string) => {
    if (!currentExecutionId) return
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execution_id: currentExecutionId, rating, feedback, email })
      })
      setFeedbackSubmitted(true)
      setShowFeedbackForm(false)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  const shouldShowFeedback = !feedbackSubmitted && !!currentExecutionId

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-gray-900 border-b border-gray-800 fixed top-0 inset-x-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-end">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl md:text-4xl font-bold leading-none text-white">AdCraft</h1>
            <span className="text-xs font-semibold leading-none text-blue-200/90">{sourceLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleBack}>{currentCopy.tryAgain}</Button>
            <Button onClick={handleStartOver}>{currentCopy.startOver}</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 pt-28 pb-24">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold mb-2 text-white">{currentCopy.heading}</h2>
            <p className="text-gray-300">{currentCopy.subheading}</p>
          </div>
          
          {resp && (
            <>
              {!resp.ok || (resp.data && resp.data.results && resp.data.results.every((result: any) => !result.success)) ? (
                <div className="max-w-2xl mx-auto">
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Generation Error
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-red-800 rounded-lg p-4">
                        <h3 className="text-white font-medium mb-2">
                          {!resp.ok ? "Generation Error" : (selectedSource === 'youtube' ? 'All Thumbnails Failed' : 'All Ads Failed')}
                        </h3>
                        <p className="text-red-200 text-sm">
                          {!resp.ok 
                            ? `The app encountered an error while generating your ${selectedSource === 'youtube' ? 'thumbnails' : 'ads'}. Please report this issue to vp991058@gmail.com and we'll help you resolve it.`
                            : `All ${selectedSource === 'youtube' ? 'thumbnail' : 'advertisement'} generations failed. Please try again with different settings or contact support if the issue persists.`
                          }
                        </p>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <FeedbackButton 
                          onShowForm={() => setShowFeedbackForm(!showFeedbackForm)}
                          isVisible={shouldShowFeedback}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  {showFeedbackForm && !feedbackSubmitted && currentExecutionId && (
                    <div className="mt-6">
                      <FeedbackForm onSubmit={handleFeedbackSubmit} />
                    </div>
                  )}
                </div>
              ) : (
                <ResultGrid 
                  response={resp}
                  selectedSource={selectedSource}
                  selectedTemplates={selectedTemplates}
                  templatePrompts={templatePrompts}
                />
              )}
            </>
          )}

          {!resp && (
            <Alert className="bg-blue-950/60 border-blue-800 text-blue-100">
              <AlertTitle>Ready to generate</AlertTitle>
              <AlertDescription>
                Your results will appear here once the generation completes.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center">
            <Badge variant="secondary" className="bg-blue-600 text-white">
              {selectedSource === 'youtube' ? 'Thumbnail Studio' : 'Ads Studio'}
            </Badge>
          </div>
        </div>
      </main>
    </div>
  )
}
