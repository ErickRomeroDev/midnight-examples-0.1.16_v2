import { Logger } from 'pino';
import { AppProviders, NavalBattleGameCircuitKeys, NavalBattleGameProviders } from '../api/common-types';
import { EphemeralStateBloc } from '../api/ephemeral-state-bloc';
import { Config } from './initialize-welcome';
import { Resource, pipe } from '../helpers';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { SubscribablePrivateStateProviderDecorator } from '../api/private-state-decorator';
import { inMemoryPrivateStateProvider } from './in-memory-private-state-provider';
import { headlessWalletAndMidnightProvider } from './headless-wallet-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { webCryptoCryptography } from '../api/cryptography';
import { webcrypto } from 'node:crypto';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { TRANSACTION_TO_PROVE, Wallet } from '@midnight-ntwrk/wallet-api';
import * as Rx from 'rxjs';
import { createCoinInfo, nativeToken } from '@midnight-ntwrk/ledger';
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { TokenType } from '@midnight-ntwrk/compact-runtime';

const waitForFunds = (wallet: Wallet) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.map((s) => s.balances[nativeToken()] ?? 0n),
      Rx.filter((balance) => balance > 0n),
    ),
  );

export const initializeWallet = (
  { indexer, indexerWS, proofServer, node }: Config,
  logger: Logger,
  seed: string,
): Resource<Wallet> =>
  Resource.make(
    async () => {
      const wallet = await WalletBuilder.buildFromSeed(indexer, indexerWS, proofServer, node, seed, getZswapNetworkId(), 'warn');
      wallet.start();
      const state = await Rx.firstValueFrom(wallet.state());
      logger.info(`Wallet seed is: ${seed}`);
      logger.info(`Wallet address is: ${state.address}`);
      let balance = state.balances[nativeToken()];
      if (balance === undefined || balance === 0n) {
        logger.info(`Wallet balance is: 0`);
        logger.info(`Waiting to receive tokens...`);
        balance = await waitForFunds(wallet);
      }
      logger.info(`Wallet balance is: ${balance}`);

      const transferRecipe = await wallet.transferTransaction([
        {
          amount: 1000000000n,
          receiverAddress: '5feff6534cae3d59e03275b299f2cd052e02e2084cfd63c4fff2568971c1343e|0300aa6a2d2ed980354bc5f14d595e6b6d8bd740bb99e9115c167c357e2b52865cb808f54d5ce551b5d79df33bb3878baaba5aa8a1be4d510b88',
          type: nativeToken() // tDUST token type
        }
      ]);

      // function generateTokenType(): TokenType {
      //   const bytes = crypto.getRandomValues(new Uint8Array(35)); // Generate 35 random bytes
      //   return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''); // Convert to hex string
      // }
      // const coinInfo = createCoinInfo(generateTokenType(), 1n)
      // const balancedRecipe = await wallet.balanceTransaction(transferRecipe, coinInfo);

      const provenTransaction = await wallet.proveTransaction(transferRecipe);
      const submittedTransaction = await wallet.submitTransaction(provenTransaction);
      console.log('Transaction submitted', submittedTransaction);

      return wallet;
    },
    (wallet) => wallet.close(),
  );

export const initializeProviders = (logger: Logger, config: Config, seed: string): Resource<[NavalBattleGameProviders, AppProviders]> => {
  return pipe(
    EphemeralStateBloc.init(logger.child({ entity: 'ephemeral state provider' })),
    Resource.zip(initializeWallet(config, logger, seed)),
    Resource.mapAsync(async ([ephemeralStateBloc, wallet]) => {
      const midnightWalletProvider = await headlessWalletAndMidnightProvider(wallet);
      const publicDataProvider = indexerPublicDataProvider(config.indexer, config.indexerWS);
      const privateStateProvider = new SubscribablePrivateStateProviderDecorator(logger, inMemoryPrivateStateProvider());
      const zkConfigProvider = new NodeZkConfigProvider<NavalBattleGameCircuitKeys>(config.zkConfigPath);
      const proofProvider = httpClientProofProvider<NavalBattleGameCircuitKeys>(config.proofServer);
      logger.info('started providers');
      const welcomeProviders = {
        midnightProvider: midnightWalletProvider,
        walletProvider: midnightWalletProvider,
        publicDataProvider,
        privateStateProvider,
        zkConfigProvider,
        proofProvider,
      };
      const appProviders = {
        logger,
        ephemeralStateBloc,
        crypto: webCryptoCryptography(webcrypto as Crypto),
      };
      return [welcomeProviders, appProviders];
    }),
  );
};

export const withNewEphemeralStateProvider = async (name: string, appProviders: AppProviders): Promise<AppProviders> => {
  const newEphemeralStateBloc = await EphemeralStateBloc.init(
    appProviders.logger.child({ entity: `${name}-ephemeral-state-provider` }),
  )
    .allocate()
    .then((a) => a.value);
  return { ...appProviders, ephemeralStateBloc: newEphemeralStateBloc };
};

export const withNewPrivateStateProvider = (providers: NavalBattleGameProviders, appProviders: AppProviders): NavalBattleGameProviders => ({
  ...providers,
  privateStateProvider: new SubscribablePrivateStateProviderDecorator(appProviders.logger, inMemoryPrivateStateProvider()),
});

export const withNewProviders = async (
  name: string,
  providers: NavalBattleGameProviders,
  appProviders: AppProviders,
): Promise<[NavalBattleGameProviders, AppProviders]> => {
  return [withNewPrivateStateProvider(providers, appProviders), await withNewEphemeralStateProvider(name, appProviders)];
};
