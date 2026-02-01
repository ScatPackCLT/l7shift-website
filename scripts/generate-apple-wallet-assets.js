#!/usr/bin/env node

/**
 * Generate Wallet image assets for ShiftCards
 *
 * Apple Wallet:
 * - icon.png (29x29 @1x, 58x58 @2x, 87x87 @3x)
 * - logo.png (160x50 @1x, 320x100 @2x)
 * - strip.png (375x123 @1x, 750x246 @2x)
 * - thumbnail.png (90x90 @1x, 180x180 @2x)
 *
 * Google Wallet:
 * - logo-google.png (660x660 with circular safe zone)
 * - hero.png (1032x336)
 *
 * Usage: node scripts/generate-apple-wallet-assets.js
 */

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

// L7 Shift brand colors
const COLORS = {
  voidBlack: '#0A0A0A',
  electricCyan: '#00F0FF',
  hotMagenta: '#FF00AA',
  acidLime: '#BFFF00',
  white: '#FAFAFA',
}

const OUTPUT_DIR = path.join(__dirname, '../public/wallet-assets/l7')

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Generate icon images with gradient border (L7 mark)
 */
async function generateIcons() {
  const sizes = [
    { name: 'icon.png', size: 29 },
    { name: 'icon@2x.png', size: 58 },
    { name: 'icon@3x.png', size: 87 },
  ]

  for (const { name, size } of sizes) {
    const fontSize = Math.floor(size * 0.45)
    const borderWidth = Math.max(1, Math.floor(size / 30))
    const radius = Math.floor(size * 0.15)

    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="iconBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${COLORS.electricCyan};stop-opacity:1" />
            <stop offset="50%" style="stop-color:${COLORS.hotMagenta};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${COLORS.acidLime};stop-opacity:1" />
          </linearGradient>
          <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${COLORS.electricCyan};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${COLORS.white};stop-opacity:1" />
          </linearGradient>
        </defs>
        <!-- Background -->
        <rect width="${size}" height="${size}" fill="${COLORS.voidBlack}" rx="${radius}"/>
        <!-- Gradient border -->
        <rect x="${borderWidth}" y="${borderWidth}"
              width="${size - borderWidth * 2}" height="${size - borderWidth * 2}"
              fill="none" stroke="url(#iconBorder)" stroke-width="${borderWidth}"
              rx="${radius - borderWidth/2}"/>
        <!-- L7 text -->
        <text x="${size / 2}" y="${size * 0.62}"
              font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
              font-size="${fontSize}" font-weight="bold"
              fill="url(#textGrad)" text-anchor="middle">L7</text>
      </svg>
    `

    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(OUTPUT_DIR, name))

    console.log(`✓ Generated ${name} (${size}x${size})`)
  }
}

/**
 * Generate logo - SHIFTCARDS™ in bold gradient (like JJ Rewards)
 * Sized to fill the space properly
 */
async function generateLogos() {
  const sizes = [
    { name: 'logo.png', width: 160, height: 50 },
    { name: 'logo@2x.png', width: 320, height: 100 },
  ]

  for (const { name, width, height } of sizes) {
    // Size to fit "SHIFTCARDS™" across the width
    const mainFontSize = Math.floor(width / 6.5)  // ~49px for 320w, fits nicely
    const tmFontSize = Math.floor(mainFontSize * 0.4)

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:${COLORS.electricCyan};stop-opacity:1" />
            <stop offset="45%" style="stop-color:${COLORS.hotMagenta};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${COLORS.acidLime};stop-opacity:1" />
          </linearGradient>
          <filter id="logoGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <!-- SHIFTCARDS™ - bold gradient, properly spaced -->
        <text x="0" y="${height * 0.72}"
              font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
              font-size="${mainFontSize}" font-weight="800"
              fill="url(#logoGradient)" filter="url(#logoGlow)"
              letter-spacing="-1">SHIFTCARDS<tspan font-size="${tmFontSize}" baseline-shift="super" fill="${COLORS.white}">™</tspan></text>
      </svg>
    `

    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(OUTPUT_DIR, name))

    console.log(`✓ Generated ${name} (${width}x${height})`)
  }
}

