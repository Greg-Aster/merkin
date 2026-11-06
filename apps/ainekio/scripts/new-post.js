/* This is a script to create a new post markdown file with front-matter */

import fs from "node:fs"
import path from "node:path"

function getDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error(`Error: No filename argument provided
Usage: pnpm new-post <filename>`)
  process.exit(1)
}

let fileName = args[0]

const fileExtensionRegex = /\.(md|mdx)$/i
if (!fileExtensionRegex.test(fileName)) {
  fileName += ".mdx"
}

const targetDir = "./src/content/posts/"
const fullPath = path.join(targetDir, fileName)

if (fs.existsSync(fullPath)) {
  console.error(`Error: File ${fullPath} already exists`)
  process.exit(1)
}

const content = `---
title: "${args[0]}"
published: ${getDate()}
description: ""
image: ""
tags: []
category: "Build Journal"
draft: false
reading:
  topic: legs
  generation: v2
  kind: journal
---
`

fs.writeFileSync(fullPath, content)

console.log(`Post ${fullPath} created`)
