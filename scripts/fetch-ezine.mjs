#!/usr/bin/env node
/**
 * Ezine Fetcher & Converter
 *
 * Downloads ezines from autistici.org/ezine/, extracts them,
 * converts CP437 to UTF-8, and generates Nextra-compatible markdown.
 *
 * Usage: node scripts/fetch-ezine.mjs <ezine-name>
 * Example: node scripts/fetch-ezine.mjs noway
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const ARCHIVES_DIR = join(ROOT_DIR, 'archives')
const PAGES_DIR = join(ROOT_DIR, 'pages', 'ezines')

const BASE_URL = 'https://www.autistici.org/ezine'

// CP437 to Unicode mapping
const cp437ToUnicode = {
  0xC4: '─', 0xCD: '═', 0xB3: '│', 0xBA: '║',
  0xDA: '┌', 0xBF: '┐', 0xC0: '└', 0xD9: '┘',
  0xC2: '┬', 0xC1: '┴', 0xC3: '├', 0xB4: '┤', 0xC5: '┼',
  0xC9: '╔', 0xBB: '╗', 0xC8: '╚', 0xBC: '╝',
  0xCB: '╦', 0xCA: '╩', 0xCC: '╠', 0xB9: '╣', 0xCE: '╬',
  0xD5: '╒', 0xB8: '╕', 0xD4: '╘', 0xBE: '╛',
  0xD6: '╓', 0xB7: '╖', 0xD3: '╙', 0xBD: '╜',
  0xC6: '╞', 0xB5: '╡', 0xD1: '╤', 0xCF: '╧',
  0xC7: '╟', 0xB6: '╢', 0xD2: '╥', 0xD0: '╨',
  0xD8: '╪', 0xD7: '╫',
  0xDB: '█', 0xDC: '▄', 0xDD: '▌', 0xDE: '▐', 0xDF: '▀',
  0xB0: '░', 0xB1: '▒', 0xB2: '▓',
  0x01: '☺', 0x02: '☻', 0x03: '♥', 0x04: '♦', 0x05: '♣', 0x06: '♠',
  0x07: '•', 0x08: '◘', 0x09: '\t', 0x0A: '\n', 0x0B: '♂', 0x0C: '♀',
  0x0D: '\r', 0x0E: '♫', 0x0F: '☼',
  0x10: '►', 0x11: '◄', 0x12: '↕', 0x13: '‼', 0x14: '¶', 0x15: '§',
  0x16: '▬', 0x17: '↨', 0x18: '↑', 0x19: '↓', 0x1A: '→', 0x1B: '←',
  0x1C: '∟', 0x1D: '↔', 0x1E: '▲', 0x1F: '▼',
  0x80: 'Ç', 0x81: 'ü', 0x82: 'é', 0x83: 'â', 0x84: 'ä', 0x85: 'à',
  0x86: 'å', 0x87: 'ç', 0x88: 'ê', 0x89: 'ë', 0x8A: 'è', 0x8B: 'ï',
  0x8C: 'î', 0x8D: 'ì', 0x8E: 'Ä', 0x8F: 'Å',
  0x90: 'É', 0x91: 'æ', 0x92: 'Æ', 0x93: 'ô', 0x94: 'ö', 0x95: 'ò',
  0x96: 'û', 0x97: 'ù', 0x98: 'ÿ', 0x99: 'Ö', 0x9A: 'Ü', 0x9B: '¢',
  0x9C: '£', 0x9D: '¥', 0x9E: '₧', 0x9F: 'ƒ',
  0xA0: 'á', 0xA1: 'í', 0xA2: 'ó', 0xA3: 'ú', 0xA4: 'ñ', 0xA5: 'Ñ',
  0xA6: 'ª', 0xA7: 'º', 0xA8: '¿', 0xA9: '⌐', 0xAA: '¬', 0xAB: '½',
  0xAC: '¼', 0xAD: '¡', 0xAE: '«', 0xAF: '»',
  0xE0: 'α', 0xE1: 'ß', 0xE2: 'Γ', 0xE3: 'π', 0xE4: 'Σ', 0xE5: 'σ',
  0xE6: 'µ', 0xE7: 'τ', 0xE8: 'Φ', 0xE9: 'Θ', 0xEA: 'Ω', 0xEB: 'δ',
  0xEC: '∞', 0xED: 'φ', 0xEE: 'ε', 0xEF: '∩',
  0xF0: '≡', 0xF1: '±', 0xF2: '≥', 0xF3: '≤', 0xF4: '⌠', 0xF5: '⌡',
  0xF6: '÷', 0xF7: '≈', 0xF8: '°', 0xF9: '∙', 0xFA: '·', 0xFB: '√',
  0xFC: 'ⁿ', 0xFD: '²', 0xFE: '■', 0xFF: ' ',
}

function convertCP437ToUTF8(buffer) {
  let result = ''
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i]
    if (byte === 0x09 || byte === 0x0A || byte === 0x0D) {
      result += String.fromCharCode(byte)
    } else if (byte < 0x20) {
      result += cp437ToUnicode[byte] || ' '
    } else if (byte < 0x80) {
      result += String.fromCharCode(byte)
    } else {
      result += cp437ToUnicode[byte] || '?'
    }
  }
  return result
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Extract numeric parts for sorting: "40hex-1-002" -> [1, 2], "noway-3" -> [3]
function extractSortKey(slug) {
  const nums = slug.match(/\d+/g) || []
  return nums.map(n => parseInt(n, 10))
}

// Compare two slugs numerically
function compareSlugNumerically(a, b) {
  const keysA = extractSortKey(a)
  const keysB = extractSortKey(b)

  for (let i = 0; i < Math.max(keysA.length, keysB.length); i++) {
    const numA = keysA[i] ?? -1
    const numB = keysB[i] ?? -1
    if (numA !== numB) return numA - numB
  }
  return a.localeCompare(b)
}

// Create a clean display name from filename
function makeDisplayName(filename, slug, ezineName) {
  // Remove ezine name prefix from slug to get just the issue/part numbers
  const ezineSlug = slugify(ezineName)
  let numPart = slug.startsWith(ezineSlug) ? slug.slice(ezineSlug.length) : slug
  numPart = numPart.replace(/^-+/, '') // remove leading dashes

  // Extract numbers from the remaining part
  const nums = numPart.match(/\d+/g) || []

  if (nums.length >= 2) {
    // Has issue and part: "Issue 1, Part 2" or "1.002"
    return `#${nums[0]}.${nums.slice(1).join('.')}`
  } else if (nums.length === 1) {
    // Just issue number: "#1"
    return `#${nums[0]}`
  }

  // No numbers - clean up the filename
  const cleaned = filename
    .replace(/\.[^.]+$/, '') // remove extension
    .replace(/[-_]/g, ' ')   // dashes/underscores to spaces
    .replace(/\s+/g, ' ')    // collapse spaces
    .trim()

  return cleaned || slug
}

function extractIssueNumber(filename) {
  // Try various patterns: issue01, #1, -001, _1, etc.
  const patterns = [
    /[_-]?(\d{1,3})\.[^.]+$/i,
    /#(\d+)/,
    /issue[_-]?(\d+)/i,
    /vol[_-]?(\d+)/i,
    /n[oº]?[_-]?(\d+)/i,
  ]
  for (const pattern of patterns) {
    const match = filename.match(pattern)
    if (match) return parseInt(match[1], 10)
  }
  return null
}

async function fetchDirectoryListing(url) {
  console.log(`Fetching directory listing from ${url}`)
  try {
    const result = execSync(`curl -sL "${url}"`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
    // Parse href links from Apache directory listing
    const links = [...result.matchAll(/href="([^"]+)"/gi)]
      .map(m => m[1])
      .filter(l => !l.startsWith('?') && !l.startsWith('/') && l !== '../')
    return links
  } catch (err) {
    console.error(`Failed to fetch ${url}:`, err.message)
    return []
  }
}

async function downloadFile(url, destPath) {
  console.log(`  Downloading ${basename(url)}...`)
  try {
    execSync(`curl -sL "${url}" -o "${destPath}"`, { encoding: 'utf-8' })
    return true
  } catch (err) {
    console.error(`  Failed to download ${url}:`, err.message)
    return false
  }
}

function extractArchive(archivePath, destDir) {
  const ext = extname(archivePath).toLowerCase()
  try {
    mkdirSync(destDir, { recursive: true })
    if (ext === '.zip') {
      execSync(`unzip -o -q "${archivePath}" -d "${destDir}" 2>/dev/null || true`)
    } else if (ext === '.gz' || ext === '.tgz') {
      execSync(`tar -xzf "${archivePath}" -C "${destDir}" 2>/dev/null || true`)
    } else if (ext === '.tar') {
      execSync(`tar -xf "${archivePath}" -C "${destDir}" 2>/dev/null || true`)
    }
    return true
  } catch (err) {
    console.error(`  Failed to extract ${archivePath}:`, err.message)
    return false
  }
}

function findTextFiles(dir, files = []) {
  if (!existsSync(dir)) return files
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      findTextFiles(fullPath, files)
    } else {
      const ext = extname(entry).toLowerCase()
      const name = entry.toLowerCase()
      // Include .txt, .nfo, .diz, files without extension, numeric extensions, or files that look like text
      const isNumericExt = /^\.\d+$/.test(ext)
      if (['.txt', '.nfo', '.diz', '.asc', '.doc', '.1st', '.me', '.now', '.log'].includes(ext) ||
          name.startsWith('readme') || name.startsWith('read.me') ||
          isNumericExt ||
          (!ext && stat.size < 500000 && stat.size > 100)) {
        files.push(fullPath)
      }
    }
  }
  return files
}

function convertToMarkdown(content, filename, ezineName) {
  const issueNum = extractIssueNumber(filename) || filename
  const cleanName = basename(filename, extname(filename))

  // Clean up content
  let cleaned = content
    .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI escape codes
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  return `---
title: "${cleanName}"
ezine: "${ezineName}"
---

# ${cleanName}

**Ezine:** ${ezineName}

<div className="ascii-content">

\`\`\`
${cleaned}
\`\`\`

</div>
`
}

async function processEzine(ezineName) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Processing: ${ezineName}`)
  console.log('='.repeat(60))

  const ezineUrl = `${BASE_URL}/${ezineName}/`
  const ezineArchiveDir = join(ARCHIVES_DIR, ezineName)
  const ezinePagesDir = join(PAGES_DIR, ezineName)

  // Create directories
  mkdirSync(ezineArchiveDir, { recursive: true })
  mkdirSync(ezinePagesDir, { recursive: true })

  // Fetch directory listing
  const files = await fetchDirectoryListing(ezineUrl)
  console.log(`Found ${files.length} files/folders`)

  // Download archives
  const archives = files.filter(f =>
    f.endsWith('.zip') || f.endsWith('.gz') || f.endsWith('.tgz') || f.endsWith('.tar')
  )
  const textFiles = files.filter(f =>
    f.endsWith('.txt') || f.endsWith('.nfo') || f.endsWith('.TXT')
  )

  // Download and extract archives
  for (const archive of archives) {
    const archivePath = join(ezineArchiveDir, archive)
    if (!existsSync(archivePath)) {
      await downloadFile(`${ezineUrl}${archive}`, archivePath)
    }
    const extractDir = join(ezineArchiveDir, basename(archive, extname(archive)))
    extractArchive(archivePath, extractDir)
  }

  // Download standalone text files
  for (const txtFile of textFiles) {
    const txtPath = join(ezineArchiveDir, txtFile)
    if (!existsSync(txtPath)) {
      await downloadFile(`${ezineUrl}${txtFile}`, txtPath)
    }
  }

  // Find all text files, grouped by their source folder (archive)
  const allTextFiles = findTextFiles(ezineArchiveDir)
  console.log(`Found ${allTextFiles.length} text files to convert`)

  // Group files by their immediate parent folder (which corresponds to the zip)
  const filesByFolder = {}
  for (const txtFile of allTextFiles) {
    const relativePath = txtFile.replace(ezineArchiveDir + '/', '')
    const parts = relativePath.split('/')
    const folder = parts.length > 1 ? parts[0] : '_root'
    if (!filesByFolder[folder]) filesByFolder[folder] = []
    filesByFolder[folder].push(txtFile)
  }

  // Process each folder
  const issues = [] // { folderSlug, displayName, files: [...] }

  for (const [folder, files] of Object.entries(filesByFolder)) {
    const folderSlug = folder === '_root' ? null : slugify(folder)
    const issueDir = folderSlug ? join(ezinePagesDir, folderSlug) : ezinePagesDir

    if (folderSlug) {
      mkdirSync(issueDir, { recursive: true })
    }

    const converted = []

    for (const txtFile of files) {
      try {
        const buffer = readFileSync(txtFile)
        const utf8Content = convertCP437ToUTF8(buffer)

        // Skip tiny files or binary files that slipped through
        if (utf8Content.length < 100) continue
        if (utf8Content.includes('\x00')) continue

        const ext = extname(txtFile)
        const base = basename(txtFile, ext)
        // Preserve numeric extensions (like .2, .3, .001) in the slug
        const isNumericExt = /^\.\d+$/.test(ext)
        const slugBase = isNumericExt ? `${base}-${ext.slice(1)}` : base
        const slug = slugify(slugBase)
        const mdPath = join(issueDir, `${slug}.mdx`)

        const markdown = convertToMarkdown(utf8Content, txtFile, ezineName)
        writeFileSync(mdPath, markdown)

        const name = basename(txtFile)
        const displayName = makeDisplayName(name, slug, ezineName)
        converted.push({ slug, name, displayName })
        console.log(`  ✓ ${folder}/${name}`)
      } catch (err) {
        console.log(`  ✗ ${txtFile}: ${err.message}`)
      }
    }

    if (converted.length === 0) continue

    // Sort files in this folder
    converted.sort((a, b) => compareSlugNumerically(a.slug, b.slug))

    // Generate _meta.json for this folder
    if (folderSlug) {
      const folderMeta = {}
      converted.forEach(f => { folderMeta[f.slug] = f.displayName })
      writeFileSync(join(issueDir, '_meta.json'), JSON.stringify(folderMeta, null, 2))
    }

    // Create a nice display name for the folder/issue
    const folderDisplayName = folderSlug
      ? makeDisplayName(folder, folderSlug, ezineName)
      : ezineName

    issues.push({
      folderSlug,
      displayName: folderDisplayName,
      files: converted
    })
  }

  // Sort issues numerically
  issues.sort((a, b) => {
    if (!a.folderSlug) return -1
    if (!b.folderSlug) return 1
    return compareSlugNumerically(a.folderSlug, b.folderSlug)
  })

  // Generate main index page
  const totalFiles = issues.reduce((sum, i) => sum + i.files.length, 0)
  const indexContent = `# ${ezineName}

Browse all files from the **${ezineName}** ezine archive.

**Source:** [autistici.org/ezine/${ezineName}](${ezineUrl})

**Total files:** ${totalFiles}

## Issues

${issues.map(issue => {
    if (issue.folderSlug) {
      return `- [${issue.displayName}](/ezines/${ezineName}/${issue.folderSlug}) (${issue.files.length} files)`
    } else {
      return issue.files.map(f => `- [${f.displayName}](/ezines/${ezineName}/${f.slug})`).join('\n')
    }
  }).join('\n')}
`
  writeFileSync(join(ezinePagesDir, 'index.mdx'), indexContent)

  // Generate main _meta.json
  const meta = { index: ezineName }
  for (const issue of issues) {
    if (issue.folderSlug) {
      meta[issue.folderSlug] = issue.displayName
    } else {
      // Root-level files
      issue.files.forEach(f => { meta[f.slug] = f.displayName })
    }
  }
  writeFileSync(join(ezinePagesDir, '_meta.json'), JSON.stringify(meta, null, 2))

  const totalConverted = issues.reduce((sum, i) => sum + i.files.length, 0)
  console.log(`\n✓ Converted ${totalConverted} files for ${ezineName}`)
  return totalConverted
}

// Main
const ezineName = process.argv[2]
if (!ezineName) {
  console.log('Usage: node scripts/fetch-ezine.mjs <ezine-name>')
  console.log('Example: node scripts/fetch-ezine.mjs noway')
  console.log('\nAvailable ezines: https://www.autistici.org/ezine/')
  process.exit(1)
}

processEzine(ezineName).then(count => {
  console.log(`\nDone! Run 'npm run dev' to preview.`)
}).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
