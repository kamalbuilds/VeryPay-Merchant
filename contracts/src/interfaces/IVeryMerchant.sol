// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IVeryMerchant
 * @notice Interface for VeryPay Merchant management system
 * @dev Merchant onboarding, KYC verification, and multi-signature wallet management
 */
interface IVeryMerchant {
    /// @notice KYC status enumeration
    enum KYCStatus {
        Pending,
        UnderReview,
        Approved,
        Rejected,
        Suspended
    }

    /// @notice Merchant status enumeration
    enum MerchantStatus {
        Inactive,
        Active,
        Suspended,
        Terminated
    }

    /// @notice Merchant profile structure
    struct MerchantProfile {
        string businessName;
        string businessType;
        string contactEmail;
        string businessAddress;
        string taxId;
        KYCStatus kycStatus;
        MerchantStatus status;
        uint256 registrationDate;
        uint256 lastUpdate;
        address[] signers;
        uint256 requiredSignatures;
    }

    /// @notice Revenue sharing configuration
    struct RevenueConfig {
        uint256 platformFee; // Basis points (e.g., 250 = 2.5%)
        uint256 merchantShare; // Basis points
        address feeRecipient;
        bool isActive;
    }

    /// @notice Analytics data structure
    struct MerchantAnalytics {
        uint256 totalVolume;
        uint256 transactionCount;
        uint256 averageTransaction;
        uint256 monthlyVolume;
        uint256 topPerformingDay;
        mapping(string => uint256) categoryBreakdown;
    }

    /// @notice Emitted when merchant profile is created
    /// @param merchant Merchant address
    /// @param businessName Business name
    /// @param businessType Business type
    event MerchantProfileCreated(
        address indexed merchant,
        string businessName,
        string businessType
    );

    /// @notice Emitted when KYC status is updated
    /// @param merchant Merchant address
    /// @param oldStatus Previous KYC status
    /// @param newStatus New KYC status
    event KYCStatusUpdated(
        address indexed merchant,
        KYCStatus oldStatus,
        KYCStatus newStatus
    );

    /// @notice Emitted when revenue is distributed
    /// @param merchant Merchant address
    /// @param amount Revenue amount
    /// @param platformFee Fee taken by platform
    event RevenueDistributed(
        address indexed merchant,
        uint256 amount,
        uint256 platformFee
    );

    /**
     * @notice Create merchant profile
     * @param businessName Name of the business
     * @param businessType Type/category of business
     * @param contactEmail Contact email address
     * @param businessAddress Physical business address
     * @param taxId Tax identification number
     * @param signers Array of authorized signers
     * @param requiredSigs Number of required signatures
     */
    function createMerchantProfile(
        string calldata businessName,
        string calldata businessType,
        string calldata contactEmail,
        string calldata businessAddress,
        string calldata taxId,
        address[] calldata signers,
        uint256 requiredSigs
    ) external;

    /**
     * @notice Submit KYC documentation
     * @param kycData Encrypted KYC documentation
     * @param documentHashes Array of document hashes for verification
     */
    function submitKYCDocuments(
        bytes calldata kycData,
        bytes32[] calldata documentHashes
    ) external;

    /**
     * @notice Update KYC status (admin only)
     * @param merchant Merchant address
     * @param status New KYC status
     * @param reason Reason for status change
     */
    function updateKYCStatus(
        address merchant,
        KYCStatus status,
        string calldata reason
    ) external;

    /**
     * @notice Execute multi-signature transaction
     * @param to Transaction recipient
     * @param value Transaction value
     * @param data Transaction data
     * @param signatures Array of signatures
     * @return success Whether transaction was successful
     */
    function executeMultiSigTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        bytes[] calldata signatures
    ) external returns (bool success);

    /**
     * @notice Distribute revenue to merchant
     * @param merchant Merchant address
     * @param amount Revenue amount
     * @param transactionData Transaction metadata
     */
    function distributeRevenue(
        address merchant,
        uint256 amount,
        bytes calldata transactionData
    ) external;

    /**
     * @notice Update revenue sharing configuration
     * @param merchant Merchant address
     * @param config New revenue configuration
     */
    function updateRevenueConfig(
        address merchant,
        RevenueConfig calldata config
    ) external;

    /**
     * @notice Record analytics data
     * @param merchant Merchant address
     * @param transactionAmount Transaction amount
     * @param category Transaction category
     */
    function recordAnalytics(
        address merchant,
        uint256 transactionAmount,
        string calldata category
    ) external;

    /**
     * @notice Get merchant profile
     * @param merchant Merchant address
     * @return profile Merchant profile data
     */
    function getMerchantProfile(address merchant)
        external
        view
        returns (MerchantProfile memory profile);

    /**
     * @notice Get merchant analytics
     * @param merchant Merchant address
     * @param timeframe Timeframe for analytics (e.g., "30d", "7d")
     * @return totalVolume Total transaction volume
     * @return transactionCount Number of transactions
     * @return averageTransaction Average transaction amount
     */
    function getMerchantAnalytics(address merchant, string calldata timeframe)
        external
        view
        returns (uint256 totalVolume, uint256 transactionCount, uint256 averageTransaction);

    /**
     * @notice Check if merchant can process payments
     * @param merchant Merchant address
     * @return canProcess Whether merchant can process payments
     */
    function canProcessPayments(address merchant)
        external
        view
        returns (bool canProcess);
}