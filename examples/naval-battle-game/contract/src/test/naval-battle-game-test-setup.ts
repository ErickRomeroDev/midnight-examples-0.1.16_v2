import { Contract, Witnesses, Ledger, ledger, pureCircuits } from '../managed/naval-battle-game/contract/index.cjs';
import {
  createNavalBattleGameInitialPrivateState,    
  NavalBattlePrivateState,
  witnesses,
} from '../witnesses';
import * as crypto from 'node:crypto';
import {
  CircuitContext,
  CircuitResults,
  constructorContext,
  QueryContext,
  sampleContractAddress,
} from '@midnight-ntwrk/compact-runtime';

type NavalBattleGameContract = Contract<NavalBattlePrivateState, Witnesses<NavalBattlePrivateState>>;

export const randomSk = () => crypto.getRandomValues(Buffer.alloc(32));

export const randomNavalBattleGamePrivateState = () => createNavalBattleGameInitialPrivateState(randomSk());

export const toHex = (byteArray: Uint8Array): string => Buffer.from(byteArray).toString('hex');

// Adapted from the '@midnight/coracle-contract' tests
export class NavalBattleGameSimulator {
  readonly contract: NavalBattleGameContract;
  userPrivateStates: Record<string, NavalBattlePrivateState>;
  circuitContext: CircuitContext<NavalBattlePrivateState>;
  turnContext: CircuitContext<NavalBattlePrivateState>;
  updateUserPrivateState: (newPrivateState: NavalBattlePrivateState) => void;
  address: string;

  constructor(deployerName: string, deployerInitialPrivateState: NavalBattlePrivateState) {
    this.address = sampleContractAddress();
    this.contract = new Contract(witnesses);
    const playerOnePk = pureCircuits.public_key(deployerInitialPrivateState.secretKey);
  
    const { currentPrivateState, currentContractState, currentZswapLocalState } = this.contract.initialState(
      constructorContext(deployerInitialPrivateState, '0'.repeat(64)),
      playerOnePk, 
    );
    this.userPrivateStates = { [deployerName]: currentPrivateState };
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      originalState: currentContractState,
      transactionContext: new QueryContext(currentContractState.data, this.address),
    };
    this.turnContext = { ...this.circuitContext };
    this.updateUserPrivateState = (newPrivateState: NavalBattlePrivateState) => {
      this.userPrivateStates[deployerName] = newPrivateState;
    };
  }

  static gameDeploy(deployerName: string): NavalBattleGameSimulator {
    return new NavalBattleGameSimulator(deployerName, randomNavalBattleGamePrivateState());
  }

  private buildTurnContext(currentPrivateState: NavalBattlePrivateState): CircuitContext<NavalBattlePrivateState> {
    return {
      ...this.circuitContext,
      currentPrivateState,
    };
  }

  playerPk(deployerName: string): Uint8Array {
    if (deployerName in this.userPrivateStates) {
      const battlePrivateState = this.userPrivateStates[deployerName];
      if (battlePrivateState.secretKey !== null) {
        return pureCircuits.public_key(battlePrivateState.secretKey);
      }
      throw new Error(`${deployerName} does not exist`);
    }
    throw new Error(`${deployerName} does not exist`);
  }

  commitHash(deployerName: string, contractAddress: string): Uint8Array {
    if (deployerName in this.userPrivateStates) {
      const battlePrivateState = this.userPrivateStates[deployerName];
      if (battlePrivateState.localGameplay !== null) {
        const cellAssignments = battlePrivateState.localGameplay.get(contractAddress);
        if (cellAssignments === undefined) {
          throw new Error(`No local gameplay for contract ${contractAddress}`);
        }
        return pureCircuits.vectorHash(cellAssignments);
      }
      throw new Error(`${deployerName} does not exist`);
    }
    throw new Error(`${deployerName} does not exist`);
  }

  participantJoin(participantName: string): NavalBattlePrivateState {
    const participantPrivateState = randomNavalBattleGamePrivateState();
    this.turnContext = this.buildTurnContext(participantPrivateState);
    this.updateUserPrivateStateByName(participantName)(participantPrivateState);
    this.updateUserPrivateState = this.updateUserPrivateStateByName(participantName);
    return participantPrivateState;
  }

  getLedgerState(): Ledger {
    return ledger(this.circuitContext.transactionContext.state);
  }

  getPrivateState(name: string): NavalBattlePrivateState {
    return this.userPrivateStates[name];
  }

  private updateUserPrivateStateByName =
    (name: string) =>
    (newPrivateState: NavalBattlePrivateState): void => {
      this.userPrivateStates[name] = newPrivateState;
    };

  as(name: string): NavalBattleGameSimulator {
    this.turnContext = this.buildTurnContext(this.userPrivateStates[name]);
    this.updateUserPrivateState = this.updateUserPrivateStateByName(name);
    return this;
  }

  private updateStateAndGetLedger<T>(circuitResults: CircuitResults<NavalBattlePrivateState, T>): Ledger {    
    this.circuitContext = circuitResults.context;
    this.updateUserPrivateState(circuitResults.context.currentPrivateState);
    return this.getLedgerState();
  }

  joinGame(playerPk: Uint8Array): Ledger {
    return this.updateStateAndGetLedger(this.contract.impureCircuits.joinGame(this.turnContext, playerPk));
  }

  // transitions functions
  commitGrid(player: Uint8Array, playerSetup: number[]): Ledger {    
    return this.updateStateAndGetLedger(this.contract.impureCircuits.commitGrid(this.turnContext, player, playerSetup));
  }

  startGame(): Ledger {
    return this.updateStateAndGetLedger(this.contract.impureCircuits.startGame(this.turnContext));
  }

  makeMove(player: Uint8Array, move: bigint): Ledger {
    return this.updateStateAndGetLedger(this.contract.impureCircuits.makeMove(this.turnContext, player, move));
  }
}
