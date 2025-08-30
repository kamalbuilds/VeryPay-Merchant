// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IVeryGovernance
 * @notice Interface for VeryPay DAO governance system
 * @dev Proposal creation, voting, treasury management, and parameter updates
 */
interface IVeryGovernance {
    /// @notice Proposal state enumeration
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }

    /// @notice Vote type enumeration
    enum VoteType {
        Against,
        For,
        Abstain
    }

    /// @notice Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool canceled;
        bool executed;
        uint256 eta; // Execution timelock
    }

    /// @notice Treasury allocation structure
    struct TreasuryAllocation {
        address recipient;
        uint256 amount;
        string purpose;
        uint256 unlockTime;
        bool executed;
    }

    /// @notice Governance parameters structure
    struct GovernanceParams {
        uint256 votingDelay;
        uint256 votingPeriod;
        uint256 proposalThreshold;
        uint256 quorumVotes;
        uint256 timelockDelay;
    }

    /// @notice Emitted when a proposal is created
    /// @param proposalId Proposal identifier
    /// @param proposer Address that created the proposal
    /// @param title Proposal title
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title
    );

    /// @notice Emitted when a vote is cast
    /// @param voter Address that cast the vote
    /// @param proposalId Proposal identifier
    /// @param support Vote type (for, against, abstain)
    /// @param weight Vote weight
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support,
        uint256 weight
    );

    /// @notice Emitted when a proposal is executed
    /// @param proposalId Proposal identifier
    event ProposalExecuted(uint256 indexed proposalId);

    /// @notice Emitted when treasury funds are allocated
    /// @param recipient Allocation recipient
    /// @param amount Amount allocated
    /// @param purpose Purpose of allocation
    event TreasuryAllocation(
        address indexed recipient,
        uint256 amount,
        string purpose
    );

    /**
     * @notice Create a new governance proposal
     * @param targets Array of target addresses for proposal calls
     * @param values Array of values for proposal calls
     * @param calldatas Array of calldatas for proposal calls
     * @param title Proposal title
     * @param description Proposal description
     * @return proposalId Created proposal identifier
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory title,
        string memory description
    ) external returns (uint256 proposalId);

    /**
     * @notice Cast a vote on a proposal
     * @param proposalId Proposal identifier
     * @param support Vote type (0=against, 1=for, 2=abstain)
     * @param reason Reason for vote
     * @return weight Vote weight
     */
    function castVote(
        uint256 proposalId,
        uint8 support,
        string calldata reason
    ) external returns (uint256 weight);

    /**
     * @notice Cast vote with signature
     * @param proposalId Proposal identifier
     * @param support Vote type
     * @param voter Voter address
     * @param signature Vote signature
     * @return weight Vote weight
     */
    function castVoteBySig(
        uint256 proposalId,
        uint8 support,
        address voter,
        bytes calldata signature
    ) external returns (uint256 weight);

    /**
     * @notice Execute a successful proposal
     * @param proposalId Proposal identifier
     * @return success Whether execution was successful
     */
    function execute(uint256 proposalId) external returns (bool success);

    /**
     * @notice Cancel a proposal
     * @param proposalId Proposal identifier
     */
    function cancel(uint256 proposalId) external;

    /**
     * @notice Allocate treasury funds
     * @param recipient Fund recipient
     * @param amount Amount to allocate
     * @param purpose Purpose of allocation
     * @param unlockTime When funds can be claimed
     * @return allocationId Allocation identifier
     */
    function allocateTreasuryFunds(
        address recipient,
        uint256 amount,
        string calldata purpose,
        uint256 unlockTime
    ) external returns (uint256 allocationId);

    /**
     * @notice Update governance parameters
     * @param params New governance parameters
     */
    function updateGovernanceParams(GovernanceParams calldata params) external;

    /**
     * @notice Get proposal details
     * @param proposalId Proposal identifier
     * @return proposal Proposal structure
     */
    function getProposal(uint256 proposalId)
        external
        view
        returns (Proposal memory proposal);

    /**
     * @notice Get proposal state
     * @param proposalId Proposal identifier
     * @return state Current proposal state
     */
    function getProposalState(uint256 proposalId)
        external
        view
        returns (ProposalState state);

    /**
     * @notice Get voting power for an address at a block
     * @param account Address to check
     * @param blockNumber Block number
     * @return votes Voting power
     */
    function getVotes(address account, uint256 blockNumber)
        external
        view
        returns (uint256 votes);

    /**
     * @notice Get current governance parameters
     * @return params Current governance parameters
     */
    function getGovernanceParams()
        external
        view
        returns (GovernanceParams memory params);

    /**
     * @notice Get treasury balance
     * @return balance Current treasury balance
     */
    function getTreasuryBalance() external view returns (uint256 balance);

    /**
     * @notice Check if address has voting power
     * @param account Address to check
     * @return hasVotes Whether address has voting power
     */
    function hasVotingPower(address account) external view returns (bool hasVotes);
}