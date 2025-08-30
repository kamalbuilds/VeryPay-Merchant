// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/IVeryMerchant.sol";
import "../libraries/LibDiamond.sol";

/**
 * @title VeryMerchantFacet
 * @notice Merchant management facet for VeryPay system
 * @dev Handles merchant onboarding, KYC verification, multi-sig wallets, and analytics
 */
contract VeryMerchantFacet is IVeryMerchant, ReentrancyGuard, Pausable, AccessControl {
    using ECDSA for bytes32;

    /// @notice Role for KYC managers
    bytes32 public constant KYC_MANAGER_ROLE = keccak256("KYC_MANAGER_ROLE");
    
    /// @notice Role for revenue managers
    bytes32 public constant REVENUE_MANAGER_ROLE = keccak256("REVENUE_MANAGER_ROLE");
    
    /// @notice Role for analytics managers
    bytes32 public constant ANALYTICS_MANAGER_ROLE = keccak256("ANALYTICS_MANAGER_ROLE");

    /// @notice Maximum number of signers for multi-sig wallet
    uint256 public constant MAX_SIGNERS = 10;

    /// @notice Minimum required signatures
    uint256 public constant MIN_REQUIRED_SIGNATURES = 2;

    /// @notice Maximum platform fee (10%)
    uint256 public constant MAX_PLATFORM_FEE = 1000;

    /// @notice Storage structure for VeryMerchant
    struct VeryMerchantStorage {
        mapping(address => MerchantProfile) merchantProfiles;
        mapping(address => RevenueConfig) revenueConfigs;
        mapping(address => mapping(string => uint256)) merchantAnalytics;
        mapping(address => mapping(bytes32 => bool)) executedTransactions;
        mapping(address => bytes32[]) merchantTransactionHistory;
        mapping(address => mapping(string => uint256)) categoryBreakdowns;
        mapping(bytes32 => bool) usedDocumentHashes;
        IERC20 veryToken;
        address defaultFeeRecipient;
        uint256 defaultPlatformFee;
        uint256 totalMerchants;
        uint256 verifiedMerchants;
        uint256 totalRevenue;
    }

    /// @notice Storage slot for VeryMerchant data
    bytes32 constant VERY_MERCHANT_STORAGE_POSITION = keccak256("verypay.merchant.storage");

    /// @notice Get storage
    function veryMerchantStorage() internal pure returns (VeryMerchantStorage storage vms) {
        bytes32 position = VERY_MERCHANT_STORAGE_POSITION;
        assembly {
            vms.slot := position
        }
    }

    /// @notice Modifier to check if merchant profile exists
    modifier merchantExists(address merchant) {
        require(
            bytes(veryMerchantStorage().merchantProfiles[merchant].businessName).length > 0,
            "VeryMerchant: Merchant not found"
        );
        _;
    }

    /// @notice Modifier to validate multi-sig parameters
    modifier validMultiSigParams(address[] calldata signers, uint256 requiredSigs) {
        require(signers.length > 0 && signers.length <= MAX_SIGNERS, "VeryMerchant: Invalid signers count");
        require(
            requiredSigs >= MIN_REQUIRED_SIGNATURES && requiredSigs <= signers.length,
            "VeryMerchant: Invalid required signatures"
        );
        _;
    }

    /**
     * @notice Initialize VeryMerchant facet
     * @param _veryToken Address of $VERY token contract
     * @param _defaultFeeRecipient Default fee recipient address
     * @param _defaultPlatformFee Default platform fee in basis points
     */
    function initializeVeryMerchant(
        address _veryToken,
        address _defaultFeeRecipient,
        uint256 _defaultPlatformFee
    ) external {
        LibDiamond.enforceIsContractOwner();
        
        VeryMerchantStorage storage vms = veryMerchantStorage();
        require(address(vms.veryToken) == address(0), "VeryMerchant: Already initialized");
        
        vms.veryToken = IERC20(_veryToken);
        vms.defaultFeeRecipient = _defaultFeeRecipient;
        vms.defaultPlatformFee = _defaultPlatformFee;
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, LibDiamond.contractOwner());
        _grantRole(KYC_MANAGER_ROLE, LibDiamond.contractOwner());
        _grantRole(REVENUE_MANAGER_ROLE, LibDiamond.contractOwner());
        _grantRole(ANALYTICS_MANAGER_ROLE, LibDiamond.contractOwner());
    }

    /**
     * @inheritdoc IVeryMerchant
     */
    function createMerchantProfile(
        string calldata businessName,
        string calldata businessType,
        string calldata contactEmail,
        string calldata businessAddress,
        string calldata taxId,
        address[] calldata signers,
        uint256 requiredSigs
    ) 
        external 
        override 
        validMultiSigParams(signers, requiredSigs)
    {
        require(bytes(businessName).length > 0, "VeryMerchant: Business name required");
        require(bytes(businessType).length > 0, "VeryMerchant: Business type required");
        require(bytes(contactEmail).length > 0, "VeryMerchant: Contact email required");
        
        VeryMerchantStorage storage vms = veryMerchantStorage();
        
        // Check if merchant already exists
        require(
            bytes(vms.merchantProfiles[msg.sender].businessName).length == 0,
            "VeryMerchant: Merchant already exists"
        );
        
        // Validate signers are unique and not zero address
        for (uint256 i = 0; i < signers.length; i++) {
            require(signers[i] != address(0), "VeryMerchant: Invalid signer address");
            for (uint256 j = i + 1; j < signers.length; j++) {
                require(signers[i] != signers[j], "VeryMerchant: Duplicate signer");
            }
        }
        
        // Create merchant profile
        vms.merchantProfiles[msg.sender] = MerchantProfile({
            businessName: businessName,
            businessType: businessType,
            contactEmail: contactEmail,
            businessAddress: businessAddress,
            taxId: taxId,
            kycStatus: KYCStatus.Pending,
            status: MerchantStatus.Inactive,
            registrationDate: block.timestamp,
            lastUpdate: block.timestamp,
            signers: signers,
            requiredSignatures: requiredSigs
        });
        
        // Initialize revenue config with defaults
        vms.revenueConfigs[msg.sender] = RevenueConfig({
            platformFee: vms.defaultPlatformFee,
            merchantShare: 10000 - vms.defaultPlatformFee, // Remainder goes to merchant
            feeRecipient: vms.defaultFeeRecipient,
            isActive: true
        });
        
        vms.totalMerchants++;
        
        emit MerchantProfileCreated(msg.sender, businessName, businessType);
    }

    /**
     * @inheritdoc IVeryMerchant
     */
    function submitKYCDocuments(
        bytes calldata kycData,
        bytes32[] calldata documentHashes
    ) external override merchantExists(msg.sender) {
        require(kycData.length > 0, "VeryMerchant: KYC data required");
        require(documentHashes.length > 0, "VeryMerchant: Document hashes required");
        
        VeryMerchantStorage storage vms = veryMerchantStorage();
        
        // Check that documents haven't been used before
        for (uint256 i = 0; i < documentHashes.length; i++) {
            require(!vms.usedDocumentHashes[documentHashes[i]], "VeryMerchant: Document already used");
            vms.usedDocumentHashes[documentHashes[i]] = true;
        }
        
        // Update KYC status to under review
        vms.merchantProfiles[msg.sender].kycStatus = KYCStatus.UnderReview;
        vms.merchantProfiles[msg.sender].lastUpdate = block.timestamp;
        
        emit KYCDocumentsSubmitted(msg.sender, documentHashes);
    }

    /**
     * @inheritdoc IVeryMerchant
     */
    function updateKYCStatus(
        address merchant,
        KYCStatus status,
        string calldata reason
    ) external override onlyRole(KYC_MANAGER_ROLE) merchantExists(merchant) {
        VeryMerchantStorage storage vms = veryMerchantStorage();
        
        KYCStatus oldStatus = vms.merchantProfiles[merchant].kycStatus;
        vms.merchantProfiles[merchant].kycStatus = status;
        vms.merchantProfiles[merchant].lastUpdate = block.timestamp;
        
        // Update merchant status based on KYC status
        if (status == KYCStatus.Approved) {
            vms.merchantProfiles[merchant].status = MerchantStatus.Active;
            vms.verifiedMerchants++;
        } else if (status == KYCStatus.Rejected || status == KYCStatus.Suspended) {
            vms.merchantProfiles[merchant].status = MerchantStatus.Suspended;
            if (oldStatus == KYCStatus.Approved) {
                vms.verifiedMerchants--;
            }
        }
        
        emit KYCStatusUpdated(merchant, oldStatus, status);
        emit KYCStatusUpdateReason(merchant, reason);
    }

    /**
     * @inheritdoc IVeryMerchant
     */
    function executeMultiSigTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        bytes[] calldata signatures
    ) external override merchantExists(msg.sender) returns (bool success) {
        VeryMerchantStorage storage vms = veryMerchantStorage();
        MerchantProfile storage profile = vms.merchantProfiles[msg.sender];
        
        require(signatures.length >= profile.requiredSignatures, "VeryMerchant: Insufficient signatures");
        
        // Create transaction hash
        bytes32 txHash = keccak256(abi.encodePacked(msg.sender, to, value, data, block.timestamp));
        require(!vms.executedTransactions[msg.sender][txHash], "VeryMerchant: Transaction already executed");
        
        // Verify signatures
        bytes32 messageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            txHash
        ));
        
        address[] memory recoveredSigners = new address[](signatures.length);
        uint256 validSignatures = 0;
        
        for (uint256 i = 0; i < signatures.length; i++) {
            address recovered = messageHash.recover(signatures[i]);
            
            // Check if recovered address is a valid signer
            bool isValidSigner = false;
            for (uint256 j = 0; j < profile.signers.length; j++) {
                if (profile.signers[j] == recovered) {
                    isValidSigner = true;
                    break;
                }
            }
            
            if (isValidSigner) {
                // Check for duplicate signatures
                bool isDuplicate = false;
                for (uint256 k = 0; k < validSignatures; k++) {
                    if (recoveredSigners[k] == recovered) {
                        isDuplicate = true;
                        break;
                    }
                }
                
                if (!isDuplicate) {
                    recoveredSigners[validSignatures] = recovered;
                    validSignatures++;
                }
            }
        }
        
        require(validSignatures >= profile.requiredSignatures, "VeryMerchant: Invalid signatures");
        
        // Mark transaction as executed
        vms.executedTransactions[msg.sender][txHash] = true;
        vms.merchantTransactionHistory[msg.sender].push(txHash);
        
        // Execute transaction (for now, just emit event - actual execution would need more careful implementation)
        emit MultiSigTransactionExecuted(msg.sender, to, value, data, txHash);
        
        return true;
    }

    /**
     * @inheritdoc IVeryMerchant
     */
    function distributeRevenue(
        address merchant,
        uint256 amount,
        bytes calldata transactionData
    ) external override onlyRole(REVENUE_MANAGER_ROLE) merchantExists(merchant) nonReentrant {
        require(amount > 0, "VeryMerchant: Zero amount");
        
        VeryMerchantStorage storage vms = veryMerchantStorage();
        RevenueConfig storage config = vms.revenueConfigs[merchant];
        
        require(config.isActive, "VeryMerchant: Revenue distribution inactive");
        
        // Calculate fees
        uint256 platformFee = (amount * config.platformFee) / 10000;
        uint256 merchantRevenue = amount - platformFee;
        
        // Transfer platform fee
        if (platformFee > 0) {
            require(
                vms.veryToken.transfer(config.feeRecipient, platformFee),
                "VeryMerchant: Fee transfer failed"
            );
        }
        
        // Transfer merchant revenue
        require(
            vms.veryToken.transfer(merchant, merchantRevenue),
            "VeryMerchant: Revenue transfer failed"
        );
        
        vms.totalRevenue += amount;
        
        emit RevenueDistributed(merchant, merchantRevenue, platformFee);
    }

    /**
     * @inheritdoc IVeryMerchant
     */
    function updateRevenueConfig(
        address merchant,
        RevenueConfig calldata config
    ) external override onlyRole(REVENUE_MANAGER_ROLE) merchantExists(merchant) {
        require(config.platformFee <= MAX_PLATFORM_FEE, "VeryMerchant: Fee too high");
        require(config.feeRecipient != address(0), "VeryMerchant: Invalid fee recipient");
        
        VeryMerchantStorage storage vms = veryMerchantStorage();
        vms.revenueConfigs[merchant] = config;
        
        emit RevenueConfigUpdated(merchant, config.platformFee, config.feeRecipient);
    }

    /**
     * @inheritdoc IVeryMerchant
     */
    function recordAnalytics(
        address merchant,
        uint256 transactionAmount,
        string calldata category
    ) external override onlyRole(ANALYTICS_MANAGER_ROLE) merchantExists(merchant) {
        VeryMerchantStorage storage vms = veryMerchantStorage();
        
        // Record analytics
        vms.merchantAnalytics[merchant]["totalVolume"] += transactionAmount;
        vms.merchantAnalytics[merchant]["transactionCount"] += 1;
        vms.merchantAnalytics[merchant]["lastTransaction"] = block.timestamp;
        
        // Update category breakdown
        vms.categoryBreakdowns[merchant][category] += transactionAmount;
        
        emit AnalyticsRecorded(merchant, transactionAmount, category);
    }

    /**
     * @inheritdoc IVeryMerchant
     */
    function getMerchantProfile(address merchant)
        external
        view
        override
        returns (MerchantProfile memory profile)
    {
        return veryMerchantStorage().merchantProfiles[merchant];
    }

    /**
     * @inheritdoc IVeryMerchant
     */
    function getMerchantAnalytics(address merchant, string calldata timeframe)
        external
        view
        override
        returns (uint256 totalVolume, uint256 transactionCount, uint256 averageTransaction)
    {
        VeryMerchantStorage storage vms = veryMerchantStorage();
        
        totalVolume = vms.merchantAnalytics[merchant]["totalVolume"];
        transactionCount = vms.merchantAnalytics[merchant]["transactionCount"];
        
        averageTransaction = transactionCount > 0 ? totalVolume / transactionCount : 0;
        
        // Note: timeframe filtering would require additional timestamp tracking
        timeframe; // Suppress unused parameter warning
    }

    /**
     * @inheritdoc IVeryMerchant
     */
    function canProcessPayments(address merchant)
        external
        view
        override
        returns (bool canProcess)
    {
        VeryMerchantStorage storage vms = veryMerchantStorage();
        MerchantProfile storage profile = vms.merchantProfiles[merchant];
        
        return profile.kycStatus == KYCStatus.Approved && 
               profile.status == MerchantStatus.Active;
    }

    /**
     * @notice Get merchant revenue configuration
     * @param merchant Merchant address
     * @return config Revenue configuration
     */
    function getRevenueConfig(address merchant) 
        external 
        view 
        returns (RevenueConfig memory config) 
    {
        return veryMerchantStorage().revenueConfigs[merchant];
    }

    /**
     * @notice Get merchant category breakdown
     * @param merchant Merchant address
     * @param category Category name
     * @return amount Amount in category
     */
    function getCategoryBreakdown(address merchant, string calldata category) 
        external 
        view 
        returns (uint256 amount) 
    {
        return veryMerchantStorage().categoryBreakdowns[merchant][category];
    }

    /**
     * @notice Get merchant transaction history
     * @param merchant Merchant address
     * @param limit Number of transactions to return
     * @return txHashes Array of transaction hashes
     */
    function getMerchantTransactionHistory(address merchant, uint256 limit) 
        external 
        view 
        returns (bytes32[] memory txHashes) 
    {
        VeryMerchantStorage storage vms = veryMerchantStorage();
        bytes32[] storage history = vms.merchantTransactionHistory[merchant];
        
        uint256 totalTxs = history.length;
        if (totalTxs == 0) return new bytes32[](0);
        
        uint256 returnCount = limit > totalTxs ? totalTxs : limit;
        txHashes = new bytes32[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            txHashes[i] = history[totalTxs - 1 - i];
        }
    }

    /**
     * @notice Get platform statistics
     * @return totalMerchants Total registered merchants
     * @return verifiedMerchants Number of verified merchants
     * @return totalRevenue Total revenue processed
     */
    function getPlatformStats() 
        external 
        view 
        returns (uint256 totalMerchants, uint256 verifiedMerchants, uint256 totalRevenue) 
    {
        VeryMerchantStorage storage vms = veryMerchantStorage();
        return (vms.totalMerchants, vms.verifiedMerchants, vms.totalRevenue);
    }

    /**
     * @notice Update merchant signers
     * @param newSigners Array of new signer addresses
     * @param newRequiredSigs New required signature count
     */
    function updateMerchantSigners(
        address[] calldata newSigners,
        uint256 newRequiredSigs
    ) external merchantExists(msg.sender) validMultiSigParams(newSigners, newRequiredSigs) {
        VeryMerchantStorage storage vms = veryMerchantStorage();
        MerchantProfile storage profile = vms.merchantProfiles[msg.sender];
        
        profile.signers = newSigners;
        profile.requiredSignatures = newRequiredSigs;
        profile.lastUpdate = block.timestamp;
        
        emit MerchantSignersUpdated(msg.sender, newSigners, newRequiredSigs);
    }

    /**
     * @notice Suspend merchant
     * @param merchant Merchant address
     * @param reason Reason for suspension
     */
    function suspendMerchant(address merchant, string calldata reason) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        merchantExists(merchant) 
    {
        VeryMerchantStorage storage vms = veryMerchantStorage();
        vms.merchantProfiles[merchant].status = MerchantStatus.Suspended;
        vms.merchantProfiles[merchant].lastUpdate = block.timestamp;
        
        emit MerchantSuspended(merchant, reason);
    }

    /**
     * @notice Reactivate merchant
     * @param merchant Merchant address
     */
    function reactivateMerchant(address merchant) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        merchantExists(merchant) 
    {
        VeryMerchantStorage storage vms = veryMerchantStorage();
        MerchantProfile storage profile = vms.merchantProfiles[merchant];
        
        require(profile.kycStatus == KYCStatus.Approved, "VeryMerchant: KYC not approved");
        
        profile.status = MerchantStatus.Active;
        profile.lastUpdate = block.timestamp;
        
        emit MerchantReactivated(merchant);
    }

    /**
     * @notice Emergency pause
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Additional events
    event KYCDocumentsSubmitted(address indexed merchant, bytes32[] documentHashes);
    event KYCStatusUpdateReason(address indexed merchant, string reason);
    event MultiSigTransactionExecuted(
        address indexed merchant,
        address indexed to,
        uint256 value,
        bytes data,
        bytes32 txHash
    );
    event RevenueConfigUpdated(address indexed merchant, uint256 platformFee, address feeRecipient);
    event AnalyticsRecorded(address indexed merchant, uint256 amount, string category);
    event MerchantSignersUpdated(address indexed merchant, address[] signers, uint256 requiredSignatures);
    event MerchantSuspended(address indexed merchant, string reason);
    event MerchantReactivated(address indexed merchant);
}