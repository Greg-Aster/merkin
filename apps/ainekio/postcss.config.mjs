import postcssNesting from 'postcss-nesting'
import tailwindcss from 'tailwindcss'

export default {
  plugins: [postcssNesting(), tailwindcss()],
}
