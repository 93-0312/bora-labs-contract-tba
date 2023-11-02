import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
  BoralabsTBA20,
  BoralabsTBA721,
  BoralabsTBA6551Account,
  BoralabsTBA6551Registry,
} from "../typechain-types";
import {
  deployBora20,
  deployBora721,
  deployBora6551Account,
  deployBora6551Registry,
} from "../util/fixture";
import mlog from "../util/mlog";
import { BigNumberish, Interface } from "ethers";
import Util from "../util/util";

describe("BoralabsTBA6551: Non-functional test", function () {
  mlog.injectLogger(this);

  this.timeout(600000); // 10 minutes

  let bora20: BoralabsTBA20;
  let bora721: BoralabsTBA721;
  let bora6551Account: BoralabsTBA6551Account;
  let bora6551Registry: BoralabsTBA6551Registry;

  let tbaAddress: string;
  let tba: BoralabsTBA6551Account;

  let User1: HardhatEthersSigner;
  let User2: HardhatEthersSigner;

  let data: string;

  const iface20 = new Interface([
    "function transfer(address to, uint256 amount)",
    "function burn(uint256 amount)",
    "function approve(address spender, uint256 amount)",
  ]);

  beforeEach(async function () {
    // deploy bora20
    ({ bora20 } = await loadFixture(deployBora20));

    // deploy bora721
    ({ bora721 } = await loadFixture(deployBora721));

    // deploy bora 6551 account
    ({ bora6551Account } = await loadFixture(deployBora6551Account));

    // deploy bora 6551 registry
    ({ bora6551Registry } = await loadFixture(deployBora6551Registry));

    [User1, User2] = await ethers.getSigners();
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

  describe("Create Account", async function () {
    async function createAccount(mlog: mlog, transactionCount: number) {
      const mintTimes = transactionCount / 3;

      // Step 1: User 2 uses tbaMint() ${transactionCount} times to mint ${transactionCount} ERC721 tokens
      mlog.log(
        "[User 2]",
        `uses tbaMint() ${mintTimes} times to mint ${transactionCount} ERC721 tokens`
      );
      const tokenIds = await Util.mintMulti721(
        User2.address,
        mintTimes,
        bora721
      );

      mlog.before(
        "[TBA accounts]",
        "of User 2:",
        await Util.getTotalTBA(tokenIds, bora721, bora6551Registry)
      );

      // Step 2: User 2 uses createAccount() to create ${transactionCount} from ${transactionCount} tokens above
      mlog.log(
        "[User 2]",
        `uses createAccount() to create ${transactionCount} TBA accounts from ${transactionCount} tokens above`
      );
      await Util.createMultiTBA(
        await bora6551Account.getAddress(),
        bora6551Registry,
        await bora721.getAddress(),
        transactionCount,
        tokenIds,
        0
      );

      // Step 3: Verify the number of TBA accounts is ${transactionCount}
      const tbaAccounts = await Util.getTotalTBA(
        tokenIds,
        bora721,
        bora6551Registry
      );
      expect(tbaAccounts).to.be.equal(transactionCount);
      mlog.after("[TBA accounts]", "of User 2:", tbaAccounts);
    }

    it("Should be successful when create 300 TBA at the same time", async function () {
      await createAccount(this.mlog, 300);
    });

    it("Should be successful when create 3.000 TBA at the same time", async function () {
      await createAccount(this.mlog, 3000);
    });

    it("Should be successful when create 5.001 TBA at the same time", async function () {
      await createAccount(this.mlog, 5001);
    });

    // TODO: Out of memory
    it.skip("Should be successful when create 30.000 TBA at the same time", async function () {
      await createAccount(this.mlog, 30000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when create 300.000 TBA at the same time", async function () {
      await createAccount(this.mlog, 300000);
    });
  });

  describe("Stress Testing - Mint ERC20", async function () {
    async function mintERC20(mlog: mlog, transactionCount: number) {
      mlog.before(
        "[TBA Account]",
        "tokens balance:",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 1: Owner of ERC20 mints ${transactionCount} times to mint token with amount is 1 for TBA
      mlog.log(
        "[Owner of ERC20]",
        `mints ${transactionCount} times to mint token with amount is 1 for TBA`
      );
      for (let i = 0; i < transactionCount; ++i) {
        await bora20.mint(tbaAddress, 1);
        Util.showProgress(i + 1, transactionCount);
      }
      Util.clearProgress();

      // Step 2: Verify token balance of TBA account is ${transactionCount}
      expect(await bora20.balanceOf(tbaAddress)).to.be.equal(transactionCount);
      mlog.after(
        "[TBA Account]",
        "tokens balance:",
        await bora20.balanceOf(tbaAddress)
      );
    }

    it("Should be successful when mint 100 times at the same time", async function () {
      await mintERC20(this.mlog, 100);
    });

    it("Should be successful when mint 1.000 times at the same time", async function () {
      await mintERC20(this.mlog, 1000);
    });

    it("Should be successful when mint 5.000 times at the same time", async function () {
      await mintERC20(this.mlog, 5000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when mint 10.000 times at the same time", async function () {
      await mintERC20(this.mlog, 10000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when mint 100.000 times at the same time", async function () {
      await mintERC20(this.mlog, 100000);
    });
  });

  describe("Stress Testing - Execute - Transfer ERC20", async function () {
    async function transfer(mlog: mlog, transactionCount: number) {
      mlog.before(
        "[TBA Account]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );
      mlog.before(
        "[User 2]",
        "token erc20 balance",
        await bora20.balanceOf(User2.address)
      );

      // Step 1: Owner of ERC20  to mint erc20 token with amount is ${transactionCount} to TBA
      mlog.log("[Owner of ERC20]", `mint ${transactionCount} token to TBA`);
      await bora20.mint(tbaAddress, transactionCount);
      mlog.log(
        "[TBA Account]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 2: TBA calls execute() to transfer ${transactionCount} times to User 2 with amount is 1
      mlog.log(
        "[TBA Account]",
        `calls execute() to transfer ${transactionCount} times to User 2 with amount is 1`
      );
      const transferAmount = 1;
      data = iface20.encodeFunctionData("transfer", [
        User2.address,
        transferAmount,
      ]);
      for (let i = 0; i < transactionCount; i++) {
        await tba.execute(await bora20.getAddress(), 0, data, 0);
        Util.showProgress(i + 1, transactionCount);
      }
      Util.clearProgress();

      // Step 3: Verify token balance of TBA account is 0
      // Step 4: Verify token balance of User 2 is ${transactionCount}
      expect(await bora20.balanceOf(User2.address)).to.be.equal(
        transactionCount
      );
      expect(await bora20.balanceOf(tbaAddress)).to.be.equal(0);

      mlog.after(
        "[TBA Account]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );
      mlog.after(
        "[User 2]",
        "token erc20 balance",
        await bora20.balanceOf(User2.address)
      );
    }

    it("Should be successful when transferring 100 times at the same time", async function () {
      await transfer(this.mlog, 100);
    });

    it("Should be successful when transferring 1.000 times at the same time", async function () {
      await transfer(this.mlog, 1000);
    });

    it("Should be successful when transferring 5.000 times at the same time", async function () {
      await transfer(this.mlog, 5000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when transferring 10.000 times at the same time", async function () {
      await transfer(this.mlog, 10000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when transferring 100.000 times at the same time", async function () {
      await transfer(this.mlog, 100000);
    });
  });

  describe.only("Stress Testing - Execute - Burn ERC20", async function () {
    async function burn(mlog: mlog, transactionCount: number) {
      mlog.before(
        "[TBA Account]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 1: Owner of ERC20 to mint erc20 token with amount is ${transactionCount}
      mlog.log("[Owner of ERC20]", `mint ${transactionCount} token to TBA`);
      await bora20.mint(tbaAddress, transactionCount);
      mlog.log(
        "[TBA Account]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 2: TBA calls execute() to burn ${transactionCount} times with amount is 1
      mlog.log(
        "[TBA Account]",
        `calls execute() to burn ${transactionCount} times amount is 1`
      );
      data = iface20.encodeFunctionData("burn", [1]);
      for (let i = 0; i < transactionCount; i++) {
        await tba.execute(await bora20.getAddress(), 0, data, 0);
        Util.showProgress(i + 1, transactionCount);
      }
      Util.clearProgress();

      // Step 3: Verify token balance of TBA account is 0
      expect(await bora20.balanceOf(tbaAddress)).to.be.equal(0);

      mlog.after(
        "[TBA Account]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );
    }

    it("Should be successful when burning 100 times at the same time", async function () {
      await burn(this.mlog, 100);
    });

    it("Should be successful when burning 1.000 times at the same time", async function () {
      await burn(this.mlog, 1000);
    });

    it("Should be successful when burning 5.000 times at the same time", async function () {
      await burn(this.mlog, 5000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when burning 10.000 times at the same time", async function () {
      await burn(this.mlog, 10000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when burning 100.000 times at the same time", async function () {
      await burn(this.mlog, 100000);
    });
  });
});
