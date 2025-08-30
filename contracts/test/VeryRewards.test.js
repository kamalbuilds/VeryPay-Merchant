const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * VeryRewards Facet Tests
 * Comprehensive test suite for loyalty rewards system functionality
 */
describe("VeryRewards", function () {
  // Test fixtures
  async function deployVeryRewardsFixture() {
    const [owner, user1, user2, rewardsManager, walkingValidator] = await ethers.getSigners();

    // Deploy mock VERY token
    const VeryToken = await ethers.getContractFactory("MockERC20");
    const veryToken = await VeryToken.deploy("VERY Token", "VERY", ethers.parseEther("1000000000"));
    
    // Deploy diamond and facets (simplified for testing)
    const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
    const diamondCutFacet = await DiamondCutFacet.deploy();

    const Diamond = await ethers.getContractFactory("Diamond");
    const diamond = await Diamond.deploy(owner.address, await diamondCutFacet.getAddress());

    const VeryRewardsFacet = await ethers.getContractFactory("VeryRewardsFacet");
    const veryRewardsFacet = await VeryRewardsFacet.deploy();

    // Get VeryRewards interface
    const veryRewards = await ethers.getContractAt("VeryRewardsFacet", await diamond.getAddress());

    // Initialize
    await veryRewards.initializeVeryRewards(await veryToken.getAddress());

    // Grant roles
    const REWARDS_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REWARDS_MANAGER_ROLE"));
    const WALKING_VALIDATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("WALKING_VALIDATOR_ROLE"));
    
    await veryRewards.grantRole(REWARDS_MANAGER_ROLE, rewardsManager.address);
    await veryRewards.grantRole(WALKING_VALIDATOR_ROLE, walkingValidator.address);

    return {
      diamond,
      veryRewards,
      veryToken,
      owner,
      user1,
      user2,
      rewardsManager,
      walkingValidator,
      REWARDS_MANAGER_ROLE,
      WALKING_VALIDATOR_ROLE
    };
  }

  describe("Deployment and Initialization", function () {
    it("Should initialize correctly", async function () {
      const { veryRewards } = await loadFixture(deployVeryRewardsFixture);

      // Check initial tier thresholds
      const bronzeTier = await veryRewards.calculateTierUpgrade(ethers.ZeroAddress);
      expect(bronzeTier[0]).to.equal(1); // Silver tier (next from Bronze)
    });

    it("Should have correct tier multipliers", async function () {
      const { veryRewards } = await loadFixture(deployVeryRewardsFixture);

      expect(await veryRewards.getTierMultiplier(0)).to.equal(10000); // Bronze: 1x
      expect(await veryRewards.getTierMultiplier(1)).to.equal(12500); // Silver: 1.25x
      expect(await veryRewards.getTierMultiplier(2)).to.equal(15000); // Gold: 1.5x
      expect(await veryRewards.getTierMultiplier(3)).to.equal(20000); // Platinum: 2x
    });

    it("Should initialize with default fruits", async function () {
      const { veryRewards } = await loadFixture(deployVeryRewardsFixture);

      const availableFruits = await veryRewards.getAvailableFruits();
      expect(availableFruits).to.include("Apple");
      expect(availableFruits).to.include("Banana");
      expect(availableFruits).to.include("Orange");
      expect(availableFruits.length).to.equal(5);
    });
  });

  describe("Purchase Points", function () {
    it("Should award purchase points correctly", async function () {
      const { veryRewards, rewardsManager, user1 } = await loadFixture(deployVeryRewardsFixture);

      const amount = ethers.parseEther("100"); // 100 VERY tokens
      const merchant = ethers.ZeroAddress; // Mock merchant

      await expect(
        veryRewards.connect(rewardsManager).awardPurchasePoints(user1.address, amount, merchant)
      ).to.emit(veryRewards, "PointsEarned")
        .withArgs(user1.address, 100, 0, "Purchase reward"); // 100 tokens = 100 points (Bronze tier)

      const userTier = await veryRewards.getUserTier(user1.address);
      expect(userTier.points).to.equal(100);
      expect(userTier.totalSpent).to.equal(amount);
      expect(userTier.currentTier).to.equal(0); // Bronze
    });

    it("Should apply tier multipliers correctly", async function () {
      const { veryRewards, rewardsManager, user1, owner } = await loadFixture(deployVeryRewardsFixture);

      // First, give user enough points to reach Silver tier
      await veryRewards.connect(rewardsManager).awardBonusPoints(user1.address, 1000, "Tier boost");
      
      // User should now be Silver tier
      let userTier = await veryRewards.getUserTier(user1.address);
      expect(userTier.currentTier).to.equal(1); // Silver

      // Award purchase points with Silver multiplier
      const amount = ethers.parseEther("100"); // 100 VERY tokens
      await veryRewards.connect(rewardsManager).awardPurchasePoints(user1.address, amount, ethers.ZeroAddress);

      userTier = await veryRewards.getUserTier(user1.address);
      expect(userTier.points).to.equal(1125); // 1000 + (100 * 1.25)
    });

    it("Should not allow non-manager to award points", async function () {
      const { veryRewards, user1, user2 } = await loadFixture(deployVeryRewardsFixture);

      await expect(
        veryRewards.connect(user1).awardPurchasePoints(user2.address, ethers.parseEther("100"), ethers.ZeroAddress)
      ).to.be.revertedWith(/AccessControl/);
    });

    it("Should reject zero amount", async function () {
      const { veryRewards, rewardsManager, user1 } = await loadFixture(deployVeryRewardsFixture);

      await expect(
        veryRewards.connect(rewardsManager).awardPurchasePoints(user1.address, 0, ethers.ZeroAddress)
      ).to.be.revertedWith("VeryRewards: Zero amount");
    });
  });

  describe("Walking Rewards", function () {
    it("Should award walking rewards correctly", async function () {
      const { veryRewards, walkingValidator, user1 } = await loadFixture(deployVeryRewardsFixture);

      const distance = 1000; // 1000 meters = 10 points
      
      await expect(
        veryRewards.connect(walkingValidator).awardWalkingRewards(user1.address, distance)
      ).to.emit(veryRewards, "PointsEarned")
        .withArgs(user1.address, 10, 1, "Walked 1000 meters"); // 1000m / 100 = 10 points

      const userTier = await veryRewards.getUserTier(user1.address);
      expect(userTier.points).to.equal(10);
      expect(userTier.walkingDistance).to.equal(distance);
    });

    it("Should enforce minimum walking distance", async function () {
      const { veryRewards, walkingValidator, user1 } = await loadFixture(deployVeryRewardsFixture);

      await expect(
        veryRewards.connect(walkingValidator).awardWalkingRewards(user1.address, 50) // Below 100m minimum
      ).to.be.revertedWith("VeryRewards: Invalid distance");
    });

    it("Should enforce maximum walking distance", async function () {
      const { veryRewards, walkingValidator, user1 } = await loadFixture(deployVeryRewardsFixture);

      await expect(
        veryRewards.connect(walkingValidator).awardWalkingRewards(user1.address, 11000) // Above 10km maximum
      ).to.be.revertedWith("VeryRewards: Invalid distance");
    });

    it("Should enforce walking cooldown", async function () {
      const { veryRewards, walkingValidator, user1 } = await loadFixture(deployVeryRewardsFixture);

      // First walking reward
      await veryRewards.connect(walkingValidator).awardWalkingRewards(user1.address, 1000);

      // Second walking reward immediately should fail
      await expect(
        veryRewards.connect(walkingValidator).awardWalkingRewards(user1.address, 1000)
      ).to.be.revertedWith("VeryRewards: Walking update too frequent");
    });

    it("Should allow walking after cooldown period", async function () {
      const { veryRewards, walkingValidator, user1 } = await loadFixture(deployVeryRewardsFixture);

      // First walking reward
      await veryRewards.connect(walkingValidator).awardWalkingRewards(user1.address, 1000);

      // Advance time by 5 minutes (300 seconds)
      await time.increase(300);

      // Second walking reward should now work
      await expect(
        veryRewards.connect(walkingValidator).awardWalkingRewards(user1.address, 1000)
      ).not.to.be.reverted;

      const userTier = await veryRewards.getUserTier(user1.address);
      expect(userTier.points).to.equal(20); // 10 + 10
      expect(userTier.walkingDistance).to.equal(2000); // 1000 + 1000
    });
  });

  describe("Tier System", function () {
    it("Should upgrade tier when threshold is reached", async function () {
      const { veryRewards, rewardsManager, user1 } = await loadFixture(deployVeryRewardsFixture);

      // Award points to reach Silver tier (1000 points)
      await expect(
        veryRewards.connect(rewardsManager).awardBonusPoints(user1.address, 1000, "Tier upgrade test")
      ).to.emit(veryRewards, "TierUpgraded")
        .withArgs(user1.address, 0, 1); // Bronze to Silver

      const userTier = await veryRewards.getUserTier(user1.address);
      expect(userTier.currentTier).to.equal(1); // Silver
      expect(userTier.points).to.equal(1000);
    });

    it("Should upgrade multiple tiers if enough points", async function () {
      const { veryRewards, rewardsManager, user1 } = await loadFixture(deployVeryRewardsFixture);

      // Award enough points to reach Gold tier directly (5000 points)
      await veryRewards.connect(rewardsManager).awardBonusPoints(user1.address, 5000, "Big bonus");

      const userTier = await veryRewards.getUserTier(user1.address);
      expect(userTier.currentTier).to.equal(2); // Gold
    });

    it("Should calculate tier upgrade requirements correctly", async function () {
      const { veryRewards, user1 } = await loadFixture(deployVeryRewardsFixture);

      // New user (Bronze tier)
      const [nextTier, pointsNeeded] = await veryRewards.calculateTierUpgrade(user1.address);
      expect(nextTier).to.equal(1); // Silver
      expect(pointsNeeded).to.equal(1000); // 1000 points needed for Silver
    });

    it("Should return correct info for max tier", async function () {
      const { veryRewards, rewardsManager, user1 } = await loadFixture(deployVeryRewardsFixture);

      // Award enough points for Platinum tier
      await veryRewards.connect(rewardsManager).awardBonusPoints(user1.address, 25000, "Platinum upgrade");

      const [nextTier, pointsNeeded] = await veryRewards.calculateTierUpgrade(user1.address);
      expect(nextTier).to.equal(3); // Still Platinum (max tier)
      expect(pointsNeeded).to.equal(0); // No more points needed
    });
  });

  describe("Fruit Rewards", function () {
    it("Should distribute fruit rewards", async function () {
      const { veryRewards, rewardsManager, user1 } = await loadFixture(deployVeryRewardsFixture);

      await expect(
        veryRewards.connect(rewardsManager).distributeFruitRewards(user1.address, "Apple", 5)
      ).to.emit(veryRewards, "FruitRewardDistributed")
        .withArgs(user1.address, "Apple", 5);

      const appleBalance = await veryRewards.getUserFruitBalance(user1.address, "Apple");
      expect(appleBalance).to.equal(5);
    });

    it("Should reject invalid fruit types", async function () {
      const { veryRewards, rewardsManager, user1 } = await loadFixture(deployVeryRewardsFixture);

      await expect(
        veryRewards.connect(rewardsManager).distributeFruitRewards(user1.address, "InvalidFruit", 5)
      ).to.be.revertedWith("VeryRewards: Invalid fruit type");
    });

    it("Should accumulate fruit rewards", async function () {
      const { veryRewards, rewardsManager, user1 } = await loadFixture(deployVeryRewardsFixture);

      // First distribution
      await veryRewards.connect(rewardsManager).distributeFruitRewards(user1.address, "Banana", 3);
      
      // Second distribution
      await veryRewards.connect(rewardsManager).distributeFruitRewards(user1.address, "Banana", 2);

      const bananaBalance = await veryRewards.getUserFruitBalance(user1.address, "Banana");
      expect(bananaBalance).to.equal(5);
    });

    it("Should allow adding new fruit types", async function () {
      const { veryRewards, owner } = await loadFixture(deployVeryRewardsFixture);

      await expect(
        veryRewards.connect(owner).addFruitType("Pineapple")
      ).to.emit(veryRewards, "FruitTypeAdded")
        .withArgs("Pineapple");

      const availableFruits = await veryRewards.getAvailableFruits();
      expect(availableFruits).to.include("Pineapple");
    });

    it("Should not allow duplicate fruit types", async function () {
      const { veryRewards, owner } = await loadFixture(deployVeryRewardsFixture);

      await expect(
        veryRewards.connect(owner).addFruitType("Apple") // Already exists
      ).to.be.revertedWith("VeryRewards: Fruit already exists");
    });
  });

  describe("Points Redemption", function () {
    it("Should redeem points successfully", async function () {
      const { veryRewards, rewardsManager, user1 } = await loadFixture(deployVeryRewardsFixture);

      // First, give user some points
      await veryRewards.connect(rewardsManager).awardBonusPoints(user1.address, 500, "Initial points");

      const rewardId = ethers.keccak256(ethers.toUtf8Bytes("test_reward_123"));
      
      await expect(
        veryRewards.connect(user1).redeemPoints(100, rewardId)
      ).to.emit(veryRewards, "PointsRedeemed")
        .withArgs(user1.address, 100, rewardId);

      const userTier = await veryRewards.getUserTier(user1.address);
      expect(userTier.points).to.equal(400); // 500 - 100
    });

    it("Should not allow redeeming more points than available", async function () {
      const { veryRewards, rewardsManager, user1 } = await loadFixture(deployVeryRewardsFixture);

      // Give user 100 points
      await veryRewards.connect(rewardsManager).awardBonusPoints(user1.address, 100, "Initial points");

      const rewardId = ethers.keccak256(ethers.toUtf8Bytes("test_reward"));
      
      await expect(
        veryRewards.connect(user1).redeemPoints(200, rewardId) // More than available
      ).to.be.revertedWith("VeryRewards: Insufficient points");
    });

    it("Should not allow redeeming same reward twice", async function () {
      const { veryRewards, rewardsManager, user1 } = await loadFixture(deployVeryRewardsFixture);

      // Give user points
      await veryRewards.connect(rewardsManager).awardBonusPoints(user1.address, 500, "Initial points");

      const rewardId = ethers.keccak256(ethers.toUtf8Bytes("unique_reward"));
      
      // First redemption
      await veryRewards.connect(user1).redeemPoints(100, rewardId);
      
      // Second redemption with same ID should fail
      await expect(
        veryRewards.connect(user1).redeemPoints(100, rewardId)
      ).to.be.revertedWith("VeryRewards: Reward already redeemed");
    });
  });

  describe("Bonus Points", function () {
    it("Should award bonus points", async function () {
      const { veryRewards, rewardsManager, user1 } = await loadFixture(deployVeryRewardsFixture);

      await expect(
        veryRewards.connect(rewardsManager).awardBonusPoints(user1.address, 250, "Special promotion")
      ).to.emit(veryRewards, "PointsEarned")
        .withArgs(user1.address, 250, 4, "Special promotion"); // RewardType.Bonus = 4

      const userTier = await veryRewards.getUserTier(user1.address);
      expect(userTier.points).to.equal(250);
    });

    it("Should trigger tier upgrade with bonus points", async function () {
      const { veryRewards, rewardsManager, user1 } = await loadFixture(deployVeryRewardsFixture);

      // Award bonus points to reach Silver tier
      await expect(
        veryRewards.connect(rewardsManager).awardBonusPoints(user1.address, 1500, "Big bonus")
      ).to.emit(veryRewards, "TierUpgraded");

      const userTier = await veryRewards.getUserTier(user1.address);
      expect(userTier.currentTier).to.equal(1); // Silver tier
    });
  });

  describe("Admin Functions", function () {
    it("Should update tier thresholds", async function () {
      const { veryRewards, owner } = await loadFixture(deployVeryRewardsFixture);

      await expect(
        veryRewards.connect(owner).updateTierThreshold(1, 1200) // Silver tier: 1200 points
      ).to.emit(veryRewards, "TierThresholdUpdated")
        .withArgs(1, 1000, 1200);
    });

    it("Should get rewards statistics", async function () {
      const { veryRewards, rewardsManager, user1 } = await loadFixture(deployVeryRewardsFixture);

      // Award some points
      await veryRewards.connect(rewardsManager).awardBonusPoints(user1.address, 500, "Test");
      
      // Redeem some points
      await veryRewards.connect(user1).redeemPoints(100, ethers.keccak256(ethers.toUtf8Bytes("test")));

      const [totalIssued, totalRedeemed] = await veryRewards.getRewardsStats();
      expect(totalIssued).to.equal(500);
      expect(totalRedeemed).to.equal(100);
    });
  });

  describe("Emergency Controls", function () {
    it("Should pause and unpause contract", async function () {
      const { veryRewards, owner } = await loadFixture(deployVeryRewardsFixture);

      await veryRewards.connect(owner).pause();
      // Contract should be paused now

      await veryRewards.connect(owner).unpause();
      // Contract should be unpaused now
    });

    it("Should not allow non-admin to pause", async function () {
      const { veryRewards, user1 } = await loadFixture(deployVeryRewardsFixture);

      await expect(
        veryRewards.connect(user1).pause()
      ).to.be.revertedWith(/AccessControl/);
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle zero address correctly", async function () {
      const { veryRewards, rewardsManager } = await loadFixture(deployVeryRewardsFixture);

      await expect(
        veryRewards.connect(rewardsManager).awardPurchasePoints(ethers.ZeroAddress, ethers.parseEther("100"), ethers.ZeroAddress)
      ).to.be.revertedWith("VeryRewards: Zero address");
    });

    it("Should handle tier calculations for new users", async function () {
      const { veryRewards, user1 } = await loadFixture(deployVeryRewardsFixture);

      const userTier = await veryRewards.getUserTier(user1.address);
      expect(userTier.currentTier).to.equal(0); // Bronze
      expect(userTier.points).to.equal(0);
      expect(userTier.totalSpent).to.equal(0);
      expect(userTier.walkingDistance).to.equal(0);
    });

    it("Should maintain consistent state after multiple operations", async function () {
      const { veryRewards, rewardsManager, walkingValidator, user1 } = await loadFixture(deployVeryRewardsFixture);

      // Multiple reward operations
      await veryRewards.connect(rewardsManager).awardPurchasePoints(user1.address, ethers.parseEther("50"), ethers.ZeroAddress);
      await veryRewards.connect(rewardsManager).awardBonusPoints(user1.address, 200, "Bonus");
      
      // Wait for cooldown and add walking rewards
      await time.increase(300);
      await veryRewards.connect(walkingValidator).awardWalkingRewards(user1.address, 1000);

      const userTier = await veryRewards.getUserTier(user1.address);
      expect(userTier.points).to.equal(260); // 50 + 200 + 10
      expect(userTier.totalSpent).to.equal(ethers.parseEther("50"));
      expect(userTier.walkingDistance).to.equal(1000);
    });
  });
});