export type NodeType = 'frontend' | 'backend' | 'database' | 'auth' | 'infra' | 'service' | 'external' | 'depot';
export type ComplexityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ZoomLevel = 1 | 2 | 3 | 4;

export interface GridPos {
  x: number;
  y: number;
}

// ─── Function-level data (Level 4) ───────────────────────────────────────────
export interface FunctionNode {
  id: string;
  name: string;
  signature: string;
  lineStart: number;
  lineEnd: number;
  code: string;
  calledBy: string[];
  calls: string[];
  riskLevel: RiskLevel;
  description: string;
}

// ─── Floor = one function/class block inside a building (Level 3) ─────────────
export interface BuildingFloor {
  id: string;
  label: string;
  type: 'function' | 'class' | 'component' | 'route' | 'middleware';
  floorIndex: number;
  functions: FunctionNode[];
}

// ─── City Node (building) ─────────────────────────────────────────────────────
export interface CityNode {
  id: string;
  name: string;
  path: string;
  type: NodeType;
  island: NodeType;
  lines: number;
  complexity: ComplexityLevel;
  security: string;
  imports: string[];
  codeSnippet: string;
  aiExplanation: string;
  gridPos: GridPos;
  width?: number;
  depth?: number;
  heightPx?: number;
  exports?: string[];
  author?: string;
  language?: string;
  floors?: BuildingFloor[];
}

export interface CityEdge {
  from: string;
  to: string;
  label: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'WEBSOCKET' | 'SQL' | 'CACHE' | 'RPC';
  trafficSpeed?: number;
}

export interface IslandSector {
  id: NodeType;
  title: string;
  subtitle: string;
  themeColor: string;
  accentBright: string;
  accentMedium: string;
  accentDark: string;
  glowClass: string;
  badgeBg: string;
  badgeBorder: string;
  gridOrigin: { x: number; y: number };
  size: { width: number; height: number };
  iconName: string;
}

export interface RepoStats {
  totalFiles: number;
  totalLines: number;
  securityScore: number;
  bottlenecks: number;
  highRiskCount: number;
  frontendCount: number;
  backendCount: number;
  databaseCount: number;
  authCount: number;
  infraCount: number;
}

export interface RepoDataset {
  id: string;
  name: string;
  owner: string;
  url: string;
  description: string;
  stars: number;
  nodes: CityNode[];
  edges: CityEdge[];
  stats: RepoStats;
}

export interface MapViewTransform {
  zoom: number;
  rotateX: number;
  rotateZ: number;
  panX: number;
  panY: number;
  isTopDown: boolean;
  autoRotate: boolean;
  showPipelines: boolean;
  showGrid: boolean;
  showTraffic: boolean;
}

export interface FilterState {
  searchQuery: string;
  selectedSector: NodeType | 'all';
  securityFilter: 'all' | 'clean' | 'risks';
  complexityFilter: 'all' | 'Low' | 'Medium' | 'High' | 'Critical';
}

// ─── Zoom slice types ──────────────────────────────────────────────────────────
export interface ZoomState {
  level: ZoomLevel;
  selectedDistrictId: string | null;
  selectedBuildingId: string | null;
  selectedFunctionId: string | null;
  history: Array<{ level: ZoomLevel; districtId: string | null; buildingId: string | null }>;
}
