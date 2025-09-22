"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TemplatePicker } from "@/components/template-picker"
import { ChevronRight, RotateCcw, ArrowUpDown } from "lucide-react"
import useSWR from "swr"
import type { Template } from "@/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function TemplatesPage() {
  const { data } = useSWR<{ templates: Template[] }>("/api/templates/list", fetcher)
  const templates = data?.templates || []

  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([])
  const [source, setSource] = useState<"meta" | "youtube">("meta")
  const [sourceName, setSourceName] = useState<string>("Meta Ads Studio")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"none" | "n_countries" | "reach">("none")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    // Check if we're navigating from another page
    const isNavigation = sessionStorage.getItem('navigating')
    
    if (isNavigation) {
      // Load existing selection
      const storedTemplates = sessionStorage.getItem('selectedTemplates')
      if (storedTemplates) {
        try {
          setSelectedTemplates(JSON.parse(storedTemplates))
        } catch (error) {
          console.error('Error parsing stored templates:', error)
        }
      }
      sessionStorage.removeItem('navigating')
    } else {
      // Fresh page load - clear all data
      const prevSource = sessionStorage.getItem('selectedSource') as ("meta" | "youtube" | null)
      const prevName = sessionStorage.getItem('selectedSourceName') || undefined
      sessionStorage.clear()
      if (prevSource) sessionStorage.setItem('selectedSource', prevSource)
      if (prevName) sessionStorage.setItem('selectedSourceName', prevName)
    }

    // Load chosen source from session
    const ssSource = (sessionStorage.getItem('selectedSource') as ("meta" | "youtube")) || "meta"
    const ssName = sessionStorage.getItem('selectedSourceName') || (ssSource === 'meta' ? 'Meta Ads Studio' : 'YouTube Thumbnail Lab')
    setSource(ssSource)
    setSourceName(ssName)
  }, [])

  const handleTemplateSelection = (templates: Template[]) => {
    setSelectedTemplates(templates)
  }

  const handleNext = () => {
    if (selectedTemplates.length > 0) {
      sessionStorage.setItem('selectedTemplates', JSON.stringify(selectedTemplates))
      sessionStorage.setItem('navigating', 'true')
      window.location.href = '/public/upload'
    }
  }

  // Home button removed per request

  const handleResetSelection = () => {
    setSelectedTemplates([])
    sessionStorage.removeItem('selectedTemplates')
  }

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      const exists = prev.includes(cat)
      const next = exists ? prev.filter(c => c !== cat) : [...prev, cat]
      return next
    })
  }


  // First filter by source (src field from database)
  const sourceFiltered = templates.filter(t => {
    const tSrc = (t as any).src as string | undefined
    // Treat missing src as 'meta' for backward compatibility
    const effective = tSrc || 'Meta'
    // Convert both to lowercase for case-insensitive comparison
    return effective.toLowerCase() === source.toLowerCase()
  })

  // Get categories from the source-filtered templates
  const categories = Array.from(new Set(
    sourceFiltered
      .map(t => (t as any).category as string | undefined)
      .filter((v): v is string => !!v)
  ))

  // Then filter by selected categories
  const categoryFiltered = selectedCategories.length === 0
    ? sourceFiltered
    : sourceFiltered.filter(t => selectedCategories.includes(((t as any).category as string) || ""))

  // Sort templates based on selected criteria
  const sortedTemplates = useMemo(() => {
    if (sortBy === "none") return categoryFiltered

    return [...categoryFiltered].sort((a, b) => {
      let aVal: number = 0
      let bVal: number = 0

      switch (sortBy) {
        case "n_countries":
          aVal = a.n_countries || 0
          bVal = b.n_countries || 0
          break
        case "reach":
          aVal = a.reach || 0
          bVal = b.reach || 0
          break
      }

      return sortOrder === "asc" ? aVal - bVal : bVal - aVal
    })
  }, [categoryFiltered, sortBy, sortOrder])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">AdCraft</h1>
          <div className="flex items-center gap-4">
            {selectedTemplates.length > 0 && (
              <Button 
                onClick={handleNext} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                Upload Product
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            {selectedTemplates.length > 0 && (
              <Button 
                variant="outline" 
                onClick={handleResetSelection}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-black"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
            {/* Home button removed */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold mb-2 text-white">{sourceName}</h2>
          </div>


          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Badge
              variant={selectedCategories.length === 0 ? 'default' : 'outline'}
              className={`cursor-pointer transition-all duration-200 hover:scale-105 px-4 py-2 text-sm ${
                selectedCategories.length === 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent'
              }`}
              onClick={() => setSelectedCategories([])}
            >
              All Categories
            </Badge>
            {categories.length > 0 ? (
              categories.map(cat => (
                <Badge
                  key={cat}
                  variant={selectedCategories.includes(cat) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-all duration-200 hover:scale-105 px-4 py-2 text-sm ${
                    selectedCategories.includes(cat)
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent'
                  }`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="border-gray-600 text-gray-500 bg-transparent px-4 py-2 text-sm">
                No categories found
              </Badge>
            )}
          </div>

          {/* Sort Controls */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">Sort by:</span>
            </div>
            <Select value={sortBy} onValueChange={(value: "none" | "n_countries" | "reach") => setSortBy(value)}>
              <SelectTrigger className="w-40 bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Choose field" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="none" className="text-white hover:bg-gray-700">Default</SelectItem>
                <SelectItem value="n_countries" className="text-white hover:bg-gray-700">Countries</SelectItem>
                <SelectItem value="reach" className="text-white hover:bg-gray-700">Reach</SelectItem>
              </SelectContent>
            </Select>
            {sortBy !== "none" && (
              <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
                <SelectTrigger className="w-32 bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="desc" className="text-white hover:bg-gray-700">High to Low</SelectItem>
                  <SelectItem value="asc" className="text-white hover:bg-gray-700">Low to High</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          <TemplatePicker
            templates={sortedTemplates}
            selected={selectedTemplates}
            onChange={handleTemplateSelection}
          />
          
          {selectedTemplates.length > 0 && (
            <div className="text-center">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {selectedTemplates.length} template{selectedTemplates.length !== 1 ? 's' : ''} selected
              </Badge>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
