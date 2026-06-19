# Step 8 Unused Package Audit

## Summary

This audit reviewed the current dependency surface without removing packages. The project is now clean enough that package cleanup can be done in a controlled follow-up step.

No packages were removed in this step.

## Current Package Count

- `dependencies`: 67
- `devDependencies`: 17
- Total direct packages: 84

## Commands Run

- `npm ls --depth=0`
- `npx depcheck --json`
- Direct source/config searches with `rg`

`npm ls --depth=0` passed. `depcheck` returned findings, but it also reported legacy Base44 function imports and build/config packages that need human interpretation.

## CONFIRMED_UNUSED_SAFE_TO_REMOVE

These packages had no source/config imports after excluding `package.json`, `package-lock.json`, `node_modules`, and temporary audit files:

- `@hello-pangea/dnd`
- `@hookform/resolvers`
- `@radix-ui/react-toast`
- `@stripe/react-stripe-js`
- `@stripe/stripe-js`
- `canvas-confetti`
- `framer-motion`
- `jszip`
- `lodash`
- `moment`
- `react-hot-toast`
- `react-leaflet`
- `react-markdown`
- `react-quill`
- `three`
- `zod`
- `baseline-browser-mapping`
- `eslint-plugin-react-refresh`

Notes:

- `react-hot-toast` appears only in a comment in `src/components/ui/use-toast.jsx`; the active toast surfaces use local code and `sonner`.
- `@radix-ui/react-toast` is not imported by `src/components/ui/toast.jsx`; that component is implemented with React/CVA classes rather than the Radix toast primitive.
- `baseline-browser-mapping` and `eslint-plugin-react-refresh` are direct dev dependencies but are not referenced by the current config.

## POSSIBLY_UNUSED_NEEDS_MANUAL_REVIEW

None recommended for manual-only review at this point. The packages above are safe candidates for Step 9 because they have no current imports or config references.

## USED_BY_ACTIVE_DEMO

Representative active demo dependencies:

- React app/runtime: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`
- Supabase client: `@supabase/supabase-js`
- UI primitives and shadcn-style wrappers: most `@radix-ui/react-*` packages, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, `lucide-react`
- Forms/UI helpers: `react-hook-form`, `cmdk`, `input-otp`, `react-day-picker`, `embla-carousel-react`, `react-resizable-panels`, `vaul`, `next-themes`
- Reports/exports: `jspdf`, `html2canvas`, `xlsx`, `recharts`, `date-fns`
- Notifications: `sonner`

## USED_BY_LEGACY_CODE

- `@base44/sdk` is still imported by `src/api/base44Client.js` and legacy redirected pages still reference Base44-compatible paths. Do not remove it until legacy Base44 code is quarantined or replaced.
- `xlsx` is used by active reports and legacy Base44 backup functions, so it is not a removal candidate.

## USED_BY_BUILD_OR_TESTS

- Build: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/node`
- Tailwind/PostCSS: `tailwindcss`, `postcss`, `autoprefixer`, `tailwindcss-animate`
- ESLint: `eslint`, `@eslint/js`, `globals`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-unused-imports`
- React type support: `@types/react`, `@types/react-dom`

## DO_NOT_REMOVE

- `@base44/sdk`: retained legacy compatibility surface.
- `@supabase/supabase-js`: active demo data layer.
- `react`, `react-dom`, `react-router-dom`: app runtime.
- `@tanstack/react-query`: active data fetching.
- `vite`, `@vitejs/plugin-react`, `typescript`: build/typecheck path.
- `tailwindcss`, `postcss`, `autoprefixer`: CSS pipeline.
- `jspdf`, `html2canvas`, `xlsx`: active report/export workflows.
- `date-fns`, `lucide-react`, `recharts`, `sonner`: active UI/reporting workflows.
- Radix packages with matching `src/components/ui/*` imports.

## Risks

- The repo intentionally retains legacy Base44 code. A dependency can appear unused by active routes but still support retained legacy files.
- Some shadcn UI components may not be mounted by active routes but remain in the component inventory. Their Radix dependencies should not be removed unless the component file is also removed or quarantined in a separate step.
- No package should be removed from production/staging assumptions without running the full verification suite.

## Recommended Removal Plan

Step 9 should remove only the `CONFIRMED_UNUSED_SAFE_TO_REMOVE` list using `npm uninstall`, then run:

```powershell
npm install
npm run build
npm run lint
npm run typecheck
npm run test:phase4
npm run test:phase5
npm run test:phase6
npm run test:phase7
npm run test:phase8
npm run test:phase9
npm run test:phase10
npm run test:phase11
npm run test:phase12
```

If any import appears after uninstall, restore the package and move it to manual review.

