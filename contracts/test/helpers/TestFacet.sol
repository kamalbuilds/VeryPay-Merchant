// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TestFacet
 * @notice Simple test facet for diamond testing
 */
contract TestFacet {
    event TestEvent(address indexed caller, uint256 value);

    /**
     * @notice Test function for diamond testing
     * @param value Test value
     * @return result Test result
     */
    function testFunction(uint256 value) external returns (uint256 result) {
        emit TestEvent(msg.sender, value);
        return value * 2;
    }

    /**
     * @notice Another test function
     * @return message Test message
     */
    function getMessage() external pure returns (string memory message) {
        return "Hello from TestFacet";
    }

    /**
     * @notice Test view function
     * @param input Input value
     * @return output Output value
     */
    function viewFunction(uint256 input) external pure returns (uint256 output) {
        return input + 100;
    }
}