import { Chain, parseUnits } from "viem"
import { polygon } from 'viem/chains'

export type Config = {
    [chainId: number]: {
        chain: Chain
        rpcEnv: string
        hardworker: `0x${string}`
        vaultManager: `0x${string}`
        merklDistributor?: `0x${string}`
    }
}

export const config = {
    137: {
        chain: polygon,
        rpcEnv: 'RPC_POLYGON',
        hardworker: '0x6DBFfd2846d4a556349a3bc53297700d89a94034',
        vaultManager: <`0x${string}`>'0x6008b366058B42792A2497972A3312274DC5e1A8',
        merklDistributor: '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae',
    },
}

export const merklStrategies = [
    'DefiEdge QuickSwap Merkl Farm',
    'Ichi QuickSwap Merkl Farm',
]

export const minTvlForMerklClaim = parseUnits('100', 18)

export const UNDERLYING_API_DATA_CACHE_TIME = 600 * 1000
export const UNDERLYING_ADDRESSES_CACHE_TIME = 600 * 1000
