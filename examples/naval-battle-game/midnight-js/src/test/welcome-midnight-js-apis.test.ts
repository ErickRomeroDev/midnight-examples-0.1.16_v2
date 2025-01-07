import { describe, beforeAll, afterAll, beforeEach, test, jest } from '@jest/globals';
import { webcrypto } from 'node:crypto';
import { AppProviders, NavalBattleGameProviders } from '../api/common-types';
import { Logger } from 'pino';
import type { Resource } from '../helpers';
import { createLogger } from './logger-utils';
import path from 'node:path';
import * as Rx from 'rxjs';
import { initializeWelcome } from './initialize-welcome';
import { getNavalBattleGamePrivateState, NavalBattleGameMidnightJSAPI, playerOnePk } from '../api/welcome-midnight-js-apis';
import { ActionHistory, ActionId, AsyncAction, AsyncActionStates, PlayerGameState } from '../types';
import { WebSocket } from 'ws';
import { NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { withNewEphemeralStateProvider, withNewProviders } from './initialize-providers';
import type { TestLedger, TestOrganizerWelcomeState } from './test-states';
import { createTestLedgerState, setsEqual, testLedgerStatesEqual, testOrganizerWelcomeStatesEqual } from './test-states';
import {
  ledger,
  Ledger,
} from '@midnight-ntwrk/naval-battle-game-contract';
import { ContractStateObservableConfig } from '@midnight-ntwrk/midnight-js-types';
import { ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { randomInt } from 'crypto';
import { TransactionId } from '@midnight-ntwrk/ledger';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';

// @ts-ignore: It's needed to make Scala.js and WASM code able to use cryptography
globalThis.crypto = webcrypto;

// @ts-ignore: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

setNetworkId(NetworkId.Undeployed);

//Yes, with proving, consensus, etc. longer scenarios take a lot of time
jest.setTimeout(600_000_000);

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const waitFor = <T>(state$: Rx.Observable<T>, predicate: (t: T) => boolean): Promise<T> =>
  Rx.firstValueFrom(state$.pipe(Rx.filter(predicate), Rx.take(1)));

const waitForCompletion = <S extends { actions: ActionHistory }>(state$: Rx.Observable<S>, actionId: ActionId): Promise<S> => {
  return waitFor(
    state$.pipe(
      Rx.map((state) => {
        const foundError = Object.values(state.actions.all).find(
          (action): action is AsyncAction & { status: 'error' } => action.status === AsyncActionStates.error,
        );
        if (foundError) {
          throw new Error(foundError.error);
        } else {
          return state;
        }
      }),
    ),
    (state) => state.actions.all[actionId].status !== AsyncActionStates.inProgress,
  );
};

type TeardownLogic = () => Promise<void>;

export const expectStates = <A extends object, E extends object>(
  actual$: Rx.Observable<A>,
  expected$: E[],
  equals: (s: A, t: E) => boolean,
): (() => void) => {
  const extraStates: A[] = [];
  const sub = actual$.subscribe({
    next(actual) {
      if (expected$.length === 0) {
        extraStates.push(actual);
      } else {
        const expected = expected$.shift()!;
        if (!equals(actual, expected)) {
          throw new Error(
            `Expected states to be equal.\nActual state: ${JSON.stringify(actual)}\nExpected state: ${JSON.stringify(expected)}`,
          );
        }
      }
    },
  });
  return () => {
    if (extraStates.length > 0) {
      throw new Error(`Extra states: \n${extraStates.map((extra) => JSON.stringify(extra)).join('\n')}`);
    }
    sub.unsubscribe();
  };
};

const expectLedgerStates = (actual$: Rx.Observable<Ledger>, expected: TestLedger[]) =>
  expectStates(actual$, expected, testLedgerStatesEqual);

const expectOrganizerWelcomeStates = (actual$: Rx.Observable<PlayerGameState>, expected: TestOrganizerWelcomeState[]) =>
  expectStates(actual$, expected, testOrganizerWelcomeStatesEqual);

export const runWelcomeTests = (logger: Logger, providersResource: Resource<[NavalBattleGameProviders, AppProviders]>) => {
  describe('contractStateObservable', () => {
    let providers: NavalBattleGameProviders;
    let appProviders: AppProviders;
    let teardownLogic: TeardownLogic;
    beforeAll(async () => {
      const { value, teardown } = await providersResource.allocate();
      [providers, appProviders] = value;
      teardownLogic = teardown;
    });
    beforeEach(async () => {
      const currentTest = expect.getState();
      [providers, appProviders] = await withNewProviders(currentTest.currentTestName ?? 'undefined', providers, appProviders);
    });
    afterAll(async () => {
      await teardownLogic();
    });
    test("'watchForDeployTxData' should work for deploy tx submission", async () => {
      const api = await NavalBattleGameMidnightJSAPI.deploy(providers, appProviders);
      const actual = await providers.publicDataProvider.watchForDeployTxData(api.contractAddress);
      const expected = {
        ...api.finalizedDeployTxData,
        tx: expect.anything(), // Ignore the newly added `tx` property for the moment
      };
      console.log({ actual, expected });
      logger.info({ actual, expected });

      return expect(actual).toMatchObject(expected);
    });
    test("'watchForTxData' should work for call tx submission", async () => {
      const api = await NavalBattleGameMidnightJSAPI.deploy(providers, appProviders);

      const action = await api.commitGrid([1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]);
      await waitForCompletion(api.state$, action);

      const actual = await providers.publicDataProvider
        .watchForContractState(api.contractAddress)
        .then((contractState) => ledger(contractState.data));
      console.log({ committed: actual.playerOneHasCommitted });

      const [joinedPlayerProviders, joinedPlayerAppProviders] = await withNewProviders('player2', providers, appProviders);

      const joinedOrganizerAPI = await NavalBattleGameMidnightJSAPI.join(
        joinedPlayerProviders,
        joinedPlayerAppProviders,
        api.contractAddress,
      );
      logger.info({ api });
      logger.info({ joinedOrganizerAPI });

      const preAction = await joinedOrganizerAPI.joinGame();
      await waitForCompletion(joinedOrganizerAPI.state$, preAction);      

      const stateAfterJoin = await providers.publicDataProvider
        .watchForContractState(api.contractAddress)
        .then((contractState) => ledger(contractState.data));
      logger.info({ stateAfterJoin });

      logger.info({ player2PK: joinedOrganizerAPI.publicKey });

      const commitAction = await joinedOrganizerAPI.commitGrid([1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]);
      await waitForCompletion(joinedOrganizerAPI.state$, commitAction);      

      const stateAfterCommit = await providers.publicDataProvider
        .watchForContractState(api.contractAddress)
        .then((contractState) => ledger(contractState.data));
      logger.info({ stateAfterCommit });

      const startGameAction = await joinedOrganizerAPI.startGame();
      await waitForCompletion(joinedOrganizerAPI.state$, startGameAction);
      const stateAfterStartGame = await providers.publicDataProvider
        .watchForContractState(api.contractAddress)
        .then((contractState) => ledger(contractState.data));
      logger.info({ stateAfterStartGame });

      const player1Mov1Action = await api.makeMove(1n);
      await waitForCompletion(api.state$, player1Mov1Action);
      const stateAfterplayer1Mov1 = await providers.publicDataProvider
        .watchForContractState(api.contractAddress)
        .then((contractState) => ledger(contractState.data));
      logger.info({ stateAfterplayer1Mov1 });

      const player2Mov1Action = await joinedOrganizerAPI.makeMove(30n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov1Action);
      
      const player1Mov2Action = await api.makeMove(2n);
      await waitForCompletion(api.state$, player1Mov2Action);
      const player2Mov2Action = await joinedOrganizerAPI.makeMove(1n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov2Action);

      const player1Mov3Action = await api.makeMove(3n);
      await waitForCompletion(api.state$, player1Mov3Action);
      const player2Mov3Action = await joinedOrganizerAPI.makeMove(2n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov3Action);

      const player1Mov4Action = await api.makeMove(4n);
      await waitForCompletion(api.state$, player1Mov4Action);
      const player2Mov4Action = await joinedOrganizerAPI.makeMove(3n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov4Action);

      const player1Mov5Action = await api.makeMove(5n);
      await waitForCompletion(api.state$, player1Mov5Action);
      const player2Mov5Action = await joinedOrganizerAPI.makeMove(4n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov5Action);

      const player1Mov6Action = await api.makeMove(6n);
      await waitForCompletion(api.state$, player1Mov6Action);
      const player2Mov6Action = await joinedOrganizerAPI.makeMove(5n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov6Action);

      const player1Mov7Action = await api.makeMove(7n);
      await waitForCompletion(api.state$, player1Mov7Action);
      const player2Mov7Action = await joinedOrganizerAPI.makeMove(6n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov7Action);

      const player1Mov8Action = await api.makeMove(8n);
      await waitForCompletion(api.state$, player1Mov8Action);
      const player2Mov8Action = await joinedOrganizerAPI.makeMove(7n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov8Action);

      const player1Mov9Action = await api.makeMove(9n);
      await waitForCompletion(api.state$, player1Mov9Action);
      const player2Mov9Action = await joinedOrganizerAPI.makeMove(8n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov9Action);

      const player1Mov10Action = await api.makeMove(10n);
      await waitForCompletion(api.state$, player1Mov10Action);
      const player2Mov10Action = await joinedOrganizerAPI.makeMove(9n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov10Action);

      const player1Mov11Action = await api.makeMove(11n);
      await waitForCompletion(api.state$, player1Mov11Action);
      const player2Mov11Action = await joinedOrganizerAPI.makeMove(10n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov11Action);

      const player1Mov12Action = await api.makeMove(12n);
      await waitForCompletion(api.state$, player1Mov12Action);
      const player2Mov12Action = await joinedOrganizerAPI.makeMove(11n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov12Action);

      const player1Mov13Action = await api.makeMove(13n);
      await waitForCompletion(api.state$, player1Mov13Action);
      const player2Mov13Action = await joinedOrganizerAPI.makeMove(12n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov13Action);

      const player1Mov14Action = await api.makeMove(14n);
      await waitForCompletion(api.state$, player1Mov14Action);
      const player2Mov14Action = await joinedOrganizerAPI.makeMove(13n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov14Action);

      const player1Mov15Action = await api.makeMove(15n);
      await waitForCompletion(api.state$, player1Mov15Action);
      const player2Mov15Action = await joinedOrganizerAPI.makeMove(14n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov15Action);

      const player1Mov16Action = await api.makeMove(16n);
      await waitForCompletion(api.state$, player1Mov16Action);
      const player2Mov16Action = await joinedOrganizerAPI.makeMove(15n);
      await waitForCompletion(joinedOrganizerAPI.state$, player2Mov16Action);
      
      const stateAfterplayer2Mov16 = await providers.publicDataProvider
        .watchForContractState(api.contractAddress)
        .then((contractState) => ledger(contractState.data));
      logger.info({ stateAfterplayer2Mov16 });

    });
  });
};

const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');
const logDir = path.resolve(currentDir, '..', '..', 'logs', 'tests', `${new Date().toISOString()}.log`);
await createLogger(logDir).then((logger) => runWelcomeTests(logger, initializeWelcome(logger)));
