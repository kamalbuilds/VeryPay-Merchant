# VeryPay Deployment and Infrastructure Architecture

## 1. Infrastructure Overview

VeryPay employs a cloud-native, containerized architecture designed for high availability, scalability, and global distribution. The infrastructure supports multi-chain deployments with automated CI/CD pipelines, comprehensive monitoring, and disaster recovery capabilities.

## 2. Cloud Architecture

### 2.1 Multi-Cloud Strategy

#### Primary Cloud Provider: AWS
```yaml
# AWS Infrastructure Configuration
Primary Regions:
  - us-east-1 (N. Virginia) - Primary
  - eu-west-1 (Ireland) - Europe
  - ap-southeast-1 (Singapore) - Asia

Services Used:
  Compute:
    - EKS (Elastic Kubernetes Service)
    - EC2 (Elastic Compute Cloud)
    - Lambda (Serverless Functions)
    - Fargate (Serverless Containers)
  
  Storage:
    - RDS (PostgreSQL, Multi-AZ)
    - ElastiCache (Redis Cluster)
    - S3 (Object Storage)
    - EFS (Shared File System)
  
  Networking:
    - VPC (Virtual Private Cloud)
    - ALB/NLB (Load Balancers)
    - Route 53 (DNS)
    - CloudFront (CDN)
  
  Security:
    - IAM (Identity and Access Management)
    - KMS (Key Management Service)
    - WAF (Web Application Firewall)
    - Certificate Manager
  
  Monitoring:
    - CloudWatch (Metrics and Logs)
    - X-Ray (Distributed Tracing)
    - GuardDuty (Security Monitoring)
```

#### Secondary Cloud Provider: GCP
```yaml
# GCP Infrastructure Configuration (Disaster Recovery)
Regions:
  - us-central1 (Iowa)
  - europe-west1 (Belgium)

Services Used:
  Compute:
    - GKE (Google Kubernetes Engine)
    - Cloud Run (Serverless Containers)
  
  Storage:
    - Cloud SQL (PostgreSQL)
    - Memorystore (Redis)
    - Cloud Storage
  
  Networking:
    - VPC
    - Cloud Load Balancing
    - Cloud CDN
  
  Security:
    - Cloud IAM
    - Cloud KMS
    - Cloud Armor
```

### 2.2 Kubernetes Architecture

#### EKS Cluster Configuration
```yaml
# eks-cluster.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: verypay-production
  region: us-east-1
  version: "1.28"

availabilityZones: ["us-east-1a", "us-east-1b", "us-east-1c"]

iam:
  withOIDC: true
  serviceAccounts:
    - metadata:
        name: aws-load-balancer-controller
        namespace: kube-system
      wellKnownPolicies:
        awsLoadBalancerController: true
    - metadata:
        name: external-dns
        namespace: kube-system
      wellKnownPolicies:
        externalDNS: true

nodeGroups:
  - name: api-nodes
    instanceType: m5.xlarge
    desiredCapacity: 3
    minSize: 2
    maxSize: 10
    volumeSize: 100
    volumeType: gp3
    labels:
      role: api
    taints:
      - key: role
        value: api
        effect: NoSchedule
    
  - name: worker-nodes
    instanceType: c5.2xlarge
    desiredCapacity: 5
    minSize: 3
    maxSize: 20
    volumeSize: 200
    volumeType: gp3
    labels:
      role: worker
    
  - name: blockchain-nodes
    instanceType: m5.4xlarge
    desiredCapacity: 2
    minSize: 2
    maxSize: 5
    volumeSize: 500
    volumeType: gp3
    labels:
      role: blockchain
    taints:
      - key: role
        value: blockchain
        effect: NoSchedule

managedNodeGroups:
  - name: system-nodes
    instanceType: t3.medium
    desiredCapacity: 3
    minSize: 2
    maxSize: 5
    volumeSize: 50
    labels:
      role: system

addons:
  - name: vpc-cni
    version: latest
  - name: coredns
    version: latest
  - name: kube-proxy
    version: latest
  - name: aws-ebs-csi-driver
    version: latest
```

