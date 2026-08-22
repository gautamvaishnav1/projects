import type { IslandSector, RepoDataset } from '../types/codecity';

// ─── Island Sector Definitions ─────────────────────────────────────────────────
export const ISLAND_SECTORS: Record<string, IslandSector> = {
  frontend: {
    id: 'frontend', title: 'FRONTEND DISTRICT', subtitle: 'User & Admin Interfaces',
    themeColor: 'cyan', accentBright: '#06b6d4', accentMedium: '#0891b2', accentDark: '#155e75',
    glowClass: 'glow-cyan', badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    badgeBorder: 'border-cyan-500/40', gridOrigin: { x: 480, y: 160 },
    size: { width: 340, height: 220 }, iconName: 'Layout',
  },
  backend: {
    id: 'backend', title: 'BACKEND DISTRICT', subtitle: 'Server Logic & Business Rules',
    themeColor: 'purple', accentBright: '#c084fc', accentMedium: '#9333ea', accentDark: '#581c87',
    glowClass: 'glow-purple', badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    badgeBorder: 'border-purple-500/40', gridOrigin: { x: 180, y: 380 },
    size: { width: 320, height: 260 }, iconName: 'Server',
  },
  database: {
    id: 'database', title: 'DATABASE CITADEL', subtitle: 'Data Storage & Management',
    themeColor: 'emerald', accentBright: '#34d399', accentMedium: '#059669', accentDark: '#064e3b',
    glowClass: 'glow-emerald', badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    badgeBorder: 'border-emerald-500/40', gridOrigin: { x: 780, y: 380 },
    size: { width: 330, height: 260 }, iconName: 'Database',
  },
  auth: {
    id: 'auth', title: 'AUTHENTICATION FORT', subtitle: 'Security & Access Control',
    themeColor: 'amber', accentBright: '#fbbf24', accentMedium: '#d97706', accentDark: '#78350f',
    glowClass: 'glow-amber', badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    badgeBorder: 'border-amber-500/40', gridOrigin: { x: 780, y: 160 },
    size: { width: 310, height: 220 }, iconName: 'ShieldCheck',
  },
  infra: {
    id: 'infra', title: 'INFRASTRUCTURE CORE', subtitle: 'DevOps & Platform Services',
    themeColor: 'blue', accentBright: '#60a5fa', accentMedium: '#2563eb', accentDark: '#1e3a8a',
    glowClass: 'glow-cyan', badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    badgeBorder: 'border-blue-500/40', gridOrigin: { x: 480, y: 600 },
    size: { width: 340, height: 230 }, iconName: 'Cpu',
  },
  service: {
    id: 'service', title: 'MONITORING CENTER', subtitle: 'Observability & Analytics',
    themeColor: 'cyan', accentBright: '#06b6d4', accentMedium: '#0891b2', accentDark: '#155e75',
    glowClass: 'glow-cyan', badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    badgeBorder: 'border-cyan-500/40', gridOrigin: { x: 180, y: 600 },
    size: { width: 280, height: 210 }, iconName: 'Activity',
  },
  external: {
    id: 'external', title: 'EXTERNAL SERVICES', subtitle: 'Third Party APIs & Integrations',
    themeColor: 'rose', accentBright: '#fb7185', accentMedium: '#e11d48', accentDark: '#881337',
    glowClass: 'glow-rose', badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    badgeBorder: 'border-rose-500/40', gridOrigin: { x: 180, y: 160 },
    size: { width: 280, height: 210 }, iconName: 'Globe',
  },
  depot: {
    id: 'depot', title: 'FILE SYSTEM DEPOT', subtitle: 'Storage & Asset Management',
    themeColor: 'amber', accentBright: '#fef08a', accentMedium: '#eab308', accentDark: '#854d0e',
    glowClass: 'glow-amber', badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    badgeBorder: 'border-amber-500/40', gridOrigin: { x: 780, y: 600 },
    size: { width: 310, height: 220 }, iconName: 'Archive',
  },
};

