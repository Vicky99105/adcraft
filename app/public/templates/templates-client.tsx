"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import type { CheckedState } from "@radix-ui/react-checkbox"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TemplatePicker } from "@/components/template-picker"
import { cn } from "@/lib/utils"
import { ChevronRight, RotateCcw, ArrowUpDown, Home, Filter } from "lucide-react"
import useSWR from "swr"
import type { Template } from "@/types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type WorkflowSource = "meta" | "youtube"

type TemplatesClientProps = {
  initialSource: WorkflowSource
}

export function TemplatesClient({ initialSource }: TemplatesClientProps) {
  const { data } = useSWR<{ templates: Template[] }>("/api/templates/list", fetcher)
  const templates = data?.templates || []

  type SortField = "none" | "n_countries" | "reach" | "views"

  const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([])
  const [source, setSource] = useState<WorkflowSource>(initialSource)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortField>("none")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [scrollY, setScrollY] = useState(0)

  const hasHydrated = useRef(false)

  const persistSelectedSource = (nextSource: WorkflowSource) => {
    try {
      sessionStorage.setItem('selectedSource', nextSource)
      document.cookie = `selectedSource=${nextSource}; path=/; max-age=604800; SameSite=Lax`
    } catch (error) {
      console.warn('Failed to persist selected source:', error)
    }
  }

  useEffect(() => {
    if (hasHydrated.current) return
    hasHydrated.current = true

    const storedSource = sessionStorage.getItem('selectedSource') as WorkflowSource | null
    if (storedSource === 'youtube' || storedSource === 'meta') {
      setSource(storedSource)
      persistSelectedSource(storedSource)
    } else {
      sessionStorage.setItem('selectedSource', initialSource)
      persistSelectedSource(initialSource)
    }

    const storedTemplates = sessionStorage.getItem('selectedTemplates')
    if (storedTemplates) {
      try {
        setSelectedTemplates(JSON.parse(storedTemplates))
      } catch (error) {
        console.error('Error parsing stored templates:', error)
      }
    }
  }, [initialSource])

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const filtersFloating = scrollY > 48

  const workflowCopy = useMemo(() => ({
    meta: {
      uploadCta: "Upload Product",
      selectionLabel: (count: number) => `${count} template${count !== 1 ? 's' : ''} selected`,
      badgeColor: "bg-blue-600",
    },
    youtube: {
      uploadCta: "Upload User Content",
      selectionLabel: (count: number) => `${count} thumbnail${count !== 1 ? 's' : ''} selected`,
      badgeColor: "bg-blue-600",
    },
  }), [])

  const currentCopy = workflowCopy[source]

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

  const handleResetSelection = () => {
    setSelectedTemplates([])
    sessionStorage.removeItem('selectedTemplates')
  }

  const preserveSource = () => {
    const stored = sessionStorage.getItem('selectedSource') as WorkflowSource | null
    sessionStorage.clear()
    if (stored) persistSelectedSource(stored)
  }

  const handleHome = () => {
    preserveSource()
    window.location.href = '/'
  }

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      const exists = prev.includes(cat)
      return exists ? prev.filter(c => c !== cat) : [...prev, cat]
    })
  }

  const selectAllCategories = () => {
    setSelectedCategories(categories)
  }

  const handleCategoryCheckbox = (category: string, checked: CheckedState) => {
    setSelectedCategories(prev => {
      if (checked === true) {
        return prev.includes(category) ? prev : [...prev, category]
      }
      return prev.filter(item => item !== category)
    })
  }

  const handleShowAllToggle = (checked: CheckedState) => {
    if (checked === true) {
      selectAllCategories()
    } else {
      setSelectedCategories([])
    }
  }

  const resetFilters = () => {
    setSelectedCategories([])
    setSortBy(source === "youtube" ? "views" : "none")
    setSortOrder("desc")
  }

  const sourceFiltered = templates.filter(t => {
    const templateSource = (t.src || t.source || (t as any).src || "meta").toString().toLowerCase()
    return templateSource === source.toLowerCase()
  })

  const categories = useMemo(() => (
    Array.from(new Set(
      sourceFiltered
        .map(t => t.category)
        .filter((v): v is string => !!v)
    )).sort((a, b) => a.localeCompare(b))
  ), [sourceFiltered])

  const categoryFiltered = selectedCategories.length === 0
    ? sourceFiltered
    : sourceFiltered.filter(t => selectedCategories.includes(t.category || ""))

  useEffect(() => {
    if (source === "youtube") {
      setSortBy("views")
      setSortOrder(prev => (prev === "desc" ? prev : "desc"))
    } else {
      setSortBy(prev => (prev === "views" ? "none" : prev))
    }
  }, [source])

  const sortedTemplates = useMemo(() => {
    if (source === "youtube") {
      return [...categoryFiltered].sort((a, b) => {
        const aViews = typeof a.views === "number" ? a.views : 0
        const bViews = typeof b.views === "number" ? b.views : 0
        return sortOrder === "asc" ? aViews - bViews : bViews - aViews
      })
    }

    if (sortBy === "none") return categoryFiltered

    return [...categoryFiltered].sort((a, b) => {
      let aVal = 0
      let bVal = 0

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
  }, [categoryFiltered, sortBy, sortOrder, source])

  const sortOptions: { value: SortField; label: string }[] = useMemo(() => {
    if (source === "youtube") {
      return [{ value: "views", label: "View Count" }]
    }
    return [
      { value: "none", label: "Default" },
      { value: "n_countries", label: "Countries" },
      { value: "reach", label: "Reach" },
    ]
  }, [source])

  const sourceLabel = useMemo(() => (
    source === "youtube" ? "Thumbnail Studio" : "Ads Studio"
  ), [source])

  const hasSelection = selectedTemplates.length > 0

  const displayedTemplates = useMemo(() => {
    if (!hasSelection) return sortedTemplates
    const selectionIds = new Set(selectedTemplates.map(t => t.id))
    const prioritized = sortedTemplates.filter(t => selectionIds.has(t.id))
    const remaining = sortedTemplates.filter(t => !selectionIds.has(t.id))
    return [...prioritized, ...remaining]
  }, [sortedTemplates, selectedTemplates, hasSelection])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 fixed top-0 inset-x-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-bold leading-none">AdCraft</h1>
            <span className="text-xs font-semibold leading-none text-blue-200/90">{sourceLabel}</span>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleHome}>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            {selectedTemplates.length > 0 && (
              <Button onClick={handleNext} className="next-step-hint">
                {currentCopy.uploadCta}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            {selectedTemplates.length > 0 && (
              <Button onClick={handleResetSelection}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Floating Filters */}
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <div className="container mx-auto px-6">
          <div
            className={cn(
              "flex flex-wrap items-center justify-center gap-3 rounded-full px-5 py-3 transition-all duration-300",
              filtersFloating
                ? "border border-white/15 bg-slate-900/65 backdrop-blur-xl shadow-[0_18px_45px_rgba(4,12,32,0.45)]"
                : "border border-transparent bg-slate-900/40"
            )}
          >
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  className={cn(
                    "h-9 rounded-full px-4 text-sm transition-colors",
                    filtersFloating ? "bg-blue-500/80 shadow-none hover:bg-blue-500/90" : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {selectedCategories.length > 0 && (
                    <span className="ml-1 rounded-full bg-white/25 px-2 py-0.5 text-xs text-white">
                      {selectedCategories.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-72 border-gray-700 bg-gray-900 p-0 text-sm text-white">
                <div className="border-b border-gray-800 px-4 py-3 text-xs uppercase tracking-wide text-gray-400">
                  Categories
                </div>
                <div className="border-b border-gray-800 px-4 py-2">
                  <label className="flex items-center gap-2 text-sm text-gray-200">
                    <Checkbox
                      checked={selectedCategories.length === categories.length && categories.length > 0}
                      indeterminate={selectedCategories.length > 0 && selectedCategories.length < categories.length}
                      onCheckedChange={handleShowAllToggle}
                    />
                    Show all categories
                  </label>
                </div>
                <ScrollArea className="max-h-56 overflow-y-auto">
                  <div className="space-y-2 px-4 py-3">
                    {categories.length > 0 ? (
                      categories.map((cat) => (
                        <label key={cat} className="flex items-center gap-2 text-sm text-gray-200">
                          <Checkbox
                            checked={selectedCategories.includes(cat)}
                            onCheckedChange={(checked) => handleCategoryCheckbox(cat, checked)}
                          />
                          <span className="truncate">{cat}</span>
                        </label>
                      ))
                    ) : (
                      <div className="text-xs text-gray-400">No categories found</div>
                    )}
                  </div>
                  <ScrollBar orientation="vertical" />
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
              <span>Sort by</span>
            </div>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortField)}>
              <SelectTrigger
                disabled={source === "youtube"}
                className={cn(
                  "h-9 w-36 rounded-full border border-white/10 bg-gray-900 text-sm text-white disabled:opacity-60",
                  filtersFloating && "border-white/20 bg-white/10 backdrop-blur"
                )}
              >
                <SelectValue placeholder="Choose field" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-900 text-white">
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-white hover:bg-gray-800">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sortBy !== "none" && (
              <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
                <SelectTrigger className={cn(
                  "h-9 w-32 rounded-full border border-white/10 bg-gray-900 text-sm text-white",
                  filtersFloating && "border-white/20 bg-white/10 backdrop-blur"
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-900 text-white">
                  <SelectItem value="desc" className="text-white hover:bg-gray-800">High to Low</SelectItem>
                  <SelectItem value="asc" className="text-white hover:bg-gray-800">Low to High</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button
              size="sm"
              onClick={resetFilters}
              className={cn(
                "h-9 rounded-full px-3 text-xs transition-colors",
                filtersFloating ? "bg-blue-500/80 shadow-none hover:bg-blue-500/90" : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              Reset filters
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 pb-24 pt-[160px]">
        <TemplatePicker
          templates={displayedTemplates}
          selected={selectedTemplates}
          onChange={handleTemplateSelection}
        />
      </main>

      {!hasSelection && (
        <div className="fixed bottom-6 right-6 z-40">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="next-step-hint pointer-events-auto inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg bg-blue-600 hover:bg-blue-500"
              >
                Select templates
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="end"
              className="border border-white/10 bg-slate-900/95 text-white"
            >
              Choose at least one template to enable the upload step
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {hasSelection && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
          <div className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg ${currentCopy.badgeColor}`}>
            {currentCopy.selectionLabel(selectedTemplates.length)}
          </div>
        </div>
      )}
    </div>
  )
}
