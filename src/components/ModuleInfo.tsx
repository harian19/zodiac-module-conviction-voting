import React, { useCallback, useEffect, useState } from 'react'
import { ethers } from 'ethers'
import abi from '../contracts/ConvictionModule.json'
import ERC20Abi from '../contracts/ERC20.json'
import { Grid, makeStyles } from '@material-ui/core'
import { useSelector, useStore } from 'react-redux'
import { chains } from '../App'
import { RootState } from '../redux/configureStore'
import { addCommas, getFormattedRequestAmount } from '../utils'
import AddProposal from '../components/AddProposal'
import { GenericModal, Button, Text, Title, theme } from '@gnosis.pm/safe-react-components'
import { useWallets } from '@web3-onboard/react'
import WriteButtonWrapper from './WriteButtonWrapper'

function ModuleInfo() {
  const styles = useStyles()
  const wallets = useWallets()
  const moduleAddress: string = useSelector<{ module: { address: string; loading: boolean; error: string } }, string>(
    (state) => state.module.address,
  )

  const requestTokenAddress = useSelector<RootState, string | null>((state) => state.requestToken.address)

  const store = useStore()

  const requestTokenSymbol = useSelector<RootState, string>((state) => state.requestToken.symbol)
  const totalStaked = useSelector<RootState, string>((state) => state.module.totalStaked)
  const voterTotalStake = useSelector<RootState, string>((state) => state.module.voterTotalStake)

  const stakeTokenDecimals = useSelector<RootState, number>((state) => state.stakeToken.decimals)
  const stakeTokenSymbol = useSelector<RootState, string>((state) => state.stakeToken.symbol)

  const [avatarBalance, setAvatarBalance] = useState<bigint>()
  const [maxRatio, setMaxRatio] = useState<bigint>()
  const [isOpen, setIsOpen] = useState(false)

  const getModuleInfo = useCallback(async () => {
    const provider = new ethers.JsonRpcProvider(chains[2].rpcUrl)
    const contract = new ethers.Contract(moduleAddress, abi, provider)
    let _avatarBalance
    if (requestTokenAddress === ethers.ZeroAddress) _avatarBalance = await provider.getBalance(await contract.avatar())
    else {
      const tokenContract = new ethers.Contract(requestTokenAddress ?? '', ERC20Abi, provider)
      _avatarBalance = await tokenContract.balanceOf(await contract.avatar())
    }
    const _maxRatio = await contract.maxRatio()
    setAvatarBalance(_avatarBalance)
    setMaxRatio(_maxRatio)
  }, [moduleAddress, requestTokenAddress])

  useEffect(() => {
    getModuleInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleAddress, requestTokenAddress, wallets])

  useEffect(() => {
    getModuleInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (moduleAddress)
    return (
      <div>
        <Grid container>
          <Grid item xs={6}>
            <Title strong size="xs">
              Funding Pool:
              <Text as="span" strong className={styles.fundingPoolValue} color="pending" size="xl">
                {' '}
                {getFormattedRequestAmount(maxRatio ?? BigInt(0), avatarBalance ?? BigInt(0))} {requestTokenSymbol}
              </Text>
            </Title>
            <WriteButtonWrapper>
              <Button className={styles.createButton} size="md" color="primary" onClick={() => setIsOpen(!isOpen)}>
                Create Proposal
              </Button>
            </WriteButtonWrapper>

            <Title strong size="sm">
              Total Staked:
              <Text as="span" strong className={styles.totalStakedValue} color="pending" size="xl">
                {' '}
                {addCommas(ethers.formatUnits(totalStaked, stakeTokenDecimals))} {stakeTokenSymbol}
              </Text>
            </Title>
          </Grid>
          <Grid item xs={6}>
            {BigInt(voterTotalStake) > 0 && (
              <div style={{ float: 'right', paddingRight: '10px' }}>
                <Title strong size="xs">
                  Your Stake:
                  <Text as="span" strong className={styles.voterStakeValue} color="primary" size="xl">
                    {' '}
                    {addCommas(ethers.formatUnits(voterTotalStake, stakeTokenDecimals))} {stakeTokenSymbol}
                  </Text>
                </Title>
              </div>
            )}
          </Grid>
        </Grid>
        {isOpen && (
          <GenericModal
            onClose={() => setIsOpen(false)}
            title="Create Proposal"
            body={<AddProposal moduleAddress={moduleAddress} requestTokenAddress={requestTokenAddress} />}
            footer={
              maxRatio &&
              avatarBalance && (
                <Text size="md" color="secondaryLight">
                  Requests above {getFormattedRequestAmount(maxRatio, avatarBalance)} {requestTokenSymbol} may not pass
                </Text>
              )
            }
          />
        )}
      </div>
    )
  else return null
}

export default ModuleInfo

const useStyles = makeStyles(() => ({
  createButton: {
    '&.MuiButton-root': {
      backgroundColor: theme.colors.pending + ' !important',
    },
    '&.MuiButton-root:hover': {
      filter: 'brightness(85%)',
    },
  },
  fundingPoolValue: {
    lineHeight: '30px !important',
    fontSize: '24px !important',
  },
  totalStakedValue: {
    lineHeight: '36px !important',
    fontSize: '32px !important',
  },
  voterStakeValue: {
    lineHeight: '30px !important',
    fontSize: '24px !important',
  },
}))
