# Governance Quorum Change Agent

[Bot ID 0xb4e4...0907](https://explorer.forta.network/bot/0xb4e4c2584edab51f0c8ed56501d8974d1ba3bb798007a20ebf8a55d5f1410907)

## Description

This agent detects when a proposal is created to lower the quorum and it will be affected by [CVE-2022-31198](https://github.com/OpenZeppelin/openzeppelin-contracts/security/advisories/GHSA-xrc4-737v-9q75).

## Supported Chains

- Ethereum
- Optimism
- BSC
- Polygon
- Avalanche

## Alerts

- GOVERNOR-QUORUM-UPDATE-PROPOSAL-1
  - Fired when a a proposal was created to lower the quorum numerator
  - Only fires when a contract has a bug affecting the previous proposal's results
  - Severity is always set to "low"
  - Type is always set to "info"
  - Metadata includes the target address, new and current and value of the quorum numerator

## Test Data

Run `npm test`

## Update agent
1. When the code is updated to the new version, run `npm run push` this will publish an image of the bot in a repository that a scan node can read from.
2. Copy the hash the console printed out.
3. Go to the [Forta App](https://app.forta.network/).
4. Go to My Agents(from the menu at the top right).
5. Click on the options button,the three dots to the right, and click `Edit`.
6. Copy the new image hash and click save.

