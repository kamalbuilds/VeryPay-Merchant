# VeryPay Smart Contract Architecture

## 1. Architecture Overview

The VeryPay smart contract system uses a modular, upgradeable architecture based on the Diamond Standard (EIP-2535) to enable flexible functionality while maintaining gas efficiency and security.

## 2. Contract Architecture Pattern

### 2.1 Diamond Standard Implementation
```
VeryPayDiamond (Proxy)
├── PaymentFacet
├── MerchantFacet
├── RewardsFacet
├── GovernanceFacet
└── AdminFacet
```

### 2.2 Benefits
- **Upgradeability**: Add/remove/replace functionality without losing state
- **Gas Efficiency**: Single contract address for multiple functionalities
- **Modularity**: Separate concerns into focused facets
- **Size Limits**: Bypass 24KB contract size limit

## 3. Core Smart Contracts

### 3.1 VeryPayDiamond (Main Contract)
```solidity
// Core proxy contract that routes calls to appropriate facets
contract VeryPayDiamond {
    using LibDiamond for DiamondStorage;
    
    constructor(address _contractOwner, address _diamondCutFacet) payable {
        LibDiamond.setContractOwner(_contractOwner);
        LibDiamond.addDiamondFunctions(_diamondCutFacet, diamondCutSelectors);
    }
    
    fallback() external payable {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "Function does not exist");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}
```

### 3.2 PaymentFacet
**Purpose**: Handle all payment-related operations

**Key Functions**:
```solidity
interface IPaymentFacet {
    struct Payment {
        bytes32 id;
        address merchant;
        address customer;
        address token;
        uint256 amount;
        uint256 timestamp;
        PaymentStatus status;
        bytes32 orderId;
    }
    
    enum PaymentStatus { Pending, Completed, Refunded, Failed }
    
    function processPayment(
        address merchant,
        address token,
        uint256 amount,
        bytes32 orderId,
        bytes calldata signature
    ) external payable returns (bytes32 paymentId);
    
    function refundPayment(bytes32 paymentId) external;
    function getPayment(bytes32 paymentId) external view returns (Payment memory);
    function getMerchantPayments(address merchant) external view returns (bytes32[] memory);
}
```

**Gas Optimizations**:
- Batch payment processing
- Efficient data packing
- Minimal storage operations
- Event-based indexing

### 3.3 MerchantFacet
**Purpose**: Manage merchant profiles and settings

**Key Functions**:
```solidity
interface IMerchantFacet {
    struct MerchantProfile {
        bytes32 id;
        address walletAddress;
        string businessName;
        string category;
        bool isVerified;
        uint256 reputationScore;
        uint256 totalTransactions;
        uint256 totalVolume;
        address[] acceptedTokens;
        uint256 createdAt;
    }
    
    function registerMerchant(
        string calldata businessName,
        string calldata category,
        address[] calldata acceptedTokens
    ) external returns (bytes32 merchantId);
    
    function updateMerchantProfile(
        bytes32 merchantId,
        string calldata businessName,
        string calldata category
    ) external;
    
    function addAcceptedToken(bytes32 merchantId, address token) external;
    function verifyMerchant(bytes32 merchantId) external;
    function getMerchantProfile(bytes32 merchantId) external view returns (MerchantProfile memory);
}
```

### 3.4 RewardsFacet
**Purpose**: Calculate and distribute rewards

**Key Functions**:
```solidity
interface IRewardsFacet {
    struct RewardPool {
        address token;
        uint256 totalPool;
        uint256 distributedRewards;
        uint256 rewardRate; // Basis points (1% = 100)
        bool active;
    }
    
    struct MerchantRewards {
        bytes32 merchantId;
        uint256 totalEarned;
        uint256 totalClaimed;
        mapping(address => uint256) tokenBalances;
    }
    
    function calculateRewards(
        bytes32 merchantId,
        uint256 transactionAmount,
        address token
    ) external view returns (uint256 rewardAmount);
    
    function distributeRewards(bytes32 paymentId) external;
    function claimRewards(bytes32 merchantId, address token) external;
    function updateRewardRate(address token, uint256 newRate) external;
    function getMerchantRewards(bytes32 merchantId) external view returns (uint256, uint256);
}
```

### 3.5 GovernanceFacet
**Purpose**: Handle governance and upgrades

**Key Functions**:
```solidity
interface IGovernanceFacet {
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        bytes calldata;
        uint256 startTime;
        uint256 endTime;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        ProposalStatus status;
    }
    
    enum ProposalStatus { Pending, Active, Succeeded, Defeated, Executed }
    
    function createProposal(
        string calldata description,
        bytes calldata callData
    ) external returns (uint256 proposalId);
    
    function vote(uint256 proposalId, bool support, uint256 amount) external;
    function executeProposal(uint256 proposalId) external;
    function getProposal(uint256 proposalId) external view returns (Proposal memory);
}
```

## 4. Storage Architecture

### 4.1 Diamond Storage Pattern
```solidity
library LibAppStorage {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.diamond.storage");
    
    struct AppStorage {
        // Payment Storage
        mapping(bytes32 => Payment) payments;
        mapping(address => bytes32[]) merchantPayments;
        
        // Merchant Storage
        mapping(bytes32 => MerchantProfile) merchants;
        mapping(address => bytes32) walletToMerchant;
        
        // Rewards Storage
        mapping(address => RewardPool) rewardPools;
        mapping(bytes32 => MerchantRewards) merchantRewards;
        
        // Governance Storage
        mapping(uint256 => Proposal) proposals;
        uint256 proposalCounter;
        
        // System Settings
        uint256 platformFee; // Basis points
        address feeRecipient;
        bool paused;
    }
    
    function diamondStorage() internal pure returns (AppStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}
```

