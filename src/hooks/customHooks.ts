import { useEffect, useState } from 'react'
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk'

export function useSafeAddress() {
  const { connected, sdk, safe } = useSafeAppsSDK()
  const [connectedAddress, setConnectedAddress] = useState<string>('')
  const [isSafeAddress, setIsSafeAddress] = useState(false)

  useEffect(() => {
    async function fetchConnectedAddress() {
      if (connected) {
        setConnectedAddress(safe.safeAddress)
        setIsSafeAddress(true)
        return
      }
    }

    fetchConnectedAddress()
  }, [connected, safe.safeAddress])

  return { connectedAddress, isSafeAddress }
}
