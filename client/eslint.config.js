import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Deliberately advisory, not blocking. Both fire on patterns that are
      // correct here, and demoting them is what lets everything else — unused
      // code, components created during render, genuine mistakes — fail the
      // build instead of scrolling past in a job that always says "success".
      //
      // set-state-in-effect: ~31 hits, nearly all the ordinary "fetch on mount,
      // then setState" flow. Rewriting them all carries far more regression
      // risk than the extra mount-time render costs.
      'react-hooks/set-state-in-effect': 'warn',
      // only-export-components: the context files export a provider and its
      // hook together, which is the standard React pattern. It affects hot
      // reload only and has no bearing on the production bundle.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
