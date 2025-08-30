const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("VeryPayMerchant Integration Tests", function () {
    async function deployCompleteSystemFixture() {
        const [
            owner,
            feeRecipient,
            merchant1,
            merchant2,
            customer1,
            customer2,
            operator1,
            operator2
        ] = await ethers.getSigners();

        const VeryPayMerchant = await ethers.getContractFactory("VeryPayMerchant");
        const contract = await VeryPayMerchant.deploy(feeRecipient.address);

        // Setup initial system state
        await contract.registerMerchant(merchant1.address, "Electronics Store");
        await contract.registerMerchant(merchant2.address, "Coffee Shop");
        await contract.authorizeOperator(operator1.address);

        return {
            contract,
            owner,
            feeRecipient,
            merchant1,
            merchant2,
            customer1,
            customer2,
            operator1,
            operator2
        };
    }

    describe("Complete Payment Workflow", function () {
        it("Should handle complete payment lifecycle for multiple merchants", async function () {
            const {
                contract,
                merchant1,
                merchant2,
                customer1,
                customer2,
                feeRecipient
            } = await loadFixture(deployCompleteSystemFixture);

            // Track initial balances
            const initialMerchant1Balance = await ethers.provider.getBalance(merchant1.address);
            const initialMerchant2Balance = await ethers.provider.getBalance(merchant2.address);
            const initialFeeBalance = await ethers.provider.getBalance(feeRecipient.address);

            // Customer 1 pays Merchant 1
            const payment1Id = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            const payment1Amount = ethers.utils.parseEther("2.5");

            await contract.connect(customer1).createPayment(
                payment1Id,
                merchant1.address,
                "ORDER-001",
                { value: payment1Amount }
            );

            // Customer 2 pays Merchant 2
            const payment2Id = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment2"));
            const payment2Amount = ethers.utils.parseEther("0.8");

            await contract.connect(customer2).createPayment(
                payment2Id,
                merchant2.address,
                "ORDER-002",
                { value: payment2Amount }
            );

            // Customer 1 pays Merchant 2
            const payment3Id = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment3"));
            const payment3Amount = ethers.utils.parseEther("1.2");

            await contract.connect(customer1).createPayment(
                payment3Id,
                merchant2.address,
                "ORDER-003",
                { value: payment3Amount }
            );

            // Complete all payments
            await contract.completePayment(payment1Id);
            await contract.completePayment(payment2Id);
            await contract.completePayment(payment3Id);

            // Verify final balances
            const finalMerchant1Balance = await ethers.provider.getBalance(merchant1.address);
            const finalMerchant2Balance = await ethers.provider.getBalance(merchant2.address);
            const finalFeeBalance = await ethers.provider.getBalance(feeRecipient.address);

            // Calculate expected amounts (2.5% fee)
            const expectedFee1 = payment1Amount.mul(250).div(10000);
            const expectedMerchant1Amount = payment1Amount.sub(expectedFee1);

            const expectedFee2 = payment2Amount.mul(250).div(10000);
            const expectedFee3 = payment3Amount.mul(250).div(10000);
            const expectedMerchant2Amount = payment2Amount.add(payment3Amount).sub(expectedFee2).sub(expectedFee3);

            const totalExpectedFees = expectedFee1.add(expectedFee2).add(expectedFee3);

            expect(finalMerchant1Balance.sub(initialMerchant1Balance)).to.equal(expectedMerchant1Amount);
            expect(finalMerchant2Balance.sub(initialMerchant2Balance)).to.equal(expectedMerchant2Amount);
            expect(finalFeeBalance.sub(initialFeeBalance)).to.equal(totalExpectedFees);

            // Verify merchant stats
            const merchant1Info = await contract.getMerchant(merchant1.address);
            expect(merchant1Info.transactionCount).to.equal(1);
            expect(merchant1Info.totalEarnings).to.equal(expectedMerchant1Amount);

            const merchant2Info = await contract.getMerchant(merchant2.address);
            expect(merchant2Info.transactionCount).to.equal(2);
            expect(merchant2Info.totalEarnings).to.equal(expectedMerchant2Amount);
        });

        it("Should handle failed payments gracefully", async function () {
            const { contract, merchant1, customer1 } = await loadFixture(deployCompleteSystemFixture);

            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            
            // Create payment with insufficient contract balance simulation
            await contract.connect(customer1).createPayment(
                paymentId,
                merchant1.address,
                "ORDER-001",
                { value: ethers.utils.parseEther("1.0") }
            );

            // Deploy a contract that rejects payments
            const RejectingContract = await ethers.getContractFactory("RejectingContract");
            const rejectingContract = await RejectingContract.deploy();

            // Register rejecting contract as merchant
            await contract.registerMerchant(rejectingContract.address, "Rejecting Merchant");

            const rejectingPaymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("rejecting_payment"));
            await contract.connect(customer1).createPayment(
                rejectingPaymentId,
                rejectingContract.address,
                "ORDER-REJECT",
                { value: ethers.utils.parseEther("1.0") }
            );

            // This should fail due to transfer failure
            await expect(contract.completePayment(rejectingPaymentId))
                .to.be.revertedWith("Transfer to merchant failed");

            // Verify payment status remains incomplete
            const payment = await contract.getPayment(rejectingPaymentId);
            expect(payment.completed).to.be.false;
        });
    });

    describe("Multi-Operator Scenarios", function () {
        it("Should handle operations from multiple authorized operators", async function () {
            const {
                contract,
                operator1,
                operator2,
                merchant1,
                merchant2,
                customer1
            } = await loadFixture(deployCompleteSystemFixture);

            // Authorize second operator
            await contract.authorizeOperator(operator2.address);

            // Operator 1 creates merchant
            const [, , , newMerchant] = await ethers.getSigners();
            await contract.connect(operator1).registerMerchant(newMerchant.address, "New Store");

            // Create payments
            const payment1Id = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            const payment2Id = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment2"));

            await contract.connect(customer1).createPayment(
                payment1Id,
                merchant1.address,
                "ORDER-001",
                { value: ethers.utils.parseEther("1.0") }
            );

            await contract.connect(customer1).createPayment(
                payment2Id,
                newMerchant.address,
                "ORDER-002",
                { value: ethers.utils.parseEther("2.0") }
            );

            // Different operators complete different payments
            await contract.connect(operator1).completePayment(payment1Id);
            await contract.connect(operator2).completePayment(payment2Id);

            // Verify both payments completed
            const payment1 = await contract.getPayment(payment1Id);
            const payment2 = await contract.getPayment(payment2Id);

            expect(payment1.completed).to.be.true;
            expect(payment2.completed).to.be.true;
        });

        it("Should handle operator authorization changes during operations", async function () {
            const { contract, operator1, merchant1, customer1 } = await loadFixture(deployCompleteSystemFixture);

            // Create payment
            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            await contract.connect(customer1).createPayment(
                paymentId,
                merchant1.address,
                "ORDER-001",
                { value: ethers.utils.parseEther("1.0") }
            );

            // Revoke operator authorization
            await contract.revokeOperator(operator1.address);

            // Operator should no longer be able to complete payment
            await expect(contract.connect(operator1).completePayment(paymentId))
                .to.be.revertedWith("Not authorized");

            // Re-authorize and complete payment
            await contract.authorizeOperator(operator1.address);
            await expect(contract.connect(operator1).completePayment(paymentId))
                .to.not.be.reverted;
        });
    });

    describe("System State Management", function () {
        it("Should maintain system integrity during pause/unpause cycles", async function () {
            const { contract, merchant1, customer1 } = await loadFixture(deployCompleteSystemFixture);

            // Create payment before pause
            const payment1Id = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            await contract.connect(customer1).createPayment(
                payment1Id,
                merchant1.address,
                "ORDER-001",
                { value: ethers.utils.parseEther("1.0") }
            );

            // Pause contract
            await contract.pause();

            // Should not be able to create new payments
            const payment2Id = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment2"));
            await expect(
                contract.connect(customer1).createPayment(
                    payment2Id,
                    merchant1.address,
                    "ORDER-002",
                    { value: ethers.utils.parseEther("1.0") }
                )
            ).to.be.revertedWith("Pausable: paused");

            // Should still be able to complete existing payments (admin functions not paused)
            await expect(contract.completePayment(payment1Id))
                .to.not.be.reverted;

            // Unpause and create new payment
            await contract.unpause();
            await expect(
                contract.connect(customer1).createPayment(
                    payment2Id,
                    merchant1.address,
                    "ORDER-002",
                    { value: ethers.utils.parseEther("1.0") }
                )
            ).to.not.be.reverted;
        });

        it("Should handle fee changes during active payments", async function () {
            const { contract, merchant1, customer1, feeRecipient } = await loadFixture(deployCompleteSystemFixture);

            // Create payment with original fee (2.5%)
            const payment1Id = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            const paymentAmount = ethers.utils.parseEther("1.0");

            await contract.connect(customer1).createPayment(
                payment1Id,
                merchant1.address,
                "ORDER-001",
                { value: paymentAmount }
            );

            // Change fee to 5%
            await contract.updateFeePercentage(500);

            // Create another payment with new fee
            const payment2Id = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment2"));
            await contract.connect(customer1).createPayment(
                payment2Id,
                merchant1.address,
                "ORDER-002",
                { value: paymentAmount }
            );

            const initialFeeBalance = await ethers.provider.getBalance(feeRecipient.address);

            // Complete both payments
            await contract.completePayment(payment1Id);
            await contract.completePayment(payment2Id);

            const finalFeeBalance = await ethers.provider.getBalance(feeRecipient.address);

            // Calculate expected fees
            const expectedFee1 = paymentAmount.mul(250).div(10000); // 2.5%
            const expectedFee2 = paymentAmount.mul(500).div(10000); // 5%
            const totalExpectedFees = expectedFee1.add(expectedFee2);

            expect(finalFeeBalance.sub(initialFeeBalance)).to.equal(totalExpectedFees);
        });
    });

    describe("High Volume Operations", function () {
        it("Should handle multiple concurrent payments efficiently", async function () {
            const { contract, merchant1, merchant2 } = await loadFixture(deployCompleteSystemFixture);

            const customers = [];
            const signers = await ethers.getSigners();
            // Use remaining signers as customers
            for (let i = 8; i < Math.min(18, signers.length); i++) {
                customers.push(signers[i]);
            }

            const paymentPromises = [];
            const paymentIds = [];

            // Create multiple payments concurrently
            for (let i = 0; i < customers.length; i++) {
                const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`payment_${i}`));
                paymentIds.push(paymentId);
                
                const merchant = i % 2 === 0 ? merchant1.address : merchant2.address;
                const amount = ethers.utils.parseEther((Math.random() * 5 + 0.1).toString());

                paymentPromises.push(
                    contract.connect(customers[i]).createPayment(
                        paymentId,
                        merchant,
                        `ORDER-${i}`,
                        { value: amount }
                    )
                );
            }

            // Wait for all payments to be created
            await Promise.all(paymentPromises);

            // Complete all payments
            const completionPromises = paymentIds.map(paymentId => 
                contract.completePayment(paymentId)
            );

            await Promise.all(completionPromises);

            // Verify all payments were completed
            for (const paymentId of paymentIds) {
                const payment = await contract.getPayment(paymentId);
                expect(payment.completed).to.be.true;
            }

            // Check merchant transaction counts
            const merchant1Info = await contract.getMerchant(merchant1.address);
            const merchant2Info = await contract.getMerchant(merchant2.address);

            expect(merchant1Info.transactionCount.add(merchant2Info.transactionCount))
                .to.equal(customers.length);
        });

        it("Should maintain performance under load", async function () {
            const { contract, merchant1, customer1 } = await loadFixture(deployCompleteSystemFixture);

            const batchSize = 5;
            const startTime = Date.now();

            for (let batch = 0; batch < 3; batch++) {
                const batchPromises = [];
                
                for (let i = 0; i < batchSize; i++) {
                    const paymentId = ethers.utils.keccak256(
                        ethers.utils.toUtf8Bytes(`batch_${batch}_payment_${i}`)
                    );
                    
                    batchPromises.push(
                        contract.connect(customer1).createPayment(
                            paymentId,
                            merchant1.address,
                            `BATCH-${batch}-${i}`,
                            { value: ethers.utils.parseEther("0.1") }
                        )
                    );
                }

                await Promise.all(batchPromises);

                // Complete batch
                const completionPromises = [];
                for (let i = 0; i < batchSize; i++) {
                    const paymentId = ethers.utils.keccak256(
                        ethers.utils.toUtf8Bytes(`batch_${batch}_payment_${i}`)
                    );
                    completionPromises.push(contract.completePayment(paymentId));
                }

                await Promise.all(completionPromises);
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Should complete within reasonable time (adjust threshold as needed)
            expect(totalTime).to.be.below(30000); // 30 seconds max

            // Verify final state
            const merchantInfo = await contract.getMerchant(merchant1.address);
            expect(merchantInfo.transactionCount).to.equal(batchSize * 3);
        });
    });
});

// Helper contract for testing failed transfers
contract("RejectingContract", function() {
    const RejectingContractSource = `
        pragma solidity ^0.8.28;
        
        contract RejectingContract {
            // Always reject incoming payments
            receive() external payable {
                revert("Payment rejected");
            }
        }
    `;
});