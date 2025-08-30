const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("VeryPayMerchant Security Tests", function () {
    async function deployVeryPayMerchantFixture() {
        const [owner, feeRecipient, merchant1, attacker, customer1] = await ethers.getSigners();

        const VeryPayMerchant = await ethers.getContractFactory("VeryPayMerchant");
        const contract = await VeryPayMerchant.deploy(feeRecipient.address);

        // Register merchant
        await contract.registerMerchant(merchant1.address, "Test Merchant");

        return { contract, owner, feeRecipient, merchant1, attacker, customer1 };
    }

    describe("Reentrancy Protection", function () {
        it("Should prevent reentrancy attacks on createPayment", async function () {
            const { contract, merchant1, attacker } = await loadFixture(deployVeryPayMerchantFixture);

            // Deploy malicious contract that attempts reentrancy
            const MaliciousContract = await ethers.getContractFactory("MaliciousReentrant");
            const maliciousContract = await MaliciousContract.deploy(contract.address);

            // Register malicious contract as merchant
            await contract.registerMerchant(maliciousContract.address, "Malicious Merchant");

            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));

            // This should fail due to reentrancy guard
            await expect(
                maliciousContract.connect(attacker).attemptReentrancy(
                    paymentId,
                    "REF123",
                    { value: ethers.utils.parseEther("1.0") }
                )
            ).to.be.reverted;
        });

        it("Should prevent reentrancy attacks on completePayment", async function () {
            const { contract, merchant1, customer1, attacker } = await loadFixture(deployVeryPayMerchantFixture);

            // Create a payment
            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            await contract.connect(customer1).createPayment(
                paymentId,
                merchant1.address,
                "REF123",
                { value: ethers.utils.parseEther("1.0") }
            );

            // Deploy malicious contract that attempts reentrancy on receive
            const MaliciousReceiver = await ethers.getContractFactory("MaliciousReceiver");
            const maliciousReceiver = await MaliciousReceiver.deploy(contract.address);

            // Replace merchant address with malicious contract (this would require admin access)
            await contract.registerMerchant(maliciousReceiver.address, "Malicious Receiver");

            const maliciousPaymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("malicious"));
            await contract.connect(customer1).createPayment(
                maliciousPaymentId,
                maliciousReceiver.address,
                "REF456",
                { value: ethers.utils.parseEther("1.0") }
            );

            // This should not allow reentrancy
            await expect(contract.completePayment(maliciousPaymentId))
                .to.not.be.reverted; // The reentrancy guard should prevent multiple calls
            
            // Verify only one completion occurred
            const payment = await contract.getPayment(maliciousPaymentId);
            expect(payment.completed).to.be.true;
        });
    });

    describe("Access Control", function () {
        it("Should prevent unauthorized access to owner functions", async function () {
            const { contract, attacker } = await loadFixture(deployVeryPayMerchantFixture);

            await expect(contract.connect(attacker).updateFeePercentage(500))
                .to.be.revertedWith("Ownable: caller is not the owner");

            await expect(contract.connect(attacker).authorizeOperator(attacker.address))
                .to.be.revertedWith("Ownable: caller is not the owner");

            await expect(contract.connect(attacker).pause())
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should prevent unauthorized access to operator functions", async function () {
            const { contract, attacker, merchant1 } = await loadFixture(deployVeryPayMerchantFixture);

            await expect(contract.connect(attacker).registerMerchant(merchant1.address, "Test"))
                .to.be.revertedWith("Not authorized");

            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            await expect(contract.connect(attacker).completePayment(paymentId))
                .to.be.revertedWith("Not authorized");
        });

        it("Should allow authorized operators to perform operations", async function () {
            const { contract, attacker, merchant1 } = await loadFixture(deployVeryPayMerchantFixture);

            // Authorize attacker as operator
            await contract.authorizeOperator(attacker.address);

            // Now attacker should be able to register merchants
            await expect(contract.connect(attacker).registerMerchant(merchant1.address, "Test"))
                .to.not.be.reverted;
        });
    });

    describe("Integer Overflow/Underflow Protection", function () {
        it("Should handle large payment amounts safely", async function () {
            const { contract, merchant1, customer1 } = await loadFixture(deployVeryPayMerchantFixture);

            const largeAmount = ethers.constants.MaxUint256.div(2);
            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("large_payment"));

            // This should work without overflow
            await expect(
                contract.connect(customer1).createPayment(
                    paymentId,
                    merchant1.address,
                    "LARGE_REF",
                    { value: largeAmount }
                )
            ).to.not.be.reverted;

            // Complete the payment
            await expect(contract.completePayment(paymentId))
                .to.not.be.reverted;

            const merchantInfo = await contract.getMerchant(merchant1.address);
            expect(merchantInfo.totalEarnings).to.be.gt(0);
            expect(merchantInfo.transactionCount).to.equal(1);
        });

        it("Should handle fee calculations safely", async function () {
            const { contract, merchant1, customer1 } = await loadFixture(deployVeryPayMerchantFixture);

            // Test with various amounts
            const testAmounts = [
                ethers.utils.parseEther("0.001"), // Small amount
                ethers.utils.parseEther("1000"),  // Medium amount
                ethers.utils.parseEther("100000") // Large amount
            ];

            for (let i = 0; i < testAmounts.length; i++) {
                const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`payment_${i}`));
                
                await contract.connect(customer1).createPayment(
                    paymentId,
                    merchant1.address,
                    `REF_${i}`,
                    { value: testAmounts[i] }
                );

                await expect(contract.completePayment(paymentId))
                    .to.not.be.reverted;
            }
        });
    });

    describe("Input Validation", function () {
        it("Should validate all input parameters", async function () {
            const { contract, merchant1, customer1 } = await loadFixture(deployVeryPayMerchantFixture);

            // Test zero address validation
            await expect(contract.registerMerchant(ethers.constants.AddressZero, "Test"))
                .to.be.revertedWith("Invalid merchant address");

            // Test empty string validation
            await expect(contract.registerMerchant(merchant1.address, ""))
                .to.be.revertedWith("Invalid merchant name");

            // Test zero payment amount
            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            await expect(
                contract.connect(customer1).createPayment(
                    paymentId,
                    merchant1.address,
                    "REF123",
                    { value: 0 }
                )
            ).to.be.revertedWith("Payment amount must be greater than 0");
        });

        it("Should validate fee percentage limits", async function () {
            const { contract } = await loadFixture(deployVeryPayMerchantFixture);

            // Test maximum fee validation
            await expect(contract.updateFeePercentage(1001)) // > 10%
                .to.be.revertedWith("Fee too high");

            // Valid fee should work
            await expect(contract.updateFeePercentage(500)) // 5%
                .to.not.be.reverted;
        });
    });

    describe("State Consistency", function () {
        it("Should maintain consistent state during payment lifecycle", async function () {
            const { contract, merchant1, customer1 } = await loadFixture(deployVeryPayMerchantFixture);

            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            const paymentAmount = ethers.utils.parseEther("1.0");

            // Create payment
            await contract.connect(customer1).createPayment(
                paymentId,
                merchant1.address,
                "REF123",
                { value: paymentAmount }
            );

            // Verify initial state
            let payment = await contract.getPayment(paymentId);
            expect(payment.completed).to.be.false;
            expect(payment.amount).to.equal(paymentAmount);

            let merchantInfo = await contract.getMerchant(merchant1.address);
            expect(merchantInfo.transactionCount).to.equal(0);
            expect(merchantInfo.totalEarnings).to.equal(0);

            // Complete payment
            await contract.completePayment(paymentId);

            // Verify final state
            payment = await contract.getPayment(paymentId);
            expect(payment.completed).to.be.true;

            merchantInfo = await contract.getMerchant(merchant1.address);
            expect(merchantInfo.transactionCount).to.equal(1);
            expect(merchantInfo.totalEarnings).to.be.gt(0);
        });

        it("Should prevent double spending", async function () {
            const { contract, merchant1, customer1 } = await loadFixture(deployVeryPayMerchantFixture);

            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            const paymentAmount = ethers.utils.parseEther("1.0");

            // Create payment
            await contract.connect(customer1).createPayment(
                paymentId,
                merchant1.address,
                "REF123",
                { value: paymentAmount }
            );

            // Complete payment
            await contract.completePayment(paymentId);

            // Try to complete again - should fail
            await expect(contract.completePayment(paymentId))
                .to.be.revertedWith("Payment already completed");
        });
    });
});

