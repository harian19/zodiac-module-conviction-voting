import { Button, Icon, Select, Switch, Text, Tooltip, theme } from '@gnosis.pm/safe-react-components'
import { Slider, TextField, makeStyles } from '@material-ui/core'
import React, { useCallback, useState } from 'react'
import { ethers } from 'ethers'
import abi from '../contracts/ConvictionModule.json'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/configureStore'
import { useWallets } from '@web3-onboard/react'
import { bytecode } from '../contracts/bytecode'
import { tokenData } from '../utils/tokenData'
import WriteButtonWrapper from './WriteButtonWrapper'

function DeployModuleModal(props: {
  callback: () => void
  avatarAddress: string
  setAvatarAddress: React.Dispatch<React.SetStateAction<string>>
}): React.ReactElement {
  const { avatarAddress, setAvatarAddress, callback } = props
  const connectedWallets = useWallets()
  const styles = useStyles()

  const moduleAddress = useSelector<RootState, string>((state) => state.module.address)

  const [stakeTokenInput, setStakeTokenInput] = useState<string>('')
  const [stakeTokenAddress, setStakeTokenAddress] = useState<string>('')
  const [requestTokenAddress, setRequestTokenAddress] = useState<string>('')
  const [isTestModule, setIsTestModule] = useState(false)
  const [isAdvanced, setIsAdvanced] = useState(false)

  const [sliderValue, setSliderValue] = useState<number>(25)
  const [activeItemId, setActiveItemId] = useState<string>('0')
  const [isRequestTokenCustom, setIsRequestTokenCustom] = useState(false)

  const deployModule = useCallback(async () => {
    const signer = await new ethers.BrowserProvider(connectedWallets[0].provider).getSigner()
    const factory = new ethers.ContractFactory(abi, bytecode, signer)
    await factory.deploy(
      avatarAddress,
      stakeTokenAddress,
      requestTokenAddress,
      isTestModule ? 8999599 : 9999599,
      100000 * sliderValue,
      20000,
      '200000000000000000',
    )
  }, [avatarAddress, connectedWallets, isTestModule, requestTokenAddress, sliderValue, stakeTokenAddress])

  function handleChangeAvatarAddress(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>): void {
    setAvatarAddress(event.target.value)
  }

  function handleChangeStakeTokenAddress(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>): void {
    throw new Error('Function not implemented.')
  }

  return (
    <div style={{ paddingBottom: '50px' }}>
      <TextField
        variant="outlined"
        color="secondary"
        fullWidth
        value={props.avatarAddress}
        onChange={(event) => handleChangeAvatarAddress(event)}
        name={'Safe Address'}
        label={'Safe Address'}
        InputProps={{
          endAdornment: (
            <span style={{ paddingLeft: '5px' }}>
              <Icon size="md" type="safe" />
            </span>
          ),
        }}
      ></TextField>
      <br />
      <br />
      <TextField
        variant="outlined"
        color="secondary"
        fullWidth
        value={stakeTokenAddress}
        onChange={(event) => setStakeTokenAddress(event.target.value)}
        name={'Stake Token Address'}
        label={'Stake Token Address'}
        InputProps={{
          endAdornment: (
            <span style={{ paddingLeft: '5px' }}>
              <Icon size="md" type="paymentToken" />
            </span>
          ),
        }}
      ></TextField>
      <br />
      <br />
      <Switch checked={isAdvanced} onChange={setIsAdvanced} />
      <Text className={styles.switchHelpText} size="lg">
        Expert Mode
      </Text>
      <br />
      {isAdvanced && (
        <div>
          <br />
          <Select
            fullWidth
            name="tokenSelector"
            label="Select Request Token"
            items={[...tokenData['0x1'], { id: '99', label: 'Add Token' }]}
            activeItemId={activeItemId}
            onItemClick={(id) => {
              setActiveItemId(id)
              if (id === '99') setIsRequestTokenCustom(true)
              else setIsRequestTokenCustom(false)
            }}
            fallbackImage={'https://via.placeholder.com/32x32'} // image source or URL
          />
          {isRequestTokenCustom && (
            <div>
              <br />
              <TextField
                variant="outlined"
                color="secondary"
                fullWidth
                value={requestTokenAddress}
                onChange={(event) => setRequestTokenAddress(event.target.value)}
                name={'Module Address'}
                label={'Request Token Address'}
                InputProps={{
                  endAdornment: (
                    <span style={{ paddingLeft: '5px' }}>
                      <Icon size="md" type="paymentToken" />
                    </span>
                  ),
                }}
              />
            </div>
          )}
          <br />
          <br />
          <div>
            <Text className={styles.maxRequestContainer} size="xl">
              Maximum Request %
            </Text>
            <Tooltip
              arrow
              placement="top"
              title="This is the maximum that a proposal may get through this module. Expressed as a percentage of the Safe's balance. "
            >
              <span style={{ marginLeft: '5px', verticalAlign: 'middle' }}>
                <Icon size="md" type="info" />
              </span>
            </Tooltip>
            <Slider
              onChange={(e, value) => {
                if (typeof value === 'number') setSliderValue(value)
              }}
              value={sliderValue}
              valueLabelDisplay="auto"
              className={styles.slider}
            />
          </div>

          <br />
          <Text className={styles.switchHelpText} size="lg">
            Fast
          </Text>
          <Switch checked={isTestModule} onChange={setIsTestModule} />
          {isTestModule && (
            <Text className={styles.switchHelpTextFooter} size="md">
              {' '}
              Sets a faster decay for testing. Faster decay is not recommended for Mainnet.
            </Text>
          )}
        </div>
      )}

      <br />
      <div style={{ float: 'right' }}>
        <WriteButtonWrapper callback={callback}>
          <Button
            className={styles.createButton}
            size="lg"
            variant="contained"
            color="primary"
            onClick={async () => deployModule()}
          >
            Create
          </Button>
        </WriteButtonWrapper>
      </div>
    </div>
  )
}

export default DeployModuleModal

const useStyles = makeStyles(() => ({
  createButton: {
    '&.MuiButton-root': {
      backgroundColor: theme.colors.pending + ' !important',
    },
    '&.MuiButton-root:hover': {
      filter: 'brightness(85%)',
    },
  },
  switchHelpText: {
    color: theme.colors.placeHolder + ' !important',
    display: 'inline-block',
  },
  switchHelpTextFooter: {
    color: theme.colors.error + ' !important',
  },
  maxRequestContainer: {
    display: 'inline-block',
    color: theme.colors.placeHolder + ' !important',
  },
  maxRequestHelpText: {
    color: theme.colors.placeHolder + ' !important',
  },
  slider: {
    '& .MuiSlider-thumb': {
      color: theme.colors.primary + ' !important',
      height: '20px',
      width: '20px',
    },
    '& .MuiSlider-root': {
      height: '10px',
    },
    '& .MuiSlider-track': {
      color: theme.colors.primary + ' !important',
      height: '10px',
    },
    '& .MuiSlider-rail': {
      height: '10px',
      color: theme.colors.primary + ' !important',
    },
  },
}))
