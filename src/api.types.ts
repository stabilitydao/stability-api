export type MainReply = {
    title: string
    underlyings: Underlyings
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
