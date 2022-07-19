import {
  FindingType,
  FindingSeverity,
  Finding,
  HandleTransaction,
  createTransactionEvent,
  ethers,
} from "forta-agent";
import agent, {
  QUORUM_UPDATE_EVENT,
  GOVERNOR_ADDRESS
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
        QUORUM_UPDATE_EVENT,
        GOVERNOR_ADDRESS
      );
    });

    it("returns a finding if there is a new prosposal to lower quorum", async () => {
      const oldNumerator = "5"
      const newNumerator = "4"
      const newQuorumProposalEvent = {
        args: {
          oldQuorumNumerator: oldNumerator,
          newQuorumNumerator: newNumerator,
        },
      };
      mockTxEvent.filterLog = jest
        .fn()
        .mockReturnValue([newQuorumProposalEvent]);

      const findings = await handleTransaction(mockTxEvent);

      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "Governor Quorum Numerator Lowered",
          description: `The governor's required quorum has been lowered ${oldNumerator} to ${newNumerator}`,
          alertId: "FORTA-1",// TODO define this code
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
        QUORUM_UPDATE_EVENT,
        GOVERNOR_ADDRESS
      );
    });
  });
});