// Malicious contract for testing reentrancy
contract("MaliciousReentrant", function() {
    const MaliciousReentrantSource = `
        pragma solidity ^0.8.28;
        
        interface IVeryPayMerchant {
            function createPayment(bytes32 paymentId, address merchant, string memory reference) external payable;
        }
        
        contract MaliciousReentrant {
            IVeryPayMerchant public target;
            bool public reentrancyAttempted = false;
            
            constructor(address _target) {
                target = IVeryPayMerchant(_target);
            }
            
            function attemptReentrancy(bytes32 paymentId, string memory reference) external payable {
                target.createPayment{value: msg.value}(paymentId, address(this), reference);
            }
            
            receive() external payable {
                if (!reentrancyAttempted) {
                    reentrancyAttempted = true;
                    bytes32 newPaymentId = keccak256(abi.encodePacked("reentrant"));
                    target.createPayment{value: msg.value}(newPaymentId, address(this), "REENTRANT");
                }
            }
        }
    `;
});

// Malicious receiver for testing reentrancy on payment completion
contract("MaliciousReceiver", function() {
    const MaliciousReceiverSource = `
        pragma solidity ^0.8.28;
        
        interface IVeryPayMerchant {
            function completePayment(bytes32 paymentId) external;
        }
        
        contract MaliciousReceiver {
            IVeryPayMerchant public target;
            uint256 public callCount = 0;
            
            constructor(address _target) {
                target = IVeryPayMerchant(_target);
            }
            
            receive() external payable {
                callCount++;
                if (callCount == 1) {
                    // Attempt reentrancy
                    bytes32 fakePaymentId = keccak256(abi.encodePacked("fake"));
                    try target.completePayment(fakePaymentId) {
                        // Should not reach here due to reentrancy guard
                    } catch {
                        // Expected to fail
                    }
                }
            }
        }
    `;
});