#### Namespace Architecture
```yaml
# namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: verypay-api
  labels:
    name: verypay-api
    tier: application
---
apiVersion: v1
kind: Namespace
metadata:
  name: verypay-contracts
  labels:
    name: verypay-contracts
    tier: blockchain
---
apiVersion: v1
kind: Namespace
metadata:
  name: verypay-jobs
  labels:
    name: verypay-jobs
    tier: worker
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    name: monitoring
    tier: infrastructure
---
apiVersion: v1
kind: Namespace
metadata:
  name: ingress-system
  labels:
    name: ingress-system
    tier: infrastructure
```

## 3. Application Deployment

### 3.1 Microservices Deployment

#### API Gateway Deployment
```yaml
# api-gateway-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: verypay-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      nodeSelector:
        role: api
      tolerations:
        - key: role
          operator: Equal
          value: api
          effect: NoSchedule
      containers:
      - name: api-gateway
        image: verypay/api-gateway:v1.2.3
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
  namespace: verypay-api
spec:
  selector:
    app: api-gateway
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
```

#### Payment Service Deployment
```yaml
# payment-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: verypay-api
spec:
  replicas: 5
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3001"
        prometheus.io/path: "/metrics"
    spec:
      nodeSelector:
        role: worker
      containers:
      - name: payment-service
        image: verypay/payment-service:v1.2.3
        ports:
        - containerPort: 3001
        - containerPort: 9090 # Metrics port
        env:
        - name: NODE_ENV
          value: "production"
        - name: WEB3_PROVIDER_URL
          valueFrom:
            secretKeyRef:
              name: blockchain-secret
              key: provider-url
        - name: PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: blockchain-secret
              key: private-key
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        volumeMounts:
        - name: contract-artifacts
          mountPath: /app/contracts
          readOnly: true
      volumes:
      - name: contract-artifacts
        configMap:
          name: contract-artifacts
```

#### Blockchain Node Deployment
```yaml
# blockchain-node-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ethereum-node
  namespace: verypay-contracts
spec:
  serviceName: ethereum-node
  replicas: 2
  selector:
    matchLabels:
      app: ethereum-node
  template:
    metadata:
      labels:
        app: ethereum-node
    spec:
      nodeSelector:
        role: blockchain
      tolerations:
        - key: role
          operator: Equal
          value: blockchain
          effect: NoSchedule
      containers:
      - name: geth
        image: ethereum/client-go:v1.13.4
        ports:
        - containerPort: 8545 # HTTP RPC
        - containerPort: 8546 # WebSocket RPC
        - containerPort: 30303 # P2P
        args:
          - --http
          - --http.addr=0.0.0.0
          - --http.port=8545
          - --http.api=eth,net,web3,personal
          - --ws
          - --ws.addr=0.0.0.0
          - --ws.port=8546
          - --ws.api=eth,net,web3,personal
          - --syncmode=snap
          - --cache=4096
          - --maxpeers=50
        resources:
          requests:
            memory: "8Gi"
            cpu: "2000m"
          limits:
            memory: "16Gi"
            cpu: "4000m"
        volumeMounts:
        - name: ethereum-data
          mountPath: /root/.ethereum
  volumeClaimTemplates:
  - metadata:
      name: ethereum-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: gp3-csi
      resources:
        requests:
          storage: 1Ti
```

### 3.2 Database Deployment

#### PostgreSQL RDS Configuration
```terraform
# rds-postgres.tf
resource "aws_db_subnet_group" "verypay_db_subnet_group" {
  name       = "verypay-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "VeryPay DB subnet group"
  }
}

resource "aws_db_parameter_group" "verypay_postgres_params" {
  family = "postgres14"
  name   = "verypay-postgres-params"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
}

resource "aws_db_instance" "verypay_postgres" {
  identifier = "verypay-postgres-prod"
  
  # Engine configuration
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = "db.r5.2xlarge"
  
  # Storage configuration
  allocated_storage     = 1000
  max_allocated_storage = 5000
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id          = aws_kms_key.rds_key.arn
  
  # Database configuration
  db_name  = "verypay"
  username = "verypay_admin"
  password = var.db_password
  
  # Network configuration
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.verypay_db_subnet_group.name
  publicly_accessible    = false
  
  # Backup configuration
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # High availability
  multi_az = true
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn
  
  # Parameter group
  parameter_group_name = aws_db_parameter_group.verypay_postgres_params.name
  
  # Security
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "verypay-postgres-final-snapshot"
  
  tags = {
    Name        = "VeryPay PostgreSQL"
    Environment = "production"
  }
}

# Read replica for analytics workload
resource "aws_db_instance" "verypay_postgres_replica" {
  identifier = "verypay-postgres-replica"
  
  replicate_source_db = aws_db_instance.verypay_postgres.id
  instance_class      = "db.r5.xlarge"
  
  publicly_accessible = false
  
  tags = {
    Name        = "VeryPay PostgreSQL Read Replica"
    Environment = "production"
  }
}
```

