import {
  FindingType,
  FindingSeverity,
  Finding,
  HandleTransaction,
  createTransactionEvent,
  ethers,
} from "forta-agent";
import agent, {
  PROPOSAL_CREATED_EVENT
} from "./agent";

describe("proposal creation to lower quorum agent", () => {
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
      const oldNumerator = "15"
      const newNumerator = "3"
      const newQuorumProposalEvent = {
        name: "ProposalCreated",
        args: {
          oldQuorumNumerator: oldNumerator,
          newQuorumNumerator: newNumerator,
          calldatas: ["0x06f3f9e60000000000000000000000000000000000000000000000000000000000000003"],
        },
        address: "0x80BAE65E9D56498c7651C34cFB37e2F417C4A703"
      };
      mockTxEvent.filterLog = jest
        .fn()
        .mockReturnValue([newQuorumProposalEvent]);

      const findings = await handleTransaction(mockTxEvent);

      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "Governor Quorum Numerator Lowered",
          description: `The governor's required quorum has been lowered from ${oldNumerator} to ${newNumerator} for ${newQuorumProposalEvent.address}`,
          alertId: "GOVERNOR-QUORUM-UPDATE-PROPOSAL-1",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
          metadata: {
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
