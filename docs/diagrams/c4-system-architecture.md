# VeryPay C4 Model Architecture Diagrams

## 1. C4 Model Overview

The C4 model provides a hierarchical approach to software architecture documentation through four levels of abstraction: Context, Containers, Components, and Code. This document presents VeryPay's architecture using this methodology.

## 2. Level 1: System Context Diagram

```mermaid
C4Context
    title VeryPay System Context Diagram

    Person(merchant, "Merchant", "Business owner accepting cryptocurrency payments")
    Person(customer, "Customer", "Person making payments to merchants")
    Person(admin, "System Admin", "Manages platform and merchants")
    
    System_Boundary(verypay, "VeryPay Platform") {
        System(verypay_system, "VeryPay", "Cryptocurrency payment processing platform for merchants")
    }
    
    System_Ext(verychat, "Verychat", "Chat application with integrated payments")
    System_Ext(very_network, "Very Network", "Blockchain network and token ecosystem")
    System_Ext(ethereum, "Ethereum Network", "Blockchain network for smart contracts")
    System_Ext(polygon, "Polygon Network", "Layer 2 scaling solution")
    System_Ext(arbitrum, "Arbitrum Network", "Optimistic rollup scaling solution")
    System_Ext(email_service, "Email Service", "Transactional email provider")
    System_Ext(sms_service, "SMS Service", "SMS notification provider")
    System_Ext(oracle_service, "Price Oracles", "Chainlink and other price feed providers")
    
    Rel(merchant, verypay_system, "Registers business, manages payments", "HTTPS/WSS")
    Rel(customer, verypay_system, "Makes payments to merchants", "HTTPS/WSS")
    Rel(admin, verypay_system, "Manages platform, verifies merchants", "HTTPS")
    
    Rel(verypay_system, verychat, "Embedded payment widgets", "HTTPS/WebSocket")
    Rel(verypay_system, very_network, "Token rewards, governance", "HTTPS/Web3")
    Rel(verypay_system, ethereum, "Smart contract interactions", "Web3/JSON-RPC")
    Rel(verypay_system, polygon, "Low-cost transactions", "Web3/JSON-RPC")
    Rel(verypay_system, arbitrum, "Optimized transactions", "Web3/JSON-RPC")
    Rel(verypay_system, email_service, "Sends notifications", "HTTPS/SMTP")
    Rel(verypay_system, sms_service, "Sends SMS alerts", "HTTPS")
    Rel(verypay_system, oracle_service, "Gets token prices", "HTTPS/Web3")

    UpdateRelStyle(merchant, verypay_system, $textColor="blue", $lineColor="blue")
    UpdateRelStyle(customer, verypay_system, $textColor="green", $lineColor="green")
    UpdateRelStyle(admin, verypay_system, $textColor="red", $lineColor="red")
```

## 3. Level 2: Container Diagram

