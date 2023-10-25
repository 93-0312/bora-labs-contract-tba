import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
  BoralabsTBA20,
  BoralabsTBA721,
  BoralabsTBA1155,
  BoralabsTBA6551Account,
  BoralabsTBA6551Registry,
} from "../typechain-types";
import {
  deployBora20,
  deployBora721,
  deployBora1155,
  deployBora6551Account,
  deployBora6551Registry,
} from "./fixture";
import mlog from "./mlog";
import { BigNumberish, Interface } from "ethers";

describe("BoralabsTBA6551: Integration test", function () {
  mlog.injectLogger(this);

  let bora20: BoralabsTBA20;
  let bora721: BoralabsTBA721;
  let bora1155: BoralabsTBA1155;
  let bora6551Account: BoralabsTBA6551Account;
  let bora6551Registry: BoralabsTBA6551Registry;

  let tbaAddress: string;
  let tba: BoralabsTBA6551Account;
  let tbaAddress2: string;

  let owner20: HardhatEthersSigner;
  let owner721: HardhatEthersSigner;
  let owner1155: HardhatEthersSigner;
  let ownerAccount: HardhatEthersSigner;
  let ownerRegister: HardhatEthersSigner;

  let User1: HardhatEthersSigner;
  let User2: HardhatEthersSigner;
  let User3: HardhatEthersSigner;

  let data: string;

  const iface20 = new Interface([
    "function transfer(address to, uint256 amount)",
    "function burn(uint256 amount)",
    "function approve(address spender, uint256 amount)",
    "function invalidFunction()",
  ]);

  const iface721 = new Interface([
    "function transferFrom(address from, address to, uint256 tokenId)",
    "function burn(uint256 tokenId)",
  ]);

  const iface1155 = new Interface([
    "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data)",
    "function setApprovalForAll(address operator, bool approved)",
  ]);

  beforeEach(async function () {
    // deploy bora20
    ({ bora20, owner20 } = await loadFixture(deployBora20));

    // deploy bora721
    ({ bora721, owner721 } = await loadFixture(deployBora721));

    // deploy bora1155
    ({ bora1155, owner1155 } = await loadFixture(deployBora1155));

    // deploy bora 6551 account
    ({ bora6551Account, ownerAccount } = await loadFixture(
      deployBora6551Account
    ));

    // deploy bora 6551 registry
    ({ bora6551Registry, ownerRegister } = await loadFixture(
      deployBora6551Registry
    ));

    [User1, User2, User3] = await ethers.getSigners();

    // mint erc721
    await bora721.tbaMint(User1.address);

    // create tba account
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
  });

  describe("ERC20 Receive Ability", async function () {
    it("Should successfully when mint multiple time ERC20", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 1: Owner of ERC20 mint 10 token for TBA account
      this.mlog.log("[TBA Account]", "mint 10 tokens erc20");
      await bora20.mint(tbaAddress, 10);

      // Step 2: Owner of ERC20 mint 20 token for TBA account
      this.mlog.log("[TBA Account]", "mint 20 tokens erc20");
      await bora20.mint(tbaAddress, 20);

      // Step 3: Owner of ERC20 mint 30 token for TBA account
      this.mlog.log("[TBA Account]", "mint 30 tokens erc20");
      await bora20.mint(tbaAddress, 30);

      // Step 4: Verify token balance of TBA account is 60
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(60);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
    });

    it("Should successfully when transfer multiple time ERC20 from TBA’s owner", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.before(
        "[TBA’s owner]",
        "balance:",
        await bora20.balanceOf(User1)
      );

      // Step 1: Owner of ERC20 mint 60 token for TBA’s owner
      this.mlog.log("[TBA’s owner]", "mint 60 tokens erc20");
      await bora20.mint(User1.address, 60);

      // Step 2: TBA' owner transfer 10 token for TBA account
      this.mlog.log("[TBA’s owner]", "transfer 10 tokens erc20 to TBA account");
      await bora20.connect(User1).transfer(tbaAddress, 10);

      // Step 3: TBA' owner transfer 20 token for TBA account
      this.mlog.log("[TBA’s owner]", "transfer 20 tokens erc20 to TBA account");
      await bora20.connect(User1).transfer(tbaAddress, 20);

      // Step 4: TBA' owner transfer 30 token for TBA account
      this.mlog.log("[TBA’s owner]", "transfer 30 tokens erc20 to TBA account");
      await bora20.connect(User1).transfer(tbaAddress, 30);

      // Step 5: Verify token balance of TBA account is 60
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(60);

      // Step 6: Verify token balance of TBA’s owner is 0
      await expect(await bora20.balanceOf(User1.address)).to.equal(0);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.after(
        "[TBA’s owner]",
        "balance:",
        await bora20.balanceOf(User1.address)
      );
    });

    it("Should successfully when transfer multiple time ERC20 from another account", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.before("[User2]", "balance:", await bora20.balanceOf(User2));

      // Step 1: Owner of ERC20 mint 60 token for User2
      this.mlog.log("[User2]", "mint 60 tokens erc20");
      await bora20.mint(User2.address, 60);

      // Step 2: User2 transfer 10 token for TBA account
      this.mlog.log("[User2]", "transfer 10 tokens erc20 to TBA account");
      await bora20.connect(User2).transfer(tbaAddress, 10);

      // Step 3: User2 transfer 20 token for TBA account
      this.mlog.log("[User2]", "transfer 20 tokens erc20 to TBA account");
      await bora20.connect(User2).transfer(tbaAddress, 20);

      // Step 4: User2 transfer 30 token for TBA account
      this.mlog.log("[User2]", "transfer 30 tokens erc20 to TBA account");
      await bora20.connect(User2).transfer(tbaAddress, 30);

      // Step 5: Verify token balance of TBA account is 60
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(60);

      // Step 6: Verify token balance of TBA’s owner is 0
      await expect(await bora20.balanceOf(User2.address)).to.equal(0);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.after(
        "[User2]",
        "balance:",
        await bora20.balanceOf(User2.address)
      );
    });
  });

  describe("ERC20 Send Ability", async function () {
    it("Should successfully when transfer multiple time ERC20 to TBA’s owner", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.before(
        "[TBA’s owner]",
        "balance:",
        await bora20.balanceOf(User1.address)
      );

      // Step 1: Owner of ERC20 mint 60 token for TBA account
      this.mlog.log("[TBA Account]", "mint 60 tokens erc20");
      await bora20.mint(tbaAddress, 60);

      // Step 2: TBA call transfer20() to transfer 10 token to TBA’s owner
      this.mlog.log(
        "[TBA Account]",
        "call transfer20() to transfer 10 token to TBA’s owner"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), User1.address, 10);

      // Step 3: TBA call transfer20() to transfer 20 token to TBA’s owner
      this.mlog.log(
        "[TBA Account]",
        "call transfer20() to transfer 20 token to TBA’s owner"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), User1.address, 20);

      // Step 4: TBA call transfer20() to transfer 30 token to TBA’s owner
      this.mlog.log(
        "[TBA Account]",
        "call transfer20() to transfer 30 token to TBA’s owner"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), User1.address, 30);

      // Step 5: Verify token balance of TBA account is 0
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      // Step 6: Verify token balance of TBA’s owner is 60
      await expect(await bora20.balanceOf(User1.address)).to.equal(60);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.after(
        "[TBA’s owner]",
        "balance:",
        await bora20.balanceOf(User1.address)
      );
    });

    it("Should successfully when transfer multiple time ERC20 to another account", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.before(
        "[User2]",
        "balance:",
        await bora20.balanceOf(User2.address)
      );

      // Step 1: Owner of ERC20 mint 60 token for User2
      this.mlog.log("[TBA Account]", "mint 60 tokens erc20");
      await bora20.mint(tbaAddress, 60);

      // Step 2: TBA call transfer20() to transfer 10 token to User2
      this.mlog.log(
        "[TBA Account]",
        "call transfer20() to transfer 10 token to User2"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), User2.address, 10);

      // Step 3: TBA call transfer20() to transfer 20 token to User2
      this.mlog.log(
        "[TBA Account]",
        "call transfer20() to transfer 20 token to User2"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), User2.address, 20);

      // Step 4: TBA call transfer20() to transfer 30 token to User2
      this.mlog.log(
        "[TBA Account]",
        "call transfer20() to transfer 30 token to User2"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), User2.address, 30);

      // Step 5: Verify token balance of TBA account is 0
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      // Step 6: Verify token balance of User2 is 60
      await expect(await bora20.balanceOf(User2.address)).to.equal(60);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.after(
        "[User2]",
        "balance:",
        await bora20.balanceOf(User2.address)
      );
    });

    it("Should successfully when transfer multiple time ERC20 to another TBA with same TBA’s owner", async function () {
      // Step 1: User 1 creates a TBA account 1 with tokenId 10000001

      // Step 2: User 1 creates a TBA account 2 with tokenId 20000001
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          20000001,
          0,
          "0x"
        );

      // get tba account
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        20000001,
        0
      );

      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.before(
        "[TBA Account 2]",
        "balance:",
        await bora20.balanceOf(tbaAddress2)
      );

      // Step 3: Owner of ERC20 mint 60 token for TBA account 1
      this.mlog.log("[TBA Account 1]", "mint 60 tokens erc20");
      await bora20.mint(tbaAddress, 60);

      // Step 4: Account 1 calls transfer20() to transfer 10 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call transfer20() to transfer 10 token to Account 2"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), tbaAddress2, 10);

      // Step 5: Account 1 calls transfer20() to transfer 20 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call transfer20() to transfer 20 token to Account 2"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), tbaAddress2, 20);

      // Step 6: Account 1 calls transfer20() to transfer 30 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call transfer20() to transfer 30 token to Account 2"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), tbaAddress2, 30);

      // Step 7: Verify token balance of TBA account 1 is 0
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      // Step 8: Verify token balance of TBA account 2 is 60
      await expect(await bora20.balanceOf(tbaAddress2)).to.equal(60);

      this.mlog.after(
        "[TBA Account 1]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.after(
        "[TBA Account 2]",
        "balance:",
        await bora20.balanceOf(tbaAddress2)
      );
    });

    it("Should successfully when transfer multiple time ERC20 to another TBA with different TBA’s owner", async function () {
      // Step 1: User 1 creates a TBA account 1 with tokenId 10000001

      // Step 2: User2 creates a TBA account 2 with tokenId 10000002
      await bora721.tbaMint(User2.address);
      await bora6551Registry
        .connect(User2)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          10000002,
          0,
          "0x"
        );

      // get tba account
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000002,
        0
      );

      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.before(
        "[TBA Account 2]",
        "balance:",
        await bora20.balanceOf(tbaAddress2)
      );

      // Step 3: Owner of ERC20 mint 60 token for TBA account 1
      this.mlog.log("[TBA Account 1]", "mint 60 tokens erc20");
      await bora20.mint(tbaAddress, 60);

      // Step 4: Account 1 calls transfer20() to transfer 10 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call transfer20() to transfer 10 token to Account 2"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), tbaAddress2, 10);

      // Step 5: Account 1 calls transfer20() to transfer 20 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call transfer20() to transfer 20 token to Account 2"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), tbaAddress2, 20);

      // Step 6: Account 1 calls transfer20() to transfer 30 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call transfer20() to transfer 30 token to Account 2"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), tbaAddress2, 30);

      // Step 7: Verify token balance of TBA account 1 is 0
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      // Step 8: Verify token balance of TBA account 2 is 60
      await expect(await bora20.balanceOf(tbaAddress2)).to.equal(60);

      this.mlog.after(
        "[TBA Account 1]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.after(
        "[TBA Account 2]",
        "balance:",
        await bora20.balanceOf(tbaAddress2)
      );
    });

    it("Should successfully when transfers multiple time ERC20 to another account via execute()", async function () {
      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.before(
        "[User2]",
        "balance:",
        await bora20.balanceOf(User2.address)
      );

      // Step 1: Owner of ERC20 mint 60 token for TBA account 1
      this.mlog.log("[TBA Account 1]", "mint 60 tokens erc20");
      await bora20.mint(tbaAddress, 60);

      // Step 2: Account 1 calls execute() to transfer 10 tokens to User2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 10 token to User2"
      );
      data = iface20.encodeFunctionData("transfer", [User2.address, 10]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 3: Account 1 calls execute() to transfer 20 tokens to User2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 20 token to User2"
      );
      data = iface20.encodeFunctionData("transfer", [User2.address, 20]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 4: Account 1 calls execute() to transfer 30 tokens to User2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 30 token to User2"
      );
      data = iface20.encodeFunctionData("transfer", [User2.address, 30]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 5: Verify token balance of TBA account 1 is 0
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      // Step 6: Verify token balance of User2 is 60
      await expect(await bora20.balanceOf(User2.address)).to.equal(60);

      this.mlog.after(
        "[TBA Account 1]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.after(
        "[User2]",
        "balance:",
        await bora20.balanceOf(User2.address)
      );
    });

    it("Should successfully when transfers multiple time ERC20 to TBA’s owner via execute()", async function () {
      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.before(
        "[TBA’s owner]",
        "balance:",
        await bora20.balanceOf(User1.address)
      );

      // Step 1: Owner of ERC20 mint 60 token for TBA account 1
      this.mlog.log("[TBA Account 1]", "mint 60 tokens erc20");
      await bora20.mint(tbaAddress, 60);

      // Step 2: Account 1 calls execute() to transfer 10 tokens to TBA’s owner
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 10 token to TBA’s owner"
      );
      data = iface20.encodeFunctionData("transfer", [User1.address, 10]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 3: Account 1 calls execute() to transfer 20 tokens to TBA’s owner
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 20 token to TBA’s owner"
      );
      data = iface20.encodeFunctionData("transfer", [User1.address, 20]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 4: Account 1 calls execute() to transfer 30 tokens to TBA’s owner
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 30 token to TBA’s owner"
      );
      data = iface20.encodeFunctionData("transfer", [User1.address, 30]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 5: Verify token balance of TBA account 1 is 0
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      // Step 6: Verify token balance of User2 is 60
      await expect(await bora20.balanceOf(User1.address)).to.equal(60);

      this.mlog.after(
        "[TBA Account 1]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.after(
        "[TBA’s owner]",
        "balance:",
        await bora20.balanceOf(User1.address)
      );
    });

    it("Should successfully when transfers multiple time ERC20 to another TBA with same TBA’s owner via execute()", async function () {
      // Step 1: User 1 creates a TBA account 2 with tokenId 20000001.
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          20000001,
          0,
          "0x"
        );

      // get tba account
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        20000001,
        0
      );

      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.before(
        "[TBA Account 2]",
        "balance:",
        await bora20.balanceOf(tbaAddress2)
      );

      // Step 2: Owner of ERC20 mint 60 token for TBA account 1
      this.mlog.log("[TBA Account 1]", "mint 60 tokens erc20");
      await bora20.mint(tbaAddress, 60);

      // Step 3: Account 1 calls execute() to transfer 10 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 10 tokens to Account 2"
      );
      data = iface20.encodeFunctionData("transfer", [tbaAddress2, 10]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 4: Account 1 calls execute() to transfer 20 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 20 tokens to Account 2"
      );
      data = iface20.encodeFunctionData("transfer", [tbaAddress2, 20]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 5: Account 1 calls execute() to transfer 30 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 30 tokens to Account 2"
      );
      data = iface20.encodeFunctionData("transfer", [tbaAddress2, 30]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 6: Verify token balance of TBA account 1 is 0
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      // Step 7: Verify token balance of TBA account 2 is 60
      await expect(await bora20.balanceOf(tbaAddress2)).to.equal(60);

      this.mlog.after(
        "[TBA Account 1]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.after(
        "[TBA Account 2]",
        "balance:",
        await bora20.balanceOf(tbaAddress2)
      );
    });

    it("Should successfully when transfers multiple time ERC20 to another TBA with different TBA’s owner via execute()", async function () {
      // Step 1: User2 creates a TBA account 2 with tokenId 10000002
      await bora721.tbaMint(User2.address);
      await bora6551Registry
        .connect(User2)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          10000002,
          0,
          "0x"
        );

      // get tba account
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000002,
        0
      );

      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.before(
        "[TBA Account 2]",
        "balance:",
        await bora20.balanceOf(tbaAddress2)
      );

      // Step 2: Owner of ERC20 mint 60 token for TBA account 1
      this.mlog.log("[TBA Account 1]", "mint 60 tokens erc20");
      await bora20.mint(tbaAddress, 60);

      // Step 3: Account 1 calls execute() to transfer 10 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 10 tokens to Account 2"
      );
      data = iface20.encodeFunctionData("transfer", [tbaAddress2, 10]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 4: Account 1 calls execute() to transfer 20 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 20 tokens to Account 2"
      );
      data = iface20.encodeFunctionData("transfer", [tbaAddress2, 20]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 5: Account 1 calls execute() to transfer 30 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 30 tokens to Account 2"
      );
      data = iface20.encodeFunctionData("transfer", [tbaAddress2, 30]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 6: Verify token balance of TBA account 1 is 0
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      // Step 7: Verify token balance of TBA account 2 is 60
      await expect(await bora20.balanceOf(tbaAddress2)).to.equal(60);

      this.mlog.after(
        "[TBA Account 1]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.after(
        "[TBA Account 2]",
        "balance:",
        await bora20.balanceOf(tbaAddress2)
      );
    });
  });

  describe("ERC20 Burn Ability", async function () {
    it("Should successfully when burn multiple time ERC20", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 1: Owner of ERC20 mint 60 token for TBA account
      this.mlog.log("[TBA Account]", "mint 60 tokens erc20");
      await bora20.mint(tbaAddress, 60);

      // Step 2: TBA account approve for Owner of ERC20
      data = iface20.encodeFunctionData("approve", [owner20.address, 60]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 3: Owner of ERC20 calls burn() to burn 10 tokens
      this.mlog.log(
        "[TBA Account]",
        "Owner of ERC20 burn 10 tokens of TBA Account"
      );
      await bora20.burnFrom(tbaAddress, 10);

      // Step 4: Owner of ERC20 calls burn() to burn 20 tokens
      this.mlog.log(
        "[TBA Account]",
        "Owner of ERC20 burn 20 tokens of TBA Account"
      );
      await bora20.burnFrom(tbaAddress, 20);

      // Step 5: Owner of ERC20 calls burn() to burn 30 tokens
      this.mlog.log(
        "[TBA Account]",
        "Owner of ERC20 burn 30 tokens of TBA Account"
      );
      await bora20.burnFrom(tbaAddress, 30);

      // Step 6: Verify token balance of TBA account is 0
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
    });
  });

  describe("ERC721 Receive Ability", async function () {
    it("Should successfully when mint multiple time ERC721", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      // Step 1: Owner of ERC721 mint tokens (10000002, 20000002, 30000002) for TBA account
      this.mlog.log(
        "[TBA Account]",
        "mint tokens (10000002, 20000002, 30000002)"
      );
      await bora721.tbaMint(tbaAddress);

      // Step 2: Owner of ERC721 mint tokens (10000003, 20000003, 30000003) for TBA account
      this.mlog.log(
        "[TBA Account]",
        "mint tokens (10000002, 20000002, 30000002)"
      );
      await bora721.tbaMint(tbaAddress);

      // Step 3: Owner of ERC721 mint tokens (10000004, 20000004, 30000004) for TBA account
      this.mlog.log(
        "[TBA Account]",
        "mint tokens (10000004, 20000004, 30000004)"
      );
      await bora721.tbaMint(tbaAddress);

      // Step 4: Verify token balance of TBA account is 9
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(9);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );
    });

    it("Should successfully when transfer multiple time ERC721 from TBA’s owner", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.before(
        "[TBA’s owner]",
        "balance:",
        await bora721.balanceOf(User1.address)
      );

      // Step 1: Owner of ERC721 mint tokens (10000002, 20000002, 30000002) for TBA’s owner
      this.mlog.log(
        "[TBA’s owner]",
        "mint tokens (10000002, 20000002, 30000002)"
      );
      await bora721.tbaMint(User1.address);

      // Step 2: TBA’ owner transfer token id 10000002 to TBA account
      this.mlog.log(
        "[TBA’s owner]",
        "transfer token id 10000002 to TBA account"
      );
      await bora721
        .connect(User1)
        .transferFrom(User1.address, tbaAddress, 10000002);

      // Step 3: TBA’ owner transfer token id 20000002 to TBA account
      this.mlog.log(
        "[TBA’s owner]",
        "transfer token id 20000002 to TBA account"
      );
      await bora721
        .connect(User1)
        .transferFrom(User1.address, tbaAddress, 20000002);

      // Step 4: TBA’ owner transfer token id 30000002 to TBA account
      this.mlog.log(
        "[TBA’s owner]",
        "transfer token id 30000002 to TBA account"
      );
      await bora721
        .connect(User1)
        .transferFrom(User1.address, tbaAddress, 30000002);

      // Step 5: Verify token balance of TBA account is 3
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(3);

      // Step 6: Verify token balance of TBA’s owner decrease 3 tokens
      await expect(await bora721.balanceOf(User1.address)).to.equal(3);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.after(
        "[TBA’s owner]",
        "balance:",
        await bora721.balanceOf(User1.address)
      );
    });

    it("Should successfully when transfer multiple time ERC721 from another account", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.before(
        "[User2]",
        "balance:",
        await bora721.balanceOf(User2.address)
      );

      // Step 1: Owner of ERC721 mint tokens (10000002, 20000002, 30000002) for User2
      this.mlog.log("[User2]", "mint tokens (10000002, 20000002, 30000002)");
      await bora721.tbaMint(User2.address);

      // Step 2: User2 transfer token id 10000002 to TBA account
      this.mlog.log("[User2]", "transfer token id 10000002 to TBA account");
      await bora721
        .connect(User2)
        .transferFrom(User2.address, tbaAddress, 10000002);

      // Step 3: User2 transfer token id 20000002 to TBA account
      this.mlog.log("[User2]", "transfer token id 20000002 to TBA account");
      await bora721
        .connect(User2)
        .transferFrom(User2.address, tbaAddress, 20000002);

      // Step 4: User2 transfer token id 30000002 to TBA account
      this.mlog.log("[User2]", "transfer token id 30000002 to TBA account");
      await bora721
        .connect(User2)
        .transferFrom(User2.address, tbaAddress, 30000002);

      // Step 5: Verify token balance of TBA account is 3
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(3);

      // Step 6: Verify token balance of User2 is 0
      await expect(await bora721.balanceOf(User2.address)).to.equal(0);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.after(
        "[User2]",
        "balance:",
        await bora721.balanceOf(User2.address)
      );
    });
  });

  describe("ERC721 Send Ability", async function () {
    it("Should successfully when transfer multiple time ERC721 to TBA’s owner", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.before(
        "[TBA' owner]",
        "balance:",
        await bora721.balanceOf(User1.address)
      );

      // Step 1: Owner of ERC721 mint tokens (10000002, 20000002, 30000002) for TBA account
      this.mlog.log(
        "[TBA Account]",
        "mint tokens (10000002, 20000002, 30000002)"
      );
      await bora721.tbaMint(tbaAddress);

      // Step 2: TBA call transfer721() to transfer token id 10000002 to TBA’s owner
      this.mlog.log(
        "[TBA Account]",
        "transfer token id 10000002 to TBA’s owner"
      );
      await tba
        .connect(User1)
        .transfer721(bora721.target, User1.address, 10000002);

      // Step 3: TBA call transfer721() to transfer token id 20000002 to TBA’s owner
      this.mlog.log(
        "[TBA Account]",
        "transfer token id 20000002 to TBA’s owner"
      );
      await tba
        .connect(User1)
        .transfer721(bora721.target, User1.address, 20000002);

      // Step 4: TBA call transfer721() to transfer token id 30000002 to TBA’s owner
      this.mlog.log(
        "[TBA Account]",
        "transfer token id 30000002 to TBA’s owner"
      );
      await tba
        .connect(User1)
        .transfer721(bora721.target, User1.address, 30000002);

      // Step 5: Verify token balance of TBA account is 0
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      // Step 6: Verify token balance of TBA’s owner increase 6 tokens
      await expect(await bora721.balanceOf(User1)).to.equal(6);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.after(
        "[TBA’s owner]",
        "balance:",
        await bora721.balanceOf(User1.address)
      );
    });

    it("Should successfully when transfer multiple time ERC721 to another account", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.before(
        "[User2]",
        "balance:",
        await bora721.balanceOf(User2.address)
      );

      // Step 1: Owner of ERC721 mint tokens (10000002, 20000002, 30000002)  for TBA account
      this.mlog.log(
        "[TBA Account]",
        "Owner of ERC721 mint tokens (10000002, 20000002, 30000002)  for TBA account"
      );
      await bora721.tbaMint(tbaAddress);

      // Step 2: TBA call transfer721() to transfer token id 10000002 to User2
      this.mlog.log(
        "[TBA Account]",
        "TBA call transfer721() to transfer token id 10000002 to User2"
      );
      await tba
        .connect(User1)
        .transfer721(bora721.target, User2.address, 10000002);

      // Step 3: TBA call transfer721() to transfer token id 20000002 to User2
      this.mlog.log(
        "[TBA Account]",
        "TBA call transfer721() to transfer token id 20000002 to User2"
      );
      await tba
        .connect(User1)
        .transfer721(bora721.target, User2.address, 20000002);

      // Step 4: TBA call transfer721() to transfer token id 30000002 to User2
      this.mlog.log(
        "[TBA Account]",
        "TBA call transfer721() to transfer token id 30000002 to User2 "
      );
      await tba
        .connect(User1)
        .transfer721(bora721.target, User2.address, 30000002);

      // Step 5: Verify token balance of TBA account is 0
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      // Step 6: Verify token balance of User2 is 3
      await expect(await bora721.balanceOf(User2)).to.equal(3);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.after(
        "[TBA’s owner]",
        "balance:",
        await bora721.balanceOf(User2.address)
      );
    });

    it("Should successfully when transfer multiple time ERC721 to another TBA with same TBA’s owner", async function () {
      // Step 1: User 1 creates a TBA account 2 with tokenId 20000001
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          20000001,
          0,
          "0x"
        );

      // get tba2 account
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        20000001,
        0
      );

      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.before(
        "[TBA Account 2]",
        "balance:",
        await bora721.balanceOf(tbaAddress2)
      );

      // Step 2: Owner of ERC721 mint tokens (10000002, 20000002, 30000002) for TBA account 1
      this.mlog.log(
        "[TBA Account 1]",
        "mint tokens (10000002, 20000002, 30000002)"
      );
      await bora721.tbaMint(tbaAddress);

      // Step 3: Account 1 calls transfer721() to transfer token id 10000002 to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "calls transfer721() to transfer token id 10000002 to Account 2"
      );
      await tba
        .connect(User1)
        .transfer721(bora721.target, tbaAddress2, 10000002);

      // Step 4: Account 1 calls transfer721() to transfer token id 20000002 to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "calls transfer721() to transfer token id 20000002 to Account 2"
      );
      await tba
        .connect(User1)
        .transfer721(bora721.target, tbaAddress2, 20000002);

      // Step 5: Account 1 calls transfer721() to transfer token id 30000002 to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "calls transfer721() to transfer token id 30000002 to Account 2"
      );
      await tba
        .connect(User1)
        .transfer721(bora721.target, tbaAddress2, 30000002);

      // Step 6: Verify token balance of TBA account 1 is 0
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      // Step 7: Verify token balance of TBA account 2 is 3
      await expect(await bora721.balanceOf(tbaAddress2)).to.equal(3);

      this.mlog.after(
        "[TBA Account 1]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.after(
        "[TBA Account 2]",
        "balance:",
        await bora721.balanceOf(tbaAddress2)
      );
    });

    it("Should successfully when transfer multiple time ERC721 to another TBA with different TBA’s owner", async function () {
      // Mint token for User2
      await bora721.tbaMint(User2.address);

      // Step 1: User2 creates a TBA account 2 with tokenId 10000002
      await bora6551Registry
        .connect(User2)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          10000002,
          0,
          "0x"
        );

      // get tba2 account
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000002,
        0
      );

      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.before(
        "[TBA Account 2]",
        "balance:",
        await bora721.balanceOf(tbaAddress2)
      );

      // Step 2: Owner of ERC721 mint tokens (10000003, 20000003, 30000003) for TBA account 1
      this.mlog.log(
        "[TBA Account 1]",
        "mint tokens (10000003, 20000003, 30000003)"
      );
      await bora721.tbaMint(tbaAddress);

      // Step 3: Account 1 calls transfer721() to transfer token id 10000003 to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "transfer token id 10000003 to Account 2"
      );
      await tba
        .connect(User1)
        .transfer721(bora721.target, tbaAddress2, 10000003);

      // Step 4: Account 1 calls transfer721() to transfer token id 20000003 to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "transfer token id 20000003 to Account 2"
      );
      await tba
        .connect(User1)
        .transfer721(bora721.target, tbaAddress2, 20000003);

      // Step 5: Account 1 calls transfer721() to transfer token id 30000003 to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "transfer token id 30000003 to Account 2"
      );
      await tba
        .connect(User1)
        .transfer721(bora721.target, tbaAddress2, 30000003);

      // Step 6: Verify token balance of TBA account 1 is 0
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      // Step 7: Verify token balance of TBA account 2 is 3
      await expect(await bora721.balanceOf(tbaAddress2)).to.equal(3);

      this.mlog.after(
        "[TBA Account 1]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.after(
        "[TBA Account 2]",
        "balance:",
        await bora721.balanceOf(tbaAddress2)
      );
    });

    it("Should successfully when transfers multiple time ERC721 to another account via execute()", async function () {
      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.before(
        "[User2]",
        "balance:",
        await bora721.balanceOf(User2.address)
      );

      // Step 1: Owner of ERC721 mint tokens (10000002, 20000002, 30000002) for TBA account 1
      this.mlog.log(
        "[TBA Account 1]",
        "mint tokens (10000002, 20000002, 30000002)"
      );
      await bora721.tbaMint(tbaAddress);

      // Step 2: Account 1 calls execute() to transfer token id 10000002 to User2
      this.mlog.log(
        "[TBA Account 1]",
        "calls execute() to transfer token id 10000002 to User2"
      );
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        User2.address,
        10000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 3: Account 1 calls execute() to transfer token id 20000002 to User2
      this.mlog.log(
        "[TBA Account 1]",
        "calls execute() to transfer token id 20000002 to User2"
      );
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        User2.address,
        20000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 4: Account 1 calls execute() to transfer token id 30000002 to User2
      this.mlog.log(
        "[TBA Account 1]",
        "calls execute() to transfer token id 30000002 to User2"
      );
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        User2.address,
        30000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 5: Verify token balance of TBA account 1 is 0
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      // Step 6: Verify token balance of User2 is 3
      await expect(await bora721.balanceOf(User2.address)).to.equal(3);

      this.mlog.after(
        "[TBA Account 1]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.after(
        "[User2]",
        "balance:",
        await bora721.balanceOf(User2.address)
      );
    });

    it("Should successfully when transfers multiple time ERC721 to TBA’s owner via execute()", async function () {
      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.before(
        "[TBA’s owner]",
        "balance:",
        await bora721.balanceOf(User1.address)
      );

      // Step 1: Owner of ERC721 mint tokens (10000002, 20000002, 30000002) for TBA account 1
      this.mlog.log(
        "[TBA Account 1]",
        "mint tokens (10000002, 20000002, 30000002)"
      );
      await bora721.tbaMint(tbaAddress);

      // Step 2: Account 1 calls execute() to transfer token id 10000002 to TBA’s owner
      this.mlog.log(
        "[TBA Account 1]",
        "transfer token id 10000002 to TBA’s owner"
      );
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        User1.address,
        10000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 3: Account 1 calls execute() to transfer token id 20000002 to TBA’s owner
      this.mlog.log(
        "[TBA Account 1]",
        "transfer token id 20000002 to TBA’s owner"
      );
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        User1.address,
        20000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 4: Account 1 calls execute() to transfer token id 30000002 to TBA’s owner
      this.mlog.log(
        "[TBA Account 1]",
        "transfer token id 30000002 to TBA’s owner"
      );
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        User1.address,
        30000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 5: Verify token balance of TBA account 1 is 0
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      // Step 6: Verify token balance of TBA’s owner is 6
      await expect(await bora721.balanceOf(User1.address)).to.equal(6);

      this.mlog.after(
        "[TBA Account 1]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.after(
        "[TBA’s owner]",
        "balance:",
        await bora721.balanceOf(User1.address)
      );
    });

    it("Should successfully when transfers multiple time ERC721 to another TBA with same TBA’s owner via execute()", async function () {
      // Step 1: User 1 creates a TBA account 2 with tokenId 20000001
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          20000001,
          0,
          "0x"
        );

      // get tba2 account
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        20000001,
        0
      );

      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.before(
        "[TBA Account 2]",
        "balance:",
        await bora721.balanceOf(tbaAddress2)
      );

      // Step 2: Owner of ERC721 mint tokens (10000002, 20000002, 30000002) for TBA account 1
      this.mlog.log(
        "[TBA Account 1]",
        "mint tokens (10000002, 20000002, 30000002)"
      );
      await bora721.tbaMint(tbaAddress);

      // Step 3: Account 1 calls execute() to transfer token id 10000002 to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "transfer token id 10000002 to Account 2"
      );
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        tbaAddress2,
        10000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 4: Account 1 calls execute() to transfer token id 20000002 to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "transfer token id 20000002 to Account 2"
      );
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        tbaAddress2,
        20000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 5: Account 1 calls execute() to transfer token id 30000002 to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "transfer token id 30000002 to Account 2"
      );
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        tbaAddress2,
        30000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 6: Verify token balance of TBA account 1 is 0
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      // Step 7: Verify token balance of TBA account 2 is 3
      await expect(await bora721.balanceOf(tbaAddress2)).to.equal(3);

      this.mlog.after(
        "[TBA Account 1]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.after(
        "[TBA Account 2]",
        "balance:",
        await bora721.balanceOf(tbaAddress2)
      );
    });

    it("Should successfully when transfers multiple time ERC721 to another TBA with different TBA’s owner via execute()", async function () {
      // Mint token for User2
      await bora721.tbaMint(User2.address);

      // Step 1: User2 creates a TBA account 2 with tokenId 10000002
      await bora6551Registry
        .connect(User2)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          10000002,
          0,
          "0x"
        );

      // get tba2 account
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000002,
        0
      );

      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.before(
        "[TBA Account 2]",
        "balance:",
        await bora721.balanceOf(tbaAddress2)
      );

      // Step 2: Owner of ERC721 mint tokens (10000003, 20000003, 30000003)  for TBA account 1
      this.mlog.log(
        "[TBA Account 1]",
        "mint tokens (10000003, 20000003, 30000003)"
      );
      await bora721.tbaMint(tbaAddress);

      // Step 3: Account 1 calls execute() to transfer token id 10000003 to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "transfer token id 10000003 to Account 2"
      );
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        tbaAddress2,
        10000003,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 4: Account 1 calls execute() to transfer token id 20000003 to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "transfer token id 20000003 to Account 2"
      );
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        tbaAddress2,
        20000003,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 5: Account 1 calls execute() to transfer token id 30000003 to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "transfer token id 30000003 to Account 2"
      );
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        tbaAddress2,
        30000003,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 6: Verify token balance of TBA account 1 is 0
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      // Step 7: Verify token balance of TBA account 2 is 3
      await expect(await bora721.balanceOf(tbaAddress2)).to.equal(3);

      this.mlog.after(
        "[TBA Account 1]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      this.mlog.after(
        "[TBA Account 2]",
        "balance:",
        await bora721.balanceOf(tbaAddress2)
      );
    });
  });

  describe("ERC721 Burn Ability", async function () {
    it("Should successfully when burn multiple time ERC721 by owner of ERC721", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      // Step 1: Owner of ERC721 mint tokens (10000002, 20000002, 30000002) for TBA account
      this.mlog.log(
        "[TBA Account]",
        "mint tokens (10000002, 20000002, 30000002)"
      );
      await bora721.tbaMint(tbaAddress);
      this.mlog.log(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      // Step 2: Owner of ERC721 calls burn() to burn token id 10000002
      this.mlog.log("[TBA Account]", "burn token id 10000002");
      await bora721.burn(10000002);

      // Step 3: Owner of ERC721 calls burn() to burn token id 20000002
      this.mlog.log("[TBA Account]", "burn token id 20000002");
      await bora721.burn(20000002);

      // Step 4: Owner of ERC721 calls burn() to burn token id 30000002
      this.mlog.log("[TBA Account]", "burn token id 30000002");
      await bora721.burn(30000002);

      // Step 5: Verify token balance of TBA account is 0
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );
    });

    it("Should successfully when burn multiple time ERC721 via execute()", async function () {
      this.mlog.before(
        "[TBA Account 1]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      // Step 1: Owner of ERC721 mint tokens (10000002, 20000002, 30000002) for TBA account 1
      this.mlog.log(
        "[TBA Account]",
        "mint tokens (10000002, 20000002, 30000002)"
      );
      await bora721.tbaMint(tbaAddress);

      const iface = new Interface(["function burn(uint256 tokenId)"]);
      // Step 2: TBA account calls execute() to burn token id 10000002
      this.mlog.log("[TBA Account]", "burn token id 10000002");
      let data = iface.encodeFunctionData("burn", [10000002]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 3: TBA account calls execute() to burn token id 20000002
      this.mlog.log("[TBA Account]", "burn token id 20000002");
      data = iface.encodeFunctionData("burn", [20000002]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 4: TBA account calls execute() to burn token id 30000002
      this.mlog.log("[TBA Account]", "burn token id 30000002");
      data = iface.encodeFunctionData("burn", [30000002]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 5: Verify token balance of TBA account is 0
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );
    });
  });

  describe("Multiple Token Receive Ability", async function () {
    it("Should successfully when mint 10 tokens ERC20, 3 tokens ERC721, 5 tokens ERC1155 and 1000 wei from TBA’s owner", async function () {
      this.mlog.before(
        "[TBA Account]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "Native coin balance:",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.before(
        "[TBA’s owner]",
        "ERC20 balance:",
        await bora20.balanceOf(User1.address),
        "ERC721 balance:",
        await bora721.balanceOf(User1.address),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(User1.address),
        "Native coin balance:",
        await ethers.provider.getBalance(User1.address)
      );

      // Step 1: Owner of ERC20 mint 10 tokens for TBA account
      this.mlog.log(
        "[TBA Account]",
        "Owner of ERC20 mint 10 tokens for TBA Account"
      );
      await bora20.mint(tbaAddress, 10);

      // Step 2: Owner of ERC721 mint 3 tokens for TBA account
      this.mlog.log(
        "[TBA Account]",
        "Owner of ERC721 mint 3 tokens for TBA Account"
      );
      await bora721.tbaMint(tbaAddress);

      // Step 3: Owner of ERC1155 mint 5 tokens for TBA account
      this.mlog.log(
        "[TBA Account]",
        "Owner of ERC1155 mint 5 tokens for TBA Account"
      );
      await bora1155.tbaMint(tbaAddress, 1, "0x");

      // Step 4: TBA’s owner transfers 1000 wei for TBA account
      this.mlog.log(
        "[TBA Account]",
        "TBA’s owner transfers 1000 wei for TBA Account"
      );
      await User1.sendTransaction({ to: tbaAddress, value: 1000 });

      // Step 5: Verify TBA token balance of ERC20 is 10
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(10);

      // Step 6: Verify TBA token balance of ERC721 is 3
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(3);

      // Step 7: Verify TBA token balance of ERC1155 is 5
      await expect(await bora1155.tokenCountOf(tbaAddress)).to.equal(5);

      // Step 8: Verify TBA balance is increase 1000 wei
      await expect(await ethers.provider.getBalance(tbaAddress));

      // Step 9: Verify TBA’s owner balance is decrease 1000 wei
      await expect(await ethers.provider.getBalance(User1.address));

      this.mlog.after(
        "[TBA Account]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "Native coin balance:",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.after(
        "[TBA’s owner]",
        "ERC20 balance:",
        await bora20.balanceOf(User1.address),
        "ERC721 balance:",
        await bora721.balanceOf(User1.address),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(User1.address),
        "Native coin balance:",
        await ethers.provider.getBalance(User1.address)
      );
    });

    it("Should successfully when transfer 10 tokens ERC20, 3 tokens ERC721, 5 tokens ERC1155 and 1000 wei from another account", async function () {
      this.mlog.before(
        "[TBA Account]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "Native coin balance:",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.before(
        "[User2]",
        "ERC20 balance:",
        await bora20.balanceOf(User2.address),
        "ERC721 balance:",
        await bora721.balanceOf(User2.address),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(User2.address),
        "Native coin balance:",
        await ethers.provider.getBalance(User2.address)
      );

      // Step 1: Owner of ERC20 mint 10 tokens for User2
      this.mlog.log("[User2]", "Owner of ERC20 mint 10 tokens for User2");
      await bora20.mint(User2.address, 10);

      // Step 2: Owner of ERC721 mint 3 tokens for User2
      this.mlog.log("[User2]", "Owner of ERC721 mint 3 tokens for User2");
      await bora721.tbaMint(User2.address);

      // Step 3: Owner of ERC1155 mint 5 tokens for TBA account
      this.mlog.log("[User2]", "Owner of ERC1155 mint 5 tokens for User2");
      await bora1155.tbaMint(User2.address, 1, "0x");

      // Step 4: TBA’s owner transfers 1000 wei for User2
      this.mlog.log("[User2]", "TBA’s owner transfers 1000 wei for User2");
      await User1.sendTransaction({ to: User2.address, value: 1000 });

      // Step 5: User2 transfers 10 tokens ERC20 to TBA account
      this.mlog.log(
        "[TBA Account]",
        "User2 transfer 10 tokens ERC20 to TBA account"
      );
      await bora20.connect(User2).transfer(tbaAddress, 10);

      // Step 6: User2 transfers 3 tokens ERC721 to TBA account
      this.mlog.log(
        "[TBA Account]",
        "User2 transfers 3 tokens ERC721 to TBA account"
      );
      await bora721
        .connect(User2)
        .transferFrom(User2.address, tbaAddress, 10000002);
      await bora721
        .connect(User2)
        .transferFrom(User2.address, tbaAddress, 20000002);
      await bora721
        .connect(User2)
        .transferFrom(User2.address, tbaAddress, 30000002);

      // Step 7: User2 transfers 5 tokens ERC1155 to TBA account
      this.mlog.log(
        "[TBA Account]",
        "User2 transfers 5 tokens ERC1155 to TBA account"
      );
      await bora1155
        .connect(User2)
        .safeTransferFrom(User2.address, tbaAddress, 10000001, 1, "0x");
      await bora1155
        .connect(User2)
        .safeTransferFrom(User2.address, tbaAddress, 20000001, 1, "0x");
      await bora1155
        .connect(User2)
        .safeTransferFrom(User2.address, tbaAddress, 30000001, 1, "0x");
      await bora1155
        .connect(User2)
        .safeTransferFrom(User2.address, tbaAddress, 40000001, 1, "0x");
      await bora1155
        .connect(User2)
        .safeTransferFrom(User2.address, tbaAddress, 50000001, 1, "0x");

      // Step 8: User2 transfers 1000 wei to TBA account
      this.mlog.log("[TBA Account]", "User2 transfers 1000 wei to TBA account");
      await User2.sendTransaction({ to: tbaAddress, value: 1000 });

      // Step 9: Verify User2 token balance of ERC20 is 0
      await expect(await bora20.balanceOf(User2.address)).to.equal(0);

      // Step 10: Verify User2 token balance of ERC721 is 0
      await expect(await bora721.balanceOf(User2.address)).to.equal(0);

      // Step 11: Verify User2 token balance of ERC1155 is 0
      await expect(await bora1155.tokenCountOf(User2.address)).to.equal(0);

      // Step 12: Verify User2 balance is increase 0 wei
      await expect(await ethers.provider.getBalance(User2.address));

      // Step 13: Verify TBA token balance of ERC20 is 10
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(10);

      // Step 14: Verify TBA token balance of ERC721 is 3
      await expect(await bora721.balanceOf(tbaAddress)).to.be.equal(3);

      // Step 15: Verify TBA token balance of ERC1155 is 5
      await expect(await bora1155.tokenCountOf(tbaAddress)).to.be.equal(5);

      // Step 16: Verify TBA balance is increase 1000 wei
      await expect(await ethers.provider.getBalance(tbaAddress));

      // Step 17: Verify TBA’s owner balance is decrease 1000 wei
      await expect(await ethers.provider.getBalance(User1.address));

      this.mlog.after(
        "[TBA Account]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "Native coin balance:",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.after(
        "[User2]",
        "ERC20 balance:",
        await bora20.balanceOf(User2.address),
        "ERC721 balance:",
        await bora721.balanceOf(User2.address),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(User2.address),
        "Native coin balance:",
        await ethers.provider.getBalance(User2.address)
      );
    });
  });

  describe("Multiple Token Send Ability", async function () {
    it("Should successfully when transfer 10 tokens ERC20, 3 tokens ERC721, 5 tokens ERC1155 and 1000 wei to TBA’s owner", async function () {
      this.mlog.before(
        "[TBA Account]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "Native coin balance:",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.before(
        "[TBA’s owner]",
        "ERC20 balance:",
        await bora20.balanceOf(User1.address),
        "ERC721 balance:",
        await bora721.balanceOf(User1.address),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(User1.address),
        "Native coin balance:",
        await ethers.provider.getBalance(User1.address)
      );

      // Step 1: Owner of ERC20 mint 10 tokens for TBA account
      this.mlog.log(
        "[TBA Account]",
        "Owner of ERC20 mint 10 tokens for TBA Account"
      );
      await bora20.mint(tbaAddress, 10);

      // Step 2: Owner of ERC721 mint 3 tokens for TBA account
      this.mlog.log(
        "[TBA Account]",
        "Owner of ERC721 mint 3 tokens for TBA Account"
      );
      await bora721.tbaMint(tbaAddress);

      // Step 3: Owner of ERC1155 mint 5 tokens for TBA account
      this.mlog.log(
        "[TBA Account]",
        "Owner of ERC1155 mint 5 tokens for TBA Account"
      );
      await bora1155.tbaMint(tbaAddress, 1, "0x");

      // Step 4: TBA’s owner transfers 1000 wei for TBA account
      this.mlog.log(
        "[TBA Account]",
        "TBA’s owner transfers 1000 wei for TBA Account"
      );
      await User1.sendTransaction({ to: tbaAddress, value: 1000 });

      // Step 5: TBA call transfer20() to transfer 10 tokens to TBA’s owner
      this.mlog.log(
        "[TBA Account]",
        "TBA call transfer20() to transfer 10 tokens to TBA’s owner"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), User1.address, 10);

      // Step 6: TBA call transfer721() to transfer 3 tokens to TBA’s owner
      this.mlog.log(
        "[TBA Account]",
        "TBA call transfer721() to transfer 3 tokens to TBA’s owner"
      );
      await tba
        .connect(User1)
        .transfer721(await bora721.getAddress(), User1.address, 10000002);
      await tba
        .connect(User1)
        .transfer721(await bora721.getAddress(), User1.address, 20000002);
      await tba
        .connect(User1)
        .transfer721(await bora721.getAddress(), User1.address, 30000002);

      // Step 7: TBA call transfer1155() to transfer 5 tokens to TBA’s owner
      this.mlog.log(
        "[TBA Account]",
        "TBA call transfer1155() to transfer 5 tokens to TBA’s owner"
      );
      await tba
        .connect(User1)
        .transfer1155(
          await bora1155.getAddress(),
          User1.address,
          10000001,
          1,
          "0x"
        );
      await tba
        .connect(User1)
        .transfer1155(
          await bora1155.getAddress(),
          User1.address,
          20000001,
          1,
          "0x"
        );
      await tba
        .connect(User1)
        .transfer1155(
          await bora1155.getAddress(),
          User1.address,
          30000001,
          1,
          "0x"
        );
      await tba
        .connect(User1)
        .transfer1155(
          await bora1155.getAddress(),
          User1.address,
          40000001,
          1,
          "0x"
        );
      await tba
        .connect(User1)
        .transfer1155(
          await bora1155.getAddress(),
          User1.address,
          50000001,
          1,
          "0x"
        );

      // Step 8: TBA call transferCoin() to transfer 1000 wei to TBA’s owner
      this.mlog.log(
        "[TBA Account]",
        "TBA call transferCoin() to transfer 1000 wei to TBA’s owner"
      );
      await tba.connect(User1).transferCoin(User1.address, 1000);

      // Step 9: Verify TBA’s owner token balance of ERC20 is 10
      await expect(await bora20.balanceOf(User1.address)).to.equal(10);

      // Step 10: Verify TBA’s owner token balance of ERC721 is 6
      await expect(await bora721.balanceOf(User1.address)).to.equal(6);

      // Step 11: Verify TBA’s owner token balance of ERC1155 is 5
      await expect(await bora1155.tokenCountOf(User1.address)).to.equal(5);

      // Step 12: Verify TBA’s owner balance is increase 0 wei
      await expect(await ethers.provider.getBalance(User1.address));

      // Step 13: Verify TBA token balance of ERC20 is 0
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      // Step 14: Verify TBA token balance of ERC721 is 0
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      // Step 15: Verify TBA token balance of ERC1155 is 0
      await expect(await bora1155.tokenCountOf(tbaAddress)).to.equal(0);

      // Step 16: Verify TBA balance is increase 0 wei
      await expect(await ethers.provider.getBalance(tbaAddress));

      this.mlog.after(
        "[TBA Account]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "Native coin balance:",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.after(
        "[TBA’s owner]",
        "ERC20 balance:",
        await bora20.balanceOf(User1.address),
        "ERC721 balance:",
        await bora721.balanceOf(User1.address),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(User1.address),
        "Native coin balance:",
        await ethers.provider.getBalance(User1.address)
      );
    });

    it("Should successfully when transfer 10 tokens ERC20, 3 tokens ERC721, 5 tokens ERC1155 and 1000 wei to another account", async function () {
      this.mlog.before(
        "[TBA Account]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "Native coin balance:",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.before(
        "[User2]",
        "ERC20 balance:",
        await bora20.balanceOf(User2.address),
        "ERC721 balance:",
        await bora721.balanceOf(User2.address),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(User2.address),
        "Native coin balance:",
        await ethers.provider.getBalance(User2.address)
      );
      this.mlog.before(
        "[TBA’s owner]",
        "ERC20 balance:",
        await bora20.balanceOf(User1.address),
        "ERC721 balance:",
        await bora721.balanceOf(User1.address),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(User1.address),
        "Native coin balance:",
        await ethers.provider.getBalance(User1.address)
      );

      // Step 1: Owner of ERC20 mint 10 tokens for TBA account
      this.mlog.log(
        "[TBA Account]",
        "Owner of ERC20 mint 10 tokens for TBA Account"
      );
      await bora20.mint(tbaAddress, 10);

      // Step 2: Owner of ERC721 mint 3 tokens for TBA account
      this.mlog.log(
        "[TBA Account]",
        "Owner of ERC721 mint 3 tokens for TBA Account"
      );
      await bora721.tbaMint(tbaAddress);

      // Step 3: Owner of ERC1155 mint 5 tokens for TBA account
      this.mlog.log(
        "[TBA Account]",
        "Owner of ERC1155 mint 5 tokens for TBA Account"
      );
      await bora1155.tbaMint(tbaAddress, 1, "0x");

      // Step 4: TBA’s owner transfers 1000 wei for TBA account
      this.mlog.log(
        "[TBA Account]",
        "TBA’s owner transfers 1000 wei for TBA Account"
      );
      await User1.sendTransaction({ to: tbaAddress, value: 1000 });

      // Step 5: TBA call transfer20() to transfer 10 tokens to User2
      this.mlog.log(
        "[TBA Account]",
        "TBA call transfer20() to transfer 10 tokens to User2"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), User2.address, 10);

      // Step 6: TBA call transfer721() to transfer 3 tokens to User2
      this.mlog.log(
        "[TBA Account]",
        "TBA call transfer721() to transfer 3 tokens to User2"
      );
      await tba
        .connect(User1)
        .transfer721(await bora721.getAddress(), User2.address, 10000002);
      await tba
        .connect(User1)
        .transfer721(await bora721.getAddress(), User2.address, 20000002);
      await tba
        .connect(User1)
        .transfer721(await bora721.getAddress(), User2.address, 30000002);

      // Step 7: TBA call transfer1155() to transfer 5 tokens to User2
      this.mlog.log(
        "[TBA Account]",
        "TBA call transfer1155() to transfer 5 tokens to User2"
      );
      await tba
        .connect(User1)
        .transfer1155(
          await bora1155.getAddress(),
          User2.address,
          10000001,
          1,
          "0x"
        );
      await tba
        .connect(User1)
        .transfer1155(
          await bora1155.getAddress(),
          User2.address,
          20000001,
          1,
          "0x"
        );
      await tba
        .connect(User1)
        .transfer1155(
          await bora1155.getAddress(),
          User2.address,
          30000001,
          1,
          "0x"
        );
      await tba
        .connect(User1)
        .transfer1155(
          await bora1155.getAddress(),
          User2.address,
          40000001,
          1,
          "0x"
        );
      await tba
        .connect(User1)
        .transfer1155(
          await bora1155.getAddress(),
          User2.address,
          50000001,
          1,
          "0x"
        );

      // Step 8: TBA call transferCoin() to transfer 1000 wei to User2
      this.mlog.log(
        "[TBA Account]",
        "TBA call transferCoin() to transfer 1000 wei to User2"
      );
      await tba.connect(User1).transferCoin(User2.address, 1000);

      // Step 9: Verify User2 token balance of ERC20 is 10
      await expect(await bora20.balanceOf(User2.address)).to.equal(10);

      // Step 10: Verify User2 token balance of ERC721 is 3
      await expect(await bora721.balanceOf(User2.address)).to.equal(3);

      // Step 11: Verify User2 token balance of ERC1155 is 5
      await expect(await bora1155.tokenCountOf(User2.address)).to.equal(5);

      // Step 12: Verify User2 balance is increase 0 wei
      await expect(await ethers.provider.getBalance(User2.address));

      // Step 13: Verify TBA token balance of ERC20 is 0
      await expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      // Step 14: Verify TBA token balance of ERC721 is 0
      await expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      // Step 15: Verify TBA token balance of ERC1155 is 0
      await expect(await bora1155.tokenCountOf(tbaAddress)).to.equal(0);

      // Step 16: Verify TBA balance is increase 0 wei
      await expect(await ethers.provider.getBalance(tbaAddress));

      // Step 17: Verify TBA’s owner balance is decrease 1000 wei
      await expect(await ethers.provider.getBalance(User1.address));

      this.mlog.after(
        "[TBA Account]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "Native coin balance:",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.after(
        "[User2]",
        "ERC20 balance:",
        await bora20.balanceOf(User2.address),
        "ERC721 balance:",
        await bora721.balanceOf(User2.address),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(User2.address),
        "Native coin balance:",
        await ethers.provider.getBalance(User2.address)
      );
      this.mlog.after(
        "[TBA’s owner]",
        "ERC20 balance:",
        await bora20.balanceOf(User1.address),
        "ERC721 balance:",
        await bora721.balanceOf(User1.address),
        "ERC1155 balance:",
        await bora1155.tokenCountOf(User1.address),
        "Native coin balance:",
        await ethers.provider.getBalance(User1.address)
      );
    });

    it("Should successfully when transfers 10 tokens ERC20, 3 tokens ERC721, 5 tokens ERC1155 and 1000 wei to another TBA with same TBA’s owner via execute()", async function () {
      // Step 1: User 1 creates a TBA account 2 with tokenId 20000001
      await bora6551Registry
        .connect(User1)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          20000001,
          0,
          "0x"
        );

      // Get TBA account 2 address
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        20000001,
        0
      );

      this.mlog.before(
        "[TBA Account 1]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "",
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "",
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress)
      );

      this.mlog.before(
        "[TBA Account 2]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress2),
        "",
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress2),
        "",
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress2),
        "",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress2)
      );

      // Step 2: Owner of ERC20 mint 10 tokens for Account 1.
      this.mlog.log("[TBA Account 1]", "mint 10 tokens ERC20");
      await bora20.mint(tbaAddress, 10);

      // Step 3: Owner of ERC721 mint 3 tokens for Account 1
      this.mlog.log("[TBA Account 1]", "mint 3 tokens ERC721");
      await bora721.tbaMint(tbaAddress);

      // Step 4: Owner of ERC1155 mint 5 tokens for Account 1
      this.mlog.log("[TBA Account 1]", "mint 5 tokens ERC1155");
      await bora1155.tbaMint(tbaAddress, 1, "0x");

      // Step 5: TBA’s owner transfers 1000 wei for Account 1
      this.mlog.log("[TBA’s Owner]", "transfers 1000 wei for Account 1");
      await User1.sendTransaction({
        to: tbaAddress,
        value: 1000,
      });

      // Step 6: Account 1 call execute() to transfer 10 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 10 tokens to Account 2"
      );
      let data = iface20.encodeFunctionData("transfer", [tbaAddress2, 10]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 7: Account 1 call execute() to transfer 3 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 3 tokens to Account 2"
      );
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        tbaAddress2,
        10000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        tbaAddress2,
        20000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        tbaAddress2,
        30000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 8: Account 1 call execute() to transfer 5 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 5 tokens to Account 2"
      );
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        tbaAddress2,
        10000001,
        1,
        "0x",
      ]);
      await tba.connect(User1).execute(await bora1155.getAddress(), 0, data, 0);
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        tbaAddress2,
        20000001,
        1,
        "0x",
      ]);
      await tba.connect(User1).execute(await bora1155.getAddress(), 0, data, 0);
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        tbaAddress2,
        30000001,
        1,
        "0x",
      ]);
      await tba.connect(User1).execute(await bora1155.getAddress(), 0, data, 0);
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        tbaAddress2,
        40000001,
        1,
        "0x",
      ]);
      await tba.connect(User1).execute(await bora1155.getAddress(), 0, data, 0);
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        tbaAddress2,
        50000001,
        1,
        "0x",
      ]);
      await tba.connect(User1).execute(await bora1155.getAddress(), 0, data, 0);

      // Step 9: Account 1 call execute() to transfer 1000 wei to Account 2
      data = iface20.encodeFunctionData("invalidFunction", []);
      await tba.connect(User1).execute(tbaAddress2, 1000, data, 0);

      // Step 10: Verify Account 2 token balance of ERC20 is 10
      expect(await bora20.balanceOf(tbaAddress2)).to.equal(10);

      // Step 11: Verify Account 2 token balance of ERC721 is 3
      expect(await bora721.balanceOf(tbaAddress2)).to.equal(3);

      // Step 12: Verify Account 2 token balance of ERC1155 is 5
      expect(await bora1155.tokenCountOf(tbaAddress2)).to.equal(5);

      // Step 13: Verify Account 2 balance is increase 1000 wei
      expect(await ethers.provider.getBalance(tbaAddress2)).to.equal(1000);

      // Step 14: Verify Account 1 token balance of ERC20 is 0
      expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      // Step 15: Verify Account 1 token balance of ERC721 is 0
      expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      // Step 16: Verify Account 1 token balance of ERC1155 is 0
      expect(await bora1155.tokenCountOf(tbaAddress)).to.equal(0);

      // Step 17: Verify Account 1 balance has no changed
      expect(await ethers.provider.getBalance(tbaAddress)).to.equal(0);

      // Step 18: Verify TBA’s owner balance is decrease 1000 wei
      expect(await ethers.provider.getBalance(User1.address));

      this.mlog.after(
        "[TBA Account 1]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "",
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "",
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress)
      );

      this.mlog.after(
        "[TBA Account 2]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress2),
        "",
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress2),
        "",
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress2),
        "",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress2)
      );
    });

    it("Should successfully when transfers 10 tokens ERC20, 3 tokens ERC721, 5 tokens ERC1155 and 1000 wei to another TBA with different TBA’s owner via execute()", async function () {
      // Step 1: User 2 creates a TBA account 2 with tokenId 10000002
      await bora6551Registry
        .connect(User2)
        .createAccount(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          10000002,
          0,
          "0x"
        );

      // Get TBA account 2 address
      tbaAddress2 = await bora6551Registry.account(
        bora6551Account.getAddress(),
        network.config.chainId as BigNumberish,
        bora721.getAddress(),
        10000002,
        0
      );

      this.mlog.before(
        "[TBA Account 1]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "",
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "",
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress)
      );

      this.mlog.before(
        "[TBA Account 2]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress2),
        "",
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress2),
        "",
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress2),
        "",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress2)
      );

      // Step 2: Owner of ERC20 mint 10 tokens for Account 1.
      this.mlog.log("[TBA Account 1]", "mint 10 tokens ERC20");
      await bora20.mint(tbaAddress, 10);

      // Step 3: Owner of ERC721 mint 3 tokens for Account 1
      this.mlog.log("[TBA Account 1]", "mint 3 tokens ERC721");
      await bora721.tbaMint(tbaAddress);

      // Step 4: Owner of ERC1155 mint 5 tokens for Account 1
      this.mlog.log("[TBA Account 1]", "mint 5 tokens ERC1155");
      await bora1155.tbaMint(tbaAddress, 1, "0x");

      // Step 5: TBA’s owner transfers 1000 wei for Account 1
      this.mlog.log("[TBA’s Owner]", "transfers 1000 wei for Account 1");
      await User1.sendTransaction({
        to: tbaAddress,
        value: 1000,
      });

      // Step 6: Account 1 call execute() to transfer 10 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 10 tokens to Account 2"
      );
      let data = iface20.encodeFunctionData("transfer", [tbaAddress2, 10]);
      await tba.connect(User1).execute(await bora20.getAddress(), 0, data, 0);

      // Step 7: Account 1 call execute() to transfer 3 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 3 tokens to Account 2"
      );
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        tbaAddress2,
        10000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        tbaAddress2,
        20000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);
      data = iface721.encodeFunctionData("transferFrom", [
        tbaAddress,
        tbaAddress2,
        30000002,
      ]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 8: Account 1 call execute() to transfer 5 tokens to Account 2
      this.mlog.log(
        "[TBA Account 1]",
        "call execute() to transfer 5 tokens to Account 2"
      );
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        tbaAddress2,
        10000001,
        1,
        "0x",
      ]);
      await tba.connect(User1).execute(await bora1155.getAddress(), 0, data, 0);
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        tbaAddress2,
        20000001,
        1,
        "0x",
      ]);
      await tba.connect(User1).execute(await bora1155.getAddress(), 0, data, 0);
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        tbaAddress2,
        30000001,
        1,
        "0x",
      ]);
      await tba.connect(User1).execute(await bora1155.getAddress(), 0, data, 0);
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        tbaAddress2,
        40000001,
        1,
        "0x",
      ]);
      await tba.connect(User1).execute(await bora1155.getAddress(), 0, data, 0);
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        tbaAddress2,
        50000001,
        1,
        "0x",
      ]);
      await tba.connect(User1).execute(await bora1155.getAddress(), 0, data, 0);

      // Step 9: Account 1 call execute() to transfer 1000 wei to Account 2
      data = iface20.encodeFunctionData("invalidFunction", []);
      await tba.connect(User1).execute(tbaAddress2, 1000, data, 0);

      // Step 10: Verify Account 2 token balance of ERC20 is 10
      expect(await bora20.balanceOf(tbaAddress2)).to.equal(10);

      // Step 11: Verify Account 2 token balance of ERC721 is 3
      expect(await bora721.balanceOf(tbaAddress2)).to.equal(3);

      // Step 12: Verify Account 2 token balance of ERC1155 is 5
      expect(await bora1155.tokenCountOf(tbaAddress2)).to.equal(5);

      // Step 13: Verify Account 2 balance is increase 1000 wei
      expect(await ethers.provider.getBalance(tbaAddress2)).to.equal(1000);

      // Step 14: Verify Account 1 token balance of ERC20 is 0
      expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      // Step 15: Verify Account 1 token balance of ERC721 is 0
      expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      // Step 16: Verify Account 1 token balance of ERC1155 is 0
      expect(await bora1155.tokenCountOf(tbaAddress)).to.equal(0);

      // Step 17: Verify Account 1 balance has no changed
      expect(await ethers.provider.getBalance(tbaAddress)).to.equal(0);

      // Step 18: Verify TBA’s owner balance is decrease 1000 wei
      expect(await ethers.provider.getBalance(User1.address));

      this.mlog.after(
        "[TBA Account 1]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "",
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "",
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress)
      );

      this.mlog.after(
        "[TBA Account 2]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress2),
        "",
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress2),
        "",
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress2),
        "",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress2)
      );
    });
  });

  describe("Multiple Token Burn Ability", async function () {
    it("Should successfully when burn 10 tokens ERC20, 3 tokens ERC721, 5 tokens ERC1155 and 1000 wei", async function () {
      this.mlog.before(
        "[TBA Account]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "",
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "",
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress)
      );

      // Step 1: Owner of ERC20 mint 10 tokens for TBA account
      this.mlog.log("[TBA Account]", "mint 10 tokens ERC20");
      await bora20.mint(tbaAddress, 10);

      // Step 2: Owner of ERC721 mint 3 tokens for TBA account
      this.mlog.log("[TBA Account]", "mint 3 tokens ERC721");
      await bora721.tbaMint(tbaAddress);

      // Step 3: Owner of ERC1155 mint 5 tokens for TBA account
      this.mlog.log("[TBA Account]", "mint 5 tokens ERC1155");
      await bora1155.tbaMint(tbaAddress, 10, "0x");

      // Step 4: TBA’s owner transfers 1000 wei for TBA account
      this.mlog.log("[TBA’s Owner]", "transfers 1000 wei for TBA account");
      await User1.sendTransaction({
        to: tbaAddress,
        value: 1000,
      });

      // Step 5: TBA calls BoralabsTBA20.burn() to burn 10 tokens
      this.mlog.log(
        "[TBA Account]",
        "calls BoralabsTBA20.burn() to burn 10 tokens"
      );
      let data = iface20.encodeFunctionData("approve", [owner20.address, 10]);
      await tba.connect(User1).execute(bora20.target, 0, data, 0);
      await bora20.burnFrom(tbaAddress, 10);

      // Step 6: TBA calls BoralabsTBA721.burn() to burn 3 tokens
      await bora721.burn(10000002);
      await bora721.burn(20000002);
      await bora721.burn(30000002);

      // Step 7: TBA calls BoralabsTBA1155.burn() to burn 5 tokens
      this.mlog.log(
        "[TBA Account 1]",
        "calls BoralabsTBA1155.burn() to burn 5 tokens"
      );
      data = iface1155.encodeFunctionData("setApprovalForAll", [
        owner1155.address,
        true,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);
      await bora1155.burn(tbaAddress, 10);

      // Step 8: TBA calls transferCoin() with address to is zero address to burn 1000 wei
      this.mlog.log(
        "[TBA Account 1]",
        "calls transferCoin() with address to is zero address to burn 1000 wei"
      );
      await tba.connect(User1).transferCoin(ethers.ZeroAddress, 1000);

      // Step 9: Verify TBA token balance of ERC20 is 0
      expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      // Step 10: Verify TBA token balance of ERC721 is 0
      expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      // Step 11: Verify TBA token balance of ERC1155 is 0
      expect(await bora1155.tokenCountOf(tbaAddress)).to.equal(0);

      // Step 12: Verify TBA balance is decrease 1000 wei
      expect(await ethers.provider.getBalance(tbaAddress));

      this.mlog.after(
        "[TBA Account]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "",
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "",
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress)
      );
    });

    it("Should successfully when burn 10 tokens ERC20, 3 tokens ERC721, 5 tokens ERC1155 and 1000 wei via execute()", async function () {
      this.mlog.before(
        "[TBA Account]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "",
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "",
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress)
      );

      // Step 1: Owner of ERC20 mint 10 tokens for TBA account
      this.mlog.log("[TBA Account]", "mint 10 tokens ERC20");
      await bora20.mint(tbaAddress, 10);

      // Step 2: Owner of ERC721 mint 3 tokens for TBA account
      this.mlog.log("[TBA Account]", "mint 3 tokens ERC721");
      await bora721.tbaMint(tbaAddress);

      // Step 3: Owner of ERC1155 mint 5 tokens for TBA account
      this.mlog.log("[TBA Account]", "mint 5 tokens ERC1155");
      await bora1155.tbaMint(tbaAddress, 10, "0x");

      // Step 4: TBA’s owner transfers 1000 wei for TBA account
      this.mlog.log("[TBA’s Owner]", "transfers 1000 wei for TBA account");
      await User1.sendTransaction({
        to: tbaAddress,
        value: 1000,
      });

      // Step 5: TBA calls execute() to burn 10 tokens

      // Step 6: TBA calls execute() to burn 3 tokens
      data = iface721.encodeFunctionData("burn", [10000002]);
      await tba.connect(User1).execute(bora721.target, 0, data, 0);

      data = iface721.encodeFunctionData("burn", [20000002]);
      await tba.connect(User1).execute(bora721.target, 0, data, 0);

      data = iface721.encodeFunctionData("burn", [30000002]);
      await tba.connect(User1).execute(bora721.target, 0, data, 0);

      // Step 7: TBA calls execute() to burn 5 tokens

      // Step 8: TBA calls execute() with address to is zero address to burn 1000 wei
      await tba.connect(User1).execute(ethers.ZeroAddress, 1000, data, 0);

      // Step 9: Verify TBA token balance of ERC20 is 0
      expect(await bora20.balanceOf(tbaAddress)).to.equal(0);

      // Step 10: Verify TBA token balance of ERC721 is 0
      expect(await bora721.balanceOf(tbaAddress)).to.equal(0);

      // Step 11: Verify TBA token balance of ERC1155 is 0
      expect(await bora1155.tokenCountOf(tbaAddress)).to.equal(0);

      // Step 12: Verify TBA balance is decrease 1000 wei
      expect(await ethers.provider.getBalance(tbaAddress));

      this.mlog.after(
        "[TBA Account]",
        "ERC20 balance:",
        await bora20.balanceOf(tbaAddress),
        "",
        "ERC721 balance:",
        await bora721.balanceOf(tbaAddress),
        "",
        "ERC1155 balance:",
        await bora1155.tokenCountOf(tbaAddress),
        "",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress)
      );
    });
  });
});
