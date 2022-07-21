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
  ethers
} from "forta-agent";
import keccak256 from "keccak256";
import ganache from 'ganache-core'

export const PROPOSAL_CREATED_EVENT =
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets,  uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)";
export const GOVERNOR_ADDRESS = "0x80BAE65E9D56498c7651C34cFB37e2F417C4A703";
const governorProposals : { [symbol: string]: number[]} = { }
const ABI = [
  {
    inputs: [],
    name: "quorumNumerator",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
const FUNCTION_SELECTOR =
  "0x" + keccak256("updateQuorumNumerator(uint256)").toString("hex", 0, 4);

type QuorumUpdateProposal = {
  target: string;
  oldQuorumNumerator: number;
  newQuorumNumerator: number;
};

// returns a governor contract using ethers provider pointing to a forked version of the chain
async function getContract(userAddress: string, contractAddress: string): Promise<ethers.Contract> {
  const provider = await new ethers.providers.Web3Provider(ganache.provider({
    fork: getJsonRpcUrl(), // specify the chain to fork from  
    unlocked_accounts: [userAddress] // specify any accounts to unlock so you dont need the private key to make transactions
  }) as any)
  return  await new ethers.Contract(contractAddress, ABI, provider.getSigner(userAddress))
}

async function getQuorumUpdateValues(
  event: LogDescription,
  governor: ethers.Contract
): Promise<QuorumUpdateProposal[]> {
  const { calldatas, targets } = event.args;
  const response: QuorumUpdateProposal[] = [];
  if (calldatas) {
    for (let i = 0; i < calldatas.length; i++) {
      const calldata = calldatas[i];
      if (calldata.startsWith(FUNCTION_SELECTOR)) {
        const newQuorumNumerator = Number("0x" + calldata.slice(10));
        
        let oldQuorumNumerator = await governor.quorumNumerator();

        response.push({
          target: targets[i],
          oldQuorumNumerator,
          newQuorumNumerator,
        });
      }
    }
  }
  return response;
}

async function simulateExecute(){

}

const handleTransaction: HandleTransaction = async (
  txEvent: TransactionEvent
) => {
  const findings: Finding[] = [];

  // filter the transaction logs to find a proposal created to lower the quorum
  const quorumUpdateEvents = txEvent.filterLog(PROPOSAL_CREATED_EVENT);
  for (const newQuorumProposalEvent of quorumUpdateEvents) {
    if (newQuorumProposalEvent.name == "ProposalCreated") {
      const { proposer } = newQuorumProposalEvent.args;
      const governor = await getContract(proposer, newQuorumProposalEvent.address);
      
      let quorumUpdates = await getQuorumUpdateValues(newQuorumProposalEvent, governor);
      
      for (const update of quorumUpdates) {
        
        // if quorum is being lowered report it
        if (update.oldQuorumNumerator > update.newQuorumNumerator) {
          const strOldNumerator = update.oldQuorumNumerator.toString();
          const strNewNumerator = update.newQuorumNumerator.toString();

          //pending if
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
  handleTransaction,
};
