// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "../interfaces/IVeryGovernance.sol";
import "../libraries/LibDiamond.sol";

/**
 * @title VeryGovernanceFacet
 * @notice DAO governance facet for VeryPay system
 * @dev Implements proposal creation, voting, treasury management, and parameter updates
 */
contract VeryGovernanceFacet is IVeryGovernance, ReentrancyGuard, Pausable, AccessControl {
    using ECDSA for bytes32;

    /// @notice Role for proposal creators
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    
    /// @notice Role for treasury managers
    bytes32 public constant TREASURY_MANAGER_ROLE = keccak256("TREASURY_MANAGER_ROLE");
    
    /// @notice Role for guardians (can cancel malicious proposals)
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    /// @notice Maximum number of operations in a single proposal
    uint256 public constant MAX_OPERATIONS = 10;

    /// @notice Maximum voting period (30 days)
    uint256 public constant MAX_VOTING_PERIOD = 30 days;

    /// @notice Minimum voting period (1 day)
    uint256 public constant MIN_VOTING_PERIOD = 1 days;

    /// @notice Maximum timelock delay (30 days)
    uint256 public constant MAX_TIMELOCK_DELAY = 30 days;

    /// @notice Storage structure for VeryGovernance
    struct VeryGovernanceStorage {
        mapping(uint256 => Proposal) proposals;
        mapping(uint256 => mapping(address => bool)) hasVoted;
        mapping(uint256 => mapping(address => VoteType)) userVotes;
        mapping(uint256 => TreasuryAllocation) treasuryAllocations;
        mapping(bytes32 => bool) queuedTransactions;
        ERC20Votes governanceToken;
        IERC20 treasuryToken;
        GovernanceParams params;
        uint256 proposalCount;
        uint256 allocationCount;
        uint256 treasuryBalance;
        uint256 totalVotingPower;
        mapping(address => uint256) delegatedVotes;
        bytes32[] proposalQueue;
    }

    /// @notice Storage slot for VeryGovernance data
    bytes32 constant VERY_GOVERNANCE_STORAGE_POSITION = keccak256("verypay.governance.storage");

    /// @notice Get storage
    function veryGovernanceStorage() internal pure returns (VeryGovernanceStorage storage vgs) {
        bytes32 position = VERY_GOVERNANCE_STORAGE_POSITION;
        assembly {
            vgs.slot := position
        }
    }

    /// @notice Modifier to check voting period
    modifier duringVotingPeriod(uint256 proposalId) {
        VeryGovernanceStorage storage vgs = veryGovernanceStorage();
        Proposal storage proposal = vgs.proposals[proposalId];
        
        require(
            block.number >= proposal.startBlock && 
            block.number <= proposal.endBlock,
            "VeryGovernance: Not in voting period"
        );
        _;
    }

    /// @notice Modifier to check if proposal exists
    modifier proposalExists(uint256 proposalId) {
        require(
            proposalId > 0 && proposalId <= veryGovernanceStorage().proposalCount,
            "VeryGovernance: Proposal does not exist"
        );
        _;
    }

    /**
     * @notice Initialize VeryGovernance facet
     * @param _governanceToken Address of governance token (voting power)
     * @param _treasuryToken Address of treasury token ($VERY)
     * @param _params Initial governance parameters
     */
    function initializeVeryGovernance(
        address _governanceToken,
        address _treasuryToken,
        GovernanceParams calldata _params
    ) external {
        LibDiamond.enforceIsContractOwner();
        
        VeryGovernanceStorage storage vgs = veryGovernanceStorage();
        require(address(vgs.governanceToken) == address(0), "VeryGovernance: Already initialized");
        
        vgs.governanceToken = ERC20Votes(_governanceToken);
        vgs.treasuryToken = IERC20(_treasuryToken);
        vgs.params = _params;
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, LibDiamond.contractOwner());
        _grantRole(PROPOSER_ROLE, LibDiamond.contractOwner());
        _grantRole(TREASURY_MANAGER_ROLE, LibDiamond.contractOwner());
        _grantRole(GUARDIAN_ROLE, LibDiamond.contractOwner());
    }

    /**
     * @inheritdoc IVeryGovernance
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory title,
        string memory description
    ) external override whenNotPaused returns (uint256 proposalId) {
        require(targets.length > 0, "VeryGovernance: Empty proposal");
        require(targets.length <= MAX_OPERATIONS, "VeryGovernance: Too many operations");
        require(
            targets.length == values.length && targets.length == calldatas.length,
            "VeryGovernance: Proposal arrays length mismatch"
        );
        
        VeryGovernanceStorage storage vgs = veryGovernanceStorage();
        
        // Check proposer has enough voting power
        uint256 proposerVotes = getVotes(msg.sender, block.number - 1);
        require(
            proposerVotes >= vgs.params.proposalThreshold,
            "VeryGovernance: Proposer votes below threshold"
        );
        
        // Increment proposal count
        proposalId = ++vgs.proposalCount;
        
        // Calculate voting period
        uint256 startBlock = block.number + vgs.params.votingDelay;
        uint256 endBlock = startBlock + vgs.params.votingPeriod;
        
        // Create proposal
        Proposal storage newProposal = vgs.proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.title = title;
        newProposal.description = description;
        newProposal.targets = targets;
        newProposal.values = values;
        newProposal.calldatas = calldatas;
        newProposal.startBlock = startBlock;
        newProposal.endBlock = endBlock;
        newProposal.forVotes = 0;
        newProposal.againstVotes = 0;
        newProposal.abstainVotes = 0;
        newProposal.canceled = false;
        newProposal.executed = false;
        newProposal.eta = 0;
        
        emit ProposalCreated(proposalId, msg.sender, title);
        
        return proposalId;
    }

    /**
     * @inheritdoc IVeryGovernance
     */
    function castVote(
        uint256 proposalId,
        uint8 support,
        string calldata reason
    ) 
        external 
        override 
        proposalExists(proposalId)
        duringVotingPeriod(proposalId)
        returns (uint256 weight) 
    {
        return _castVote(proposalId, msg.sender, support, reason);
    }

    /**
     * @inheritdoc IVeryGovernance
     */
    function castVoteBySig(
        uint256 proposalId,
        uint8 support,
        address voter,
        bytes calldata signature
    ) 
        external 
        override 
        proposalExists(proposalId)
        duringVotingPeriod(proposalId)
        returns (uint256 weight) 
    {
        // Verify signature
        bytes32 structHash = keccak256(abi.encode(
            keccak256("Vote(uint256 proposalId,uint8 support,address voter,uint256 nonce)"),
            proposalId,
            support,
            voter,
            _getNonce(voter)
        ));
        
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _getDomainSeparator(), structHash));
        address signer = digest.recover(signature);
        
        require(signer == voter, "VeryGovernance: Invalid signature");
        
        return _castVote(proposalId, voter, support, "Vote by signature");
    }

    /**
     * @inheritdoc IVeryGovernance
     */
    function execute(uint256 proposalId) 
        external 
        override 
        proposalExists(proposalId) 
        nonReentrant 
        returns (bool success) 
    {
        VeryGovernanceStorage storage vgs = veryGovernanceStorage();
        Proposal storage proposal = vgs.proposals[proposalId];
        
        require(getProposalState(proposalId) == ProposalState.Queued, "VeryGovernance: Proposal not queued");
        require(block.timestamp >= proposal.eta, "VeryGovernance: Proposal not ready");
        
        proposal.executed = true;
        
        // Execute all operations
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            bytes32 txHash = keccak256(abi.encode(
                proposal.targets[i],
                proposal.values[i],
                proposal.calldatas[i],
                proposal.eta
            ));
            
            require(vgs.queuedTransactions[txHash], "VeryGovernance: Transaction not queued");
            vgs.queuedTransactions[txHash] = false;
            
            (bool callSuccess,) = proposal.targets[i].call{value: proposal.values[i]}(proposal.calldatas[i]);
            require(callSuccess, "VeryGovernance: Transaction execution reverted");
        }
        
        emit ProposalExecuted(proposalId);
        
        return true;
    }

    /**
     * @inheritdoc IVeryGovernance
     */
    function cancel(uint256 proposalId) external override proposalExists(proposalId) {
        VeryGovernanceStorage storage vgs = veryGovernanceStorage();
        Proposal storage proposal = vgs.proposals[proposalId];
        
        require(!proposal.executed, "VeryGovernance: Cannot cancel executed proposal");
        
        // Check if caller can cancel
        bool canCancel = msg.sender == proposal.proposer || 
                        hasRole(GUARDIAN_ROLE, msg.sender) ||
                        getVotes(proposal.proposer, block.number - 1) < vgs.params.proposalThreshold;
        
        require(canCancel, "VeryGovernance: Cannot cancel proposal");
        
        proposal.canceled = true;
        
        // Remove from queue if queued
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            bytes32 txHash = keccak256(abi.encode(
                proposal.targets[i],
                proposal.values[i],
                proposal.calldatas[i],
                proposal.eta
            ));
            vgs.queuedTransactions[txHash] = false;
        }
        
        emit ProposalCanceled(proposalId);
    }

    /**
     * @inheritdoc IVeryGovernance
     */
    function allocateTreasuryFunds(
        address recipient,
        uint256 amount,
        string calldata purpose,
        uint256 unlockTime
    ) external override onlyRole(TREASURY_MANAGER_ROLE) returns (uint256 allocationId) {
        require(recipient != address(0), "VeryGovernance: Invalid recipient");
        require(amount > 0, "VeryGovernance: Zero amount");
        require(unlockTime > block.timestamp, "VeryGovernance: Invalid unlock time");
        
        VeryGovernanceStorage storage vgs = veryGovernanceStorage();
        require(vgs.treasuryBalance >= amount, "VeryGovernance: Insufficient treasury balance");
        
        allocationId = ++vgs.allocationCount;
        
        vgs.treasuryAllocations[allocationId] = TreasuryAllocation({
            recipient: recipient,
            amount: amount,
            purpose: purpose,
            unlockTime: unlockTime,
            executed: false
        });
        
        vgs.treasuryBalance -= amount;
        
        emit TreasuryAllocation(recipient, amount, purpose);
        
        return allocationId;
    }

    /**
     * @inheritdoc IVeryGovernance
     */
    function updateGovernanceParams(GovernanceParams calldata params) 
        external 
        override 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(params.votingPeriod >= MIN_VOTING_PERIOD && params.votingPeriod <= MAX_VOTING_PERIOD, 
                "VeryGovernance: Invalid voting period");
        require(params.timelockDelay <= MAX_TIMELOCK_DELAY, "VeryGovernance: Invalid timelock delay");
        
        VeryGovernanceStorage storage vgs = veryGovernanceStorage();
        GovernanceParams memory oldParams = vgs.params;
        vgs.params = params;
        
        emit GovernanceParamsUpdated(oldParams, params);
    }

    /**
     * @inheritdoc IVeryGovernance
     */
    function getProposal(uint256 proposalId)
        external
        view
        override
        proposalExists(proposalId)
        returns (Proposal memory proposal)
    {
        return veryGovernanceStorage().proposals[proposalId];
    }

    /**
     * @inheritdoc IVeryGovernance
     */
    function getProposalState(uint256 proposalId)
        public
        view
        override
        proposalExists(proposalId)
        returns (ProposalState state)
    {
        VeryGovernanceStorage storage vgs = veryGovernanceStorage();
        Proposal storage proposal = vgs.proposals[proposalId];
        
        if (proposal.canceled) {
            return ProposalState.Canceled;
        }
        
        if (proposal.executed) {
            return ProposalState.Executed;
        }
        
        if (block.number < proposal.startBlock) {
            return ProposalState.Pending;
        }
        
        if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        }
        
        if (proposal.forVotes <= proposal.againstVotes || proposal.forVotes < vgs.params.quorumVotes) {
            return ProposalState.Defeated;
        }
        
        if (proposal.eta == 0) {
            return ProposalState.Succeeded;
        }
        
        if (block.timestamp >= proposal.eta + vgs.params.timelockDelay) {
            return ProposalState.Expired;
        }
        
        return ProposalState.Queued;
    }

    /**
     * @inheritdoc IVeryGovernance
     */
    function getVotes(address account, uint256 blockNumber)
        public
        view
        override
        returns (uint256 votes)
    {
        VeryGovernanceStorage storage vgs = veryGovernanceStorage();
        return vgs.governanceToken.getPastVotes(account, blockNumber);
    }

    /**
     * @inheritdoc IVeryGovernance
     */
    function getGovernanceParams()
        external
        view
        override
        returns (GovernanceParams memory params)
    {
        return veryGovernanceStorage().params;
    }

    /**
     * @inheritdoc IVeryGovernance
     */
    function getTreasuryBalance() external view override returns (uint256 balance) {
        return veryGovernanceStorage().treasuryBalance;
    }

    /**
     * @inheritdoc IVeryGovernance
     */
    function hasVotingPower(address account) external view override returns (bool hasVotes) {
        return getVotes(account, block.number - 1) > 0;
    }

    /**
     * @notice Queue successful proposal for execution
     * @param proposalId Proposal identifier
     * @return eta Execution time
     */
    function queue(uint256 proposalId) external proposalExists(proposalId) returns (uint256 eta) {
        require(getProposalState(proposalId) == ProposalState.Succeeded, "VeryGovernance: Proposal not succeeded");
        
        VeryGovernanceStorage storage vgs = veryGovernanceStorage();
        Proposal storage proposal = vgs.proposals[proposalId];
        
        eta = block.timestamp + vgs.params.timelockDelay;
        proposal.eta = eta;
        
        // Queue all transactions
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            bytes32 txHash = keccak256(abi.encode(
                proposal.targets[i],
                proposal.values[i],
                proposal.calldatas[i],
                eta
            ));
            vgs.queuedTransactions[txHash] = true;
        }
        
        emit ProposalQueued(proposalId, eta);
        
        return eta;
    }

    /**
     * @notice Claim allocated treasury funds
     * @param allocationId Allocation identifier
     */
    function claimTreasuryAllocation(uint256 allocationId) external nonReentrant {
        VeryGovernanceStorage storage vgs = veryGovernanceStorage();
        TreasuryAllocation storage allocation = vgs.treasuryAllocations[allocationId];
        
        require(allocation.recipient == msg.sender, "VeryGovernance: Not allocation recipient");
        require(block.timestamp >= allocation.unlockTime, "VeryGovernance: Allocation not unlocked");
        require(!allocation.executed, "VeryGovernance: Allocation already claimed");
        
        allocation.executed = true;
        
        require(
            vgs.treasuryToken.transfer(msg.sender, allocation.amount),
            "VeryGovernance: Transfer failed"
        );
        
        emit TreasuryAllocationClaimed(allocationId, msg.sender, allocation.amount);
    }

    /**
     * @notice Deposit funds to treasury
     * @param amount Amount to deposit
     */
    function depositToTreasury(uint256 amount) external {
        require(amount > 0, "VeryGovernance: Zero amount");
        
        VeryGovernanceStorage storage vgs = veryGovernanceStorage();
        
        require(
            vgs.treasuryToken.transferFrom(msg.sender, address(this), amount),
            "VeryGovernance: Transfer failed"
        );
        
        vgs.treasuryBalance += amount;
        
        emit TreasuryDeposit(msg.sender, amount);
    }

    /**
     * @notice Get proposal vote breakdown
     * @param proposalId Proposal identifier
     * @return forVotes Votes in favor
     * @return againstVotes Votes against
     * @return abstainVotes Abstain votes
     */
    function getProposalVotes(uint256 proposalId) 
        external 
        view 
        proposalExists(proposalId)
        returns (uint256 forVotes, uint256 againstVotes, uint256 abstainVotes) 
    {
        Proposal storage proposal = veryGovernanceStorage().proposals[proposalId];
        return (proposal.forVotes, proposal.againstVotes, proposal.abstainVotes);
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
     * @notice Internal vote casting logic
     */
    function _castVote(
        uint256 proposalId,
        address voter,
        uint8 support,
        string memory reason
    ) internal returns (uint256 weight) {
        require(support <= 2, "VeryGovernance: Invalid vote type");
        
        VeryGovernanceStorage storage vgs = veryGovernanceStorage();
        require(!vgs.hasVoted[proposalId][voter], "VeryGovernance: Already voted");
        
        weight = getVotes(voter, vgs.proposals[proposalId].startBlock - 1);
        require(weight > 0, "VeryGovernance: No voting power");
        
        vgs.hasVoted[proposalId][voter] = true;
        vgs.userVotes[proposalId][voter] = VoteType(support);
        
        if (support == uint8(VoteType.Against)) {
            vgs.proposals[proposalId].againstVotes += weight;
        } else if (support == uint8(VoteType.For)) {
            vgs.proposals[proposalId].forVotes += weight;
        } else {
            vgs.proposals[proposalId].abstainVotes += weight;
        }
        
        emit VoteCast(voter, proposalId, support, weight);
        
        return weight;
    }

    /**
     * @notice Get domain separator for EIP-712
     */
    function _getDomainSeparator() internal view returns (bytes32) {
        return keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("VeryPay Governance"),
            keccak256("1"),
            block.chainid,
            address(this)
        ));
    }

    /**
     * @notice Get nonce for address (simplified)
     */
    function _getNonce(address account) internal view returns (uint256) {
        // In production, implement proper nonce tracking
        return 0;
    }

    /// @notice Additional events
    event ProposalQueued(uint256 indexed proposalId, uint256 eta);
    event ProposalCanceled(uint256 indexed proposalId);
    event GovernanceParamsUpdated(GovernanceParams oldParams, GovernanceParams newParams);
    event TreasuryAllocationClaimed(uint256 indexed allocationId, address recipient, uint256 amount);
    event TreasuryDeposit(address indexed depositor, uint256 amount);
}