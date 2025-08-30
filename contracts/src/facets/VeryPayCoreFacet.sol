// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import "../interfaces/IVeryPayCore.sol";
import "../libraries/LibDiamond.sol";

/**
 * @title VeryPayCoreFacet
 * @notice Core payment processing facet for VeryPay system
 * @dev Implements $VERY payments with 0 gas fees, QR validation, and merchant management
 */
contract VeryPayCoreFacet is IVeryPayCore, ReentrancyGuard, Pausable, AccessControl {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice Role for payment processors
    bytes32 public constant PAYMENT_PROCESSOR_ROLE = keccak256("PAYMENT_PROCESSOR_ROLE");
    
    /// @notice Role for merchant managers
    bytes32 public constant MERCHANT_MANAGER_ROLE = keccak256("MERCHANT_MANAGER_ROLE");
    
    /// @notice Role for KYC verifiers
    bytes32 public constant KYC_VERIFIER_ROLE = keccak256("KYC_VERIFIER_ROLE");

    /// @notice Maximum payment amount to prevent large unauthorized transactions
    uint256 public constant MAX_PAYMENT_AMOUNT = 1_000_000 * 10**18; // 1M VERY tokens

    /// @notice QR code expiration time (5 minutes)
    uint256 public constant QR_EXPIRY_TIME = 300;

    /// @notice Storage structure for VeryPayCore
    struct VeryPayStorage {
        IERC20 veryToken;
        mapping(address => MerchantInfo) merchants;
        mapping(bytes32 => PaymentTransaction) payments;
        mapping(bytes32 => bool) usedQRCodes;
        mapping(address => bool) authorizedProcessors;
        uint256 totalVolume;
        uint256 totalTransactions;
        uint256 platformFee; // Basis points (e.g., 250 = 2.5%)
        address feeRecipient;
        bytes32[] paymentHistory;
    }

    /// @notice Storage slot for VeryPayCore data
    bytes32 constant VERY_PAY_STORAGE_POSITION = keccak256("verypay.core.storage");

    /// @notice Get storage
    function veryPayStorage() internal pure returns (VeryPayStorage storage vps) {
        bytes32 position = VERY_PAY_STORAGE_POSITION;
        assembly {
            vps.slot := position
        }
    }

    /// @notice Modifier to check if caller is authorized payment processor
    modifier onlyPaymentProcessor() {
        require(
            hasRole(PAYMENT_PROCESSOR_ROLE, msg.sender) || 
            veryPayStorage().authorizedProcessors[msg.sender],
            "VeryPayCore: Not authorized payment processor"
        );
        _;
    }

    /// @notice Modifier to check if merchant is valid
    modifier onlyValidMerchant(address merchant) {
        require(_isValidMerchant(merchant), "VeryPayCore: Invalid merchant");
        _;
    }

    /**
     * @notice Initialize VeryPayCore facet
     * @param _veryToken Address of $VERY token contract
     * @param _feeRecipient Address to receive platform fees
     * @param _platformFee Platform fee in basis points
     */
    function initializeVeryPayCore(
        address _veryToken,
        address _feeRecipient,
        uint256 _platformFee
    ) external {
        LibDiamond.enforceIsContractOwner();
        
        VeryPayStorage storage vps = veryPayStorage();
        require(address(vps.veryToken) == address(0), "VeryPayCore: Already initialized");
        
        vps.veryToken = IERC20(_veryToken);
        vps.feeRecipient = _feeRecipient;
        vps.platformFee = _platformFee;
        
        // Set up initial roles
        _grantRole(DEFAULT_ADMIN_ROLE, LibDiamond.contractOwner());
        _grantRole(PAYMENT_PROCESSOR_ROLE, LibDiamond.contractOwner());
        _grantRole(MERCHANT_MANAGER_ROLE, LibDiamond.contractOwner());
        _grantRole(KYC_VERIFIER_ROLE, LibDiamond.contractOwner());
    }

    /**
     * @inheritdoc IVeryPayCore
     */
    function processPayment(
        address merchant,
        uint256 amount,
        bytes calldata qrData,
        string calldata metadata
    ) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
        onlyValidMerchant(merchant)
        returns (bytes32 paymentId) 
    {
        require(amount > 0 && amount <= MAX_PAYMENT_AMOUNT, "VeryPayCore: Invalid amount");
        
        // Validate QR code
        require(validateQRCode(qrData, merchant, amount), "VeryPayCore: Invalid QR code");
        
        VeryPayStorage storage vps = veryPayStorage();
        
        // Generate unique payment ID
        paymentId = keccak256(abi.encodePacked(
            merchant,
            msg.sender,
            amount,
            block.timestamp,
            block.number
        ));
        
        // Check for duplicate payment
        require(vps.payments[paymentId].paymentId == bytes32(0), "VeryPayCore: Duplicate payment");
        
        // Calculate fees
        uint256 fee = (amount * vps.platformFee) / 10000;
        uint256 merchantAmount = amount - fee;
        
        // Transfer tokens
        require(
            vps.veryToken.transferFrom(msg.sender, merchant, merchantAmount),
            "VeryPayCore: Transfer to merchant failed"
        );
        
        if (fee > 0) {
            require(
                vps.veryToken.transferFrom(msg.sender, vps.feeRecipient, fee),
                "VeryPayCore: Fee transfer failed"
            );
        }
        
        // Record payment
        vps.payments[paymentId] = PaymentTransaction({
            paymentId: paymentId,
            merchant: merchant,
            customer: msg.sender,
            amount: amount,
            status: PaymentStatus.Completed,
            timestamp: block.timestamp,
            qrHash: keccak256(qrData),
            metadata: metadata
        });
        
        // Update statistics
        vps.merchants[merchant].totalVolume += amount;
        vps.merchants[merchant].transactionCount += 1;
        vps.totalVolume += amount;
        vps.totalTransactions += 1;
        vps.paymentHistory.push(paymentId);
        
        // Mark QR code as used
        bytes32 qrHash = keccak256(qrData);
        vps.usedQRCodes[qrHash] = true;
        
        emit PaymentProcessed(paymentId, merchant, msg.sender, amount, block.timestamp);
        
        return paymentId;
    }

    /**
     * @inheritdoc IVeryPayCore
     */
    function registerMerchant(
        string calldata businessName,
        string calldata category,
        bytes calldata kycData
    ) external override {
        VeryPayStorage storage vps = veryPayStorage();
        
        require(bytes(businessName).length > 0, "VeryPayCore: Business name required");
        require(bytes(category).length > 0, "VeryPayCore: Category required");
        require(!vps.merchants[msg.sender].isActive, "VeryPayCore: Merchant already registered");
        
        vps.merchants[msg.sender] = MerchantInfo({
            businessName: businessName,
            category: category,
            isActive: true,
            kycVerified: false, // Requires separate verification
            totalVolume: 0,
            transactionCount: 0,
            registeredAt: block.timestamp
        });
        
        emit MerchantRegistered(msg.sender, businessName, category);
    }

    /**
     * @inheritdoc IVeryPayCore
     */
    function validateQRCode(
        bytes calldata qrData,
        address merchant,
        uint256 amount
    ) public view override returns (bool isValid) {
        if (qrData.length < 96) return false; // Minimum data length
        
        // Decode QR data: [merchant(32), amount(32), timestamp(32), signature(32+)]
        address qrMerchant;
        uint256 qrAmount;
        uint256 timestamp;
        bytes memory signature;
        
        assembly {
            qrMerchant := mload(add(qrData.offset, 0x20))
            qrAmount := mload(add(qrData.offset, 0x40))
            timestamp := mload(add(qrData.offset, 0x60))
        }
        
        signature = qrData[96:];
        
        // Basic validation
        if (qrMerchant != merchant || qrAmount != amount) return false;
        
        // Check expiry
        if (block.timestamp > timestamp + QR_EXPIRY_TIME) return false;
        
        // Check if QR code already used
        VeryPayStorage storage vps = veryPayStorage();
        bytes32 qrHash = keccak256(qrData);
        if (vps.usedQRCodes[qrHash]) return false;
        
        // Verify signature (merchant must have signed the QR data)
        bytes32 messageHash = keccak256(abi.encodePacked(merchant, amount, timestamp));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        return recoveredSigner == merchant;
    }

    /**
     * @inheritdoc IVeryPayCore
     */
    function getMerchantInfo(address merchant)
        external
        view
        override
        returns (MerchantInfo memory info)
    {
        return veryPayStorage().merchants[merchant];
    }

    /**
     * @inheritdoc IVeryPayCore
     */
    function getPaymentTransaction(bytes32 paymentId)
        external
        view
        override
        returns (PaymentTransaction memory transaction)
    {
        return veryPayStorage().payments[paymentId];
    }

    /**
     * @notice Verify merchant KYC status
     * @param merchant Merchant address
     * @param verified KYC verification status
     */
    function verifyMerchantKYC(address merchant, bool verified) 
        external 
        onlyRole(KYC_VERIFIER_ROLE) 
    {
        VeryPayStorage storage vps = veryPayStorage();
        require(vps.merchants[merchant].isActive, "VeryPayCore: Merchant not registered");
        
        vps.merchants[merchant].kycVerified = verified;
        
        emit MerchantKYCUpdated(merchant, verified);
    }

    /**
     * @notice Update platform fee
     * @param newFee New platform fee in basis points
     */
    function updatePlatformFee(uint256 newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFee <= 1000, "VeryPayCore: Fee too high"); // Max 10%
        
        VeryPayStorage storage vps = veryPayStorage();
        uint256 oldFee = vps.platformFee;
        vps.platformFee = newFee;
        
        emit PlatformFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Set fee recipient address
     * @param newRecipient New fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRecipient != address(0), "VeryPayCore: Zero address");
        
        VeryPayStorage storage vps = veryPayStorage();
        address oldRecipient = vps.feeRecipient;
        vps.feeRecipient = newRecipient;
        
        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }

    /**
     * @notice Add authorized payment processor
     * @param processor Processor address to authorize
     */
    function addPaymentProcessor(address processor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        VeryPayStorage storage vps = veryPayStorage();
        vps.authorizedProcessors[processor] = true;
        emit PaymentProcessorAdded(processor);
    }

    /**
     * @notice Remove authorized payment processor
     * @param processor Processor address to remove
     */
    function removePaymentProcessor(address processor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        VeryPayStorage storage vps = veryPayStorage();
        vps.authorizedProcessors[processor] = false;
        emit PaymentProcessorRemoved(processor);
    }

    /**
     * @notice Get payment statistics
     * @return totalVol Total payment volume
     * @return totalTxns Total number of transactions
     */
    function getPaymentStats() external view returns (uint256 totalVol, uint256 totalTxns) {
        VeryPayStorage storage vps = veryPayStorage();
        return (vps.totalVolume, vps.totalTransactions);
    }

    /**
     * @notice Get recent payments
     * @param limit Number of recent payments to return
     * @return paymentIds Array of recent payment IDs
     */
    function getRecentPayments(uint256 limit) 
        external 
        view 
        returns (bytes32[] memory paymentIds) 
    {
        VeryPayStorage storage vps = veryPayStorage();
        uint256 totalPayments = vps.paymentHistory.length;
        
        if (totalPayments == 0) return new bytes32[](0);
        
        uint256 returnCount = limit > totalPayments ? totalPayments : limit;
        paymentIds = new bytes32[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            paymentIds[i] = vps.paymentHistory[totalPayments - 1 - i];
        }
    }

    /**
     * @notice Emergency pause function
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause function
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Internal function to check if merchant is valid
     */
    function _isValidMerchant(address merchant) internal view returns (bool) {
        VeryPayStorage storage vps = veryPayStorage();
        MerchantInfo storage info = vps.merchants[merchant];
        return info.isActive && info.kycVerified;
    }

    /// @notice Additional events for admin functions
    event MerchantKYCUpdated(address indexed merchant, bool verified);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event PaymentProcessorAdded(address indexed processor);
    event PaymentProcessorRemoved(address indexed processor);
}