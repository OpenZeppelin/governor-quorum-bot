import {
  FindingType,
  FindingSeverity,
  Finding,
  HandleTransaction,
  createTransactionEvent,
} from "forta-agent";
import agent, { PROPOSAL_CREATED_EVENT } from "./agent";

describe("proposal creation to lower quorum agent", () => {
  //test must run on block 14800611 temporarily
  let handleTransaction: HandleTransaction;
  const mockTxEvent = createTransactionEvent({} as any);

  beforeAll(() => {
    handleTransaction = agent.handleTransaction;
  });

  describe("handleTransaction", () => {
    it("returns empty findings if there are no proposals created", async () => {
      mockTxEvent.filterLog = jest.fn().mockReturnValue([]);

      const findings = await handleTransaction(mockTxEvent);

      expect(findings).toStrictEqual([]);
      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
      expect(mockTxEvent.filterLog).toHaveBeenCalledWith(
        PROPOSAL_CREATED_EVENT
      );
    });

    it("returns a finding if there is a new prosposal to lower quorum", async () => {
      const oldNumerator = "25";
      const newNumerator = "3";
      const newQuorumProposalEvent = {
        name: "ProposalCreated",
        args: {
          proposer: "0xE8D848debB3A3e12AA815b15900c8E020B863F31",
          oldQuorumNumerator: oldNumerator,
          newQuorumNumerator: newNumerator,
          calldatas: [
            "0x06f3f9e60000000000000000000000000000000000000000000000000000000000000003",
          ],
          targets: ["0x80BAE65E9D56498c7651C34cFB37e2F417C4A703"],
        },
        address: "0x80BAE65E9D56498c7651C34cFB37e2F417C4A703",
      };
      mockTxEvent.filterLog = jest
        .fn()
        .mockReturnValue([newQuorumProposalEvent]);

      const findings = await handleTransaction(mockTxEvent);

      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "Governor Quorum Numerator Lowered",
          description: `The governor's required quorum has been lowered from ${oldNumerator} to ${newNumerator} for ${newQuorumProposalEvent.address}, affected proposalIds: 0xc4715e926c1dd96ed6d703131564450ab353e117129654dd9bd437cf35bb1d18`,
          alertId: "GOVERNOR-QUORUM-UPDATE-PROPOSAL-1",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            address: newQuorumProposalEvent.address,
            oldQuorumNumerator: newQuorumProposalEvent.args.oldQuorumNumerator,
            newQuorumNumerator: newQuorumProposalEvent.args.newQuorumNumerator,
          },
        }),
      ]);
      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
      expect(mockTxEvent.filterLog).toHaveBeenCalledWith(
        PROPOSAL_CREATED_EVENT
      );
    });

    it("returns a finding if there is a new prosposal to lower quorum within different calldatas", async () => {
      const oldNumerator = "25";
      const newNumerator = "3";
      const newQuorumProposalEvent = {
        name: "ProposalCreated",
        args: {
          oldQuorumNumerator: oldNumerator,
          newQuorumNumerator: newNumerator,
          calldatas: [
            "0x06f3f9e60000000000000000000000000000000000000000000000000000000000000003",
            "0x06f3f9e60000000000000000000000000000000000000000000000000000000000000003",
          ],
          proposer: "0xE8D848debB3A3e12AA815b15900c8E020B863F31",
          targets: [
            "0x80BAE65E9D56498c7651C34cFB37e2F417C4A703",
            "0x80BAE65E9D56498c7651C34cFB37e2F417C4A703",
          ],
        },
        address: "0x80BAE65E9D56498c7651C34cFB37e2F417C4A703",
      };
      mockTxEvent.filterLog = jest
        .fn()
        .mockReturnValue([newQuorumProposalEvent]);

      const findings = await handleTransaction(mockTxEvent);

      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "Governor Quorum Numerator Lowered",
          description: `The governor's required quorum has been lowered from ${oldNumerator} to ${newNumerator} for ${newQuorumProposalEvent.args.targets[0]}, affected proposalIds: 0xc4715e926c1dd96ed6d703131564450ab353e117129654dd9bd437cf35bb1d18`,
          alertId: "GOVERNOR-QUORUM-UPDATE-PROPOSAL-1",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            address: newQuorumProposalEvent.args.targets[0],
            oldQuorumNumerator: newQuorumProposalEvent.args.oldQuorumNumerator,
            newQuorumNumerator: newQuorumProposalEvent.args.newQuorumNumerator,
          },
        }),
        Finding.fromObject({
          name: "Governor Quorum Numerator Lowered",
          description: `The governor's required quorum has been lowered from ${oldNumerator} to ${newNumerator} for ${newQuorumProposalEvent.args.targets[1]}, affected proposalIds: 0xc4715e926c1dd96ed6d703131564450ab353e117129654dd9bd437cf35bb1d18`,
          alertId: "GOVERNOR-QUORUM-UPDATE-PROPOSAL-1",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            address: newQuorumProposalEvent.args.targets[1],
            oldQuorumNumerator: newQuorumProposalEvent.args.oldQuorumNumerator,
            newQuorumNumerator: newQuorumProposalEvent.args.newQuorumNumerator,
          },
        }),
      ]);
      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
      expect(mockTxEvent.filterLog).toHaveBeenCalledWith(
        PROPOSAL_CREATED_EVENT
      );
    });

    it("returns a finding if there is a new prosposal to lower quorum affecting previous proposals", async () => {
      const newProposalEvent = {
        name: "ProposalCreated",
        args: {
          proposalId: 1,
        },
      };
      mockTxEvent.filterLog = jest.fn().mockReturnValue([newProposalEvent]);
      const oldNumerator = "25";
      const newNumerator = "3";
      const newQuorumProposalEvent = {
        name: "ProposalCreated",
        args: {
          proposalId: 2,
          proposer: "0xE8D848debB3A3e12AA815b15900c8E020B863F31",
          oldQuorumNumerator: oldNumerator,
          newQuorumNumerator: newNumerator,
          calldatas: [
            "0x06f3f9e60000000000000000000000000000000000000000000000000000000000000003",
          ],
          targets: ["0x80BAE65E9D56498c7651C34cFB37e2F417C4A703"],
        },
        address: "0x80BAE65E9D56498c7651C34cFB37e2F417C4A703",
      };
      mockTxEvent.filterLog = jest
        .fn()
        .mockReturnValue([newQuorumProposalEvent]);

      const findings = await handleTransaction(mockTxEvent);

      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "Governor Quorum Numerator Lowered",
          description: `The governor's required quorum has been lowered from ${oldNumerator} to ${newNumerator} for ${newQuorumProposalEvent.address}, affected proposalIds: 0xc4715e926c1dd96ed6d703131564450ab353e117129654dd9bd437cf35bb1d18`,
          alertId: "GOVERNOR-QUORUM-UPDATE-PROPOSAL-1",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            address: newQuorumProposalEvent.address,
            oldQuorumNumerator: newQuorumProposalEvent.args.oldQuorumNumerator,
            newQuorumNumerator: newQuorumProposalEvent.args.newQuorumNumerator,
          },
        }),
      ]);
      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
      expect(mockTxEvent.filterLog).toHaveBeenCalledWith(
        PROPOSAL_CREATED_EVENT
      );
    });

    it("returns a finding if there is a new prosposal to lower quorum affecting previous proposals in real contract", async () => {
      // steps
      // deploy governance contract and mint tokens to propose and vote
      const mockGovernorContract = {
        quorumNumerator: jest.fn(),
        state: jest.fn(),
        updateQuorumNumerator: jest.fn(),
      };
      // create proposal
      const newProposalEvent = {
        name: "ProposalCreated",
        args: {
          proposalId: 1,
        },
      };
      mockTxEvent.filterLog = jest.fn().mockReturnValue([newProposalEvent]);
      // defeat it
      mockGovernorContract.state.mock.results = [
        {
          type: "return",
          value: 3,
        },
        {
          type: "return",
          value: 4,
        },
      ];
      // create quorum lowering proposal
      const newQuorumProposalEvent = {
        name: "ProposalCreated",
        args: {
          proposer: "0xE8D848debB3A3e12AA815b15900c8E020B863F31",
          oldQuorumNumerator: "25",
          newQuorumNumerator: "3",
          calldatas: [
            "0x06f3f9e60000000000000000000000000000000000000000000000000000000000000003",
          ],
          targets: ["0x80BAE65E9D56498c7651C34cFB37e2F417C4A703"],
        },
        address: "0x80BAE65E9D56498c7651C34cFB37e2F417C4A703",
      };
      mockTxEvent.filterLog = jest
        .fn()
        .mockReturnValue([newQuorumProposalEvent]);

      const findings = await handleTransaction(mockTxEvent);
      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "Governor Quorum Numerator Lowered",
          description: `The governor's required quorum has been lowered from 25 to 3 for ${newQuorumProposalEvent.address}, affected proposalIds: 0xc4715e926c1dd96ed6d703131564450ab353e117129654dd9bd437cf35bb1d18`,
          alertId: "GOVERNOR-QUORUM-UPDATE-PROPOSAL-1",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
            address: newQuorumProposalEvent.address,
            oldQuorumNumerator: newQuorumProposalEvent.args.oldQuorumNumerator,
            newQuorumNumerator: newQuorumProposalEvent.args.newQuorumNumerator,
          },
        }),
      ]);
      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
      expect(mockTxEvent.filterLog).toHaveBeenCalledWith(
        PROPOSAL_CREATED_EVENT
      );
    });
  });
});
