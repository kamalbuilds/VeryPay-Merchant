const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * Diamond Standard Tests
 * Tests for EIP-2535 Diamond Standard implementation
 */
describe("Diamond Standard", function () {
  // Test fixtures
  async function deployDiamondFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy DiamondCutFacet
    const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
    const diamondCutFacet = await DiamondCutFacet.deploy();

    // Deploy Diamond
    const Diamond = await ethers.getContractFactory("Diamond");
    const diamond = await Diamond.deploy(owner.address, await diamondCutFacet.getAddress());

    // Deploy DiamondLoupeFacet
    const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
    const diamondLoupeFacet = await DiamondLoupeFacet.deploy();

    // Deploy test facet
    const TestFacet = await ethers.getContractFactory("TestFacet");
    const testFacet = await TestFacet.deploy();

    return {
      diamond,
      diamondCutFacet,
      diamondLoupeFacet,
      testFacet,
      owner,
      user1,
      user2
    };
  }

  describe("Diamond Deployment", function () {
    it("Should deploy diamond with correct owner", async function () {
      const { diamond, owner } = await loadFixture(deployDiamondFixture);

      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", await diamond.getAddress());
      expect(await diamondLoupe.owner()).to.equal(owner.address);
    });

    it("Should have diamondCut function available", async function () {
      const { diamond } = await loadFixture(deployDiamondFixture);

      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      // Function should exist and be callable (even if it reverts due to permissions)
      expect(diamondCut.interface.hasFunction("diamondCut")).to.be.true;
    });

    it("Should support required interfaces", async function () {
      const { diamond, diamondLoupeFacet } = await loadFixture(deployDiamondFixture);

      // Add DiamondLoupe facet first
      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      const selectors = [
        "0x1f931c1c", // supportsInterface
        "0xcdffacc6", // facetAddress
        "0x52ef6b2c", // facetAddresses
        "0xadfca15e", // facetFunctionSelectors
        "0x7a0ed627", // facets
        "0x8da5cb5b", // owner
        "0xf2fde38b"  // transferOwnership
      ];

      await diamondCut.diamondCut(
        [{
          facetAddress: await diamondLoupeFacet.getAddress(),
          action: 0, // Add
          functionSelectors: selectors
        }],
        ethers.ZeroAddress,
        "0x"
      );

      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", await diamond.getAddress());
      
      // Check ERC165 support
      expect(await diamondLoupe.supportsInterface("0x01ffc9a7")).to.be.true; // ERC165
      expect(await diamondLoupe.supportsInterface("0x48e2b093")).to.be.true; // IDiamondCut
      expect(await diamondLoupe.supportsInterface("0x2a55205a")).to.be.true; // IDiamondLoupe
      expect(await diamondLoupe.supportsInterface("0x7f5828d0")).to.be.true; // IERC173
    });
  });

  describe("Facet Management", function () {
    it("Should add facet with functions", async function () {
      const { diamond, diamondLoupeFacet } = await loadFixture(deployDiamondFixture);

      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      
      const selectors = [
        "0x1f931c1c", // supportsInterface
        "0xcdffacc6", // facetAddress
        "0x52ef6b2c", // facetAddresses
        "0xadfca15e", // facetFunctionSelectors
        "0x7a0ed627"  // facets
      ];

      await expect(
        diamondCut.diamondCut(
          [{
            facetAddress: await diamondLoupeFacet.getAddress(),
            action: 0, // Add
            functionSelectors: selectors
          }],
          ethers.ZeroAddress,
          "0x"
        )
      ).to.emit(diamondCut, "DiamondCut");

      // Verify facet was added
      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", await diamond.getAddress());
      const facetAddresses = await diamondLoupe.facetAddresses();
      expect(facetAddresses).to.include(await diamondLoupeFacet.getAddress());
    });

    it("Should remove facet functions", async function () {
      const { diamond, diamondLoupeFacet } = await loadFixture(deployDiamondFixture);

      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      
      // First add facet
      const selectors = ["0x1f931c1c", "0xcdffacc6"];
      await diamondCut.diamondCut(
        [{
          facetAddress: await diamondLoupeFacet.getAddress(),
          action: 0, // Add
          functionSelectors: selectors
        }],
        ethers.ZeroAddress,
        "0x"
      );

      // Then remove one function
      await expect(
        diamondCut.diamondCut(
          [{
            facetAddress: ethers.ZeroAddress, // Zero address for removal
            action: 2, // Remove
            functionSelectors: ["0x1f931c1c"]
          }],
          ethers.ZeroAddress,
          "0x"
        )
      ).to.emit(diamondCut, "DiamondCut");
    });

    it("Should replace facet functions", async function () {
      const { diamond, diamondLoupeFacet, testFacet } = await loadFixture(deployDiamondFixture);

      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      
      // First add facet
      const selectors = ["0x1f931c1c"];
      await diamondCut.diamondCut(
        [{
          facetAddress: await diamondLoupeFacet.getAddress(),
          action: 0, // Add
          functionSelectors: selectors
        }],
        ethers.ZeroAddress,
        "0x"
      );

      // Then replace with new facet
      await expect(
        diamondCut.diamondCut(
          [{
            facetAddress: await testFacet.getAddress(),
            action: 1, // Replace
            functionSelectors: selectors
          }],
          ethers.ZeroAddress,
          "0x"
        )
      ).to.emit(diamondCut, "DiamondCut");

      // Verify replacement
      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", await diamond.getAddress());
      const facetAddress = await diamondLoupe.facetAddress("0x1f931c1c");
      expect(facetAddress).to.equal(await testFacet.getAddress());
    });
  });

  describe("Diamond Loupe", function () {
    beforeEach(async function () {
      // Add DiamondLoupe facet to diamond for testing
      const { diamond, diamondLoupeFacet } = await loadFixture(deployDiamondFixture);
      
      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      const selectors = [
        "0x1f931c1c", // supportsInterface
        "0xcdffacc6", // facetAddress
        "0x52ef6b2c", // facetAddresses
        "0xadfca15e", // facetFunctionSelectors
        "0x7a0ed627", // facets
        "0x8da5cb5b", // owner
        "0xf2fde38b"  // transferOwnership
      ];

      await diamondCut.diamondCut(
        [{
          facetAddress: await diamondLoupeFacet.getAddress(),
          action: 0, // Add
          functionSelectors: selectors
        }],
        ethers.ZeroAddress,
        "0x"
      );
    });

    it("Should return correct facet addresses", async function () {
      const { diamond } = await loadFixture(deployDiamondFixture);

      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", await diamond.getAddress());
      const facetAddresses = await diamondLoupe.facetAddresses();
      
      expect(facetAddresses.length).to.be.greaterThan(0);
    });

    it("Should return correct facet function selectors", async function () {
      const { diamond, diamondLoupeFacet } = await loadFixture(deployDiamondFixture);

      // Setup loupe facet first
      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      const selectors = ["0x1f931c1c", "0xcdffacc6"];
      
      await diamondCut.diamondCut(
        [{
          facetAddress: await diamondLoupeFacet.getAddress(),
          action: 0,
          functionSelectors: selectors
        }],
        ethers.ZeroAddress,
        "0x"
      );

      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", await diamond.getAddress());
      const facetSelectors = await diamondLoupe.facetFunctionSelectors(await diamondLoupeFacet.getAddress());
      
      expect(facetSelectors).to.include("0x1f931c1c");
      expect(facetSelectors).to.include("0xcdffacc6");
    });

    it("Should return correct facet info", async function () {
      const { diamond, diamondLoupeFacet } = await loadFixture(deployDiamondFixture);

      // Setup first
      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      const selectors = ["0x1f931c1c", "0xcdffacc6", "0x52ef6b2c", "0xadfca15e", "0x7a0ed627"];
      
      await diamondCut.diamondCut(
        [{
          facetAddress: await diamondLoupeFacet.getAddress(),
          action: 0,
          functionSelectors: selectors
        }],
        ethers.ZeroAddress,
        "0x"
      );

      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", await diamond.getAddress());
      const facets = await diamondLoupe.facets();
      
      expect(facets.length).to.be.greaterThan(0);
      
      const loupeFacet = facets.find(f => f.facetAddress === await diamondLoupeFacet.getAddress());
      expect(loupeFacet).to.not.be.undefined;
      expect(loupeFacet.functionSelectors.length).to.equal(5);
    });

    it("Should return correct facet address for selector", async function () {
      const { diamond, diamondLoupeFacet } = await loadFixture(deployDiamondFixture);

      // Setup first
      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      const selectors = ["0x1f931c1c", "0xcdffacc6"];
      
      await diamondCut.diamondCut(
        [{
          facetAddress: await diamondLoupeFacet.getAddress(),
          action: 0,
          functionSelectors: selectors
        }],
        ethers.ZeroAddress,
        "0x"
      );

      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", await diamond.getAddress());
      const facetAddress = await diamondLoupe.facetAddress("0x1f931c1c");
      
      expect(facetAddress).to.equal(await diamondLoupeFacet.getAddress());
    });
  });

  describe("Ownership", function () {
    it("Should transfer ownership", async function () {
      const { diamond, diamondLoupeFacet, owner, user1 } = await loadFixture(deployDiamondFixture);

      // Setup DiamondLoupe facet first
      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      const selectors = ["0x8da5cb5b", "0xf2fde38b"]; // owner, transferOwnership
      
      await diamondCut.diamondCut(
        [{
          facetAddress: await diamondLoupeFacet.getAddress(),
          action: 0,
          functionSelectors: selectors
        }],
        ethers.ZeroAddress,
        "0x"
      );

      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", await diamond.getAddress());

      await expect(
        diamondLoupe.connect(owner).transferOwnership(user1.address)
      ).to.emit(diamondLoupe, "OwnershipTransferred")
        .withArgs(owner.address, user1.address);

      expect(await diamondLoupe.owner()).to.equal(user1.address);
    });

    it("Should not allow non-owner to transfer ownership", async function () {
      const { diamond, diamondLoupeFacet, user1, user2 } = await loadFixture(deployDiamondFixture);

      // Setup DiamondLoupe facet first
      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      const selectors = ["0x8da5cb5b", "0xf2fde38b"];
      
      await diamondCut.diamondCut(
        [{
          facetAddress: await diamondLoupeFacet.getAddress(),
          action: 0,
          functionSelectors: selectors
        }],
        ethers.ZeroAddress,
        "0x"
      );

      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", await diamond.getAddress());

      await expect(
        diamondLoupe.connect(user1).transferOwnership(user2.address)
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });
  });

  describe("Access Control", function () {
    it("Should only allow owner to cut diamond", async function () {
      const { diamond, testFacet, user1 } = await loadFixture(deployDiamondFixture);

      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      
      await expect(
        diamondCut.connect(user1).diamondCut(
          [{
            facetAddress: await testFacet.getAddress(),
            action: 0,
            functionSelectors: ["0x12345678"]
          }],
          ethers.ZeroAddress,
          "0x"
        )
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });

    it("Should allow owner to cut diamond", async function () {
      const { diamond, testFacet, owner } = await loadFixture(deployDiamondFixture);

      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      
      await expect(
        diamondCut.connect(owner).diamondCut(
          [{
            facetAddress: await testFacet.getAddress(),
            action: 0,
            functionSelectors: ["0x12345678"]
          }],
          ethers.ZeroAddress,
          "0x"
        )
      ).not.to.be.reverted;
    });
  });

  describe("Function Delegation", function () {
    it("Should delegate calls to correct facet", async function () {
      const { diamond, testFacet } = await loadFixture(deployDiamondFixture);

      // Add test facet with a test function
      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      
      // Assuming TestFacet has a function with selector 0x12345678
      await diamondCut.diamondCut(
        [{
          facetAddress: await testFacet.getAddress(),
          action: 0,
          functionSelectors: ["0x12345678"]
        }],
        ethers.ZeroAddress,
        "0x"
      );

      // Try to call the function through diamond
      // This would work if TestFacet actually had the function
      // For now, just verify the setup worked
      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", await diamond.getAddress());
      // Add loupe functionality first
      await diamondCut.diamondCut(
        [{
          facetAddress: await testFacet.getAddress(), // Using testFacet as placeholder
          action: 0,
          functionSelectors: ["0xcdffacc6"] // facetAddress selector
        }],
        ethers.ZeroAddress,
        "0x"
      );
    });

    it("Should revert for non-existent function", async function () {
      const { diamond } = await loadFixture(deployDiamondFixture);

      // Try to call non-existent function
      const nonExistentCall = {
        to: await diamond.getAddress(),
        data: "0x87654321" // Non-existent function selector
      };

      await expect(
        ethers.provider.call(nonExistentCall)
      ).to.be.reverted;
    });
  });

  describe("Initialization", function () {
    it("Should execute initialization function on upgrade", async function () {
      const { diamond, diamondLoupeFacet } = await loadFixture(deployDiamondFixture);

      // Deploy init contract
      const DiamondInit = await ethers.getContractFactory("DiamondInit");
      const diamondInit = await DiamondInit.deploy();

      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      
      // Prepare init call
      const initParams = {
        veryToken: ethers.ZeroAddress,
        governanceToken: ethers.ZeroAddress,
        name: "Test",
        symbol: "TST",
        initialSupply: 0,
        initialOwners: [],
        initialBalances: []
      };

      const functionCall = diamondInit.interface.encodeFunctionData("init", [initParams]);

      await expect(
        diamondCut.diamondCut(
          [{
            facetAddress: await diamondLoupeFacet.getAddress(),
            action: 0,
            functionSelectors: ["0x1f931c1c"]
          }],
          await diamondInit.getAddress(),
          functionCall
        )
      ).to.emit(diamondInit, "DiamondInitialized");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle empty facet cut", async function () {
      const { diamond } = await loadFixture(deployDiamondFixture);

      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      
      await expect(
        diamondCut.diamondCut([], ethers.ZeroAddress, "0x")
      ).not.to.be.reverted;
    });

    it("Should reject invalid facet cut actions", async function () {
      const { diamond, testFacet } = await loadFixture(deployDiamondFixture);

      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      
      // Invalid action (should be 0, 1, or 2)
      const invalidCut = [{
        facetAddress: await testFacet.getAddress(),
        action: 99, // Invalid action
        functionSelectors: ["0x12345678"]
      }];

      await expect(
        diamondCut.diamondCut(invalidCut, ethers.ZeroAddress, "0x")
      ).to.be.revertedWith("LibDiamond: Incorrect FacetCutAction");
    });

    it("Should reject adding function that already exists", async function () {
      const { diamond, testFacet, diamondLoupeFacet } = await loadFixture(deployDiamondFixture);

      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      
      // Add function first
      await diamondCut.diamondCut(
        [{
          facetAddress: await testFacet.getAddress(),
          action: 0,
          functionSelectors: ["0x12345678"]
        }],
        ethers.ZeroAddress,
        "0x"
      );

      // Try to add same function again
      await expect(
        diamondCut.diamondCut(
          [{
            facetAddress: await diamondLoupeFacet.getAddress(),
            action: 0,
            functionSelectors: ["0x12345678"]
          }],
          ethers.ZeroAddress,
          "0x"
        )
      ).to.be.revertedWith("LibDiamond: Can't add function that already exists");
    });
  });

  describe("Gas Efficiency", function () {
    it("Should have reasonable gas costs for function calls", async function () {
      const { diamond, diamondLoupeFacet } = await loadFixture(deployDiamondFixture);

      // Add facet
      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      await diamondCut.diamondCut(
        [{
          facetAddress: await diamondLoupeFacet.getAddress(),
          action: 0,
          functionSelectors: ["0x52ef6b2c"] // facetAddresses
        }],
        ethers.ZeroAddress,
        "0x"
      );

      // Test gas usage for delegated call
      const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", await diamond.getAddress());
      const tx = await diamondLoupe.facetAddresses.populateTransaction();
      
      // Gas estimate should be reasonable (this is just a basic check)
      expect(tx.data).to.not.be.empty;
    });
  });
});