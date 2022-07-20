# Governance Quorum Change Agent

## Description

This agent detects when a proposal is created to lower the quorum.


## Supported Chains

- Ethereum

## Alerts

- GOVERNOR-QUORUM-UPDATE-PROPOSAL-1
  - Fired when a a proposal was created to lower the quorum numerator
  - Severity is always set to "low"
  - Type is always set to "info"
  - Metadata includes the target address, new and current and value of the quorum numerator


## Test Data

Run ´npm test´

