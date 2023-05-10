import React from 'react'
import { useState } from 'react'
import { makeStyles } from '@material-ui/core'
import { useWallets } from '@web3-onboard/react'
import { ethers } from 'ethers'
import abi from '../contracts/ConvictionModule.json'
import { AddressInput, Button, TextFieldInput, theme } from '@gnosis.pm/safe-react-components'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/configureStore'

type AddProposalProps = {
  moduleAddress: string
  requestTokenAddress: string | null
}

function AddProposal({ moduleAddress, requestTokenAddress }: AddProposalProps) {
  const connectedWallets = useWallets()
  const styles = useStyles()

  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [requestAmount, setRequestAmount] = useState(1)
  const [beneficiary, setBeneficiary] = useState('')

  const requestTokenDecimals = useSelector<RootState, number>((state) => state.requestToken.decimals)
  const requestTokenSymbol = useSelector<RootState, string>((state) => state.requestToken.symbol)

  const handleAddProposal = async () => {
    const signer = await new ethers.BrowserProvider(connectedWallets[0].provider).getSigner()
    const myContract = new ethers.Contract(moduleAddress, abi, signer)

    // Call the desired method on the contract instance, passing in the four input values as arguments
    const tx = await myContract.addProposal(
      title,
      ethers.toUtf8Bytes(link),
      ethers.parseUnits(requestAmount.toString(), requestTokenDecimals),
      beneficiary,
    )
    console.log('Transaction sent:', tx.hash)
  }

  return (
    <form onSubmit={handleAddProposal}>
      <div>
        <div>
          <TextFieldInput
            fullWidth
            placeholder="Develop Kitten NFTs"
            label="Title"
            helperText={'Enter Title here'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            name={'Title'}
          />
        </div>
        <br />
        <div>
          <TextFieldInput
            fullWidth
            placeholder="https://ipfs.io/ipfs/..."
            label="Link"
            helperText={'Enter Link here'}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            name={'Link'}
          />
        </div>
        <br />
        <div>
          <TextFieldInput
            fullWidth
            placeholder="Enter Amount here"
            type="number"
            label="Request Amount"
            helperText={'Enter Amount here'}
            value={requestAmount}
            onChange={(e) => setRequestAmount(parseFloat(e.target.value))}
            name={'Request Amount'}
            InputProps={{
              endAdornment: <span style={{ paddingLeft: '5px' }}> {requestTokenSymbol} </span>,
            }}
          />
        </div>
        <br />
        <div>
          <AddressInput
            fullWidth
            placeholder="0x..."
            label="Beneficiary"
            helperText="Enter Beneficiary Address"
            onChange={(e) => setBeneficiary(e.target.value)}
            name={'Beneficiary'}
            address={beneficiary}
            onChangeAddress={(address) => setBeneficiary(address)}
          />
        </div>
        <div style={{ display: 'grid', alignItems: 'center', justifyContent: 'center' }}>
          <br />
          <Button className={styles.createButton} size="md" variant="contained" onClick={handleAddProposal}>
            Create Proposal
          </Button>
        </div>
      </div>
    </form>
  )
}

export default AddProposal

const useStyles = makeStyles(() => ({
  createButton: {
    '&.MuiButton-root': {
      backgroundColor: theme.colors.pending + ' !important',
    },
    '&.MuiButton-root:hover': {
      filter: 'brightness(85%)',
    },
  },
}))
