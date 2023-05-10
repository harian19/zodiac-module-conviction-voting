import React, { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useWallets } from '@web3-onboard/react'
import abi from '../contracts/ConvictionModule.json'
import ERC20Abi from '../contracts/ERC20.json'

import { CircularProgress, Grid, makeStyles } from '@material-ui/core'
import { useSelector, useStore } from 'react-redux'
import { chains } from '../App'
import { RootState } from '../redux/configureStore'
import {
  setRequestTokenAddress,
  setRequestTokenDecimals,
  setRequestTokenSymbol,
} from '../redux/slices/requestTokenSlice'
import { GenericModal, Tab } from '@gnosis.pm/safe-react-components'
import { ProposalData, ProposalStatus, setProposals } from '../redux/slices/proposalsSlice'
import ProposalCard2 from './ProposalCard2'
import { setStakeTokenAddress, setStakeTokenDecimals, setStakeTokenSymbol } from '../redux/slices/stakeTokenSlice'
import { UseModule } from '../pages/ConnectPage'
import { setModuleTotalStaked, setVoterTotalStaked } from '../redux/slices/moduleSlice'

const useStyles = makeStyles((theme) => ({
  tabs: {
    marginBottom: '10px',
  },
}))

function Proposals() {
  const connectedWallets = useWallets()
  const styles = useStyles()

  const moduleAddress: string = useSelector<{ module: { address: string; loading: boolean; error: string } }, string>(
    (state) => state.module.address,
  )

  const chainId = useSelector<RootState, string>((state) => state.module.chainId)

  const store = useStore()
  const proposals = useSelector<RootState, ProposalData[]>((state) => state.proposals)
  const [reading, setReading] = useState(false)
  const [selected, setSelected] = useState('0')

  const onTabChange = (selectedIndex: string) => {
    setSelected(selectedIndex)
  }

  useEffect(() => {
    const getProposals = async () => {
      setReading(true)
      const proposals = []

      const provider = new ethers.JsonRpcProvider(chains[2].rpcUrl)
      const contract = new ethers.Contract(moduleAddress, abi, provider)

      try {
        const requestTokenAddr = await contract.requestToken()
        const stakeTokenAddr = await contract.stakeToken()

        store.dispatch(setRequestTokenAddress(requestTokenAddr))
        store.dispatch(setStakeTokenAddress(stakeTokenAddr))

        const requestTokenContract = new ethers.Contract(requestTokenAddr, ERC20Abi, provider)
        const stakeTokenContract = new ethers.Contract(stakeTokenAddr, ERC20Abi, provider)

        let requestTokenSymbol
        let requestTokenDecimals
        if (requestTokenAddr !== ethers.ZeroAddress) {
          try {
            requestTokenSymbol = await requestTokenContract.symbol()
            requestTokenDecimals = await requestTokenContract.decimals()
          } catch (e) {
            console.error(e)
          }
        } else {
          requestTokenSymbol = chains.find((chain) => chain.id === chainId)?.token ?? ''
          requestTokenDecimals = 18
        }

        const stakeTokenSymbol = await stakeTokenContract.symbol()

        store.dispatch(setRequestTokenSymbol(requestTokenSymbol))
        store.dispatch(setStakeTokenSymbol(stakeTokenSymbol))

        const stakeTokenDecimals = await stakeTokenContract.decimals()

        store.dispatch(setStakeTokenDecimals(parseInt(stakeTokenDecimals)))
        store.dispatch(setRequestTokenDecimals(parseInt(requestTokenDecimals)))
      } catch (e) {
        console.error(e)
      }

      let totalStaked
      let voterTotalStaked

      try {
        totalStaked = await contract.totalStaked()
      } catch (e) {
        totalStaked = '0'
      }

      try {
        voterTotalStaked = await contract.getTotalVoterStake(connectedWallets[0].accounts[0].address)
      } catch (e) {
        voterTotalStaked = '0'
      }

      store.dispatch(setVoterTotalStaked(voterTotalStaked.toString()))
      store.dispatch(setModuleTotalStaked(totalStaked.toString()))

      try {
        const proposalCount = await contract.proposalCounter()
        for (let i = 1; i <= proposalCount; i++) {
          try {
            const proposalData: ProposalData = await contract.getProposal(i)
            let convictionData: string
            let stakeAmount: string

            try {
              convictionData = await contract.getCurrentConviction(i)
            } catch (e) {
              convictionData = proposalData.convictionLast
            }
            try {
              stakeAmount = await contract.getProposalVoterStake(i, connectedWallets[0].accounts[0].address)
            } catch (e) {
              stakeAmount = '0'
            }

            const serializedProposalData = {
              id: i.toString(),
              requestedAmount: proposalData.requestedAmount.toString(),
              beneficiary: proposalData.beneficiary.toString(),
              stakedTokens: proposalData.stakedTokens.toString(),
              convictionLast: proposalData.convictionLast.toString(),
              blockLast: proposalData.blockLast.toString(),
              proposalStatus: proposalData.proposalStatus.toString(),
              submitter: proposalData.submitter.toString(),
              link: proposalData.link.toString(),
              title: proposalData.title.toString(),
              threshold: proposalData.threshold.toString(),
              currentConviction: convictionData.toString(),
              stakeAmount: stakeAmount.toString(),
            }
            proposals.push(serializedProposalData)
          } catch (e) {
            console.error(e)
          }
        }
      } catch (e) {
        console.error(e)
      }
      store.dispatch(setProposals(proposals))
      setReading(false)
    }
    getProposals()
  }, [chainId, connectedWallets, moduleAddress, store])

  return (
    <>
      <Grid container>
        <Grid item xs={12}>
          <div className={styles.tabs}>
            <Tab
              fullWidth
              onChange={onTabChange}
              selectedTab={selected}
              variant="outlined"
              items={[
                { id: '0', label: 'Open Proposals', icon: 'allowances' },
                { id: '1', label: 'Closed Proposals', icon: 'rocket' },
              ]}
            />
          </div>
        </Grid>
        <Grid item xs={12}>
          <div style={{ height: '75vh', overflow: 'auto', padding: '30px' }}>
            <div style={{ maxWidth: '100vw' }}>
              {reading ? (
                <CircularProgress size={56} color="inherit" />
              ) : !moduleAddress ? (
                <GenericModal body={<UseModule />} title="Enter Module Address" onClose={() => undefined} />
              ) : (
                proposals.map((p, index) => {
                  return (
                    ((p.proposalStatus === ProposalStatus.ACTIVE && selected === '0') ||
                      ((p.proposalStatus === ProposalStatus.EXECUTED || p.proposalStatus === ProposalStatus.CANCELED) &&
                        selected === '1')) && (
                      <ProposalCard2 proposal={p} proposalId={p.id} selected={selected} moduleAddress={moduleAddress} />
                    )
                  )
                })
              )}
            </div>
          </div>
          <div></div>
        </Grid>
      </Grid>
    </>
  )
}

export default Proposals