### 4.2 Gas Optimization Strategies

#### Struct Packing
```solidity
// Optimized struct packing (saves gas)
struct OptimizedPayment {
    bytes32 id;          // 32 bytes - slot 1
    address merchant;    // 20 bytes - slot 2 (start)
    uint96 amount;       // 12 bytes - slot 2 (end)
    address customer;    // 20 bytes - slot 3 (start)
    uint64 timestamp;    // 8 bytes  - slot 3 (middle)
    uint32 orderId;      // 4 bytes  - slot 3 (end)
    PaymentStatus status; // 1 byte  - slot 4
}
```

#### Batch Operations
```solidity
function batchProcessPayments(
    PaymentRequest[] calldata requests
) external returns (bytes32[] memory paymentIds) {
    paymentIds = new bytes32[](requests.length);
    
    for (uint256 i = 0; i < requests.length; i++) {
        paymentIds[i] = _processPaymentInternal(requests[i]);
    }
    
    emit BatchPaymentsProcessed(paymentIds);
}
```

#### Events for Indexing
```solidity
// Use events instead of storage for queryable but non-critical data
event PaymentProcessed(
    bytes32 indexed paymentId,
    address indexed merchant,
    address indexed customer,
    uint256 amount,
    address token
);

event RewardsDistributed(
    bytes32 indexed merchantId,
    address indexed token,
    uint256 amount
);
```

## 5. Security Architecture

### 5.1 Access Control
```solidity
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract SecurityModule is AccessControlEnumerable {
    bytes32 public constant MERCHANT_ROLE = keccak256("MERCHANT_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    modifier onlyMerchant(bytes32 merchantId) {
        require(
            hasRole(MERCHANT_ROLE, msg.sender) && 
            _isAuthorizedMerchant(msg.sender, merchantId),
            "Unauthorized merchant"
        );
        _;
    }
}
```

### 5.2 Reentrancy Protection
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PaymentFacet is ReentrancyGuard {
    function processPayment(...) external nonReentrant returns (bytes32) {
        // Implementation
    }
}
```

### 5.3 Circuit Breaker Pattern
```solidity
contract EmergencyStop {
    bool public paused = false;
    address public admin;
    
    modifier notPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    function emergencyStop() external onlyAdmin {
        paused = true;
        emit EmergencyStopActivated();
    }
}
```

## 6. Integration Interfaces

### 6.1 ERC-20 Token Support
```solidity
interface IERC20Extended {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
}
```

### 6.2 Oracle Integration
```solidity
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract PriceOracle {
    mapping(address => AggregatorV3Interface) public priceFeeds;
    
    function getPrice(address token) external view returns (uint256) {
        AggregatorV3Interface priceFeed = priceFeeds[token];
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return uint256(price);
    }
}
```

## 7. Upgrade Strategy

### 7.1 Diamond Cut Process
```solidity
// Adding new facet
FacetCut[] memory cut = new FacetCut[](1);
cut[0] = FacetCut({
    facetAddress: newFacetAddress,
    action: FacetCutAction.Add,
    functionSelectors: selectors
});

IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
```

### 7.2 Migration Scripts
```solidity
contract MigrationFacet {
    function migrateData(bytes calldata migrationData) external onlyAdmin {
        // Data migration logic
        // Emit migration events for transparency
        emit DataMigrated(migrationData);
    }
}
```

## 8. Gas Estimation and Optimization

### 8.1 Function Gas Costs (Estimated)
- `processPayment`: ~80,000 gas
- `registerMerchant`: ~150,000 gas
- `claimRewards`: ~65,000 gas
- `batchProcessPayments` (10 payments): ~600,000 gas

### 8.2 Optimization Techniques
1. **Storage Optimization**: Pack structs efficiently
2. **Batch Operations**: Group multiple operations
3. **Event Indexing**: Use events for queryable data
4. **Library Usage**: Deploy common logic as libraries
5. **Assembly Optimization**: Use assembly for critical paths

## 9. Testing Strategy

### 9.1 Unit Testing
```solidity
// Example test structure
contract PaymentFacetTest is Test {
    VeryPayDiamond diamond;
    PaymentFacet paymentFacet;
    
    function testProcessPayment() public {
        // Test successful payment processing
        bytes32 paymentId = paymentFacet.processPayment(
            merchant,
            token,
            amount,
            orderId,
            signature
        );
        
        Payment memory payment = paymentFacet.getPayment(paymentId);
        assertEq(payment.status, PaymentStatus.Completed);
    }
}
```

### 9.2 Integration Testing
```solidity
contract IntegrationTest is Test {
    function testFullPaymentFlow() public {
        // Test complete payment flow including rewards
    }
}
```

## 10. Deployment Strategy

### 10.1 Deployment Order
1. Deploy DiamondCutFacet
2. Deploy VeryPayDiamond
3. Deploy and add PaymentFacet
4. Deploy and add MerchantFacet
5. Deploy and add RewardsFacet
6. Deploy and add GovernanceFacet
7. Initialize system parameters

### 10.2 Environment Configuration
```solidity
// Deployment script
contract DeployScript {
    function deploy() external {
        address diamond = deployDiamond();
        address paymentFacet = deployPaymentFacet();
        // ... deploy other facets
        
        addFacetsToDiamond(diamond, facets);
        initializeSystem(diamond);
    }
}
```

This smart contract architecture provides a robust, scalable, and upgradeable foundation for the VeryPay Merchant dApp.