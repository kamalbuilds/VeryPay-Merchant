// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SecurityLibrary
 * @notice Library containing security utilities and checks for VeryPay system
 * @dev Provides common security patterns and validations
 */
library SecurityLibrary {
    /// @notice Error for invalid signature
    error InvalidSignature();
    
    /// @notice Error for expired timestamp
    error ExpiredTimestamp();
    
    /// @notice Error for invalid amount
    error InvalidAmount();
    
    /// @notice Error for blacklisted address
    error BlacklistedAddress();

    /// @notice Maximum allowed timestamp skew (5 minutes)
    uint256 public constant MAX_TIMESTAMP_SKEW = 300;

    /// @notice Minimum transaction amount (to prevent dust attacks)
    uint256 public constant MIN_TRANSACTION_AMOUNT = 1e15; // 0.001 tokens

    /// @notice Maximum transaction amount per call
    uint256 public constant MAX_TRANSACTION_AMOUNT = 1e24; // 1M tokens

    /**
     * @notice Validate transaction amount
     * @param amount Amount to validate
     */
    function validateAmount(uint256 amount) internal pure {
        if (amount < MIN_TRANSACTION_AMOUNT || amount > MAX_TRANSACTION_AMOUNT) {
            revert InvalidAmount();
        }
    }

    /**
     * @notice Validate timestamp is not too old or too far in future
     * @param timestamp Timestamp to validate
     */
    function validateTimestamp(uint256 timestamp) internal view {
        uint256 currentTime = block.timestamp;
        
        // Check if timestamp is too old or too far in future
        if (timestamp + MAX_TIMESTAMP_SKEW < currentTime || 
            timestamp > currentTime + MAX_TIMESTAMP_SKEW) {
            revert ExpiredTimestamp();
        }
    }

    /**
     * @notice Validate address is not zero address
     * @param addr Address to validate
     */
    function validateAddress(address addr) internal pure {
        require(addr != address(0), "SecurityLibrary: Zero address");
    }

    /**
     * @notice Create message hash for signature verification
     * @param merchant Merchant address
     * @param amount Transaction amount
     * @param nonce Transaction nonce
     * @param timestamp Transaction timestamp
     * @return messageHash Hash for signature verification
     */
    function createMessageHash(
        address merchant,
        uint256 amount,
        uint256 nonce,
        uint256 timestamp
    ) internal pure returns (bytes32 messageHash) {
        return keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            keccak256(abi.encodePacked(merchant, amount, nonce, timestamp))
        ));
    }

    /**
     * @notice Verify ECDSA signature
     * @param messageHash Message hash
     * @param signature Signature bytes
     * @param expectedSigner Expected signer address
     * @return isValid Whether signature is valid
     */
    function verifySignature(
        bytes32 messageHash,
        bytes memory signature,
        address expectedSigner
    ) internal pure returns (bool isValid) {
        if (signature.length != 65) {
            return false;
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        // Version of signature should be 27 or 28, but 0 and 1 are also possible
        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            return false;
        }

        address recoveredSigner = ecrecover(messageHash, v, r, s);
        return recoveredSigner == expectedSigner;
    }

    /**
     * @notice Check if amount exceeds percentage of total supply
     * @param amount Amount to check
     * @param totalSupply Total token supply
     * @param maxPercentage Maximum allowed percentage (in basis points)
     * @return isValid Whether amount is within limits
     */
    function checkSupplyPercentage(
        uint256 amount,
        uint256 totalSupply,
        uint256 maxPercentage
    ) internal pure returns (bool isValid) {
        if (totalSupply == 0) return false;
        
        uint256 percentage = (amount * 10000) / totalSupply;
        return percentage <= maxPercentage;
    }

    /**
     * @notice Rate limiting check
     * @param lastCallTime Last call timestamp
     * @param minInterval Minimum interval between calls
     * @return canProceed Whether call can proceed
     */
    function checkRateLimit(
        uint256 lastCallTime,
        uint256 minInterval
    ) internal view returns (bool canProceed) {
        return block.timestamp >= lastCallTime + minInterval;
    }

    /**
     * @notice Calculate transaction fee with bounds checking
     * @param amount Transaction amount
     * @param feeRate Fee rate in basis points
     * @param minFee Minimum fee amount
     * @param maxFee Maximum fee amount
     * @return fee Calculated fee
     */
    function calculateFeeWithBounds(
        uint256 amount,
        uint256 feeRate,
        uint256 minFee,
        uint256 maxFee
    ) internal pure returns (uint256 fee) {
        fee = (amount * feeRate) / 10000;
        
        if (fee < minFee) {
            fee = minFee;
        } else if (fee > maxFee) {
            fee = maxFee;
        }
    }

    /**
     * @notice Validate batch operation parameters
     * @param batchSize Size of batch
     * @param maxBatchSize Maximum allowed batch size
     */
    function validateBatchSize(uint256 batchSize, uint256 maxBatchSize) internal pure {
        require(batchSize > 0 && batchSize <= maxBatchSize, "SecurityLibrary: Invalid batch size");
    }

    /**
     * @notice Check for reentrancy using storage pattern
     * @param reentrancyGuard Current guard value
     * @return newGuardValue New guard value to set
     */
    function checkReentrancy(uint256 reentrancyGuard) internal pure returns (uint256 newGuardValue) {
        require(reentrancyGuard != 2, "SecurityLibrary: Reentrant call");
        return 2;
    }

    /**
     * @notice Reset reentrancy guard
     * @return guardValue Guard value to reset to
     */
    function resetReentrancyGuard() internal pure returns (uint256 guardValue) {
        return 1;
    }

    /**
     * @notice Validate array lengths match
     * @param array1Length Length of first array
     * @param array2Length Length of second array
     */
    function validateArrayLengths(uint256 array1Length, uint256 array2Length) internal pure {
        require(array1Length == array2Length, "SecurityLibrary: Array length mismatch");
    }

    /**
     * @notice Safe percentage calculation to prevent overflow
     * @param value Base value
     * @param percentage Percentage in basis points (10000 = 100%)
     * @return result Percentage of value
     */
    function safePercentage(uint256 value, uint256 percentage) internal pure returns (uint256 result) {
        require(percentage <= 10000, "SecurityLibrary: Percentage too high");
        return (value * percentage) / 10000;
    }

    /**
     * @notice Validate merkle proof
     * @param proof Merkle proof array
     * @param root Merkle root
     * @param leaf Leaf to verify
     * @return isValid Whether proof is valid
     */
    function verifyMerkleProof(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool isValid) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == root;
    }
}