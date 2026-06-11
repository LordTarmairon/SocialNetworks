import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // El patrón idiomático "cargar al montar" (useEffect(() => { void load() }))
      // y los reseteos de estado al cambiar un input disparan esta regla nueva
      // y muy estricta. Son usos intencionados y correctos, así que la dejamos
      // como aviso en vez de error para no romper el lint.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
