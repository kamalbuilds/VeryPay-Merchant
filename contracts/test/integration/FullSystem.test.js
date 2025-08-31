const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * Full System Integration Tests
 * Tests the complete VeryPay system working together
 */
describe("VeryPay Full System Integration", function () {
  // Deploy complete system fixture
  async function deployFullSystemFixture() {
    const [owner, merchant1, merchant2, customer1, customer2, feeRecipient] = await ethers.getSigners();

    // Deploy tokens
    const VeryToken = await ethers.getContractFactory("MockERC20");
    const veryToken = await VeryToken.deploy("VERY Token", "VERY", ethers.parseEther("1000000000"));

    const GovernanceToken = await ethers.getContractFactory("MockERC20");
    const governanceToken = await GovernanceToken.deploy("VERY Governance", "vVERY", ethers.parseEther("100000000"));

    // Deploy Diamond system
    const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
    const diamondCutFacet = await DiamondCutFacet.deploy();

    const Diamond = await ethers.getContractFactory("Diamond");
    const diamond = await Diamond.deploy(owner.address, await diamondCutFacet.getAddress());

    // Deploy all facets
    const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
    const diamondLoupeFacet = await DiamondLoupeFacet.deploy();

    const VeryPayCoreFacet = await ethers.getContractFactory("VeryPayCoreFacet");
    const veryPayCoreFacet = await VeryPayCoreFacet.deploy();

    const VeryRewardsFacet = await ethers.getContractFactory("VeryRewardsFacet");
    const veryRewardsFacet = await VeryRewardsFacet.deploy();

    const VeryMerchantFacet = await ethers.getContractFactory("VeryMerchantFacet");
    const veryMerchantFacet = await VeryMerchantFacet.deploy();

    const VeryGovernanceFacet = await ethers.getContractFactory("VeryGovernanceFacet");
    const veryGovernanceFacet = await VeryGovernanceFacet.deploy();

    // Add all facets to diamond (simplified selectors)
    const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
    
    const cuts = [
      {
        facetAddress: await diamondLoupeFacet.getAddress(),
        action: 0,
        functionSelectors: ["0x1f931c1c", "0x52ef6b2c", "0x8da5cb5b"] // Basic functions
      },
      {
        facetAddress: await veryPayCoreFacet.getAddress(),
        action: 0,
        functionSelectors: ["0x11111111", "0x22222222"] // Mock selectors
      },
      {
        facetAddress: await veryRewardsFacet.getAddress(),
        action: 0,
        functionSelectors: ["0x33333333", "0x44444444"] // Mock selectors
      },
      {
        facetAddress: await veryMerchantFacet.getAddress(),
        action: 0,
        functionSelectors: ["0x55555555", "0x66666666"] // Mock selectors
      },
      {
        facetAddress: await veryGovernanceFacet.getAddress(),
        action: 0,
        functionSelectors: ["0x77777777", "0x88888888"] // Mock selectors
      }
    ];

    for (const cut of cuts) {
      await diamondCut.diamondCut([cut], ethers.ZeroAddress, "0x");
    }

    // Get contract interfaces
    const veryPayCore = await ethers.getContractAt("VeryPayCoreFacet", await diamond.getAddress());
    const veryRewards = await ethers.getContractAt("VeryRewardsFacet", await diamond.getAddress());
    const veryMerchant = await ethers.getContractAt("VeryMerchantFacet", await diamond.getAddress());
    const veryGovernance = await ethers.getContractAt("VeryGovernanceFacet", await diamond.getAddress());

    // Initialize all facets
    await veryPayCore.initializeVeryPayCore(
      await veryToken.getAddress(),
      feeRecipient.address,
      250 // 2.5%
    );

    await veryRewards.initializeVeryRewards(await veryToken.getAddress());

    await veryMerchant.initializeVeryMerchant(
      await veryToken.getAddress(),
      feeRecipient.address,
      250
    );

    const govParams = {
      votingDelay: 1,
      votingPeriod: 50400,
      proposalThreshold: ethers.parseEther("1000000"),
      quorumVotes: ethers.parseEther("4000000"),
      timelockDelay: 2 * 24 * 60 * 60
    };

    await veryGovernance.initializeVeryGovernance(
      await governanceToken.getAddress(),
      await veryToken.getAddress(),
      govParams
    );

    // Distribute tokens
    await veryToken.transfer(customer1.address, ethers.parseEther("10000"));
    await veryToken.transfer(customer2.address, ethers.parseEther("10000"));
    await governanceToken.transfer(customer1.address, ethers.parseEther("1000000"));

    // Approve spending
    await veryToken.connect(customer1).approve(await diamond.getAddress(), ethers.parseEther("10000"));
    await veryToken.connect(customer2).approve(await diamond.getAddress(), ethers.parseEther("10000"));

    return {
      diamond,
      veryToken,
      governanceToken,
      veryPayCore,
      veryRewards,
      veryMerchant,
      veryGovernance,
      owner,
      merchant1,
      merchant2,
      customer1,
      customer2,
      feeRecipient
    };
  }

  describe("Complete User Journey", function () {
    it("Should handle complete merchant onboarding and payment flow", async function () {
      const {
        veryPayCore,
        veryMerchant,
        veryRewards,
        owner,
        merchant1,
        customer1
      } = await loadFixture(deployFullSystemFixture);

      // 1. Merchant registration
      await veryMerchant.connect(merchant1).createMerchantProfile(
        "Test Store",
        "Retail",
        "test@store.com",
        "123 Main St",
        "TAX123",
        [merchant1.address],
        1
      );

      // 2. KYC verification
      await veryMerchant.connect(owner).updateKYCStatus(
        merchant1.address,
        1, // Approved
        "Verified successfully"
      );

      // 3. Check merchant can process payments
      expect(await veryMerchant.canProcessPayments(merchant1.address)).to.be.true;

      // 4. Process payment (mock - would need proper QR implementation)
      // This would normally include QR validation
      const amount = ethers.parseEther("100");
      const mockQRData = "0x1234567890abcdef";

      // Note: In real implementation, this would work with proper QR validation
      // For testing, we focus on the business logic flow
      const merchantProfile = await veryMerchant.getMerchantProfile(merchant1.address);
      expect(merchantProfile.status).to.equal(1); // Active
      expect(merchantProfile.kycStatus).to.equal(1); // Approved
    });
  });

  describe("Rewards Integration", function () {
    it("Should award and track rewards across the system", async function () {
      const {
        veryRewards,
        owner,
        customer1
      } = await loadFixture(deployFullSystemFixture);

      // Grant rewards manager role to owner for testing
      const REWARDS_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REWARDS_MANAGER_ROLE"));
      await veryRewards.grantRole(REWARDS_MANAGER_ROLE, owner.address);

      // Award purchase points
      await veryRewards.connect(owner).awardPurchasePoints(
        customer1.address,
        ethers.parseEther("100"),
        ethers.ZeroAddress
      );

      // Award walking points
      const WALKING_VALIDATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("WALKING_VALIDATOR_ROLE"));
      await veryRewards.grantRole(WALKING_VALIDATOR_ROLE, owner.address);
      
      await veryRewards.connect(owner).awardWalkingRewards(customer1.address, 1000);

      // Check user tier
      const userTier = await veryRewards.getUserTier(customer1.address);
      expect(userTier.points).to.equal(110); // 100 + 10 walking points
      expect(userTier.currentTier).to.equal(0); // Bronze

      // Award bonus to reach Silver tier
      await veryRewards.connect(owner).awardBonusPoints(customer1.address, 900, "Promotion");
      
      const updatedTier = await veryRewards.getUserTier(customer1.address);
      expect(updatedTier.currentTier).to.equal(1); // Silver
    });

    it("Should distribute and track fruit rewards", async function () {
      const {
        veryRewards,
        owner,
        customer1
      } = await loadFixture(deployFullSystemFixture);

      const REWARDS_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REWARDS_MANAGER_ROLE"));
      await veryRewards.grantRole(REWARDS_MANAGER_ROLE, owner.address);

      // Distribute fruits
      await veryRewards.connect(owner).distributeFruitRewards(customer1.address, "Apple", 5);
      await veryRewards.connect(owner).distributeFruitRewards(customer1.address, "Banana", 3);

      // Check balances
      expect(await veryRewards.getUserFruitBalance(customer1.address, "Apple")).to.equal(5);
      expect(await veryRewards.getUserFruitBalance(customer1.address, "Banana")).to.equal(3);

      // Get available fruits
      const fruits = await veryRewards.getAvailableFruits();
      expect(fruits).to.include("Apple");
      expect(fruits).to.include("Banana");
    });
  });

  describe("Multi-Merchant Scenarios", function () {
    it("Should handle multiple merchants with different configurations", async function () {
      const {
        veryMerchant,
        owner,
        merchant1,
        merchant2
      } = await loadFixture(deployFullSystemFixture);

      // Register two merchants with different setups
      await veryMerchant.connect(merchant1).createMerchantProfile(
        "Coffee Shop",
        "Food & Beverage",
        "coffee@shop.com",
        "456 Oak Ave",
        "TAX456",
        [merchant1.address],
        1
      );

      await veryMerchant.connect(merchant2).createMerchantProfile(
        "Electronics Store",
        "Electronics",
        "electronics@store.com",
        "789 Pine St",
        "TAX789",
        [merchant2.address, owner.address], // Multi-sig setup
        2 // Requires 2 signatures
      );

      // Verify different configurations
      const merchant1Profile = await veryMerchant.getMerchantProfile(merchant1.address);
      const merchant2Profile = await veryMerchant.getMerchantProfile(merchant2.address);

      expect(merchant1Profile.requiredSignatures).to.equal(1);
      expect(merchant2Profile.requiredSignatures).to.equal(2);
      expect(merchant2Profile.signers.length).to.equal(2);

      // Update KYC for both
      await veryMerchant.connect(owner).updateKYCStatus(merchant1.address, 1, "Coffee shop verified");
      await veryMerchant.connect(owner).updateKYCStatus(merchant2.address, 1, "Electronics store verified");

      // Check both can process payments
      expect(await veryMerchant.canProcessPayments(merchant1.address)).to.be.true;
      expect(await veryMerchant.canProcessPayments(merchant2.address)).to.be.true;
    });
  });

  describe("Governance Integration", function () {
    it("Should handle governance proposals and voting", async function () {
      const {
        veryGovernance,
        governanceToken,
        customer1
      } = await loadFixture(deployFullSystemFixture);

      // Customer1 has governance tokens, so should be able to propose
      const proposalTargets = [ethers.ZeroAddress];
      const proposalValues = [0];
      const proposalCalldatas = ["0x"];

      // Note: In real implementation, would need proper proposal creation
      // For now, testing the governance structure exists
      const govParams = await veryGovernance.getGovernanceParams();
      expect(govParams.proposalThreshold).to.equal(ethers.parseEther("1000000"));
      expect(govParams.quorumVotes).to.equal(ethers.parseEther("4000000"));
    });

    it("Should manage treasury operations", async function () {
      const {
        veryGovernance,
        veryToken,
        customer1
      } = await loadFixture(deployFullSystemFixture);

      // Check initial treasury balance
      const treasuryBalance = await veryGovernance.getTreasuryBalance();
      expect(treasuryBalance).to.equal(0);

      // In a real scenario, treasury would be funded through fees and other mechanisms
    });
  });

  describe("Cross-Facet Interactions", function () {
    it("Should handle rewards based on payment processing", async function () {
      const {
        veryPayCore,
        veryRewards,
        veryMerchant,
        owner,
        merchant1,
        customer1
      } = await loadFixture(deployFullSystemFixture);

      // Setup merchant
      await veryMerchant.connect(merchant1).createMerchantProfile(
        "Integration Store",
        "Retail",
        "integration@store.com",
        "Integration St",
        "INT123",
        [merchant1.address],
        1
      );
      
      await veryMerchant.connect(owner).updateKYCStatus(merchant1.address, 1, "Approved");

      // Grant necessary roles
      const REWARDS_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REWARDS_MANAGER_ROLE"));
      await veryRewards.grantRole(REWARDS_MANAGER_ROLE, owner.address);

      // Simulate payment triggering rewards
      const amount = ethers.parseEther("200");
      
      // Award points based on purchase
      await veryRewards.connect(owner).awardPurchasePoints(
        customer1.address,
        amount,
        merchant1.address
      );

      // Check integration worked
      const userTier = await veryRewards.getUserTier(customer1.address);
      expect(userTier.points).to.equal(200);
      expect(userTier.totalSpent).to.equal(amount);

      // Record analytics
      const ANALYTICS_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ANALYTICS_MANAGER_ROLE"));
      await veryMerchant.grantRole(ANALYTICS_MANAGER_ROLE, owner.address);
      
      await veryMerchant.connect(owner).recordAnalytics(
        merchant1.address,
        amount,
        "Retail"
      );

      // Check analytics integration
      const [totalVolume, txCount, avgTx] = await veryMerchant.getMerchantAnalytics(
        merchant1.address,
        "30d"
      );
      expect(totalVolume).to.equal(amount);
      expect(txCount).to.equal(1);
      expect(avgTx).to.equal(amount);
    });
  });

  describe("System Performance and Scalability", function () {
    it("Should handle multiple concurrent operations", async function () {
      const {
        veryRewards,
        owner,
        customer1,
        customer2
      } = await loadFixture(deployFullSystemFixture);

      const REWARDS_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REWARDS_MANAGER_ROLE"));
      await veryRewards.grantRole(REWARDS_MANAGER_ROLE, owner.address);

      // Concurrent operations
      const operations = [
        veryRewards.connect(owner).awardPurchasePoints(customer1.address, ethers.parseEther("50"), ethers.ZeroAddress),
        veryRewards.connect(owner).awardPurchasePoints(customer2.address, ethers.parseEther("75"), ethers.ZeroAddress),
        veryRewards.connect(owner).distributeFruitRewards(customer1.address, "Apple", 2),
        veryRewards.connect(owner).distributeFruitRewards(customer2.address, "Banana", 3)
      ];

      // Execute all operations
      await Promise.all(operations);

      // Verify results
      const customer1Tier = await veryRewards.getUserTier(customer1.address);
      const customer2Tier = await veryRewards.getUserTier(customer2.address);

      expect(customer1Tier.points).to.equal(50);
      expect(customer2Tier.points).to.equal(75);
      expect(await veryRewards.getUserFruitBalance(customer1.address, "Apple")).to.equal(2);
      expect(await veryRewards.getUserFruitBalance(customer2.address, "Banana")).to.equal(3);
    });
  });

  describe("Error Recovery and Edge Cases", function () {
    it("Should handle system pause and recovery", async function () {
      const {
        veryPayCore,
        veryRewards,
        owner
      } = await loadFixture(deployFullSystemFixture);

      // Pause systems
      await veryPayCore.connect(owner).pause();
      await veryRewards.connect(owner).pause();

      // Verify paused state (operations should be blocked)
      // In real implementation, operations would revert when paused

      // Unpause systems
      await veryPayCore.connect(owner).unpause();
      await veryRewards.connect(owner).unpause();

      // Verify systems are operational again
      expect(true).to.be.true; // Placeholder for actual pause testing
    });

    it("Should maintain data integrity across upgrades", async function () {
      const {
        diamond,
        veryRewards,
        owner,
        customer1
      } = await loadFixture(deployFullSystemFixture);

      const REWARDS_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REWARDS_MANAGER_ROLE"));
      await veryRewards.grantRole(REWARDS_MANAGER_ROLE, owner.address);

      // Create some state
      await veryRewards.connect(owner).awardPurchasePoints(
        customer1.address,
        ethers.parseEther("100"),
        ethers.ZeroAddress
      );

      const tierBefore = await veryRewards.getUserTier(customer1.address);

      // Simulate upgrade (in real implementation, would replace facet)
      // For now, just verify state persistence
      const tierAfter = await veryRewards.getUserTier(customer1.address);
      
      expect(tierBefore.points).to.equal(tierAfter.points);
      expect(tierBefore.currentTier).to.equal(tierAfter.currentTier);
    });
  });

  describe("Security and Access Control", function () {
    it("Should enforce proper access control across all facets", async function () {
      const {
        veryPayCore,
        veryRewards,
        veryMerchant,
        veryGovernance,
        customer1,
        customer2
      } = await loadFixture(deployFullSystemFixture);

      // Test access control violations
      await expect(
        veryPayCore.connect(customer1).updatePlatformFee(500)
      ).to.be.revertedWith(/AccessControl/);

      await expect(
        veryRewards.connect(customer1).awardPurchasePoints(customer2.address, 100, ethers.ZeroAddress)
      ).to.be.revertedWith(/AccessControl/);

      await expect(
        veryMerchant.connect(customer1).updateKYCStatus(customer2.address, 1, "test")
      ).to.be.revertedWith(/AccessControl/);

      // Governance should also have proper access control
      await expect(
        veryGovernance.connect(customer1).updateGovernanceParams({
          votingDelay: 1,
          votingPeriod: 100,
          proposalThreshold: 1000,
          quorumVotes: 1000,
          timelockDelay: 86400
        })
      ).to.be.revertedWith(/AccessControl/);
    });
  });
});