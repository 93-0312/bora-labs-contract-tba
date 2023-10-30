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

describe("BoralabsTBA6551Registry: Unit test", function () {
  mlog.injectLogger(this);

  let bora721: BoralabsTBA721;
  let bora6551Account: BoralabsTBA6551Account;
  let bora6551Registry: BoralabsTBA6551Registry;

  let tbaAddress: string;
  let tba: BoralabsTBA6551Account;
  let tbaAddress2: string;

  let User1: HardhatEthersSigner;
  let User2: HardhatEthersSigner;
  let User3: HardhatEthersSigner;

  let data: string;

  const ifaceAccount = new Interface(["function token()"]);

  beforeEach(async function () {
    // deploy bora721
    ({ bora721 } = await loadFixture(deployBora721));

    // deploy bora 6551 account
    ({ bora6551Account } = await loadFixture(deployBora6551Account));

    // deploy bora 6551 registry
    ({ bora6551Registry } = await loadFixture(deployBora6551Registry));

    [User1, User2, User3] = await ethers.getSigners();
  });

  describe("Create Account", async function () {
    it("Should create account successfully", async function () {
      // Step 1: User 1 uses tbaMint() to mint tokens ERC721 ids (10000001, 20000001, 30000001) for it self
      this.mlog.log(
        "[User 1]",
        "uses tbaMint() to mint tokens ERC721 ids (10000001, 20000001, 30000001) for itself"
      );
      await bora721.connect(User1).tbaMint(User1.address);

      // Step 2: Call createAccount() to create an account with token id is 10000001.
      this.mlog.log(
        "[User 1]",
        "call createAccount() to create an account with token id is 10000001"
      );
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          10000001,
          0,
          "0x"
        );

      // get tba account
      tbaAddress = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000001,
        0
      );

      tba = await ethers.getContractAt("BoralabsTBA6551Account", tbaAddress);

      // Step 3: Verify the account has been created via owner()
      this.mlog.log(
        "[TBA Account]",
        "using owner() function to check owner of TBA account is User 1"
      );
      expect(await tba.owner()).to.be.equal(User1.address);

      this.mlog.after("[TBA Account]", "address:", tbaAddress);
    });

    it("Should not create new TBA account when input the same parameters", async function () {
      // Step 1: User 1 uses tbaMint() to mint tokens ERC721 ids (10000001, 20000001, 30000001) for itself
      this.mlog.log(
        "[User 1]",
        "uses tbaMint() to mint tokens ERC721 ids (10000001, 20000001, 30000001) for itself"
      );
      await bora721.connect(User1).tbaMint(User1.address);

      // Step 2: Call createAccount() to create an account with token id is 10000001.
      this.mlog.log(
        "Using [Bora6551Registry]",
        "call createAccount() to create an account with token id is 10000001"
      );
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          10000001,
          0,
          "0x"
        );

      // get tba account
      tbaAddress = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000001,
        0
      );

      // Step 3: Keep calling createAccount() to create an account with the same parameters
      this.mlog.log(
        "Using [Bora6551Registry]",
        "calling createAccount() again to create an account with the same parameters"
      );
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          10000001,
          0,
          "0x"
        );

      // get tba account
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000001,
        0
      );

      // Step 4: Verify the address of step 2 and step 3 will be the same.
      expect(tbaAddress2).to.be.equal(tbaAddress);

      this.mlog.after("[TBA Account 1]", "address:", tbaAddress);
      this.mlog.after("[TBA Account 2]", "address:", tbaAddress2);
    });

    it("Should create account successfully with valid init data", async function () {
      // Step 1: User 1 uses tbaMint() to mint tokens ERC721 ids (10000001, 20000001, 30000001) for itself
      this.mlog.log(
        "[User 1]",
        "uses tbaMint() to mint tokens ERC721 ids (10000001, 20000001, 30000001) for itself"
      );
      await bora721.connect(User1).tbaMint(User1.address);

      // Step 2: Call createAccount() to create an account with token id is 10000001 and init data for call token() function of BoralabsTBA6551Account
      data = ifaceAccount.encodeFunctionData("token", []);
      this.mlog.log(
        "Using [Bora6551Registry]",
        "to create an account with token id is 10000001 and init data for call token() function of BoralabsTBA6551Account"
      );
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          10000001,
          0,
          data
        );

      // get tba account
      tbaAddress = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000001,
        0
      );

      tba = await ethers.getContractAt("BoralabsTBA6551Account", tbaAddress);

      // Step 3: Verify the account has been created via owner()
      this.mlog.log(
        "[TBA Account]",
        "using owner() function to check owner of TBA account is User 1"
      );
      expect(await tba.owner()).to.be.equal(User1.address);

      this.mlog.after("[TBA Account]", "address:", tbaAddress);
    });
  });

  describe("Account", async function () {
    it("Should get account address successfully", async function () {
      // Step 1: User 1 uses tbaMint() to mint tokens ERC721 ids (10000001, 20000001, 30000001) for itself
      this.mlog.log(
        "[User 1]",
        "uses tbaMint() to mint tokens ERC721 ids (10000001, 20000001, 30000001) for itself"
      );
      await bora721.connect(User1).tbaMint(User1.address);

      // Step 2: Call account() to compute an account address with token id is 10000001.
      this.mlog.log(
        "[Bora6551Registry]",
        "call account() to compute an account address with token id is 10000001"
      );
      // get tba account
      tbaAddress = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000001,
        0
      );

      // Step 3: Verify the result is not an empty string
      expect(tbaAddress).is.not.empty;

      this.mlog.after("[TBA Account]", "compute address:", tbaAddress);
    });
  });

  describe("Accounts Of", async function () {
    it("Should get a list containing an account address successfully", async function () {
      // Step 1: User 1 uses tbaMint() to mint tokens ERC721 ids (10000001, 20000001, 30000001) for itself
      this.mlog.log(
        "[User 1]",
        "uses tbaMint() to mint tokens ERC721 ids (10000001, 20000001, 30000001) for itself"
      );
      await bora721.connect(User1).tbaMint(User1.address);

      // Step 2: Call createAccount() to create an account with token id is 10000001.
      this.mlog.log(
        "[Bora6551Registry]",
        "to create an account with token id is 10000001"
      );
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          10000001,
          0,
          "0x"
        );

      // get tba account
      tbaAddress = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000001,
        0
      );

      tba = await ethers.getContractAt("BoralabsTBA6551Account", tbaAddress);

      // Step 3: Call accountOf() to get account address list of token id 10000001.
      const addresses = await bora6551Registry.accountsOf(
        bora721.target,
        10000001
      );

      // Step 4: Verify the result is the account address which was created at step 2
      expect(addresses[0]).to.be.equal(tbaAddress);

      this.mlog.after("[TBA Account]", "address:", tbaAddress);
      this.mlog.after("[10000001]", "tba accounts", addresses);
    });
  });
});
