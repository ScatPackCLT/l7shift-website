'use client'

import React, { useState } from 'react'
import { useContactForm } from '@/hooks/useContactForm'
import { MobileHeader } from './MobileHeader'
import { MobileMenuOverlay } from './MobileMenuOverlay'
import { MobileHero } from './MobileHero'
import { MobileStatsTicker } from './MobileStatsTicker'
import { MobileServices } from './MobileServices'
import { MobileProcess } from './MobileProcess'
import { MobileCaseStudy } from './MobileCaseStudy'
import { MobilePricing } from './MobilePricing'
import { MobileContact } from './MobileContact'
import { MobileFooter } from './MobileFooter'

export function MobilePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { formData, formStatus, setFormData, handleSubmit } = useContactForm()

  const toggleMenu = () => setMenuOpen(!menuOpen)
  const closeMenu = () => setMenuOpen(false)

  return (
    <main style={{ overflow: menuOpen ? 'hidden' : 'auto' }}>
      {/* Noise Overlay */}
      <div className="noise" />

      {/* Header */}
      <MobileHeader onMenuToggle={toggleMenu} />

      {/* Full-screen Menu Overlay */}
      <MobileMenuOverlay isOpen={menuOpen} onClose={closeMenu} />

      {/* Hero Section */}
      <MobileHero />

      {/* Live Stats Ticker */}
      <MobileStatsTicker />

      {/* Services Section */}
      <MobileServices />

      {/* Process Section */}
      <MobileProcess />

      {/* Case Study Section */}
      <MobileCaseStudy />

      {/* Pricing Section */}
      <MobilePricing />

      {/* Contact Section */}
      <MobileContact
        formData={formData}
        formStatus={formStatus}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
      />

      {/* Footer */}
      <MobileFooter />
    </main>
  )
}