```mermaid
C4Container
    title VeryPay Container Diagram
    
    Person(merchant, "Merchant", "Business owner")
    Person(customer, "Customer", "Payment maker")
    Person(admin, "Admin", "Platform manager")
    
    System_Boundary(verypay, "VeryPay Platform") {
        Container(web_app, "Web Application", "React/TypeScript", "Merchant dashboard and payment interfaces")
        Container(mobile_app, "Mobile App", "React Native", "Mobile payment interface")
        Container(widget, "Payment Widget", "JavaScript", "Embeddable payment widget for websites")
        
        Container(api_gateway, "API Gateway", "Node.js/Express", "Routes requests, handles authentication")
        Container(graphql_api, "GraphQL API", "Node.js/Apollo", "Flexible query interface for clients")
        
        Container(payment_service, "Payment Service", "Node.js/TypeScript", "Processes cryptocurrency payments")
        Container(merchant_service, "Merchant Service", "Node.js/TypeScript", "Manages merchant profiles and onboarding")
        Container(notification_service, "Notification Service", "Node.js/TypeScript", "Handles email, SMS, and push notifications")
        Container(analytics_service, "Analytics Service", "Node.js/TypeScript", "Processes transaction analytics")
        Container(reward_service, "Reward Service", "Node.js/TypeScript", "Calculates and distributes rewards")
        
        Container(smart_contracts, "Smart Contracts", "Solidity", "Payment processing and merchant management")
        Container(blockchain_indexer, "Blockchain Indexer", "Node.js/TypeScript", "Indexes blockchain events and transactions")
        
        ContainerDb(postgres, "PostgreSQL Database", "PostgreSQL", "Stores merchant data, transactions, users")
        ContainerDb(redis, "Redis Cache", "Redis", "Caching, sessions, real-time data")
        ContainerDb(mongodb, "MongoDB", "MongoDB", "Analytics data and event logs")
        ContainerDb(s3, "S3 Storage", "AWS S3", "Document storage, backups")
        
        Container(message_queue, "Message Queue", "Redis/Bull", "Asynchronous job processing")
        Container(websocket, "WebSocket Server", "Socket.io", "Real-time updates to clients")
    }
    
    System_Ext(blockchain, "Blockchain Networks", "Ethereum, Polygon, Arbitrum")
    System_Ext(very_ecosystem, "Very Ecosystem", "Verychat, Very Network")
    System_Ext(external_services, "External Services", "Email, SMS, Price Oracles")
    
    Rel(merchant, web_app, "Uses", "HTTPS")
    Rel(customer, mobile_app, "Uses", "HTTPS")
    Rel(customer, widget, "Interacts", "HTTPS")
    
    Rel(web_app, api_gateway, "API calls", "HTTPS/REST")
    Rel(mobile_app, graphql_api, "GraphQL queries", "HTTPS/GraphQL")
    Rel(widget, api_gateway, "Payment requests", "HTTPS/REST")
    
    Rel(api_gateway, payment_service, "Routes requests", "HTTP")
    Rel(api_gateway, merchant_service, "Routes requests", "HTTP")
    Rel(graphql_api, payment_service, "Data queries", "HTTP")
    Rel(graphql_api, merchant_service, "Data queries", "HTTP")
    
    Rel(payment_service, smart_contracts, "Contract calls", "Web3")
    Rel(payment_service, postgres, "Stores data", "TCP")
    Rel(payment_service, redis, "Caches data", "TCP")
    Rel(payment_service, message_queue, "Queues jobs", "TCP")
    
    Rel(merchant_service, postgres, "Stores data", "TCP")
    Rel(merchant_service, s3, "Stores documents", "HTTPS")
    
    Rel(notification_service, external_services, "Sends notifications", "HTTPS")
    Rel(analytics_service, mongodb, "Stores analytics", "TCP")
    Rel(reward_service, smart_contracts, "Distributes rewards", "Web3")
    
    Rel(blockchain_indexer, blockchain, "Monitors events", "Web3")
    Rel(blockchain_indexer, postgres, "Updates data", "TCP")
    
    Rel(websocket, redis, "Pub/Sub", "TCP")
    Rel(web_app, websocket, "Real-time updates", "WebSocket")
    
    UpdateRelStyle(merchant, web_app, $textColor="blue", $lineColor="blue")
    UpdateRelStyle(customer, mobile_app, $textColor="green", $lineColor="green")
```

## 4. Level 3: Component Diagram - Payment Service

```mermaid
C4Component
    title Payment Service Components
    
    Container_Boundary(payment_service, "Payment Service") {
        Component(payment_controller, "Payment Controller", "Express Router", "Handles payment API requests")
        Component(payment_processor, "Payment Processor", "TypeScript Class", "Core payment processing logic")
        Component(transaction_manager, "Transaction Manager", "TypeScript Class", "Manages transaction lifecycle")
        Component(gas_optimizer, "Gas Optimizer", "TypeScript Class", "Optimizes gas usage and batching")
        Component(signature_validator, "Signature Validator", "TypeScript Class", "Validates payment signatures")
        Component(fraud_detector, "Fraud Detector", "TypeScript Class", "Detects suspicious transactions")
        Component(webhook_sender, "Webhook Sender", "TypeScript Class", "Sends merchant webhooks")
        
        Component(payment_repository, "Payment Repository", "TypeScript Class", "Data access for payments")
        Component(merchant_repository, "Merchant Repository", "TypeScript Class", "Data access for merchants")
        Component(token_repository, "Token Repository", "TypeScript Class", "Data access for supported tokens")
        
        Component(blockchain_client, "Blockchain Client", "Web3/Ethers", "Blockchain interaction wrapper")
        Component(contract_interface, "Contract Interface", "TypeScript", "Smart contract interaction layer")
        Component(event_listener, "Event Listener", "TypeScript Class", "Listens to blockchain events")
    }
    
    ContainerDb(postgres, "PostgreSQL", "Database", "Transaction and merchant data")
    ContainerDb(redis, "Redis", "Cache", "Payment states and locks")
    Container(smart_contracts, "Smart Contracts", "Solidity", "Payment processing contracts")
    Container(message_queue, "Message Queue", "Bull/Redis", "Async job processing")
    Container(notification_service, "Notification Service", "Node.js", "Handles notifications")
    
    Rel(payment_controller, payment_processor, "Delegates to", "Method call")
    Rel(payment_processor, transaction_manager, "Manages transactions", "Method call")
    Rel(payment_processor, gas_optimizer, "Optimizes gas", "Method call")
    Rel(payment_processor, signature_validator, "Validates signatures", "Method call")
    Rel(payment_processor, fraud_detector, "Checks fraud", "Method call")
    
    Rel(transaction_manager, payment_repository, "Persists data", "Method call")
    Rel(payment_processor, merchant_repository, "Gets merchant info", "Method call")
    Rel(gas_optimizer, token_repository, "Gets token info", "Method call")
    
    Rel(payment_processor, blockchain_client, "Sends transactions", "Method call")
    Rel(blockchain_client, contract_interface, "Calls contracts", "Method call")
    Rel(contract_interface, smart_contracts, "Contract calls", "Web3")
    
    Rel(event_listener, blockchain_client, "Listens for events", "Method call")
    Rel(event_listener, transaction_manager, "Updates status", "Method call")
    
    Rel(payment_repository, postgres, "SQL queries", "TCP")
    Rel(merchant_repository, postgres, "SQL queries", "TCP")
    Rel(token_repository, redis, "Cached queries", "TCP")
    
    Rel(webhook_sender, message_queue, "Queues webhooks", "TCP")
    Rel(fraud_detector, notification_service, "Alerts on fraud", "HTTP")
```

