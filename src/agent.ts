import type {} from "@nomiclabs/hardhat-ethers";
import {
  Finding,
  HandleTransaction,
  TransactionEvent,
  FindingSeverity,
  FindingType,
  LogDescription,
  ethers,
} from "forta-agent";
import { network } from "hardhat";
import keccak256 from "keccak256";

export const PROPOSAL_CREATED_EVENT =
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets,  uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)";
export const GOVERNOR_ADDRESS = "0x80BAE65E9D56498c7651C34cFB37e2F417C4A703";

const ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "proposer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address[]",
        "name": "targets",
        "type": "address[]"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "values",
        "type": "uint256[]"
      },
      {
        "indexed": false,
        "internalType": "string[]",
        "name": "signatures",
        "type": "string[]"
      },
      {
        "indexed": false,
        "internalType": "bytes[]",
        "name": "calldatas",
        "type": "bytes[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startBlock",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "endBlock",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "description",
        "type": "string"
      }
    ],
    "name": "ProposalCreated",
    "type": "event"
  },
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
  {
    inputs: [{ internalType: "uint256", name: "proposalId", type: "uint256" }],
    name: "state",
    outputs: [
      { internalType: "enum IGovernor.ProposalState", name: "", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "newQuorumNumerator", type: "uint256" },
    ],
    name: "updateQuorumNumerator",
    outputs: [],
    stateMutability: "nonpayable",
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

// Returns a governor contract using ethers provider pointing to a forked version of the chain
async function getContract(
  userAddress: string,
  contractAddress: string,
  blockNumber: number
): Promise<ethers.Contract> {
  const provider = await new ethers.providers.Web3Provider(network.provider as any);

  return await new ethers.Contract(
    contractAddress,
    ABI,
    provider.getSigner(userAddress)
  );
}
// Return current and proposed numerator value for address
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

// Gets all defeated proposals
async function getDefeatedProposals(
  governor: ethers.Contract
): Promise<number[]> {
  const defeatedProposals = [];
  const eventFilter = await governor.filters.ProposalCreated();
  const proposalsEvents = await governor.queryFilter(eventFilter);
  
  // Save all quorum defeated proposals
  for (const proposalEvent of proposalsEvents) {
    const { proposalId } = proposalEvent.args as any;
    const state = await governor.state(proposalId);    
    if (state == 3) {
      defeatedProposals.push(proposalId);
    }
  }
  return defeatedProposals;
}

// Returns proposals whose state changed after the quorum update
async function getAffectedProposals(
  governor: ethers.Contract,
  newQuorumNumerator: number
): Promise<number[]> {
  const currentDefeatedProposals: number[] = await getDefeatedProposals(
    governor
  );
  // if no previous proposal has failed due to lack of quorum, quorum changes won't affect them
  if (currentDefeatedProposals.length != 0) {
    // update quorum
    await governor.updateQuorumNumerator(newQuorumNumerator);
    // re-run all saved proposalsIds state and compare if now they pass
    const newDefeatedProposals: number[] = await getDefeatedProposals(governor);
    if (currentDefeatedProposals.length > newDefeatedProposals.length) {
      return currentDefeatedProposals.filter(
        (id) => newDefeatedProposals.indexOf(id) < 0
      );
    }
  }
  return [];
}

const handleTransaction: HandleTransaction = async (
  txEvent: TransactionEvent
) => {
  const findings: Finding[] = [];

  // Filter the transaction logs to find if a proposal is created to lower the quorum
  // and its execution will affect defeated proposals
  const quorumUpdateEvents = txEvent.filterLog(PROPOSAL_CREATED_EVENT);
  for (const newQuorumProposalEvent of quorumUpdateEvents) {
    if (newQuorumProposalEvent.name == "ProposalCreated") {
      const { proposer, startBlock } = newQuorumProposalEvent.args;

      const governor = await getContract(
        proposer,
        newQuorumProposalEvent.address,
        startBlock.toNumber()
      );

      let quorumUpdates = await getQuorumUpdateValues(
        newQuorumProposalEvent,
        governor
      );

      for (const update of quorumUpdates) {
        // if quorum is being lowered report it
        if (update.oldQuorumNumerator > update.newQuorumNumerator) {
          const strOldNumerator = update.oldQuorumNumerator.toString();
          const strNewNumerator = update.newQuorumNumerator.toString();
          const affectedProposald = await getAffectedProposals(
            governor,
            update.newQuorumNumerator
          );
          if (affectedProposald.length > 0) {
            findings.push(
              Finding.fromObject({
                name: "Governor Quorum Numerator Lowered",
                description: `The governor's required quorum has been lowered from ${strOldNumerator} to ${strNewNumerator} for ${update.target}, ${affectedProposald}`,
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
  }
  return findings;
};

export default {
  handleTransaction,
};
