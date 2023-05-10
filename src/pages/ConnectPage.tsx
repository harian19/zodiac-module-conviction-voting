/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useCallback, useEffect, useState } from 'react'
import { useTheme } from 'styled-components'
import { useNavigate } from 'react-router-dom'
import './styles.css'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { setModuleAddress as setModuleAddressRedux } from '../redux/slices/moduleSlice'
import AppContainer from '../components/AppContainer'
import { AddressInput, Button, GenericModal, Stepper, Text, theme } from '@gnosis.pm/safe-react-components'
import { Grid, makeStyles } from '@material-ui/core'
import DeployModuleModal from '../components/DeployModuleModal'
import { useSafeAddress } from '../hooks/customHooks'
import { useConnectWallet } from '@web3-onboard/react'
import { RootState } from '../redux/configureStore'

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

const ConnectPage = (): React.ReactElement => {
  const theme = useTheme()
  const styles = useStyles()
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet()
  const store = useStore()
  const dispatch = useDispatch()
  const { connectedAddress, isSafeAddress } = useSafeAddress()
  const [avatarAddress, setAvatarAddress] = useState<string>('')
  const [isNewModuleOpen, setIsNewModuleOpen] = useState(false)
  const [isModuleAddShown, setIsModuleAddShown] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  const handleChangeAvatarAddress = (address: string) => {
    setAvatarAddress(address)
  }

  useEffect(() => {
    setAvatarAddress(isSafeAddress ? connectedAddress : '')
  }, [connectedAddress, isSafeAddress])

  //chain stuff
  const [chainId, setChainId] = useState<string>('')

  useEffect(() => {
    async function getChainId() {
      if (window.ethereum) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' })
          setChainId(chainId)
        } catch (error) {
          console.error(error)
        }
      }
    }
    getChainId()
  }, [])

  return (
    <AppContainer isBackArrowDisabled={true}>
      <Grid style={{ marginTop: '20px' }} container>
        <Grid item xs={12} md={2} />
        <Grid item xs={12} md={8}>
          <UseModule />
        </Grid>
        <Grid item xs={12} md={2} />
        <Grid item xs={12} md={2} />
        <Grid item xs={12} md={8}>
          <div className={styles.helpTextContainer}>
            <Text size="xl">
              {' '}
              Don't have a module?{' '}
              <span onClick={() => setIsModuleAddShown(true)}>
                <Text className={styles.deployText} size="xl" color="pending">
                  Deploy{' '}
                </Text>
              </span>
              a new module.
            </Text>
          </div>
          {isModuleAddShown && (
            <div>
              <div className={styles.addressFieldContainer}>
                <AddressInput
                  className={styles.addressField}
                  fullWidth={true}
                  color="secondary"
                  variant="outlined"
                  address={avatarAddress}
                  placeholder={'0x...'}
                  name={'Safe Address'}
                  label={'Enter Safe Address'}
                  onChangeAddress={(address) => handleChangeAvatarAddress(address)}
                />
                <div className={styles.buttonContainer}>
                  <Button
                    className={styles.deployButton}
                    size="lg"
                    variant="contained"
                    onClick={() => {
                      setIsNewModuleOpen(true)
                      setStepIndex(1)
                    }}
                  >
                    Create Module
                  </Button>
                  {isNewModuleOpen && (
                    <GenericModal
                      onClose={() => setIsNewModuleOpen(false)}
                      title="Create Module"
                      body={
                        <DeployModuleModal
                          callback={() => setIsNewModuleOpen(!isNewModuleOpen)}
                          avatarAddress={avatarAddress}
                          setAvatarAddress={setAvatarAddress}
                        />
                      }
                    />
                  )}
                </div>
              </div>
              <div className={styles.stepper}>
                <Stepper
                  steps={[
                    { id: '0', label: 'Create module' },
                    { id: '1', label: 'Enable module on the Zodiac Safe App' },
                    { id: '2', label: 'Connect module to this app' },
                    { id: '3', label: 'Stake to a proposal or create a new proposal' },
                  ]}
                  activeStepIndex={stepIndex}
                  orientation={'vertical'}
                />
              </div>
            </div>
          )}
        </Grid>
        <Grid item xs={2} />
      </Grid>
    </AppContainer>
  )
}

export default ConnectPage

export const UseModule = (props: { important?: boolean }) => {
  const styles = useStyles()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [isModuleConnected, setIsModuleConnected] = useState(false)
  const moduleAddressRedux = useSelector<RootState, string>((state) => state.module.address)
  const [moduleAddress, setModuleAddress] = useState<string>(moduleAddressRedux)

  const connectModule = useCallback(() => {
    dispatch(setModuleAddressRedux(moduleAddress))
    setIsModuleConnected(true)
    navigate('/')
  }, [dispatch, moduleAddress, navigate])

  return (
    <form onSubmit={async () => await connectModule()}>
      <div className={styles.addressFieldContainer}>
        <AddressInput
          className={styles.addressField}
          fullWidth={true}
          color="secondary"
          placeholder={'0x...'}
          variant="outlined"
          address={moduleAddress}
          name={'Module Address'}
          label={'Enter Module Address'}
          onChangeAddress={(address) => setModuleAddress(address)}
        />
        <div className={styles.buttonContainer}>
          <Button
            className={props.important ? '' : styles.button}
            size="lg"
            variant="contained"
            onClick={async () => await connectModule()}
          >
            Connect Module
          </Button>
        </div>
      </div>
    </form>
  )
}

const useStyles = makeStyles(() => ({
  addressFieldContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: '10px',
  },
  addressField: {
    position: 'relative',
  },
  buttonContainer: {
    '& .MuiButton-root': { height: '56px !important' },
    marginLeft: '10px',
  },
  button: {
    float: 'right',
    '&.MuiButton-root': {
      backgroundColor: theme.colors.primary + ' !important',
    },
    '&.MuiButton-root:hover': {
      filter: 'brightness(85%)',
    },
  },
  deployNewModuleContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  deployButton: {
    '&.MuiButton-root': {
      backgroundColor: theme.colors.pending + ' !important',
    },
    '&.MuiButton-root:hover': {
      filter: 'brightness(85%)',
    },
  },
  helpTextContainer: {
    marginTop: '10px',
    marginBottom: '15px',
  },
  deployText: {
    display: 'inline',
    cursor: 'pointer',
  },
  stepper: {
    '& .MuiStepper-vertical': {
      background: 'none',
    },
  },
}))