## 5. Level 3: Component Diagram - Smart Contracts

```mermaid
C4Component
    title Smart Contract Components
    
    Container_Boundary(smart_contracts, "Smart Contract System") {
        Component(diamond_proxy, "Diamond Proxy", "Solidity", "Main contract proxy using Diamond Standard")
        
        Component(payment_facet, "Payment Facet", "Solidity", "Payment processing functions")
        Component(merchant_facet, "Merchant Facet", "Solidity", "Merchant management functions")
        Component(rewards_facet, "Rewards Facet", "Solidity", "Reward distribution functions")
        Component(governance_facet, "Governance Facet", "Solidity", "Governance and upgrade functions")
        Component(admin_facet, "Admin Facet", "Solidity", "Administrative functions")
        
        Component(diamond_cut_facet, "Diamond Cut Facet", "Solidity", "Contract upgrade functionality")
        Component(diamond_loupe_facet, "Diamond Loupe Facet", "Solidity", "Diamond inspection functions")
        
        Component(payment_storage, "Payment Storage", "Solidity Library", "Payment data structures")
        Component(merchant_storage, "Merchant Storage", "Solidity Library", "Merchant data structures")
        Component(access_control, "Access Control", "Solidity Library", "Permission management")
        Component(security_module, "Security Module", "Solidity Library", "Security checks and validations")
        
        Component(token_registry, "Token Registry", "Solidity Contract", "Supported token management")
        Component(price_oracle, "Price Oracle", "Solidity Contract", "Token price aggregation")
        Component(multisig_wallet, "Multisig Wallet", "Solidity Contract", "Admin operations wallet")
    }
    
    System_Ext(chainlink, "Chainlink Oracles", "Price feed providers")
    System_Ext(openzeppelin, "OpenZeppelin", "Security libraries")
    System_Ext(very_token, "VERY Token", "Very Network token contract")
    
    Rel(diamond_proxy, payment_facet, "Delegates to", "delegatecall")
    Rel(diamond_proxy, merchant_facet, "Delegates to", "delegatecall")
    Rel(diamond_proxy, rewards_facet, "Delegates to", "delegatecall")
    Rel(diamond_proxy, governance_facet, "Delegates to", "delegatecall")
    Rel(diamond_proxy, admin_facet, "Delegates to", "delegatecall")
    
    Rel(payment_facet, payment_storage, "Uses", "library call")
    Rel(merchant_facet, merchant_storage, "Uses", "library call")
    Rel(payment_facet, security_module, "Validates", "library call")
    Rel(merchant_facet, access_control, "Checks permissions", "library call")
    
    Rel(payment_facet, token_registry, "Validates tokens", "external call")
    Rel(rewards_facet, price_oracle, "Gets prices", "external call")
    Rel(admin_facet, multisig_wallet, "Executes admin ops", "external call")
    
    Rel(governance_facet, diamond_cut_facet, "Upgrades contract", "internal call")
    Rel(diamond_loupe_facet, diamond_proxy, "Inspects facets", "internal call")
    
    Rel(price_oracle, chainlink, "Gets price feeds", "external call")
    Rel(rewards_facet, very_token, "Distributes rewards", "external call")
    Rel(security_module, openzeppelin, "Uses security patterns", "library import")
```

