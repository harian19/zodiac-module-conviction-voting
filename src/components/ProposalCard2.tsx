import {
  Card,
} from '@gnosis.pm/safe-react-components'
import { Grid } from '@material-ui/core'
import React, { useState } from 'react'
import { ProposalData } from '../redux/slices/proposalsSlice'
import { useWallets } from '@web3-onboard/react'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/configureStore'
import ProposalSummary from './ProposalSummary'

function ProposalCard2(props: {
  proposal: ProposalData
  selected: string
  proposalId: string
  moduleAddress: string
}): React.ReactElement {
  const { proposal: p, selected, proposalId, moduleAddress } = props
  const connectedWallets = useWallets()

  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('0')

  const stakeTokenDecimals = useSelector<RootState, number>((state) => state.stakeToken.decimals)
  const requestTokenSymbol = useSelector<RootState, string>((state) => state.requestToken.symbol)

  const handleChangeWithdrawalAmount = (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setWithdrawalAmount(event.target.value)
  }

  return (
    <div key={proposalId} style={{ width: '100%' }}>
      <Card >
        <Grid container>
          <Grid item xs={12}>
            <ProposalSummary proposal={p} requestTokenSymbol={requestTokenSymbol} />
          </Grid>
        </Grid>
      </Card>
      <br />
      <br />
    </div>
  )
}

export default ProposalCard2
