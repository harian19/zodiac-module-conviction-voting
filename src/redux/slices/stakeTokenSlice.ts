import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type StakeTokenState = {
  address: string;
  loading: boolean;
  error: string | null;
  symbol: string;
  decimals: number;
};

const initialState: StakeTokenState = {
  address: '',
  loading: false,
  error: null,
  symbol: '',
  decimals: 18,
};

const stakeTokenSlice = createSlice({
  name: 'stakeToken',
  initialState,
  reducers: {
    setStakeTokenAddress: (state, action: PayloadAction<string>) => {
      state.address = action.payload;
    },
    setStakeTokenSymbol: (state, action: PayloadAction<string>) => {
      state.symbol = action.payload;
    },
    setStakeTokenDecimals: (state, action: PayloadAction<number>) => {
      state.decimals = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
});

export default stakeTokenSlice;
export const {
  setStakeTokenAddress,
  setStakeTokenSymbol,
  setStakeTokenDecimals,
  setLoading,
  setError,
} = stakeTokenSlice.actions;