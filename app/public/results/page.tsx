"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ResultGrid } from "@/components/result-grid"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"
import type { TriggerResponse, Template } from "@/types"

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
      variant="outline" 
      onClick={onShowForm}
      className="bg-blue-600 hover:bg-blue-700 text-white"
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
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResultsPage() {
  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([])
  const [templatePrompts, setTemplatePrompts] = useState<TemplateWithPrompt[]>([])
  const [fileData, setFileData] = useState<any>(null)
  const [resp, setResp] = useState<TriggerResponse | null>(null)
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [selectedSource, setSelectedSource] = useState<"meta" | "youtube" | null>(null)

  useEffect(() => {
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

    // Check if we already have results
    const storedResults = sessionStorage.getItem('generationResults')
    if (storedResults) {
      try {
        const results = JSON.parse(storedResults)
        console.log(storedResults)
        setResp(results)
        // Extract execution ID from results for feedback
        const sourceFromResponse = results?.data?.src || results?.src
        if ((sourceFromResponse === 'meta' || sourceFromResponse === 'youtube') && !storedSource) {
          setSelectedSource(sourceFromResponse)
          sessionStorage.setItem('selectedSource', sourceFromResponse)
        }

        if (results?.data?.execution_id) {
          setCurrentExecutionId(results.data.execution_id)
        }
      } catch (error) {
        console.error('Error parsing stored results:', error)
      }
    } else {
      // No results found - redirect to prompts page
      window.location.href = '/public/prompts'
    }
  }, [])


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

  const handleBack = () => {
    window.location.href = '/public/prompts'
  }

  const handleHome = () => {
    sessionStorage.clear()
    window.location.href = '/'
  }

  const handleStartOver = () => {
    sessionStorage.clear()
    window.location.href = '/public/templates'
  }

  // Helper to determine if feedback should be shown
  const shouldShowFeedback = !feedbackSubmitted && !!currentExecutionId

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">AdCraft</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleBack}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-black"
            >
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={handleStartOver}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-black"
            >
              Start Over
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold mb-2 text-white">Generated Ads</h2>
            <p className="text-gray-300">Your AI-generated advertisements</p>
          </div>
          
          {/* Results or Error */}
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
                          {!resp.ok ? "Generation Error" : "All Ads Failed"}
                        </h3>
                        <p className="text-red-200 text-sm">
                          {!resp.ok 
                            ? "The app encountered an error while generating your ads. Please report this issue to vp991058@gmail.com and we'll help you resolve it."
                            : "All advertisement generations failed. Please try again with different settings or contact support if the issue persists."
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
                  
                  {feedbackSubmitted && (
                    <div className="mt-6">
                      <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="text-center py-6">
                          <p className="text-green-400">Thank you for your feedback!</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Card className="bg-gray-900 border-gray-800">
                    <CardContent>
                      <ResultGrid payload={resp.data} />
                    </CardContent>
                  </Card>
                  
                  <div className="flex gap-3 justify-center pt-4">
                    <FeedbackButton 
                      onShowForm={() => setShowFeedbackForm(!showFeedbackForm)}
                      isVisible={shouldShowFeedback}
                    />
                  </div>
                  
                  {showFeedbackForm && !feedbackSubmitted && currentExecutionId && (
                    <div className="mt-6">
                      <FeedbackForm onSubmit={handleFeedbackSubmit} />
                    </div>
                  )}
                  
                  {feedbackSubmitted && (
                    <div className="mt-6">
                      <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="text-center py-6">
                          <p className="text-green-400">Thank you for your feedback!</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
