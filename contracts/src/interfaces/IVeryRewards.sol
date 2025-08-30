// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IVeryRewards
 * @notice Interface for VeryPay Rewards loyalty system
 * @dev Tier-based rewards system with walking rewards and fruit distribution
 */
interface IVeryRewards {
    /// @notice Reward tiers enumeration
    enum Tier {
        Bronze,
        Silver,
        Gold,
        Platinum
    }

    /// @notice Reward types enumeration
    enum RewardType {
        Purchase,
        Walking,
        Referral,
        Fruit,
        Bonus
    }

    /// @notice User tier information structure
    struct UserTier {
        Tier currentTier;
        uint256 points;
        uint256 totalSpent;
        uint256 walkingDistance;
        uint256 lastUpdate;
        uint256 tierStartTime;
    }

    /// @notice Reward configuration structure
    struct RewardConfig {
        uint256 pointsPerDollar;
        uint256 walkingMultiplier;
        uint256 tierBonus;
        bool isActive;
    }

    /// @notice Emitted when points are earned
    /// @param user User address
    /// @param points Points earned
    /// @param rewardType Type of reward
    /// @param metadata Additional reward data
    event PointsEarned(
        address indexed user,
        uint256 points,
        RewardType rewardType,
        string metadata
    );

    /// @notice Emitted when tier is upgraded
    /// @param user User address
    /// @param oldTier Previous tier
    /// @param newTier New tier
    event TierUpgraded(
        address indexed user,
        Tier oldTier,
        Tier newTier
    );

    /// @notice Emitted when fruit rewards are distributed
    /// @param user User address
    /// @param fruitType Type of fruit reward
    /// @param quantity Quantity distributed
    event FruitRewardDistributed(
        address indexed user,
        string fruitType,
        uint256 quantity
    );

    /**
     * @notice Award points for purchase
     * @param user User address
     * @param amount Purchase amount
     * @param merchant Merchant address
     * @return points Points awarded
     */
    function awardPurchasePoints(
        address user,
        uint256 amount,
        address merchant
    ) external returns (uint256 points);

    /**
     * @notice Award walking rewards
     * @param user User address
     * @param distance Distance walked (in meters)
     * @return points Points awarded for walking
     */
    function awardWalkingRewards(
        address user,
        uint256 distance
    ) external returns (uint256 points);

    /**
     * @notice Distribute fruit rewards
     * @param user User address
     * @param fruitType Type of fruit
     * @param quantity Quantity to distribute
     */
    function distributeFruitRewards(
        address user,
        string calldata fruitType,
        uint256 quantity
    ) external;

    /**
     * @notice Redeem points for rewards
     * @param points Points to redeem
     * @param rewardId Reward identifier
     * @return success Whether redemption was successful
     */
    function redeemPoints(
        uint256 points,
        bytes32 rewardId
    ) external returns (bool success);

    /**
     * @notice Get user tier information
     * @param user User address
     * @return tierInfo User tier information
     */
    function getUserTier(address user)
        external
        view
        returns (UserTier memory tierInfo);

    /**
     * @notice Calculate tier upgrade requirements
     * @param user User address
     * @return nextTier Next tier user can reach
     * @return pointsNeeded Points needed for upgrade
     */
    function calculateTierUpgrade(address user)
        external
        view
        returns (Tier nextTier, uint256 pointsNeeded);

    /**
     * @notice Get reward multiplier for tier
     * @param tier User tier
     * @return multiplier Reward multiplier (in basis points)
     */
    function getTierMultiplier(Tier tier)
        external
        pure
        returns (uint256 multiplier);
}