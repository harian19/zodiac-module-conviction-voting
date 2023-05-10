import {
  Button,
  ButtonLink,
  GenericModal,
  Icon,
  Menu,
  Text,
  Title,
  Tooltip,
  theme,
} from '@gnosis.pm/safe-react-components'
import React, { useState } from 'react'
import { ProposalData, ProposalStatus } from '../redux/slices/proposalsSlice'
import { Grid, LinearProgress, makeStyles } from '@material-ui/core'
import { addCommas, getConvictionPercentageFromThreshold } from '../utils'
import { ethers } from 'ethers'
import { useSelector, useStore } from 'react-redux'
import { useTheme } from 'styled-components'
import StakeModal from './StakeModal'
import abi from '../contracts/ConvictionModule.json'
import { useWallets } from '@web3-onboard/react'
import { RootState } from '../redux/configureStore'
import WriteButtonWrapper from './WriteButtonWrapper'

const ProposalSummary = (props: { proposal: ProposalData; requestTokenSymbol: string }): React.ReactElement => {
  const { proposal: p, requestTokenSymbol } = props
  const theme = useTheme()
  const styles = useStyles(theme)
  const store = useStore()
  const connectedWallets = useWallets()
  const moduleAddress = useSelector<RootState, string>((state) => state.module.address)

  const convictionPercentage =
    getConvictionPercentageFromThreshold(p['currentConviction'], p['threshold']) > 100
      ? 100
      : getConvictionPercentageFromThreshold(p['currentConviction'], p['threshold'])

  async function cancelProposal(proposalId: string) {
    const signer = await new ethers.BrowserProvider(connectedWallets[0].provider).getSigner()
    const contract = new ethers.Contract(moduleAddress, abi, signer)

    await contract.cancelProposal(proposalId)
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerContainer}>
        <Title size="sm">
          {p['title']}{' '}
          <div style={{ display: 'contents', marginLeft: '15px' }}>
            <span style={{ float: 'right' }}>
              <ProposalCTA convictionPercentage={convictionPercentage} proposalId={p.id} proposal={p} />
            </span>
          </div>
        </Title>
        <Text className={styles.infoText} size="lg">
          Requested Amount: {ethers.formatEther(p['requestedAmount'])} {requestTokenSymbol}
        </Text>
      </div>
      <div style={{ width: '100%', alignItems: 'center' }}>
        {p.proposalStatus === ProposalStatus.ACTIVE && (
          <div>
            <LinearProgress
              className={styles.linearProgress}
              color={'primary'}
              variant={'determinate'}
              value={convictionPercentage}
            />
            <div>
              <Text color={'secondary'} size="xl">
                Conviction: {convictionPercentage.toPrecision(4)}%
              </Text>
            </div>
          </div>
        )}
        <br />
        <Grid container>
          <Grid item xs={2}>
            <div style={{ float: 'left' }}>
              <Menu>
                <ButtonLink
                  onClick={() => window.open(ethers.toUtf8String(p['link']))}
                  color="primary"
                  iconType="externalLink"
                >
                  Discussion
                </ButtonLink>
              </Menu>
            </div>
          </Grid>
          <Grid item xs={10}>
            {p.proposalStatus === ProposalStatus.ACTIVE && (
              <div>
                {connectedWallets[0]?.accounts[0]?.address.toUpperCase() === p['submitter'].toUpperCase() && (
                  <Menu>
                    <ButtonLink onClick={() => cancelProposal(p.id)} color="error" iconType="restricted">
                      Cancel Proposal
                    </ButtonLink>
                  </Menu>
                )}
              </div>
            )}
            {p.proposalStatus !== ProposalStatus.ACTIVE && (
              <div style={{ float: 'right' }}>
                <Tooltip
                  title={
                    p.proposalStatus === ProposalStatus.EXECUTED
                      ? 'This proposal was executed.'
                      : 'This proposal was cancelled.'
                  }
                  arrow
                  placement="top"
                >
                  <span>
                    <WriteButtonWrapper>
                      <Button
                        variant="outlined"
                        disabled
                        className={styles.statusButton}
                        color={p.proposalStatus === ProposalStatus.CANCELED ? 'error' : 'secondary'}
                        size={'md'}
                      >
                        {p.proposalStatus === ProposalStatus.CANCELED ? 'Canceled' : 'Executed'}
                        <Icon
                          className={styles.statusIcon}
                          type={p.proposalStatus === ProposalStatus.CANCELED ? 'cross' : 'check'}
                          size="sm"
                        />
                      </Button>
                    </WriteButtonWrapper>
                  </span>
                </Tooltip>
              </div>
            )}
          </Grid>
        </Grid>
      </div>
    </div>
  )
}

export default ProposalSummary

