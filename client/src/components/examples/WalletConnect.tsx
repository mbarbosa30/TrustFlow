import { WalletConnect } from '../WalletConnect'

export default function WalletConnectExample() {
  return (
    <WalletConnect
      onConnect={(address) => console.log('Connected:', address)}
    />
  )
}
