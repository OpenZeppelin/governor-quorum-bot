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

export const NEW_PROPOSAL_EVENT =
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets,  uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)";
export const GOVERNOR_ADDRESS = "0x80BAE65E9D56498c7651C34cFB37e2F417C4A703";//todo Update with desired contract
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

let findingsCount = 0;

async function getQuorumUpdateValues(event: LogDescription): Promise<number[]> {
  const { calldatas } = event.args;
  const functionselector = '0x' + keccak256("updateQuorumNumerator(uint256)").toString('hex', 0, 4);
  if(calldatas){
    const quorumCall: string = calldatas.filter((hash:string) => {
      return hash.startsWith(functionselector)
    })[0];
  
    if(quorumCall){
      const newQuorumNumerator = Number('0x' + quorumCall.slice(10));
  
      const web3 = await new Web3(getJsonRpcUrl());
  
      const governor = await new web3.eth.Contract(ABI as any, GOVERNOR_ADDRESS);
  
      let oldQuorumNumerator = await governor.methods.quorumNumerator().call();
  
      return [oldQuorumNumerator, newQuorumNumerator];
    } 
  }
  return [0, 0];
}

const handleTransaction: HandleTransaction = async (
  txEvent: TransactionEvent
) => {
  const findings: Finding[] = [];

  // limiting this agent to emit only 5 findings so that the alert feed is not spammed
  if (findingsCount >= 5) return findings;

  // filter the transaction logs to find a proposal created to lower the quorum
  const quorumUpdateEvents = txEvent.filterLog(
    NEW_PROPOSAL_EVENT,
    GOVERNOR_ADDRESS
  );

  for (const newQuorumProposalEvent of quorumUpdateEvents) {
    let [oldQuorumNumerator, newQuorumNumerator] = await getQuorumUpdateValues(newQuorumProposalEvent);
    
    //todo get target function somewhere to be QuorumNumeratorUpdated
    // if quorum is being lowered report it
    if (newQuorumProposalEvent.name == "ProposalCreated" && oldQuorumNumerator > newQuorumNumerator) {
      const strOldNumerator = oldQuorumNumerator.toString();
      const strNewNumerator = newQuorumNumerator.toString();
      findings.push(
        Finding.fromObject({
          name: "Governor Quorum Numerator Lowered",
          description: `The governor's required quorum has been lowered from ${oldQuorumNumerator} to ${newQuorumNumerator}`,
          alertId: "GOVERNOR-QUORUM-UPDATE-PROPOSAL-1",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            oldQuorumNumerator: strOldNumerator,
            newQuorumNumerator: strNewNumerator,
          },
        })
      );
      findingsCount++;
    }
  }
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
