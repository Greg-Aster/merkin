import { visit } from 'unist-util-visit'

// Content stays portable between the custom domain and a subdirectory preview.
// Only site-root paths change; anchors, external URLs and relative paths do not.
export function withBasePath(value, base = '/') {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//')
  ) {
    return value
  }

  const prefix = `/${base.split('/').filter(Boolean).join('/')}`
  if (
    prefix === '/' ||
    value === prefix ||
    value.startsWith(`${prefix}/`) ||
    value.startsWith(`${prefix}?`) ||
    value.startsWith(`${prefix}#`)
  ) {
    return value
  }
  return `${prefix}${value}`
}

export function rehypeBasePath({ base = '/' } = {}) {
  return tree => {
    visit(tree, node => {
      if (node.type === 'element') {
        for (const name of ['href', 'src', 'poster']) {
          if (node.properties?.[name]) {
            node.properties[name] = withBasePath(node.properties[name], base)
          }
        }
      }

      // Literal HTML attributes in MDX use MDX nodes rather than HAST elements.
      if (
        node.type === 'mdxJsxFlowElement' ||
        node.type === 'mdxJsxTextElement'
      ) {
        for (const attribute of node.attributes || []) {
          if (
            attribute.type === 'mdxJsxAttribute' &&
            ['href', 'src', 'poster'].includes(attribute.name)
          ) {
            attribute.value = withBasePath(attribute.value, base)
          }
        }
      }
    })
  }
}
