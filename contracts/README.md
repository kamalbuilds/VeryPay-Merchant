# VeryPay Merchant Smart Contracts

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.24-blue.svg)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-Latest-orange.svg)](https://hardhat.org/)

Production-ready smart contracts for the VeryPay Merchant ecosystem, implementing a comprehensive payment processing system with loyalty rewards, merchant management, and DAO governance using the Diamond Standard (EIP-2535).

## 🏗️ Architecture Overview

VeryPay uses the **Diamond Standard (EIP-2535)** for upgradeable smart contracts, allowing for modular functionality and efficient gas usage. The system consists of four main facets:

### Core Components

1. **💳 VeryPayCore** - Payment processing with QR validation
2. **🎁 VeryRewards** - Tier-based loyalty system with walking rewards
3. **🏪 VeryMerchant** - Merchant onboarding and management
4. **🏛️ VeryGovernance** - DAO governance and treasury management

### Key Features

- ✅ **Zero Gas Fees** for $VERY payments
- ✅ **QR Code Validation** for secure transactions  
- ✅ **Multi-Signature Wallets** for merchants
- ✅ **Tier-Based Rewards** (Bronze/Silver/Gold/Platinum)
- ✅ **Walking Rewards Integration**
- ✅ **KYC Verification System**
- ✅ **DAO Governance** with proposal voting
- ✅ **Upgradeable Architecture** via Diamond Standard
- ✅ **Comprehensive Security** measures

## 📁 Project Structure

```
contracts/
├── src/
│   ├── interfaces/           # Contract interfaces
│   ├── libraries/           # Utility libraries
│   ├── facets/             # Diamond facet implementations
│   ├── security/           # Security utilities
│   └── upgradeInitializers/ # Upgrade initialization contracts
├── scripts/                # Deployment and utility scripts
├── test/                  # Comprehensive test suite
├── deployments/           # Deployment artifacts
└── reports/              # Verification reports
```

## 🚀 Quick Start

### Prerequisites

- Node.js v16+ 
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/verypay/contracts.git
cd contracts

# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Deployment

```bash
# Deploy to local network
npm run deploy:local

# Deploy to testnet
npm run deploy:testnet

# Deploy to mainnet (requires proper configuration)
npm run deploy:mainnet
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Network Configuration
INFURA_API_KEY=your_infura_key
ETHERSCAN_API_KEY=your_etherscan_key

# Deployment Configuration  
DEPLOYER_PRIVATE_KEY=your_private_key
VERY_TOKEN_ADDRESS=0x...
GOVERNANCE_TOKEN_ADDRESS=0x...

# System Configuration
PLATFORM_FEE=250                # 2.5% in basis points
FEE_RECIPIENT=0x...             # Address to receive platform fees
```

### Hardhat Configuration

The project uses Hardhat with the following plugins:
- `@nomicfoundation/hardhat-toolbox` - Complete toolbox
- `@openzeppelin/hardhat-upgrades` - Upgrade utilities
- `hardhat-contract-sizer` - Contract size analysis
- `hardhat-gas-reporter` - Gas usage reporting
- `solidity-coverage` - Code coverage analysis

## 📋 Contract Specifications

### VeryPayCore Facet

**Primary Functions:**
- `processPayment()` - Process $VERY payments with QR validation
- `registerMerchant()` - Register new merchants
- `validateQRCode()` - Validate payment QR codes
- `getMerchantInfo()` - Retrieve merchant information

**Security Features:**
- Reentrancy protection
- Access control with roles
- Maximum payment limits
- QR code expiration and uniqueness checks

### VeryRewards Facet

**Tier System:**
- **Bronze**: 1x multiplier (0+ points)
- **Silver**: 1.25x multiplier (1,000+ points) 
- **Gold**: 1.5x multiplier (5,000+ points)
- **Platinum**: 2x multiplier (25,000+ points)

**Reward Types:**
- Purchase rewards (1 point per dollar)
- Walking rewards (1 point per 100 meters)
- Referral bonuses
- Fruit rewards (Apple, Banana, Orange, etc.)
- Admin bonus points

### VeryMerchant Facet

**Merchant Management:**
- Profile creation with business details
- KYC document submission and verification
- Multi-signature wallet configuration
- Revenue sharing and fee distribution
- Analytics data collection

**KYC Status Flow:**
1. **Pending** - Initial registration
2. **Under Review** - Documents submitted
3. **Approved** - KYC verified, can process payments
4. **Rejected** - KYC failed
5. **Suspended** - Temporarily disabled

### VeryGovernance Facet

**Governance Features:**
- Proposal creation and voting
- Treasury fund management
- Parameter updates through proposals
- Timelock for proposal execution
- Voting power based on governance tokens

**Proposal Lifecycle:**
1. **Pending** - Waiting for voting to begin
2. **Active** - Voting in progress
3. **Succeeded** - Vote passed, ready for queue
4. **Queued** - In timelock, waiting for execution
5. **Executed** - Successfully executed

## 🛡️ Security Measures

### Access Control
- Role-based permissions using OpenZeppelin AccessControl
- Multi-signature requirements for sensitive operations
- Admin functions protected by ownership checks

### Circuit Breakers
- Automatic failure detection and response
- Manual emergency circuit breakers
- Configurable thresholds and recovery timeouts

### Gas Optimizations
- Packed structs for efficient storage
- Batch processing capabilities
- Optimized loops and data structures
- Binary search algorithms for large datasets

### Additional Security
- Reentrancy guards on all state-changing functions
- Input validation and sanitization
- Timestamp validation for time-sensitive operations
- Signature verification for QR codes

## 🧪 Testing

### Test Coverage

The project includes comprehensive tests covering:

- **Unit Tests** - Individual facet functionality
- **Integration Tests** - Cross-facet interactions
- **Diamond Tests** - EIP-2535 compliance
- **Security Tests** - Attack vectors and edge cases
- **Gas Tests** - Optimization verification

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/VeryPayCore.test.js

# Run with gas reporting
npm run gas

# Generate coverage report
npm run test:coverage
```

### Test Structure

```
test/
├── VeryPayCore.test.js       # Payment processing tests
├── VeryRewards.test.js       # Rewards system tests  
├── VeryMerchant.test.js      # Merchant management tests
├── VeryGovernance.test.js    # Governance tests
├── Diamond.test.js           # Diamond standard tests
├── integration/              # Cross-system tests
└── helpers/                  # Test utilities
```

## 📊 Gas Optimization

### Optimization Techniques Used

1. **Packed Structs** - Multiple values in single storage slot
2. **Batch Operations** - Process multiple items efficiently
3. **Optimized Loops** - Unchecked arithmetic where safe
4. **Efficient Data Structures** - Binary search, merkle proofs
5. **Event Optimization** - Indexed parameters for filtering

### Gas Usage Examples

| Operation | Gas Used | Optimization |
|-----------|----------|-------------|
| Process Payment | ~80,000 | QR validation + transfers |
| Award Points | ~45,000 | Tier calculation + storage |
| Register Merchant | ~120,000 | Profile creation + roles |
| Cast Vote | ~60,000 | Signature verification |

## 🔄 Upgrade Process

The Diamond Standard allows for seamless upgrades:

### Upgrade Types

1. **Add Functions** - New functionality via new facets
2. **Replace Functions** - Update existing function implementations  
3. **Remove Functions** - Deprecate unused functionality

### Upgrade Safety

- All upgrades go through governance proposals
- Timelock delays for safety
- State preservation across upgrades
- Rollback capabilities

### Example Upgrade

```bash
# Deploy new facet
npx hardhat run scripts/upgrade-example.js

# Verify upgrade
npx hardhat run scripts/verify-deployment.js
```

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new functionality
4. Implement the feature
5. Ensure all tests pass (`npm test`)
6. Submit a pull request

### Code Standards

- Follow Solidity style guide
- Include comprehensive NatSpec documentation
- Maintain >90% test coverage
- Use OpenZeppelin contracts for security primitives
- Follow the Diamond Standard patterns

### Security Guidelines

- All functions must include access control
- State changes require reentrancy protection
- Input validation is mandatory
- External calls must be safe
- Follow CEI (Checks-Effects-Interactions) pattern

## 📚 Documentation

### Additional Resources

- [Diamond Standard (EIP-2535)](https://eips.ethereum.org/EIPS/eip-2535)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [VeryPay Whitepaper](https://verypay.com/whitepaper)

### API Documentation

Complete API documentation is available in the `docs/` directory after running:

```bash
npx hardhat docgen
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Acknowledgments

- OpenZeppelin for security libraries
- Diamond Standard community
- Hardhat development framework
- The Ethereum community

## 📞 Support

For questions and support:

- 📧 Email: contracts@verypay.com
- 🐛 Issues: [GitHub Issues](https://github.com/verypay/contracts/issues)
- 💬 Discord: [VeryPay Community](https://discord.gg/verypay)
- 📖 Docs: [documentation.verypay.com](https://documentation.verypay.com)

---

**VeryPay Contracts** - Production-ready smart contracts for the future of merchant payments.

Built with ❤️ by the VeryPay team.