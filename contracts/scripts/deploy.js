const { ethers } = require("hardhat");
const { getSelectors, FacetCutAction } = require("./libraries/diamond.js");

/**
 * VeryPay Diamond Deployment Script
 * Deploys the complete VeryPay system using the Diamond Standard (EIP-2535)
 */
async function main() {
  console.log("🚀 Starting VeryPay Diamond Deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log(`📋 Deploying contracts with account: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);

  // Deploy VERY token (mock for testing)
  console.log("\n1️⃣ Deploying VERY Token...");
  const VeryToken = await ethers.getContractFactory("VeryToken");
  const veryToken = await VeryToken.deploy(
    "VERY Token",
    "VERY",
    ethers.parseEther("1000000000"), // 1B tokens
    deployer.address
  );
  await veryToken.waitForDeployment();
  console.log(`✅ VERY Token deployed to: ${await veryToken.getAddress()}`);

  // Deploy Governance Token
  console.log("\n2️⃣ Deploying Governance Token...");
  const GovernanceToken = await ethers.getContractFactory("VeryGovernanceToken");
  const governanceToken = await GovernanceToken.deploy(
    "VERY Governance",
    "vVERY",
    ethers.parseEther("100000000"), // 100M tokens
    deployer.address
  );
  await governanceToken.waitForDeployment();
  console.log(`✅ Governance Token deployed to: ${await governanceToken.getAddress()}`);

  // Deploy Diamond Cut Facet
  console.log("\n3️⃣ Deploying Diamond Cut Facet...");
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.waitForDeployment();
  console.log(`✅ DiamondCutFacet deployed to: ${await diamondCutFacet.getAddress()}`);

  // Deploy Diamond
  console.log("\n4️⃣ Deploying Diamond...");
  const Diamond = await ethers.getContractFactory("Diamond");
  const diamond = await Diamond.deploy(deployer.address, await diamondCutFacet.getAddress());
  await diamond.waitForDeployment();
  console.log(`✅ Diamond deployed to: ${await diamond.getAddress()}`);

  // Deploy Diamond Init
  console.log("\n5️⃣ Deploying Diamond Init...");
  const DiamondInit = await ethers.getContractFactory("DiamondInit");
  const diamondInit = await DiamondInit.deploy();
  await diamondInit.waitForDeployment();
  console.log(`✅ DiamondInit deployed to: ${await diamondInit.getAddress()}`);

  // Deploy All Facets
  console.log("\n6️⃣ Deploying All Facets...");
  
  const facets = [
    "DiamondLoupeFacet",
    "VeryPayCoreFacet",
    "VeryRewardsFacet", 
    "VeryMerchantFacet",
    "VeryGovernanceFacet"
  ];

  const deployedFacets = {};
  
  for (const facetName of facets) {
    const Facet = await ethers.getContractFactory(facetName);
    const facet = await Facet.deploy();
    await facet.waitForDeployment();
    deployedFacets[facetName] = facet;
    console.log(`✅ ${facetName} deployed to: ${await facet.getAddress()}`);
  }

  // Prepare facet cuts
  console.log("\n7️⃣ Preparing Facet Cuts...");
  const cut = [];

  // Add DiamondLoupeFacet
  cut.push({
    facetAddress: await deployedFacets.DiamondLoupeFacet.getAddress(),
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(deployedFacets.DiamondLoupeFacet)
  });

  // Add VeryPayCoreFacet
  cut.push({
    facetAddress: await deployedFacets.VeryPayCoreFacet.getAddress(),
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(deployedFacets.VeryPayCoreFacet)
  });

  // Add VeryRewardsFacet
  cut.push({
    facetAddress: await deployedFacets.VeryRewardsFacet.getAddress(),
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(deployedFacets.VeryRewardsFacet)
  });

  // Add VeryMerchantFacet
  cut.push({
    facetAddress: await deployedFacets.VeryMerchantFacet.getAddress(),
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(deployedFacets.VeryMerchantFacet)
  });

  // Add VeryGovernanceFacet
  cut.push({
    facetAddress: await deployedFacets.VeryGovernanceFacet.getAddress(),
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(deployedFacets.VeryGovernanceFacet)
  });

  console.log(`📦 Prepared ${cut.length} facet cuts`);

  // Upgrade diamond with facets
  console.log("\n8️⃣ Upgrading Diamond with Facets...");
  const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
  
  // Prepare init call data
  const initParams = {
    veryToken: await veryToken.getAddress(),
    governanceToken: await governanceToken.getAddress(),
    name: "VeryPay System",
    symbol: "VPAY",
    initialSupply: ethers.parseEther("1000000000"),
    initialOwners: [deployer.address],
    initialBalances: [ethers.parseEther("1000000000")]
  };

  const functionCall = diamondInit.interface.encodeFunctionData("init", [initParams]);

  const tx = await diamondCut.diamondCut(cut, await diamondInit.getAddress(), functionCall);
  console.log("📤 Diamond cut transaction sent:", tx.hash);
  const receipt = await tx.wait();
  
  if (receipt.status !== 1) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  console.log("✅ Diamond upgrade completed");

  // Initialize facets
  console.log("\n9️⃣ Initializing Facets...");
  
  // Initialize VeryPayCore
  const veryPayCore = await ethers.getContractAt("VeryPayCoreFacet", await diamond.getAddress());
  await veryPayCore.initializeVeryPayCore(
    await veryToken.getAddress(),
    deployer.address, // fee recipient
    250 // 2.5% platform fee
  );
  console.log("✅ VeryPayCore initialized");

  // Initialize VeryRewards
  const veryRewards = await ethers.getContractAt("VeryRewardsFacet", await diamond.getAddress());
  await veryRewards.initializeVeryRewards(await veryToken.getAddress());
  console.log("✅ VeryRewards initialized");

  // Initialize VeryMerchant
  const veryMerchant = await ethers.getContractAt("VeryMerchantFacet", await diamond.getAddress());
  await veryMerchant.initializeVeryMerchant(
    await veryToken.getAddress(),
    deployer.address, // default fee recipient
    250 // 2.5% default platform fee
  );
  console.log("✅ VeryMerchant initialized");

  // Initialize VeryGovernance
  const veryGovernance = await ethers.getContractAt("VeryGovernanceFacet", await diamond.getAddress());
  const governanceParams = {
    votingDelay: 1, // 1 block
    votingPeriod: 50400, // ~7 days (assuming 12s blocks)
    proposalThreshold: ethers.parseEther("1000000"), // 1M tokens
    quorumVotes: ethers.parseEther("4000000"), // 4M tokens (4% of 100M)
    timelockDelay: 2 * 24 * 60 * 60 // 2 days
  };
  
  await veryGovernance.initializeVeryGovernance(
    await governanceToken.getAddress(),
    await veryToken.getAddress(),
    governanceParams
  );
  console.log("✅ VeryGovernance initialized");

  // Setup initial permissions and roles
  console.log("\n🔑 Setting up Roles and Permissions...");
  
  // Grant roles to deployer (in production, these should be distributed)
  const PAYMENT_PROCESSOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAYMENT_PROCESSOR_ROLE"));
  const MERCHANT_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MERCHANT_MANAGER_ROLE"));
  const KYC_VERIFIER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("KYC_VERIFIER_ROLE"));
  const REWARDS_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("REWARDS_MANAGER_ROLE"));

  // VeryPayCore roles
  await veryPayCore.grantRole(PAYMENT_PROCESSOR_ROLE, deployer.address);
  await veryPayCore.grantRole(MERCHANT_MANAGER_ROLE, deployer.address);
  await veryPayCore.grantRole(KYC_VERIFIER_ROLE, deployer.address);
  
  // VeryRewards roles
  await veryRewards.grantRole(REWARDS_MANAGER_ROLE, deployer.address);
  
  console.log("✅ Initial roles granted");

  // Verify deployment
  console.log("\n🔍 Verifying Deployment...");
  const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", await diamond.getAddress());
  const facetAddresses = await diamondLoupe.facetAddresses();
  console.log(`✅ Diamond has ${facetAddresses.length} facets`);

  // Generate deployment summary
  console.log("\n📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(50));
  console.log(`🏦 VERY Token: ${await veryToken.getAddress()}`);
  console.log(`🗳️  Governance Token: ${await governanceToken.getAddress()}`);
  console.log(`💎 Diamond (Main Contract): ${await diamond.getAddress()}`);
  console.log(`🔧 Diamond Cut Facet: ${await diamondCutFacet.getAddress()}`);
  console.log(`🔍 Diamond Loupe Facet: ${await deployedFacets.DiamondLoupeFacet.getAddress()}`);
  console.log(`💳 VeryPay Core Facet: ${await deployedFacets.VeryPayCoreFacet.getAddress()}`);
  console.log(`🎁 VeryRewards Facet: ${await deployedFacets.VeryRewardsFacet.getAddress()}`);
  console.log(`🏪 VeryMerchant Facet: ${await deployedFacets.VeryMerchantFacet.getAddress()}`);
  console.log(`🏛️  VeryGovernance Facet: ${await deployedFacets.VeryGovernanceFacet.getAddress()}`);
  console.log("=".repeat(50));

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      veryToken: await veryToken.getAddress(),
      governanceToken: await governanceToken.getAddress(),
      diamond: await diamond.getAddress(),
      diamondCutFacet: await diamondCutFacet.getAddress(),
      facets: {
        diamondLoupe: await deployedFacets.DiamondLoupeFacet.getAddress(),
        veryPayCore: await deployedFacets.VeryPayCoreFacet.getAddress(),
        veryRewards: await deployedFacets.VeryRewardsFacet.getAddress(),
        veryMerchant: await deployedFacets.VeryMerchantFacet.getAddress(),
        veryGovernance: await deployedFacets.VeryGovernanceFacet.getAddress()
      }
    },
    configuration: {
      platformFee: "2.5%",
      governanceParams,
      initialSupply: {
        very: "1,000,000,000 VERY",
        governance: "100,000,000 vVERY"
      }
    }
  };

  // Write deployment info to file
  const fs = require("fs");
  const path = require("path");
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deploymentsDir, `deployment-${Date.now()}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 Deployment information saved to deployments/");
  console.log("🎉 VeryPay Diamond deployment completed successfully!");
  
  return {
    diamond: await diamond.getAddress(),
    veryToken: await veryToken.getAddress(),
    governanceToken: await governanceToken.getAddress(),
    facets: deployedFacets
  };
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = { main };