import { Chain } from "viem"

export type HWConfig = {
    [chainId: number]: {
        chain: Chain
        rpcEnv: string
        hardworker: `0x${string}`
        vaultManager: `0x${string}`
    }
}
