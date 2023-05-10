// Import the necessary types
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define the state type
export type ModuleState = {
  totalStaked: string;
  voterTotalStake: string;
  chainId: string;
  address: string ;
  loading: boolean;
  error: string | null;
}

// Provide the initialState type using the ModuleState interface
const initialState: ModuleState = {
  totalStaked: '0',
  voterTotalStake: '0',
  chainId: '0x1',
  address: '',
  loading: false,
  error: null,
};

const moduleSlice = createSlice({
  name: 'module',
  initialState,
  reducers: {
    setModuleTotalStaked: (state, action: PayloadAction<string>) => {
      state.totalStaked = action.payload;
    },
    setVoterTotalStaked: (state, action: PayloadAction<string>) => {
      state.voterTotalStake = action.payload;
    },
    setModuleAddress: (state, action: PayloadAction<string>) => {
      state.address = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    setChainId: (state, action: PayloadAction<string>) => {
      state.chainId = action.payload;
    }
  },
});

export default moduleSlice;

export const { setVoterTotalStaked, setModuleTotalStaked, setModuleAddress, setChainId } = moduleSlice.actions;
