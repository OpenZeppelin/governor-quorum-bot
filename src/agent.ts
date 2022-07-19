import {
  BlockEvent,
  Finding,
  HandleBlock,
  HandleTransaction,
  TransactionEvent,
  FindingSeverity,
  FindingType,
} from "forta-agent";

export const QUORUM_UPDATE_EVENT =
  "event QuorumNumeratorUpdated(uint256 oldQuorumNumerator, uint256 newQuorumNumerator)";
export const GOVERNOR_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";//todo UPDATE
let findingsCount = 0;

const handleTransaction: HandleTransaction = async (
  txEvent: TransactionEvent
) => {
  const findings: Finding[] = [];

  // limiting this agent to emit only 5 findings so that the alert feed is not spammed
  if (findingsCount >= 5) return findings;

  // filter the transaction logs for Governor quorum update transfer events
  const quorumUpdateEvents = txEvent.filterLog(
    QUORUM_UPDATE_EVENT,
    GOVERNOR_ADDRESS
  );

  quorumUpdateEvents.forEach((transferEvent) => {
    // extract transfer event arguments
    const { oldQuorumNumerator, newQuorumNumerator } = transferEvent.args;

    // if quorum is being lowered report it
    if (oldQuorumNumerator > newQuorumNumerator ) {
      findings.push(
        Finding.fromObject({
          name: "Quorum lowered",
          description: `The governor's required quorum has been lowered`,
          alertId: "FORTA-1",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
              oldQuorumNumerator,
              newQuorumNumerator,
          },
        })
      );
      findingsCount++;
    }
  });

  return findings;
};

// const handleBlock: HandleBlock = async (blockEvent: BlockEvent) => {
//   const findings: Finding[] = [];
//   // detect some block condition
//   return findings;
// }

export default {
  handleTransaction,
  // handleBlock
};