// ─── PRIMARY MOCK DATASET ─────────────────────────────────────────────────────
export const PRIMARY_MOCK_DATASET: RepoDataset = {
  id: 'codecity-enterprise-world',
  name: 'codecity-world',
  owner: 'codecity-ai',
  url: 'https://github.com/codecity-ai/codecity-world',
  description: 'Full Multi-District Isometric Enterprise World',
  stars: 9840,
  nodes: [
    // ── FRONTEND DISTRICT ─────────────────────────────────────────────────────
    {
      id: 'f1', name: 'App.tsx', path: 'src/App.tsx', type: 'frontend', island: 'frontend',
      lines: 120, complexity: 'Low', security: 'Clean',
      imports: ['react', 'react-router-dom'],
      codeSnippet: `import React from 'react';\nexport const App = () => <Dashboard />;`,
      aiExplanation: '1. Component structure is clean.\n2. Ready for production scale.',
      gridPos: { x: 480, y: 190 }, width: 44, depth: 44,
      author: 'alex.dev', language: 'TypeScript',
      floors: [
        {
          id: 'f1_fl1', label: 'App()', type: 'component', floorIndex: 0,
          functions: [{
            id: 'f1_fl1_fn1', name: 'App', signature: 'function App(): JSX.Element',
            lineStart: 4, lineEnd: 18, calledBy: ['main.tsx'], calls: ['Router', 'Provider'],
            riskLevel: 'low', description: 'Root application component',
            code: `export function App() {\n  return (\n    <Provider store={store}>\n      <Router>\n        <Routes>\n          <Route path="/" element={<Dashboard />} />\n          <Route path="/world" element={<WorldPage />} />\n        </Routes>\n      </Router>\n    </Provider>\n  );\n}`,
          }],
        },
        {
          id: 'f1_fl2', label: 'ErrorBoundary', type: 'component', floorIndex: 1,
          functions: [{
            id: 'f1_fl2_fn1', name: 'ErrorBoundary', signature: 'class ErrorBoundary extends React.Component',
            lineStart: 20, lineEnd: 55, calledBy: ['App'], calls: ['logger.error'],
            riskLevel: 'low', description: 'Catches and logs React render errors',
            code: `class ErrorBoundary extends React.Component {\n  state = { hasError: false };\n\n  static getDerivedStateFromError() {\n    return { hasError: true };\n  }\n\n  componentDidCatch(error: Error) {\n    logger.error('UI crash', error);\n  }\n\n  render() {\n    if (this.state.hasError) return <ErrorFallback />;\n    return this.props.children;\n  }\n}`,
          }],
        },
      ],
    },
    {
      id: 'f2', name: 'Hooks.ts', path: 'src/hooks/useAuth.ts', type: 'frontend', island: 'frontend',
      lines: 185, complexity: 'Low', security: 'Clean',
      imports: ['react', 'redux'],
      codeSnippet: `export const useAuth = () => useSelector(selectAuth);`,
      aiExplanation: '1. Optimized memoized hook selector.',
      gridPos: { x: 410, y: 190 }, width: 38, depth: 38,
      author: 'sarah.ui', language: 'TypeScript',
      floors: [
        {
          id: 'f2_fl1', label: 'useAuth()', type: 'function', floorIndex: 0,
          functions: [{
            id: 'f2_fl1_fn1', name: 'useAuth', signature: 'function useAuth(): AuthState',
            lineStart: 1, lineEnd: 12, calledBy: ['Header', 'ProtectedRoute', 'ProfilePage'],
            calls: ['useAppSelector'], riskLevel: 'low',
            description: 'Typed selector hook for auth state slice',
            code: `export function useAuth(): AuthState {\n  return useAppSelector(state => state.auth);\n}`,
          }],
        },
        {
          id: 'f2_fl2', label: 'useCity()', type: 'function', floorIndex: 1,
          functions: [{
            id: 'f2_fl2_fn1', name: 'useCity', signature: 'function useCity(): CityState',
            lineStart: 14, lineEnd: 26, calledBy: ['WorldPage', 'Sidebar'], calls: ['useAppSelector'],
            riskLevel: 'low', description: 'Typed selector hook for city map state',
            code: `export function useCity(): CityState {\n  return useAppSelector(state => state.city);\n}`,
          }],
        },
        {
          id: 'f2_fl3', label: 'useDebounce()', type: 'function', floorIndex: 2,
          functions: [{
            id: 'f2_fl3_fn1', name: 'useDebounce', signature: 'function useDebounce<T>(value: T, delay: number): T',
            lineStart: 28, lineEnd: 42, calledBy: ['SearchBar', 'FilterBar'], calls: ['useEffect', 'useState'],
            riskLevel: 'low', description: 'Debounces a rapidly changing value',
            code: `export function useDebounce<T>(value: T, delay: number): T {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const t = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(t);\n  }, [value, delay]);\n  return debounced;\n}`,
          }],
        },
      ],
    },
    {
      id: 'f3', name: 'Components.tsx', path: 'src/components/Card.tsx', type: 'frontend', island: 'frontend',
      lines: 240, complexity: 'Medium', security: 'Clean',
      imports: ['framer-motion'],
      codeSnippet: `export const Card = () => <motion.div whileHover={{ scale: 1.05 }} />;`,
      aiExplanation: '1. High FPS smooth animation layout.',
      gridPos: { x: 540, y: 190 }, width: 42, depth: 42,
      author: 'sarah.ui', language: 'TypeScript',
      floors: [
        {
          id: 'f3_fl1', label: 'TelemetryCard()', type: 'component', floorIndex: 0,
          functions: [{
            id: 'f3_fl1_fn1', name: 'TelemetryCard', signature: 'function TelemetryCard(props: TelemetryCardProps): JSX.Element',
            lineStart: 1, lineEnd: 40, calledBy: ['LeftSidebar'], calls: ['motion.div'],
            riskLevel: 'low', description: 'Glassmorphism stat card with neon glow',
            code: `export function TelemetryCard({ title, value, subtext, icon: Icon, glowColor }: TelemetryCardProps) {\n  return (\n    <div className={\`p-3 bg-[#0A0E1A]/90 border rounded-xl transition-all duration-200 \${getGlowStyles(glowColor)}\`}>\n      <div className="flex items-center justify-between mb-1">\n        <span className="text-[11px] font-mono">{title}</span>\n        <Icon className="w-4 h-4" />\n      </div>\n      <div className="text-xl font-bold font-mono">{value}</div>\n      <div className="text-[10px] text-slate-400">{subtext}</div>\n    </div>\n  );\n}`,
          }],
        },
      ],
    },

    // ── BACKEND DISTRICT ──────────────────────────────────────────────────────
    {
      id: 'b1', name: 'authController.ts', path: 'server/controllers/authController.ts',
      type: 'backend', island: 'backend', lines: 250, complexity: 'Medium',
      security: 'High Risk: Hardcoded JWT Secret',
      imports: ['jsonwebtoken', 'bcryptjs'],
      codeSnippet: `const token = jwt.sign({ id: 1 }, 'my_super_secret_key');`,
      aiExplanation: 'CRITICAL: Hardcoded JWT Secret on line 3. Move to process.env.JWT_SECRET.',
      gridPos: { x: 150, y: 390 }, width: 48, depth: 48,
      author: 'david.backend', language: 'TypeScript',
      floors: [
        {
          id: 'b1_fl1', label: 'login()', type: 'function', floorIndex: 0,
          functions: [{
            id: 'b1_fl1_fn1', name: 'login', signature: 'async function login(req: Request, res: Response): Promise<void>',
            lineStart: 10, lineEnd: 45, calledBy: ['POST /api/auth/login'], calls: ['bcrypt.compare', 'jwt.sign', 'queryUser'],
            riskLevel: 'critical', description: '⚠ CRITICAL: Hardcoded JWT secret detected',
            code: `async function login(req: Request, res: Response): Promise<void> {\n  const { email, password } = req.body;\n  const user = await User.findOne({ email });\n  if (!user) return res.status(401).json({ error: 'Invalid credentials' });\n\n  const valid = await bcrypt.compare(password, user.passwordHash);\n  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });\n\n  // ⚠ RISK: Hardcoded secret — move to process.env.JWT_SECRET\n  const token = jwt.sign({ id: user._id }, 'my_super_secret_key', { expiresIn: '7d' });\n  res.json({ token, user: { id: user._id, name: user.name } });\n}`,
          }],
        },
        {
          id: 'b1_fl2', label: 'register()', type: 'function', floorIndex: 1,
          functions: [{
            id: 'b1_fl2_fn1', name: 'register', signature: 'async function register(req: Request, res: Response): Promise<void>',
            lineStart: 47, lineEnd: 90, calledBy: ['POST /api/auth/register'], calls: ['bcrypt.hash', 'User.create'],
            riskLevel: 'medium', description: 'Creates new user with hashed password',
            code: `async function register(req: Request, res: Response): Promise<void> {\n  const { name, email, password } = req.body;\n  const existing = await User.findOne({ email });\n  if (existing) return res.status(409).json({ error: 'Email already registered' });\n\n  const passwordHash = await bcrypt.hash(password, 12);\n  const user = await User.create({ name, email, passwordHash });\n  res.status(201).json({ id: user._id, name, email });\n}`,
          }],
        },
        {
          id: 'b1_fl3', label: 'logout()', type: 'function', floorIndex: 2,
          functions: [{
            id: 'b1_fl3_fn1', name: 'logout', signature: 'async function logout(req: Request, res: Response): Promise<void>',
            lineStart: 92, lineEnd: 110, calledBy: ['POST /api/auth/logout'], calls: ['TokenBlacklist.add'],
            riskLevel: 'low', description: 'Invalidates current JWT by blacklisting',
            code: `async function logout(req: Request, res: Response): Promise<void> {\n  const token = req.headers.authorization?.split(' ')[1];\n  if (token) await TokenBlacklist.add(token);\n  res.status(204).send();\n}`,
          }],
        },
      ],
    },
    {
      id: 'b2', name: 'routes.ts', path: 'server/routes/api.ts', type: 'backend', island: 'backend',
      lines: 310, complexity: 'High', security: 'Clean',
      imports: ['express'],
      codeSnippet: `router.post('/login', authController.login);`,
      aiExplanation: '1. High throughput route dispatcher.',
      gridPos: { x: 220, y: 370 }, width: 44, depth: 44,
      author: 'david.backend', language: 'TypeScript',
      floors: [
        {
          id: 'b2_fl1', label: 'GET /users', type: 'route', floorIndex: 0,
          functions: [{
            id: 'b2_fl1_fn1', name: 'getUsers', signature: 'router.get("/users", authenticate, getUsers)',
            lineStart: 5, lineEnd: 22, calledBy: ['Frontend: useFetch(/users)'], calls: ['User.find', 'paginate'],
            riskLevel: 'low', description: 'Returns paginated list of users',
            code: `router.get('/users', authenticate, async (req, res) => {\n  const page = Number(req.query.page) || 1;\n  const limit = 20;\n  const users = await User.find({}).skip((page-1)*limit).limit(limit);\n  res.json({ users, page });\n});`,
          }],
        },
        {
          id: 'b2_fl2', label: 'POST /login', type: 'route', floorIndex: 1,
          functions: [{
            id: 'b2_fl2_fn1', name: 'loginRoute', signature: 'router.post("/login", rateLimiter, login)',
            lineStart: 24, lineEnd: 28, calledBy: ['AuthPortal.submit()'], calls: ['authController.login'],
            riskLevel: 'high', description: 'Auth entry — calls risky controller',
            code: `router.post('/login', rateLimiter(5, '15m'), authController.login);`,
          }],
        },
        {
          id: 'b2_fl3', label: 'PUT /users/:id', type: 'route', floorIndex: 2,
          functions: [{
            id: 'b2_fl3_fn1', name: 'updateUser', signature: 'router.put("/users/:id", authenticate, authorize("admin"), updateUser)',
            lineStart: 30, lineEnd: 55, calledBy: ['AdminPanel.save()'], calls: ['User.findByIdAndUpdate'],
            riskLevel: 'medium', description: 'Admin-only route to update user profile',
            code: `router.put('/users/:id', authenticate, authorize('admin'), async (req, res) => {\n  const updated = await User.findByIdAndUpdate(\n    req.params.id,\n    { $set: req.body },\n    { new: true, runValidators: true }\n  );\n  res.json(updated);\n});`,
          }],
        },
      ],
    },
    {
      id: 'b3', name: 'services.ts', path: 'server/services/mailService.ts',
      type: 'backend', island: 'backend', lines: 190, complexity: 'Low', security: 'Clean',
      imports: ['nodemailer'],
      codeSnippet: `export const sendMail = async () => {};`,
      aiExplanation: '1. Asynchronous SMTP delivery service.',
      gridPos: { x: 190, y: 430 }, width: 40, depth: 40,
      author: 'david.backend', language: 'TypeScript',
      floors: [
        {
          id: 'b3_fl1', label: 'verifyJWT()', type: 'function', floorIndex: 0,
          functions: [{
            id: 'b3_fl1_fn1', name: 'verifyJWT', signature: 'async function verifyJWT(token: string): Promise<UserPayload | null>',
            lineStart: 1, lineEnd: 24, calledBy: ['middleware.authenticate', 'authController.refresh'],
            calls: ['jwt.verify'], riskLevel: 'high',
            description: '⚠ Uses hardcoded fallback secret if env missing',
            code: `export async function verifyJWT(token: string): Promise<UserPayload | null> {\n  try {\n    const secret = process.env.JWT_SECRET ?? 'my_super_secret_key'; // ⚠ risky fallback\n    const decoded = jwt.verify(token, secret) as UserPayload;\n    return decoded;\n  } catch (error) {\n    console.error('JWT verification failed:', error);\n    return null;\n  }\n}`,
          }],
        },
        {
          id: 'b3_fl2', label: 'queryUser()', type: 'function', floorIndex: 1,
          functions: [{
            id: 'b3_fl2_fn1', name: 'queryUser', signature: 'async function queryUser(id: string): Promise<User | null>',
            lineStart: 26, lineEnd: 48, calledBy: ['authController.login', 'profileController.get'],
            calls: ['User.findById', 'redis.get'], riskLevel: 'medium',
            description: 'Fetches user from cache then DB',
            code: `export async function queryUser(id: string): Promise<User | null> {\n  const cached = await redis.get(\`user:\${id}\`);\n  if (cached) return JSON.parse(cached);\n\n  const user = await User.findById(id).lean();\n  if (user) await redis.set(\`user:\${id}\`, JSON.stringify(user), 'EX', 300);\n  return user;\n}`,
          }],
        },
        {
          id: 'b3_fl3', label: 'invalidateCache()', type: 'function', floorIndex: 2,
          functions: [{
            id: 'b3_fl3_fn1', name: 'invalidateCache', signature: 'async function invalidateCache(userId: string): Promise<void>',
            lineStart: 50, lineEnd: 68, calledBy: ['authController.login', 'profileController.update'],
            calls: ['redis.del'], riskLevel: 'low',
            description: 'Clears user cache on mutation',
            code: `export async function invalidateCache(userId: string): Promise<void> {\n  const keys = [\n    \`user:\${userId}\`,\n    \`sessions:\${userId}\`,\n    \`permissions:\${userId}\`,\n  ];\n  await redis.del(...keys);\n}`,
          }],
        },
      ],
    },

    // ── DATABASE CITADEL ──────────────────────────────────────────────────────
    {
      id: 'd1', name: 'UsersSilo', path: 'db/schemas/Users.prisma', type: 'database', island: 'database',
      lines: 210, complexity: 'Low', security: 'Clean', imports: ['MongoDB'],
      codeSnippet: `model User { id String @id }`,
      aiExplanation: '1. Cylindrical MongoDB Users Silo indexed properly.',
      gridPos: { x: 740, y: 390 }, width: 46, depth: 46,
      author: 'db.master', language: 'Prisma',
      floors: [
        {
          id: 'd1_fl1', label: 'schema:User', type: 'class', floorIndex: 0,
          functions: [{
            id: 'd1_fl1_fn1', name: 'UserSchema', signature: 'const UserSchema = new Schema({...})',
            lineStart: 1, lineEnd: 30, calledBy: ['authController', 'profileController'],
            calls: ['mongoose.Schema'], riskLevel: 'low',
            description: 'MongoDB User document schema with indexes',
            code: `const UserSchema = new mongoose.Schema({\n  name: { type: String, required: true },\n  email: { type: String, required: true, unique: true, lowercase: true },\n  passwordHash: { type: String, required: true },\n  role: { type: String, enum: ['user', 'admin'], default: 'user' },\n  createdAt: { type: Date, default: Date.now },\n  lastLogin: { type: Date },\n}, { timestamps: true });\n\nUserSchema.index({ email: 1 });\nUserSchema.index({ createdAt: -1 });`,
          }],
        },
        {
          id: 'd1_fl2', label: 'findByEmail()', type: 'function', floorIndex: 1,
          functions: [{
            id: 'd1_fl2_fn1', name: 'findByEmail', signature: 'static async findByEmail(email: string): Promise<User | null>',
            lineStart: 32, lineEnd: 45, calledBy: ['authController.login'], calls: ['User.findOne'],
            riskLevel: 'low', description: 'Case-insensitive email lookup with index',
            code: `UserSchema.statics.findByEmail = async function(email: string) {\n  return this.findOne({ email: email.toLowerCase() }).lean();\n};`,
          }],
        },
      ],
    },
    {
      id: 'd2', name: 'ProductsSilo', path: 'db/schemas/Products.prisma', type: 'database', island: 'database',
      lines: 290, complexity: 'Medium', security: 'Clean', imports: ['PostgreSQL'],
      codeSnippet: `model Product { id String @id, price Float }`,
      aiExplanation: '1. High read capacity SQL storage silo.',
      gridPos: { x: 820, y: 380 }, width: 46, depth: 46,
      author: 'db.master', language: 'SQL',
      floors: [
        {
          id: 'd2_fl1', label: 'schema:Product', type: 'class', floorIndex: 0,
          functions: [{
            id: 'd2_fl1_fn1', name: 'ProductSchema', signature: 'const ProductSchema = new Schema({...})',
            lineStart: 1, lineEnd: 28, calledBy: ['productController'], calls: ['mongoose.Schema'],
            riskLevel: 'low', description: 'Product document with inventory tracking',
            code: `const ProductSchema = new mongoose.Schema({\n  title: { type: String, required: true },\n  price: { type: Number, required: true, min: 0 },\n  stock: { type: Number, default: 0 },\n  category: { type: String, required: true },\n  images: [{ type: String }],\n}, { timestamps: true });\n\nProductSchema.index({ category: 1, price: 1 });`,
          }],
        },
      ],
    },

    // ── AUTHENTICATION FORT ───────────────────────────────────────────────────
    {
      id: 'a1', name: 'AuthFortCastle', path: 'security/jwtFort.ts', type: 'auth', island: 'auth',
      lines: 340, complexity: 'High', security: 'Clean', imports: ['jwt', 'oauth2'],
      codeSnippet: `export const verifyFortToken = () => {};`,
      aiExplanation: '1. Medieval fortress defense verifying OAuth & JWT tokens.',
      gridPos: { x: 780, y: 190 }, width: 54, depth: 54,
      author: 'sec.ops', language: 'TypeScript',
      floors: [
        {
          id: 'a1_fl1', label: 'authenticate()', type: 'middleware', floorIndex: 0,
          functions: [{
            id: 'a1_fl1_fn1', name: 'authenticate', signature: 'function authenticate(req: Request, res: Response, next: NextFunction): void',
            lineStart: 10, lineEnd: 42, calledBy: ['router.get /users', 'router.put /users/:id'],
            calls: ['verifyJWT', 'TokenBlacklist.has'], riskLevel: 'medium',
            description: 'JWT middleware guard for protected routes',
            code: `export function authenticate(req: Request, res: Response, next: NextFunction): void {\n  const auth = req.headers.authorization;\n  if (!auth?.startsWith('Bearer ')) {\n    res.status(401).json({ error: 'Missing token' });\n    return;\n  }\n  const token = auth.slice(7);\n  const payload = verifyJWT(token);\n  if (!payload) {\n    res.status(401).json({ error: 'Invalid or expired token' });\n    return;\n  }\n  req.user = payload;\n  next();\n}`,
          }],
        },
        {
          id: 'a1_fl2', label: 'authorize()', type: 'middleware', floorIndex: 1,
          functions: [{
            id: 'a1_fl2_fn1', name: 'authorize', signature: 'function authorize(role: string): Middleware',
            lineStart: 44, lineEnd: 62, calledBy: ['router.delete', 'router.put /admin'],
            calls: [], riskLevel: 'medium',
            description: 'Role-based access control middleware',
            code: `export function authorize(role: string): Middleware {\n  return (req: Request, res: Response, next: NextFunction) => {\n    if (!req.user || req.user.role !== role) {\n      res.status(403).json({ error: 'Forbidden: insufficient permissions' });\n      return;\n    }\n    next();\n  };\n}`,
          }],
        },
        {
          id: 'a1_fl3', label: 'generateTokens()', type: 'function', floorIndex: 2,
          functions: [{
            id: 'a1_fl3_fn1', name: 'generateTokens', signature: 'function generateTokens(payload: UserPayload): { accessToken: string; refreshToken: string }',
            lineStart: 64, lineEnd: 88, calledBy: ['authController.login', 'authController.refresh'],
            calls: ['jwt.sign'], riskLevel: 'high',
            description: 'Issues access + refresh JWT pair',
            code: `export function generateTokens(payload: UserPayload) {\n  const accessToken = jwt.sign(\n    payload,\n    process.env.JWT_SECRET!,\n    { expiresIn: '15m' }\n  );\n  const refreshToken = jwt.sign(\n    { id: payload.id },\n    process.env.REFRESH_SECRET!,\n    { expiresIn: '30d' }\n  );\n  return { accessToken, refreshToken };\n}`,
          }],
        },
      ],
    },

    // ── INFRASTRUCTURE CORE ───────────────────────────────────────────────────
    {
      id: 'i1', name: 'DockerGrid', path: 'infra/docker-compose.yml', type: 'infra', island: 'infra',
      lines: 160, complexity: 'Low', security: 'Clean', imports: ['Docker', 'Redis', 'Nginx'],
      codeSnippet: `version: '3.8'\nservices:\n  redis:\n    image: redis:alpine`,
      aiExplanation: '1. Orchestrated container grid for Redis & Nginx.',
      gridPos: { x: 480, y: 620 }, width: 50, depth: 50,
      author: 'devops.lead', language: 'YAML',
      floors: [
        {
          id: 'i1_fl1', label: 'redis:service', type: 'function', floorIndex: 0,
          functions: [{
            id: 'i1_fl1_fn1', name: 'redis', signature: 'services.redis (Docker)',
            lineStart: 5, lineEnd: 18, calledBy: ['app', 'worker'], calls: [],
            riskLevel: 'low', description: 'In-memory cache and message queue',
            code: `redis:\n  image: redis:7-alpine\n  restart: unless-stopped\n  ports:\n    - "6379:6379"\n  volumes:\n    - redis_data:/data\n  command: redis-server --appendonly yes`,
          }],
        },
        {
          id: 'i1_fl2', label: 'nginx:service', type: 'function', floorIndex: 1,
          functions: [{
            id: 'i1_fl2_fn1', name: 'nginx', signature: 'services.nginx (Docker)',
            lineStart: 20, lineEnd: 38, calledBy: ['external traffic'], calls: ['app:3000'],
            riskLevel: 'low', description: 'Reverse proxy with SSL termination',
            code: `nginx:\n  image: nginx:alpine\n  ports:\n    - "80:80"\n    - "443:443"\n  volumes:\n    - ./nginx.conf:/etc/nginx/nginx.conf\n    - ./certs:/etc/ssl/certs\n  depends_on:\n    - app`,
          }],
        },
        {
          id: 'i1_fl3', label: 'app:service', type: 'function', floorIndex: 2,
          functions: [{
            id: 'i1_fl3_fn1', name: 'app', signature: 'services.app (Docker)',
            lineStart: 40, lineEnd: 65, calledBy: ['nginx'], calls: ['redis', 'mongo'],
            riskLevel: 'medium', description: 'Main Node.js API container',
            code: `app:\n  build: .\n  environment:\n    - NODE_ENV=production\n    - JWT_SECRET=\${JWT_SECRET}\n    - MONGO_URI=\${MONGO_URI}\n    - REDIS_URL=redis://redis:6379\n  depends_on:\n    - redis\n    - mongo\n  restart: unless-stopped`,
          }],
        },
      ],
    },

    // ── MONITORING CENTER ─────────────────────────────────────────────────────
    {
      id: 'm1', name: 'SatelliteRadar', path: 'telemetry/monitoring.ts', type: 'service', island: 'service',
      lines: 140, complexity: 'Low', security: 'Clean', imports: ['prometheus', 'grafana'],
      codeSnippet: `export const trackMetrics = () => {};`,
      aiExplanation: '1. Satellite dish array broadcasting real-time metrics.',
      gridPos: { x: 180, y: 620 }, width: 42, depth: 42,
      author: 'telemetry.bot', language: 'TypeScript',
      floors: [
        {
          id: 'm1_fl1', label: 'trackMetrics()', type: 'function', floorIndex: 0,
          functions: [{
            id: 'm1_fl1_fn1', name: 'trackMetrics', signature: 'function trackMetrics(event: MetricEvent): void',
            lineStart: 1, lineEnd: 28, calledBy: ['router.use', 'authController'],
            calls: ['prometheus.counter.inc', 'prometheus.histogram.observe'], riskLevel: 'low',
            description: 'Records API event metrics to Prometheus',
            code: `export function trackMetrics(event: MetricEvent): void {\n  requestCounter.labels(event.method, event.path, String(event.statusCode)).inc();\n  requestDuration.labels(event.method, event.path).observe(event.duration / 1000);\n  if (event.statusCode >= 500) {\n    errorCounter.labels(event.path).inc();\n  }\n}`,
          }],
        },
        {
          id: 'm1_fl2', label: 'healthCheck()', type: 'function', floorIndex: 1,
          functions: [{
            id: 'm1_fl2_fn1', name: 'healthCheck', signature: 'async function healthCheck(): Promise<HealthStatus>',
            lineStart: 30, lineEnd: 55, calledBy: ['GET /health', 'load-balancer'],
            calls: ['mongoose.connection', 'redis.ping'], riskLevel: 'low',
            description: 'Reports DB, cache, and API health status',
            code: `export async function healthCheck(): Promise<HealthStatus> {\n  const [dbOk, redisOk] = await Promise.all([\n    mongoose.connection.readyState === 1,\n    redis.ping().then(() => true).catch(() => false),\n  ]);\n  return { status: dbOk && redisOk ? 'healthy' : 'degraded', db: dbOk, cache: redisOk, uptime: process.uptime() };\n}`,
          }],
        },
      ],
    },
  ],

  edges: [
    { from: 'f1', to: 'b1', label: 'POST /api/auth/login', method: 'POST' },
    { from: 'b1', to: 'a1', label: 'Verify JWT Fort', method: 'RPC' },
    { from: 'b3', to: 'd1', label: 'Query User Silo', method: 'SQL' },
    { from: 'b2', to: 'd2', label: 'Query Product Silo', method: 'SQL' },
    { from: 'b3', to: 'i1', label: 'Invalidate Cache', method: 'CACHE' },
    { from: 'i1', to: 'm1', label: 'Docker Deploy', method: 'RPC' },
  ],
  stats: {
    totalFiles: 12, totalLines: 2380, securityScore: 84, bottlenecks: 2,
    highRiskCount: 1, frontendCount: 3, backendCount: 3,
    databaseCount: 2, authCount: 1, infraCount: 2,
  },
};

export const PRESET_REPOSITORIES: RepoDataset[] = [PRIMARY_MOCK_DATASET];

export function generateCityFromRepoUrl(url: string): RepoDataset {
  const cleanUrl = url.trim().replace(/\/$/, '');
  const parts = cleanUrl.split('/');
  const repoName = parts.pop() || 'custom-repository';
  const owner = parts.pop() || 'developer';
  return { ...PRIMARY_MOCK_DATASET, id: `custom-${Date.now()}`, name: repoName, owner, url: cleanUrl, description: `Analyzed city for ${owner}/${repoName}` };
}
