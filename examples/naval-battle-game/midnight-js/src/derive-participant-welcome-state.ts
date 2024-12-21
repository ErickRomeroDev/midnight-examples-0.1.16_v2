import { Ledger, WelcomePrivateState } from '@midnight-ntwrk/naval-battle-game-contract';
import { EphemeralState } from './ephemeral-state-bloc.js';
import { ParticipantWelcomeState } from './api';

export const deriveParticipantWelcomeState = (
  { checkedInParticipants }: Ledger,
  { participantId }: WelcomePrivateState,
  { actions }: EphemeralState,
): ParticipantWelcomeState => {
  return participantId === null
    ? {
        actions,
        isCheckedIn: false,
        participantId: null,
      }
    : {
        actions,
        isCheckedIn: checkedInParticipants.member(participantId),
        participantId,
      };
};
