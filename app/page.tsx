"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlowCard } from "@/components/ui/spotlight-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Layers, ArrowRight, Palette, Image as ImageIcon, Film, Play, Settings } from "lucide-react"

const MARQUEE_BORDER_VARIANTS = ["glow", "glass", "contrast"] as const

export default function HomePage() {
  const appsRef = useRef<HTMLDivElement | null>(null)
  const problemRef = useRef<HTMLDivElement | null>(null)
  const solutionRef = useRef<HTMLDivElement | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [scrollY, setScrollY] = useState(0)
  const [inView, setInView] = useState({ problem: false, solution: false })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleSelect = (source: "meta" | "youtube") => {
    try {
      sessionStorage.clear()
      sessionStorage.setItem("selectedSource", source)
      const name = source === "meta" ? "Meta Ads Studio" : "YouTube Thumbnail Lab"
      sessionStorage.setItem("selectedSourceName", name)
      document.cookie = `selectedSource=${source}; path=/; max-age=604800; SameSite=Lax`
    } catch (_) {}
    window.location.href = "/public/templates"
  }

  const scrollToApps = () => {
    appsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const [showAppsHeading, setShowAppsHeading] = useState(false)
  const marqueeImages = useMemo(
    () => [
      "https://beuvicoqsglxifsbxkvc.supabase.co/storage/v1/object/public/results/generated/result-1757748076484-0.png",
      "https://beuvicoqsglxifsbxkvc.supabase.co/storage/v1/object/public/results/generated/result-1757020588563-0.png",
      "https://beuvicoqsglxifsbxkvc.supabase.co/storage/v1/object/public/results/generated/result-1757315057924-0.png",
      "https://beuvicoqsglxifsbxkvc.supabase.co/storage/v1/object/public/results/generated/result-1757315580404-0.png",
      "https://beuvicoqsglxifsbxkvc.supabase.co/storage/v1/object/public/results/generated/result-1758144895132-0.png",
      "https://beuvicoqsglxifsbxkvc.supabase.co/storage/v1/object/public/results/generated/result-1758967674783-1.png",
      "https://beuvicoqsglxifsbxkvc.supabase.co/storage/v1/object/public/results/generated/result-1757973093888-0.png",
      "https://beuvicoqsglxifsbxkvc.supabase.co/storage/v1/object/public/results/generated/result-1758979135379-1.png",
      "https://beuvicoqsglxifsbxkvc.supabase.co/storage/v1/object/public/results/generated/result-1758979641494-0.png",
      "https://beuvicoqsglxifsbxkvc.supabase.co/storage/v1/object/public/results/generated/result-1758986692664-0.png"
    ],
    []
  )
  const marqueeSequence = useMemo(
    () => [...marqueeImages, ...marqueeImages, ...marqueeImages],
    [marqueeImages]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('scroll', handleScroll)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    const el = appsRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      setShowAppsHeading(entry.isIntersecting)
    }, { threshold: 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const marqueeDuration = 100

  useEffect(() => {
    const targets = [
      ['problem', problemRef],
      ['solution', solutionRef],
    ] as const
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const found = targets.find(([, ref]) => ref.current === entry.target)
        if (found) {
          const [key] = found
          if (entry.isIntersecting) {
            setInView((prev) => ({ ...prev, [key]: true }))
          }
        }
      })
    }, { threshold: 0.6 })
    targets.forEach(([, ref]) => ref.current && io.observe(ref.current))
    return () => io.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
        <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/3 left-1/3 w-28 h-28 bg-pink-500/10 rounded-full blur-2xl"></div>
      </div>
      {/* Full Width Header */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrollY > 50 ? 'rgba(17, 24, 39, 0.9)' : 'transparent',
          backdropFilter: scrollY > 50 ? 'blur(10px)' : 'none',
          borderBottom: scrollY > 50 ? '1px solid rgba(55, 65, 81, 0.5)' : 'none',
        }}
      >
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          {/* App Name */}
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Adcraft
          </h1>

          {/* Admin Button */}
          <Button 
            variant="ghost" 
            size="default"
            className="text-white hover:bg-white/10 border-0 bg-transparent text-base px-4 py-2"
            onClick={() => window.location.href = '/admin'}
          >
            <Settings className="w-5 h-5 mr-2" />
            Admin
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative w-full h-screen flex flex-col justify-center px-6 md:px-16 pb-24 md:pb-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 left-1/3 w-56 h-56 bg-pink-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="z-10 max-w-6xl mx-auto mb-28 md:mb-32 relative">
          <div className="grid md:grid-cols-10 gap-6 md:gap-8 items-center">
            <div className="md:col-span-10">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 md:mb-8 relative leading-[1.05] md:leading-[1.02]">
                <span className="relative z-10">Turn top ads and thumbnails</span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent relative z-10">
                  into your next winner
                </span>
              </h2>
              
              <p className="text-white/80 text-[16px] md:text-[18px] mb-6 md:mb-7 max-w-3xl relative z-10 font-normal leading-[1.45]">
                Create high‑CTR assets from proven winners, guided by your instructions
              </p>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-[14px]">
                <Button 
                  size="lg" 
                  aria-label="Start from Meta Ads"
                  className="px-8 py-[18px] text-base md:text-lg text-white border-0 transition-transform duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:scale-[1.03] focus:scale-[0.99] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-[0_8px_20px_rgba(59,130,246,0.35),0_2px_8px_rgba(147,51,234,0.25)] focus:ring-2 focus:ring-purple-400/40"
                  onClick={scrollToApps}
                >
                  <Play className="mr-3 w-5 h-5 md:w-6 md:h-6" />
                  Start with Meta Ads
                </Button>
              </div>
            </div>
            
          </div>
        </div>

        {/* Animated Image Marquee */}
        <div className="absolute bottom-0 left-0 w-full h-[42vh] md:h-[42vh] lg:h-[44vh] overflow-hidden">
          <div
            className="hero-marquee"
            style={{
              '--marquee-duration': `${marqueeDuration}s`,
              '--marquee-gap': '0.9rem',
            } as CSSProperties}
          >
            {marqueeSequence.map((src, idx) => {
              const displayIndex = idx % marqueeImages.length
              const isClone = idx >= marqueeImages.length
              const rotation = displayIndex % 2 === 0 ? "rotate-[-2deg]" : "rotate-[5deg]"
              const borderStyle = displayIndex % 3 === 0 ? "glow" : displayIndex % 3 === 1 ? "luminous" : "contrast"
              return (
                <div
                  key={`${idx}-${src}`}
                  className={cn(
                    "hero-marquee__card relative flex-shrink-0 aspect-[4/5] h-60 md:h-[21rem] rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02]",
                    rotation
                  )}
                  data-border-style={borderStyle}
                  role="button"
                  tabIndex={isClone ? -1 : 0}
                  aria-hidden={isClone}
                  onClick={() => setPreviewUrl(src)}
                  onKeyDown={(event) => {
                    if (!isClone && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault()
                      setPreviewUrl(src)
                    }
                  }}
                >
                  <img
                    src={src}
                    alt={`Creative ad ${displayIndex + 1}`}
                    className="w-full h-full object-cover cursor-zoom-in"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Transition Section */}
      <section className="relative h-20 bg-gradient-to-b from-transparent via-black/50 to-black"></section>

      {/* App Cards */}
      <section ref={appsRef} className="py-20 bg-black relative overflow-hidden">
        {/* Subtle Background Elements for App Cards */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/6 left-1/12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/5 right-1/12 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/6 left-1/8 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className={cn("text-center mb-16 transition-all duration-300", showAppsHeading ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}> 
            <h3 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-white">
              Choose Your Creative Tool
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Smart Ad Creator (Meta) */}
          <div
            className="group cursor-pointer transition-transform duration-300 hover:-translate-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
            role="button"
            tabIndex={0}
            onClick={() => handleSelect('meta')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleSelect('meta')
              }
            }}
          >
            <GlowCard glowColor="purple" customSize={true} className="w-full h-full p-8 lg:p-9 min-h-[420px]">
              <div className="flex items-start gap-5 mb-6">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
                  <Palette className="w-9 h-9" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-[26px] font-bold text-white leading-tight">Smart Ad Creator</h3>
                  <p className="text-white/70 leading-relaxed text-[15px] md:text-base">Generate compelling advertisements by combining your product with proven successful ad templates</p>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-white text-sm md:text-base"><Layers className="w-4 h-4" /> Key Features</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm md:text-[15px]">
                    {['AI-powered layouts','A/B testing ready','Brand consistency','Multi-platform formats'].map((f,i)=> (
                      <div key={i} className="flex items-center gap-2 text-white/80"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> {f}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-white text-sm md:text-base">Perfect For</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {['Social media ads','Display banners','Video thumbnails'].map((t,i)=>(
                      <Badge key={i} variant="outline" className="text-xs border-white/30 text-white/80">{t}</Badge>
                    ))}
                  </div>
                </div>
                <div className="pt-5 border-t border-white/15">
                  <Button 
                    className="w-full"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleSelect('meta')
                    }}
                  >
                    Launch Smart Ad Creator
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            </GlowCard>
          </div>

          {/* Thumbnail Generator (YouTube) */}
          <div
            className="group cursor-pointer transition-transform duration-300 hover:-translate-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
            role="button"
            tabIndex={0}
            onClick={() => handleSelect('youtube')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleSelect('youtube')
              }
            }}
          >
            <GlowCard glowColor="blue" customSize={true} className="w-full h-full p-8 lg:p-9 min-h-[420px]">
              <div className="flex items-start gap-5 mb-6">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
                  <ImageIcon className="w-9 h-9" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-[26px] font-bold text-white leading-tight">Thumbnail Generator</h3>
                  <p className="text-white/70 leading-relaxed text-[15px] md:text-base">Create eye-catching thumbnails that boost click-through rates using successful design patterns</p>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-white text-sm md:text-base"><Layers className="w-4 h-4" /> Key Features</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm md:text-[15px]">
                    {['Click-optimized designs','Text overlay AI','Emotion analysis','Platform optimization'].map((f,i)=> (
                      <div key={i} className="flex items-center gap-2 text-white/80"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> {f}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-white text-sm md:text-base">Perfect For</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {['YouTube thumbnails','Blog headers','Course covers'].map((t,i)=>(
                      <Badge key={i} variant="outline" className="text-xs border-white/30 text-white/80">{t}</Badge>
                    ))}
                  </div>
                </div>
                <div className="pt-5 border-t border-white/15">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 transition-all duration-200 hover:scale-[1.02]"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleSelect('youtube')
                    }}
                  >
                    Launch Thumbnail Generator
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            </GlowCard>
          </div>

          {/* Movie Poster Studio (coming soon) */}
          <div className="group transition-transform duration-300 hover:-translate-y-2">
            <GlowCard glowColor="orange" customSize={true} className="w-full h-full p-8 lg:p-9 min-h-[420px]">
              <div className="flex items-start gap-5 mb-6">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg">
                  <Film className="w-9 h-9" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-[26px] font-bold text-white leading-tight">Movie Poster Studio</h3>
                  <p className="text-white/70 leading-relaxed text-[15px] md:text-base">Design cinematic posters by merging your content with blockbuster movie poster aesthetics</p>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-white text-sm md:text-base"><Layers className="w-4 h-4" /> Key Features</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm md:text-[15px]">
                    {['Cinematic templates','Typography mastery','Color grading','Genre styles'].map((f,i)=> (
                      <div key={i} className="flex items-center gap-2 text-white/80"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> {f}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-white text-sm md:text-base">Perfect For</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {['Movie posters','Event promos','Book covers'].map((t,i)=>(
                      <Badge key={i} variant="outline" className="text-xs border-white/30 text-white/80">{t}</Badge>
                    ))}
                  </div>
                </div>
                <div className="pt-5 border-t border-white/15">
                  <Button 
                    disabled
                    className="w-full bg-gray-400 text-gray-600 cursor-not-allowed border-0"
                  >
                    Coming Soon
                  </Button>
                </div>
              </div>
            </GlowCard>
          </div>
        </div>
        </div>
      </section>

      {/* Problem Section */}
      <section ref={problemRef} className="relative py-[72px] md:py-[96px] bg-gradient-to-b from-[#080b16] via-[#05070f] to-[#080b15] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-60 h-60 bg-purple-500/15 blur-3xl" />
          <div className="absolute bottom-[-80px] right-[-40px] w-72 h-72 bg-blue-500/10 blur-3xl" />
        </div>
        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className={cn("max-w-3xl transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]", inView.problem ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}> 
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70 mb-6">
              The Problem
            </span>
            <h3 className="text-[26px] md:text-[32px] font-semibold tracking-tight -tracking-[0.01em] leading-[1.25] mb-[18px] text-white">
              The real problem with making ads that work
            </h3>
            <p className="text-white/75 text-[16px] leading-[1.55] mb-[28px]">
              Teams lose momentum before design even starts. Research drags on, edits pile up, and matching real-world examples to your product becomes guesswork.
            </p>
          </div>
          <div className={cn("grid md:grid-cols-3 gap-5 md:gap-6 transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]", inView.problem ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}> 
            {[{
              title: 'Endless research',
              text: 'Hours disappear hunting for winning ads before you even get to design.'
            },{
              title: 'Manual editing grind',
              text: 'Resizing, masking, and exporting every asset by hand slows every launch.'
            },{
              title: 'Difficult referencing',
              text: 'It\'s painful to pull your product into top templates without breaking the layout.'
            }].map((item, idx) => (
              <div key={idx} className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] via-white/[0.03] to-transparent p-5 md:p-6 shadow-[0_6px_22px_rgba(3,6,16,0.55)] hover:shadow-[0_10px_32px_rgba(5,12,28,0.6)] transition-[box-shadow,transform,opacity] duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:-translate-y-[3px]">
                <h4 className="text-[18px] font-semibold mb-[10px] -tracking-[0.01em] text-white">{item.title}</h4>
                <p className="text-[15px] leading-[1.55] text-white/70">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section ref={solutionRef} className="relative py-[80px] md:py-[108px] bg-gradient-to-b from-[#020814] via-[#040912] to-[#05080f] overflow-hidden">
        <div className="absolute inset-0 noise-bg opacity-[0.55] pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className={cn("max-w-3xl transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]", inView.solution ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}> 
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-blue-200/80 mb-6">
              The Fix
            </span>
            <h3 className="text-[26px] md:text-[32px] font-semibold tracking-tight -tracking-[0.01em] leading-[1.25] mb-[18px] text-white">
              Build from what’s already winning
            </h3>
            <p className="text-white/80 text-[16px] leading-[1.55] mb-[32px]">
              Start with proven Meta ads and viral YouTube thumbnails, then layer your product and instructions. AdCraft handles the heavy lifting so you can ship faster.
            </p>
          </div>
          <div className={cn("grid md:grid-cols-3 gap-[18px] md:gap-6 transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]", inView.solution ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}> 
            {[{
              title: 'Proven templates',
              text: 'Curated from real campaigns so you’re never starting from zero.',
              icon: <Layers className="w-5 h-5" />
            },{
              title: 'Guided by your brief',
              text: 'Describe the look — we align layout, typography, and color automatically.',
              icon: <Palette className="w-5 h-5" />
            },{
              title: 'Platform-ready outputs',
              text: 'Export sizes for Meta, YouTube, and more with consistent branding.',
              icon: <Settings className="w-5 h-5" />
            }].map((card, idx) => (
              <div key={idx} className="group rounded-2xl border border-white/10 bg-white/[0.04] p-[20px] md:p-7 hover:bg-white/[0.07] transition-all duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:scale-[1.03]" style={{ minHeight: idx === 1 ? 220 : 204 }}>
                <div className="flex items-center justify-start mb-[14px]">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-[0_6px_18px_rgba(99,102,241,0.35)]">
                    {card.icon}
                  </div>
                </div>
                <h4 className="text-[18px] font-semibold mb-[8px] -tracking-[0.01em] text-white">{card.title}</h4>
                <p className="text-[15px] leading-[1.55] text-white/75">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 bg-[#0b0b0f]">
        <div className="absolute inset-0 noise-bg opacity-[0.8] pointer-events-none" />
        <div className="container mx-auto px-6 py-4 md:py-5 text-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-white/65 relative z-10">
          <div className="order-2 md:order-1 leading-relaxed md:w-full">
            <div>© {new Date().getFullYear()} <span className="text-white">AdCraft</span>.</div>
            <div>All rights reserved.</div>
          </div>
          <div className="order-1 md:order-2 flex items-center gap-3 md:ml-auto md:justify-end md:w-full">
            <span className="text-white/70">Credits:</span>
            <a href="https://agentiwise.com/" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">Agentiwise</a>
          </div>
          <div className="order-3 flex items-center gap-3" />
        </div>
      </footer>

      {/* Floating Creative Elements */}
      <div className="fixed top-20 left-20 w-4 h-4 bg-blue-400/30 rounded-full blur-sm animate-pulse pointer-events-none" />
      <div className="fixed bottom-32 right-32 w-6 h-6 bg-purple-400/30 rounded-full blur-sm animate-bounce pointer-events-none" />
      <div className="fixed top-1/2 right-20 w-3 h-3 bg-pink-400/30 rounded-full blur-sm animate-pulse pointer-events-none" />

      {/* Mouse follower gradient */}
      <div
        className="fixed pointer-events-none w-96 h-96 rounded-full blur-3xl opacity-10 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 z-0 transition-transform duration-300 ease-out"
        style={{
          left: mousePosition.x - 192,
          top: mousePosition.y - 192,
        }}
      />

      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => {
          if (!open) setPreviewUrl(null)
        }}
      >
        <DialogContent className="max-w-5xl bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Creative Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="relative w-full max-w-4xl h-[60vh] sm:h-[70vh] mx-auto">
              <Image
                src={previewUrl}
                alt="Creative Preview"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
