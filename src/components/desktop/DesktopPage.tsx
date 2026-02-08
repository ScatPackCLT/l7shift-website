'use client'

import React from 'react'
import { useMouseTracking } from '@/hooks/useMouseTracking'
import { useScrollTracking } from '@/hooks/useScrollTracking'
import { useContactForm } from '@/hooks/useContactForm'
import { GradientBar } from '@/components/shared/GradientBar'
import { CustomCursor } from './CustomCursor'
import { Navigation } from './Navigation'
import { HeroSection } from './HeroSection'
import { MarqueeSection } from './MarqueeSection'
import { StatsTickerSection } from './StatsTickerSection'
import { ProblemSection } from './ProblemSection'
import { ServicesSection } from './ServicesSection'
import { ProcessSection } from './ProcessSection'
import { WhyUsSection } from './WhyUsSection'
import { CaseStudySection } from './CaseStudySection'
import { InvestmentSection } from './InvestmentSection'
import { ContactSection } from './ContactSection'
import { Footer } from './Footer'

export function DesktopPage() {
  const { mousePos, isHovering, handleHoverStart, handleHoverEnd } = useMouseTracking()
  const { scrollY } = useScrollTracking()
  const { formData, formStatus, setFormData, handleSubmit } = useContactForm()

  return (
    <main>
      {/* Custom Cursor */}
      <CustomCursor mousePos={mousePos} isHovering={isHovering} />

      {/* Noise Overlay */}
      <div className="noise" />

      {/* Scanline Effect */}
      <div className="scanline" />

      {/* Gradient Bar */}
      <GradientBar position="fixed" top={0} left={0} right={0} zIndex={100} />

      {/* Navigation */}
      <Navigation onHoverStart={handleHoverStart} onHoverEnd={handleHoverEnd} />

      {/* Hero Section */}
      <HeroSection
        scrollY={scrollY}
        onHoverStart={handleHoverStart}
        onHoverEnd={handleHoverEnd}
      />

      {/* Marquee Section */}
      <MarqueeSection />

      {/* Live Stats Ticker */}
      <StatsTickerSection />

      {/* Problem Section */}
      <ProblemSection onHoverStart={handleHoverStart} onHoverEnd={handleHoverEnd} />

      {/* Services Section */}
      <ServicesSection onHoverStart={handleHoverStart} onHoverEnd={handleHoverEnd} />

      {/* Process Section */}
      <ProcessSection onHoverStart={handleHoverStart} onHoverEnd={handleHoverEnd} />

      {/* Why Us Section */}
      <WhyUsSection onHoverStart={handleHoverStart} onHoverEnd={handleHoverEnd} />

      {/* Case Study Section */}
      <CaseStudySection onHoverStart={handleHoverStart} onHoverEnd={handleHoverEnd} />

      {/* Investment Section */}
      <InvestmentSection onHoverStart={handleHoverStart} onHoverEnd={handleHoverEnd} />

      {/* Contact Section */}
      <ContactSection
        formData={formData}
        formStatus={formStatus}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        onHoverStart={handleHoverStart}
        onHoverEnd={handleHoverEnd}
      />

      {/* Footer */}
      <Footer onHoverStart={handleHoverStart} onHoverEnd={handleHoverEnd} />

      {/* Bottom gradient bar */}
      <GradientBar />
    </main>
  )
}
