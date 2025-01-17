import { describe, test, expect } from '@jest/globals';
import { NavalBattleGameSimulator } from './naval-battle-game-test-setup';
import { CellState } from '../managed/naval-battle-game/contract/index.cjs';

describe('Naval Battle Game contract', () => {
  test('generates correct initial states', () => {
    const simulator = NavalBattleGameSimulator.gameDeploy('battlegameplayer#1');

    const gamePS = simulator.getPrivateState('battlegameplayer#1');
    expect(gamePS.secretKey).not.toBe(null);
    expect(gamePS.localGameplay).toBe(null);

    const initialLS = simulator.getLedgerState();
    expect(initialLS.gameStarted).toBe(false);
    expect(initialLS.players).toBe(1n);

    expect(initialLS.playerOneCommit).toEqual(new Uint8Array(32).fill(0));
    expect(initialLS.playerOneCurrentMove).toBe(0n);
    expect(initialLS.playerOneGrid.size()).toBe(100n);
    expect(initialLS.playerOneGrid.isEmpty()).toBe(false);
    expect(initialLS.playerOneGrid.member(36n)).toBe(true);
    expect(initialLS.playerOneGrid.lookup(36n)).toBe(CellState.unset);
    expect(initialLS.playerOneHasCommitted).toBe(false);
    expect(initialLS.playerOneHasJoinedTheGame).toBe(true);
    expect(initialLS.playerOneHits).toBe(0n);
    expect(initialLS.playerOneIsWinner).toBe(false);
    const playerOnePk = simulator.playerPk('battlegameplayer#1');
    expect(initialLS.playerOnePk).not.toEqual(new Uint8Array(32).fill(0));
    expect(initialLS.playerOnePk).toEqual(playerOnePk);
    expect(initialLS.playerOneTimeToPlay).toBe(true);

    expect(initialLS.playerTwoCommit).toEqual(new Uint8Array(32).fill(0));
    expect(initialLS.playerTwoCurrentMove).toBe(0n);
    expect(initialLS.playerTwoGrid.size()).toBe(100n);
    expect(initialLS.playerTwoGrid.isEmpty()).toBe(false);
    expect(initialLS.playerTwoGrid.member(36n)).toBe(true);
    expect(initialLS.playerTwoGrid.lookup(36n)).toBe(CellState.unset);
    expect(initialLS.playerTwoHasCommitted).toBe(false);
    expect(initialLS.playerTwoHasJoinedTheGame).toBe(false);
    expect(initialLS.playerTwoHits).toBe(0n);
    expect(initialLS.playerTwoIsWinner).toBe(false);
    const playerTwoPk = simulator.playerPk('battlegameplayer#1');
    expect(initialLS.playerTwoPk).toEqual(new Uint8Array(32).fill(0));
    expect(initialLS.playerTwoPk).not.toEqual(playerTwoPk);
    expect(initialLS.playerTwoTimeToPlay).toBe(false);

    const participantPS = simulator.participantJoin('battlegameplayer#2');
    expect(participantPS.secretKey).not.toBe(null);
    expect(participantPS.localGameplay).toBe(null);

    const gamePS1 = simulator.getPrivateState('battlegameplayer#1');
    expect(gamePS1.secretKey).not.toBe(null);
    expect(gamePS1.localGameplay).toBe(null);
  });

  test('participant can join the game', () => {
    const simulator = NavalBattleGameSimulator.gameDeploy('battlegameplayer#1');
    simulator.participantJoin('battlegameplayer#2');
    const playerOnePk = simulator.playerPk('battlegameplayer#1');
    const playerTwoPk = simulator.playerPk('battlegameplayer#2');
    const joinGameLS2 = simulator.as('battlegameplayer#2').joinGame(playerTwoPk);
    expect(joinGameLS2.playerTwoPk).toEqual(playerTwoPk);
    expect(joinGameLS2.playerOnePk).toEqual(playerOnePk);
    expect(joinGameLS2.players).toBe(2n);
    expect(joinGameLS2.playerTwoHasJoinedTheGame).toBe(true);
    expect(joinGameLS2.playerTwoTimeToPlay).toBe(false);
    expect(joinGameLS2.playerOneTimeToPlay).toBe(true);
  });

  test('creator cannot join the game again', () => {
    const simulator = NavalBattleGameSimulator.gameDeploy('battlegameplayer#1');
    simulator.participantJoin('battlegameplayer#2');
    const playerOnePk = simulator.playerPk('battlegameplayer#1');

    expect(() => simulator.joinGame(playerOnePk)).toThrow();
  });

  test('game does not accept more than 2 players', () => {
    const simulator = NavalBattleGameSimulator.gameDeploy('battlegameplayer#1');
    simulator.participantJoin('battlegameplayer#2');
    simulator.participantJoin('battlegameplayer#3');
    const playerTwoPk = simulator.playerPk('battlegameplayer#2');
    const playerThreePk = simulator.playerPk('battlegameplayer#3');
    simulator.as('battlegameplayer#2').joinGame(playerTwoPk);
    expect(() => simulator.as('battlegameplayer#3').joinGame(playerThreePk)).toThrow();
  });
  
  test('cannot start the game without the commitments', () => {
    const simulator = NavalBattleGameSimulator.gameDeploy('battlegameplayer#1');
    simulator.participantJoin('battlegameplayer#2');
    const playerTwoPk = simulator.playerPk('battlegameplayer#2');
    simulator.as('battlegameplayer#2').joinGame(playerTwoPk);
    expect(() => simulator.as('battlegameplayer#2').startGame()).toThrow();
  });

  test('creator and participan can commit games', () => {
    const simulator = NavalBattleGameSimulator.gameDeploy('battlegameplayer#1');
    simulator.participantJoin('battlegameplayer#2');

    const playerOnePk = simulator.playerPk('battlegameplayer#1');     
    const joinGameLS1 = simulator.as('battlegameplayer#1').commitGrid(playerOnePk, [1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]); 
    expect(joinGameLS1.playerOneHasCommitted).toBe(true); 
    const contractAddress = simulator.address;   
    const playerOneCommitHash = simulator.as('battlegameplayer#1').commitHash('battlegameplayer#1', contractAddress);
    expect(joinGameLS1.playerOneCommit).toEqual(playerOneCommitHash);
    const gamePS1 = simulator.getPrivateState('battlegameplayer#1');    

    const playerTwoPk = simulator.playerPk('battlegameplayer#2');
    simulator.as('battlegameplayer#2').joinGame(playerTwoPk);
    const joinGameLS2 = simulator.as('battlegameplayer#2').commitGrid(playerTwoPk, [1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]); 
    expect(joinGameLS2.playerTwoHasCommitted).toBe(true); 
    const playerTwoCommitHash = simulator.as('battlegameplayer#2').commitHash('battlegameplayer#2', contractAddress);
    expect(joinGameLS2.playerTwoCommit).toEqual(playerTwoCommitHash);
    const gamePS2 = simulator.getPrivateState('battlegameplayer#2');    
  });

  test('The game can be started', () => {
    const simulator = NavalBattleGameSimulator.gameDeploy('battlegameplayer#1');
    simulator.participantJoin('battlegameplayer#2');

    const playerOnePk = simulator.playerPk('battlegameplayer#1'); 
    simulator.as('battlegameplayer#1').commitGrid(playerOnePk, [1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]); 
    
    const playerTwoPk = simulator.playerPk('battlegameplayer#2');
    simulator.as('battlegameplayer#2').joinGame(playerTwoPk);
    simulator.as('battlegameplayer#2').commitGrid(playerTwoPk, [1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]); 

    const state = simulator.as('battlegameplayer#1').startGame();
    expect(state.gameStarted).toBe(true);
  });

  test('The game is started and player#1 makes a move', () => {
    const simulator = NavalBattleGameSimulator.gameDeploy('battlegameplayer#1');
    simulator.participantJoin('battlegameplayer#2');

    const playerOnePk = simulator.playerPk('battlegameplayer#1'); 
    simulator.as('battlegameplayer#1').commitGrid(playerOnePk, [1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]); 
    
    const playerTwoPk = simulator.playerPk('battlegameplayer#2');
    simulator.as('battlegameplayer#2').joinGame(playerTwoPk);
    simulator.as('battlegameplayer#2').commitGrid(playerTwoPk, [1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]); 

    const state = simulator.as('battlegameplayer#1').startGame();
    expect(state.gameStarted).toBe(true);

    const statePlayer1Move1 = simulator.as('battlegameplayer#1').makeMove(playerOnePk, 1n);    
    expect(statePlayer1Move1.playerOneCurrentMove).toBe(1n);
    expect(statePlayer1Move1.playerTwoCurrentMove).toBe(0n);
    expect(statePlayer1Move1.playerOneTimeToPlay).toBe(false);
    expect(statePlayer1Move1.playerTwoTimeToPlay).toBe(true);

    const statePlayer2Move1 = simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 30n);    
    expect(statePlayer2Move1.playerTwoCurrentMove).toBe(30n);
    expect(statePlayer2Move1.playerTwoTimeToPlay).toBe(false);
    expect(statePlayer2Move1.playerOneTimeToPlay).toBe(true);
    expect(statePlayer2Move1.playerOneHits).toBe(1n);
    expect(statePlayer2Move1.playerTwoGrid.lookup(1n)).toBe(CellState.hit);

    const statePlayer1Move2 = simulator.as('battlegameplayer#1').makeMove(playerOnePk, 30n);   
    expect(statePlayer1Move2.playerOneCurrentMove).toBe(30n);
    expect(statePlayer1Move2.playerTwoCurrentMove).toBe(30n);
    expect(statePlayer1Move2.playerOneTimeToPlay).toBe(false);
    expect(statePlayer1Move2.playerTwoTimeToPlay).toBe(true);
    expect(statePlayer1Move2.playerTwoHits).toBe(0n);
    expect(statePlayer1Move2.playerOneGrid.lookup(30n)).toBe(CellState.miss);

    expect(statePlayer1Move2.playerOneIsWinner).toBe(false);
    expect(statePlayer1Move2.playerTwoIsWinner).toBe(false);
  });

  test('The game is started and player#1 wins the game', () => {
    const simulator = NavalBattleGameSimulator.gameDeploy('battlegameplayer#1');
    simulator.participantJoin('battlegameplayer#2');

    const playerOnePk = simulator.playerPk('battlegameplayer#1'); 
    simulator.as('battlegameplayer#1').commitGrid(playerOnePk, [1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]); 
    
    const playerTwoPk = simulator.playerPk('battlegameplayer#2');
    simulator.as('battlegameplayer#2').joinGame(playerTwoPk);
    simulator.as('battlegameplayer#2').commitGrid(playerTwoPk, [1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]); 

    const state = simulator.as('battlegameplayer#1').startGame();
    expect(state.gameStarted).toBe(true);

    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 1n);  
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 30n);
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 2n);
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 1n);
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 3n);
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 2n); 
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 4n);
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 3n);
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 5n);
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 4n);
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 6n);
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 5n);
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 7n);
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 6n);
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 8n);
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 7n);
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 9n);
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 8n);
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 10n);
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 9n);
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 11n);
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 10n);
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 12n);
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 11n);
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 13n);
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 12n);
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 14n);
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 13n);
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 15n);
    simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 14n);
    simulator.as('battlegameplayer#1').makeMove(playerOnePk, 16n);
    const finalState = simulator.as('battlegameplayer#2').makeMove(playerTwoPk, 15n);      
  
    expect(finalState.playerOneIsWinner).toBe(true);
    expect(finalState.playerTwoIsWinner).toBe(false);

    expect(() => simulator.as('battlegameplayer#1').makeMove(playerTwoPk, 17n)).toThrow();
  });  
});
