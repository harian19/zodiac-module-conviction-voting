import React from 'react'
import { useState, useEffect } from 'react'
import { chains } from '../App'
import { useConnectWallet, useWallets } from '@web3-onboard/react'
import { Button, ButtonLink, Icon, Menu } from '@gnosis.pm/safe-react-components'
import { ellipsizeAddress } from '../utils'
import { Grid, makeStyles } from '@material-ui/core'
import { useNavigate } from 'react-router-dom'
import store from '../redux/configureStore'
import { setChainId } from '../redux/slices/moduleSlice'
import AppTitle from './AppTitle'

interface Ethereum {
  isMetaMask?: boolean
  selectedAddress?: string
  on: (eventName: string, callback: (...args: any[]) => void) => void
  request: (request: { method: string; params?: any[] }) => Promise<any>
}

declare global {
  interface Window {
    ethereum?: Ethereum
  }
}

type Network = {
  id: string
  token: string
  label: string
  rpcUrl: string
}

function ChainSelector() {
  const styles = useStyles()
  const navigate = useNavigate()
  const [networkName, setNetworkName] = useState<string | null>(null)
  const [networks, setNetworks] = useState<{ [id: string]: Network }>({})

  useEffect(() => {
    async function getChainId() {
      if (window.ethereum) {
        try {
          const id = await window.ethereum.request({ method: 'eth_chainId' })
          store.dispatch(setChainId(id))
        } catch (error) {
          console.error(error)
        }
      }
    }

    async function getNetworks() {
      if (window.ethereum) {
        try {
          const chainData: { [id: string]: Network } = {}
          chains.forEach((chain) => {
            chainData[chain['id']] = chain
          })
          setNetworks(chainData)
        } catch (error) {
          console.error(error)
        }
      }
    }

    async function getNetworkName() {
      if (window.ethereum) {
        try {
          const id = await window.ethereum.request({ method: 'net_version' })
          if (networks[id]) {
            setNetworkName(networks[id]['label'])
          } else {
            setNetworkName(id)
          }
        } catch (error) {
          console.error(error)
        }
      }
    }

    getChainId()
    getNetworks()
    getNetworkName()
  }, [])

  async function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const networkId = event.target.value
    try {
      if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: networkId }],
        })
        setChainId(networkId)
        setNetworkName(networks[networkId]['label'])
      }
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <Grid container style={{ paddingTop: '10px' }}>
      <Grid item xs={3}>
        <Menu className={styles.menu}>
          <ButtonLink onClick={() => navigate('/connect')} color="primary" iconType="chain">
            Connect
          </ButtonLink>

          <ButtonLink onClick={() => navigate('/')} color="primary" iconType="allowances">
            Stake
          </ButtonLink>
        </Menu>
      </Grid>
      <Grid style={{ display: 'flex', justifyContent: 'center' }} item xs={6}>
        <AppTitle />
      </Grid>
      <Grid item xs={3}>
        <div style={{ width: '100%' }}>
          <div className={styles.walletButtonContainer}>
            <WalletButton />
          </div>
        </div>
      </Grid>
    </Grid>
  )
}

export const WalletButton = (props: { callback?: () => void }) => {
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet()
  const wallets = useWallets()
  const styles = useStyles()

  return (
    <Button
      size="md"
      variant={wallets.length > 0 ? 'contained' : 'bordered'}
      color="secondary"
      onClick={async () => {
        props.callback && props.callback()
        await connect()
      }}
    >
      <Icon className={styles.walletIcon} size="md" type={'wallet'} />{' '}
      {wallets.length > 0 ? ellipsizeAddress(wallets[0]?.accounts[0]?.address) : 'Connect'}
    </Button>
  )
}

export default ChainSelector

const useStyles = makeStyles(() => ({
  walletButtonContainer: {
    float: 'right',
    padding: '0 10px',
  },
  walletIcon: {
    marginRight: '5px',
  },
  safeIcon: {
    verticalAlign: 'middle',
    marginRight: '10px',
  },
  menu: {
    float: 'left',
    padding: '0px !important',
  },
}))
