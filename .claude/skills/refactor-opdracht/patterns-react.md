# React refactor-patronen

## Patroon 1: Hook extractie

### Wanneer
- 5+ `useState` in een component
- Logica die herbruikbaar is over meerdere components
- Component mixt data-fetching, state en UI

### Aanpak
Verplaats gerelateerde state + handlers naar een custom hook. De hook levert data en callbacks; het component rendert.

```jsx
// VOOR: logica en UI gemixed
function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => { /* fetch users */ }, []);

  const filtered = users
    .filter(u => u.name.includes(filter))
    .sort((a, b) => a[sortBy].localeCompare(b[sortBy]));

  return (/* JSX met filtered, loading, error, filter, sortBy */);
}

// NA: hook levert alles, component is thin view
function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => { /* fetch users */ }, []);

  const filtered = useMemo(
    () => users
      .filter(u => u.name.includes(filter))
      .sort((a, b) => a[sortBy].localeCompare(b[sortBy])),
    [users, filter, sortBy]
  );

  // useState setters (setFilter, setSortBy) zijn al stabiele referenties —
  // extra useCallback wrapper is hier niet nodig.

  return { users: filtered, loading, error, filter, setFilter, sortBy, setSortBy };
}

function UserList() {
  const { users, loading, error, filter, setFilter, sortBy, setSortBy } = useUsers();
  return (/* alleen JSX */);
}
```

### Checklist na extractie
- [ ] Geen JSX in de hook
- [ ] Eigen handlers gestabiliseerd met useCallback (useState setters hoeven niet gewrapt)
- [ ] Afgeleide data met useMemo
- [ ] JSDoc met doel, input en output
- [ ] eslint rules-of-hooks geen meldingen

---

## Patroon 2: Component splitting

### Wanneer
- Component > 250 regels
- Render bevat 3+ visuele secties
- 4+ niveaus JSX nesting

### Aanpak
Identificeer logische secties in de JSX. Elk wordt een apart component met eigen props.

```jsx
// VOOR: monoliet met secties
function Dashboard({ apps, users, activity }) {
  return (
    <div>
      <header>{/* 30 regels header JSX */}</header>
      <section>{/* 50 regels apps grid */}</section>
      <section>{/* 40 regels users table */}</section>
      <section>{/* 30 regels activity feed */}</section>
    </div>
  );
}

// NA: elk blok is een component
function Dashboard({ apps, users, activity }) {
  return (
    <div>
      <DashboardHeader />
      <AppsGrid apps={apps} />
      <UsersTable users={users} />
      <ActivityFeed activity={activity} />
    </div>
  );
}
```

### Vuistregels
- Splits op visuele grenzen, niet op willekeurige regelaantallen
- Elk subcomponent krijgt alleen de props die het nodig heeft
- Gedeelde state blijft in de parent of een hook
- Vermijd meer dan 10 props per subcomponent

---

## Patroon 3: Memoization

### Wanneer
- Dure berekeningen in de render-fase
- Event handlers die onnodige re-renders veroorzaken in children
- Lijst-items die bij elke parent-render opnieuw renderen

### useMemo — afgeleide data

```jsx
// VOOR: herberekening bij elke render
const sorted = items.sort((a, b) => a.name.localeCompare(b.name));

// NA: alleen herberekenen als items wijzigt
const sorted = useMemo(
  () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);
```

### useCallback — event handlers

```jsx
// VOOR: nieuwe functie-referentie bij elke render
<Button onClick={() => handleDelete(id)} />

// NA: stabiele referentie
const onDelete = useCallback(() => handleDelete(id), [id]);
<Button onClick={onDelete} />
```

### React.memo — child components

```jsx
// VOOR: AppTile rendert bij elke parent-render
function AppTile({ app, onEdit }) {
  return (/* JSX */);
}

// NA: rendert alleen als app of onEdit wijzigt
const AppTile = React.memo(function AppTile({ app, onEdit }) {
  return (/* JSX */);
});
```

### Wanneer NIET memoizen
- Simpele berekeningen (string concatenatie, boolean checks)
- Components die sowieso altijd re-renderen (root-level)
- Wanneer de memo-overhead groter is dan de besparing

---

## Patroon 4: State colocation

### Wanneer
- State wordt ver omhoog gelift maar slechts door 1-2 children gebruikt
- Parent rendert onnodig door state die alleen een child raakt

### Aanpak
Verplaats state naar het laagste component dat het nodig heeft.

