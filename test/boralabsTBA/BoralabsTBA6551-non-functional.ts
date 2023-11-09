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
import { Util, ProcessName } from "../util/util";

describe("BoralabsTBA6551: Non-functional test", function () {
  mlog.injectLogger(this);

  this.timeout(300000); // 5 minutes

  let bora20: BoralabsTBA20;
  let bora721: BoralabsTBA721;
  let bora1155: BoralabsTBA1155;
  let bora6551Account: BoralabsTBA6551Account;
  let bora6551Registry: BoralabsTBA6551Registry;

  let owner20: HardhatEthersSigner;
  let owner721: HardhatEthersSigner;
  let owner1155: HardhatEthersSigner;

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
    "function burn(uint256 tokenId)",
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
    ({ bora721, owner721 } = await loadFixture(deployBora721));

    // deploy bora1155
    ({ bora1155, owner1155 } = await loadFixture(deployBora1155));

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
      const tokenIds = await Util.multiMint721(
        bora721,
        User2.address,
        mintTimes
      );

      mlog.before(
        "[TBA accounts]",
        "of User 2:",
        await Util.countTotalTBA(tokenIds, bora721, bora6551Registry)
      );

      // Step 2: User 2 uses createAccount() to create ${numberOfTransaction} from ${numberOfTransaction} tokens above
      mlog.log(
        "[User 2]",
        `uses createAccount() to create ${numberOfTransaction} TBA accounts from ${numberOfTransaction} tokens above`
      );
      await Util.createTBAs(
        bora6551Account.target,
        bora6551Registry,
        bora721.target,
        tokenIds,
        0,
        User2
      );

      // Step 3: Verify the number of TBA accounts is ${numberOfTransaction}
      const tbaAccounts = await Util.countTotalTBA(
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
        Util.showProgress(ProcessName.MINT, i + 1, numberOfTransaction);
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
        Util.showProgress(ProcessName.TRANSFER, i + 1, numberOfTransaction);
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
        Util.showProgress(ProcessName.BURN, i + 1, numberOfTransaction);
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
        Util.showProgress(ProcessName.BURN, i + 1, numberOfTransaction);
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
        Util.showProgress(ProcessName.MINT, i + 1, numberOfTransaction);
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
      let tokenIds = await Util.multiExecuteMint721(
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
        Util.showProgress(ProcessName.TRANSFER, i + 1, numberOfTransaction);
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
      let tokenIds = await Util.multiExecuteMint721(
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
        Util.showProgress(ProcessName.TRANSFER, i + 1, numberOfTransaction);
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
      await Util.multiExecuteMint1155(
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
      const tokenIds = await Util.multiExecuteMint1155(
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
        Util.showProgress(ProcessName.TRANSFER, i + 1, numberOfTransaction);
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
      const tokenIds = await Util.multiExecuteMint1155(
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
        Util.showProgress(ProcessName.BURN, i + 1, numberOfTransaction);
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
        Util.showProgress(ProcessName.TRANSFER, i + 1, numberOfTransaction);
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
      let tokenIds = await Util.multiMint721(
        bora721,
        tbaAddress,
        numberOfTransaction
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
        Util.showProgress(ProcessName.TRANSFER, i + 1, numberOfTransaction * 3);
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
        Util.showProgress(ProcessName.TRANSFER, i + 1, numberOfTransaction);
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
      let tokenIds = await Util.multiMint1155(
        bora1155,
        tbaAddress,
        amount,
        emptyData,
        numberOfTransaction / 5
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
        Util.showProgress(ProcessName.TRANSFER, i + 1, numberOfTransaction);
      }
      Util.clearProgress();

      // Step 3: Verify token balance of TBA is 0.
      expect(await bora1155.tokenCountOf(tbaAddress)).to.be.equal(0);

      // Step 4: Verify User 2 token balance of each id is 1.000.
      for (let i = 0; i < numberOfTransaction; i++) {
        expect(
          await bora1155.balanceOf(User2.address, tokenIds[i])
        ).to.be.equal(amount);
        Util.showProgress(
          ProcessName.VERIFY_BALANCE,
          i + 1,
          numberOfTransaction
        );
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

      const user2BalanceBefore = await ethers.provider.getBalance(User2);

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
      expect(await ethers.provider.getBalance(User2)).to.be.equal(
        user2BalanceBefore + 1000n
      );

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
      await tba.connect(User1).execute(bora721.target, 0, data, 0);

      // Step 11: User 1 calls transfer721() to transfer token id 10000002 to User 2
      this.mlog.log(
        "[User 1]",
        "calls transfer721() to transfer token id 10000002 to User 2"
      );
      await tba
        .connect(User1)
        .transfer721(bora721.target, User2.address, 10000002);

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
      await tba.connect(User2).execute(bora721.target, 0, data, 0);

      // Step 12: User 1 calls transfer721() in TBA to transfer token id 10000002 from TBA to User 2.
      // Step 13: Verify the transaction revert with error message “Ownable: caller is not the owner”
      this.mlog.log(
        "[User 1]",
        "calls transfer721() in TBA to transfer token id 10000002 from TBA to User 2"
      );
      user2BalanceBefore = await bora721.balanceOf(User2);
      await expect(
        tba.connect(User1).transfer721(bora721.target, User2.address, 10000002)
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
      const users = await Util.createUsers(numberOfUser);

      // Step 1: Owner of ERC721 mint ${numberOfUser * 3} tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721]",
        `mint ${numberOfUser * 3} tokens for ${numberOfUser} users`
      );
      const tokenIdsByUser = await Util.multiMint721ForMultiUser(
        users,
        1,
        bora721
      );
      let tokenIds: number[] = ([] as number[]).concat(...tokenIdsByUser);

      mlog.before(
        "Numbers [TBA accounts] :",
        await Util.countTotalTBA(tokenIds, bora721, bora6551Registry)
      );

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser * 3} TBA accounts
      mlog.log(
        `[${numberOfUser} User]`,
        `use createAccount() to create ${numberOfUser * 3} TBA accounts`
      );

      for (let i = 0; i < users.length; ++i) {
        await Util.createTBAs(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIdsByUser[i],
          0,
          users[i]
        );
        Util.showProgress(ProcessName.CREATE_TBA, i + 1, users.length);
      }
      Util.clearProgress();

      const numberOfTBA = numberOfUser * Number(await bora721.oneTimeMintNum());
      // Step 3: Verify ${numOfAccounts} TBA accounts have created
      const totalTBA = await Util.countTotalTBA(
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
      // Step 1: Owner of ERC721 mint ${numberOfUser} * 3 tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721]",
        ` mint ${numberOfUser * 3} tokens for ${numberOfUser} users`
      );
      const mintTimes = 1;
      const users = await Util.createUsers(numberOfUser);
      await Util.multiMint721ForMultiUser(users, mintTimes, bora721);

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser} * 3 TBA accounts
      mlog.log(
        `[${numberOfUser} users]`,
        `use createAccount() create 
        ${numberOfUser * 3} TBA account`
      );
      let tbaAccounts: string[] = [];
      for (let i = 0; i < users.length; ++i) {
        const tokenIds = await bora721.tokensOf(users[i]);
        const [tbasOfUser] = await Util.createTBAs(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIds,
          0,
          users[i]
        );
        tbaAccounts.push(...(tbasOfUser as string[]));
        Util.showProgress(ProcessName.CREATE_TBA, i + 1, users.length);
      }
      Util.clearProgress();

      mlog.before(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC20(bora20, tbaAccounts)
      );

      // Step 3: Owner of ERC20 mint token ERC20 with amount is 1 to each TBA
      mlog.log(
        "[Owner of ERC20]",
        "mint token ERC20 with amount is 1 to each TBA"
      );
      const mintAmount = 1;
      for (let i = 0; i < tbaAccounts.length; i++) {
        await bora20.mint(tbaAccounts[i], mintAmount);
        Util.showProgress(ProcessName.MINT, i + 1, tbaAccounts.length);
      }
      Util.clearProgress();

      // Step 4: Verify token balance of all TBA accounts is 1.
      for (let i = 0; i < tbaAccounts.length; i++) {
        expect(await bora20.balanceOf(tbaAccounts[i])).to.be.equal(mintAmount);
        Util.showProgress(
          ProcessName.VERIFY_BALANCE,
          i + 1,
          tbaAccounts.length
        );
      }
      Util.clearProgress();
      mlog.after(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC20(bora20, tbaAccounts)
      );
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
      const users = await Util.createUsers(numberOfUser);
      const tokenIdsByUser = await Util.multiMint721ForMultiUser(
        users,
        mintTimes,
        bora721
      );

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser} * 3 TBA accounts
      let tbaAccountsByUser: string[][] = [];
      let tbasOfUser: string[] = [];

      let tbaContractsByUser: BoralabsTBA6551Account[][] = [];
      let tbaContracts: BoralabsTBA6551Account[] = [];
      for (let i = 0; i < users.length; ++i) {
        [tbasOfUser, tbaContracts] = await Util.createTBAs(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIdsByUser[i],
          0,
          users[i]
        );
        tbaAccountsByUser.push(tbasOfUser as string[]);
        tbaContractsByUser.push(tbaContracts);
        Util.showProgress(ProcessName.CREATE_TBA, i + 1, users.length);
      }
      Util.clearProgress();

      let tbaAccounts: string[] = ([] as string[]).concat(...tbaAccountsByUser);
      mlog.before(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC20(bora20, tbaAccounts)
      );

      // Step 3: Owner of ERC20 contract mint token with amount is 1 to each tba
      mlog.log(
        "[Owner of ERC20]",
        "mint token ERC20 with amount is 1 to each TBA"
      );
      const mintAmount = 1;
      for (let i = 0; i < tbaAccounts.length; i++) {
        await bora20.mint(tbaAccounts[i], mintAmount);
        Util.showProgress(ProcessName.MINT, i + 1, tbaAccounts.length);
      }
      Util.clearProgress();
      mlog.log(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC20(bora20, tbaAccounts)
      );

      // Step 4: ${numberOfUser} users call execute() to transfer token ERC20 with amount is 1 from each TBA account to Owner of ERC20 contract
      mlog.log(
        `[${numberOfUser} users]`,
        "call execute() to transfer token ERC20 with amount is 1 from each TBA account to Owner of ERC20 contract"
      );

      data = iface1155.encodeFunctionData("transfer", [
        owner20.address,
        mintAmount,
      ]);
      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          await tbaContractsByUser[i][j]
            .connect(users[i])
            .execute(bora20.target, 0, data, 0);
          Util.showProgress(ProcessName.TRANSFER, i + 1, tbaAccounts.length);
        }
      }
      Util.clearProgress();

      // Step 5: Verify token balance of all TBA accounts is 0
      for (let i = 0; i < tbaAccounts.length; i++) {
        expect(await bora20.balanceOf(tbaAccounts[i])).to.be.equal(0);
        Util.showProgress(
          ProcessName.VERIFY_BALANCE,
          i + 1,
          tbaAccounts.length
        );
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
      mlog.after(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC20(bora20, tbaAccounts)
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

  describe("Load Testing- Execute - Burn ERC20", async function () {
    async function burnERC20(mlog: mlog, numberOfUser: number) {
      // Step 1: Owner of ERC721 mint ${numberOfUser} * 3 tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721]",
        ` mint ${numberOfUser * 3} tokens for ${numberOfUser} users`
      );
      const mintTimes = 1;
      const users = await Util.createUsers(numberOfUser);
      const tokenIds = await Util.multiMint721ForMultiUser(
        users,
        mintTimes,
        bora721
      );

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser} * 3 TBA accounts
      mlog.log(
        `[${numberOfUser} users]`,
        `use createAccount() create ${numberOfUser * 3} TBA account`
      );
      let tbaAccountsByUser: string[][] = [];
      let tbasOfUser: string[] = [];

      let tbaContractsByUser: BoralabsTBA6551Account[][] = [];
      let tbaContracts: BoralabsTBA6551Account[] = [];
      for (let i = 0; i < users.length; ++i) {
        [tbasOfUser, tbaContracts] = await Util.createTBAs(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIds[i],
          0,
          users[i]
        );
        tbaAccountsByUser.push(tbasOfUser);
        tbaContractsByUser.push(tbaContracts);
        Util.showProgress(ProcessName.CREATE_TBA, i + 1, users.length);
      }
      Util.clearProgress();

      let tbaAccounts: string[] = ([] as string[]).concat(...tbaAccountsByUser);
      mlog.before(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC20(bora20, tbaAccounts)
      );

      // Step 3: Owner of ERC20 mint token ERC20 with amount is 1 to each TBA
      mlog.log(
        "[Owner of ERC20]",
        "mint token ERC20 with amount is 1 to each TBA"
      );
      const mintAmount = 1;
      for (let i = 0; i < tbaAccounts.length; i++) {
        await bora20.mint(tbaAccounts[i], mintAmount);
        Util.showProgress(ProcessName.MINT, i + 1, tbaAccounts.length);
      }
      Util.clearProgress();

      // Step 4: ${numberOfUser} users call execute() to burn token ERC20 with amount is 1
      mlog.log(
        `[${numberOfUser} TBA account]`,
        `call execute() to burn token ERC20 with amount is 1`
      );

      data = iface20.encodeFunctionData("burn", [mintAmount]);

      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          await tbaContractsByUser[i][j]
            .connect(users[i])
            .execute(bora20.target, 0, data, 0);
          Util.showProgress(ProcessName.BURN, i + 1, tbaAccounts.length);
        }
      }

      // Step 5: Verify token balance of all TBA accounts is 0
      for (let i = 0; i < tbaAccounts.length; i++) {
        expect(await bora20.balanceOf(tbaAccounts[i])).to.be.equal(0);
        Util.showProgress(
          ProcessName.VERIFY_BALANCE,
          i + 1,
          tbaAccounts.length
        );
      }
      Util.clearProgress();

      mlog.after(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC20(bora20, tbaAccounts)
      );
    }

    it("Should be successful when 100 users burn at the same time", async function () {
      await burnERC20(this.mlog, 100);
    });

    // Timeout and out of memory
    it.skip("Should be successful when 1.000 users burn at the same time", async function () {
      await burnERC20(this.mlog, 1000);
    });

    // Timeout and out of memory
    it.skip("Should be successful when 10.000 users burn at the same time", async function () {
      await burnERC20(this.mlog, 10000);
    });

    // Timeout and out of memory
    it.skip("Should be successful when 100.000 users burn at the same time", async function () {
      await burnERC20(this.mlog, 100000);
    });
  });

  describe("Load Testing - Execute - Mint ERC721", async function () {
    async function mintERC721(mlog: mlog, numberOfUser: number) {
      // Step 1: Owner of ERC721 mint ${numberOfUser} * 3 tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721]",
        ` mint ${numberOfUser * 3} tokens for ${numberOfUser} users`
      );
      const mintTimes = 1;
      const users = await Util.createUsers(numberOfUser);
      const tokenIdsByUser = await Util.multiMint721ForMultiUser(
        users,
        mintTimes,
        bora721
      );

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser * 3} TBA accounts
      mlog.log(
        `[${numberOfUser} users]`,
        `use createAccount() create ${numberOfUser * 3} TBA account`
      );
      let tbaAccountsByUser: string[][] = [];
      let tbasOfUser: string[] = [];

      let tbaContractsByUser: BoralabsTBA6551Account[][] = [];
      let tbaContracts: BoralabsTBA6551Account[] = [];
      for (let i = 0; i < users.length; ++i) {
        [tbasOfUser, tbaContracts] = await Util.createTBAs(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIdsByUser[i],
          0,
          users[i]
        );
        tbaAccountsByUser.push(tbasOfUser as string[]);
        tbaContractsByUser.push(tbaContracts);
        Util.showProgress(ProcessName.CREATE_TBA, i + 1, users.length);
      }
      Util.clearProgress();

      let tbaAccounts: string[] = ([] as string[]).concat(...tbaAccountsByUser);
      mlog.before(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC721(bora721, tbaAccounts)
      );

      // Step 3: ${numberOfUser} users call execute() to mint tokens ERC721
      mlog.log(
        `[${numberOfUser} users]`,
        "call execute() to mint tokens ERC721"
      );
      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          data = iface721.encodeFunctionData("tbaMint", [
            tbaAccountsByUser[i][j],
          ]);
          await tbaContractsByUser[i][j]
            .connect(users[i])
            .execute(bora721.target, 0, data, 0);
          Util.showProgress(ProcessName.MINT, i + 1, tbaAccounts.length);
        }
      }
      Util.clearProgress();

      // Step 4: Verify token ERC721 balance of all TBA accounts is 3
      for (let i = 0; i < tbaAccounts.length; i++) {
        expect(await bora721.balanceOf(tbaAccounts[i])).to.be.equal(3);
        Util.showProgress(
          ProcessName.VERIFY_BALANCE,
          i + 1,
          tbaAccounts.length
        );
      }
      Util.clearProgress();

      mlog.after(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC721(bora721, tbaAccounts)
      );
    }

    it("Should be successful when 100 users mint at the same time", async function () {
      await mintERC721(this.mlog, 100);
    });

    // Timeout and out of memory
    it("Should be successful when 1.000 users mint at the same time", async function () {
      await mintERC721(this.mlog, 1000);
    });

    // Timeout and out of memory
    it.skip("Should be successful when 10.000 users mint at the same time", async function () {
      await mintERC721(this.mlog, 10000);
    });

    // Timeout and out of memory
    it.skip("Should be successful when 100.000 users mint at the same time", async function () {
      await mintERC721(this.mlog, 100000);
    });
  });

  describe("Load Testing - Execute - Transfer ERC721", async function () {
    async function transfer(mlog: mlog, numberOfUser: number) {
      mlog.before(
        "[Owner of ERC721]",
        "balance:",
        await bora721.balanceOf(owner721.address)
      );

      // Step 1: Owner of ERC721 mint ${numberOfUser * 3} tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721] mint",
        numberOfUser * 3,
        "tokens for",
        numberOfUser,
        "users"
      );
      let users = await Util.createUsers(numberOfUser);
      const mintTimes = 1;
      let tokenIdsByUser = await Util.multiMint721ForMultiUser(
        users,
        mintTimes,
        bora721
      );

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser * 3} TBA accounts
      mlog.log(
        numberOfUser,
        "users use createAccount() to create",
        numberOfUser * 3,
        "TBA accounts"
      );
      let tbaAccountsByUser: string[][] = [];
      let tbasOfUser: string[] = [];

      let tbaContractsByUser: BoralabsTBA6551Account[][] = [];
      let tbaContracts: BoralabsTBA6551Account[] = [];
      for (let i = 0; i < users.length; ++i) {
        [tbasOfUser, tbaContracts] = await Util.createTBAs(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIdsByUser[i],
          0,
          users[i]
        );
        tbaAccountsByUser.push(tbasOfUser as string[]);
        tbaContractsByUser.push(tbaContracts);
        Util.showProgress(ProcessName.CREATE_TBA, i + 1, users.length);
      }
      Util.clearProgress();

      let tbaAccounts: string[] = ([] as string[]).concat(...tbaAccountsByUser);
      mlog.before(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC721(bora721, tbaAccounts)
      );

      // Step 3: ${numberOfUser} users call execute() to mint tokens ERC721
      mlog.log(numberOfUser, "users call execute() to mint tokens ERC721");
      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          data = iface721.encodeFunctionData("tbaMint", [
            tbaAccountsByUser[i][j],
          ]);
          await tbaContractsByUser[i][j]
            .connect(users[i])
            .execute(bora721.target, 0, data, 0);
        }
        Util.showProgress(ProcessName.MINT, i + 1, tbaAccountsByUser.length);
      }
      Util.clearProgress();

      // Step 4: ${numberOfUser} users call execute() to transfer tokens ERC721 to Owner of ERC721 contract
      mlog.log(
        numberOfUser,
        "users call execute() to transfer tokens ERC721 to Owner of ERC721 contract"
      );

      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          let tokens = await bora721.tokensOf(tbaAccountsByUser[i][j]);
          for (let k = 0; k < tokens.length; k++) {
            data = iface721.encodeFunctionData("transferFrom", [
              tbaAccountsByUser[i][j],
              owner721.address,
              tokens[k],
            ]);
            await tbaContractsByUser[i][j]
              .connect(users[i])
              .execute(bora721.target, 0, data, 0);
          }
        }
        Util.showProgress(
          ProcessName.TRANSFER,
          i + 1,
          tbaAccountsByUser.length
        );
      }
      Util.clearProgress();

      // Step 5: Verify token ERC721 balance of all TBA accounts is 0.
      for (let i = 0; i < tbaAccounts.length; i++) {
        expect(await bora721.balanceOf(tbaAccounts[i])).to.be.equal(0);
      }

      // Step 6: Verify token ERC721 balance of Owner of ERC721 contract is ${numberOfUser * 9 + 3}
      expect(await bora721.balanceOf(owner721.address)).to.be.equal(
        numberOfUser * 3 * 3 + 3
      );

      mlog.after(
        "[Owner of ERC721]",
        "balance:",
        await bora721.balanceOf(owner721.address)
      );
      mlog.after(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC721(bora721, tbaAccounts)
      );
    }

    it("Should be successful when 50 users transfer at the same time.", async function () {
      await transfer(this.mlog, 50);
    });

    // Timed out
    it("Should be successful when 100 users transfer at the same time.", async function () {
      await transfer(this.mlog, 100);
    });

    // Timed out
    it("Should be successful when 200 users transfer at the same time.", async function () {
      await transfer(this.mlog, 200);
    });

    // Out of memory
    it.skip("Should be successful when 1.000 users transfer at the same time.", async function () {
      await transfer(this.mlog, 1000);
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

  describe("Load Testing - Execute - Burn ERC721", async function () {
    async function burn(mlog: mlog, numberOfUser: number) {
      // Step 1: Owner of ERC721 mint ${numberOfUser * 3} tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721] mint",
        numberOfUser * 3,
        "tokens for",
        numberOfUser,
        "users"
      );
      let users = await Util.createUsers(numberOfUser);
      const mintTimes = 1;
      let tokenIdsByUser = await Util.multiMint721ForMultiUser(
        users,
        mintTimes,
        bora721
      );

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser * 3} TBA accounts
      mlog.log(
        `[${numberOfUser}`,
        "users] use createAccount() to create",
        numberOfUser * 3,
        "TBA accounts"
      );
      let tbaAccountsByUser: string[][] = [];
      let tbasOfUser: string[] = [];

      let tbaContractsByUser: BoralabsTBA6551Account[][] = [];
      let tbaContracts: BoralabsTBA6551Account[] = [];
      for (let i = 0; i < users.length; ++i) {
        [tbasOfUser, tbaContracts] = await Util.createTBAs(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIdsByUser[i],
          0,
          users[i]
        );
        tbaAccountsByUser.push(tbasOfUser as string[]);
        tbaContractsByUser.push(tbaContracts);
        Util.showProgress(ProcessName.CREATE_TBA, i + 1, users.length);
      }
      Util.clearProgress();

      let tbaAccounts: string[] = ([] as string[]).concat(...tbaAccountsByUser);
      mlog.before(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC721(bora721, tbaAccounts)
      );

      // Step 3: ${numberOfUser} users call execute() to mint tokens ERC721
      mlog.log(
        `[${numberOfUser}`,
        "users] call execute() to mint tokens ERC721"
      );
      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          data = iface721.encodeFunctionData("tbaMint", [
            tbaAccountsByUser[i][j],
          ]);
          await tbaContractsByUser[i][j]
            .connect(users[i])
            .execute(bora721.target, 0, data, 0);
        }
        Util.showProgress(ProcessName.MINT, i + 1, tbaAccountsByUser.length);
      }
      Util.clearProgress();
      mlog.log(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC721(bora721, tbaAccounts)
      );

      // Step 4: ${numberOfUser} users call execute() to burn all tokens
      mlog.log(`[${numberOfUser}`, "users] call execute() to burn all tokens");

      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          let tokens = await bora721.tokensOf(tbaAccountsByUser[i][j]);
          for (let k = 0; k < tokens.length; k++) {
            data = iface721.encodeFunctionData("burn", [tokens[k]]);
            await tbaContractsByUser[i][j]
              .connect(users[i])
              .execute(bora721.target, 0, data, 0);
          }
        }
        Util.showProgress(ProcessName.BURN, i + 1, tbaAccountsByUser.length);
      }
      Util.clearProgress();

      // Step 5: Verify token ERC721 balance of all TBA accounts is 0.
      for (let i = 0; i < tbaAccounts.length; i++) {
        expect(await bora721.balanceOf(tbaAccounts[i])).to.be.equal(0);
      }

      mlog.after(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC721(bora721, tbaAccounts)
      );
    }

    it("Should be successful when 100 users burn at the same time.", async function () {
      await burn(this.mlog, 100);
    });

    // Timed out
    it("Should be successful when 200 users burn at the same time.", async function () {
      await burn(this.mlog, 200);
    });

    // Out of memory
    it.skip("Should be successful when 1.000 users burn at the same time.", async function () {
      await burn(this.mlog, 1000);
    });

    // Out of memory
    it.skip("Should be successful when 10.000 users burn at the same time.", async function () {
      await burn(this.mlog, 10000);
    });

    // Out of memory
    it.skip("Should be successful when 100.000 users burn at the same time.", async function () {
      await burn(this.mlog, 100000);
    });
  });

  describe("Load Testing - Execute - Mint ERC1155", async function () {
    async function mint(mlog: mlog, numberOfUser: number) {
      // Step 1: Owner of ERC721 mint ${numberOfUser * 3} tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721] mint",
        numberOfUser * 3,
        "tokens for",
        numberOfUser,
        "users"
      );
      let users = await Util.createUsers(numberOfUser);
      const mintTimes = 1;
      let tokenIdsByUser = await Util.multiMint721ForMultiUser(
        users,
        mintTimes,
        bora721
      );

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser * 3} TBA accounts
      mlog.log(
        `[${numberOfUser} User]`,
        "users use createAccount() to create",
        numberOfUser * 3,
        "TBA accounts"
      );
      let tbaAccountsByUser: string[][] = [];
      let tbasOfUser: string[] = [];

      let tbaContractsByUser: BoralabsTBA6551Account[][] = [];
      let tbaContracts: BoralabsTBA6551Account[] = [];
      for (let i = 0; i < users.length; ++i) {
        [tbasOfUser, tbaContracts] = await Util.createTBAs(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIdsByUser[i],
          0,
          users[i]
        );
        tbaAccountsByUser.push(tbasOfUser as string[]);
        tbaContractsByUser.push(tbaContracts);
        Util.showProgress(ProcessName.CREATE_TBA, i + 1, users.length);
      }
      Util.clearProgress();

      let tbaAccounts: string[] = ([] as string[]).concat(...tbaAccountsByUser);

      mlog.before(
        `[${numberOfUser * 3} TBAs]`,
        "total balance :",
        await Util.totalBalanceERC1155(bora1155, tbaAccounts)
      );

      // Step 3: 100 users call execute() to mint token ERC1155 with amount is 1
      mlog.log(
        `[${numberOfUser} User]`,
        `call execute() to mint token ERC1155 with amount is 1`
      );
      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          data = iface1155.encodeFunctionData("tbaMint", [
            tbaAccountsByUser[i][j],
            1,
            "0x",
          ]);
          await tbaContractsByUser[i][j]
            .connect(users[i])
            .execute(bora1155.target, 0, data, 0);
        }
        Util.showProgress(ProcessName.MINT, i + 1, tbaAccountsByUser.length);
      }
      Util.clearProgress();

      // Step 4: Verify token ERC1155 balance of all TBA accounts of each token id is 1
      for (let i = 0; i < tbaAccounts.length; ++i) {
        const balance = await bora1155.tokensOf(tbaAccounts[i]);
        expect(balance[1]).to.be.deep.equal([1, 1, 1, 1, 1]);
      }

      mlog.after(
        `[${numberOfUser * 3} TBAs]`,
        "total balance :",
        await Util.totalBalanceERC1155(bora1155, tbaAccounts)
      );
    }

    it("Should be successful when 100 users mint at the same time", async function () {
      await mint(this.mlog, 100);
    });

    // Timed out
    it.skip("Should be successful when 200 users mint at the same time", async function () {
      await mint(this.mlog, 200);
    });

    // Out of memory
    it.skip("Should be successful when 1.000 users mint at the same time", async function () {
      await mint(this.mlog, 1000);
    });

    // Out of memory
    it.skip("Should be successful when 10.000 users mint at the same time", async function () {
      await mint(this.mlog, 10000);
    });

    // Out of memory
    it.skip("Should be successful when 100.000 users mint at the same time", async function () {
      await mint(this.mlog, 100000);
    });
  });

  describe("Load Testing - Execute - Safe Transfer ERC1155", async function () {
    async function transfer(mlog: mlog, numberOfUser: number) {
      // Step 1: Owner of ERC721 mint ${numberOfUser * 3} tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721] mint",
        numberOfUser * 3,
        "tokens for",
        numberOfUser,
        "users"
      );
      let users = await Util.createUsers(numberOfUser);
      const mintTimes = 1;
      let tokenIdsByUser = await Util.multiMint721ForMultiUser(
        users,
        mintTimes,
        bora721
      );

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser * 3} TBA accounts
      mlog.log(
        `[${numberOfUser} User]`,
        "users use createAccount() to create",
        numberOfUser * 3,
        "TBA accounts"
      );
      let tbaAccountsByUser: string[][] = [];
      let tbasOfUser: string[] = [];

      let tbaContractsByUser: BoralabsTBA6551Account[][] = [];
      let tbaContracts: BoralabsTBA6551Account[] = [];
      for (let i = 0; i < users.length; ++i) {
        [tbasOfUser, tbaContracts] = await Util.createTBAs(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIdsByUser[i],
          0,
          users[i]
        );
        tbaAccountsByUser.push(tbasOfUser as string[]);
        tbaContractsByUser.push(tbaContracts);
        Util.showProgress(ProcessName.CREATE_TBA, i + 1, users.length);
      }
      Util.clearProgress();

      let tbaAccounts: string[] = ([] as string[]).concat(...tbaAccountsByUser);

      // Step 3: 100 users call execute() to mint token ERC1155 with amount is 1
      mlog.log(
        `[${numberOfUser} User]`,
        `call execute() to mint token ERC1155 with amount is 1`
      );
      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          data = iface1155.encodeFunctionData("tbaMint", [
            tbaAccountsByUser[i][j],
            1,
            "0x",
          ]);
          await tbaContractsByUser[i][j]
            .connect(users[i])
            .execute(bora1155.target, 0, data, 0);
        }
        Util.showProgress(ProcessName.MINT, i + 1, tbaAccountsByUser.length);
      }
      Util.clearProgress();

      mlog.before(
        "[TBAs account] total balance",
        await Util.totalBalanceERC1155(bora1155, tbaAccounts)
      );

      mlog.before(
        "[Owner of ERC1155] balance",
        await bora1155.tokenCountOf(owner1155)
      );

      // Step 4: 100 users call execute()  to transfer token ERC1155 to Owner of ERC1155 contract
      mlog.log(
        `[${numberOfUser} User]`,
        `call execute()  to transfer token ERC1155 to Owner of ERC1155 contract`
      );
      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          let tokens = (await bora1155.tokensOf(tbaAccountsByUser[i][j]))[0];
          for (let k = 0; k < tokens.length; k++) {
            data = iface1155.encodeFunctionData("safeTransferFrom", [
              tbaAccountsByUser[i][j],
              owner1155.address,
              tokens[k],
              1,
              "0x",
            ]);
            await tbaContractsByUser[i][j]
              .connect(users[i])
              .execute(bora1155.target, 0, data, 0);
          }
        }
        Util.showProgress(
          ProcessName.TRANSFER,
          i + 1,
          tbaAccountsByUser.length
        );
      }
      Util.clearProgress();

      // Step 5: Verify token ERC1155 balance of all TBA accounts is 0
      for (let i = 0; i < tbaAccounts.length; ++i) {
        const balance = await bora1155.tokensOf(tbaAccounts[i]);
        expect(balance[1]).to.be.deep.equal([]);
      }

      // Step 6: Verify token balance each token id of Owner of ERC1155 contract is 1
      const owner1155TokensArr = await bora1155.tokensOf(owner1155);
      const owner1155Tokens = owner1155TokensArr[0];
      for (let i = 0; i < owner1155Tokens.length; ++i) {
        expect(
          await bora1155.balanceOf(owner1155, owner1155Tokens[i])
        ).to.be.equal(1);
      }

      mlog.after(
        "[TBAs account] total balance",
        await Util.totalBalanceERC1155(bora1155, tbaAccounts)
      );

      mlog.after(
        "[Owner of ERC1155] balance",
        await bora1155.tokenCountOf(owner1155)
      );
    }

    it("Should be successful when 100 users transfer at the same time", async function () {
      await transfer(this.mlog, 100);
    });

    // Timed out
    it.skip("Should be successful when 200 users transfer at the same time", async function () {
      await transfer(this.mlog, 200);
    });

    // Out of memory
    it.skip("Should be successful when 1.000 users transfer at the same time", async function () {
      await transfer(this.mlog, 1000);
    });

    // Out of memory
    it.skip("Should be successful when 10.000 users transfer at the same time", async function () {
      await transfer(this.mlog, 10000);
    });

    // Out of memory
    it.skip("Should be successful when 100.000 users transfer at the same time", async function () {
      await transfer(this.mlog, 100000);
    });
  });

  describe("Load Testing- Execute - TransferCoin", async function () {
    async function transferCoin(mlog: mlog, numberOfUser: number) {
      mlog.before(
        "[User 2]",
        "coin balance:",
        await ethers.provider.getBalance(User2.address)
      );

      // Step 1: Owner of ERC721 mint ${numberOfUser} *3 tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721]",
        ` mint ${numberOfUser * 3} tokens for ${numberOfUser} users`
      );
      const mintTimes = 1;
      const users = await Util.createUsers(numberOfUser);
      const tokenIdsByUser = await Util.multiMint721ForMultiUser(
        users,
        mintTimes,
        bora721
      );

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser} * 3 TBA accounts
      let tbaAccountsByUser: string[][] = [];
      let tbasOfUser: string[] = [];

      let tbaContractsByUser: BoralabsTBA6551Account[][] = [];
      let tbaContracts: BoralabsTBA6551Account[] = [];
      for (let i = 0; i < users.length; ++i) {
        [tbasOfUser, tbaContracts] = await Util.createTBAs(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIdsByUser[i],
          0,
          users[i]
        );
        tbaAccountsByUser.push(tbasOfUser as string[]);
        tbaContractsByUser.push(tbaContracts);
        Util.showProgress(ProcessName.CREATE_TBA, i + 1, users.length);
      }
      Util.clearProgress();

      let tbaAccounts: string[] = ([] as string[]).concat(...tbaAccountsByUser);
      const totalCoin = async () => {
        let balance = 0;
        for (let i = 0; i < tbaAccounts.length; i++) {
          balance += Number(await ethers.provider.getBalance(tbaAccounts[i]));
        }
        return balance;
      };

      // Step 3: User 1 transfers 1.000 wei to each TBA
      const transferAmount = 1000;
      mlog.log("[User 1]", "transfers 1.000 wei to each TBA");
      for (let i = 0; i < tbaAccounts.length; i++) {
        await User1.sendTransaction({
          to: tbaAccounts[i],
          value: transferAmount,
        });
        Util.showProgress(
          ProcessName.TRANSFER,
          i + 1,
          tbaAccountsByUser.length
        );
      }
      Util.clearProgress();
      mlog.before(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await totalCoin()
      );

      // Step 4: ${numberOfUser} users call transferCoin() with an amount is 1000  to transfer coin to User 2
      mlog.log(
        `[${numberOfUser} users]`,
        "users call transferCoin() with an amount is 1000  to transfer coin to User 2"
      );
      const user2CoinBalanceBefore = await ethers.provider.getBalance(
        User2.address
      );
      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          await tbaContractsByUser[i][j]
            .connect(users[i])
            .transferCoin(User2.address, transferAmount);
        }
        Util.showProgress(
          ProcessName.TRANSFER,
          i + 1,
          tbaAccountsByUser.length
        );
      }
      Util.clearProgress();

      // Step 5: Verify coin balance of each TBA is 0.
      for (let i = 0; i < tbaAccounts.length; i++) {
        expect(await ethers.provider.getBalance(tbaAccounts[i])).to.be.equal(0);
        Util.showProgress(
          ProcessName.VERIFY_BALANCE,
          i + 1,
          tbaAccounts.length
        );
      }
      Util.clearProgress();

      // Step 6: Verify User 2 balance is increased ${numberOfUser} * 1.000
      expect(await ethers.provider.getBalance(User2.address)).to.be.equal(
        user2CoinBalanceBefore + BigInt(numberOfUser * transferAmount * 3)
      );

      mlog.after(
        "[User 2]",
        "coin balance:",
        await ethers.provider.getBalance(User2.address)
      );
      mlog.after(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await totalCoin()
      );
    }

    it("Should be successful when 100 users transfer at the same time.", async function () {
      await transferCoin(this.mlog, 100);
    });

    it("Should be successful when 1.000 users transfer at the same time.", async function () {
      await transferCoin(this.mlog, 1000);
    });

    // Out of memory
    it.skip("Should be successful when 10.000 users transfer at the same time.", async function () {
      await transferCoin(this.mlog, 10000);
    });

    // Out of memory
    it.skip("Should be successful when 100.000 users transfer at the same time.", async function () {
      await transferCoin(this.mlog, 100000);
    });
  });

  describe("Load Testing- Execute - Burn ERC1155", async function () {
    async function burnERC1155(mlog: mlog, numberOfUser: number) {
      // Step 1: Owner of ERC721 mint ${numberOfUser} *3 tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721]",
        ` mint ${numberOfUser * 3} tokens for ${numberOfUser} users`
      );
      const mintTimes = 1;
      const users = await Util.createUsers(numberOfUser);
      const tokenIdsByUser = await Util.multiMint721ForMultiUser(
        users,
        mintTimes,
        bora721
      );

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser} * 3 TBA accounts
      let tbaAccountsByUser: string[][] = [];
      let tbasOfUser: string[] = [];

      let tbaContractsByUser: BoralabsTBA6551Account[][] = [];
      let tbaContracts: BoralabsTBA6551Account[] = [];
      for (let i = 0; i < users.length; ++i) {
        [tbasOfUser, tbaContracts] = await Util.createTBAs(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIdsByUser[i],
          0,
          users[i]
        );
        tbaAccountsByUser.push(tbasOfUser as string[]);
        tbaContractsByUser.push(tbaContracts);
        Util.showProgress(ProcessName.CREATE_TBA, i + 1, users.length);
      }
      Util.clearProgress();

      let tbaAccounts: string[] = ([] as string[]).concat(...tbaAccountsByUser);

      // Step 3: ${numberOfUser} users call execute() to mint token ERC1155 with amount is 1
      mlog.log(
        `[${numberOfUser} users]`,
        `call execute() to mint token ERC1155 with amount is 1`
      );
      const mintAmount = 1;
      for (let i = 0; i < tbaAccountsByUser.length; ++i) {
        for (let j = 0; j < tbaAccountsByUser[i].length; ++j) {
          data = iface1155.encodeFunctionData("tbaMint", [
            tbaAccountsByUser[i][j],
            mintAmount,
            emptyData,
          ]);
          await tbaContractsByUser[i][j]
            .connect(users[i])
            .execute(await bora1155.getAddress(), 0, data, 0);
        }
        Util.showProgress(ProcessName.MINT, i + 1, users.length);
      }
      Util.clearProgress();

      mlog.before(
        "[TBAs account] balance",
        await Util.totalBalanceERC1155(bora1155, tbaAccounts)
      );

      // Step 4: 100 users call execute()  to burn token ERC1155 with amount is 1
      mlog.log(
        `[${numberOfUser} users]`,
        `call execute() to burn token ERC1155 with amount is 1`
      );
      for (let i = 0; i < tbaAccountsByUser.length; ++i) {
        for (let j = 0; j < tbaAccountsByUser[i].length; ++j) {
          const tokenIds = (
            await bora1155.tokensOf(tbaAccountsByUser[i][j])
          )[0];
          for (let k = 0; k < tokenIds.length; k++) {
            data = iface1155.encodeFunctionData("burn", [
              tokenIds[k],
              mintAmount,
            ]);
            await tbaContractsByUser[i][j]
              .connect(users[i])
              .execute(bora1155.target, 0, data, 0);
          }
        }
        Util.showProgress(ProcessName.BURN, i + 1, users.length);
      }
      Util.clearProgress();

      // Step 5: Verify token ERC1155 balance of all TBA accounts of each token id is 0
      for (let i = 0; i < tbaAccounts.length; ++i) {
        const balance = await bora1155.tokensOf(tbaAccounts[i]);
        expect(balance[0]).to.be.deep.equal([]);
        expect(balance[1]).to.be.deep.equal([]);
      }

      mlog.after(
        "[TBA account] balance",
        await Util.totalBalanceERC1155(bora1155, tbaAccounts)
      );
    }

    it("Should be successful when 50 users burn at the same time.", async function () {
      await burnERC1155(this.mlog, 50);
    });

    // Timed out
    it("Should be successful when 100 users burn at the same time.", async function () {
      await burnERC1155(this.mlog, 100);
    });

    // Timed out
    it.skip("Should be successful when 1.000 users burn at the same time.", async function () {
      await burnERC1155(this.mlog, 1000);
    });

    // Out of memory
    it.skip("Should be successful when 10.000 users burn at the same time.", async function () {
      await burnERC1155(this.mlog, 10000);
    });

    // Out of memory
    it.skip("Should be successful when 100.000 users burn at the same time.", async function () {
      await burnERC1155(this.mlog, 100000);
    });
  });

  describe("Load Testing - Transfer 20", async function () {
    async function transfer20(mlog: mlog, numberOfUser: number) {
      mlog.before(
        "[Owner of ERC20]",
        "token erc20 balance:",
        await bora20.balanceOf(owner20.address)
      );

      // Step 1: Owner of ERC721 mint ${numberOfUser} * 3 tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721]",
        `mint ${numberOfUser * 3} tokens for ${numberOfUser} users`
      );
      const mintTimes = 1;
      const users = await Util.createUsers(numberOfUser);
      const tokenIdsByUser = await Util.multiMint721ForMultiUser(
        users,
        mintTimes,
        bora721
      );

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser} * 3 TBA accounts
      let tbaAccountsByUser: string[][] = [];
      let tbasOfUser: string[] = [];

      let tbaContractsByUser: BoralabsTBA6551Account[][] = [];
      let tbaContracts: BoralabsTBA6551Account[] = [];
      for (let i = 0; i < users.length; ++i) {
        [tbasOfUser, tbaContracts] = await Util.createTBAs(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIdsByUser[i],
          0,
          users[i]
        );
        tbaAccountsByUser.push(tbasOfUser as string[]);
        tbaContractsByUser.push(tbaContracts);
        Util.showProgress(ProcessName.CREATE_TBA, i + 1, users.length);
      }
      Util.clearProgress();

      let tbaAccounts: string[] = ([] as string[]).concat(...tbaAccountsByUser);
      mlog.before(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC20(bora20, tbaAccounts)
      );

      // Step 3: Owner of ERC20 mint 1 token to each TBA
      mlog.log(
        "[Owner of ERC20]",
        "mint token ERC20 with amount is 1 to each TBA"
      );
      const mintAmount = 1;
      for (let i = 0; i < tbaAccounts.length; i++) {
        await bora20.mint(tbaAccounts[i], mintAmount);
        Util.showProgress(ProcessName.MINT, i + 1, tbaAccounts.length);
      }
      Util.clearProgress();
      mlog.log(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC20(bora20, tbaAccounts)
      );

      // Step 4: ${numberOfUser} users call transfer20() with amount is 1 to transfer token to Owner of ERC20
      mlog.log(
        `[${numberOfUser} users]`,
        "call transfer20() with amount is 1  to transfer token to Owner of ERC20"
      );

      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          await tbaContractsByUser[i][j]
            .connect(users[i])
            .transfer20(bora20.target, owner20.address, 1);
        }
        Util.showProgress(
          ProcessName.TRANSFER,
          i + 1,
          tbaAccountsByUser.length
        );
      }
      Util.clearProgress();

      // Step 5: Verify token ERC20 balance of each TBA is 0
      for (let i = 0; i < tbaAccounts.length; i++) {
        expect(await bora20.balanceOf(tbaAccounts[i])).to.be.equal(0);
        Util.showProgress(
          ProcessName.VERIFY_BALANCE,
          i + 1,
          tbaAccounts.length
        );
      }
      Util.clearProgress();

      // Step 6: Verify Owner of ERC20 token ERC20 balance is ${numberOfUser * 3}
      expect(await bora20.balanceOf(owner20.address)).to.be.equal(
        numberOfUser * mintAmount * 3
      );

      mlog.after(
        "[Owner of ERC20]",
        "token erc20 balance:",
        await bora20.balanceOf(owner20.address)
      );
      mlog.after(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC20(bora20, tbaAccounts)
      );
    }

    it("Should be successful when 100 users transfer20() at the same time", async function () {
      await transfer20(this.mlog, 100);
    });

    // Timed out
    it("Should be successful when 200 users transfer20() at the same time", async function () {
      await transfer20(this.mlog, 200);
    });

    // Timed out and out of memory
    it.skip("Should be successful when 1.000 users transfer20() at the same time", async function () {
      await transfer20(this.mlog, 1000);
    });

    // Timed out and out of memory
    it.skip("Should be successful when 10.000 users transfer20() at the same time", async function () {
      await transfer20(this.mlog, 10000);
    });

    // Timed out and out of memory
    it.skip("Should be successful when 100.000 users transfer20() at the same time", async function () {
      await transfer20(this.mlog, 100000);
    });
  });

  describe("Load Testing - Transfer 721", async function () {
    async function transfer721(mlog: mlog, numberOfUser: number) {
      mlog.before(
        "[Owner of ERC721]",
        "balance:",
        await bora721.balanceOf(owner721.address)
      );

      // Step 1: Owner of ERC721 mint ${numberOfUser} * 3 tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721] mint",
        numberOfUser * 3,
        "tokens for",
        numberOfUser,
        "users"
      );
      let users = await Util.createUsers(numberOfUser);
      const mintTimes = 1;
      let tokenIdsByUser = await Util.multiMint721ForMultiUser(
        users,
        mintTimes,
        bora721
      );

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser} * 3 TBA accounts
      mlog.log(
        numberOfUser,
        "users use createAccount() to create",
        numberOfUser * 3,
        "TBA accounts"
      );
      let tbaAccountsByUser: string[][] = [];
      let tbasOfUser: string[] = [];

      let tbaContractsByUser: BoralabsTBA6551Account[][] = [];
      let tbaContracts: BoralabsTBA6551Account[] = [];
      for (let i = 0; i < users.length; ++i) {
        [tbasOfUser, tbaContracts] = await Util.createTBAs(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIdsByUser[i],
          0,
          users[i]
        );
        tbaAccountsByUser.push(tbasOfUser as string[]);
        tbaContractsByUser.push(tbaContracts);
        Util.showProgress(ProcessName.CREATE_TBA, i + 1, users.length);
      }
      Util.clearProgress();

      let tbaAccounts: string[] = ([] as string[]).concat(...tbaAccountsByUser);
      mlog.before(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC721(bora721, tbaAccounts)
      );

      // Step 3: Owner of ERC721 mint 3 tokens to each TBA
      mlog.log("[Owner of ERC721]", "mint 3 tokens to each TBA");
      for (let i = 0; i < tbaAccounts.length; i++) {
        await bora721.tbaMint(tbaAccounts[i]);
        Util.showProgress(ProcessName.MINT, i + 1, tbaAccounts.length);
      }
      Util.clearProgress();
      mlog.log(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC721(bora721, tbaAccounts)
      );

      // Step 4: ${numberOfUser} users call transfer721() to transfer 1 token to Owner of ERC721
      mlog.log(
        `[${numberOfUser} users]`,
        "call transfer721() to transfer 1 token to Owner of ERC721"
      );

      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          const tokenIds = await bora721.tokensOf(tbaAccountsByUser[i][j]);
          await tbaContractsByUser[i][j]
            .connect(users[i])
            .transfer721(bora721.target, owner721.address, tokenIds[0]);
        }
        Util.showProgress(
          ProcessName.TRANSFER,
          i + 1,
          tbaAccountsByUser.length
        );
      }
      Util.clearProgress();

      // Step 5: Verify token ERC721 balance of each TBA is 2
      for (let i = 0; i < tbaAccounts.length; i++) {
        expect(await bora721.balanceOf(tbaAccounts[i])).to.be.equal(2);
      }

      // Step 6: Verify Owner of ERC721 token ERC721 balance increases {numberOfUser * 3}
      expect(await bora721.balanceOf(owner721.address)).to.be.equals(
        numberOfUser * 3 + 3
      );

      mlog.after(
        "[Owner of ERC721]",
        "balance:",
        await bora721.balanceOf(owner721.address)
      );
      mlog.after(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC721(bora721, tbaAccounts)
      );
    }

    it("Should be successful when 100 users transfer721() at the same time", async function () {
      await transfer721(this.mlog, 100);
    });

    // Timed out
    it.skip("Should be successful when 200 users transfer721() at the same time", async function () {
      await transfer721(this.mlog, 200);
    });

    // Timed out and out of memory
    it.skip("Should be successful when 1.000 users transfer721() at the same time", async function () {
      await transfer721(this.mlog, 1000);
    });

    // Timed out and out of memory
    it.skip("Should be successful when 10.000 users transfer721() at the same time", async function () {
      await transfer721(this.mlog, 10000);
    });

    // Timed out and out of memory
    it.skip("Should be successful when 100.000 users transfer721() at the same time", async function () {
      await transfer721(this.mlog, 100000);
    });
  });

  describe("Load Testing - Transfer 1155", async function () {
    async function transfer(mlog: mlog, numberOfUser: number) {
      mlog.before(
        "[Owner of ERC1155]",
        "balance:",
        await bora1155.tokenCountOf(owner1155.address)
      );

      // Step 1: Owner of ERC721 mint ${numberOfUser * 3} tokens for ${numberOfUser} users
      mlog.log(
        "[Owner of ERC721] mint",
        numberOfUser * 3,
        "tokens for",
        numberOfUser,
        "users"
      );
      let users = await Util.createUsers(numberOfUser);
      const mintTimes = 1;
      let tokenIdsByUser = await Util.multiMint721ForMultiUser(
        users,
        mintTimes,
        bora721
      );

      // Step 2: ${numberOfUser} users use createAccount() to create ${numberOfUser * 3} TBA accounts
      mlog.log(
        numberOfUser,
        "users use createAccount() to create",
        numberOfUser * 3,
        "TBA accounts"
      );
      let tbaAccountsByUser: string[][] = [];
      let tbasOfUser: string[] = [];

      let tbaContractsByUser: BoralabsTBA6551Account[][] = [];
      let tbaContracts: BoralabsTBA6551Account[] = [];
      for (let i = 0; i < users.length; ++i) {
        [tbasOfUser, tbaContracts] = await Util.createTBAs(
          bora6551Account.target,
          bora6551Registry,
          bora721.target,
          tokenIdsByUser[i],
          0,
          users[i]
        );
        tbaAccountsByUser.push(tbasOfUser as string[]);
        tbaContractsByUser.push(tbaContracts);
        Util.showProgress(ProcessName.CREATE_TBA, i + 1, users.length);
      }
      Util.clearProgress();

      let tbaAccounts: string[] = ([] as string[]).concat(...tbaAccountsByUser);

      // Step 3: Owner of ERC1155 mint 5 tokens with an amount is 1000 to each TBA.
      mlog.log(
        "[Owner of ERC1155]",
        "mint 5 tokens with an amount is 1000 to each TBA"
      );
      const amount = 1000;
      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          await Util.multiMint1155(
            bora1155,
            tbaAccountsByUser[i][j],
            amount,
            emptyData,
            mintTimes
          );
        }
        Util.showProgress(ProcessName.MINT, i + 1, tbaAccountsByUser.length);
      }
      Util.clearProgress();

      mlog.before(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC1155(bora1155, tbaAccounts)
      );

      // Step 4: ${numberOfUser} users call transfer1155() to transfer tokens with amount is 1000 to Owner of ERC1155
      mlog.log(
        numberOfUser,
        "users call transfer1155() to transfer tokens with amount is 1000 to Owner of ERC1155"
      );

      for (let i = 0; i < tbaAccountsByUser.length; i++) {
        for (let j = 0; j < tbaAccountsByUser[i].length; j++) {
          let tokens = (await bora1155.tokensOf(tbaAccountsByUser[i][j]))[0];
          for (let k = 0; k < tokens.length; k++) {
            await tbaContractsByUser[i][j]
              .connect(users[i])
              .transfer1155(
                bora1155.target,
                owner1155.address,
                tokens[k],
                amount,
                emptyData
              );
          }
        }
        Util.showProgress(
          ProcessName.TRANSFER,
          i + 1,
          tbaAccountsByUser.length
        );
      }
      Util.clearProgress();

      // Step 5: Verify token ERC1155 balance of each TBA of each token ids is 0.
      for (let i = 0; i < tbaAccounts.length; ++i) {
        const balance = await bora1155.tokensOf(tbaAccounts[i]);
        expect(balance[1]).to.be.deep.equal([]);
      }

      // Step 6: Verify Owner of ERC1155 token ERC1155 balance of each token ids is 1000
      const owner1155TokensArr = await bora1155.tokensOf(owner1155);
      const owner1155Tokens = owner1155TokensArr[0];
      for (let i = 0; i < owner1155Tokens.length; ++i) {
        expect(
          await bora1155.balanceOf(owner1155, owner1155Tokens[i])
        ).to.be.equal(1000);
      }

      mlog.after(
        "[Owner of ERC1155]",
        "balance:",
        await bora1155.tokenCountOf(owner1155.address)
      );
      mlog.after(
        `[${numberOfUser * 3} TBAs]`,
        "total balance:",
        await Util.totalBalanceERC1155(bora1155, tbaAccounts)
      );
    }

    it("Should be successful when 50 users transfer1155() at the same time.", async function () {
      await transfer(this.mlog, 50);
    });

    // Timed out
    it.skip("Should be successful when 100 users transfer1155() at the same time.", async function () {
      await transfer(this.mlog, 100);
    });

    // Timed out
    it.skip("Should be successful when 1.000 users transfer1155() at the same time.", async function () {
      await transfer(this.mlog, 100);
    });

    // Timed out
    it.skip("Should be successful when 10.000 users transfer1155() at the same time.", async function () {
      await transfer(this.mlog, 200);
    });

    // Timed out
    it.skip("Should be successful when 100.000 users transfer1155() at the same time.", async function () {
      await transfer(this.mlog, 1000);
    });
  });
});
