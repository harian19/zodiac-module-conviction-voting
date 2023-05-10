/* eslint-disable unused-imports/no-unused-imports */
import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ConnectPage from './pages/ConnectPage'
import { Web3OnboardProvider, init, useAccountCenter } from '@web3-onboard/react'
import injectedModule from '@web3-onboard/injected-wallets'
import ZodiacIcon from './assets/exit-module-logo.png'
import { Provider } from 'react-redux'
import store from './redux/configureStore'
import SafeProvider from '@safe-global/safe-apps-react-sdk'
import VotePage from './pages/VotePage'


const MAINNET_RPC_URL = 'https://mainnet.infura.io/v3/21a9bd1e53af45c3ad918ba333413584'
const GOERLI_RPC_URL = 'https://goerli.infura.io/v3/21a9bd1e53af45c3ad918ba333413584'
const POLYGON_RPC_URL = 'https://polygon-rpc.com'
const GNOSIS_SAFE_RPC_URL = 'https://rpc.gnosischain.com'

export const chains = [
  {
  id: '0x1',
    token: 'ETH',
    label: 'Ethereum Mainnet',
    rpcUrl: MAINNET_RPC_URL,
  },
  {
    id: '0x5',
    token: 'ETH',
    label: 'Goerli',
    rpcUrl: GOERLI_RPC_URL,
  },
  {
    id: '0x89',
    token: 'MATIC',
    label: 'Polygon',
    rpcUrl: POLYGON_RPC_URL,
  },
  {
    id: '0x3E7',
    token: 'ETH',
    label: 'Gnosis Safe',
    rpcUrl: GNOSIS_SAFE_RPC_URL,
  },
]

const wallets = [injectedModule()]
const web3Onboard = init({
  wallets,
  chains,
  appMetadata: {
    name: 'Zodiac CV Module',
    icon: '/logo.svg',
    description: 'Conviction Voting Module on Zodiac',
  },
})

const App = (): React.ReactElement => {
  const updateAccountCenter = useAccountCenter()
  updateAccountCenter({ enabled: false })
  return (
    <Provider store={store}>
      <SafeProvider>
          <Web3OnboardProvider web3Onboard={web3Onboard}>
            <Router>
              <Routes>
                <Route path="/connect" element={<ConnectPage/>} />
                <Route path="/" element={<VotePage/>} />
              </Routes>
            </Router>
          </Web3OnboardProvider>
      </SafeProvider>
    </Provider>
  )
}

export default App
