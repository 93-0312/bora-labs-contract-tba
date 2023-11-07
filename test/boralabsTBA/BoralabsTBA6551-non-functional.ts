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

  let owner20: HardhatEthersSigner;

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
    "function transfer(address to, uint256 amount)",
    "function tbaMint(address to, uint256 amount, bytes memory data)",
  ]);

  beforeEach(async function () {
    // deploy bora20
    ({ bora20, owner20 } = await loadFixture(deployBora20));

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

    // Out of memory
    it.skip("Should be successful when create 30.000 TBA at the same time", async function () {
      await createAccount(this.mlog, 30000);
    });

    // Out of memory
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

    // Out of memory
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

    // Out of memory
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

    // Out of memory
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

    // Out of memory
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

    // Out of memory
    it.skip("Should be successful when transferring from 30.000 times at the same time.", async function () {
      await transferFrom(this.mlog, 30000);
    });

    // Out of memory
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
    // Out of memory
    it.skip("Should be successful when burning 30.000 times at the same time.", async function () {
      await burnFrom(this.mlog, 30000);
    });

    // Out of memory
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

    // Out of memory
    it.skip("Should be successful when mint 10.000 times at the same time", async function () {
      await tbaMint1155(this.mlog, 10000);
    });

    // Out of memory
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

    // Out of memory
    it.skip("Should be successful when safe transfer from 50.000 times at the same time", async function () {
      await transfer1155(this.mlog, 50000);
    });

    // Out of memory
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

    // Out of memory
    it.skip("Should be successful when burning 50.000 times at the same time", async function () {
      await burn(this.mlog, 50000);
    });

    // Out of memory
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

    // Out of memory
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

    // Out of memory
    it.skip("Should be successful when transfer721() 30000 times at the same time", async function () {
      await transfer721(this.mlog, 10000);
    });

    // Out of memory
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

    // Out of memory
    it.skip("Should be successful when transfer20() 30000 times at the same time", async function () {
      await transfer20(this.mlog, 30000);
    });

    // Out of memory
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

    // Out of memory
    it.skip("Should be successful when transfer1155() 50.000 times at the same time.", async function () {
      await transfer1155(this.mlog, 50000);
    });

    // Out of memory
    it.skip("Should be successful when transfer1155() 500.000 times at the same time.", async function () {
      await transfer1155(this.mlog, 500000);
    });
  });

  describe("Authentication Testing", async function () {
    it("Should be successful when the owner accesses all functions", async function () {
      this.mlog.before(
        "[TBA account]",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress),
        "ERC20 Token balance:",
        await bora20.balanceOf(tbaAddress),
        "ERC721 Token balance:",
        await bora721.balanceOf(tbaAddress),
        "ERC1155 Token balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      this.mlog.before(
        "[User 2]",
        "Native token balance:",
        await ethers.provider.getBalance(User2),
        "ERC20 Token balance:",
        await bora20.balanceOf(User2),
        "ERC721 Token balance:",
        await bora721.balanceOf(User2),
        "ERC1155 Token balance:",
        await bora1155.tokenCountOf(User2)
      );

      // Execute
      // Step 1: Owner of ERC20 mint token ERC20 with an amount of 1.000 for TBA account
      this.mlog.log(
        "[Owner of ERC20]",
        "mint token ERC20 with an amount of 1.000 for TBA account"
      );
      await bora20.mint(tbaAddress, 1000);

      // Step 2: Verify TBA token ERC20 balance amount is 1.000
      expect(await bora20.balanceOf(tbaAddress)).to.be.equal(1000);

      // Transfer Coin
      // Step 3: User 1 transfers 1.000  wei to TBA
      this.mlog.log("[User 1]", "transfers 1.000  wei to TBA");
      User1.sendTransaction({
        to: tbaAddress,
        value: 1000,
      });

      // Step 4: User 1 calls transferCoin() in TBA with an amount of 1.000 wei to User 2
      this.mlog.log(
        "[User 1]",
        "calls transferCoin() in TBA with an amount of 1.000 wei to User 2"
      );
      await tba.connect(User1).transferCoin(User2, 1000);

      // Step 5: Verify TBA balance amount is 0
      expect(await ethers.provider.getBalance(tbaAddress)).to.be.equal(0);

      // Step 6: Verify User 2 balance increase 1000 wei
      expect(await ethers.provider.getBalance(User2));

      // Transfer 20
      // Step 7: User 1 calls transfer20() in TBA to transfer token ERC20 with amount is 1.000 to User 2
      this.mlog.log(
        "[User 1]",
        "calls transfer20() in TBA to transfer token ERC20 with amount is 1.000 to User 2"
      );
      await tba
        .connect(User1)
        .transfer20(await bora20.getAddress(), User2.address, 1000);

      // Step 8: Verify TBA token ERC20 balance amount is 0
      expect(await bora20.balanceOf(tbaAddress)).to.be.equal(0);

      // Step 9: Verify User 2 token ERC20 balance amount is 1000
      expect(await bora20.balanceOf(User2)).to.be.equal(1000);

      // Transfer 721
      // Step 10: User 1 calls execute() in TBA to tbaMint() 3 token ERC721 ids (10000002, 20000002, 30000002)
      this.mlog.log(
        "[User 1]",
        "calls execute() in TBA to tbaMint() 3 token ERC721 ids (10000002, 20000002, 30000002)"
      );
      data = iface721.encodeFunctionData("tbaMint", [tbaAddress]);
      await tba.connect(User1).execute(await bora721.getAddress(), 0, data, 0);

      // Step 11: User 1 calls transfer721() to transfer token id 10000002 to User 2
      this.mlog.log(
        "[User 1]",
        "calls transfer721() to transfer token id 10000002 to User 2"
      );
      await tba
        .connect(User1)
        .transfer721(await bora721.getAddress(), User2.address, 10000002);

      // Step 12: Verify TBA token ERC721 balance is 2
      expect(await bora721.balanceOf(tbaAddress)).to.be.equal(2);

      // Step 13: Verify User 2 token ERC721 balance is 1
      expect(await bora721.balanceOf(User2)).to.be.equal(1);

      // Transfer 1155
      // Step 14: User 1 calls execute() in TBA to tbaMint() 5 token ERC1155 ids
      // (10000001, 20000001, 30000001, 40000001, 50000001) with an amount of 1.000
      this.mlog.log(
        "[User 1]",
        "calls execute() in TBA to tbaMint() 5 token ERC1155 ids (10000001, 20000001, 30000001, 40000001, 50000001) with an amount of 1.000"
      );
      const data1155Mint = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress,
        1000,
        "0x",
      ]);
      await tba
        .connect(User1)
        .execute(await bora1155.getAddress(), 0, data1155Mint, 0);

      // Step 15: User 1 calls transfer1155() to transfer token id 10000001 with an amount of 1.000 to User 2
      this.mlog.log(
        "[User 1]",
        "calls transfer1155() to transfer token id 10000001 with an amount of 1.000 to User 2"
      );
      await tba
        .connect(User1)
        .transfer1155(
          await bora1155.getAddress(),
          User2.address,
          10000001,
          1000,
          "0x"
        );

      // Step 16: Verify TBA token ERC1155 balance id 10000001 amount is 0
      expect(await bora1155.balanceOf(tbaAddress, 10000001)).to.be.equal(0);

      // Step 17: Verify User 2 token ERC1155 balance id 10000001 amount is 1000
      expect(await bora1155.balanceOf(User2.address, 10000001)).to.be.equal(
        1000
      );

      this.mlog.after(
        "[TBA account]",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress),
        "ERC20 Token balance:",
        await bora20.balanceOf(tbaAddress),
        "ERC721 Token balance:",
        await bora721.balanceOf(tbaAddress),
        "ERC1155 Token balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      this.mlog.after(
        "[User 2]",
        "Native token balance:",
        await ethers.provider.getBalance(User2),
        "ERC20 Token balance:",
        await bora20.balanceOf(User2),
        "ERC721 Token balance:",
        await bora721.balanceOf(User2),
        "ERC1155 Token balance:",
        await bora1155.tokenCountOf(User2)
      );
    });

    it("Should be failed when non-owner users access all functions", async function () {
      this.mlog.before(
        "[TBA account]",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress),
        "ERC20 Token balance:",
        await bora20.balanceOf(tbaAddress),
        "ERC721 Token balance:",
        await bora721.balanceOf(tbaAddress),
        "ERC1155 Token balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      this.mlog.before(
        "[User 2]",
        "Native token balance:",
        await ethers.provider.getBalance(User2),
        "ERC20 Token balance:",
        await bora20.balanceOf(User2),
        "ERC721 Token balance:",
        await bora721.balanceOf(User2),
        "ERC1155 Token balance:",
        await bora1155.tokenCountOf(User2)
      );

      // Step 1: User 1 transfer token 10000001(which has TBA) to User 2
      await bora721
        .connect(User1)
        .transferFrom(User1.address, User2.address, 10000001);

      // Execute
      // Step 2: Owner of ERC20 mint token ERC20 with an amount of 1000 to TBA
      this.mlog.log(
        "[Owner of ERC20]",
        "mint token ERC20 with an amount of 1.000 for TBA account"
      );
      await bora20.mint(tbaAddress, 1000);

      // Step 3: Verify TBA token ERC20 balance amount is 1.000
      expect(await bora20.balanceOf(tbaAddress)).to.be.equal(1000);

      // Transfer Coin
      // Step 4: User 1 transfers 1.000  wei to TBA
      this.mlog.log("[User 1]", "transfers 1.000  wei to TBA");
      User1.sendTransaction({
        to: tbaAddress,
        value: 1000,
      });

      // Step 5: User 1 calls transferCoin() in TBA with an amount is 10 wei to User 2
      // Step 6: Verify the transaction revert with error message “Ownable: caller is not the owner”
      this.mlog.log(
        "[User 1]",
        "calls transferCoin() in TBA with an amount is 10 wei to User 2"
      );
      let user2BalanceBefore = await ethers.provider.getBalance(User2);
      await expect(
        tba.connect(User1).transferCoin(User2, 10)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Step 7: Verify User 2 balance is not changed
      expect(await ethers.provider.getBalance(User2)).to.equal(
        user2BalanceBefore
      );

      // Transfer 20
      // Step 8: User 1 calls transfer20() in TBA to transfer token ERC20 with amount is 1.000 from TBA to User 2
      // Step 9: Verify the transaction revert with error message “Ownable: caller is not the owner”
      this.mlog.log(
        "[User 1]",
        "calls transfer20() in TBA to transfer token ERC20 with amount is 1.000 from TBA to User 2"
      );
      user2BalanceBefore = await bora20.balanceOf(User2);
      await expect(
        tba
          .connect(User1)
          .transfer20(await bora20.getAddress(), User2.address, 1000)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Step 10: Verify User 2 token ERC20 balance is not changed
      expect(await bora20.balanceOf(User2)).to.be.equal(user2BalanceBefore);

      // Transfer 721
      // Step 11: User 2 calls execute() in TBA to tbaMint() 3 token ERC721
      // ids (10000002, 20000002, 30000002) to TBA
      this.mlog.log(
        "[User 2]",
        "calls execute() in TBA to tbaMint() 3 token ERC721 ids (10000002, 20000002, 30000002) to TBA"
      );
      data = iface721.encodeFunctionData("tbaMint", [tbaAddress]);
      await tba.connect(User2).execute(await bora721.getAddress(), 0, data, 0);

      // Step 12: User 1 calls transfer721() in TBA to transfer token id 10000002 from TBA to User 2.
      // Step 13: Verify the transaction revert with error message “Ownable: caller is not the owner”
      this.mlog.log(
        "[User 1]",
        "calls transfer721() in TBA to transfer token id 10000002 from TBA to User 2"
      );
      user2BalanceBefore = await bora721.balanceOf(User2);
      await expect(
        tba
          .connect(User1)
          .transfer721(await bora721.getAddress(), User2.address, 10000002)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Step 14: Verify User 2 token ERC721 balance is not changed
      expect(await bora721.balanceOf(User2)).to.be.equal(user2BalanceBefore);

      // Transfer 1155
      // Step 15: User 2 calls execute() in TBA to tbaMint() 5 token ERC1155
      // ids (10000001, 20000001, 30000001, 40000001, 50000001) with an amount of 1.000 to TBA
      this.mlog.log(
        "[User 2]",
        "calls execute() in TBA to tbaMint() 5 token ERC1155 ids (10000001, 20000001, 30000001, 40000001, 50000001) with an amount of 1.000 to TBA"
      );
      const data1155Mint = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress,
        1000,
        "0x",
      ]);
      await tba
        .connect(User2)
        .execute(await bora1155.getAddress(), 0, data1155Mint, 0);

      // Step 16: User 1 calls transfer1155() to transfer token id 10000001 with an amount of 1.000 from TBA to User 2.
      // Step 17: Verify the transaction revert with error message “Ownable: caller is not the owner”
      this.mlog.log(
        "[User 1]",
        "calls transfer1155() to transfer token id 10000001 with an amount of 1.000 from TBA to User 2"
      );
      await expect(
        tba
          .connect(User1)
          .transfer1155(
            await bora1155.getAddress(),
            User2.address,
            10000001,
            1000,
            "0x"
          )
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Step 18: Verify User 1 token ERC1155 balance id 10000001 amount is 0
      expect(await bora1155.balanceOf(User2, 10000001)).to.be.equal(0);

      this.mlog.after(
        "[TBA account]",
        "Native token balance:",
        await ethers.provider.getBalance(tbaAddress),
        "ERC20 Token balance:",
        await bora20.balanceOf(tbaAddress),
        "ERC721 Token balance:",
        await bora721.balanceOf(tbaAddress),
        "ERC1155 Token balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      this.mlog.after(
        "[User 2]",
        "Native token balance:",
        await ethers.provider.getBalance(User2),
        "ERC20 Token balance:",
        await bora20.balanceOf(User2),
        "ERC721 Token balance:",
        await bora721.balanceOf(User2),
        "ERC1155 Token balance:",
        await bora1155.tokenCountOf(User2)
      );
    });
  });

  describe("Load Testing - Create Account", async function () {
    async function createAccountForMultiUser(mlog: mlog, numberOfUser: number) {
      // Create ${numberOfUser} users
      const users = await Util.createMultiUser(numberOfUser);

      // Step 1: Owner of ERC721 mint ${numberOfUser * 3} tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721]",
        `mint ${numberOfUser * 3} tokens for ${numberOfUser} users`
      );
      const tokenIdsArr = await Util.mintMulti721ForMultiUser(
        users,
        1,
        bora721
      );
      let tokenIds: number[] = ([] as number[]).concat(...tokenIdsArr);

      mlog.before(
        "Numbers [TBA accounts] :",
        await Util.getTotalTBA(tokenIds, bora721, bora6551Registry)
      );

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser * 3} TBA accounts
      mlog.log(
        `[${numberOfUser} User]`,
        `use createAccount() to create ${numberOfUser * 3} TBA accounts`
      );

      for (let i = 0; i < users.length; ++i) {
        await Util.createMultiTBA(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIdsArr[i],
          0,
          users[i]
        );
        Util.showProgress(i + 1, users.length);
      }
      Util.clearProgress();

      const numberOfTBA = numberOfUser * Number(await bora721.oneTimeMintNum());
      // Step 3: Verify ${numOfAccounts} TBA accounts have created
      const totalTBA = await Util.getTotalTBA(
        tokenIds,
        bora721,
        bora6551Registry
      );
      expect(totalTBA).to.be.equal(numberOfTBA);
      mlog.after("Numbers [TBA accounts]", "of User 2:", totalTBA);
    }

    it("Should be successful when 100 users create TBA account at the same times", async function () {
      await createAccountForMultiUser(this.mlog, 100);
    });

    it("Should be successful when 500 users create TBA account at the same times", async function () {
      await createAccountForMultiUser(this.mlog, 500);
    });

    // Out of memory
    it.skip("Should be successful when 1.000 users create TBA account at the same times", async function () {
      await createAccountForMultiUser(this.mlog, 1000);
    });

    // Out of memory
    it.skip("Should be successful when 10.000 users create TBA account at the same times", async function () {
      await createAccountForMultiUser(this.mlog, 10000);
    });

    // Out of memory
    it.skip("Should be successful when 100.000 users create TBA account at the same times", async function () {
      await createAccountForMultiUser(this.mlog, 100000);
    });
  });

  describe("Load Testing - Execute - Mint ERC20", async function () {
    async function mint(mlog: mlog, numberOfUser: number) {
      mlog.before(
        "[BoralabsTBA20]",
        "total supply",
        await bora20.totalSupply()
      );

      // Step 1: Owner of ERC721 mint ${numberOfUser} * 3 tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721]",
        ` mint ${numberOfUser * 3} tokens for ${numberOfUser} users`
      );
      const mintTimes = 1;
      const users = await Util.createMultiUser(numberOfUser);
      await Util.mintMulti721ForMultiUser(users, mintTimes, bora721);

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser} * 3 TBA accounts
      mlog.log(
        `[${numberOfUser} users]`,
        `use createAccount() create 
        ${numberOfUser * 3} TBA account`
      );
      let tbaAccounts: any[] = [];
      for (let i = 0; i < users.length; ++i) {
        const tokenIds = await bora721.tokensOf(users[i]);
        const TBAs = await Util.createMultiTBA(
          await bora6551Account.getAddress(),
          bora6551Registry,
          await bora721.getAddress(),
          tokenIds,
          0,
          users[i]
        );
        tbaAccounts.push(...TBAs);
        Util.showProgress(i + 1, users.length);
      }
      Util.clearProgress();

      // Step 3: Owner of ERC20 mint token ERC20 with amount is 1 to each TBA
      mlog.log(
        "[Owner of ERC20]",
        "mint token ERC20 with amount is 1 to each TBA"
      );
      const mintAmount = 1;
      for (let i = 0; i < tbaAccounts.length; i++) {
        await bora20.mint(tbaAccounts[i], mintAmount);
        Util.showProgress(i + 1, tbaAccounts.length);
      }
      Util.clearProgress();

      // Step 4: Verify token balance of all TBA accounts is 1.
      for (let i = 0; i < tbaAccounts.length; i++) {
        expect(await bora20.balanceOf(tbaAccounts[i])).to.be.equal(mintAmount);
        Util.showProgress(i + 1, tbaAccounts.length);
      }
      Util.clearProgress();
      mlog.after("[BoralabsTBA20]", "total supply", await bora20.totalSupply());
    }

    it("Should be successful when 100 users mint at the same time.", async function () {
      await mint(this.mlog, 100);
    });

    it("Should be successful when 400 users mint at the same time.", async function () {
      await mint(this.mlog, 400);
    });

    // Time out
    it("Should be successful when 1.000 users mint at the same time.", async function () {
      await mint(this.mlog, 1000);
    });

    // Out of memory
    it.skip("Should be successful when 5.000 users mint at the same time.", async function () {
      await mint(this.mlog, 5000);
    });

    // Out of memory
    it.skip("Should be successful when 10.000 users mint at the same time.", async function () {
      await mint(this.mlog, 10000);
    });

    // Out of memory
    it.skip("Should be successful when 100.000 users mint at the same time.", async function () {
      await mint(this.mlog, 100000);
    });
  });

  describe("Load Testing- Execute - Transfer ERC20", async function () {
    async function transfer(mlog: mlog, numberOfUser: number) {
      mlog.before(
        "[BoralabsTBA20]",
        "total supply:",
        await bora20.totalSupply()
      );
      mlog.before(
        "[Owner of ERC20]",
        "token erc20 balance:",
        await bora20.balanceOf(owner20.address)
      );

      // Step 1: Owner of ERC721 mint ${numberOfUser} *3 tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721]",
        ` mint ${numberOfUser * 3} tokens for ${numberOfUser} users`
      );
      const mintTimes = 1;
      const users = await Util.createMultiUser(numberOfUser);
      await Util.mintMulti721ForMultiUser(users, mintTimes, bora721);

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser} * 3 TBA accounts
      let tbaAccounts: any[] = [];
      for (let i = 0; i < users.length; ++i) {
        const tokenIds = await bora721.tokensOf(users[i]);
        const TBAs = await Util.createMultiTBA(
          await bora6551Account.getAddress(),
          bora6551Registry,
          await bora721.getAddress(),
          tokenIds,
          0,
          users[i]
        );
        tbaAccounts.push(TBAs);
        Util.showProgress(i + 1, users.length);
      }
      Util.clearProgress();

      // Step 3: Owner of ERC20 contract mint token with amount is 1 to each tba
      mlog.log(
        "[Owner of ERC20]",
        "mint token ERC20 with amount is 1 to each TBA"
      );
      const mintAmount = 1;
      for (let i = 0; i < tbaAccounts.length; i++) {
        for (let j = 0; j < tbaAccounts[i].length; j++) {
          await bora20.mint(tbaAccounts[i][j], mintAmount);
        }
        Util.showProgress(i + 1, tbaAccounts.length);
      }
      Util.clearProgress();
      mlog.log("[BoralabsTBA20]", "total supply:", await bora20.totalSupply());

      // Step 4: ${numberOfUser} users call execute() to transfer token ERC20 with amount is 1 from each TBA account to Owner of ERC20 contract
      mlog.log(
        `[${numberOfUser} users]`,
        "call execute() to transfer token ERC20 with amount is 1 from each TBA account to Owner of ERC20 contract"
      );
      for (let i = 0; i < tbaAccounts.length; i++) {
        for (let j = 0; j < tbaAccounts[i].length; j++) {
          data = iface1155.encodeFunctionData("transfer", [
            owner20.address,
            mintAmount,
          ]);
          const tba = await ethers.getContractAt(
            "BoralabsTBA6551Account",
            tbaAccounts[i][j]
          );
          await tba.connect(users[i]).execute(bora20.target, 0, data, 0);
        }
        Util.showProgress(i + 1, tbaAccounts.length);
      }
      Util.clearProgress();

      // Step 5: Verify token balance of all TBA accounts is 0
      for (let i = 0; i < tbaAccounts.length; i++) {
        for (let j = 0; j < tbaAccounts[i].length; j++) {
          expect(await bora20.balanceOf(tbaAccounts[i][j])).to.be.equal(0);
        }
        Util.showProgress(i + 1, tbaAccounts.length);
      }
      Util.clearProgress();

      // Step 6: Verify token balance of Owner of ERC20 contract is ${numberOfUser} * 3
      expect(await bora20.balanceOf(owner20.address)).to.be.equal(
        numberOfUser * mintAmount * 3
      );
      mlog.after(
        "[Owner of ERC20]",
        "token erc20 balance:",
        await bora20.balanceOf(owner20.address)
      );
    }

    it("Should be successful when 100 users transfer at the same time.", async function () {
      await transfer(this.mlog, 100);
    });

    // Time out
    it.skip("Should be successful when 200 users transfer at the same time.", async function () {
      await transfer(this.mlog, 200);
    });

    // Time out
    it.skip("Should be successful when 1.000 users transfer at the same time.", async function () {
      await transfer(this.mlog, 1000);
    });

    // Out of memory
    it("Should be successful when 5.000 users transfer at the same time.", async function () {
      await transfer(this.mlog, 5000);
    });

    // Out of memory
    it.skip("Should be successful when 10.000 users transfer at the same time.", async function () {
      await transfer(this.mlog, 10000);
    });

    // Out of memory
    it.skip("Should be successful when 100.000 users transfer at the same time.", async function () {
      await transfer(this.mlog, 100000);
    });
  });
});
