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

describe("BoralabsTBA1155: Unit test", function () {
  mlog.injectLogger(this);

  let bora20: BoralabsTBA20;
  let bora721: BoralabsTBA721;
  let bora6551Account: BoralabsTBA6551Account;
  let bora6551Registry: BoralabsTBA6551Registry;
  let User1: HardhatEthersSigner;
  let User2: HardhatEthersSigner;
  let User3: HardhatEthersSigner;

  let tbaAddress: string;
  let tba: BoralabsTBA6551Account;
  let tbaAddress2: string;
  let data: string;

  const iface721 = new Interface([
    "function transferFrom( address from, address to, uint256 tokenId )",
    "function tbaMint( address to )",
  ]);

  const emptyData = "0x";

  beforeEach(async function () {
    [User1, User2, User3] = await ethers.getSigners();
    // deploy bora20
    ({ bora20 } = await loadFixture(deployBora20));

    // deploy bora721
    ({ bora721 } = await loadFixture(deployBora721));

    // deploy bora 6551 account
    ({ bora6551Account } = await loadFixture(deployBora6551Account));

    // deploy bora 6551 registry
    ({ bora6551Registry } = await loadFixture(deployBora6551Registry));

    // mint erc721
    await bora721.tbaMint(User1.address);

    // create tba account
    await bora6551Registry.createAccount(
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

  describe("Execute", async function () {
    it("Should failed when value is greater than TBA balance", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.before(
        "[User 2]",
        "balance",
        await ethers.provider.getBalance(User2.address)
      );

      // Step 1: Transfer 1000 wei to TBA account
      this.mlog.log("[User 1]", "transfer 1000 wei to TBA account");
      await User1.sendTransaction({ to: tbaAddress, value: 1000 });

      this.mlog.log(
        "[TBA Account]",
        "balance",
        await ethers.provider.getBalance(tbaAddress)
      );

      // Step 2: Call execute() with value is 2000 wei
      // Step 3: Verify transaction should be reverted
      this.mlog.log("[TBA Account]", "transfer 2000 wei to User 2");
      await expect(tba.execute(User2.address, 2000, emptyData, 0)).to.be
        .reverted;

      this.mlog.after(
        "[TBA Account]",
        "balance",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.after(
        "[User 2]",
        "balance",
        await ethers.provider.getBalance(User2.address)
      );
    });

    it("Should failed when call data is invalid function name", async function () {
      // Step 1: Call execute() with call data is ‘abc()’
      // Step 2: Verify transaction should be reverted
      this.mlog.log(
        "[TBA Account]",
        " call execute() with call data is ‘abc()’"
      );
      const ifaceContract = new Interface(["function abc()"]);
      data = ifaceContract.encodeFunctionData("abc", []);
      await expect(tba.connect(User1).execute(bora721.target, 0, data, 0)).to.be
        .reverted;
    });

    it("Should failed when call data is invalid function parameter data type", async function () {
      // Step 1: Call execute() with call data is ‘burn(bool)
      // Step 2: Verify transaction should be reverted
      this.mlog.log(
        "[TBA Account]",
        "Call execute() with call data is ‘burn(bool)’"
      );
      const ifaceContract = new Interface(["function burn(bool tokenId)"]);
      data = ifaceContract.encodeFunctionData("burn", [true]);
      await expect(tba.connect(User1).execute(bora721.target, 0, data, 0)).to.be
        .reverted;
    });

    it("Should failed when call data is missing parameter", async function () {
      // Step 1: Call execute() with call data is ‘burn()’
      // Step 2: Verify transaction should be reverted
      this.mlog.log(
        "[TBA Account]",
        "Call execute() with call data is ‘burn()’"
      );
      const ifaceContract = new Interface(["function burn()"]);
      data = ifaceContract.encodeFunctionData("burn", []);
      await expect(tba.connect(User1).execute(bora721.target, 0, data, 0)).to.be
        .reverted;
    });

    it("Should failed when call data is redundant parameter", async function () {
      // Step 1: Call execute() with call data is ‘burn(uint256 tokenId, uint256 tokenId)’
      // Step 2: Verify transaction should be reverted
      this.mlog.log(
        "[TBA Account]",
        "Call execute() with call data is ‘burn(uint256 tokenId, uint256 tokenId)’"
      );
      const ifaceContract = new Interface([
        "function burn(uint256 tokenId, uint256 tokenId)",
      ]);
      data = ifaceContract.encodeFunctionData("burn", [1, 1]);
      await expect(tba.connect(User1).execute(bora721.target, 0, data, 0)).to.be
        .reverted;
    });

    it("Should failed when operation is not zero", async function () {
      // Step 1: Call execute() with operation is not zero
      // Step 2: Verify transaction should be reverted with error message ‘Only call operations are supported’
      this.mlog.log(
        "[TBA Account]",
        "call execute() with operation is not zero"
      );
      await expect(
        tba.connect(User1).execute(bora721.target, 0, emptyData, 1)
      ).to.be.revertedWith("Only call operations are supported");
    });

    it("Should failed when user is not owner", async function () {
      // Step 1: Call execute() by user is not owner
      // Step 2: Verify transaction should be reverted
      this.mlog.log("[User 2]", "call execute() in TBA of User 1");
      await expect(
        tba.connect(User2).execute(bora721.target, 0, emptyData, 0)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should successfully when parameters is valid", async function () {
      this.mlog.before(
        "[TBA Account]",
        "token erc721 balance:",
        await bora721.balanceOf(tbaAddress)
      );

      // Step 1: Call execute() with valid parameters
      // Step 2: Verify transaction should be reverted
      this.mlog.log("[TBA Account]", "call execute() to mint 3 token for TBA");
      data = iface721.encodeFunctionData("tbaMint", [tbaAddress]);
      await expect(await tba.connect(User1).execute(bora721.target, 0, data, 0))
        .to.be.ok;

      this.mlog.after(
        "[TBA Account]",
        "token erc721 balance:",
        await bora721.balanceOf(tbaAddress)
      );
    });
  });

  describe("Transfer Coin", async function () {
    it("Should failed when user is not owner", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.before(
        "[User 2]",
        "balance",
        await ethers.provider.getBalance(User2.address)
      );
      this.mlog.before(
        "[User 3]",
        "balance",
        await ethers.provider.getBalance(User3.address)
      );

      // Step 1: Call transferCoin() with value is 1000 wei
      // Step 2: Verify transaction should be reverted
      const amountTransfer = 1000;
      this.mlog.log(
        "[User 2]",
        "call transferCoin() 1000 wei from TBA to User 3"
      );
      await expect(
        tba.connect(User2).transferCoin(User3.address, amountTransfer)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      this.mlog.after(
        "[TBA Account]",
        "balance",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.after(
        "[User 2]",
        "balance",
        await ethers.provider.getBalance(User2.address)
      );
      this.mlog.after(
        "[User 3]",
        "balance",
        await ethers.provider.getBalance(User3.address)
      );
    });

    it("Should successfully when transfer coin to EOA", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance",
        await ethers.provider.getBalance(tbaAddress)
      );
      const user2BalanceBefore = await ethers.provider.getBalance(
        User2.address
      );
      this.mlog.before("[User 2]", "balance", user2BalanceBefore);

      this.mlog.log("[User 1]", "call execute() to transfer 1000 wei to TBA");
      await User1.sendTransaction({ to: tbaAddress, value: 1000 });
      this.mlog.log(
        "[TBA Account]",
        "balance",
        await ethers.provider.getBalance(tbaAddress)
      );

      // Step 1: Call transferCoin() with value is 1000 wei
      // Step 2: Verify transaction should be successfully
      this.mlog.log(
        "[User 1]",
        "call transferCoin() 1000 wei from TBA to User 2"
      );
      await expect(await tba.connect(User1).transferCoin(User2.address, 1000))
        .to.be.ok;

      // Step 3: Verify EOA balance is correct
      expect(await ethers.provider.getBalance(tbaAddress)).to.be.equal(0);
      expect(await ethers.provider.getBalance(User2.address)).to.be.equal(
        user2BalanceBefore + 1000n
      );

      this.mlog.after(
        "[TBA Account]",
        "balance",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.after(
        "[User 2]",
        "balance",
        await ethers.provider.getBalance(User2.address)
      );
    });

    it("Should successfully when transfer coin to TBA", async function () {
      // Create TBA account 2
      tbaAddress2 = await bora6551Registry
        .connect(User1)
        .account(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          20000001,
          0
        );

      this.mlog.before(
        "[TBA Account 1]",
        "balance",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.before(
        "[TBA Account 2]",
        "balance",
        await ethers.provider.getBalance(tbaAddress2)
      );

      this.mlog.log("[User 1]", "call execute() to transfer 1000 wei to TBA");
      await User1.sendTransaction({ to: tbaAddress, value: 1000 });
      this.mlog.log(
        "[TBA Account]",
        "balance",
        await ethers.provider.getBalance(tbaAddress)
      );

      // Step 1: Call transferCoin() by user is owner to another TBA
      // Step 2: Verify transaction should be successfully
      this.mlog.log(
        "[User 1]",
        "call transferCoin() 1000 wei from TBA to TBA account 2"
      );
      await expect(await tba.connect(User1).transferCoin(tbaAddress2, 1000)).to
        .be.ok;

      // Step 3: Verify TBA balance is correct
      expect(await ethers.provider.getBalance(tbaAddress)).to.be.equal(0);
      expect(await ethers.provider.getBalance(tbaAddress2)).to.be.equal(1000);

      this.mlog.after(
        "[TBA Account 1]",
        "balance",
        await ethers.provider.getBalance(tbaAddress)
      );
      this.mlog.after(
        "[TBA Account 2]",
        "balance",
        await ethers.provider.getBalance(tbaAddress2)
      );
    });
  });

  describe("Transfer 20", async function () {
    it("Should failed when user is not owner", async function () {
      this.mlog.before(
        "[TBA Account]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.before(
        "[User 2]",
        "token erc20 balance",
        await bora20.balanceOf(User2.address)
      );

      // Step 1: Call transfer20() with amount is 1000
      // Step 2: Verify transaction should be reverted
      const amountTransfer = 1000;
      this.mlog.log(
        "[User 2]",
        "call transfer20() 1000 token from TBA to User 2"
      );
      await expect(
        tba
          .connect(User2)
          .transfer20(bora20.target, User2.address, amountTransfer)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      this.mlog.after(
        "[TBA Account]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.after(
        "[User 2]",
        "token erc20 balance",
        await bora20.balanceOf(User2.address)
      );
    });

    it("Should successfully when transfer token 20 to EOA", async function () {
      this.mlog.before(
        "[TBA Account]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.before(
        "[User 2]",
        "token erc20 balance",
        await bora20.balanceOf(User2.address)
      );

      this.mlog.log("[Owner of bora20]", "mint 1000 token erc20 to TBA");
      const amountTransfer = 1000n;
      await bora20.mint(tbaAddress, amountTransfer);
      this.mlog.log(
        "[TBA Account]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 1: Call transfer20() with amount is 1000
      // Step 2: Verify transaction should be successfully
      this.mlog.log(
        "[User 1]",
        "call transfer20() with amount is 1000 to transfer token erc20 from TBA to User 2"
      );
      await expect(
        await tba
          .connect(User1)
          .transfer20(bora20.target, User2.address, amountTransfer)
      ).to.be.ok;

      // Step 3: Verify EOA balance is correct
      expect(await bora20.balanceOf(tbaAddress)).to.be.equal(0);
      expect(await bora20.balanceOf(User2.address)).to.be.equal(amountTransfer);

      this.mlog.after(
        "[TBA Account]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.after(
        "[User 2]",
        "token erc20 balance",
        await bora20.balanceOf(User2.address)
      );
    });

    it("Should successfully when transfer token 20 to TBA", async function () {
      // Create TBA account 2
      tbaAddress2 = await bora6551Registry
        .connect(User1)
        .account(
          bora6551Account.getAddress(),
          network.config.chainId as BigNumberish,
          bora721.getAddress(),
          20000001,
          0
        );

      this.mlog.before(
        "[TBA Account 1]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.before(
        "[TBA Account 2]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress2)
      );

      this.mlog.log("[Owner of bora20]", "mint 1000 token erc20 to TBA");
      const amountTransfer = 1000n;
      await bora20.mint(tbaAddress, amountTransfer);
      this.mlog.log(
        "[TBA Account 1]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 1: Call transfer20() with amount is 1000
      // Step 2: Verify transaction should be successfully
      this.mlog.log(
        "[User 1]",
        "call transfer20() with amount is 1000 to transfer token erc20 from TBA to TBA 2"
      );
      await expect(
        await tba
          .connect(User1)
          .transfer20(bora20.target, tbaAddress2, amountTransfer)
      ).to.be.ok;

      // Step 3: Verify EOA balance is correct
      expect(await bora20.balanceOf(tbaAddress)).to.be.equal(0);
      expect(await bora20.balanceOf(tbaAddress2)).to.be.equal(amountTransfer);

      this.mlog.after(
        "[TBA Account 1]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.after(
        "[TBA Account 2]",
        "token erc20 balance",
        await bora20.balanceOf(tbaAddress2)
      );
    });
  });

  describe("IsValidSignature", async function () {
    it("Should return empty when signature is invalid", async function () {
      // Step 1: Call isValidSignature() with 0x00000000
      // Step 2: Verify transaction should be successfully
      // Step 3: Verify return value is empty
      this.mlog.log("[User 1]", "Call isValidSignature() with 0x00000000");
      const data =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      const signature = "0x00000000";
      await expect(
        await tba.connect(User1).isValidSignature(data, signature)
      ).to.be.equal(signature);
    });

    it("Should return 0x1626ba7e when signature is valid", async function () {
      // Step 1: Call isValidSignature() with valid value
      // Step 2: Verify transaction should be successfully
      // Step 3: Verify return value is 0x1626ba7e
      this.mlog.log("[User 1]", "Call isValidSignature() with valid value");
      const data =
        "function transfer1155( address contractAddress, address to, uint256 tokenId, uint256 amount, bytes memory data )";
      const dataEncode = ethers.keccak256(ethers.toUtf8Bytes(data));
      const message = ethers.hashMessage(dataEncode);
      const signature = await User1.signMessage(dataEncode);
      await expect(
        await tba.connect(User1).isValidSignature(message, signature)
      ).to.be.equal("0x1626ba7e");
    });
  });
});
