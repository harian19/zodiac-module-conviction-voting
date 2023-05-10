import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type RequestTokenState = {
  address: string | null;
  loading: boolean;
  error: string | null;
  symbol: string ;
  decimals: number;
};

const initialState: RequestTokenState = {
  address: null,
  loading: false,
  error: null,
  symbol: '',
  decimals: 18
};

const requestTokenSlice = createSlice({
  name: 'requestToken',
  initialState,
  reducers: {
    setRequestTokenAddress: (state, action: PayloadAction<string>) => {
      state.address = action.payload;
    },
    setRequestTokenSymbol: (state, action: PayloadAction<string>) => {
      state.symbol = action.payload;
    },
    setRequestTokenDecimals: (state, action: PayloadAction<number>) => {
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

export default requestTokenSlice;
export const {
  setRequestTokenAddress,
  setRequestTokenSymbol,
  setRequestTokenDecimals,
  setLoading,
  setError,
} = requestTokenSlice.actions;

