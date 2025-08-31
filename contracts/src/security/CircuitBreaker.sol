// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CircuitBreaker
 * @notice Emergency circuit breaker pattern for VeryPay system
 * @dev Implements automatic and manual circuit breaking for system protection
 */
contract CircuitBreaker is AccessControl {
    /// @notice Role for circuit breaker operators
    bytes32 public constant CIRCUIT_BREAKER_ROLE = keccak256("CIRCUIT_BREAKER_ROLE");

    /// @notice Circuit breaker states
    enum CircuitState {
        Closed,    // Normal operation
        Open,      // Circuit is open, blocking operations
        HalfOpen   // Testing if system has recovered
    }

    /// @notice Circuit breaker configuration
    struct CircuitConfig {
        uint256 failureThreshold;    // Number of failures to trigger circuit
        uint256 recoveryTimeout;     // Time to wait before attempting recovery
        uint256 successThreshold;    // Successes needed in half-open to close
        bool isActive;               // Whether circuit breaker is active
    }

    /// @notice Circuit breaker data
    struct CircuitData {
        CircuitState state;
        uint256 failureCount;
        uint256 successCount;
        uint256 lastFailureTime;
        uint256 lastStateChange;
    }

    /// @notice Mapping of circuit name to configuration
    mapping(string => CircuitConfig) public circuitConfigs;
    
    /// @notice Mapping of circuit name to current data
    mapping(string => CircuitData) public circuitData;
    
    /// @notice List of all circuit names
    string[] public circuits;

    /// @notice Emitted when circuit state changes
    event CircuitStateChanged(
        string indexed circuitName,
        CircuitState oldState,
        CircuitState newState,
        uint256 timestamp
    );

    /// @notice Emitted when circuit is manually triggered
    event CircuitManuallyTriggered(
        string indexed circuitName,
        address indexed operator,
        string reason
    );

    /// @notice Emitted when circuit configuration is updated
    event CircuitConfigUpdated(
        string indexed circuitName,
        uint256 failureThreshold,
        uint256 recoveryTimeout,
        uint256 successThreshold
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CIRCUIT_BREAKER_ROLE, msg.sender);
    }

    /**
     * @notice Initialize a new circuit breaker
     * @param circuitName Name of the circuit
     * @param config Circuit configuration
     */
    function initializeCircuit(
        string memory circuitName,
        CircuitConfig memory config
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(circuitName).length > 0, "CircuitBreaker: Empty circuit name");
        require(config.failureThreshold > 0, "CircuitBreaker: Invalid failure threshold");
        require(config.recoveryTimeout > 0, "CircuitBreaker: Invalid recovery timeout");
        require(config.successThreshold > 0, "CircuitBreaker: Invalid success threshold");

        // Check if circuit already exists
        if (!circuitConfigs[circuitName].isActive) {
            circuits.push(circuitName);
        }

        circuitConfigs[circuitName] = config;
        circuitConfigs[circuitName].isActive = true;

        // Initialize circuit data
        circuitData[circuitName] = CircuitData({
            state: CircuitState.Closed,
            failureCount: 0,
            successCount: 0,
            lastFailureTime: 0,
            lastStateChange: block.timestamp
        });

        emit CircuitConfigUpdated(
            circuitName,
            config.failureThreshold,
            config.recoveryTimeout,
            config.successThreshold
        );
    }

    /**
     * @notice Check if operation can proceed through circuit
     * @param circuitName Name of the circuit to check
     * @return canProceed Whether operation can proceed
     */
    function canProceed(string memory circuitName) external returns (bool canProceed) {
        require(circuitConfigs[circuitName].isActive, "CircuitBreaker: Circuit not active");

        CircuitData storage circuit = circuitData[circuitName];
        CircuitConfig storage config = circuitConfigs[circuitName];

        if (circuit.state == CircuitState.Closed) {
            return true;
        } else if (circuit.state == CircuitState.Open) {
            // Check if recovery timeout has passed
            if (block.timestamp >= circuit.lastStateChange + config.recoveryTimeout) {
                // Move to half-open state
                _changeCircuitState(circuitName, CircuitState.HalfOpen);
                return true;
            }
            return false;
        } else { // CircuitState.HalfOpen
            return true;
        }
    }

    /**
     * @notice Record successful operation
     * @param circuitName Name of the circuit
     */
    function recordSuccess(string memory circuitName) external {
        require(circuitConfigs[circuitName].isActive, "CircuitBreaker: Circuit not active");

        CircuitData storage circuit = circuitData[circuitName];
        CircuitConfig storage config = circuitConfigs[circuitName];

        if (circuit.state == CircuitState.HalfOpen) {
            circuit.successCount++;
            
            // Check if enough successes to close circuit
            if (circuit.successCount >= config.successThreshold) {
                circuit.failureCount = 0;
                circuit.successCount = 0;
                _changeCircuitState(circuitName, CircuitState.Closed);
            }
        } else if (circuit.state == CircuitState.Closed) {
            // Reset failure count on success
            circuit.failureCount = 0;
        }
    }

    /**
     * @notice Record failed operation
     * @param circuitName Name of the circuit
     */
    function recordFailure(string memory circuitName) external {
        require(circuitConfigs[circuitName].isActive, "CircuitBreaker: Circuit not active");

        CircuitData storage circuit = circuitData[circuitName];
        CircuitConfig storage config = circuitConfigs[circuitName];

        circuit.failureCount++;
        circuit.lastFailureTime = block.timestamp;

        if (circuit.state == CircuitState.HalfOpen) {
            // Failure in half-open state immediately opens circuit
            circuit.successCount = 0;
            _changeCircuitState(circuitName, CircuitState.Open);
        } else if (circuit.state == CircuitState.Closed) {
            // Check if failure threshold reached
            if (circuit.failureCount >= config.failureThreshold) {
                _changeCircuitState(circuitName, CircuitState.Open);
            }
        }
    }

    /**
     * @notice Manually open circuit breaker
     * @param circuitName Name of the circuit
     * @param reason Reason for manual trigger
     */
    function manualTrigger(
        string memory circuitName,
        string memory reason
    ) external onlyRole(CIRCUIT_BREAKER_ROLE) {
        require(circuitConfigs[circuitName].isActive, "CircuitBreaker: Circuit not active");

        _changeCircuitState(circuitName, CircuitState.Open);
        
        emit CircuitManuallyTriggered(circuitName, msg.sender, reason);
    }

    /**
     * @notice Manually close circuit breaker
     * @param circuitName Name of the circuit
     */
    function manualReset(string memory circuitName) external onlyRole(CIRCUIT_BREAKER_ROLE) {
        require(circuitConfigs[circuitName].isActive, "CircuitBreaker: Circuit not active");

        CircuitData storage circuit = circuitData[circuitName];
        circuit.failureCount = 0;
        circuit.successCount = 0;
        
        _changeCircuitState(circuitName, CircuitState.Closed);
    }

    /**
     * @notice Get current circuit state
     * @param circuitName Name of the circuit
     * @return state Current circuit state
     * @return failureCount Current failure count
     * @return lastFailureTime Last failure timestamp
     */
    function getCircuitState(string memory circuitName) 
        external 
        view 
        returns (
            CircuitState state,
            uint256 failureCount,
            uint256 lastFailureTime
        ) 
    {
        require(circuitConfigs[circuitName].isActive, "CircuitBreaker: Circuit not active");
        
        CircuitData storage circuit = circuitData[circuitName];
        return (circuit.state, circuit.failureCount, circuit.lastFailureTime);
    }

    /**
     * @notice Get all circuit names
     * @return circuitNames Array of circuit names
     */
    function getAllCircuits() external view returns (string[] memory circuitNames) {
        return circuits;
    }

    /**
     * @notice Update circuit configuration
     * @param circuitName Name of the circuit
     * @param config New configuration
     */
    function updateCircuitConfig(
        string memory circuitName,
        CircuitConfig memory config
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(circuitConfigs[circuitName].isActive, "CircuitBreaker: Circuit not active");
        require(config.failureThreshold > 0, "CircuitBreaker: Invalid failure threshold");
        require(config.recoveryTimeout > 0, "CircuitBreaker: Invalid recovery timeout");
        require(config.successThreshold > 0, "CircuitBreaker: Invalid success threshold");

        circuitConfigs[circuitName] = config;
        circuitConfigs[circuitName].isActive = true;

        emit CircuitConfigUpdated(
            circuitName,
            config.failureThreshold,
            config.recoveryTimeout,
            config.successThreshold
        );
    }

    /**
     * @notice Deactivate a circuit breaker
     * @param circuitName Name of the circuit
     */
    function deactivateCircuit(string memory circuitName) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(circuitConfigs[circuitName].isActive, "CircuitBreaker: Circuit not active");
        
        circuitConfigs[circuitName].isActive = false;
        
        // Clean up circuit data
        delete circuitData[circuitName];
    }

    /**
     * @notice Check if system is healthy (all circuits closed or half-open)
     * @return isHealthy Whether all circuits are in good state
     * @return openCircuits Array of open circuit names
     */
    function getSystemHealth() 
        external 
        view 
        returns (bool isHealthy, string[] memory openCircuits) 
    {
        string[] memory tempOpenCircuits = new string[](circuits.length);
        uint256 openCount = 0;

        for (uint256 i = 0; i < circuits.length; i++) {
            string memory circuitName = circuits[i];
            if (circuitConfigs[circuitName].isActive && 
                circuitData[circuitName].state == CircuitState.Open) {
                tempOpenCircuits[openCount] = circuitName;
                openCount++;
            }
        }

        // Create properly sized array
        openCircuits = new string[](openCount);
        for (uint256 i = 0; i < openCount; i++) {
            openCircuits[i] = tempOpenCircuits[i];
        }

        isHealthy = openCount == 0;
    }

    /**
     * @notice Internal function to change circuit state
     * @param circuitName Name of the circuit
     * @param newState New state to set
     */
    function _changeCircuitState(
        string memory circuitName,
        CircuitState newState
    ) internal {
        CircuitData storage circuit = circuitData[circuitName];
        CircuitState oldState = circuit.state;
        
        circuit.state = newState;
        circuit.lastStateChange = block.timestamp;

        emit CircuitStateChanged(circuitName, oldState, newState, block.timestamp);
    }
}