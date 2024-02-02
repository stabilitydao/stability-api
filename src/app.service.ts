import { Injectable, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AggSwapData, MainReply, Underlyings } from './api.types';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { config, UNDERLYING_API_DATA_CACHE_TIME, UNDERLYING_ADDRESSES_CACHE_TIME } from './config'
import { createPublicClient, http } from 'viem';
import IVaultManager from './abi/IVaultManager';
import IVault from "./abi/IVault";
import IStrategy from "./abi/IStrategy";

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly httpService: HttpService,
    private configService: ConfigService
  ) {}

  checkConfig(): boolean {
    // check RPCs
    for (let chainId in config) {
      const chainConfig = config[chainId]
      const rpc = this.configService.get<string>(chainConfig.rpcEnv);
      if (!rpc) {
          this.logger.error(`Put ${chainConfig.rpcEnv} to .env`);
          return false
      }
      return true
    }
  }

  async getAggSwap(chainId: number, src: string, dst: string, amountIn: string): Promise<AggSwapData[]> {
    const r: AggSwapData[] = []

    // 1inch
    const apiKey = this.configService.get<string>('ONE_INCH_API');
    const config = {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      params: {
        src,
        dst,
        amount: amountIn,
        slippage: "5",
        disableEstimate: "true",
        from: '0x0000000000000000000000000000000000000000',
      },
    };  

    const inchReply = await firstValueFrom(this.httpService.get(`https://api.1inch.dev/swap/v5.2/${chainId}/swap`, config))
    if (inchReply && inchReply.data && inchReply.data.toAmount) {
      r.push({
        router: inchReply.data.tx.to,
        src,
        dst,
        amountIn,
        amountOut: inchReply.data.toAmount,
        txData: inchReply.data.tx.data,

      })
    }
    // console.log('r', inchReply.data)

    return r
  }

  async getAll(): Promise<MainReply> {
    const underlyings: Underlyings = {}
    const chainId = 137
    underlyings[chainId] = {}

    // Gamma API data for Polygon
    let key = 'UNDERLYING_POYGON_GAMMA_QUICKSWAP'
    let data: any = await this.cacheManager.get(key);
    // console.log('cache data', data)
    if (!data) {
      const gammaApi = 'https://wire2.gamma.xyz/quickswap/polygon/hypervisors/allData'
      const r = await firstValueFrom(this.httpService.get(gammaApi))
      if (r.data) {
        data = r.data
        await this.cacheManager.set(key, data, UNDERLYING_API_DATA_CACHE_TIME);
      }
    }
    if (data) {
      const addrs = Object.keys(data)
      for (const addr of addrs) {
        const uData: any = data[addr]
        // console.log(uData)
        const u = {
          address: addr,
          name: uData?.name,
          apr: {
            daily: uData?.returns?.daily?.feeApr ? 100 * uData?.returns?.daily?.feeApr : 0,
            monthly: uData?.returns?.daily?.feeApr ? 100 * uData?.returns?.daily?.feeApr : 0,
            allTime: uData?.returns?.allTime?.feeApr ? 100 * uData?.returns?.allTime?.feeApr : 0,
            status: uData?.returns?.status,
          },
          provider: 'Gamma API',
        } 
        underlyings[chainId][addr] = u
      }
    }

    // DefiEdge API data for Polygon
    let defiEdgeStrategyUnderlying: `0x${string}`[] = []
    key = 'DEFIEDGE_UNDERLYINGS'
    data = await this.cacheManager.get(key);
    if (!data) {
      const chainConfig = config[chainId]
      const rpc = this.configService.get<string>(chainConfig.rpcEnv);
      const publicClient = createPublicClient({ 
        transport: http(rpc)
      })
      try {
        const vaultsData = await publicClient.readContract({
            address: chainConfig.vaultManager,
            abi: IVaultManager,
            functionName: "vaults",
        });

        for (let i = 0; i < vaultsData[0].length; i++) {
          const strategyName = vaultsData[4][i]
          if (strategyName !== 'DefiEdge QuickSwap Merkl Farm') {
            continue
          }
          const vaultAddress = vaultsData[0][i]
          // get strategy address
          const strategyAddress = await publicClient.readContract({
            address: vaultAddress,
            abi: IVault,
            functionName: "strategy",
          }) as `0x${string}`
          // get underlying
          const underlyingAddress = await publicClient.readContract({
            address: strategyAddress,
            abi: IStrategy,
            functionName: "underlying",
          }) as `0x${string}`

          defiEdgeStrategyUnderlying.push(underlyingAddress)
        }
      } catch {
        this.logger.error('API service failed during reading contracts')
        return {
          title: 'Stability Platform API',
          error: 'API service failed during reading contracts',
          underlyings,
        };
      }
      if (defiEdgeStrategyUnderlying.length > 0) {
        data = defiEdgeStrategyUnderlying
        await this.cacheManager.set(key, data, UNDERLYING_ADDRESSES_CACHE_TIME);
      }
    }
    if (data) {
      defiEdgeStrategyUnderlying = data
    }
    
    key = 'UNDERLYING_POYGON_DEFIEDGE'
    data = await this.cacheManager.get(key);
    if (!data) {
      const defiedgeData = []
      const defiEdgeApi = 'https://api.defiedge.io/graphql'
      for (const underlying of defiEdgeStrategyUnderlying) {
        const r = await firstValueFrom(this.httpService.post(defiEdgeApi, {
          operationName: "strategyMetadata",
          variables: {
            network: "polygon",
            address: underlying.toLowerCase(),
          },
          query: "query strategyMetadata($address: String!, $network: Network!) {\n  strategy(where: {network_address: {address: $address, network: $network}}) {\n    id\n    address\n    apr24Hour\n    apr7Day\n    archived\n    aum\n    autoRebalance\n    createdAt\n    dataFeed\n    description\n    dex\n    fees_apr_usd\n    isArchived: archived\n    logo\n    network\n    one_day_apy_usd\n    poolAddress\n    private\n    seven_day_apy_usd\n    sharePrice\n    since_inception_usd\n    subTitle\n    title\n    transactionHash\n    updatedAt\n    verified\n    webhook\n    whitelistedAddresses\n    __typename\n  }\n}",
        }))
        if (r.data) {
          defiedgeData.push(r.data)
        }
      }
      data = defiedgeData
      await this.cacheManager.set(key, data, UNDERLYING_API_DATA_CACHE_TIME);
    }

    if (data) {
      for (const dataItem of data) {
        if (dataItem && dataItem.data && dataItem.data.strategy) {
          // console.log(uData.data.strategy)
          const uData = dataItem.data.strategy
          const u = {
            address: uData.address,
            name: uData.title,
            apr: {
              daily: uData.apr24Hour,
              weekly: uData.apr7Day,
              // monthly: uData?.returns?.daily,
              // allTime: uData?.returns?.allTime,
              // status: uData?.returns?.status,
            },
            provider: 'DefiEdge API',
          } 
          underlyings[chainId][uData.address] = u
        }
      }
    }
    
    return {
      title: 'Stability Platform API',
      underlyings,
    };
  }

}
