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
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets,  uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)";
export const GOVERNOR_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";//todo UPDATE
let findingsCount = 0;

const handleTransaction: HandleTransaction = async (
  txEvent: TransactionEvent
) => {
  const findings: Finding[] = [];

  // limiting this agent to emit only 5 findings so that the alert feed is not spammed
  if (findingsCount >= 5) return findings;

  // filter the transaction logs to find a proposal created to lower the quorum
  const quorumUpdateEvents = txEvent.filterLog(
    QUORUM_UPDATE_EVENT,
    GOVERNOR_ADDRESS
  );

  quorumUpdateEvents.forEach((newQuorumProposalEvent) => {
    // extract new porposal event arguments
    const oldQuorumNumerator = newQuorumProposalEvent.args.oldQuorumNumerator.toString()
    const newQuorumNumerator = newQuorumProposalEvent.args.newQuorumNumerator.toString()

    // if quorum is being lowered report it
    if (newQuorumProposalEvent.name == "QuorumNumeratorUpdated" && oldQuorumNumerator > newQuorumNumerator) {
      findings.push(
        Finding.fromObject({
          name: "Governor Quorum Numerator Lowered",
          description: `The governor's required quorum has been lowered ${oldQuorumNumerator} to ${newQuorumNumerator}`,
          alertId: "FORTA-1",// TODO define this code
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
