// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IDiamondCut.sol";
import "../libraries/LibDiamond.sol";

/**
 * @title DiamondCutFacet
 * @notice Facet for managing diamond cuts
 * @dev Implements the diamond cut functionality for upgrading the diamond
 */
contract DiamondCutFacet is IDiamondCut {
    /// @inheritdoc IDiamondCut
    function diamondCut(
        FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }
}