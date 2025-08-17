import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import prettierPlugin from 'eslint-plugin-prettier';


export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], 
  extends: ["js/recommended"], 
  languageOptions: { globals: globals.browser },
  plugins: {
      js,
      prettier: prettierPlugin, 
  },
  rules: {
      'prettier/prettier': ['error', {
        trailingComma: 'all',
        tabWidth: 2,
        semi: true,
        singleQuote: true,
      }],
    },
},
  tseslint.configs.recommended,
  { ignores: ["dist/**", "node_modules/**", "jest.config.*","eslint.config.mjs"] },
  
]);
