// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title GasOptimizer
 * @notice Gas optimization utilities and patterns for VeryPay system
 * @dev Contains optimized data structures and functions to minimize gas costs
 */
library GasOptimizer {
    /// @notice Packed struct for efficient storage
    struct PackedUserData {
        uint128 points;           // 128 bits for points
        uint64 lastUpdate;       // 64 bits for timestamp (sufficient until year 584 billion)
        uint32 tier;             // 32 bits for tier (more than enough)
        uint32 transactionCount; // 32 bits for transaction count
    }

    /// @notice Packed merchant data for gas efficiency
    struct PackedMerchantData {
        uint128 totalVolume;     // 128 bits for volume
        uint64 registeredAt;     // 64 bits for timestamp
        uint32 transactionCount; // 32 bits for transaction count
        uint16 kycStatus;        // 16 bits for KYC status
        uint16 merchantStatus;   // 16 bits for merchant status
    }

    /// @notice Optimized event for batch operations
    event BatchProcessed(
        bytes32 indexed batchId,
        uint256 count,
        uint256 totalGasUsed
    );

    /**
     * @notice Pack multiple addresses into bytes32 array for efficient storage
     * @param addresses Array of addresses to pack
     * @return packed Packed bytes32 array
     */
    function packAddresses(address[] memory addresses) 
        internal 
        pure 
        returns (bytes32[] memory packed) 
    {
        uint256 length = addresses.length;
        uint256 packedLength = (length + 1) / 2; // 2 addresses per bytes32
        packed = new bytes32[](packedLength);

        for (uint256 i = 0; i < length; i += 2) {
            bytes32 packedValue = bytes32(uint256(uint160(addresses[i]))) << 96;
            
            if (i + 1 < length) {
                packedValue |= bytes32(uint256(uint160(addresses[i + 1]))) >> 160;
            }
            
            packed[i / 2] = packedValue;
        }
    }

    /**
     * @notice Unpack addresses from bytes32 array
     * @param packed Packed bytes32 array
     * @param originalLength Original number of addresses
     * @return addresses Unpacked addresses
     */
    function unpackAddresses(bytes32[] memory packed, uint256 originalLength) 
        internal 
        pure 
        returns (address[] memory addresses) 
    {
        addresses = new address[](originalLength);
        
        for (uint256 i = 0; i < originalLength; i++) {
            uint256 packedIndex = i / 2;
            bytes32 packedValue = packed[packedIndex];
            
            if (i % 2 == 0) {
                // First address in the packed value (higher bits)
                addresses[i] = address(uint160(uint256(packedValue >> 96)));
            } else {
                // Second address in the packed value (lower bits)
                addresses[i] = address(uint160(uint256(packedValue)));
            }
        }
    }

    /**
     * @notice Efficient batch processing with gas tracking
     * @param data Array of data to process
     * @param processor Function to process each item
     * @return results Processing results
     * @return gasUsed Total gas used
     */
    function batchProcess(
        bytes[] memory data,
        function(bytes memory) internal returns (bool) processor
    ) internal returns (bool[] memory results, uint256 gasUsed) {
        uint256 gasStart = gasleft();
        uint256 length = data.length;
        results = new bool[](length);

        // Use unchecked to save gas on overflow checks
        unchecked {
            for (uint256 i = 0; i < length; ++i) {
                results[i] = processor(data[i]);
            }
        }

        gasUsed = gasStart - gasleft();
    }

    /**
     * @notice Optimized array search using binary search
     * @param sortedArray Sorted array to search
     * @param target Target value to find
     * @return found Whether target was found
     * @return index Index of target (or insertion point if not found)
     */
    function binarySearch(uint256[] memory sortedArray, uint256 target) 
        internal 
        pure 
        returns (bool found, uint256 index) 
    {
        uint256 left = 0;
        uint256 right = sortedArray.length;

        while (left < right) {
            uint256 mid = (left + right) / 2;
            
            if (sortedArray[mid] == target) {
                return (true, mid);
            } else if (sortedArray[mid] < target) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }

        return (false, left);
    }

    /**
     * @notice Gas-efficient string comparison
     * @param a First string
     * @param b Second string
     * @return equal Whether strings are equal
     */
    function compareStrings(string memory a, string memory b) 
        internal 
        pure 
        returns (bool equal) 
    {
        bytes memory aBytes = bytes(a);
        bytes memory bBytes = bytes(b);
        
        if (aBytes.length != bBytes.length) {
            return false;
        }
        
        return keccak256(aBytes) == keccak256(bBytes);
    }

    /**
     * @notice Optimized array deduplication
     * @param input Input array with potential duplicates
     * @return unique Array with unique values
     */
    function deduplicateArray(uint256[] memory input) 
        internal 
        pure 
        returns (uint256[] memory unique) 
    {
        if (input.length == 0) {
            return input;
        }

        // Sort array first (bubble sort for simplicity, can be optimized)
        for (uint256 i = 0; i < input.length - 1; i++) {
            for (uint256 j = 0; j < input.length - i - 1; j++) {
                if (input[j] > input[j + 1]) {
                    (input[j], input[j + 1]) = (input[j + 1], input[j]);
                }
            }
        }

        // Count unique elements
        uint256 uniqueCount = 1;
        for (uint256 i = 1; i < input.length; i++) {
            if (input[i] != input[i - 1]) {
                uniqueCount++;
            }
        }

        // Create unique array
        unique = new uint256[](uniqueCount);
        unique[0] = input[0];
        uint256 uniqueIndex = 1;

        for (uint256 i = 1; i < input.length; i++) {
            if (input[i] != input[i - 1]) {
                unique[uniqueIndex] = input[i];
                uniqueIndex++;
            }
        }
    }

    /**
     * @notice Efficient merkle root calculation
     * @param leaves Array of leaf hashes
     * @return root Merkle root hash
     */
    function calculateMerkleRoot(bytes32[] memory leaves) 
        internal 
        pure 
        returns (bytes32 root) 
    {
        uint256 length = leaves.length;
        
        if (length == 0) {
            return bytes32(0);
        }
        
        if (length == 1) {
            return leaves[0];
        }

        // Work our way up the tree
        while (length > 1) {
            uint256 newLength = (length + 1) / 2;
            
            for (uint256 i = 0; i < newLength; i++) {
                uint256 leftIndex = i * 2;
                uint256 rightIndex = leftIndex + 1;
                
                bytes32 left = leaves[leftIndex];
                bytes32 right = rightIndex < length ? leaves[rightIndex] : left;
                
                leaves[i] = keccak256(abi.encodePacked(left, right));
            }
            
            length = newLength;
        }
        
        return leaves[0];
    }

    /**
     * @notice Pack multiple boolean values into a single uint256
     * @param bools Array of boolean values (max 256)
     * @return packed Packed boolean values
     */
    function packBooleans(bool[] memory bools) 
        internal 
        pure 
        returns (uint256 packed) 
    {
        require(bools.length <= 256, "GasOptimizer: Too many booleans");
        
        for (uint256 i = 0; i < bools.length; i++) {
            if (bools[i]) {
                packed |= (1 << i);
            }
        }
    }

    /**
     * @notice Unpack boolean values from uint256
     * @param packed Packed boolean values
     * @param length Number of booleans to unpack
     * @return bools Array of boolean values
     */
    function unpackBooleans(uint256 packed, uint256 length) 
        internal 
        pure 
        returns (bool[] memory bools) 
    {
        require(length <= 256, "GasOptimizer: Too many booleans");
        
        bools = new bool[](length);
        
        for (uint256 i = 0; i < length; i++) {
            bools[i] = (packed & (1 << i)) != 0;
        }
    }

    /**
     * @notice Calculate optimal batch size based on gas limit
     * @param gasPerItem Gas cost per item
     * @param baseGas Base gas cost for transaction
     * @param gasLimit Available gas limit
     * @return batchSize Optimal batch size
     */
    function calculateOptimalBatchSize(
        uint256 gasPerItem,
        uint256 baseGas,
        uint256 gasLimit
    ) internal pure returns (uint256 batchSize) {
        require(gasLimit > baseGas, "GasOptimizer: Gas limit too low");
        
        uint256 availableGas = gasLimit - baseGas;
        batchSize = availableGas / gasPerItem;
        
        // Ensure at least 1 item can be processed
        if (batchSize == 0) {
            batchSize = 1;
        }
    }

    /**
     * @notice Efficient array intersection
     * @param array1 First array
     * @param array2 Second array
     * @return intersection Common elements
     */
    function arrayIntersection(uint256[] memory array1, uint256[] memory array2) 
        internal 
        pure 
        returns (uint256[] memory intersection) 
    {
        // Use mapping-like behavior with array for intersection
        uint256[] memory temp = new uint256[](array1.length);
        uint256 intersectionCount = 0;

        for (uint256 i = 0; i < array1.length; i++) {
            for (uint256 j = 0; j < array2.length; j++) {
                if (array1[i] == array2[j]) {
                    temp[intersectionCount] = array1[i];
                    intersectionCount++;
                    break;
                }
            }
        }

        // Create properly sized result array
        intersection = new uint256[](intersectionCount);
        for (uint256 i = 0; i < intersectionCount; i++) {
            intersection[i] = temp[i];
        }
    }

    /**
     * @notice Check if value exists in sorted array (gas efficient)
     * @param sortedArray Sorted array to search
     * @param value Value to find
     * @return exists Whether value exists in array
     */
    function existsInSortedArray(uint256[] memory sortedArray, uint256 value) 
        internal 
        pure 
        returns (bool exists) 
    {
        (exists,) = binarySearch(sortedArray, value);
    }

    /**
     * @notice Optimized percentage calculation with rounding
     * @param amount Base amount
     * @param percentage Percentage in basis points (10000 = 100%)
     * @param roundUp Whether to round up
     * @return result Calculated percentage
     */
    function calculatePercentage(
        uint256 amount,
        uint256 percentage,
        bool roundUp
    ) internal pure returns (uint256 result) {
        result = amount * percentage;
        
        if (roundUp && result % 10000 != 0) {
            result = (result / 10000) + 1;
        } else {
            result = result / 10000;
        }
    }
}