import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 800, fontFamily: 'monospace' }}>PhileZ</span>,
  project: {
    link: 'https://github.com/mistercrunch/philez',
  },
  docsRepositoryBase: 'https://github.com/mistercrunch/philez',
  footer: {
    text: 'PhileZ — the BBS-era underground ezine archive',
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="PhileZ — the BBS-era underground ezine archive" />
      <meta property="og:description" content="Hacking, phreaking, virii, anarchy, and cracking textfiles from the BBS underground, preserved for the modern web." />
      {/* Google Analytics */}
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-LBHR3Z3M1C" />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-LBHR3Z3M1C');
          `,
        }}
      />
    </>
  ),
  useNextSeoProps() {
    return {
      titleTemplate: '%s – PhileZ'
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