/**
 * Generate strip images with premium ShiftCard design
 * Includes gradient borders, corner accents, and breaking square element
 */
async function generateStrips() {
  const sizes = [
    { name: 'strip.png', width: 375, height: 123 },
    { name: 'strip@2x.png', width: 750, height: 246 },
  ]

  for (const { name, width, height } of sizes) {
    const borderWidth = Math.max(2, Math.floor(width / 200))
    const cornerLength = Math.floor(width / 15)
    const squareSize = Math.floor(height * 0.35)
    const squareX = width - squareSize - 20
    const squareY = height / 2

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Main gradient for border glow -->
          <linearGradient id="borderGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${COLORS.electricCyan};stop-opacity:1" />
            <stop offset="50%" style="stop-color:${COLORS.hotMagenta};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${COLORS.acidLime};stop-opacity:1" />
          </linearGradient>

          <!-- Glow filter for neon effect -->
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="${borderWidth * 2}" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <!-- Corner radial glows -->
          <radialGradient id="topLeftGlow" cx="0%" cy="0%" r="60%">
            <stop offset="0%" style="stop-color:${COLORS.electricCyan};stop-opacity:0.25" />
            <stop offset="100%" style="stop-color:${COLORS.electricCyan};stop-opacity:0" />
          </radialGradient>
          <radialGradient id="bottomRightGlow" cx="100%" cy="100%" r="60%">
            <stop offset="0%" style="stop-color:${COLORS.hotMagenta};stop-opacity:0.2" />
            <stop offset="100%" style="stop-color:${COLORS.hotMagenta};stop-opacity:0" />
          </radialGradient>

          <!-- Subtle grid pattern -->
          <pattern id="grid" width="${Math.floor(width/20)}" height="${Math.floor(width/20)}" patternUnits="userSpaceOnUse">
            <path d="M ${Math.floor(width/20)} 0 L 0 0 0 ${Math.floor(width/20)}" fill="none" stroke="${COLORS.electricCyan}" stroke-width="0.5" stroke-opacity="0.08"/>
          </pattern>
        </defs>

        <!-- Base dark background -->
        <rect width="100%" height="100%" fill="${COLORS.voidBlack}"/>

        <!-- Corner glows for depth -->
        <rect width="100%" height="100%" fill="url(#topLeftGlow)"/>
        <rect width="100%" height="100%" fill="url(#bottomRightGlow)"/>

        <!-- Subtle grid overlay -->
        <rect width="100%" height="100%" fill="url(#grid)"/>

        <!-- Gradient border frame with glow - BOLD -->
        <rect x="${borderWidth}" y="${borderWidth}"
              width="${width - borderWidth * 2}" height="${height - borderWidth * 2}"
              fill="none" stroke="url(#borderGlow)" stroke-width="${borderWidth * 2}"
              rx="${borderWidth * 3}" ry="${borderWidth * 3}"
              filter="url(#glow)" opacity="0.85"/>

        <!-- Corner accent lines - top left (cyan) - BOLD -->
        <path d="M ${cornerLength} ${borderWidth * 2} L ${borderWidth * 2} ${borderWidth * 2} L ${borderWidth * 2} ${cornerLength}"
              fill="none" stroke="${COLORS.electricCyan}" stroke-width="${borderWidth * 2}" stroke-linecap="square"/>

        <!-- Corner accent - top right (magenta) - BOLD -->
        <path d="M ${width - cornerLength} ${borderWidth * 2} L ${width - borderWidth * 2} ${borderWidth * 2} L ${width - borderWidth * 2} ${cornerLength}"
              fill="none" stroke="${COLORS.hotMagenta}" stroke-width="${borderWidth * 2}" stroke-linecap="square"/>

        <!-- Corner accent - bottom left (lime) - BOLD -->
        <path d="M ${borderWidth * 2} ${height - cornerLength} L ${borderWidth * 2} ${height - borderWidth * 2} L ${cornerLength} ${height - borderWidth * 2}"
              fill="none" stroke="${COLORS.acidLime}" stroke-width="${borderWidth * 2}" stroke-linecap="square"/>

        <!-- Corner accent - bottom right (cyan) - BOLD -->
        <path d="M ${width - borderWidth * 2} ${height - cornerLength} L ${width - borderWidth * 2} ${height - borderWidth * 2} L ${width - cornerLength} ${height - borderWidth * 2}"
              fill="none" stroke="${COLORS.electricCyan}" stroke-width="${borderWidth * 2}" stroke-linecap="square"/>

        <!-- Breaking square element (rotated) - MORE VISIBLE -->
        <g transform="translate(${squareX}, ${squareY}) rotate(15)">
          <rect x="${-squareSize/2}" y="${-squareSize/2}"
                width="${squareSize}" height="${squareSize}"
                fill="none" stroke="url(#borderGlow)" stroke-width="${borderWidth * 1.5}"
                opacity="0.5"/>
        </g>
      </svg>
    `

    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(OUTPUT_DIR, name))

    console.log(`✓ Generated ${name} (${width}x${height})`)
  }
}

/**
 * Generate thumbnail with gradient ring (like the web avatar)
 */
async function generateThumbnail() {
  const sizes = [
    { name: 'thumbnail.png', size: 90 },
    { name: 'thumbnail@2x.png', size: 180 },
  ]

  for (const { name, size } of sizes) {
    const fontSize = Math.floor(size * 0.32)
    const ringWidth = Math.max(4, Math.floor(size / 20))
    const innerRadius = size / 2 - ringWidth * 2

    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gradient ring like web design -->
          <linearGradient id="thumbRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${COLORS.electricCyan};stop-opacity:1" />
            <stop offset="33%" style="stop-color:${COLORS.hotMagenta};stop-opacity:1" />
            <stop offset="66%" style="stop-color:${COLORS.acidLime};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${COLORS.electricCyan};stop-opacity:1" />
          </linearGradient>
          <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="${ringWidth/2}" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Background -->
        <rect width="${size}" height="${size}" fill="${COLORS.voidBlack}"/>

        <!-- Outer glow ring -->
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - ringWidth}"
                fill="none" stroke="url(#thumbRing)" stroke-width="${ringWidth}"
                filter="url(#ringGlow)"/>

        <!-- Inner dark circle -->
        <circle cx="${size / 2}" cy="${size / 2}" r="${innerRadius}"
                fill="${COLORS.voidBlack}"/>

        <!-- KL initials (placeholder for avatar) -->
        <text x="${size / 2}" y="${size * 0.58}"
              font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
              font-size="${fontSize}" font-weight="bold"
              fill="${COLORS.white}" text-anchor="middle" opacity="0.9">KL</text>
      </svg>
    `

    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(OUTPUT_DIR, name))

    console.log(`✓ Generated ${name} (${size}x${size})`)
  }
}

