import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createPublicClient, createWalletClient, http, decodeFunctionData, parseUnits, BaseError, ContractFunctionRevertedError } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import IHardWorker from "../abi/IHardWorker";
import IVaultManager from "../abi/IVaultManager";
import { polygon } from 'viem/chains'
import { config, merklStrategies } from '../config'

@Injectable()
export class HardWorkService {
    private readonly logger = new Logger(HardWorkService.name);
    private serviceEnabled = false
    private jobIsRunning = false;
    
    constructor(
        private configService: ConfigService
    ) {}

    checkConfig(): boolean {
        // check if this service enabled
        const serviceEnabled = this.configService.get<string>("HARDWORKER_ENABLED")
        if (serviceEnabled !== 'true') {
            this.logger.warn(`HardWorker disabled`)
            return true
        }
        
        this.serviceEnabled = true
         
        // check private key
        const privateKey = this.configService.get<`0x${string}`>("DEDICATED_HARDWORKER_PRIVATE_KEY");
        if (!privateKey) {
            this.logger.error(`Put DEDICATED_HARDWORKER_PRIVATE_KEY to .env`)
            return false
        }

        // check RPCs
        for (let chainId in config) {
            const chainConfig = config[chainId]
            const rpc = this.configService.get<string>(chainConfig.rpcEnv);
            if (!rpc) {
                this.logger.error(`Put ${chainConfig.rpcEnv} to .env`);
                return false
            }
        }
        this.logger.log(`HardWork resolver initialized for chains ${Object.keys(config).map(c => `[${c}] ${config[c].chain.name}`).join(', ')}`)
        return true
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async handleCron() {
        if (!this.serviceEnabled) {
            return
        }

        if (this.jobIsRunning) {
            this.logger.warn('The previous job is still running');
            return
        }

        this.jobIsRunning = true
        const account = privateKeyToAccount(this.configService.get<`0x${string}`>("DEDICATED_HARDWORKER_PRIVATE_KEY")) 

        for (let chainId in config) {
            const chainConfig = config[chainId]
            const rpc = this.configService.get<string>(chainConfig.rpcEnv);

            const publicClient = createPublicClient({ 
                transport: http(rpc)
            })
            const walletClient = createWalletClient({
                account,
                transport: http(rpc)
            })

            let hwData
            const vaultsImportantData: {[vaultAddr:string]: {
                tvl: bigint,
                strategyName: string,
            }} = {}
            // read contracts
            try {
                const vaultsData = await publicClient.readContract({
                    address: chainConfig.vaultManager,
                    abi: IVaultManager,
                    functionName: "vaults",
                });
    
                for (let i = 0; i < vaultsData[0].length; i++) {
                    vaultsImportantData[vaultsData[0][i]] = {
                        tvl: vaultsData[6][i],
                        strategyName: vaultsData[4][i],
                    }
                }
                
                hwData = await publicClient.readContract({
                    address: chainConfig.hardworker,
                    abi: IHardWorker,
                    functionName: "checkerServer",
                });
            } catch {
                this.logger.error('HardWorker failed during reading contracts')
                continue
            }
            
            if (hwData && hwData[0]) {
                const { args } = decodeFunctionData({
                    abi: IHardWorker,
                    data: hwData[1]
                })
                const vaults = (args[0] as string[])
                    .filter(v => vaultsImportantData[v].tvl > parseUnits('100', 18))
                    .filter(v => !merklStrategies.includes(vaultsImportantData[v].strategyName))

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
                        const transaction = await publicClient.waitForTransactionReceipt({ 
                                hash,
                                timeout: 180_000,
                        })
                        if (transaction.status == 'success') {
                            this.logger.log('HardWorker success')
                        } else {
                            this.logger.error('Tx failed')
                        }
                    } catch (err) {
                        this.logger.error('HardWorker tx failed')
                        
                        if (err instanceof BaseError) {
                            const revertError = err.walk(err => err instanceof ContractFunctionRevertedError)
                            if (revertError instanceof ContractFunctionRevertedError) {
                                const errorName = revertError.data?.errorName ?? ''
                                this.logger.debug(errorName)
                            }
                        } else {
                            console.log(err)
                        }
                        continue
                    }
                }
                
            }
        }
        this.jobIsRunning = false
    }
}
