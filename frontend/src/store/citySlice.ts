import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RepoDataset, CityNode, MapViewTransform, FilterState, NodeType } from '../types/codecity';
import { PRIMARY_MOCK_DATASET } from '../data/mockRepoData';

export interface CityState {
  currentRepo: RepoDataset;
  selectedNode: CityNode | null;
  transform: MapViewTransform;
  filters: FilterState;
  isAnalyzing: boolean;
}

const initialState: CityState = {
  currentRepo: PRIMARY_MOCK_DATASET,
  selectedNode: null,
  transform: {
    zoom: 1,
    rotateX: 60,
    rotateZ: -45,
    panX: 0,
    panY: 0,
    isTopDown: false,
    autoRotate: false,
    showPipelines: true,
    showGrid: true,
    showTraffic: true
  },
  filters: {
    searchQuery: '',
    selectedSector: 'all',
    securityFilter: 'all',
    complexityFilter: 'all'
  },
  isAnalyzing: false
};

export const citySlice = createSlice({
  name: 'city',
  initialState,
  reducers: {
    setCurrentRepo: (state, action: PayloadAction<RepoDataset>) => {
      state.currentRepo = action.payload;
      state.selectedNode = null;
    },
    setSelectedNode: (state, action: PayloadAction<CityNode | null>) => {
      state.selectedNode = action.payload;
    },
    setZoom: (state, action: PayloadAction<number>) => {
      state.transform.zoom = action.payload;
    },
    setPan: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.transform.panX = action.payload.x;
      state.transform.panY = action.payload.y;
    },
    toggleTopDown: (state) => {
      state.transform.isTopDown = !state.transform.isTopDown;
    },
    togglePipelines: (state) => {
      state.transform.showPipelines = !state.transform.showPipelines;
    },
    toggleTraffic: (state) => {
      state.transform.showTraffic = !state.transform.showTraffic;
    },
    resetCamera: (state) => {
      state.transform.zoom = 1;
      state.transform.rotateX = 60;
      state.transform.rotateZ = -45;
      state.transform.panX = 0;
      state.transform.panY = 0;
      state.transform.isTopDown = false;
    },
    rotateLeft: (state) => {
      state.transform.rotateZ -= 15;
    },
    setSelectedSectorFilter: (state, action: PayloadAction<NodeType | 'all'>) => {
      state.filters.selectedSector = action.payload;
    },
    setSecurityFilter: (state, action: PayloadAction<'all' | 'clean' | 'risks'>) => {
      state.filters.securityFilter = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.filters.searchQuery = action.payload;
    },
    setIsAnalyzing: (state, action: PayloadAction<boolean>) => {
      state.isAnalyzing = action.payload;
    }
  }
});

export const {
  setCurrentRepo,
  setSelectedNode,
  setZoom,
  setPan,
  toggleTopDown,
  togglePipelines,
  toggleTraffic,
  resetCamera,
  rotateLeft,
  setSelectedSectorFilter,
  setSecurityFilter,
  setSearchQuery,
  setIsAnalyzing
} = citySlice.actions;

export default citySlice.reducer;