## 6. Level 4: Code Diagram - Payment Processing

```mermaid
classDiagram
    class PaymentController {
        +processPayment(req, res)
        +getPayment(req, res)
        +refundPayment(req, res)
        +listPayments(req, res)
        -validateRequest(req)
        -handleError(error, res)
    }
    
    class PaymentProcessor {
        -transactionManager: TransactionManager
        -gasOptimizer: GasOptimizer
        -signatureValidator: SignatureValidator
        -fraudDetector: FraudDetector
        +processPayment(paymentData): PaymentResult
        +estimateGas(paymentData): GasEstimate
        +validatePayment(paymentData): ValidationResult
        -executeTransaction(txData): TransactionReceipt
    }
    
    class TransactionManager {
        -paymentRepository: PaymentRepository
        -redis: RedisClient
        +createTransaction(data): Transaction
        +updateTransactionStatus(id, status): void
        +getTransaction(id): Transaction
        +lockTransaction(id): boolean
        +unlockTransaction(id): void
        -generateTransactionId(): string
    }
    
    class GasOptimizer {
        -batchProcessor: BatchProcessor
        -gasEstimator: GasEstimator
        +optimizeGasPrice(priority): BigNumber
        +shouldBatchTransaction(tx): boolean
        +createOptimalBatch(txs[]): BatchTransaction
        +estimateTransactionGas(txData): BigNumber
        -calculateOptimalGasPrice(): BigNumber
    }
    
    class SignatureValidator {
        +validateSignature(hash, signature, signer): boolean
        +recoverSigner(hash, signature): string
        +verifyMerchantSignature(data, signature): boolean
        +verifyCustomerSignature(data, signature): boolean
        -hashPaymentData(data): string
    }
    
    class FraudDetector {
        -riskScorer: RiskScorer
        -blacklistChecker: BlacklistChecker
        +assessTransaction(txData): RiskAssessment
        +checkBlacklist(address): boolean
        +detectSuspiciousPattern(txData): SuspiciousActivity[]
        +flagHighRiskTransaction(txId): void
        -calculateRiskScore(factors): number
    }
    
    class PaymentRepository {
        -database: PostgreSQLClient
        +save(payment): Payment
        +findById(id): Payment
        +findByMerchant(merchantId): Payment[]
        +updateStatus(id, status): void
        +findPendingPayments(): Payment[]
        -buildQuery(filters): QueryBuilder
    }
    
    class BlockchainClient {
        -web3Provider: Web3Provider
        -contractInterface: ContractInterface
        +sendTransaction(txData): Promise~TransactionResponse~
        +estimateGas(txData): Promise~BigNumber~
        +getTransactionReceipt(hash): Promise~TransactionReceipt~
        +waitForConfirmation(hash, confirmations): Promise~TransactionReceipt~
        -handleRevert(error): void
    }
    
    PaymentController --> PaymentProcessor : uses
    PaymentProcessor --> TransactionManager : uses
    PaymentProcessor --> GasOptimizer : uses
    PaymentProcessor --> SignatureValidator : uses
    PaymentProcessor --> FraudDetector : uses
    PaymentProcessor --> BlockchainClient : uses
    TransactionManager --> PaymentRepository : uses
    PaymentRepository --> PaymentController : returns data to
```

## 7. Deployment Diagram

