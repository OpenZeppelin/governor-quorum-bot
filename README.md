# Governance Quorum Change Agent

## Description

This agent detects when a proposal is created to lower the quorum.

## Supported Chains

- Ethereum

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
1. When the code is updated to the new version, run `npm run push this will publish an image of the bot in a repository that a scan node can read from.
2. Copy the hash the console printed out.
3. Go to the [Forta App](https://app.forta.network/).
4. Go to My Agents(from the menu at the top right).
5. Click on the options button,the three dots to the right, and click `Edit`.
6. Copy the new image hash and click save.

