// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/LibDiamond.sol";

/**
 * @title DiamondInit
 * @notice Contract used for initializing state variables in diamond
 * @dev This contract is used to initialize state variables that are added in a diamond upgrade
 */
contract DiamondInit {
    /// @notice Struct for initialization parameters
    struct InitParams {
        address veryToken;
        address governanceToken;
        string name;
        string symbol;
        uint256 initialSupply;
        address[] initialOwners;
        uint256[] initialBalances;
    }

    /// @notice Initialize the diamond with initial state
    /// @param _params Initialization parameters
    function init(InitParams calldata _params) external {
        // Initialize basic diamond functionality
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        
        // Add interface support
        ds.supportedInterfaces[0x01ffc9a7] = true; // ERC165
        ds.supportedInterfaces[0x48e2b093] = true; // IDiamondCut
        ds.supportedInterfaces[0x2a55205a] = true; // IDiamondLoupe
        ds.supportedInterfaces[0x7f5828d0] = true; // IERC173
        
        // Additional initialization can be added here
        // This would typically include setting up initial facet states
        
        emit DiamondInitialized(_params.veryToken, _params.governanceToken);
    }

    /// @notice Event emitted when diamond is initialized
    event DiamondInitialized(address indexed veryToken, address indexed governanceToken);
}