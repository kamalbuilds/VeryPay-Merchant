// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./libraries/LibDiamond.sol";
import "./interfaces/IDiamondCut.sol";
import "./interfaces/IDiamondLoupe.sol";
import "./interfaces/IERC173.sol";

import "@openzeppelin/contracts/interfaces/IERC165.sol";

/**
 * @title Diamond
 * @notice Main diamond contract implementing EIP-2535 Diamond Standard
 * @dev This contract serves as the main proxy for all VeryPay functionality
 */
contract Diamond {
    /// @notice Diamond constructor
    /// @param _contractOwner Owner of the diamond
    /// @param _diamondCutFacet Address of the diamond cut facet
    constructor(address _contractOwner, address _diamondCutFacet) payable {
        LibDiamond.setContractOwner(_contractOwner);

        // Add the diamondCut external function from the diamondCutFacet
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;

        // Add diamondCut function
        LibDiamond.addFunctions(_diamondCutFacet, IDiamondCut.diamondCut.selector);
    }

    /// @notice Fallback function delegates calls to facets
    fallback() external payable {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }

        // Get facet from function selector
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "Diamond: Function does not exist");

        // Execute external function from facet using delegatecall and return any value
        assembly {
            // Copy function selector and any arguments
            calldatacopy(0, 0, calldatasize())
            
            // Execute function call using the facet
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            
            // Get any return value
            returndatacopy(0, 0, returndatasize())
            
            // Return any return value or error back to the caller
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    /// @notice Receive function to accept ETH
    receive() external payable {}
}