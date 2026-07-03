import { copyFileSync, mkdirSync } from 'node:fs'

mkdirSync('dist', { recursive: true })
copyFileSync('appsscript.json', 'dist/appsscript.json')
copyFileSync('src/UiSidebar.html', 'dist/UiSidebar.html')
copyFileSync('src/Triggers.gs', 'dist/Triggers.gs')
