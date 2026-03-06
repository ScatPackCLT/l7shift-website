// Single source of truth for all client portal configuration.
// ALL client-specific content lives here — never inline in page components.

export interface AssetRequest {
  icon: string
  title: string
  description: string
  priority: boolean
  category: string // maps to upload category slug
}

export interface ClientPortalConfig {
  name: string
  primaryColor: string
  accentColor: string
  assetRequests: AssetRequest[]
}

const CONFIGS: Record<string, ClientPortalConfig> = {
  'stitchwichs': {
    name: 'Stitchwichs',
    primaryColor: '#8B5CF6',
    accentColor: '#F59E0B',
    assetRequests: [
      { icon: 'palette', title: 'Logo & Brand Files', description: 'Your current logo, any design files, fonts you use.', priority: true, category: 'logos' },
      { icon: 'camera', title: 'Product Photos', description: 'Photos of finished garments, mockups, or design references.', priority: true, category: 'photos' },
      { icon: 'image', title: 'Design References', description: 'Inspiration images, color palettes, mood boards.', priority: false, category: 'content' },
      { icon: 'file', title: 'Product Catalog', description: 'Product list, pricing sheet, or inventory if available.', priority: false, category: 'documents' },
    ],
  },
  'shariels-lashes': {
    name: "Shariel\u2019s Lashes",
    primaryColor: '#C6993A',
    accentColor: '#F8C8D4',
    assetRequests: [
      { icon: 'camera', title: 'Product Photos', description: 'Each lash style on white background + being worn. Close-up detail shots.', priority: true, category: 'photos' },
      { icon: 'palette', title: 'Logo & Brand Files', description: 'Your current logo, any design files, fonts you use.', priority: true, category: 'logos' },
      { icon: 'file', title: 'Inventory List', description: 'Every lash style name, quantity in stock, cost per unit, selling price.', priority: true, category: 'documents' },
      { icon: 'box', title: 'Packaging Photos', description: 'Photos of your current packaging \u2014 boxes, trays, bags, aftercare cards.', priority: false, category: 'packaging' },
      { icon: 'image', title: 'Inspiration & Mood Board', description: 'Screenshots of brands/packaging/websites you love.', priority: false, category: 'general' },
      { icon: 'pen', title: 'Your Story', description: 'A few sentences about why you started this, what makes your brand different.', priority: false, category: 'documents' },
    ],
  },
  'scat-pack-clt': {
    name: 'Scat Pack CLT',
    primaryColor: '#00F0FF',
    accentColor: '#BFFF00',
    assetRequests: [
      { icon: 'palette', title: 'Logo & Brand Files', description: 'Your current logo, any design files, fonts you use.', priority: true, category: 'logos' },
      { icon: 'camera', title: 'Service Photos', description: 'Photos of your team, trucks, or before/after yard shots.', priority: false, category: 'photos' },
      { icon: 'file', title: 'Service Area Map', description: 'ZIP codes or neighborhoods you currently serve.', priority: true, category: 'documents' },
    ],
  },
  'prettypaidcloset': {
    name: 'Pretty Paid Closet',
    primaryColor: '#B76E79',
    accentColor: '#FF69B4',
    assetRequests: [
      { icon: 'palette', title: 'Logo & Brand Files', description: 'Your current logo, any design files, fonts you use.', priority: true, category: 'logos' },
      { icon: 'camera', title: 'Product Photos', description: 'Photos of inventory, closet setups, or styled looks.', priority: true, category: 'photos' },
    ],
  },
}

const DEFAULT_CONFIG: ClientPortalConfig = {
  name: 'Client Portal',
  primaryColor: '#00F0FF',
  accentColor: '#BFFF00',
  assetRequests: [
    { icon: 'palette', title: 'Logo & Brand Files', description: 'Your current logo, any design files, fonts you use.', priority: true, category: 'logos' },
    { icon: 'camera', title: 'Product or Service Photos', description: 'Any relevant photos for your project.', priority: true, category: 'photos' },
    { icon: 'file', title: 'Documents', description: 'Business documents, specs, or notes.', priority: false, category: 'documents' },
  ],
}

export function getClientConfig(slug: string): ClientPortalConfig {
  return CONFIGS[slug] || DEFAULT_CONFIG
}
