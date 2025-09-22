"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { GlowCard } from "@/components/ui/spotlight-card"
import { Layers, Sparkles, Zap, ArrowRight, Palette, Image as ImageIcon, Film, Play, Settings } from "lucide-react"

export default function HomePage() {
  const appsRef = useRef<HTMLDivElement | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [scrollY, setScrollY] = useState(0)

  const handleSelect = (source: "meta" | "youtube") => {
    try {
      sessionStorage.clear()
      sessionStorage.setItem("selectedSource", source)
      const name = source === "meta" ? "Meta Ads Studio" : "YouTube Thumbnail Lab"
      sessionStorage.setItem("selectedSourceName", name)
    } catch (_) {}
    window.location.href = "/public/templates"
  }

  const scrollToApps = () => {
    appsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const [showAppsHeading, setShowAppsHeading] = useState(false)

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
      <section className="relative w-full h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 left-1/3 w-56 h-56 bg-pink-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="z-10 flex flex-col items-center max-w-4xl mx-auto mb-24 relative">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8 relative">
            <span className="relative z-10">Transform Ideas into</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent relative z-10">
              Viral Content
            </span>
          </h2>
          
          <p className="text-white/80 text-lg md:text-xl mb-10 max-w-3xl relative z-10 font-normal leading-relaxed">
            Create high-converting ads, thumbnails, and movie posters by combining your content with proven successful designs using AI.
          </p>
          
          <Button 
            size="lg" 
            className="px-10 py-5 text-lg bg-blue-600 hover:bg-blue-700 text-white border-0 transition-all duration-300 hover:scale-105 relative z-10 shadow-lg"
            onClick={scrollToApps}
          >
            <Play className="mr-3 w-6 h-6" />
            Start Creating
          </Button>
        </div>

        {/* Animated Image Marquee */}
        <div className="absolute bottom-0 left-0 w-full h-1/3 md:h-2/5 overflow-hidden">
          <div className="flex gap-6 animate-[marquee_40s_linear_infinite] will-change-transform">
            {[
              "https://images.unsplash.com/photo-1611224923853-80b023f02d71?q=80&w=1000&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1634942537034-2531766767d1?q=80&w=1000&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1000&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1611224923853-80b023f02d71?q=80&w=1000&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1634942537034-2531766767d1?q=80&w=1000&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1000&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1611224923853-80b023f02d71?q=80&w=1000&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1634942537034-2531766767d1?q=80&w=1000&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1000&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop",
            ].map((src, i) => {
              const rotation = i % 2 === 0 ? "rotate-[-2deg]" : "rotate-[5deg]"
              return (
                <div key={i} className={cn("relative flex-shrink-0 aspect-[3/4] h-56 md:h-80 rounded-2xl shadow-xl overflow-hidden", rotation)}>
                  <img src={src} alt={`Creative ad ${i + 1}`} className="w-full h-full object-cover" />
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
          <div className="group cursor-pointer transition-transform duration-300 hover:-translate-y-2">
            <GlowCard glowColor="purple" customSize={true} className="w-full h-auto p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
                  <Palette className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 text-white">Smart Ad Creator</h3>
                  <p className="text-white/70 leading-relaxed">Generate compelling advertisements by combining your product with proven successful ad templates</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-white"><Layers className="w-4 h-4" /> Key Features</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {['AI-powered layouts','A/B testing ready','Brand consistency','Multi-platform formats'].map((f,i)=> (
                      <div key={i} className="flex items-center gap-2 text-sm text-white/80"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> {f}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-white">Perfect For</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Social media ads','Display banners','Video thumbnails'].map((t,i)=>(
                      <Badge key={i} variant="outline" className="text-xs border-white/30 text-white/80">{t}</Badge>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0 transition-all duration-300 hover:scale-105"
                    onClick={() => handleSelect('meta')}
                  >
                    Launch Smart Ad Creator
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            </GlowCard>
          </div>

          {/* Thumbnail Generator (YouTube) */}
          <div className="group cursor-pointer transition-transform duration-300 hover:-translate-y-2">
            <GlowCard glowColor="blue" customSize={true} className="w-full h-auto p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 text-white">Thumbnail Generator</h3>
                  <p className="text-white/70 leading-relaxed">Create eye-catching thumbnails that boost click-through rates using successful design patterns</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-white"><Layers className="w-4 h-4" /> Key Features</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {['Click-optimized designs','Text overlay AI','Emotion analysis','Platform optimization'].map((f,i)=> (
                      <div key={i} className="flex items-center gap-2 text-sm text-white/80"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> {f}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-white">Perfect For</h4>
                  <div className="flex flex-wrap gap-2">
                    {['YouTube thumbnails','Blog headers','Course covers'].map((t,i)=>(
                      <Badge key={i} variant="outline" className="text-xs border-white/30 text-white/80">{t}</Badge>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 transition-all duration-300 hover:scale-105"
                    onClick={() => handleSelect('youtube')}
                  >
                    Launch Thumbnail Generator
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            </GlowCard>
          </div>

          {/* Movie Poster Studio (coming soon) */}
          <div className="group cursor-pointer transition-transform duration-300 hover:-translate-y-2">
            <GlowCard glowColor="orange" customSize={true} className="w-full h-auto p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg">
                  <Film className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 text-white">Movie Poster Studio</h3>
                  <p className="text-white/70 leading-relaxed">Design cinematic posters by merging your content with blockbuster movie poster aesthetics</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-white"><Layers className="w-4 h-4" /> Key Features</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {['Cinematic templates','Typography mastery','Color grading','Genre styles'].map((f,i)=> (
                      <div key={i} className="flex items-center gap-2 text-sm text-white/80"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> {f}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-white">Perfect For</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Movie posters','Event promos','Book covers'].map((t,i)=>(
                      <Badge key={i} variant="outline" className="text-xs border-white/30 text-white/80">{t}</Badge>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
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

      {/* Footer */}
      <footer className="border-t border-white/10 bg-gray-900/50">
        <div className="container mx-auto px-6 py-4 text-sm flex flex-col md:flex-row items-center justify-between gap-3 text-white/60">
          <div>© {new Date().getFullYear()} AdCraft. All rights reserved.</div>
          <div>
            Credits: Templates, UI and assets belong to their respective owners.
          </div>
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
    </div>
  )
}
