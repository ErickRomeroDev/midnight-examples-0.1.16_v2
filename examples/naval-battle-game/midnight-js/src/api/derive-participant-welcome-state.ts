import { Ledger, WelcomePrivateState } from '@midnight-ntwrk/naval-battle-game-contract';
import { EphemeralState } from './ephemeral-state-bloc';
import { ParticipantWelcomeState } from '../types';

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
