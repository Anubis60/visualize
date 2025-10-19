const fs = require('fs')
const path = require('path')

const dashboardDir = path.join(__dirname, 'app', 'dashboard', '[companyId]')

// Get all subdirectories (chart pages)
const pages = fs.readdirSync(dashboardDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name)

console.log(`Found ${pages.length} chart pages to update`)

pages.forEach(pageName => {
  const pagePath = path.join(dashboardDir, pageName, 'page.tsx')

  if (!fs.existsSync(pagePath)) {
    console.log(`⊘ Skipping ${pageName} - no page.tsx found`)
    return
  }

  let content = fs.readFileSync(pagePath, 'utf8')

  // Replace /api/analytics with /api/analytics/cached
  const originalContent = content
  content = content.replace(
    /fetch\(`\/api\/analytics\?company_id=\$\{p\.companyId\}`\)/g,
    'fetch(`/api/analytics/cached?company_id=${p.companyId}`)'
  )

  if (content !== originalContent) {
    fs.writeFileSync(pagePath, content, 'utf8')
    console.log(`✓ Updated ${pageName}/page.tsx to use cached endpoint`)
  } else {
    console.log(`- ${pageName}/page.tsx - no changes needed`)
  }
})

console.log('\nAll chart pages updated to read from MongoDB cached endpoint')