#### Redis ElastiCache Configuration
```terraform
# redis-cluster.tf
resource "aws_elasticache_subnet_group" "verypay_cache_subnet_group" {
  name       = "verypay-cache-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_parameter_group" "verypay_redis_params" {
  family = "redis7.x"
  name   = "verypay-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }
}

resource "aws_elasticache_replication_group" "verypay_redis" {
  description          = "VeryPay Redis cluster"
  replication_group_id = "verypay-redis-cluster"
  
  # Redis configuration
  engine               = "redis"
  engine_version       = "7.0"
  node_type           = "cache.r6g.xlarge"
  port                = 6379
  parameter_group_name = aws_elasticache_parameter_group.verypay_redis_params.name
  
  # Cluster configuration
  num_cache_clusters = 3
  
  # Security
  subnet_group_name  = aws_elasticache_subnet_group.verypay_cache_subnet_group.name
  security_group_ids = [aws_security_group.redis_sg.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token = var.redis_auth_token
  
  # Backup
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
  
  # Maintenance
  maintenance_window = "sun:05:00-sun:07:00"
  
  tags = {
    Name        = "VeryPay Redis Cluster"
    Environment = "production"
  }
}
```

## 4. CI/CD Pipeline

### 4.1 GitHub Actions Workflow

#### Main CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths-ignore:
      - 'docs/**'
      - 'README.md'

env:
  AWS_REGION: us-east-1
  EKS_CLUSTER_NAME: verypay-production
  ECR_REGISTRY: 123456789012.dkr.ecr.us-east-1.amazonaws.com

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: verypay_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linter
      run: npm run lint

    - name: Run type check
      run: npm run type-check

    - name: Run unit tests
      run: npm run test:unit

    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/verypay_test
        REDIS_URL: redis://localhost:6379

    - name: Run security audit
      run: npm audit --audit-level moderate

  smart-contract-test:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Compile contracts
      run: npx hardhat compile

    - name: Run contract tests
      run: npx hardhat test

    - name: Run gas reporter
      run: npx hardhat test --reporter gas-reporter

    - name: Run coverage
      run: npx hardhat coverage

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  build-and-push:
    needs: [test, smart-contract-test]
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v2

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.ECR_REGISTRY }}/verypay
        tags: |
          type=ref,event=branch
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Docker image
      id: build
      uses: docker/build-push-action@v5
      with:
        context: .
        platforms: linux/amd64,linux/arm64
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Update kubeconfig
      run: aws eks update-kubeconfig --name verypay-staging --region ${{ env.AWS_REGION }}

    - name: Deploy to staging
      run: |
        helm upgrade --install verypay-staging ./helm/verypay \
          --namespace verypay-staging \
          --create-namespace \
          --set image.tag=${{ github.sha }} \
          --set environment=staging \
          --wait --timeout=600s

    - name: Run smoke tests
      run: |
        kubectl wait --for=condition=ready pod -l app=verypay-api -n verypay-staging --timeout=300s
        npm run test:smoke
      env:
        API_BASE_URL: https://staging-api.verypay.com

  deploy-production:
    needs: [deploy-staging]
    runs-on: ubuntu-latest
    environment: production
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Update kubeconfig
      run: aws eks update-kubeconfig --name ${{ env.EKS_CLUSTER_NAME }} --region ${{ env.AWS_REGION }}

    - name: Deploy to production
      run: |
        helm upgrade --install verypay-production ./helm/verypay \
          --namespace verypay-api \
          --set image.tag=${{ github.sha }} \
          --set environment=production \
          --set resources.requests.memory=1Gi \
          --set resources.requests.cpu=500m \
          --set resources.limits.memory=2Gi \
          --set resources.limits.cpu=1000m \
          --wait --timeout=600s

    - name: Run production health checks
      run: |
        kubectl wait --for=condition=ready pod -l app=verypay-api -n verypay-api --timeout=300s
        npm run test:health
      env:
        API_BASE_URL: https://api.verypay.com

    - name: Notify Slack
      if: always()
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 4.2 Helm Chart Configuration

