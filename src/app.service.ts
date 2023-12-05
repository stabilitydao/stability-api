import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AggSwapData, MainReply, Underlyings } from './api.types';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly httpService: HttpService,
    private configService: ConfigService
  ) {}

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

    const key = 'UNDERLYING_POYGON_GAMMA_QUICKSWAP'
    const chainId = 137
    let data: any = await this.cacheManager.get(key);
    underlyings[chainId] = {}
    // console.log('cache data', data)
    if (!data) {
      const gammaApi = 'https://wire2.gamma.xyz/quickswap/polygon/hypervisors/allData'
      const r = await firstValueFrom(this.httpService.get(gammaApi))
      if (r.data) {
        data = r.data
        await this.cacheManager.set(key, data, 600 * 1000);
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
            daily: uData?.returns?.daily,
            monthly: uData?.returns?.daily,
            allTime: uData?.returns?.allTime,
            status: uData?.returns?.status,
          }
        } 
        underlyings[chainId][addr] = u      
      }
    }
    
    return {
      title: 'Stability Platform API',
      underlyings,
    };
  }

}
