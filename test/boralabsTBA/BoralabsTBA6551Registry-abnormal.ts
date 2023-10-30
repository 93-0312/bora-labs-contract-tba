import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
  BoralabsTBA721,
  BoralabsTBA6551Account,
  BoralabsTBA6551Registry,
} from "../typechain-types";
import {
  deployBora721,
  deployBora6551Account,
  deployBora6551Registry,
} from "../util/fixture";
import mlog from "../util/mlog";
import { BigNumberish, Interface } from "ethers";

describe("BoralabsTBA6551Registry: Abnormal test", function () {
  mlog.injectLogger(this);

  let bora721: BoralabsTBA721;
  let bora6551Account: BoralabsTBA6551Account;
  let bora6551Registry: BoralabsTBA6551Registry;

  let tbaAddress: string;
  let tba: BoralabsTBA6551Account;

  let User1: HardhatEthersSigner;

  let data: string;

  beforeEach(async function () {
    // deploy bora721
    ({ bora721 } = await loadFixture(deployBora721));

    // deploy bora 6551 account
    ({ bora6551Account } = await loadFixture(deployBora6551Account));

    // deploy bora 6551 registry
    ({ bora6551Registry } = await loadFixture(deployBora6551Registry));

    [User1] = await ethers.getSigners();

    //Mint token for User 1
    await bora721.tbaMint(User1.address);
  });

  describe("Create Account", async function () {
    it("Should create account successfully when implementation is zero address", async function () {
      // Step 1: Input implementation with zero address.
      // Step 2: Verify the transaction is successfully
      this.mlog.log(
        "[Bora6551Registry]",
        "to create an account with implementation is zero address"
      );
      expect(
        await bora6551Registry
          .connect(User1)
          .createAccount(
            ethers.ZeroAddress,
            network.config.chainId as BigNumberish,
            bora721.getAddress(),
            10000001,
            0,
            "0x"
          )
      ).to.be.ok;

      // get tba account
      tbaAddress = await bora6551Registry.account(
        ethers.ZeroAddress,
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000001,
        0
      );

      // Step 3: Verify the Accounts Of function return the list containing one element is the account address created
      const accounts = await bora6551Registry.accountsOf(
        bora721.target,
        10000001
      );
      expect(accounts[0]).to.be.equal(tbaAddress);

      this.mlog.after("[TBA Account]", "address:", tbaAddress);
    });

    it("Should create account successfully when chainId is zero", async function () {
      // Step 1: Input chainId with zero value
      // Step 2: Verify the transaction is successfully
      this.mlog.log(
        "[Bora6551Registry]",
        "create an account with chain is zero"
      );
      expect(
        await bora6551Registry
          .connect(User1)
          .createAccount(
            bora6551Account.getAddress(),
            0,
            bora721.getAddress(),
            10000001,
            0,
            "0x"
          )
      ).to.be.ok;

      // get tba account
      tbaAddress = await bora6551Registry.account(
        bora6551Account.getAddress(),
        0,
        bora721.getAddress(),
        10000001,
        0
      );

      tba = await ethers.getContractAt("BoralabsTBA6551Account", tbaAddress);

      // Step 3: Call the owner function successfully to make sure the account has been created successfully
      this.mlog.log(
        "[TBA Account]",
        "call the owner function successfully to make sure the account has been created successfully"
      );
      expect(await tba.owner()).to.be.ok;

      // Step 4: Verify the Accounts Of function return the list containing one element is the account address created
      const accounts = await bora6551Registry.accountsOf(
        bora721.target,
        10000001
      );
      expect(accounts[0]).to.be.equal(tbaAddress);

      this.mlog.after("[TBA Account]", "address:", tbaAddress);
    });

    it("Should create account successfully when tokenContract is zero address", async function () {
      // Step 1: Input tokenContract with zero address
      // Step 2: Verify the transaction is successfully
      this.mlog.log(
        "[Bora6551Registry]",
        "create an account with tokenContract is zero address"
      );
      expect(
        await bora6551Registry
          .connect(User1)
          .createAccount(
            bora6551Account.getAddress(),
            network.config.chainId as BigNumberish,
            ethers.ZeroAddress,
            10000001,
            0,
            "0x"
          )
      ).to.be.ok;

      // get tba account
      tbaAddress = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        ethers.ZeroAddress,
        10000001,
        0
      );

      // Step 3: Verify the Accounts Of function return the list containing one element is the account address created
      const accounts = await bora6551Registry.accountsOf(
        ethers.ZeroAddress,
        10000001
      );
      expect(accounts[0]).to.be.equal(tbaAddress);

      this.mlog.after("[TBA Account]", "address:", tbaAddress);
    });

    it("Should create account successfully when tokenId is zero", async function () {
      // Step 1: Input tokenId with zero value
      // Step 2: Verify the transaction is successfully
      this.mlog.log(
        "[Bora6551Registry]",
        "create an account with tokenId is zero"
      );
      expect(
        await bora6551Registry
          .connect(User1)
          .createAccount(
            bora6551Account.getAddress(),
            network.config.chainId as BigNumberish,
            bora721.getAddress(),
            0,
            0,
            "0x"
          )
      ).to.be.ok;

      // get tba account
      tbaAddress = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        0,
        0
      );

      // Step 3: Verify the Accounts Of function return the list containing one element is the account address created
      const accounts = await bora6551Registry.accountsOf(bora721.target, 0);
      expect(accounts[0]).to.be.equal(tbaAddress);

      this.mlog.after("[TBA Account]", "address:", tbaAddress);
    });

    it("Should create account successfully when initData is empty", async function () {
      // Step 1: Input initData with empty value
      // Step 2: Verify the transaction is successfully
      this.mlog.log(
        "[Bora6551Registry]",
        "create an account with initData is empty value"
      );
      expect(
        await bora6551Registry
          .connect(User1)
          .createAccount(
            bora6551Account.getAddress(),
            network.config.chainId as BigNumberish,
            bora721.getAddress(),
            10000001,
            0,
            "0x"
          )
      ).to.be.ok;

      // get tba account
      tbaAddress = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000001,
        0
      );

      tba = await ethers.getContractAt("BoralabsTBA6551Account", tbaAddress);

      // Step 3: Call the owner function successfully to make sure the account has been created successfully
      this.mlog.log(
        "[TBA Account]",
        "call the owner function successfully to make sure the account has been created successfully"
      );
      expect(await tba.owner()).to.be.ok;

      // Step 4: Verify the Accounts Of function return the list containing one element is the account address created
      const accounts = await bora6551Registry.accountsOf(
        bora721.target,
        10000001
      );
      expect(accounts[0]).to.be.equal(tbaAddress);

      this.mlog.after("[TBA Account]", "address:", tbaAddress);
    });

    it("Should create account failed when initData is invalid function name", async function () {
      // Step 1: Input initData with invalid function name
      // Step 2: Verify the account not created and the transaction will be reverted
      this.mlog.log(
        "[Bora6551Registry]",
        "create an account with initData is invalid function name"
      );
      const iface = new Interface(["function invalidFunction()"]);
      data = iface.encodeFunctionData("invalidFunction", []);
      await expect(
        bora6551Registry
          .connect(User1)
          .createAccount(
            bora6551Account.getAddress(),
            network.config.chainId as BigNumberish,
            bora721.getAddress(),
            10000001,
            0,
            data
          )
      ).to.be.reverted;
    });

    it("Should create account failed when initData is invalid function parameter type", async function () {
      // Step 1: Input initData with invalid function parameter type
      // Step 2: Verify the account not created and the transaction will be reverted
      this.mlog.log(
        "[Bora6551Registry]",
        "create an account with initData is invalid function parameter type"
      );
      const iface = new Interface([
        "function isValidSigner(address signer, uint256 invalidParameterType)",
      ]);
      data = iface.encodeFunctionData("isValidSigner", [User1.address, 1]);
      await expect(
        bora6551Registry
          .connect(User1)
          .createAccount(
            bora6551Account.getAddress(),
            network.config.chainId as BigNumberish,
            bora721.getAddress(),
            10000001,
            0,
            data
          )
      ).to.be.reverted;
    });

    it("Should create account failed when initData is invalid number of function parameter", async function () {
      // Step 1: Input initData with the number of function parameters is greater than the actual number of function parameters
      // Step 2: Verify the account not created and the transaction will be reverted
      this.mlog.log(
        "[Bora6551Registry]",
        "create an account with initData is the number of function parameters is greater than the actual number of function parameters"
      );
      const iface = new Interface([
        "function isValidSigner(address signer, uint256 id, address redundantParameter)",
      ]);
      data = iface.encodeFunctionData("isValidSigner", [
        User1.address,
        1,
        bora721.target,
      ]);
      await expect(
        bora6551Registry
          .connect(User1)
          .createAccount(
            bora6551Account.getAddress(),
            network.config.chainId as BigNumberish,
            bora721.getAddress(),
            10000001,
            0,
            data
          )
      ).to.be.reverted;
    });

    it("Should create account failed when when initData is less than number of function parameter", async function () {
      // Step 1: Input initData with the number of function parameters is less than the actual number of function parameters
      // Step 2: Verify the account not created and the transaction will be reverted
      this.mlog.log(
        "[Bora6551Registry]",
        "create an account with initData is the number of function parameters less than the actual number of function parameters"
      );
      const iface = new Interface(["function isValidSigner(address signer)"]);
      data = iface.encodeFunctionData("isValidSigner", [User1.address]);
      await expect(
        bora6551Registry
          .connect(User1)
          .createAccount(
            bora6551Account.getAddress(),
            network.config.chainId as BigNumberish,
            bora721.getAddress(),
            10000001,
            0,
            data
          )
      ).to.be.reverted;
    });
  });

  describe("Account", async function () {
    it("Should get account address successfully when implementation is zero address", async function () {
      // Step 1: Input implementation with zero address
      this.mlog.log(
        "[Bora6551Registry]",
        "account() to compute an account address with implementation is zero address"
      );
      tbaAddress = await bora6551Registry.account(
        ethers.ZeroAddress,
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000001,
        0
      );

      // Step 2: Verify the transaction is successfully
      // Step 3: Verify the account function return the non-zero address
      expect(tbaAddress).is.not.empty;
      expect(tbaAddress).is.not.equal(ethers.ZeroAddress);

      this.mlog.after("[TBA Account]", "address:", tbaAddress);
    });

    it("Should get account address successfully when chainId is zero", async function () {
      // Step 1: Call account() to compute an account address with chainId is zero value
      this.mlog.log(
        "[Bora6551Registry]",
        "call account() to compute an account address with chainId is zero value"
      );
      tbaAddress = await bora6551Registry.account(
        bora6551Account.getAddress(),
        0,
        bora721.getAddress(),
        10000001,
        0
      );

      // Step 2: Verify the transaction is successfully
      // Step 3: Verify the account function return the non-zero address
      expect(tbaAddress).is.not.empty;
      expect(tbaAddress).is.not.equal(ethers.ZeroAddress);

      this.mlog.after("[TBA Account]", "address:", tbaAddress);
    });

    it("Should get account address successfully when tokenContract is zero address", async function () {
      // Step 1: Call account() to compute an account address with tokenContract is zero address
      this.mlog.log(
        "[Bora6551Registry]",
        "call account() to compute an account address with tokenContract is zero address"
      );
      tbaAddress = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        ethers.ZeroAddress,
        10000001,
        0
      );

      // Step 2: Verify the transaction is successfully
      // Step 3: Verify the account function return the non-zero address
      expect(tbaAddress).is.not.empty;
      expect(tbaAddress).is.not.equal(ethers.ZeroAddress);

      this.mlog.after("[TBA Account]", "address:", tbaAddress);
    });

    it("Should get account address successfully when tokenId is zero", async function () {
      // Step 1: Call account() to compute an account address with tokenId is zero
      this.mlog.log(
        "[Bora6551Registry]",
        "call account() to compute an account address with tokenId is zero"
      );
      tbaAddress = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        0,
        0
      );

      // Step 2: Verify the transaction is successfully
      // Step 3: Verify the account function return the non-zero address
      expect(tbaAddress).is.not.empty;
      expect(tbaAddress).is.not.equal(ethers.ZeroAddress);

      this.mlog.after("[TBA Account]", "address:", tbaAddress);
    });
  });

  describe("Accounts Of", async function () {
    it("Should get a list containing an account address successfully when tokenContract is zero address", async function () {
      this.mlog.before(
        "[TBA Account]",
        "of token id 10000001",
        await bora6551Registry.accountsOf(bora721.target, 10000001)
      );

      // Step 1: Create an account with tokenContract is zero address
      this.mlog.log(
        "[Bora6551Registry]",
        "to create an account with tokenContract is zero address"
      );
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          ethers.ZeroAddress,
          10000001,
          0,
          "0x"
        );

      // get tba account
      tbaAddress = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        ethers.ZeroAddress,
        10000001,
        0
      );

      tba = await ethers.getContractAt("BoralabsTBA6551Account", tbaAddress);

      // Step 2: Input into accountsOf function with tokenContract is zero address.
      const addresses = await bora6551Registry.accountsOf(
        ethers.ZeroAddress,
        10000001
      );

      // Step 3: Verify the transaction is successful
      expect(await bora6551Registry.accountsOf(ethers.ZeroAddress, 10000001)).to
        .be.ok;

      // Step 4: Verify the Accounts Of function return the list containing one element is the account address created at step 1
      expect(addresses[0]).to.be.equal(tbaAddress);

      this.mlog.after("[TBA Account]", "address:", tbaAddress);
      this.mlog.after("[TBA Account]", "of token id 10000001", addresses);
    });

    it("Should get a list containing an account address successfully when tokenId is zero", async function () {
      this.mlog.before(
        "[TBA Account]",
        "of token id 0",
        await bora6551Registry.accountsOf(bora721.target, 0)
      );

      // Step 1: Create an account with tokenId is zero value
      this.mlog.log(
        "[Bora6551Registry]",
        "create an account with tokenId is zero value"
      );
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          0,
          0,
          "0x"
        );

      // get tba account
      tbaAddress = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        0,
        0
      );

      tba = await ethers.getContractAt("BoralabsTBA6551Account", tbaAddress);

      // Step 2: Input into accountsOf function with tokenId is zero value.
      const addresses = await bora6551Registry.accountsOf(bora721.target, 0);

      // Step 3: Verify the transaction is successful
      // Step 4: Verify the Accounts Of function return the list containing one element is the account address created at step 1
      expect(addresses[0]).to.be.equal(tbaAddress);

      this.mlog.after("[TBA Account]", "address:", tbaAddress);
      this.mlog.after("[TBA Account]", "of token id 0", addresses);
    });
  });
});
