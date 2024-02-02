export type MainReply = {
    title: string
    underlyings: Underlyings
    error?: string
}

export type AggSwapData = {
    router: string
    src: string
    dst: string
    amountIn: string
    amountOut: string
    txData: string
}

export type Underlyings = {
    [chainId: number]: {
        [addr:string]: Underlying
    }
}

export type Underlying = {
    address: string
    name?: string
    apr: {
        daily?: number
        monthly?: number
        allTime?: number
        status?: string
    },
}