// =============================================================================
// GOOGLE WALLET ASSETS
// =============================================================================

/**
 * Generate Google Wallet logo (660x660)
 * Content should stay within circular safe zone
 * Design: "L7" mark with gradient ring, matching Apple thumbnail style
 */
async function generateGoogleLogo() {
  const size = 660
  const safeRadius = size * 0.4  // Keep content in center 80%
  const ringWidth = Math.floor(size / 15)  // Bold ring
  const fontSize = Math.floor(size * 0.28)

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Gradient ring -->
        <linearGradient id="googleRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.electricCyan};stop-opacity:1" />
          <stop offset="33%" style="stop-color:${COLORS.hotMagenta};stop-opacity:1" />
          <stop offset="66%" style="stop-color:${COLORS.acidLime};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${COLORS.electricCyan};stop-opacity:1" />
        </linearGradient>
        <linearGradient id="textGradGoogle" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.electricCyan};stop-opacity:1" />
          <stop offset="50%" style="stop-color:${COLORS.hotMagenta};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${COLORS.acidLime};stop-opacity:1" />
        </linearGradient>
        <filter id="googleGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="${ringWidth * 0.6}" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <!-- Subtle corner glows -->
        <radialGradient id="glowTL" cx="20%" cy="20%" r="50%">
          <stop offset="0%" style="stop-color:${COLORS.electricCyan};stop-opacity:0.15" />
          <stop offset="100%" style="stop-color:${COLORS.electricCyan};stop-opacity:0" />
        </radialGradient>
        <radialGradient id="glowBR" cx="80%" cy="80%" r="50%">
          <stop offset="0%" style="stop-color:${COLORS.hotMagenta};stop-opacity:0.12" />
          <stop offset="100%" style="stop-color:${COLORS.hotMagenta};stop-opacity:0" />
        </radialGradient>
      </defs>

      <!-- Background -->
      <rect width="${size}" height="${size}" fill="${COLORS.voidBlack}"/>

      <!-- Corner glows -->
      <rect width="${size}" height="${size}" fill="url(#glowTL)"/>
      <rect width="${size}" height="${size}" fill="url(#glowBR)"/>

      <!-- Outer glow ring -->
      <circle cx="${size / 2}" cy="${size / 2}" r="${safeRadius}"
              fill="none" stroke="url(#googleRing)" stroke-width="${ringWidth}"
              filter="url(#googleGlow)"/>

      <!-- Inner dark circle -->
      <circle cx="${size / 2}" cy="${size / 2}" r="${safeRadius - ringWidth * 1.5}"
              fill="${COLORS.voidBlack}"/>

      <!-- L7 text - bold gradient -->
      <text x="${size / 2}" y="${size * 0.56}"
            font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
            font-size="${fontSize}" font-weight="800"
            fill="url(#textGradGoogle)" text-anchor="middle"
            filter="url(#googleGlow)">L7</text>
    </svg>
  `

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(OUTPUT_DIR, 'logo-google.png'))

  console.log(`✓ Generated logo-google.png (${size}x${size})`)
}

/**
 * Generate Google Wallet hero image (1032x336)
 * Full-width banner with SHIFTCARDS™ branding
 * Matches Apple strip design aesthetic
 */
async function generateGoogleHero() {
  const width = 1032
  const height = 336
  const borderWidth = Math.floor(width / 180)
  const cornerLength = Math.floor(width / 12)
  const mainFontSize = Math.floor(height * 0.28)
  const tmFontSize = Math.floor(mainFontSize * 0.35)

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Main gradient for text and border -->
        <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${COLORS.electricCyan};stop-opacity:1" />
          <stop offset="45%" style="stop-color:${COLORS.hotMagenta};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${COLORS.acidLime};stop-opacity:1" />
        </linearGradient>

        <!-- Border glow gradient -->
        <linearGradient id="heroBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.electricCyan};stop-opacity:1" />
          <stop offset="50%" style="stop-color:${COLORS.hotMagenta};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${COLORS.acidLime};stop-opacity:1" />
        </linearGradient>

        <!-- Glow filter -->
        <filter id="heroGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="${borderWidth * 1.5}" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <!-- Corner glows -->
        <radialGradient id="heroGlowTL" cx="0%" cy="0%" r="60%">
          <stop offset="0%" style="stop-color:${COLORS.electricCyan};stop-opacity:0.2" />
          <stop offset="100%" style="stop-color:${COLORS.electricCyan};stop-opacity:0" />
        </radialGradient>
        <radialGradient id="heroGlowBR" cx="100%" cy="100%" r="60%">
          <stop offset="0%" style="stop-color:${COLORS.hotMagenta};stop-opacity:0.15" />
          <stop offset="100%" style="stop-color:${COLORS.hotMagenta};stop-opacity:0" />
        </radialGradient>

        <!-- Subtle grid -->
        <pattern id="heroGrid" width="${Math.floor(width/25)}" height="${Math.floor(width/25)}" patternUnits="userSpaceOnUse">
          <path d="M ${Math.floor(width/25)} 0 L 0 0 0 ${Math.floor(width/25)}" fill="none" stroke="${COLORS.electricCyan}" stroke-width="0.5" stroke-opacity="0.06"/>
        </pattern>
      </defs>

      <!-- Base background -->
      <rect width="100%" height="100%" fill="${COLORS.voidBlack}"/>

      <!-- Corner glows -->
      <rect width="100%" height="100%" fill="url(#heroGlowTL)"/>
      <rect width="100%" height="100%" fill="url(#heroGlowBR)"/>

      <!-- Subtle grid overlay -->
      <rect width="100%" height="100%" fill="url(#heroGrid)"/>

      <!-- Border frame with glow -->
      <rect x="${borderWidth}" y="${borderWidth}"
            width="${width - borderWidth * 2}" height="${height - borderWidth * 2}"
            fill="none" stroke="url(#heroBorder)" stroke-width="${borderWidth * 1.5}"
            rx="${borderWidth * 2}" ry="${borderWidth * 2}"
            filter="url(#heroGlow)" opacity="0.8"/>

      <!-- Corner accents - top left (cyan) -->
      <path d="M ${cornerLength} ${borderWidth * 2} L ${borderWidth * 2} ${borderWidth * 2} L ${borderWidth * 2} ${cornerLength}"
            fill="none" stroke="${COLORS.electricCyan}" stroke-width="${borderWidth * 1.5}" stroke-linecap="square"/>

      <!-- Corner accents - top right (magenta) -->
      <path d="M ${width - cornerLength} ${borderWidth * 2} L ${width - borderWidth * 2} ${borderWidth * 2} L ${width - borderWidth * 2} ${cornerLength}"
            fill="none" stroke="${COLORS.hotMagenta}" stroke-width="${borderWidth * 1.5}" stroke-linecap="square"/>

      <!-- Corner accents - bottom left (lime) -->
      <path d="M ${borderWidth * 2} ${height - cornerLength} L ${borderWidth * 2} ${height - borderWidth * 2} L ${cornerLength} ${height - borderWidth * 2}"
            fill="none" stroke="${COLORS.acidLime}" stroke-width="${borderWidth * 1.5}" stroke-linecap="square"/>

      <!-- Corner accents - bottom right (cyan) -->
      <path d="M ${width - borderWidth * 2} ${height - cornerLength} L ${width - borderWidth * 2} ${height - borderWidth * 2} L ${width - cornerLength} ${height - borderWidth * 2}"
            fill="none" stroke="${COLORS.electricCyan}" stroke-width="${borderWidth * 1.5}" stroke-linecap="square"/>

      <!-- SHIFTCARDS™ text - centered, bold gradient -->
      <text x="${width / 2}" y="${height * 0.62}"
            font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
            font-size="${mainFontSize}" font-weight="800"
            fill="url(#heroGradient)" text-anchor="middle"
            filter="url(#heroGlow)"
            letter-spacing="2">SHIFTCARDS<tspan font-size="${tmFontSize}" baseline-shift="super" fill="${COLORS.white}">™</tspan></text>
    </svg>
  `

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(OUTPUT_DIR, 'hero.png'))

  console.log(`✓ Generated hero.png (${width}x${height})`)
}

async function main() {
  console.log('\n🎴 Generating Wallet assets for L7 Shift ShiftCards...\n')

  await ensureDir(OUTPUT_DIR)

  console.log('--- Apple Wallet ---')
  await generateIcons()
  await generateLogos()
  await generateStrips()
  await generateThumbnail()

  console.log('\n--- Google Wallet ---')
  await generateGoogleLogo()
  await generateGoogleHero()

  console.log('\n✅ All wallet assets generated!')
  console.log(`📁 Output directory: ${OUTPUT_DIR}\n`)
}

main().catch(console.error)
