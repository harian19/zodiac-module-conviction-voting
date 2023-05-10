import { configureStore } from '@reduxjs/toolkit';
import moduleSlice, { ModuleState } from './slices/moduleSlice';
import requestTokenSlice, { RequestTokenState } from './slices/requestTokenSlice';
import stakeTokenSlice, { StakeTokenState } from './slices/stakeTokenSlice';
import proposalsSlice, { ProposalsState } from './slices/proposalsSlice';

const store = configureStore({
  reducer: {
    proposals: proposalsSlice.reducer,
    module: moduleSlice.reducer,
    requestToken: requestTokenSlice.reducer,
    stakeToken: stakeTokenSlice.reducer,
  }
});

export type RootState = {
  proposals: ProposalsState;
  module: ModuleState;
  requestToken: RequestTokenState;
  stakeToken: StakeTokenState;
};

export default store;
