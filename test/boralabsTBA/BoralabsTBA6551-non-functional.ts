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
} from "../util/fixture";
import mlog from "../util/mlog";
import { BigNumberish, Interface } from "ethers";
import Util from "../util/util";

describe("BoralabsTBA6551: Non-functional test", function () {
  mlog.injectLogger(this);

  this.timeout(600000); // 10 minutes

  let bora20: BoralabsTBA20;
  let bora721: BoralabsTBA721;
  let bora1155: BoralabsTBA1155;
  let bora6551Account: BoralabsTBA6551Account;
  let bora6551Registry: BoralabsTBA6551Registry;

  let tbaAddress: string;
  let tba: BoralabsTBA6551Account;

  let User1: HardhatEthersSigner;
  let User2: HardhatEthersSigner;

  let data: string;
  const emptyData = "0x";

  const iface20 = new Interface([
    "function transfer(address to, uint256 amount)",
    "function burn(uint256 amount)",
    "function burnFrom(address account, uint256 amount)",
    "function approve(address spender, uint256 amount)",
  ]);

  const iface721 = new Interface([
    "function tbaMint(address to)",
    "function transferFrom( address from, address to, uint256 tokenId )",
  ]);

  const iface1155 = new Interface([
    "function safeTransferFrom(address from, address to, uint256 tokenId, uint256 amount, bytes data)",
    "function burn(uint256 id, uint256 amount)",
  ]);

  beforeEach(async function () {
    // deploy bora20
    ({ bora20 } = await loadFixture(deployBora20));

    // deploy bora721
    ({ bora721 } = await loadFixture(deployBora721));

    // deploy bora1155
    ({ bora1155 } = await loadFixture(deployBora1155));

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
    async function createAccount(mlog: mlog, numberOfTransaction: number) {
      const mintTimes = numberOfTransaction / 3;

      // Step 1: User 2 uses tbaMint() ${numberOfTransaction} times to mint ${numberOfTransaction} ERC721 tokens
      mlog.log(
        "[User 2]",
        `uses tbaMint() ${mintTimes} times to mint ${numberOfTransaction} ERC721 tokens`
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

      // Step 2: User 2 uses createAccount() to create ${numberOfTransaction} from ${numberOfTransaction} tokens above
      mlog.log(
        "[User 2]",
        `uses createAccount() to create ${numberOfTransaction} TBA accounts from ${numberOfTransaction} tokens above`
      );
      await Util.createMultiTBA(
        await bora6551Account.getAddress(),
        bora6551Registry,
        await bora721.getAddress(),
        numberOfTransaction,
        tokenIds,
        0
      );

      // Step 3: Verify the number of TBA accounts is ${numberOfTransaction}
      const tbaAccounts = await Util.getTotalTBA(
        tokenIds,
        bora721,
        bora6551Registry
      );
      expect(tbaAccounts).to.be.equal(numberOfTransaction);
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
    async function mintERC20(mlog: mlog, numberOfTransaction: number) {
      mlog.before(
        "[TBA Account]",
        "tokens balance:",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 1: Owner of ERC20 mints ${numberOfTransaction} times to mint token with amount is 1 for TBA
      mlog.log(
        "[Owner of ERC20]",
        `mints ${numberOfTransaction} times to mint token with amount is 1 for TBA`
      );
      for (let i = 0; i < numberOfTransaction; ++i) {
        await bora20.mint(tbaAddress, 1);
        Util.showProgress(i + 1, numberOfTransaction);
      }
      Util.clearProgress();

      // Step 2: Verify token balance of TBA account is ${numberOfTransaction}
      expect(await bora20.balanceOf(tbaAddress)).to.be.equal(
        numberOfTransaction
      );
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

    it("Should be successful when mint 10.000 times at the same time", async function () {
      await mintERC20(this.mlog, 10000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when mint 100.000 times at the same time", async function () {
      await mintERC20(this.mlog, 100000);
    });
  });

  describe("Stress Testing - Execute - Transfer ERC20", async function () {
    async function transfer(mlog: mlog, numberOfTransaction: number) {
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

      // Step 1: Owner of ERC20  to mint erc20 token with amount is ${numberOfTransaction} to TBA
      mlog.log("[Owner of ERC20]", `mint ${numberOfTransaction} token to TBA`);
      await bora20.mint(tbaAddress, numberOfTransaction);
      mlog.log(
        "[TBA Account]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 2: TBA calls execute() to transfer ${numberOfTransaction} times to User 2 with amount is 1
      mlog.log(
        "[TBA Account]",
        `calls execute() to transfer ${numberOfTransaction} times to User 2 with amount is 1`
      );
      const transferAmount = 1;
      data = iface20.encodeFunctionData("transfer", [
        User2.address,
        transferAmount,
      ]);
      for (let i = 0; i < numberOfTransaction; i++) {
        await tba.execute(await bora20.getAddress(), 0, data, 0);
        Util.showProgress(i + 1, numberOfTransaction);
      }
      Util.clearProgress();

      // Step 3: Verify token balance of TBA account is 0
      // Step 4: Verify token balance of User 2 is ${numberOfTransaction}
      expect(await bora20.balanceOf(User2.address)).to.be.equal(
        numberOfTransaction
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

    it("Should be successful when transferring 10.000 times at the same time", async function () {
      await transfer(this.mlog, 10000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when transferring 100.000 times at the same time", async function () {
      await transfer(this.mlog, 100000);
    });
  });

  describe("Stress Testing - Execute - Burn ERC20", async function () {
    async function burn(mlog: mlog, numberOfTransaction: number) {
      mlog.before(
        "[TBA Account]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 1: Owner of ERC20 to mint erc20 token with amount is ${numberOfTransaction}
      mlog.log("[Owner of ERC20]", `mint ${numberOfTransaction} token to TBA`);
      await bora20.mint(tbaAddress, numberOfTransaction);
      mlog.log(
        "[TBA Account]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 2: TBA calls execute() to burn ${numberOfTransaction} times with amount is 1
      mlog.log(
        "[TBA Account]",
        `calls execute() to burn ${numberOfTransaction} times amount is 1`
      );
      data = iface20.encodeFunctionData("burn", [1]);
      for (let i = 0; i < numberOfTransaction; i++) {
        await tba.execute(await bora20.getAddress(), 0, data, 0);
        Util.showProgress(i + 1, numberOfTransaction);
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

    it("Should be successful when burning 10.000 times at the same time", async function () {
      await burn(this.mlog, 10000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when burning 100.000 times at the same time", async function () {
      await burn(this.mlog, 100000);
    });
  });

  describe("Stress Testing - Execute - Burn From ERC20", async function () {
    async function burnFrom(mlog: mlog, numberOfTransaction: number) {
      mlog.before(
        "[User 1]",
        "balance:",
        await bora20.balanceOf(User1.address)
      );

      // Step 1: Owner of ERC20 mints token with amount is ${numberOfTransaction} for User 1
      mlog.log(
        "[User 1]",
        `mints token with amount is ${numberOfTransaction} for User 1`
      );
      await bora20.mint(User1.address, numberOfTransaction);
      mlog.log("[User 1]", "balance:", await bora20.balanceOf(User1.address));

      // Step 2: User 1 approves for TBA account
      mlog.log("[User 1]", "approves for TBA account");
      await bora20.approve(tbaAddress, numberOfTransaction);

      // Step 3: TBA calls execute() ${numberOfTransaction} times to burn from User 1 with amount is 1
      mlog.log(
        "[TBA Account]",
        `calls execute() ${numberOfTransaction} times to burn from User 1 with amount is 1`
      );
      data = iface20.encodeFunctionData("burnFrom", [User1.address, 1]);
      for (let i = 0; i < numberOfTransaction; i++) {
        await tba.connect(User1).execute(bora20.target, 0, data, 0);
        Util.showProgress(i + 1, numberOfTransaction);
      }
      Util.clearProgress();

      // Step 4: Verify token balance of User 1 is 0
      expect(await bora20.balanceOf(User1.address)).to.be.equals(0);

      mlog.after("[User 1]", "balance:", await bora20.balanceOf(User1.address));
    }

    it("Should be successful when burning from 100 times at the same time", async function () {
      await burnFrom(this.mlog, 100);
    });

    it("Should be successful when burning from 1.000 times at the same time", async function () {
      await burnFrom(this.mlog, 1000);
    });

    it("Should be successful when burning from 5.000 times at the same time", async function () {
      await burnFrom(this.mlog, 5000);
    });

    it("Should be successful when burning from 10.000 times at the same time", async function () {
      await burnFrom(this.mlog, 10000);
    });

    // TODO: out of memory
    it.skip("Should be successful when burning from 100.000 times at the same time", async function () {
      await burnFrom(this.mlog, 100000);
    });
  });

  describe("Stress Testing - Execute - Mint ERC721", async function () {
    async function mintERC721(mlog: mlog, numberOfTransaction: number) {
      mlog.before(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      // Step 1: TBA calls execute() ${numberOfTransaction} times to mint erc721 token
      mlog.log(
        "[TBA Account]",
        `calls execute() ${numberOfTransaction} times to mint erc721 token`
      );
      data = iface721.encodeFunctionData("tbaMint", [tbaAddress]);
      for (let i = 0; i < numberOfTransaction; i++) {
        await tba.connect(User1).execute(bora721.target, 0, data, 0);
        Util.showProgress(i + 1, numberOfTransaction);
      }
      Util.clearProgress();

      // Step 2: Verify token balance of TBA account is ${numberOfTransaction * 3}
      expect(await bora721.balanceOf(tbaAddress)).to.be.equals(
        numberOfTransaction * 3
      );

      mlog.after(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );
    }

    it("Should be successful when mint 100 times at the same time", async function () {
      await mintERC721(this.mlog, 100);
    });

    it("Should be successful when mint 1.000 times at the same time", async function () {
      await mintERC721(this.mlog, 1000);
    });

    it("Should be successful when mint 5.000 times at the same time", async function () {
      await mintERC721(this.mlog, 5000);
    });

    // Out of memory
    it.skip("Should be successful when mint 10.000 times at the same time", async function () {
      await mintERC721(this.mlog, 10000);
    });

    // Out of memory
    it.skip("Should be successful when mint 100.000 times at the same time", async function () {
      await mintERC721(this.mlog, 100000);
    });
  });

  describe("Stress Testing - Execute - Transfer From ERC721", async function () {
    async function transferFrom(mlog: mlog, numberOfTransaction: number) {
      mlog.before(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );
      mlog.before(
        "[User 2]",
        "balance:",
        await bora721.balanceOf(User2.address)
      );

      // Step 1: TBA calls execute() ${numberOfTransaction / 3} times to mint ${numberOfTransaction} ERC721 tokens
      mlog.log(
        "[TBA Account]",
        "calls execute()",
        numberOfTransaction / 3,
        "times to mint",
        numberOfTransaction,
        "ERC721 tokens"
      );
      let tokenIds = await Util.executeMintMulti721(
        tba,
        tbaAddress,
        numberOfTransaction / 3,
        bora721
      );

      // Step 2: TBA call execute() ${numberOfTransaction} times to transfer ${numberOfTransaction} ERC721 tokens to User 2
      mlog.log(
        "[TBA Account]",
        "calls execute()",
        numberOfTransaction,
        "times to transfer",
        numberOfTransaction,
        "ERC721 tokens to User 2"
      );
      for (let i = 0; i < numberOfTransaction; i++) {
        data = iface721.encodeFunctionData("transferFrom", [
          tbaAddress,
          User2.address,
          tokenIds[i],
        ]);
        await tba.connect(User1).execute(bora721.target, 0, data, 0);
        Util.showProgress(i + 1, numberOfTransaction);
      }
      Util.clearProgress();

      // Step 3: Verify token balance of TBA account is 0
      expect(await bora721.balanceOf(tbaAddress)).to.be.equal(0);

      // Step 4: Verify token balance of User 2 is ${numberOfTransaction}
      expect(await bora721.balanceOf(User2.address)).to.be.equal(
        numberOfTransaction
      );

      mlog.after(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );
      mlog.after(
        "[User 2]",
        "balance:",
        await bora721.balanceOf(User2.address)
      );
    }

    it("Should be successful when transferring from 300 times at the same time.", async function () {
      await transferFrom(this.mlog, 300);
    });

    it("Should be successful when transferring from 3000 times at the same time.", async function () {
      await transferFrom(this.mlog, 3000);
    });

    it("Should be successful when transferring from 5001 times at the same time.", async function () {
      await transferFrom(this.mlog, 5001);
    });

    // TODO: Out of memory
    it.skip("Should be successful when transferring from 30.000 times at the same time.", async function () {
      await transferFrom(this.mlog, 30000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when transferring from 300.000 times at the same time.", async function () {
      await transferFrom(this.mlog, 300000);
    });
  });

  describe("Stress Testing - Execute - Burn ERC721", async function () {
    async function burnFrom(mlog: mlog, numberOfTransaction: number) {
      mlog.before(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      // Step 1: TBA calls execute() ${numberOfTransaction / 3} times to mint ${numberOfTransaction} ERC721 tokens
      mlog.log(
        "[TBA Account]",
        "calls execute()",
        numberOfTransaction / 3,
        "times to mint",
        numberOfTransaction,
        "ERC721 tokens"
      );
      let tokenIds = await Util.executeMintMulti721(
        tba,
        tbaAddress,
        numberOfTransaction / 3,
        bora721
      );

      // Step 2: TBA call execute() ${numberOfTransaction} times to burn ${numberOfTransaction} ERC721 tokens
      mlog.log(
        "[TBA Account]",
        "calls execute()",
        numberOfTransaction,
        "times to burn",
        numberOfTransaction,
        "ERC721 tokens"
      );
      for (let i = 0; i < numberOfTransaction; i++) {
        data = iface721.encodeFunctionData("transferFrom", [
          tbaAddress,
          User2.address,
          tokenIds[i],
        ]);
        await tba.connect(User1).execute(bora721.target, 0, data, 0);
        Util.showProgress(i + 1, numberOfTransaction);
      }
      Util.clearProgress();

      // Step 3: Verify token balance of TBA account is 0
      expect(await bora721.balanceOf(tbaAddress)).to.be.equal(0);

      mlog.after(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );
    }

    it("Should be successful when burning 300 times at the same time.", async function () {
      await burnFrom(this.mlog, 300);
    });

    it("Should be successful when burning 300 times at the same time.", async function () {
      await burnFrom(this.mlog, 3000);
    });

    it("Should be successful when burning 5001 times at the same time.", async function () {
      await burnFrom(this.mlog, 5001);
    });
    // TODO: out of memory
    it.skip("Should be successful when burning 30.000 times at the same time.", async function () {
      await burnFrom(this.mlog, 30000);
    });

    // TODO: out of memory
    it.skip("Should be successful when burning 300.000 times at the same time.", async function () {
      await burnFrom(this.mlog, 300000);
    });
  });

  describe("Stress Testing - Execute - Mint ERC1155", async function () {
    async function tbaMint1155(mlog: mlog, numberOfTransaction: number) {
      mlog.before(
        "[TBA Account]",
        "tokens balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      // Step 1: TBA calls execute() ${numberOfTransaction} times to mint erc1155 token with amount is 1
      mlog.log(
        "[TBA Account]",
        `calls execute() ${numberOfTransaction} times to mint erc1155 token with amount is 1`
      );
      await Util.executeMintMulti1155(
        tba,
        tbaAddress,
        1,
        "0x",
        numberOfTransaction,
        bora1155
      );

      // Step 2: Verify token balance of TBA account is ${numberOfTransaction}
      expect(await bora1155.tokenCountOf(tbaAddress)).to.be.equal(
        numberOfTransaction * 5
      );
      mlog.after(
        "[TBA Account]",
        "tokens balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
    }

    it("Should be successful when mint 100 times at the same time", async function () {
      await tbaMint1155(this.mlog, 100);
    });

    it("Should be successful when mint 1.000 times at the same time", async function () {
      await tbaMint1155(this.mlog, 1000);
    });

    it("Should be successful when mint 5.000 times at the same time", async function () {
      await tbaMint1155(this.mlog, 5000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when mint 10.000 times at the same time", async function () {
      await tbaMint1155(this.mlog, 10000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when mint 100.000 times at the same time", async function () {
      await tbaMint1155(this.mlog, 100000);
    });
  });

  describe("Stress Testing - Execute - Safe Transfer From ERC1155", async function () {
    async function transfer1155(mlog: mlog, numberOfTransaction: number) {
      const mintTimes = numberOfTransaction / 5;

      // Step 1: TBA calls execute() ${mintTimes} times to mint erc1155 token
      const tokenIds = await Util.executeMintMulti1155(
        tba,
        tbaAddress,
        1,
        "0x",
        mintTimes,
        bora1155
      );
      mlog.before(
        "[TBA Account]",
        "tokens balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
      mlog.before(
        "[User 2]",
        "tokens balance:",
        await bora1155.tokenCountOf(User2.address)
      );

      // Step 2: TBA call execute() ${numberOfTransaction} times to transfer token to User 2 with amount is 1
      mlog.log(
        "[TBA Account]",
        `calls execute() ${numberOfTransaction} times to transfer token to User 2 with amount is 1`
      );
      for (let i = 0; i < numberOfTransaction; ++i) {
        let data = iface1155.encodeFunctionData("safeTransferFrom", [
          tbaAddress,
          User2.address,
          tokenIds[i],
          1,
          "0x",
        ]);
        await tba.execute(await bora1155.getAddress(), 0, data, 0);
        Util.showProgress(i, numberOfTransaction);
      }
      Util.clearProgress();

      // Step 3: Verify token balance of TBA account is 0
      expect(await bora1155.tokenCountOf(tbaAddress)).to.be.equal(0);

      // Step 4: Verify token balance of User 2 is ${numberOfTransaction}
      expect(await bora1155.tokenCountOf(User2)).to.be.equal(
        numberOfTransaction
      );
      mlog.after(
        "[TBA Account]",
        "tokens balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
      mlog.after(
        "[User 2]",
        "tokens balance:",
        await bora1155.tokenCountOf(User2)
      );
    }

    it("Should be successful when safe transfer from 500 times at the same time", async function () {
      await transfer1155(this.mlog, 500);
    });

    it("Should be successful when safe transfer from 5.000 times at the same time", async function () {
      await transfer1155(this.mlog, 5000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when safe transfer from 50.000 times at the same time", async function () {
      await transfer1155(this.mlog, 50000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when safe transfer from 500.000 times at the same time", async function () {
      await transfer1155(this.mlog, 500000);
    });
  });

  describe("Stress Testing - Execute - Burn ERC1155", async function () {
    async function burn(mlog: mlog, numberOfTransaction: number) {
      mlog.before(
        "[TBA Account]",
        "token erc1155 balance",
        await bora1155.tokenCountOf(tbaAddress)
      );

      // Step 1: TBA call execute() ${numberOfTransaction} times to mint erc1155 token with amount is 1
      mlog.log(
        "[TBA Account]",
        `calls execute() to mint ${numberOfTransaction} token to TBA`
      );
      const mintAmount = 1;
      const tokenIds = await Util.executeMintMulti1155(
        tba,
        tbaAddress,
        mintAmount,
        emptyData,
        numberOfTransaction / 5,
        bora1155
      );
      mlog.log(
        "[TBA Account]",
        "token erc1155 balance",
        await bora1155.tokenCountOf(tbaAddress)
      );

      // Step 2: TBA calls execute() to burn ${numberOfTransaction} times with amount is 1
      mlog.log(
        "[TBA Account]",
        `calls execute() to burn ${numberOfTransaction} times with amount is 1`
      );
      const burnAmount = 1;
      for (let i = 0; i < numberOfTransaction; i++) {
        data = iface1155.encodeFunctionData("burn", [tokenIds[i], burnAmount]);
        await tba.execute(await bora1155.getAddress(), 0, data, 0);
        Util.showProgress(i + 1, numberOfTransaction);
      }
      Util.clearProgress();

      // Step 3: Verify token balance of TBA account is 0
      expect(await bora1155.tokenCountOf(tbaAddress)).to.be.equal(0);

      mlog.after(
        "[TBA Account]",
        "token erc1155 balance",
        await bora1155.tokenCountOf(tbaAddress)
      );
    }

    it("Should be successful when burning 500 times at the same time", async function () {
      await burn(this.mlog, 500);
    });

    it("Should be successful when burning 5.000 times at the same time", async function () {
      await burn(this.mlog, 5000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when burning 50.000 times at the same time", async function () {
      await burn(this.mlog, 50000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when burning 500.000 times at the same time", async function () {
      await burn(this.mlog, 500000);
    });
  });

  describe("Stress Testing - Execute - Transfer Coin", async function () {
    async function transferCoin(mlog: mlog, numberOfTransaction: number) {
      mlog.before(
        "[TBA Account]",
        "balance",
        await ethers.provider.getBalance(tbaAddress)
      );
      mlog.before(
        "[User 2]",
        "balance",
        await ethers.provider.getBalance(User2.address)
      );

      // Step 1: User 1 transfers ${numberOfTransaction} wei to TBA
      const transferCoin = numberOfTransaction * 10;
      mlog.log("[User 1]", `transfer ${transferCoin} wei to TBA`);
      await User1.sendTransaction({
        to: tbaAddress,
        value: `${transferCoin}`,
      });
      mlog.log(
        "[TBA Account]",
        "balance",
        await ethers.provider.getBalance(tbaAddress)
      );

      // Step 2: TBA calls transferCoin ${numberOfTransaction} times with amount is 10 to transfer coin to User 2
      mlog.log(
        "[TBA Account]",
        `calls transferCoin ${numberOfTransaction} times with amount is 10 to User 2`
      );
      const transferAmount = 10;
      const user2CoinBalanceBefore = await ethers.provider.getBalance(
        User2.address
      );
      for (let i = 0; i < numberOfTransaction; i++) {
        await tba.transferCoin(User2.address, transferAmount);
        Util.showProgress(i + 1, numberOfTransaction);
      }
      Util.clearProgress();

      // Step 3: Verify token balance of TBA account is 0
      expect(await ethers.provider.getBalance(tbaAddress)).to.be.equal(0);
      expect(await ethers.provider.getBalance(User2.address)).to.be.equal(
        user2CoinBalanceBefore + BigInt(transferCoin)
      );

      mlog.after(
        "[TBA Account]",
        "balance",
        await ethers.provider.getBalance(tbaAddress)
      );
      mlog.after(
        "[User 2]",
        "balance",
        await ethers.provider.getBalance(User2.address)
      );
    }

    it("Should be successful when transferCoin() 100 times at the same time.", async function () {
      await transferCoin(this.mlog, 100);
    });

    it("Should be successful when transferCoin() 1.000 times at the same time.", async function () {
      await transferCoin(this.mlog, 100);
    });

    it("Should be successful when transferCoin() 5.000 times at the same time.", async function () {
      await transferCoin(this.mlog, 5000);
    });

    it("Should be successful when transferCoin() 10.000 times at the same time.", async function () {
      await transferCoin(this.mlog, 10000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when transferCoin() 100.000 times at the same time.", async function () {
      await transferCoin(this.mlog, 100000);
    });
  });

  describe("Stress Testing - Transfer721", async function () {
    async function transfer721(mlog: mlog, numberOfTransaction: number) {
      mlog.before(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      mlog.before(
        "[User 2]",
        "balance:",
        await bora721.balanceOf(User2.address)
      );

      // Step 1: Owner of ERC721 mint ${numberOfTransaction * 3} tokens to TBA
      mlog.log(
        "[Owner of ERC721]",
        `mint ${numberOfTransaction * 3} tokens to TBA`
      );
      let tokenIds = await Util.mintMulti721(
        tbaAddress,
        numberOfTransaction,
        bora721
      );
      mlog.log(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      // Step 2: TBA calls transfer721() ${numberOfTransaction * 3} times to transfer tokens to User 2
      mlog.log(
        "[TBA Account]",
        `calls transfer721() ${
          numberOfTransaction * 3
        } times to transfer tokens to User 2`
      );
      for (let i = 0; i < numberOfTransaction * 3; i++) {
        await tba.transfer721(bora721.target, User2.address, tokenIds[i]);
        Util.showProgress(i + 1, numberOfTransaction * 3);
      }
      Util.clearProgress();

      // Step 3: Verify token balance of TBA is 0
      expect(await bora721.balanceOf(tbaAddress)).to.be.equals(0);

      // Step 4: Verify token balance of User 2 is ${numberOfTransaction * 3}
      expect(await bora721.balanceOf(User2.address)).to.be.equals(
        numberOfTransaction * 3
      );

      mlog.after(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      mlog.after(
        "[User 2]",
        "balance:",
        await bora721.balanceOf(User2.address)
      );
    }

    it("Should be successful when transfer721() 300 times at the same time", async function () {
      await transfer721(this.mlog, 100);
    });

    it("Should be successful when transfer721() 3000 times at the same time", async function () {
      await transfer721(this.mlog, 1000);
    });

    it("Should be successful when transfer721() 5001 times at the same time", async function () {
      await transfer721(this.mlog, 1667);
    });

    // TODO: Out of memory
    it.skip("Should be successful when transfer721() 30000 times at the same time", async function () {
      await transfer721(this.mlog, 10000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when transfer721() 300000 times at the same time", async function () {
      await transfer721(this.mlog, 100000);
    });
  });

  describe("Stress Testing - Transfer20", async function () {
    async function transfer20(mlog: mlog, numberOfTransaction: number) {
      mlog.before(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );

      mlog.before(
        "[User 2]",
        "balance:",
        await bora20.balanceOf(User2.address)
      );

      // Step 1: Owner of ERC20 mint ${numberOfTransaction} tokens to TBA
      mlog.log("[Owner of ERC20]", `mint ${numberOfTransaction} tokens to TBA`);
      await bora20.mint(tbaAddress, numberOfTransaction);
      mlog.log("[TBA Account]", "balance:", await bora20.balanceOf(tbaAddress));

      // Step 2: TBA calls transfer20() ${numberOfTransaction} times to transfer tokens to User 2
      mlog.log(
        "[TBA Account]",
        `calls transfer20() ${numberOfTransaction} times with amount is 1 to transfer tokens to User 2`
      );
      for (let i = 0; i < numberOfTransaction; i++) {
        await tba.transfer20(bora20.target, User2.address, 1);
        Util.showProgress(i + 1, numberOfTransaction);
      }
      Util.clearProgress();

      // Step 3: Verify token balance of TBA is 0
      expect(await bora20.balanceOf(tbaAddress)).to.be.equals(0);

      // Step 4: Verify token balance of User 2 is ${numberOfTransaction}
      expect(await bora20.balanceOf(User2.address)).to.be.equals(
        numberOfTransaction
      );

      mlog.after(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );

      mlog.after("[User 2]", "balance:", await bora20.balanceOf(User2.address));
    }

    it("Should be successful when transfer20() 300 times at the same time", async function () {
      await transfer20(this.mlog, 300);
    });

    it("Should be successful when transfer20() 3000 times at the same time", async function () {
      await transfer20(this.mlog, 3000);
    });

    it("Should be successful when transfer20() 5000 times at the same time", async function () {
      await transfer20(this.mlog, 5000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when transfer20() 30000 times at the same time", async function () {
      await transfer20(this.mlog, 30000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when transfer20() 300000 times at the same time", async function () {
      await transfer20(this.mlog, 300000);
    });
  });

  describe("Stress Testing - Transfer1155", async function () {
    async function transfer1155(mlog: mlog, numberOfTransaction: number) {
      mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
      mlog.before(
        "[User 2]",
        "balance:",
        await bora1155.tokenCountOf(User2.address)
      );

      // Step 1: Owner of ERC1155 mint ${numberOfTransaction} token id with amount of each is 1.000 to TBA.
      mlog.log(
        "[Owner of ERC1155]",
        "mint",
        numberOfTransaction,
        "token id with amount of each is 1.000 to TBA."
      );
      const amount = 1000;
      const emptyData = "0x";
      let tokenIds = await Util.mintMulti1155(
        tbaAddress,
        amount,
        emptyData,
        numberOfTransaction / 5,
        bora1155
      );

      // Step 2: TBA calls transfer1155() ${numberOfTransaction} times with an amount of 1.000 to transfer tokens to User 2.
      mlog.log(
        "[TBA Account]",
        "calls transfer1155()",
        numberOfTransaction,
        "times with an amount of 1.000 to transfer tokens to User 2."
      );
      for (let i = 0; i < numberOfTransaction; i++) {
        await tba
          .connect(User1)
          .transfer1155(
            bora1155.target,
            User2.address,
            tokenIds[i],
            amount,
            emptyData
          );
        Util.showProgress(i + 1, numberOfTransaction);
      }
      Util.clearProgress();

      // Step 3: Verify token balance of TBA is 0.
      expect(await bora1155.tokenCountOf(tbaAddress)).to.be.equal(0);

      // Step 4: Verify User 2 token balance of each id is 1.000.
      for (let i = 0; i < numberOfTransaction; i++) {
        expect(
          await bora1155.balanceOf(User2.address, tokenIds[i])
        ).to.be.equal(amount);
        Util.showProgress(i + 1, numberOfTransaction);
      }
      Util.clearProgress();

      mlog.after(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
      mlog.after(
        "[User 2]",
        "balance:",
        await bora1155.tokenCountOf(User2.address)
      );
    }

    it("Should be successful when transfer1155() 500 times at the same time.", async function () {
      await transfer1155(this.mlog, 500);
    });

    it("Should be successful when transfer1155() 5.000 times at the same time.", async function () {
      await transfer1155(this.mlog, 5000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when transfer1155() 50.000 times at the same time.", async function () {
      await transfer1155(this.mlog, 50000);
    });

    // TODO: Out of memory
    it.skip("Should be successful when transfer1155() 500.000 times at the same time.", async function () {
      await transfer1155(this.mlog, 500000);
    });
  });
});