```jsx
// VOOR: search state onnodig in parent
function Page() {
  const [search, setSearch] = useState('');
  return (
    <Header />
    <SearchBar search={search} onSearch={setSearch} />
    <Content />
  );
}

// NA: search state in SearchBar zelf
function Page() {
  return (
    <Header />
    <SearchBar />
    <Content />
  );
}

function SearchBar() {
  const [search, setSearch] = useState('');
  return (/* gebruikt search intern */);
}
```

---

## Patroon 5: Effect cleanup

### Wanneer
- useEffect zonder cleanup (memory leaks, stale subscriptions)
- Meerdere effects die beter gesplitst kunnen worden
- Missing of overbodige dependencies

### Aanpak

```jsx
// VOOR: een groot effect met meerdere concerns
useEffect(() => {
  fetchData();
  const interval = setInterval(pollStatus, 5000);
  window.addEventListener('resize', handleResize);
}, []);

// NA: gescheiden effects met cleanup
// ⚠️ Zorg dat functies in dependencies stabiel zijn (useCallback) om infinite loops te voorkomen
useEffect(() => {
  fetchData();
}, [fetchData]); // fetchData moet in useCallback zitten

useEffect(() => {
  const interval = setInterval(pollStatus, 5000);
  return () => clearInterval(interval);
}, [pollStatus]); // pollStatus moet in useCallback zitten

useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [handleResize]); // handleResize moet in useCallback zitten
```

### Vuistregels
- Een effect per concern
- Altijd cleanup retourneren voor subscriptions, intervals, listeners
- Dependencies expliciet en compleet (geen eslint-disable)
- Gebruik AbortController voor fetch-cleanup

---

## Patroon 6: Context splitting

### Wanneer
- Een Context bevat state voor meerdere onafhankelijke features
- Consumers re-renderen door state-wijzigingen die ze niet gebruiken
- Context-bestand groeit boven 200 regels

### Aanpak
Splits een grote Context in meerdere kleinere, domein-specifieke Contexts.

```jsx
// VOOR: alles in één context
const AppContext = createContext();

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // ... nog meer state

  return (
    <AppContext.Provider value={{ user, theme, notifications, sidebarOpen, /* ... */ }}>
      {children}
    </AppContext.Provider>
  );
}

// NA: gesplitst per domein
const AuthContext = createContext();
const UIContext = createContext();
const NotificationContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

function UIProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <UIContext.Provider value={{ theme, setTheme, sidebarOpen, setSidebarOpen }}>
      {children}
    </UIContext.Provider>
  );
}

// Compose providers in App
function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <NotificationProvider>
          {/* app content */}
        </NotificationProvider>
      </UIProvider>
    </AuthProvider>
  );
}
```

### Vuistregels
- Splits op domein, niet op willekeurige groepering
- Elke context heeft een bijbehorende custom hook: `useAuth()`, `useUI()`
- Contexts die vaak samen veranderen, mogen samen blijven
- Voorkom te veel nesting van Providers (max 4-5 niveaus)

---

## Patroon 7: Lazy loading / code splitting

### Wanneer
- App heeft veel routes met zware componenten
- Initial load tijd is te hoog
- Componenten die niet direct zichtbaar zijn (modals, tabs, settings)

### Aanpak
Gebruik `React.lazy` + `Suspense` om componenten pas te laden wanneer nodig.

```jsx
// VOOR: alles wordt direct geladen
import TableView from './components/table/TableView';
import SettingsView from './components/settings/SettingsView';
import AdminLayout from './components/admin/AdminLayout';
import BulkUploadPage from './components/uploads/BulkUploadPage';

// NA: lazy loading per route
const TableView = React.lazy(() => import('./components/table/TableView'));
const SettingsView = React.lazy(() => import('./components/settings/SettingsView'));
const AdminLayout = React.lazy(() => import('./components/admin/AdminLayout'));
const BulkUploadPage = React.lazy(() => import('./components/uploads/BulkUploadPage'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/table" element={<TableView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/admin/*" element={<AdminLayout />} />
        <Route path="/upload" element={<BulkUploadPage />} />
      </Routes>
    </Suspense>
  );
}
```

### Vuistregels
- Lazy load op route-niveau als eerste stap (grootste winst)
- Lazy load zware modals en dialogs die niet altijd zichtbaar zijn
- Gebruik een zinvolle fallback (skeleton, spinner) — geen lege pagina
- Combineer met `React.memo` op child-componenten voor maximaal effect
- Test dat de lazy-loaded chunks niet te klein worden (overhead van extra netwerk-requests)