const useStyles = makeStyles(() => ({
  container: {
    width: '100%',
  },
  headerContainer: {
    marginTop: '-26px',
  },
  linearProgress: {
    '& .MuiLinearProgress-barColorPrimary': { backgroundColor: 'rgb(0, 140, 115)' },
    backgroundColor: 'rgb(161, 210, 202, 0.4)',
    height: 10,
    borderRadius: 5,
    margin: '15px 0',
  },
  infoText: {
    color: 'rgb(125, 125, 125) !important',
  },
  statusButton: {
    display: 'inline-flex !important',
    marginLeft: '10px',
  },
  statusIcon: {
    paddingLeft: '5px',
  },
  withdrawButton: {
    position: 'relative',
    zIndex: 99,
    '&.MuiButton-root': {
      backgroundColor: theme.colors.warning + ' !important',
    },
    '&.MuiButton-root:hover': {
      filter: 'brightness(85%)',
    },
  },
}))

function ProposalCTA(props: {
  convictionPercentage: number
  proposal: ProposalData
  proposalId: string
}): React.ReactElement {
  const { proposalStatus: status, stakeAmount } = props.proposal
  const [isStakingOpen, setIsStakingOpen] = useState(false)
  const styles = useStyles()
  const connectedWallets = useWallets()
  const moduleAddress = useSelector<RootState, string>((state) => state.module.address)
  const stakeTokenSymbol = useSelector<RootState, string>((state) => state.stakeToken.symbol)

  async function withdrawFromProposal(proposalId: string) {
    const signer = await new ethers.BrowserProvider(connectedWallets[0].provider).getSigner()
    const contract = new ethers.Contract(moduleAddress, abi, signer)

    await contract.withdrawAllFromProposal(proposalId)
  }

  async function executeProposal(proposalId: string) {
    const signer = await new ethers.BrowserProvider(connectedWallets[0].provider).getSigner()
    const contract = new ethers.Contract(moduleAddress, abi, signer)

    await contract.executeProposal(proposalId)
  }

  if (status === ProposalStatus.ACTIVE && props.convictionPercentage >= 100) {
    return (
      <div style={{ display: 'flex' }}>
        {BigInt(stakeAmount) > 0 && (
          <WithdrawStakeButton
            stakeAmount={stakeAmount}
            withdrawFromProposal={withdrawFromProposal}
            proposalId={props.proposalId}
            stakeTokenSymbol={stakeTokenSymbol}
          />
        )}
        <WriteButtonWrapper>
          <Button size="md" onClick={() => executeProposal(props.proposalId)} color="primary" iconType="rocket">
            Execute Proposal
          </Button>
        </WriteButtonWrapper>
      </div>
    )
  } else if (status === ProposalStatus.ACTIVE)
    return (
      <div style={{ display: 'flex' }}>
        {BigInt(stakeAmount) > 0 && (
          <WithdrawStakeButton
            stakeAmount={stakeAmount}
            withdrawFromProposal={withdrawFromProposal}
            proposalId={props.proposalId}
            stakeTokenSymbol={stakeTokenSymbol}
          />
        )}
        <WriteButtonWrapper>
          <Button onClick={() => setIsStakingOpen(!isStakingOpen)} size="md" color="primary" variant="bordered">
            <div style={{ display: 'flex', marginRight: '5px' }}>
              <Icon color="white" type="allowances" size="sm" />
            </div>
            Stake
          </Button>
        </WriteButtonWrapper>

        {isStakingOpen && (
          <GenericModal
            onClose={() => setIsStakingOpen(false)}
            title="Stake to Proposal"
            body={<StakeModal proposalId={props.proposalId} proposal={props.proposal} />}
          />
        )}
      </div>
    )
  else
    return (
      <WithdrawStakeButton
        stakeAmount={stakeAmount}
        withdrawFromProposal={withdrawFromProposal}
        proposalId={props.proposalId}
        stakeTokenSymbol={stakeTokenSymbol}
        isClosed={true}
      />
    )
}

const WithdrawStakeButton = (props: {
  stakeAmount: string
  withdrawFromProposal: (proposalId: string) => void
  proposalId: string
  stakeTokenSymbol: string
  isClosed?: boolean
}) => {
  const styles = useStyles()
  return (
    <div>
      {BigInt(props.stakeAmount) > 0 && (
        <div>
          <Button
            className={props.isClosed ? styles.withdrawButton : ''}
            onClick={async () => {
              await props.withdrawFromProposal(props.proposalId)
            }}
            size="md"
            variant={props.isClosed ? 'contained' : 'outlined'}
            color={props.isClosed ? 'secondary' : 'primary'}
          >
            <div style={{ display: 'flex', marginRight: '5px' }}>
              <Icon type="paymentToken" size="md" />
            </div>
            Withdraw {addCommas(ethers.formatEther(props.stakeAmount))} {props.stakeTokenSymbol}
          </Button>
        </div>
      )}
    </div>
  )
}
