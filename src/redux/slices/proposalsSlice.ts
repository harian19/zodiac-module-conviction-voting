import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type ProposalData = {
  id: string
  requestedAmount: string
  beneficiary: string
  stakedTokens: string
  convictionLast: string
  blockLast: string
  proposalStatus: string
  submitter: string
  link: string
  title: string
  threshold: string
  currentConviction: string
  stakeAmount: string
}

export enum ProposalStatus {
  ACTIVE = '0',
  PAUSED = '1',
  CANCELED = '2',
  EXECUTED = '3',
}

export type ProposalsState = ProposalData[]

const initialState: ProposalsState = []

const proposalsSlice = createSlice({
  name: 'proposals',
  initialState,
  reducers: {
    setProposals(state, action: PayloadAction<ProposalData[]>) {
      const proposals = action.payload
      proposals.sort((a, b) => {
        const aRatio = parseFloat(a.currentConviction) / parseFloat(a.threshold)
        const bRatio = parseFloat(b.currentConviction) / parseFloat(b.threshold)
        return bRatio - aRatio
      })
      return proposals
    },
    addProposal(state, action: PayloadAction<ProposalData>) {
      state.push(action.payload)
    },
    updateProposal(state, action: PayloadAction<ProposalData>) {
      const proposalIndex = state.findIndex((proposal) => proposal.title === action.payload.title)
      if (proposalIndex !== -1) {
        state[proposalIndex] = action.payload
      }
    },
    removeProposal(state, action: PayloadAction<string>) {
      const proposalIndex = state.findIndex((proposal) => proposal.title === action.payload)
      if (proposalIndex !== -1) {
        state.splice(proposalIndex, 1)
      }
    },
  },
})

export const { setProposals, addProposal, updateProposal, removeProposal } = proposalsSlice.actions

export default proposalsSlice