#### Main Helm Chart
```yaml
# helm/verypay/Chart.yaml
apiVersion: v2
name: verypay
description: VeryPay Merchant dApp Helm Chart
type: application
version: 0.1.0
appVersion: "1.2.3"

dependencies:
  - name: postgresql
    version: "12.1.2"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
  - name: redis
    version: "17.4.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
  - name: prometheus
    version: "19.0.0"
    repository: "https://prometheus-community.github.io/helm-charts"
    condition: monitoring.prometheus.enabled
```

```yaml
# helm/verypay/values.yaml
replicaCount: 3

image:
  repository: 123456789012.dkr.ecr.us-east-1.amazonaws.com/verypay
  pullPolicy: IfNotPresent
  tag: "latest"

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  annotations: {}
  name: ""

podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "3000"
  prometheus.io/path: "/metrics"

podSecurityContext:
  fsGroup: 2000

securityContext:
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 1000

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  className: "alb"
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789012:certificate/abcd1234
    alb.ingress.kubernetes.io/group.name: verypay
  hosts:
    - host: api.verypay.com
      paths:
        - path: /
          pathType: Prefix
  tls: []

resources:
  limits:
    cpu: 1000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

nodeSelector: {}

tolerations: []

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - verypay
        topologyKey: kubernetes.io/hostname

env:
  NODE_ENV: production
  PORT: "3000"
  
envFromSecret:
  - name: DATABASE_URL
    secretName: database-secret
    secretKey: url
  - name: REDIS_URL
    secretName: redis-secret
    secretKey: url
  - name: JWT_SECRET
    secretName: jwt-secret
    secretKey: secret

# Database configuration
postgresql:
  enabled: false # Use external RDS instance

redis:
  enabled: false # Use external ElastiCache cluster

# Monitoring configuration
monitoring:
  prometheus:
    enabled: true
  grafana:
    enabled: true
    adminPassword: ${GRAFANA_ADMIN_PASSWORD}

# Backup configuration
backup:
  enabled: true
  schedule: "0 2 * * *"
  retention: "30d"
```

## 5. Monitoring and Observability

### 5.1 Prometheus Configuration

#### Custom Metrics Collection
```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
      external_labels:
        cluster: verypay-production
        region: us-east-1

    rule_files:
      - "/etc/prometheus/rules/*.yml"

    alerting:
      alertmanagers:
        - static_configs:
            - targets:
              - alertmanager:9093

    scrape_configs:
      - job_name: 'kubernetes-apiservers'
        kubernetes_sd_configs:
        - role: endpoints
        scheme: https
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
        relabel_configs:
        - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
          action: keep
          regex: default;kubernetes;https

      - job_name: 'verypay-api'
        kubernetes_sd_configs:
        - role: pod
        relabel_configs:
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
          action: keep
          regex: true
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
          action: replace
          target_label: __metrics_path__
          regex: (.+)
        - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
          action: replace
          regex: ([^:]+)(?::\d+)?;(\d+)
          replacement: $1:$2
          target_label: __address__
        - action: labelmap
          regex: __meta_kubernetes_pod_label_(.+)
        - source_labels: [__meta_kubernetes_namespace]
          action: replace
          target_label: kubernetes_namespace
        - source_labels: [__meta_kubernetes_pod_name]
          action: replace
          target_label: kubernetes_pod_name

      - job_name: 'blockchain-nodes'
        static_configs:
        - targets: ['ethereum-node:8545', 'ethereum-node-1:8545']
        metrics_path: /metrics
        scrape_interval: 30s

      - job_name: 'aws-load-balancer'
        ec2_sd_configs:
        - region: us-east-1
          port: 9100
        relabel_configs:
        - source_labels: [__meta_ec2_tag_Name]
          regex: '.*alb.*'
          action: keep
```

