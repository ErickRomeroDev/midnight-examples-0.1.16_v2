import { describe, beforeAll, afterAll, beforeEach, test, jest } from '@jest/globals';
import { webcrypto } from 'node:crypto';
import { AppProviders, NavalBattleGameProviders } from '../api/common-types';
import { Logger } from 'pino';
import type { Resource } from '../helpers';
import { createLogger } from './logger-utils';
import path from 'node:path';
import * as Rx from 'rxjs';
import { initializeWelcome } from './initialize-welcome';
import { NavalBattleGameMidnightJSAPI, playerOnePk } from '../api/welcome-midnight-js-apis';
import { ActionHistory, ActionId, AsyncAction, AsyncActionStates, PlayerGameState } from '../types';
import { WebSocket } from 'ws';
import { NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { withNewEphemeralStateProvider, withNewProviders } from './initialize-providers';
import type { TestLedger, TestOrganizerWelcomeState } from './test-states';
import {
  createTestLedgerState,  
  setsEqual,
  testLedgerStatesEqual,
  testOrganizerWelcomeStatesEqual,
} from './test-states';
import { CellAssignment, ledger, Ledger } from '@midnight-ntwrk/naval-battle-game-contract';
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
jest.setTimeout(600_000);

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
      const playerPk = await playerOnePk(providers, appProviders);
      console.log({ playerPk }); 
      console.log({ api });  
      // const addAndyId = await api.commitGrid(playerPk, [CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, CellAssignment.ship, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      // await waitForCompletion(api.state$, addAndyId);
    });
    // const ledgerStatesEqual = (a: Ledger, b: Ledger): boolean =>
    //   setsEqual(new Set(a.eligibleParticipants), new Set(b.eligibleParticipants)) &&
    //   setsEqual(new Set(a.checkedInParticipants), new Set(b.checkedInParticipants)) &&
    //   setsEqual(new Set([...a.organizerPks].map(toHex)), new Set([...b.organizerPks].map(toHex)));
    // test("'watchForContractState' should work when watch begins after deploy", async () => {
    //   const api = await NavalBattleGameMidnightJSAPI.deploy(providers, appProviders);
    //   const actual = await providers.publicDataProvider
    //     .watchForContractState(api.contractAddress)
    //     .then((contractState) => ledger(contractState.data));
    //   const expected = api.initialLedgerState;
    //   return expect(ledgerStatesEqual(actual, expected)).toBe(true);
    // });
    // test("subscriptions to deployer 'state$' should start with the latest version of organizer welcome state", async () => {
    //   const api = await NavalBattleGameMidnightJSAPI.deploy(providers, appProviders, ['jim']);
    //   const addParticipantId0 = await api.addParticipant('andy');
    //   await waitForCompletion(api.state$, addParticipantId0);
    //   const addParticipantId1 = await api.addParticipant('thomas');
    //   await waitForCompletion(api.state$, addParticipantId1);
    //   const unsub = expectOrganizerWelcomeStates(api.state$, [
    //     createTestOrganizerWelcomeState(api.secretKey, api.publicKey, 'organizer', {
    //       action: 'add_participant',
    //       status: 'success',
    //     }),
    //   ]);
    //   // to ensure no lagging states arrive
    //   await sleep(10000);
    //   unsub();
    // });
    // test('organizers can join and rejoin without replaying the entire state history', async () => {
    //   const deployerAPI = await NavalBattleGameMidnightJSAPI.deploy(providers, appProviders);
    //   const addParticipantId = await deployerAPI.addParticipant('andy');
    //   await waitForCompletion(deployerAPI.state$, addParticipantId);
    //   const [joinedOrganizerProviders, joinedOrganizerAppProviders] = await withNewProviders(
    //     'joined-organizer',
    //     providers,
    //     appProviders,
    //   );
    //   const joinedOrganizerAPI = await NavalBattleGameMidnightJSAPI.join(
    //     joinedOrganizerProviders,
    //     joinedOrganizerAppProviders,
    //     deployerAPI.contractAddress,
    //   );
    //   const joinedOrganizerExpectedFirstState = createTestOrganizerWelcomeState(
    //     joinedOrganizerAPI.secretKey,
    //     joinedOrganizerAPI.publicKey,
    //     'spectator',
    //     null,
    //   );
    //   const joinedOrganizerExpectedSecondState = createTestOrganizerWelcomeState(
    //     joinedOrganizerAPI.secretKey,
    //     joinedOrganizerAPI.publicKey,
    //     'organizer',
    //     null,
    //   );
    //   const unsub0 = expectOrganizerWelcomeStates(joinedOrganizerAPI.state$, [
    //     joinedOrganizerExpectedFirstState,
    //     joinedOrganizerExpectedSecondState,
    //   ]);
    //   const addOrganizerId = await deployerAPI.addOrganizer(joinedOrganizerAPI.publicKey);
    //   await waitForCompletion(deployerAPI.state$, addOrganizerId);
    //   await sleep(10000);
    //   unsub0();
    //   // We create a new ephemeral state provider to simulate the user refreshing/revisiting the application web page.
    //   // This clears the action history.
    //   const rejoinedOrganizerAppProviders = await withNewEphemeralStateProvider(
    //     'rejoined-organizer',
    //     joinedOrganizerAppProviders,
    //   );
    //   const rejoinedOrganizerAPI = await NavalBattleGameMidnightJSAPI.join(
    //     joinedOrganizerProviders,
    //     rejoinedOrganizerAppProviders,
    //     deployerAPI.contractAddress,
    //   );
    //   const rejoinedOrganizerExpectedFirstState = createTestOrganizerWelcomeState(
    //     joinedOrganizerAPI.secretKey,
    //     joinedOrganizerAPI.publicKey,
    //     'organizer',
    //     null,
    //   );
    //   const unsub1 = expectOrganizerWelcomeStates(rejoinedOrganizerAPI.state$, [rejoinedOrganizerExpectedFirstState]);
    //   await sleep(10000);
    //   unsub1();
    //   const [participantProviders, participantAppProviders] = await withNewProviders(
    //     'joined-participant',
    //     providers,
    //     appProviders,
    //   );
    // });
    // const prettifyLedgerState = ({ organizerPks, eligibleParticipants, checkedInParticipants }: Ledger) => ({
    //   organizerPks: [...organizerPks].map(toHex),
    //   eligibleParticipants: [...eligibleParticipants],
    //   checkedInParticipants: [...checkedInParticipants],
    // });
    // const ledgerState$ =
    //   (providers: NavalBattleGameProviders, appProviders: AppProviders) =>
    //   (config: ContractStateObservableConfig) =>
    //   (contractAddress: ContractAddress): Rx.Observable<Ledger> => {
    //     const streamLogger = appProviders.logger.child({ entity: `ledgerState$-${randomInt(0, 1000)}` });
    //     return providers.publicDataProvider.contractStateObservable(contractAddress, config).pipe(
    //       Rx.map((contractState) => ledger(contractState.data)),
    //       Rx.distinctUntilChanged(ledgerStatesEqual),
    //       Rx.tap((ledgerState) => streamLogger.info(prettifyLedgerState(ledgerState))),
    //     );
    //   };
    // test("'contractStateObservable' with 'all' configuration should return all contract states", async () => {
    //   const deployerAPI = await NavalBattleGameMidnightJSAPI.deploy(providers, appProviders);
    //   const expected0 = createTestLedgerState([deployerAPI.publicKey], [], ['jim']);
    //   const expected1 = createTestLedgerState([deployerAPI.publicKey], [], ['jim', 'molly']);
    //   const expected2 = createTestLedgerState([deployerAPI.publicKey], ['molly'], ['jim', 'molly']);
    //   const unsub0 = expectLedgerStates(ledgerState$(providers, appProviders)({ type: 'all' })(deployerAPI.contractAddress), [
    //     expected0,
    //     expected1,
    //     expected2,
    //   ]);
    //   const addMollyId = await deployerAPI.addParticipant('molly');
    //   await waitForCompletion(deployerAPI.state$, addMollyId);
    //   const [participantProvider, participantAppProviders] = await withNewProviders('participant', providers, appProviders);
    //   const participantAPI = await NavalBattleGameMidnightJSAPI.join(
    //     participantProvider,
    //     participantAppProviders,
    //     deployerAPI.contractAddress,
    //   );
    //   const checkInId = await participantAPI.checkIn('molly');
    //   await waitForCompletion(participantAPI.state$, checkInId);
    //   await sleep(5000);
    //   unsub0();
    //   const unsub1 = expectLedgerStates(ledgerState$(providers, appProviders)({ type: 'all' })(deployerAPI.contractAddress), [
    //     expected0,
    //     expected1,
    //     expected2,
    //   ]);
    //   await sleep(5000);
    //   unsub1();
    // });
    // const actionIdToTxId = (actions: ActionHistory, actionId: ActionId): TransactionId => {
    //   const action = actions.all[actionId];
    //   if (action === undefined) {
    //     throw new Error(`Action ${actionId} is undefined`);
    //   }
    //   if (action.status === AsyncActionStates.success || action.status === AsyncActionStates.error) {
    //     if (action.finalizedTxData !== null) {
    //       return action.finalizedTxData.txId;
    //     }
    //   }
    //   throw new Error(`Action ${JSON.stringify(action)} does not have transaction data associated with it`);
    // };
    // test("'contractStateObservable' with 'txId' should work", async () => {
    //   const deployerAPI = await NavalBattleGameMidnightJSAPI.deploy(providers, appProviders);
    //   const addMollyId = await deployerAPI.addParticipant('molly');
    //   await waitForCompletion(deployerAPI.state$, addMollyId);
    //   const addAndyId = await deployerAPI.addParticipant('andy');
    //   await waitForCompletion(deployerAPI.state$, addAndyId);
    //   const expected0 = createTestLedgerState([deployerAPI.publicKey], [], ['jim', 'molly']);
    //   const expected1 = createTestLedgerState([deployerAPI.publicKey], [], ['jim', 'molly', 'andy']);
    //   const ephemeralState = await Rx.firstValueFrom(appProviders.ephemeralStateBloc.state$);
    //   const addMollyTxId = actionIdToTxId(ephemeralState.actions, addMollyId);
    //   const unsub0 = expectLedgerStates(
    //     ledgerState$(providers, appProviders)({ type: 'txId', txId: addMollyTxId, inclusive: true })(deployerAPI.contractAddress),
    //     [expected0, expected1],
    //   );
    //   await sleep(5000);
    //   unsub0();
    //   const unsub1 = expectLedgerStates(
    //     ledgerState$(providers, appProviders)({ type: 'txId', txId: addMollyTxId, inclusive: false })(
    //       deployerAPI.contractAddress,
    //     ),
    //     [expected1],
    //   );
    //   await sleep(5000);
    //   unsub1();
    // });
  });
};

const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');
const logDir = path.resolve(currentDir, '..', '..', 'logs', 'tests', `${new Date().toISOString()}.log`);
await createLogger(logDir).then((logger) => runWelcomeTests(logger, initializeWelcome(logger)));
