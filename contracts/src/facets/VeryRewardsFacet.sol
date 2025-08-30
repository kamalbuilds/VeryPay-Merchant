// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/IVeryRewards.sol";
import "../libraries/LibDiamond.sol";

/**
 * @title VeryRewardsFacet
 * @notice Loyalty rewards system facet for VeryPay
 * @dev Implements tier-based rewards with walking rewards and fruit distribution
 */
contract VeryRewardsFacet is IVeryRewards, ReentrancyGuard, Pausable, AccessControl {
    /// @notice Role for rewards managers
    bytes32 public constant REWARDS_MANAGER_ROLE = keccak256("REWARDS_MANAGER_ROLE");
    
    /// @notice Role for walking validators
    bytes32 public constant WALKING_VALIDATOR_ROLE = keccak256("WALKING_VALIDATOR_ROLE");

    /// @notice Maximum walking distance per session (10km)
    uint256 public constant MAX_WALKING_DISTANCE = 10000;

    /// @notice Minimum walking distance for rewards (100m)
    uint256 public constant MIN_WALKING_DISTANCE = 100;

    /// @notice Storage structure for VeryRewards
    struct VeryRewardsStorage {
        mapping(address => UserTier) userTiers;
        mapping(Tier => RewardConfig) tierConfigs;
        mapping(address => mapping(string => uint256)) userFruitBalances;
        mapping(bytes32 => bool) usedRewardIds;
        mapping(address => uint256) lastWalkingUpdate;
        IERC20 veryToken;
        uint256 totalPointsIssued;
        uint256 totalRewardsRedeemed;
        // Tier thresholds (points required to reach tier)
        mapping(Tier => uint256) tierThresholds;
        // Fruit types available
        string[] availableFruits;
        mapping(string => bool) validFruits;
    }

    /// @notice Storage slot for VeryRewards data
    bytes32 constant VERY_REWARDS_STORAGE_POSITION = keccak256("verypay.rewards.storage");

    /// @notice Get storage
    function veryRewardsStorage() internal pure returns (VeryRewardsStorage storage vrs) {
        bytes32 position = VERY_REWARDS_STORAGE_POSITION;
        assembly {
            vrs.slot := position
        }
    }

    /// @notice Modifier to prevent reward gaming
    modifier validWalkingUpdate(address user) {
        VeryRewardsStorage storage vrs = veryRewardsStorage();
        require(
            block.timestamp >= vrs.lastWalkingUpdate[user] + 300, // 5 minute cooldown
            "VeryRewards: Walking update too frequent"
        );
        _;
        vrs.lastWalkingUpdate[user] = block.timestamp;
    }

    /**
     * @notice Initialize VeryRewards facet
     * @param _veryToken Address of $VERY token contract
     */
    function initializeVeryRewards(address _veryToken) external {
        LibDiamond.enforceIsContractOwner();
        
        VeryRewardsStorage storage vrs = veryRewardsStorage();
        require(address(vrs.veryToken) == address(0), "VeryRewards: Already initialized");
        
        vrs.veryToken = IERC20(_veryToken);
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, LibDiamond.contractOwner());
        _grantRole(REWARDS_MANAGER_ROLE, LibDiamond.contractOwner());
        _grantRole(WALKING_VALIDATOR_ROLE, LibDiamond.contractOwner());
        
        // Initialize tier configurations
        _initializeTierConfigs(vrs);
        
        // Initialize available fruits
        _initializeFruits(vrs);
    }

    /**
     * @inheritdoc IVeryRewards
     */
    function awardPurchasePoints(
        address user,
        uint256 amount,
        address merchant
    ) 
        external 
        override 
        onlyRole(REWARDS_MANAGER_ROLE)
        returns (uint256 points) 
    {
        require(user != address(0), "VeryRewards: Zero address");
        require(amount > 0, "VeryRewards: Zero amount");
        
        VeryRewardsStorage storage vrs = veryRewardsStorage();
        UserTier storage userTier = vrs.userTiers[user];
        
        // Calculate base points (1 point per dollar equivalent)
        points = amount / 10**18; // Assuming 18 decimals for VERY token
        
        // Apply tier multiplier
        uint256 multiplier = getTierMultiplier(userTier.currentTier);
        points = (points * multiplier) / 10000; // multiplier is in basis points
        
        // Award points
        userTier.points += points;
        userTier.totalSpent += amount;
        userTier.lastUpdate = block.timestamp;
        
        vrs.totalPointsIssued += points;
        
        // Check for tier upgrade
        _checkTierUpgrade(user);
        
        emit PointsEarned(user, points, RewardType.Purchase, "Purchase reward");
        
        return points;
    }

    /**
     * @inheritdoc IVeryRewards
     */
    function awardWalkingRewards(
        address user,
        uint256 distance
    ) 
        external 
        override 
        onlyRole(WALKING_VALIDATOR_ROLE)
        validWalkingUpdate(user)
        returns (uint256 points) 
    {
        require(user != address(0), "VeryRewards: Zero address");
        require(
            distance >= MIN_WALKING_DISTANCE && distance <= MAX_WALKING_DISTANCE,
            "VeryRewards: Invalid distance"
        );
        
        VeryRewardsStorage storage vrs = veryRewardsStorage();
        UserTier storage userTier = vrs.userTiers[user];
        
        // Calculate walking points (1 point per 100 meters)
        points = distance / 100;
        
        // Apply tier multiplier
        uint256 multiplier = getTierMultiplier(userTier.currentTier);
        points = (points * multiplier) / 10000;
        
        // Award points
        userTier.points += points;
        userTier.walkingDistance += distance;
        userTier.lastUpdate = block.timestamp;
        
        vrs.totalPointsIssued += points;
        
        // Check for tier upgrade
        _checkTierUpgrade(user);
        
        emit PointsEarned(
            user, 
            points, 
            RewardType.Walking, 
            string(abi.encodePacked("Walked ", _toString(distance), " meters"))
        );
        
        return points;
    }

    /**
     * @inheritdoc IVeryRewards
     */
    function distributeFruitRewards(
        address user,
        string calldata fruitType,
        uint256 quantity
    ) external override onlyRole(REWARDS_MANAGER_ROLE) {
        require(user != address(0), "VeryRewards: Zero address");
        require(quantity > 0, "VeryRewards: Zero quantity");
        
        VeryRewardsStorage storage vrs = veryRewardsStorage();
        require(vrs.validFruits[fruitType], "VeryRewards: Invalid fruit type");
        
        vrs.userFruitBalances[user][fruitType] += quantity;
        
        emit FruitRewardDistributed(user, fruitType, quantity);
    }

    /**
     * @inheritdoc IVeryRewards
     */
    function redeemPoints(
        uint256 points,
        bytes32 rewardId
    ) external override nonReentrant whenNotPaused returns (bool success) {
        require(points > 0, "VeryRewards: Zero points");
        
        VeryRewardsStorage storage vrs = veryRewardsStorage();
        UserTier storage userTier = vrs.userTiers[msg.sender];
        
        require(userTier.points >= points, "VeryRewards: Insufficient points");
        require(!vrs.usedRewardIds[rewardId], "VeryRewards: Reward already redeemed");
        
        // Deduct points
        userTier.points -= points;
        userTier.lastUpdate = block.timestamp;
        
        // Mark reward as used
        vrs.usedRewardIds[rewardId] = true;
        vrs.totalRewardsRedeemed += points;
        
        emit PointsRedeemed(msg.sender, points, rewardId);
        
        return true;
    }

    /**
     * @inheritdoc IVeryRewards
     */
    function getUserTier(address user)
        external
        view
        override
        returns (UserTier memory tierInfo)
    {
        return veryRewardsStorage().userTiers[user];
    }

    /**
     * @inheritdoc IVeryRewards
     */
    function calculateTierUpgrade(address user)
        external
        view
        override
        returns (Tier nextTier, uint256 pointsNeeded)
    {
        VeryRewardsStorage storage vrs = veryRewardsStorage();
        UserTier storage userTier = vrs.userTiers[user];
        
        Tier currentTier = userTier.currentTier;
        
        if (currentTier == Tier.Platinum) {
            return (Tier.Platinum, 0); // Already at max tier
        }
        
        nextTier = Tier(uint256(currentTier) + 1);
        uint256 requiredPoints = vrs.tierThresholds[nextTier];
        
        pointsNeeded = requiredPoints > userTier.points ? 
            requiredPoints - userTier.points : 0;
    }

    /**
     * @inheritdoc IVeryRewards
     */
    function getTierMultiplier(Tier tier) 
        public 
        pure 
        override 
        returns (uint256 multiplier) 
    {
        if (tier == Tier.Bronze) return 10000; // 1x (100%)
        if (tier == Tier.Silver) return 12500; // 1.25x (125%)
        if (tier == Tier.Gold) return 15000;   // 1.5x (150%)
        if (tier == Tier.Platinum) return 20000; // 2x (200%)
        return 10000; // Default 1x
    }

    /**
     * @notice Get user fruit balance
     * @param user User address
     * @param fruitType Fruit type
     * @return balance Fruit balance
     */
    function getUserFruitBalance(address user, string calldata fruitType) 
        external 
        view 
        returns (uint256 balance) 
    {
        return veryRewardsStorage().userFruitBalances[user][fruitType];
    }

    /**
     * @notice Get all available fruit types
     * @return fruits Array of available fruit types
     */
    function getAvailableFruits() external view returns (string[] memory fruits) {
        return veryRewardsStorage().availableFruits;
    }

    /**
     * @notice Add new fruit type
     * @param fruitType New fruit type to add
     */
    function addFruitType(string calldata fruitType) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        VeryRewardsStorage storage vrs = veryRewardsStorage();
        require(!vrs.validFruits[fruitType], "VeryRewards: Fruit already exists");
        
        vrs.validFruits[fruitType] = true;
        vrs.availableFruits.push(fruitType);
        
        emit FruitTypeAdded(fruitType);
    }

    /**
     * @notice Update tier threshold
     * @param tier Tier to update
     * @param threshold New points threshold
     */
    function updateTierThreshold(Tier tier, uint256 threshold) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        VeryRewardsStorage storage vrs = veryRewardsStorage();
        uint256 oldThreshold = vrs.tierThresholds[tier];
        vrs.tierThresholds[tier] = threshold;
        
        emit TierThresholdUpdated(tier, oldThreshold, threshold);
    }

    /**
     * @notice Award bonus points to user
     * @param user User address
     * @param points Bonus points to award
     * @param reason Reason for bonus
     */
    function awardBonusPoints(
        address user,
        uint256 points,
        string calldata reason
    ) external onlyRole(REWARDS_MANAGER_ROLE) {
        require(user != address(0), "VeryRewards: Zero address");
        require(points > 0, "VeryRewards: Zero points");
        
        VeryRewardsStorage storage vrs = veryRewardsStorage();
        UserTier storage userTier = vrs.userTiers[user];
        
        userTier.points += points;
        userTier.lastUpdate = block.timestamp;
        vrs.totalPointsIssued += points;
        
        _checkTierUpgrade(user);
        
        emit PointsEarned(user, points, RewardType.Bonus, reason);
    }

    /**
     * @notice Get rewards statistics
     * @return totalIssued Total points issued
     * @return totalRedeemed Total points redeemed
     * @return activeUsers Number of users with points
     */
    function getRewardsStats() 
        external 
        view 
        returns (uint256 totalIssued, uint256 totalRedeemed, uint256 activeUsers) 
    {
        VeryRewardsStorage storage vrs = veryRewardsStorage();
        return (vrs.totalPointsIssued, vrs.totalRewardsRedeemed, 0); // activeUsers needs separate tracking
    }

    /**
     * @notice Emergency pause
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Initialize tier configurations
     */
    function _initializeTierConfigs(VeryRewardsStorage storage vrs) internal {
        // Set tier thresholds
        vrs.tierThresholds[Tier.Bronze] = 0;
        vrs.tierThresholds[Tier.Silver] = 1000;   // 1,000 points
        vrs.tierThresholds[Tier.Gold] = 5000;     // 5,000 points
        vrs.tierThresholds[Tier.Platinum] = 25000; // 25,000 points
        
        // Set tier configs (can be expanded)
        vrs.tierConfigs[Tier.Bronze] = RewardConfig({
            pointsPerDollar: 1,
            walkingMultiplier: 1,
            tierBonus: 0,
            isActive: true
        });
    }

    /**
     * @notice Initialize available fruits
     */
    function _initializeFruits(VeryRewardsStorage storage vrs) internal {
        string[5] memory fruits = ["Apple", "Banana", "Orange", "Grape", "Berry"];
        
        for (uint256 i = 0; i < fruits.length; i++) {
            vrs.validFruits[fruits[i]] = true;
            vrs.availableFruits.push(fruits[i]);
        }
    }

    /**
     * @notice Check and upgrade user tier if eligible
     */
    function _checkTierUpgrade(address user) internal {
        VeryRewardsStorage storage vrs = veryRewardsStorage();
        UserTier storage userTier = vrs.userTiers[user];
        
        Tier currentTier = userTier.currentTier;
        uint256 currentPoints = userTier.points;
        
        // Check for tier upgrades
        if (currentTier == Tier.Bronze && currentPoints >= vrs.tierThresholds[Tier.Silver]) {
            _upgradeTier(user, Tier.Silver);
        } else if (currentTier == Tier.Silver && currentPoints >= vrs.tierThresholds[Tier.Gold]) {
            _upgradeTier(user, Tier.Gold);
        } else if (currentTier == Tier.Gold && currentPoints >= vrs.tierThresholds[Tier.Platinum]) {
            _upgradeTier(user, Tier.Platinum);
        }
    }

    /**
     * @notice Upgrade user tier
     */
    function _upgradeTier(address user, Tier newTier) internal {
        VeryRewardsStorage storage vrs = veryRewardsStorage();
        UserTier storage userTier = vrs.userTiers[user];
        
        Tier oldTier = userTier.currentTier;
        userTier.currentTier = newTier;
        userTier.tierStartTime = block.timestamp;
        
        emit TierUpgraded(user, oldTier, newTier);
    }

    /**
     * @notice Convert uint to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }

    /// @notice Additional events
    event PointsRedeemed(address indexed user, uint256 points, bytes32 rewardId);
    event FruitTypeAdded(string fruitType);
    event TierThresholdUpdated(Tier indexed tier, uint256 oldThreshold, uint256 newThreshold);
}