#### Custom Alerts
```yaml
# alerts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  verypay.yml: |
    groups:
    - name: verypay-api
      rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High database connection count"
          description: "Database has {{ $value }} active connections"

      - alert: RedisMemoryUsageHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Redis memory usage critical"
          description: "Redis memory usage is {{ $value }}%"

    - name: blockchain
      rules:
      - alert: EthereumNodeDown
        expr: up{job="blockchain-nodes"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Ethereum node is down"
          description: "Ethereum node {{ $labels.instance }} has been down for more than 1 minute"

      - alert: BlockchainSyncLag
        expr: ethereum_block_number - ethereum_synced_block_number > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Blockchain sync lag detected"
          description: "Node is {{ $value }} blocks behind"

    - name: smart-contracts
      rules:
      - alert: HighGasUsage
        expr: avg_over_time(ethereum_gas_used[1h]) > 300000
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "High gas usage detected"
          description: "Average gas usage is {{ $value }} gas units"

      - alert: ContractCallFailureRate
        expr: rate(contract_call_failures_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High contract call failure rate"
          description: "Contract call failure rate is {{ $value }} per second"
```

### 5.2 Grafana Dashboards

#### API Performance Dashboard
```json
{
  "dashboard": {
    "title": "VeryPay API Performance",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, http_request_duration_seconds_bucket)",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.99, http_request_duration_seconds_bucket)",
            "legendFormat": "p99"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"4..\"}[5m])",
            "legendFormat": "4xx errors"
          },
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      },
      {
        "title": "Active Connections",
        "type": "singlestat",
        "targets": [
          {
            "expr": "sum(nodejs_active_handles_total)"
          }
        ]
      }
    ]
  }
}
```

## 6. Disaster Recovery and Business Continuity

### 6.1 Backup Strategy

#### Database Backup Configuration
```yaml
# postgres-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: verypay-jobs
spec:
  schedule: "0 2 * * *" # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: postgres-backup
            image: postgres:14
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: database-secret
                  key: password
            command:
            - /bin/bash
            - -c
            - |
              BACKUP_FILE="verypay-backup-$(date +%Y%m%d-%H%M%S).sql"
              pg_dump -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME > /tmp/$BACKUP_FILE
              
              # Upload to S3
              aws s3 cp /tmp/$BACKUP_FILE s3://verypay-backups/postgres/$BACKUP_FILE
              
              # Clean up local file
              rm /tmp/$BACKUP_FILE
              
              # Clean up old backups (keep 30 days)
              aws s3 ls s3://verypay-backups/postgres/ | while read -r line; do
                createDate=`echo $line | awk '{print $1" "$2}'`
                createDate=`date -d"$createDate" +%s`
                olderThan=`date -d"-30 days" +%s`
                if [[ $createDate -lt $olderThan ]]; then
                  fileName=`echo $line | awk '{print $4}'`
                  if [[ $fileName != "" ]]; then
                    aws s3 rm s3://verypay-backups/postgres/$fileName
                  fi
                fi
              done
            volumeMounts:
            - name: aws-credentials
              mountPath: /root/.aws
              readOnly: true
          volumes:
          - name: aws-credentials
            secret:
              secretName: aws-credentials
```

### 6.2 Multi-Region Failover

#### Route 53 Health Check Configuration
```terraform
# route53-failover.tf
resource "aws_route53_health_check" "primary" {
  fqdn                            = "api.verypay.com"
  port                           = 443
  type                           = "HTTPS"
  resource_path                  = "/health"
  failure_threshold              = 3
  request_interval               = 30
  cloudwatch_alarm_region        = "us-east-1"
  cloudwatch_alarm_name          = "verypay-api-health"
  insufficient_data_health_status = "Failure"

  tags = {
    Name = "VeryPay Primary Health Check"
  }
}

resource "aws_route53_health_check" "secondary" {
  fqdn                            = "api-eu.verypay.com"
  port                           = 443
  type                           = "HTTPS"
  resource_path                  = "/health"
  failure_threshold              = 3
  request_interval               = 30

  tags = {
    Name = "VeryPay Secondary Health Check"
  }
}

resource "aws_route53_record" "primary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.verypay.com"
  type    = "A"
  
  failover_routing_policy {
    type = "PRIMARY"
  }
  
  health_check_id = aws_route53_health_check.primary.id
  set_identifier  = "primary"
  ttl             = 60
  records         = [aws_lb.main.dns_name]
}

resource "aws_route53_record" "secondary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.verypay.com"
  type    = "A"
  
  failover_routing_policy {
    type = "SECONDARY"
  }
  
  health_check_id = aws_route53_health_check.secondary.id
  set_identifier  = "secondary"
  ttl             = 60
  records         = [aws_lb.secondary.dns_name]
}
```

This comprehensive deployment and infrastructure architecture ensures VeryPay can scale globally while maintaining high availability, security, and performance across all components of the system.