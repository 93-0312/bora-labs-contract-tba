import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
  BoralabsTBA721,
  BoralabsTBA1155,
  BoralabsTBA6551Account,
  BoralabsTBA6551Registry,
} from "../../typechain-types";
import {
  deployBora721,
  deployBora1155,
  deployBora6551Account,
  deployBora6551Registry,
} from "../util/fixture";
import mlog from "../util/mlog";
import { BigNumberish, Interface } from "ethers";
import Util from "../util/util";

describe("BoralabsTBA6551: Abnormal test", function () {
  mlog.injectLogger(this);

  let bora721: BoralabsTBA721;
  let bora1155: BoralabsTBA1155;
  let bora6551Account: BoralabsTBA6551Account;
  let bora6551Registry: BoralabsTBA6551Registry;

  let tbaAddress: string;
  let tba: BoralabsTBA6551Account;

  let User1: HardhatEthersSigner;
  let User2: HardhatEthersSigner;
  let User3: HardhatEthersSigner;

  let data: string;
  const amount = 10;
  const emptyData = "0x";

  const iface1155 = new Interface([
    "function safeTransferFrom(address from, address to, uint256 tokenId, uint256 amount, bytes data)",
    "function tbaMint(address to, uint256 amount, bytes memory data)",
    "function burn(uint256 id, uint256 amount)",
    "function uri(uint256 id)",
    "function tokensOf(address owner)",
    "function tokenCountOf(address owner)",
  ]);

  beforeEach(async function () {
    [User1, User2, User3] = await ethers.getSigners();

    // deploy bora721
    ({ bora721 } = await loadFixture(deployBora721));

    // deploy bora1155
    ({ bora1155 } = await loadFixture(deployBora1155));

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
      emptyData
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

  describe("Safe Transfer From", async function () {
    it("Should transfer failed when transferring from a zero address", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      this.mlog.before(
        "[User 1]",
        "balance:",
        await bora1155.tokenCountOf(User1)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint tokens
      // (10000001, 20000001, 30000001, 40000001, 50000001) with amount is 1 for TBA account
      this.mlog.log(
        "[TBA Account]",
        "mint tokens (10000001, 20000001, 30000001, 40000001 and 50000001) with an amount of 1"
      );
      await bora1155.tbaMint(tbaAddress, 1, emptyData);

      // Step 2: TBA account uses execute() to call safeTransferFrom() to transfer the
      // token id 10000001 with amount is 1 from a zero address to User 1
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call safeTransferFrom() to transfer the",
        "token id 10000001 with amount is 1 from a zero address to User 1"
      );
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        ethers.ZeroAddress,
        User1.address,
        10000001,
        1,
        emptyData,
      ]);

      // Step 3: Verify transfer will be reverted with error message “ERC1155: caller is not token owner or approved”
      await expect(
        tba.connect(User1).execute(bora1155.target, 0, data, 0)
      ).to.be.revertedWith("ERC1155: caller is not token owner or approved");

      // Step 4: Verify balance of User 1 is not changed
      expect(await bora1155.tokenCountOf(User1)).to.be.equal(0);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      this.mlog.after(
        "[User 1]",
        "balance:",
        await bora1155.tokenCountOf(User1)
      );
    });

    it("Should transfer failed when transferring to a zero address", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
      this.mlog.before(
        "[User 1]",
        "balance:",
        await bora1155.tokenCountOf(User1)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint tokens
      // (10000001, 20000001, 30000001, 40000001, 50000001) with amount is 1 for TBA account
      this.mlog.log(
        "[TBA Account]",
        "mint tokens (10000001, 20000001, 30000001, 40000001 and 50000001) with an amount of 1"
      );
      await bora1155.tbaMint(tbaAddress, 1, emptyData);

      // Step 2: TBA account uses execute() to call safeTransferFrom() to transfer
      // the token id 10000001 with amount is 1 from TBA account to a zero address
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call safeTransferFrom() to transfer",
        "the token id 10000001 with amount is 1 from TBA account to a zero address"
      );
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        ethers.ZeroAddress,
        10000001,
        1,
        emptyData,
      ]);

      // Step 3: Verify transfer will be reverted with error message “ERC1155: transfer to the zero address”
      await expect(
        tba.connect(User1).execute(bora1155.target, 0, data, 0)
      ).to.be.revertedWith("ERC1155: transfer to the zero address");

      // Step 4: Verify balance of TBA account is not changed
      expect(await bora1155.balanceOf(tbaAddress, 10000001)).to.be.equal(1);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
      this.mlog.after(
        "[User 1]",
        "balance:",
        await bora1155.tokenCountOf(User1)
      );
    });

    it("Should transfer failed when transferring an invalid token id", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
      this.mlog.before(
        "[User 1]",
        "balance:",
        await bora1155.tokenCountOf(User1)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint tokens
      // (10000001, 20000001, 30000001, 40000001, 50000001) with amount is 1 for TBA account
      this.mlog.log(
        "[TBA Account]",
        "mint tokens (10000001, 20000001, 30000001, 40000001 and 50000001) with an amount of 1"
      );
      await bora1155.tbaMint(tbaAddress, 1, emptyData);

      // Step 2: TBA account uses execute() to call safeTransferFrom() to transfer the token id 60000001 from TBA account to User 1
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call safeTransferFrom() to transfer the token id 60000001 from TBA account to User 1"
      );
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        User1.address,
        60000001,
        1,
        emptyData,
      ]);

      // Step 3: Verify transfer will be reverted with error message “ERC1155: insufficient balance for transfer”
      await expect(
        tba.connect(User1).execute(bora1155.target, 0, data, 0)
      ).to.be.revertedWith("ERC1155: insufficient balance for transfer");

      // Step 4: Verify balance of TBA account is not changed
      expect(await bora1155.tokenCountOf(tbaAddress)).to.be.equal(5);

      // Step 5: Verify balance of User 1 is not changed
      expect(await bora1155.tokenCountOf(User1)).to.be.equal(0);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
      this.mlog.after(
        "[User 1]",
        "balance:",
        await bora1155.tokenCountOf(User1)
      );
    });

    it("Should transfer failed when transferring with amount greater than account balance", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
      this.mlog.before(
        "[User 1]",
        "balance:",
        await bora1155.tokenCountOf(User1)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint tokens
      // (10000001, 20000001, 30000001, 40000001, 50000001) with amount is 1 for TBA account
      this.mlog.log(
        "[TBA Account]",
        "mint tokens (10000001, 20000001, 30000001, 40000001 and 50000001) with an amount of 1"
      );
      await bora1155.tbaMint(tbaAddress, 1, emptyData);

      // Step 2: TBA account uses execute() to call safeTransferFrom()
      // to transfer the token id 10000001 and amount is 2 from TBA account to User 1
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call safeTransferFrom() to transfer the token id 10000001 and amount is 2 from TBA account to User 1"
      );
      data = iface1155.encodeFunctionData("safeTransferFrom", [
        tbaAddress,
        User1.address,
        10000001,
        2,
        emptyData,
      ]);

      // Step 3: Verify transfer will be reverted with error message “ERC1155: insufficient balance for transfer”
      await expect(
        tba.connect(User1).execute(bora1155.target, 0, data, 0)
      ).to.be.revertedWith("ERC1155: insufficient balance for transfer");

      // Step 4: Verify balance of TBA account is not changed
      expect(await bora1155.tokenCountOf(tbaAddress)).to.be.equal(5);

      // Step 5: Verify balance of User 1 is not changed
      expect(await bora1155.tokenCountOf(User1)).to.be.equal(0);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      this.mlog.after(
        "[User 1]",
        "balance:",
        await bora1155.tokenCountOf(User1)
      );
    });
  });

  describe("TBA Mint", async function () {
    it("Should tba mint failed when minting for a zero address", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint tokens 1155 for a zero address with amount is 10
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call tbaMint() to mint tokens 1155 for a zero address with amount is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        ethers.ZeroAddress,
        amount,
        emptyData,
      ]);

      // Step 2: Verify transaction will be reverted with error message “ERC1155: mint to the zero address”
      await expect(
        tba.connect(User1).execute(bora1155.target, 0, data, 0)
      ).to.be.revertedWith("ERC1155: mint to the zero address");

      // Step 3: Verify balance of TBA account is not changed
      expect(await bora1155.tokenCountOf(tbaAddress)).to.be.equal(0);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
    });

    it("Should tba mint failed when amount is 0", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint tokens 1155 with amount is 0
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call tbaMint() to mint tokens 1155 with amount is 0"
      );
      let data = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress,
        0,
        emptyData,
      ]);

      // Step 2: Verify transaction should be reverted with “Invalid parameter” message
      await expect(
        tba.connect(User1).execute(bora1155.target, 0, data, 0)
      ).to.be.revertedWith("Invalid parameter");

      // Step 3: Verify balance of TBA account is not changed
      expect(await bora1155.tokenCountOf(tbaAddress)).to.be.equal(0);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
    });
  });

  describe("Burn", async function () {
    it("Should burn failed when burning with an invalid token id", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      // Step 1: Owner of ERC1155 mint tokens (10000001, 20000001, 30000001, 40000001, 50000001) with amount is 10 for TBA account
      this.mlog.log(
        "[TBA Account]",
        "mint tokens (10000001, 20000001, 30000001, 40000001 and 50000001) with an amount of 1"
      );
      await bora1155.tbaMint(tbaAddress, amount, emptyData);

      // Step 2: TBA account using execute() to burn token id 2.
      this.mlog.log("[TBA Account]", "using execute() to burn token id 2");
      data = iface1155.encodeFunctionData("burn", [2, amount]);

      // Step 3: Verify transaction will be reverted with error message “ERC1155: burn amount exceeds balance”.
      await expect(
        tba.connect(User1).execute(bora1155.target, 0, data, 0)
      ).to.be.revertedWith("ERC1155: burn amount exceeds balance");

      // Step 4: Verify balance of TBA account is not changed.
      expect(await bora1155.tokenCountOf(tbaAddress)).to.be.equal(5);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
    });

    it("Should burn failed when burning with an burn amount exceeds balance", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );

      // Step 1: TBA account uses execute() to call tbaMint() to mint
      // tokens 1155 (10000001, 20000001, 30000001, 40000001, 50000001) for a TBA account with amount is 10
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call tbaMint() to mint tokens 1155",
        "(10000001, 20000001, 30000001, 40000001, 50000001) for a TBA account with amount is 10"
      );
      data = iface1155.encodeFunctionData("tbaMint", [
        tbaAddress,
        amount,
        emptyData,
      ]);
      await tba.connect(User1).execute(bora1155.target, 0, data, 0);

      // Step 2: TBA account using execute() to burn token id 10000001 with amount is 20
      this.mlog.log(
        "[TBA Account]",
        "using execute() to burn token id 10000001 with amount is 20"
      );
      data = iface1155.encodeFunctionData("burn", [10000001, 20]);

      // Step 3: Verify transaction will be reverted with error message “ERC1155: burn amount exceeds balance”
      await expect(
        tba.connect(User1).execute(bora1155.target, 0, data, 0)
      ).to.be.revertedWith("ERC1155: burn amount exceeds balance");

      // Step 4: Verify balance of TBA account is not changed.
      expect(await bora1155.tokenCountOf(tbaAddress)).to.be.equal(5);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora1155.tokenCountOf(tbaAddress)
      );
    });
  });

  describe("URI", async function () {
    it("Should get uri failed when using an invalid token id", async function () {
      // Step 1: TBA account uses execute() to call uri() to get uri with token id 0
      // Step 2: Verify transaction will be reverted with error message “invalid tokenId”
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to call uri() to get uri with token id 0"
      );
      let data = iface1155.encodeFunctionData("uri", [0]);
      await expect(
        tba.connect(User1).execute(bora1155.target, 0, data, 0)
      ).to.be.revertedWith("invalid tokenId");
    });
  });

  describe("Tokens Of", async function () {
    it("Should get a token list successful for zero address", async function () {
      // Step 1: TBA account uses execute() to get tokens of a zero address
      // Step 2: Verify the output is empty array
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to get tokens of a zero address"
      );
      let data = iface1155.encodeFunctionData("tokensOf", [ethers.ZeroAddress]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let tokens = Util.decodeFunctionResult(
        ["uint256[]", "uint256[]"],
        result.toString()
      );
      expect(tokens).to.deep.equal([[], []]);
    });
  });

  describe("Tokens Count Of", async function () {
    it("Should get token count of zero address is 0", async function () {
      // Step 1: TBA account uses execute() to get the token count of a zero address
      // Step 2: Verify the output is 0
      this.mlog.log(
        "[TBA Account]",
        "uses execute() to get the token count of a zero address"
      );
      let data = iface1155.encodeFunctionData("tokenCountOf", [
        ethers.ZeroAddress,
      ]);
      let result = await tba.execute.staticCallResult(
        bora1155.target,
        0,
        data,
        0
      );
      let tokenCount = Util.decodeFunctionResult(
        ["uint256"],
        result.toString()
      )[0];
      expect(tokenCount).to.equal(0);
    });
  });
});
