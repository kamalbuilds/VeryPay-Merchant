const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("VeryPayMerchant", function () {
    // Test fixture for deploying contract
    async function deployVeryPayMerchantFixture() {
        const [owner, feeRecipient, merchant1, merchant2, customer1, customer2, operator] = await ethers.getSigners();

        const VeryPayMerchant = await ethers.getContractFactory("VeryPayMerchant");
        const contract = await VeryPayMerchant.deploy(feeRecipient.address);

        return { 
            contract, 
            owner, 
            feeRecipient, 
            merchant1, 
            merchant2, 
            customer1, 
            customer2, 
            operator 
        };
    }

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            const { contract, owner } = await loadFixture(deployVeryPayMerchantFixture);
            expect(await contract.owner()).to.equal(owner.address);
        });

        it("Should set the correct fee recipient", async function () {
            const { contract, feeRecipient } = await loadFixture(deployVeryPayMerchantFixture);
            expect(await contract.feeRecipient()).to.equal(feeRecipient.address);
        });

        it("Should authorize owner as operator", async function () {
            const { contract, owner } = await loadFixture(deployVeryPayMerchantFixture);
            expect(await contract.authorizedOperators(owner.address)).to.be.true;
        });

        it("Should set default fee percentage to 2.5%", async function () {
            const { contract } = await loadFixture(deployVeryPayMerchantFixture);
            expect(await contract.feePercentage()).to.equal(250); // 2.5% in basis points
        });

        it("Should revert with invalid fee recipient", async function () {
            const VeryPayMerchant = await ethers.getContractFactory("VeryPayMerchant");
            await expect(VeryPayMerchant.deploy(ethers.constants.AddressZero))
                .to.be.revertedWith("Invalid fee recipient");
        });
    });

    describe("Merchant Registration", function () {
        it("Should register a new merchant", async function () {
            const { contract, merchant1 } = await loadFixture(deployVeryPayMerchantFixture);
            
            await expect(contract.registerMerchant(merchant1.address, "Test Merchant"))
                .to.emit(contract, "MerchantRegistered")
                .withArgs(merchant1.address, "Test Merchant");

            const merchantInfo = await contract.getMerchant(merchant1.address);
            expect(merchantInfo.name).to.equal("Test Merchant");
            expect(merchantInfo.walletAddress).to.equal(merchant1.address);
            expect(merchantInfo.isActive).to.be.true;
            expect(merchantInfo.totalEarnings).to.equal(0);
            expect(merchantInfo.transactionCount).to.equal(0);
        });

        it("Should revert if non-authorized tries to register merchant", async function () {
            const { contract, merchant1, customer1 } = await loadFixture(deployVeryPayMerchantFixture);
            
            await expect(contract.connect(customer1).registerMerchant(merchant1.address, "Test Merchant"))
                .to.be.revertedWith("Not authorized");
        });

        it("Should revert with invalid merchant address", async function () {
            const { contract } = await loadFixture(deployVeryPayMerchantFixture);
            
            await expect(contract.registerMerchant(ethers.constants.AddressZero, "Test Merchant"))
                .to.be.revertedWith("Invalid merchant address");
        });

        it("Should revert with empty merchant name", async function () {
            const { contract, merchant1 } = await loadFixture(deployVeryPayMerchantFixture);
            
            await expect(contract.registerMerchant(merchant1.address, ""))
                .to.be.revertedWith("Invalid merchant name");
        });

        it("Should revert if merchant already registered", async function () {
            const { contract, merchant1 } = await loadFixture(deployVeryPayMerchantFixture);
            
            await contract.registerMerchant(merchant1.address, "Test Merchant");
            await expect(contract.registerMerchant(merchant1.address, "Another Name"))
                .to.be.revertedWith("Merchant already registered");
        });
    });

    describe("Payment Creation", function () {
        beforeEach(async function () {
            const fixture = await loadFixture(deployVeryPayMerchantFixture);
            this.contract = fixture.contract;
            this.merchant1 = fixture.merchant1;
            this.customer1 = fixture.customer1;
            
            // Register merchant
            await this.contract.registerMerchant(this.merchant1.address, "Test Merchant");
        });

        it("Should create a payment successfully", async function () {
            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            const paymentAmount = ethers.utils.parseEther("1.0");

            await expect(
                this.contract.connect(this.customer1).createPayment(
                    paymentId,
                    this.merchant1.address,
                    "REF123",
                    { value: paymentAmount }
                )
            )
                .to.emit(this.contract, "PaymentCreated")
                .withArgs(paymentId, this.customer1.address, this.merchant1.address, paymentAmount);

            const payment = await this.contract.getPayment(paymentId);
            expect(payment.payer).to.equal(this.customer1.address);
            expect(payment.merchant).to.equal(this.merchant1.address);
            expect(payment.amount).to.equal(paymentAmount);
            expect(payment.completed).to.be.false;
            expect(payment.reference).to.equal("REF123");
        });

        it("Should revert with zero payment amount", async function () {
            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));

            await expect(
                this.contract.connect(this.customer1).createPayment(
                    paymentId,
                    this.merchant1.address,
                    "REF123",
                    { value: 0 }
                )
            ).to.be.revertedWith("Payment amount must be greater than 0");
        });

        it("Should revert with inactive merchant", async function () {
            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            const paymentAmount = ethers.utils.parseEther("1.0");
            
            // Use unregistered merchant
            const [, , , unregisteredMerchant] = await ethers.getSigners();

            await expect(
                this.contract.connect(this.customer1).createPayment(
                    paymentId,
                    unregisteredMerchant.address,
                    "REF123",
                    { value: paymentAmount }
                )
            ).to.be.revertedWith("Merchant not active");
        });

        it("Should revert with duplicate payment ID", async function () {
            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            const paymentAmount = ethers.utils.parseEther("1.0");

            await this.contract.connect(this.customer1).createPayment(
                paymentId,
                this.merchant1.address,
                "REF123",
                { value: paymentAmount }
            );

            await expect(
                this.contract.connect(this.customer1).createPayment(
                    paymentId,
                    this.merchant1.address,
                    "REF456",
                    { value: paymentAmount }
                )
            ).to.be.revertedWith("Payment ID already exists");
        });

        it("Should revert when contract is paused", async function () {
            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            const paymentAmount = ethers.utils.parseEther("1.0");

            await this.contract.pause();

            await expect(
                this.contract.connect(this.customer1).createPayment(
                    paymentId,
                    this.merchant1.address,
                    "REF123",
                    { value: paymentAmount }
                )
            ).to.be.revertedWith("Pausable: paused");
        });
    });

    describe("Payment Completion", function () {
        beforeEach(async function () {
            const fixture = await loadFixture(deployVeryPayMerchantFixture);
            this.contract = fixture.contract;
            this.merchant1 = fixture.merchant1;
            this.customer1 = fixture.customer1;
            this.feeRecipient = fixture.feeRecipient;
            
            // Register merchant and create payment
            await this.contract.registerMerchant(this.merchant1.address, "Test Merchant");
            
            this.paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            this.paymentAmount = ethers.utils.parseEther("1.0");
            
            await this.contract.connect(this.customer1).createPayment(
                this.paymentId,
                this.merchant1.address,
                "REF123",
                { value: this.paymentAmount }
            );
        });

        it("Should complete payment and transfer funds correctly", async function () {
            const initialMerchantBalance = await ethers.provider.getBalance(this.merchant1.address);
            const initialFeeBalance = await ethers.provider.getBalance(this.feeRecipient.address);

            const expectedFee = this.paymentAmount.mul(250).div(10000); // 2.5%
            const expectedMerchantAmount = this.paymentAmount.sub(expectedFee);

            await expect(this.contract.completePayment(this.paymentId))
                .to.emit(this.contract, "PaymentCompleted")
                .withArgs(this.paymentId, expectedFee);

            const finalMerchantBalance = await ethers.provider.getBalance(this.merchant1.address);
            const finalFeeBalance = await ethers.provider.getBalance(this.feeRecipient.address);

            expect(finalMerchantBalance.sub(initialMerchantBalance)).to.equal(expectedMerchantAmount);
            expect(finalFeeBalance.sub(initialFeeBalance)).to.equal(expectedFee);

            // Check payment status
            const payment = await this.contract.getPayment(this.paymentId);
            expect(payment.completed).to.be.true;

            // Check merchant stats
            const merchantInfo = await this.contract.getMerchant(this.merchant1.address);
            expect(merchantInfo.totalEarnings).to.equal(expectedMerchantAmount);
            expect(merchantInfo.transactionCount).to.equal(1);
        });

        it("Should revert if non-authorized tries to complete payment", async function () {
            await expect(this.contract.connect(this.customer1).completePayment(this.paymentId))
                .to.be.revertedWith("Not authorized");
        });

        it("Should revert for non-existent payment", async function () {
            const nonExistentPaymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("nonexistent"));
            
            await expect(this.contract.completePayment(nonExistentPaymentId))
                .to.be.revertedWith("Payment not found");
        });

        it("Should revert if payment already completed", async function () {
            await this.contract.completePayment(this.paymentId);
            
            await expect(this.contract.completePayment(this.paymentId))
                .to.be.revertedWith("Payment already completed");
        });
    });

    describe("Fee Management", function () {
        it("Should update fee percentage", async function () {
            const { contract } = await loadFixture(deployVeryPayMerchantFixture);
            const newFee = 300; // 3%

            await expect(contract.updateFeePercentage(newFee))
                .to.emit(contract, "FeeUpdated")
                .withArgs(250, newFee);

            expect(await contract.feePercentage()).to.equal(newFee);
        });

        it("Should revert if non-owner tries to update fee", async function () {
            const { contract, customer1 } = await loadFixture(deployVeryPayMerchantFixture);
            
            await expect(contract.connect(customer1).updateFeePercentage(300))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should revert if fee exceeds maximum", async function () {
            const { contract } = await loadFixture(deployVeryPayMerchantFixture);
            
            await expect(contract.updateFeePercentage(1001)) // > 10%
                .to.be.revertedWith("Fee too high");
        });
    });

    describe("Operator Management", function () {
        it("Should authorize new operator", async function () {
            const { contract, operator } = await loadFixture(deployVeryPayMerchantFixture);

            await expect(contract.authorizeOperator(operator.address))
                .to.emit(contract, "OperatorAuthorized")
                .withArgs(operator.address);

            expect(await contract.authorizedOperators(operator.address)).to.be.true;
        });

        it("Should revoke operator authorization", async function () {
            const { contract, operator } = await loadFixture(deployVeryPayMerchantFixture);

            await contract.authorizeOperator(operator.address);
            
            await expect(contract.revokeOperator(operator.address))
                .to.emit(contract, "OperatorRevoked")
                .withArgs(operator.address);

            expect(await contract.authorizedOperators(operator.address)).to.be.false;
        });

        it("Should revert if non-owner tries to manage operators", async function () {
            const { contract, operator, customer1 } = await loadFixture(deployVeryPayMerchantFixture);

            await expect(contract.connect(customer1).authorizeOperator(operator.address))
                .to.be.revertedWith("Ownable: caller is not the owner");

            await expect(contract.connect(customer1).revokeOperator(operator.address))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Pause Functionality", function () {
        it("Should pause and unpause contract", async function () {
            const { contract } = await loadFixture(deployVeryPayMerchantFixture);

            await contract.pause();
            expect(await contract.paused()).to.be.true;

            await contract.unpause();
            expect(await contract.paused()).to.be.false;
        });

        it("Should revert if non-owner tries to pause", async function () {
            const { contract, customer1 } = await loadFixture(deployVeryPayMerchantFixture);

            await expect(contract.connect(customer1).pause())
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Gas Optimization", function () {
        it("Should have reasonable gas costs for payment creation", async function () {
            const { contract, merchant1, customer1 } = await loadFixture(deployVeryPayMerchantFixture);
            
            await contract.registerMerchant(merchant1.address, "Test Merchant");
            
            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            const tx = await contract.connect(customer1).createPayment(
                paymentId,
                merchant1.address,
                "REF123",
                { value: ethers.utils.parseEther("1.0") }
            );
            
            const receipt = await tx.wait();
            expect(receipt.gasUsed).to.be.below(200000); // Reasonable gas limit
        });

        it("Should have reasonable gas costs for payment completion", async function () {
            const { contract, merchant1, customer1 } = await loadFixture(deployVeryPayMerchantFixture);
            
            await contract.registerMerchant(merchant1.address, "Test Merchant");
            
            const paymentId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment1"));
            await contract.connect(customer1).createPayment(
                paymentId,
                merchant1.address,
                "REF123",
                { value: ethers.utils.parseEther("1.0") }
            );
            
            const tx = await contract.completePayment(paymentId);
            const receipt = await tx.wait();
            expect(receipt.gasUsed).to.be.below(150000); // Reasonable gas limit
        });
    });
});