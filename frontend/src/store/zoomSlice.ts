import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ZoomLevel, ZoomState } from '../types/codecity';

const initialState: ZoomState = {
  level: 1,
  selectedDistrictId: null,
  selectedBuildingId: null,
  selectedFunctionId: null,
  history: [],
};

export const zoomSlice = createSlice({
  name: 'zoom',
  initialState,
  reducers: {
    zoomToDistrict: (state, action: PayloadAction<string>) => {
      state.history.push({ level: state.level, districtId: state.selectedDistrictId, buildingId: state.selectedBuildingId });
      state.level = 2;
      state.selectedDistrictId = action.payload;
      state.selectedBuildingId = null;
      state.selectedFunctionId = null;
    },
    zoomToBuilding: (state, action: PayloadAction<string>) => {
      state.history.push({ level: state.level, districtId: state.selectedDistrictId, buildingId: state.selectedBuildingId });
      state.level = 3;
      state.selectedBuildingId = action.payload;
      state.selectedFunctionId = null;
    },
    selectFunction: (state, action: PayloadAction<string>) => {
      state.level = 4;
      state.selectedFunctionId = action.payload;
    },
    zoomBack: (state) => {
      const prev = state.history.pop();
      if (prev) {
        state.level = prev.level as ZoomLevel;
        state.selectedDistrictId = prev.districtId;
        state.selectedBuildingId = prev.buildingId;
        state.selectedFunctionId = null;
      } else {
        state.level = 1;
        state.selectedDistrictId = null;
        state.selectedBuildingId = null;
        state.selectedFunctionId = null;
      }
    },
    closeCodeDrawer: (state) => {
      state.selectedFunctionId = null;
      state.level = state.level === 4 ? 3 : state.level;
    },
    resetZoom: () => initialState,
  },
});

export const {
  zoomToDistrict,
  zoomToBuilding,
  selectFunction,
  zoomBack,
  closeCodeDrawer,
  resetZoom,
} = zoomSlice.actions;

export default zoomSlice.reducer;
