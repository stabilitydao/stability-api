import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createPublicClient, createWalletClient, http, BaseError, ContractFunctionRevertedError } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import IHardWorker from "../abi/IHardWorker";
import IVaultManager from "../abi/IVaultManager";
import IVault from "../abi/IVault";
import MerklDistributor from "../abi/MerklDistributor";
import { config, merklStrategies, minTvlForMerklClaim } from '../config'
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MerklService {
    private readonly logger = new Logger(MerklService.name);
    private serviceEnabled = false
    private jobIsRunning = false;
    private usedChains = [];

    constructor(
        private configService: ConfigService,
        private readonly httpService: HttpService,
    ) {}

    checkConfig(): boolean {
        // check if this service enabled
        const serviceEnabled = this.configService.get<string>("MERKL_HARDWORKER_ENABLED")
        if (serviceEnabled !== 'true') {
            this.logger.warn(`Merkl rewards claimer disabled`)
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
            if (chainConfig.merklDistributor) {
                this.usedChains.push(chainId)
            }
        }

        this.logger.log(`Merkl rewards claimer initialized for chains ${this.usedChains.map(c => `[${c}] ${config[c].chain.name}`).join(', ')}`)
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

        for (const chainId of this.usedChains) {
            const chainConfig = config[chainId]
            const rpc = this.configService.get<string>(chainConfig.rpcEnv);

            const publicClient = createPublicClient({ 
                transport: http(rpc)
            })
            const walletClient = createWalletClient({
                account,
                transport: http(rpc)
            })

            // get strategies for checking Merkl rewards
            const strategies: {
                strategyAddress: string,
                vaultAddress: string,
            }[] = []
            try {
                const vaultsData = await publicClient.readContract({
                    address: chainConfig.vaultManager,
                    abi: IVaultManager,
                    functionName: "vaults",
                })
    
                // console.log(vaultsData)
                for (let i = 0; i < vaultsData[0].length; i++) {
                    const vaultAddress = vaultsData[0][i]
                    const strategyName = vaultsData[4][i]
                    const vaultTvl = vaultsData[6][i]
                    if (!merklStrategies.includes(strategyName)) {
                        continue
                    }
                    if (vaultTvl < minTvlForMerklClaim) {
                        continue
                    }

                    // get strategy address
                    const strategyAddress = await publicClient.readContract({
                        address: vaultAddress,
                        abi: IVault,
                        functionName: "strategy",
                    }) as string

                    strategies.push({
                        strategyAddress,
                        vaultAddress,
                    })
                }
            } catch {
                this.logger.error('Merkl claimer failed during reading contracts for getting strategies')
                continue
            }

            // get txData for claim rewards
            // todo make 1 tx for all vaults
            const txArgs: {
                users: string[],
                tokens: string[],
                amounts: bigint[],
                proofs: string[][]
            }[] = []
            const vaultsForHardWork: string[] = []
            try {
                for (const strategy of strategies) {
                    const merklApiReply = await firstValueFrom(this.httpService.get(`https://api.angle.money/v2/merkl?chainIds[]=${chainId}&user=${strategy.strategyAddress}`, {}))
                    const replyData = merklApiReply.data[chainId]
                    if (!replyData) {
                        this.logger.error('Bad angle API reply');
                        continue
                    }

                    // find unclaimed rewards
                    let foundUnclaimed = false
                    for (const pool of Object.keys(replyData.pools)) {
                        if (Object.keys(replyData.pools[pool].rewardsPerToken).length > 0) {
                            for (const rewardToken of Object.keys(replyData.pools[pool].rewardsPerToken)) {
                                const rewardsPerToken = replyData.pools[pool].rewardsPerToken[rewardToken]

                                // console.log(rewardsPerToken)
                                const unclaimed = rewardsPerToken.unclaimed
                                if (unclaimed > 0) {
                                    this.logger.debug(`Found unclaimed rewards ${unclaimed} for strategy ${strategy.strategyAddress}`)
                                    foundUnclaimed = true
                                }
                            }
                        }
                    }

                    if (!foundUnclaimed) {
                        continue
                    }

                    if (replyData.transactionData) {
                        const data = replyData.transactionData
                        if (!Object.keys(data).length) {
                            continue
                        }
                        // console.log(data)

                        const tokens = Object.keys(data).filter((k) => data[k].proof !== undefined);
                        const users = tokens.map(() => strategy.strategyAddress)
                        const amounts = tokens.map(t => data[t].claim);
                        const proofs = tokens.map(t => data[t].proof);
                        // console.log('users', users)
                        // console.log('tokens', tokens)
                        // console.log('amounts', amounts)
                        // console.log('proofs', proofs)
                        txArgs.push({
                            users,
                            tokens,
                            amounts,
                            proofs,
                        })
                        if (!vaultsForHardWork.includes(strategy.vaultAddress)) {
                            vaultsForHardWork.push(strategy.vaultAddress)
                        }
                    }
                }
            } catch {
                this.logger.error('Merkl claimer failed during API requests')
                continue
            }

            if (txArgs.length > 0) {
                this.logger.debug(`Strategies for claim rewards: ${txArgs.length}`)

                try {
                    for (const txArg of txArgs) {
                        const { request } = await publicClient.simulateContract({
                            chain: chainConfig.chain,
                            address: chainConfig.merklDistributor,
                            abi: MerklDistributor,
                            functionName: 'claim',
                            account,
                            args: [txArg.users, txArg.tokens, txArg.amounts, txArg.proofs,],
                            gas: 15_000_000n,
                            // gasPrice: parseGwei('150')
                        })
                        const hash = await walletClient.writeContract(request)
                        const transaction = await publicClient.waitForTransactionReceipt({ 
                            hash,
                            timeout: 180_000,
                        })
                        if (transaction.status == 'success') {
                            this.logger.log('Claim success')
                        } else {
                            this.logger.error('Tx failed')
                        }
                        // console.log(request)
                    }
                } catch (err) {
                    this.logger.error('Claim tx failed')
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
                
                // hardwork
                this.logger.debug(`Vaults for HardWork: ${vaultsForHardWork.length}`)
                try {
                    const { request } = await publicClient.simulateContract({
                        chain: chainConfig.chain,
                        address: chainConfig.hardworker,
                        abi: IHardWorker,
                        functionName: 'call',
                        account,
                        args: [vaultsForHardWork,],
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
        this.jobIsRunning = false
    }

}