```mermaid
C4Deployment
    title VeryPay Deployment Diagram
    
    Deployment_Node(aws_cloud, "AWS Cloud", "Amazon Web Services") {
        Deployment_Node(vpc, "VPC", "Virtual Private Cloud") {
            Deployment_Node(public_subnets, "Public Subnets", "Internet-facing resources") {
                Deployment_Node(alb, "Application Load Balancer", "AWS ALB") {
                    Container(load_balancer, "Load Balancer", "AWS ALB", "Routes traffic to EKS")
                }
                
                Deployment_Node(nat_gateway, "NAT Gateway", "AWS NAT") {
                    Container(nat, "NAT Gateway", "AWS NAT", "Outbound internet for private subnets")
                }
            }
            
            Deployment_Node(private_subnets, "Private Subnets", "Internal resources") {
                Deployment_Node(eks_cluster, "EKS Cluster", "Kubernetes") {
                    Deployment_Node(api_nodes, "API Node Group", "m5.xlarge") {
                        Container(api_pods, "API Pods", "Node.js", "API Gateway and GraphQL services")
                    }
                    
                    Deployment_Node(worker_nodes, "Worker Node Group", "c5.2xlarge") {
                        Container(service_pods, "Service Pods", "Node.js", "Payment, Merchant, Notification services")
                    }
                    
                    Deployment_Node(blockchain_nodes, "Blockchain Node Group", "m5.4xlarge") {
                        Container(eth_nodes, "Ethereum Nodes", "Geth", "Blockchain connectivity")
                    }
                }
                
                Deployment_Node(rds_cluster, "RDS Cluster", "Multi-AZ") {
                    ContainerDb(postgres_primary, "PostgreSQL Primary", "db.r5.2xlarge", "Main database")
                    ContainerDb(postgres_replica, "PostgreSQL Replica", "db.r5.xlarge", "Read replica")
                }
                
                Deployment_Node(elasticache, "ElastiCache", "Redis Cluster") {
                    ContainerDb(redis_cluster, "Redis Cluster", "cache.r6g.xlarge", "Caching and sessions")
                }
                
                Deployment_Node(s3, "S3", "Object Storage") {
                    ContainerDb(document_storage, "Document Storage", "S3 Standard", "File storage")
                    ContainerDb(backup_storage, "Backup Storage", "S3 IA", "Database backups")
                }
            }
        }
        
        Deployment_Node(cloudfront, "CloudFront CDN", "Global CDN") {
            Container(cdn, "CDN", "CloudFront", "Static asset delivery")
        }
        
        Deployment_Node(route53, "Route 53", "DNS Service") {
            Container(dns, "DNS", "Route 53", "Domain name resolution with health checks")
        }
    }
    
    Deployment_Node(blockchain_networks, "Blockchain Networks", "External") {
        System_Ext(ethereum_mainnet, "Ethereum Mainnet", "Ethereum blockchain")
        System_Ext(polygon_network, "Polygon", "Layer 2 network")
        System_Ext(arbitrum_network, "Arbitrum", "Optimistic rollup")
    }
    
    Person(users, "Users", "Merchants and Customers")
    
    Rel(users, dns, "Domain resolution", "DNS")
    Rel(dns, cdn, "Routes to CDN", "DNS")
    Rel(cdn, load_balancer, "Routes to ALB", "HTTPS")
    Rel(load_balancer, api_pods, "Load balances", "HTTP")
    Rel(api_pods, service_pods, "Service calls", "HTTP")
    Rel(service_pods, postgres_primary, "Database queries", "TCP")
    Rel(service_pods, redis_cluster, "Caching", "TCP")
    Rel(service_pods, document_storage, "File operations", "HTTPS")
    Rel(eth_nodes, ethereum_mainnet, "Blockchain calls", "JSON-RPC")
    Rel(eth_nodes, polygon_network, "Blockchain calls", "JSON-RPC")
    Rel(eth_nodes, arbitrum_network, "Blockchain calls", "JSON-RPC")
    
    UpdateRelStyle(users, dns, $textColor="blue", $lineColor="blue")
```

## 8. Architecture Decision Records (ADRs) Visualization

```mermaid
graph TD
    A[ADR-001: Diamond Standard] --> B[Upgradeable Contracts]
    A --> C[Gas Efficiency]
    A --> D[Modularity]
    
    E[ADR-002: Multi-Chain Strategy] --> F[Ethereum Mainnet]
    E --> G[Polygon Layer 2]
    E --> H[Arbitrum Rollup]
    
    I[ADR-003: Microservices Architecture] --> J[Payment Service]
    I --> K[Merchant Service]
    I --> L[Notification Service]
    
    M[ADR-004: PostgreSQL + Redis] --> N[ACID Compliance]
    M --> O[High Performance]
    M --> P[Caching Strategy]
    
    Q[ADR-005: Kubernetes Deployment] --> R[Container Orchestration]
    Q --> S[Auto-scaling]
    Q --> T[High Availability]
    
    style A fill:#e1f5fe
    style E fill:#f3e5f5
    style I fill:#e8f5e8
    style M fill:#fff3e0
    style Q fill:#fce4ec
```

This C4 model documentation provides a comprehensive view of VeryPay's architecture at multiple levels of detail, making it easy for stakeholders to understand the system structure and make informed decisions about development and deployment.