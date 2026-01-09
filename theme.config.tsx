import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 800 }}>NPC - Northern Phun Co.</span>,
  project: {
    link: 'https://github.com/mistercrunch/npc',
  },
  docsRepositoryBase: 'https://github.com/mistercrunch/npc',
  footer: {
    text: 'NPC Tribute - Preserving Quebec\'s 418 underground e-zine history (1992-1994)',
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="NPC - Northern Phun Co. Tribute" />
      <meta property="og:description" content="A tribute to Quebec's underground e-zine from the 418 area code (1992-1994)" />
    </>
  ),
  useNextSeoProps() {
    return {
      titleTemplate: '%s – NPC Tribute'
    }
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: {
    float: true,
  },
  primaryHue: 150,
}

export default config
