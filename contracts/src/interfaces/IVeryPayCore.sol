// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IVeryPayCore
 * @notice Interface for VeryPay Core payment processing functionality
 * @dev Core payment processing interface with QR code validation and merchant management
 */
interface IVeryPayCore {
    /// @notice Emitted when a payment is processed
    /// @param paymentId Unique payment identifier
    /// @param merchant Merchant address receiving payment
    /// @param customer Customer address making payment
    /// @param amount Payment amount in $VERY tokens
    /// @param timestamp Payment timestamp
    event PaymentProcessed(
        bytes32 indexed paymentId,
        address indexed merchant,
        address indexed customer,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted when a merchant is registered
    /// @param merchant Merchant address
    /// @param businessName Business name
    /// @param category Business category
    event MerchantRegistered(
        address indexed merchant,
        string businessName,
        string category
    );

    /// @notice Payment status enumeration
    enum PaymentStatus {
        Pending,
        Completed,
        Failed,
        Refunded
    }

    /// @notice Merchant information structure
    struct MerchantInfo {
        string businessName;
        string category;
        bool isActive;
        bool kycVerified;
        uint256 totalVolume;
        uint256 transactionCount;
        uint256 registeredAt;
    }

    /// @notice Payment transaction structure
    struct PaymentTransaction {
        bytes32 paymentId;
        address merchant;
        address customer;
        uint256 amount;
        PaymentStatus status;
        uint256 timestamp;
        bytes32 qrHash;
        string metadata;
    }

    /**
     * @notice Process a payment with QR code validation
     * @param merchant Merchant address
     * @param amount Payment amount
     * @param qrData QR code data for validation
     * @param metadata Additional payment metadata
     * @return paymentId Unique payment identifier
     */
    function processPayment(
        address merchant,
        uint256 amount,
        bytes calldata qrData,
        string calldata metadata
    ) external returns (bytes32 paymentId);

    /**
     * @notice Register a new merchant
     * @param businessName Merchant business name
     * @param category Business category
     * @param kycData KYC verification data
     */
    function registerMerchant(
        string calldata businessName,
        string calldata category,
        bytes calldata kycData
    ) external;

    /**
     * @notice Validate QR code data
     * @param qrData QR code data to validate
     * @param merchant Merchant address
     * @param amount Payment amount
     * @return isValid Whether QR code is valid
     */
    function validateQRCode(
        bytes calldata qrData,
        address merchant,
        uint256 amount
    ) external view returns (bool isValid);

    /**
     * @notice Get merchant information
     * @param merchant Merchant address
     * @return info Merchant information struct
     */
    function getMerchantInfo(address merchant)
        external
        view
        returns (MerchantInfo memory info);

    /**
     * @notice Get payment transaction details
     * @param paymentId Payment identifier
     * @return transaction Payment transaction struct
     */
    function getPaymentTransaction(bytes32 paymentId)
        external
        view
        returns (PaymentTransaction memory transaction);
}