import { useWallets } from '@web3-onboard/react'
import React from 'react'
import { WalletButton } from './ChainSelector'

const WriteButtonWrapper = (props: { children: React.ReactElement, callback?: () => void }): React.ReactElement => {
  const wallets = useWallets()

  if (wallets.length > 0) return <>{props.children}</>
  else return <WalletButton callback={props.callback}/>
}

export default WriteButtonWrapper
