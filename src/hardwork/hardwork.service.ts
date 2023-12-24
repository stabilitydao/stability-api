import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HWConfig } from './hardwork.types';
import { createPublicClient, createWalletClient, http, decodeFunctionData, parseUnits, BaseError, ContractFunctionRevertedError } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import IHardWorker from "../abi/IHardWorker";
import IVaultManager from "../abi/IVaultManager";
import { polygon } from 'viem/chains'

@Injectable()
export class HardWorkService {
    private readonly logger = new Logger(HardWorkService.name);
    private readonly config: HWConfig = {
        137: {
            chain: polygon,
            rpcEnv: 'RPC_POLYGON',
            hardworker: '0x6DBFfd2846d4a556349a3bc53297700d89a94034',
            vaultManager: '0x6008b366058B42792A2497972A3312274DC5e1A8',
        },
    }
    private jobIsRunning = false;
    
    constructor(
        private configService: ConfigService
    ) {}

    checkConfig(): boolean {
        // check private key
        const privateKey = this.configService.get<`0x${string}`>("DEDICATED_HARDWORKER_PRIVATE_KEY");
        if (!privateKey) {
            this.logger.error(`Put DEDICATED_HARDWORKER_PRIVATE_KEY to .env`)
            return false
        }

        // check RPCs
        for (let chainId in this.config) {
            const chainConfig = this.config[chainId]
            const rpc = this.configService.get<string>(chainConfig.rpcEnv);
            if (!rpc) {
                this.logger.error(`Put ${chainConfig.rpcEnv} to .env`);
                return false
            }
        }
        this.logger.log(`HardWork resolver initialized for chains ${Object.keys(this.config).map(c => `[${c}] ${this.config[c].chain.name}`).join(', ')}`)
        return true
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async handleCron() {
        if (this.jobIsRunning) {
            this.logger.warn('The previous job is still running');
            return
        }

        this.jobIsRunning = true
        const account = privateKeyToAccount(this.configService.get<`0x${string}`>("DEDICATED_HARDWORKER_PRIVATE_KEY")) 

        for (let chainId in this.config) {
            const chainConfig = this.config[chainId]
            const rpc = this.configService.get<string>(chainConfig.rpcEnv);

            const publicClient = createPublicClient({ 
                transport: http(rpc)
            })
            const walletClient = createWalletClient({
                account,
                transport: http(rpc)
            })

            const vaultsData = await publicClient.readContract({
                address: chainConfig.vaultManager,
                abi: IVaultManager,
                functionName: "vaults",
            });

            const vaultTvls: {[vaultAddr:string]: bigint} = {}
            for (let i = 0; i < vaultsData[0].length; i++) {
                vaultTvls[vaultsData[0][i]] = vaultsData[6][i]
            }
            
            const hwData = await publicClient.readContract({
                address: chainConfig.hardworker,
                abi: IHardWorker,
                functionName: "checkerServer",
            });
            if (hwData && hwData[0]) {
                const { args } = decodeFunctionData({
                    abi: IHardWorker,
                    data: hwData[1]
                })
                const vaults = (args[0] as string[]).filter(v => vaultTvls[v] > parseUnits('100', 18))

                if (vaults.length > 0) {
                    this.logger.debug(`Vaults for HardWork: ${vaults.length}`)
                
                    try {
                        const { request } = await publicClient.simulateContract({
                            chain: polygon,
                            address: chainConfig.hardworker,
                            abi: IHardWorker,
                            functionName: 'call',
                            account,
                            args: [vaults,],
                            gas: 15_000_000n,
                            // gasPrice: parseGwei('150')
                        })
                        const hash = await walletClient.writeContract(request)
                        const transaction = await publicClient.waitForTransactionReceipt( 
                            { hash }
                        )
                        if (transaction.status == 'success') {
                            this.logger.log('HardWorker success')
                        } else {
                            this.logger.error('Tx failed')
                        }
                    } catch (err) {
                        this.logger.error('HardWorker tx failed')
                        console.log(err)
                        if (err instanceof BaseError) {
                            const revertError = err.walk(err => err instanceof ContractFunctionRevertedError)
                            if (revertError instanceof ContractFunctionRevertedError) {
                                const errorName = revertError.data?.errorName ?? ''
                                this.logger.debug(errorName)
                            }
                        }
                        continue
                    }
                }
                
            }
        }
        this.jobIsRunning = false
    }
}
