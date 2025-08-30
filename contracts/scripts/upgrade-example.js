const { ethers } = require("hardhat");
const { getSelectors, FacetCutAction } = require("./libraries/diamond.js");

/**
 * Example Diamond Upgrade Script
 * Demonstrates how to upgrade facets in the VeryPay Diamond
 */
async function upgradeExample() {
  console.log("🔄 Starting Diamond Upgrade Example...");
  
  const [deployer] = await ethers.getSigners();
  console.log(`📋 Upgrading with account: ${deployer.address}`);

  // Get diamond address (replace with actual deployed address)
  const diamondAddress = process.env.DIAMOND_ADDRESS || "0x...";
  
  if (!diamondAddress || diamondAddress === "0x...") {
    console.error("❌ Please set DIAMOND_ADDRESS environment variable");
    process.exit(1);
  }

  // Get diamond contract
  const diamond = await ethers.getContractAt("IDiamondCut", diamondAddress);
  const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", diamondAddress);

  console.log(`💎 Working with Diamond at: ${diamondAddress}`);

  // Example 1: Add a new facet
  console.log("\n1️⃣ Example: Adding New Facet");
  
  // Deploy new facet (example)
  const NewFeatureFacet = await ethers.getContractFactory("NewFeatureFacet");
  const newFeatureFacet = await NewFeatureFacet.deploy();
  await newFeatureFacet.waitForDeployment();
  console.log(`✅ NewFeatureFacet deployed to: ${await newFeatureFacet.getAddress()}`);

  // Prepare facet cut for adding new facet
  const addCut = [{
    facetAddress: await newFeatureFacet.getAddress(),
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(newFeatureFacet)
  }];

  // Execute cut
  let tx = await diamond.diamondCut(addCut, ethers.ZeroAddress, "0x");
  await tx.wait();
  console.log("✅ New facet added successfully");

  // Example 2: Replace functions in existing facet
  console.log("\n2️⃣ Example: Replacing Functions in Existing Facet");

  // Deploy updated version of existing facet
  const VeryPayCoreFacetV2 = await ethers.getContractFactory("VeryPayCoreFacetV2");
  const veryPayCoreFacetV2 = await VeryPayCoreFacetV2.deploy();
  await veryPayCoreFacetV2.waitForDeployment();
  console.log(`✅ VeryPayCoreFacetV2 deployed to: ${await veryPayCoreFacetV2.getAddress()}`);

  // Get current facets
  const facets = await diamondLoupe.facets();
  console.log(`📦 Current facets: ${facets.length}`);

  // Find the original VeryPayCoreFacet address
  let originalCoreFacetAddress;
  for (const facet of facets) {
    // This would need to be determined based on your specific setup
    // For now, we'll assume you know the address or can identify it
    if (facet.functionSelectors.includes("0x12345678")) { // example selector
      originalCoreFacetAddress = facet.facetAddress;
      break;
    }
  }

  if (originalCoreFacetAddress) {
    // Replace specific functions
    const replaceCut = [{
      facetAddress: await veryPayCoreFacetV2.getAddress(),
      action: FacetCutAction.Replace,
      functionSelectors: getSelectors(veryPayCoreFacetV2).get([
        'processPayment(address,uint256,bytes,string)',
        'validateQRCode(bytes,address,uint256)'
      ])
    }];

    tx = await diamond.diamondCut(replaceCut, ethers.ZeroAddress, "0x");
    await tx.wait();
    console.log("✅ Functions replaced successfully");
  }

  // Example 3: Remove functions
  console.log("\n3️⃣ Example: Removing Functions");

  // Remove specific functions (set facetAddress to 0x0 for removal)
  const removeCut = [{
    facetAddress: ethers.ZeroAddress,
    action: FacetCutAction.Remove,
    functionSelectors: [
      "0x12345678", // example function selector to remove
      "0x87654321"  // another example
    ]
  }];

  // Uncomment to execute removal
  // tx = await diamond.diamondCut(removeCut, ethers.ZeroAddress, "0x");
  // await tx.wait();
  // console.log("✅ Functions removed successfully");

  // Example 4: Upgrade with initialization
  console.log("\n4️⃣ Example: Upgrade with Initialization");

  // Deploy upgrade initializer
  const UpgradeInit = await ethers.getContractFactory("UpgradeInit");
  const upgradeInit = await UpgradeInit.deploy();
  await upgradeInit.waitForDeployment();
  console.log(`✅ UpgradeInit deployed to: ${await upgradeInit.getAddress()}`);

  // Prepare upgrade with initialization
  const upgradeParams = {
    newParameter: "value",
    additionalConfig: 12345
  };

  const functionCall = upgradeInit.interface.encodeFunctionData("init", [upgradeParams]);

  const upgradeCut = [{
    facetAddress: await newFeatureFacet.getAddress(),
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(newFeatureFacet).get(['newFunction(uint256)'])
  }];

  tx = await diamond.diamondCut(upgradeCut, await upgradeInit.getAddress(), functionCall);
  await tx.wait();
  console.log("✅ Upgrade with initialization completed");

  // Verify upgrade
  console.log("\n🔍 Verifying Upgrade...");
  const updatedFacets = await diamondLoupe.facets();
  console.log(`📦 Updated facets: ${updatedFacets.length}`);

  for (let i = 0; i < updatedFacets.length; i++) {
    console.log(`Facet ${i}: ${updatedFacets[i].facetAddress} (${updatedFacets[i].functionSelectors.length} functions)`);
  }

  console.log("✅ Diamond upgrade completed successfully!");
}

// Utility function to get facet info
async function getFacetInfo(diamondAddress) {
  const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", diamondAddress);
  const facets = await diamondLoupe.facets();
  
  console.log(`\n💎 Diamond Facet Information`);
  console.log(`Address: ${diamondAddress}`);
  console.log(`Total Facets: ${facets.length}`);
  
  for (let i = 0; i < facets.length; i++) {
    const facet = facets[i];
    console.log(`\nFacet ${i + 1}:`);
    console.log(`  Address: ${facet.facetAddress}`);
    console.log(`  Functions: ${facet.functionSelectors.length}`);
    console.log(`  Selectors: ${facet.functionSelectors.join(", ")}`);
  }
}

// Execute if run directly
if (require.main === module) {
  upgradeExample()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Upgrade failed:", error);
      process.exit(1);
    });
}

module.exports = { upgradeExample, getFacetInfo };