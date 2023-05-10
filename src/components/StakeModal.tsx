import { Button } from '@gnosis.pm/safe-react-components'
import { TextField, makeStyles } from '@material-ui/core'
import React, { useCallback, useState } from 'react'
import { ProposalData } from '../redux/slices/proposalsSlice'
import { ethers } from 'ethers'
import abi from '../contracts/ConvictionModule.json'
import ERC20Abi from '../contracts/ERC20.json'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/configureStore'
import { useWallets } from '@web3-onboard/react'
import WriteButtonWrapper from './WriteButtonWrapper'

function StakeModal(props: { proposal: ProposalData; proposalId: string }): React.ReactElement {
  const connectedWallets = useWallets()

  const stakeTokenDecimals = useSelector<RootState, number>((state) => state.stakeToken.decimals)
  const stakeTokenSymbol = useSelector<RootState, string>((state) => state.stakeToken.symbol)
  const stakeTokenAddress = useSelector<RootState, string>((state) => state.stakeToken.address)

  const moduleAddress = useSelector<RootState, string>((state) => state.module.address)

  const [stakeTokenInput, setStakeTokenInput] = useState<string>('')
  const [isApproved, setIsApproved] = useState(false)

  const stakeTokens = useCallback(
    async (proposalId: string) => {
      const signer = await new ethers.BrowserProvider(connectedWallets[0].provider).getSigner()
      const contract = new ethers.Contract(moduleAddress, abi, signer)
      const stakeTokenContract = new ethers.Contract(stakeTokenAddress, ERC20Abi, signer)

      const _amount = ethers.parseUnits(stakeTokenInput, stakeTokenDecimals)

      if (isApproved) {
        try {
          await contract.stakeToProposal(proposalId, _amount)
        } catch (e) {
          console.error(e)
        }
      } else {
        try {
          await stakeTokenContract.approve(moduleAddress, _amount)
          setIsApproved(true)
        } catch (e) {
          console.error(e)
        }
      }
    },
    [connectedWallets, isApproved, moduleAddress, stakeTokenAddress, stakeTokenDecimals, stakeTokenInput],
  )

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>): void {
    setStakeTokenInput(event.target.value)
  }

  return (
    <div>
      <TextField
        variant="outlined"
        color="secondary"
        fullWidth
        value={stakeTokenInput}
        onChange={(event) => handleChange(event)}
        name={'Module Address'}
        label={'Stake Tokens'}
        InputProps={{
          endAdornment: <span style={{ paddingLeft: '5px' }}>{stakeTokenSymbol}</span>,
        }}
      ></TextField>
      <br />
      <br />
      <div style={{ float: 'right' }}>
        <WriteButtonWrapper>
          <Button
            size="md"
            variant="contained"
            color={!isApproved ? 'secondary' : 'primary'}
            onClick={async () => stakeTokens(props.proposalId)}
          >
            {!isApproved ? 'Approve' : 'Stake'}
          </Button>
        </WriteButtonWrapper>
      </div>
    </div>
  )
}

export default StakeModal

const useStyles = makeStyles((theme) => ({
  root: {
    '& .MuiAccordionSummary-expandIcon': {
      display: 'none',
    },
  },
}))
