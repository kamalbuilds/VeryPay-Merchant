// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title VeryPayMerchant
 * @dev Smart contract for VeryPay merchant payment processing
 */
contract VeryPayMerchant is ReentrancyGuard, Ownable, Pausable {
    using SafeMath for uint256;

    struct Payment {
        address payer;
        address merchant;
        uint256 amount;
        uint256 timestamp;
        bool completed;
        string reference;
    }

    struct Merchant {
        string name;
        address walletAddress;
        bool isActive;
        uint256 totalEarnings;
        uint256 transactionCount;
    }

    mapping(bytes32 => Payment) public payments;
    mapping(address => Merchant) public merchants;
    mapping(address => bool) public authorizedOperators;
    
    uint256 public feePercentage = 250; // 2.5% in basis points
    uint256 public constant MAX_FEE = 1000; // 10% maximum fee
    address public feeRecipient;
    
    event PaymentCreated(bytes32 indexed paymentId, address indexed payer, address indexed merchant, uint256 amount);
    event PaymentCompleted(bytes32 indexed paymentId, uint256 feeAmount);
    event MerchantRegistered(address indexed merchant, string name);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event OperatorAuthorized(address indexed operator);
    event OperatorRevoked(address indexed operator);

    modifier onlyAuthorized() {
        require(authorizedOperators[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier onlyActiveMerchant(address merchant) {
        require(merchants[merchant].isActive, "Merchant not active");
        _;
    }

    constructor(address _feeRecipient) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
        authorizedOperators[msg.sender] = true;
    }

    /**
     * @dev Register a new merchant
     */
    function registerMerchant(
        address merchantAddress,
        string memory merchantName
    ) external onlyAuthorized {
        require(merchantAddress != address(0), "Invalid merchant address");
        require(bytes(merchantName).length > 0, "Invalid merchant name");
        require(!merchants[merchantAddress].isActive, "Merchant already registered");

        merchants[merchantAddress] = Merchant({
            name: merchantName,
            walletAddress: merchantAddress,
            isActive: true,
            totalEarnings: 0,
            transactionCount: 0
        });

        emit MerchantRegistered(merchantAddress, merchantName);
    }

    /**
     * @dev Create a new payment
     */
    function createPayment(
        bytes32 paymentId,
        address merchant,
        string memory reference
    ) external payable nonReentrant whenNotPaused onlyActiveMerchant(merchant) {
        require(msg.value > 0, "Payment amount must be greater than 0");
        require(payments[paymentId].amount == 0, "Payment ID already exists");
        require(bytes(reference).length > 0, "Reference required");

        payments[paymentId] = Payment({
            payer: msg.sender,
            merchant: merchant,
            amount: msg.value,
            timestamp: block.timestamp,
            completed: false,
            reference: reference
        });

        emit PaymentCreated(paymentId, msg.sender, merchant, msg.value);
    }

    /**
     * @dev Complete a payment and transfer funds to merchant
     */
    function completePayment(bytes32 paymentId) external onlyAuthorized nonReentrant {
        Payment storage payment = payments[paymentId];
        require(payment.amount > 0, "Payment not found");
        require(!payment.completed, "Payment already completed");

        uint256 feeAmount = payment.amount.mul(feePercentage).div(10000);
        uint256 merchantAmount = payment.amount.sub(feeAmount);

        payment.completed = true;
        merchants[payment.merchant].totalEarnings = merchants[payment.merchant].totalEarnings.add(merchantAmount);
        merchants[payment.merchant].transactionCount = merchants[payment.merchant].transactionCount.add(1);

        // Transfer to merchant
        (bool merchantSuccess, ) = payment.merchant.call{value: merchantAmount}("");
        require(merchantSuccess, "Transfer to merchant failed");

        // Transfer fee
        if (feeAmount > 0) {
            (bool feeSuccess, ) = feeRecipient.call{value: feeAmount}("");
            require(feeSuccess, "Fee transfer failed");
        }

        emit PaymentCompleted(paymentId, feeAmount);
    }

    /**
     * @dev Update fee percentage (only owner)
     */
    function updateFeePercentage(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "Fee too high");
        uint256 oldFee = feePercentage;
        feePercentage = newFee;
        emit FeeUpdated(oldFee, newFee);
    }

    /**
     * @dev Authorize an operator
     */
    function authorizeOperator(address operator) external onlyOwner {
        require(operator != address(0), "Invalid operator address");
        authorizedOperators[operator] = true;
        emit OperatorAuthorized(operator);
    }

    /**
     * @dev Revoke operator authorization
     */
    function revokeOperator(address operator) external onlyOwner {
        authorizedOperators[operator] = false;
        emit OperatorRevoked(operator);
    }

    /**
     * @dev Pause contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get payment details
     */
    function getPayment(bytes32 paymentId) external view returns (
        address payer,
        address merchant,
        uint256 amount,
        uint256 timestamp,
        bool completed,
        string memory reference
    ) {
        Payment memory payment = payments[paymentId];
        return (
            payment.payer,
            payment.merchant,
            payment.amount,
            payment.timestamp,
            payment.completed,
            payment.reference
        );
    }

    /**
     * @dev Get merchant details
     */
    function getMerchant(address merchantAddress) external view returns (
        string memory name,
        address walletAddress,
        bool isActive,
        uint256 totalEarnings,
        uint256 transactionCount
    ) {
        Merchant memory merchant = merchants[merchantAddress];
        return (
            merchant.name,
            merchant.walletAddress,
            merchant.isActive,
            merchant.totalEarnings,
            merchant.transactionCount
        );
    }
}