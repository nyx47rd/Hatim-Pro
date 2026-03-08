# AGENTS.md

## Must-follow constraints
- **Styling**: Use Tailwind CSS utility classes only. Do not add custom CSS files.
- **Animations**: Use `motion` (from `motion/react`) for all UI transitions.
- **Icons**: Use `lucide-react`.
- **Environment Variables**: Use `import.meta.env.VITE_` prefix for client-side variables.
- **Error Handling**: Do not remove or disable the chunk error recovery scripts in `index.html` and `main.tsx`.

## Validation before finishing
- Run `npm run lint` (`tsc --noEmit`) to catch type errors.
- Run `npm run build` to ensure the app compiles successfully.

## Repo-specific conventions
- **App Structure**: `App.tsx` is the central hub for routing and state. It is intentionally large; use `grep` to locate specific views or handlers.
- **Data Persistence**: Hatim data is managed via a central `data` state in `App.tsx` and synced with Firebase/localStorage.
- **Class Components**: `ErrorBoundary` in `App.tsx` is a class component; ensure `props.children` is used correctly.

## Important locations
- `src/App.tsx`: Main application logic, routing, and state management.
- `src/components/`: Reusable UI components (StatsPage, ProfilePage, etc.).
- `src/contexts/AuthContext.tsx`: Firebase authentication logic.

## Known gotchas
- **Chunk Errors**: The environment frequently triggers chunk loading errors. The recovery script in `index.html` and `main.tsx` is critical for app stability.
- **Theme**: `next-themes` is configured with `forcedTheme="dark"`. Do not attempt to implement a light mode unless explicitly requested.
- **Sound**: `use-sound` is used for interaction feedback; ensure `playClick` is called on primary actions.
- **Storage Keys**: Hatim data uses `hatim_data_v1` and Zikir tasks use `local_zikir_tasks` in `localStorage`.
