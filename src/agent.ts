import {
  BlockEvent,
  Finding,
  HandleBlock,
  HandleTransaction,
  TransactionEvent,
  FindingSeverity,
  FindingType,
  LogDescription,
  getJsonRpcUrl,
} from "forta-agent";
import Web3 from "web3";
import keccak256 from "keccak256";

export const PROPOSAL_CREATED_EVENT =
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets,  uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)";
export const ABI = [
	{
		"inputs": [],
		"name": "quorumNumerator",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]
const FUNCTION_SELECTOR = '0x' + keccak256("updateQuorumNumerator(uint256)").toString('hex', 0, 4);

type QuorumUpdateProposal = {
  target: string;
  oldQuorumNumerator: number;
  newQuorumNumerator: number;
}

let findingsCount = 0;

async function getQuorumUpdateValues(event: LogDescription): Promise<QuorumUpdateProposal[]> {
  const { calldatas, targets } = event.args;
  const response: QuorumUpdateProposal[] = [];
  if(calldatas){
    let i = 0;
    for (const calldata of calldatas) {
    
      if(calldata.startsWith(FUNCTION_SELECTOR)){
        const newQuorumNumerator = Number('0x' + calldata.slice(10));
    
        const web3 = await new Web3(getJsonRpcUrl());
    
        const governor = await new web3.eth.Contract(ABI as any, event.address);
    
        let oldQuorumNumerator = await governor.methods.quorumNumerator().call();
    
        response.push({target: targets[i], oldQuorumNumerator, newQuorumNumerator});
      }
      i++;
    } 
  }
  return response;
}

const handleTransaction: HandleTransaction = async (
  txEvent: TransactionEvent
) => {
  const findings: Finding[] = [];

  // filter the transaction logs to find a proposal created to lower the quorum
  const quorumUpdateEvents = txEvent.filterLog(
    PROPOSAL_CREATED_EVENT,
  );

  for (const newQuorumProposalEvent of quorumUpdateEvents) {
    if (newQuorumProposalEvent.name == "ProposalCreated"){
      let quorumUpdates = await getQuorumUpdateValues(newQuorumProposalEvent);

      for(const update of quorumUpdates){
        // if quorum is being lowered report it
      if (update.oldQuorumNumerator > update.newQuorumNumerator) {
        const strOldNumerator = update.oldQuorumNumerator.toString();
        const strNewNumerator = update.newQuorumNumerator.toString();
        findings.push(
          Finding.fromObject({
            name: "Governor Quorum Numerator Lowered",
            description: `The governor's required quorum has been lowered from ${strOldNumerator} to ${strNewNumerator} for ${update.target}`,
            alertId: "GOVERNOR-QUORUM-UPDATE-PROPOSAL-1",
            severity: FindingSeverity.Low,
            type: FindingType.Info,
            metadata: {
              oldQuorumNumerator: strOldNumerator,
              newQuorumNumerator: strNewNumerator,
              address: update.target,
            },
          })
        );
      }
      }
    }
  }
  return findings;
};

export default {
  handleTransaction
};
