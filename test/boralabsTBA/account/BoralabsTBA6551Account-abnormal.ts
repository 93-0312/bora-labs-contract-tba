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
} from "../../util/fixture";
import mlog from "../../util/mlog";
import { BigNumberish, Interface } from "ethers";

describe("BoralabsTBA6551Account: Abnormal test", function () {
  mlog.injectLogger(this);

  let bora20: BoralabsTBA20;
  let bora721: BoralabsTBA721;
  let bora1155: BoralabsTBA1155;
  let bora6551Account: BoralabsTBA6551Account;
  let bora6551Registry: BoralabsTBA6551Registry;

  let tbaAddress: string;
  let tba: BoralabsTBA6551Account;

  let User1: HardhatEthersSigner;
  let User2: HardhatEthersSigner;

  let amount = 10;
  let emptyData = "0x";

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

  describe("Execute", async function () {
    it("Should execute successfully when address to is zero address", async function () {
      // Step 1: Owner call execute() to zero address
      // Step 2: Verify the transaction is successful
      this.mlog.log("[TBA Account]", "call execute() to zero address");
      expect(
        await tba.connect(User1).execute(ethers.ZeroAddress, 0, emptyData, 0)
      ).to.be.ok;
    });

    it("Should execute failed when executed with value greater than account balance", async function () {
      // Step 1: Owner calls execute() with value greater than account balance
      // Step 2: Verify the transaction will be reverted
      this.mlog.log(
        "[TBA Account]",
        "calls execute() with value greater than account balance"
      );
      await expect(
        tba.connect(User1).execute(User2.address, 1000, emptyData, 0)
      ).to.be.reverted;
    });

    it("Should execute successfully when executed with data is empty", async function () {
      // Step 1: Owner calls execute() with data is empty
      // Step 2: Verify the transaction is successful
      this.mlog.log("[TBA Account]", "calls execute() with data is empty");
      expect(tba.connect(User1).execute(User2.address, 1000, emptyData, 0)).to
        .be.ok;
    });
  });

  describe("TransferCoin", async function () {
    it("Should transfer successfully when transferring coin to zero address", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await ethers.provider.getBalance(tbaAddress)
      );

      // Step 1: Owner of TBA transfers amount of coin to TBA account
      this.mlog.log(
        "[Owner of TBA]",
        "transfers amount of coin is 1000 to TBA account"
      );
      await User1.sendTransaction({ to: tbaAddress, value: 1000 });

      this.mlog.log(
        "[TBA Account]",
        "balance:",
        await ethers.provider.getBalance(tbaAddress)
      );

      // Step 2: Owner calls transferCoin() to transfer from TBA account to zero address
      // Step 3: Verify the transaction is successful
      this.mlog.log(
        "[Owner of TBA]",
        "calls transferCoin() to transfer from TBA account to zero address"
      );
      expect(await tba.connect(User1).transferCoin(ethers.ZeroAddress, 1000)).to
        .be.ok;

      // Step 4: Verify the contract balance is decreased
      expect(await ethers.provider.getBalance(tbaAddress)).to.equal(0);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await ethers.provider.getBalance(tbaAddress)
      );
    });

    it("Should transfer failed when transferring coins with a value greater than contract balance", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await ethers.provider.getBalance(tbaAddress)
      );

      // Step 1: Owner calls transferCoin() to transfer coin with value greater than contract balance to another user
      // Step 2: Verify the transaction will be reverted
      this.mlog.log(
        "[Owner of TBA]",
        "calls transferCoin() to transfer coin with value is 10"
      );
      await expect(tba.connect(User1).transferCoin(User2.address, 10)).to.be
        .reverted;

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await ethers.provider.getBalance(tbaAddress)
      );
    });
  });

  describe("Transfer20", async function () {
    it("Should transfer failed when transferring token erc20 to zero address", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 1: Mint token erc20 with amount is 10 to TBA account
      this.mlog.log("[TBA Account]", "mint 10 tokens for TBA Account");
      await bora20.mint(tbaAddress, 10);
      this.mlog.log(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 2: Owner calls transfer20() to transfer token from TBA account to zero address with amount is 10
      // Step 3: Verify the transaction will be reverted with error message “ERC20: transfer to the zero address.”
      this.mlog.log(
        "[Owner of TBA]",
        "calls transfer20() to transfer token from TBA account to zero address with amount is 10"
      );
      await expect(
        tba.connect(User1).transfer20(bora20.target, ethers.ZeroAddress, 10)
      ).to.be.revertedWith("ERC20: transfer to the zero address");

      // Step 4: Verify TBA account balance is not changed
      expect(await bora20.balanceOf(tbaAddress)).to.equal(10);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
    });

    it("Should transfer failed when transferring token erc20 with contractAddress is zero address", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 1: Mint token erc20 with amount is 10 to TBA account
      this.mlog.log("[TBA Account]", "mint 10 tokens for TBA Account");
      await bora20.mint(tbaAddress, 10);
      this.mlog.log(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 2: Owner calls transfer20() to transfer token from TBA account to another user with contractAddress is zero address
      // Step 3: Verify the transaction will be reverted
      this.mlog.log(
        "[Owner of TBA]",
        "calls transfer20() to transfer token from TBA account to another user with contractAddress is zero address"
      );
      await expect(
        tba.connect(User1).transfer20(ethers.ZeroAddress, tbaAddress, 10)
      ).to.be.reverted;

      // Step 4: Verify TBA account balance is not changed
      expect(await bora20.balanceOf(tbaAddress)).to.equal(10);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
    });

    it("Should transfer failed when transfer token erc20 with amount greater than contract balance", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.before(
        "[User 2]",
        "balance:",
        await bora20.balanceOf(User2.address)
      );

      // Step 1: Mint token erc20 with amount is 10 to TBA account
      this.mlog.log("[TBA Account]", "mint 10 tokens for TBA Account");
      await bora20.mint(tbaAddress, 10);
      this.mlog.log(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );

      // Step 2: Owner calls transfer20() to transfer token with amount greater than contract balance
      // Step 3: Verify transaction will be reverted with error message “ERC20: transfer amount exceeds”
      this.mlog.log(
        "[Owner of TBA]",
        "calls transfer20() to transfer token with amount greater than contract balance"
      );
      await expect(
        tba.connect(User1).transfer20(bora20.target, User2.address, 20)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      // Step 4: Verify TBA account balance is not changed
      expect(await bora20.balanceOf(tbaAddress)).to.equal(10);
      expect(await bora20.balanceOf(User2.address)).to.equal(0);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora20.balanceOf(tbaAddress)
      );
      this.mlog.after(
        "[User 2]",
        "balance:",
        await bora20.balanceOf(User2.address)
      );
    });
  });

  describe("Transfer721", async function () {
    it("Should transfer failed when transfer token erc721 to zero address", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      // Step 1: Owner of ERC721 mint 3 tokens for TBA account
      this.mlog.log("[TBA Account]", "mint 3 tokens for TBA account");
      await bora721.tbaMint(tbaAddress);
      this.mlog.log(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      // Step 2: Owner calls transfer721() to transfer token id 10000002 to zero address
      // Step 3: Verify the transaction will be reverted with error message “ERC721: transfer to the zero address”
      this.mlog.log(
        "[Owner of TBA]",
        "calls transfer721() to transfer token id 10000002 to zero address"
      );
      await expect(
        tba
          .connect(User1)
          .transfer721(bora721.target, ethers.ZeroAddress, 10000002)
      ).to.be.revertedWith("ERC721: transfer to the zero address");

      // Step 4: Verify TBA account balance is not changed
      expect(await bora721.balanceOf(tbaAddress)).to.equal(3);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );
    });

    it("Should transfer failed when transferring token erc721 with contractAddress is zero address", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      // Step 1: Owner of ERC721 mint 3 tokens for TBA account
      this.mlog.log("[TBA Account]", "mint 10 tokens for TBA Account");
      await bora721.tbaMint(tbaAddress);
      this.mlog.log(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      // Step 2: Owner calls transfer721() to transfer token id 10000002 from TBA account to another user with contractAddress is zero address
      // Step 3: Verify the transaction will be reverted
      this.mlog.log(
        "[Owner of TBA]",
        "calls transfer721() to transfer token id 10000002 from TBA account to another user with contractAddress is zero address"
      );
      await expect(
        tba.connect(User1).transfer721(ethers.ZeroAddress, tbaAddress, 10000002)
      ).to.be.reverted;

      // Step 4: Verify TBA account balance is not changed
      expect(await bora721.balanceOf(tbaAddress)).to.equal(3);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );
    });

    it("Should transfer failed when transfer invalid token", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      // Step 1: Owner of ERC721 mint 3 tokens for TBA account
      this.mlog.log("[TBA Account]", "mint 3 tokens for TBA Account");
      await bora721.tbaMint(tbaAddress);
      this.mlog.log(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );

      // Step 2: Owner calls transfer721() to transfer token id 10000002 from TBA account to User 2
      // Step 3: Verify transaction  will be reverted with error message “ERC721: invalid token ID”
      this.mlog.log(
        "[Owner of TBA]",
        "calls transfer721() to transfer token id 10000003 from TBA account to User 2"
      );
      await expect(
        tba.connect(User1).transfer721(bora721.target, tbaAddress, 10000003)
      ).to.be.revertedWith("ERC721: invalid token ID");

      // Step 4: Verify TBA account balance is not changed
      expect(await bora721.balanceOf(tbaAddress)).to.equal(3);

      this.mlog.after(
        "[TBA Account]",
        "balance:",
        await bora721.balanceOf(tbaAddress)
      );
    });
  });

  describe("Transfer1155", async function () {
    it("Should transfer failed when transfer token erc1155 to zero address", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );

      // Step 1: Owner of ERC1155 mint 5 tokens and all are 10 for TBA account
      this.mlog.log(
        "[TBA Account]",
        "mint 5 tokens and all are 10 for TBA account"
      );
      await bora1155.tbaMint(tbaAddress, amount, emptyData);
      this.mlog.log(
        "[TBA Account]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );

      // Step 2: Owner calls transfer1155() to transfer token id 10000001 with amount is 10 from TBA account to zero address
      // Step 3: Verify the transaction will be reverted with error message “ERC1155: transfer to the zero address”
      this.mlog.log(
        "[Owner of TBA]",
        "calls transfer1155() to transfer token id 10000001 with amount is 10 from TBA account to zero address"
      );
      await expect(
        tba
          .connect(User1)
          .transfer1155(
            bora1155.target,
            ethers.ZeroAddress,
            10000001,
            amount,
            emptyData
          )
      ).to.be.revertedWith("ERC1155: transfer to the zero address");

      // Step 4: Verify TBA account balance is not changed
      expect(
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([10, 10, 10, 10, 10]);

      this.mlog.after(
        "[TBA Account]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );
    });

    it("Should transfer failed when transferring token erc1155 with contractAddress is zero address", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );

      // Step 1: Owner of ERC1155 mint 5 tokens and all are 10 for TBA account
      this.mlog.log(
        "[TBA Account]",
        "mint 5 tokens and all are 10 for TBA account"
      );
      await bora1155.tbaMint(tbaAddress, amount, emptyData);
      this.mlog.log(
        "[TBA Account]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );

      // Step 2: Owner calls transfer1155() to transfer token id 10000001 with amount is 10 from TBA account
      // to another user with contractAddress is zero address
      // Step 3: Verify the transaction will be reverted
      this.mlog.log(
        "[Owner of TBA]",
        "calls transfer1155() to transfer token id 10000001 with amount is 10 from TBA account to another user with contractAddress is zero address"
      );
      await expect(
        tba
          .connect(User1)
          .transfer1155(
            ethers.ZeroAddress,
            User2.address,
            10000001,
            amount,
            emptyData
          )
      ).to.be.reverted;

      // Step 4: Verify TBA account balance is not changed
      expect(
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([10, 10, 10, 10, 10]);

      this.mlog.after(
        "[TBA Account]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );
    });

    it("Should failed when transfer invalid token", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );
      this.mlog.before(
        "[User 2]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [
            User2.address,
            User2.address,
            User2.address,
            User2.address,
            User2.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );

      // Step 1: Owner of ERC1155 mint 5 tokens and all are 10 for TBA account
      this.mlog.log(
        "[TBA Account]",
        "mint 5 tokens and all are 10 for TBA account"
      );
      await bora1155.tbaMint(tbaAddress, amount, emptyData);
      this.mlog.log(
        "[TBA Account]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );

      // Step 2: Owner calls transfer1155() to transfer token id 10000002 with amount is 10 to User 2
      // Step 3: Verify transaction will be reverted with error message “ERC1155: transfer from incorrect owner”
      this.mlog.log(
        "[Owner of TBA]",
        "calls transfer1155() to transfer token id 10000002 with amount is 10 to User 2"
      );
      await expect(
        tba
          .connect(User1)
          .transfer1155(
            bora1155.target,
            User2.address,
            10000002,
            amount,
            emptyData
          )
      ).to.be.revertedWith("ERC1155: insufficient balance for transfer");

      // Step 4: Verify TBA account balance is not changed
      expect(
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([10, 10, 10, 10, 10]);

      // Step 5: Verify balance of User 2 is not changed
      expect(
        await bora1155.balanceOfBatch(
          [
            User2.address,
            User2.address,
            User2.address,
            User2.address,
            User2.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([0, 0, 0, 0, 0]);

      this.mlog.after(
        "[TBA Account]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );
      this.mlog.after(
        "[User 2]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [
            User2.address,
            User2.address,
            User2.address,
            User2.address,
            User2.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );
    });

    it("Should failed when transferring amount of token is exceeded", async function () {
      this.mlog.before(
        "[TBA Account]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );
      this.mlog.before(
        "[User 2]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [
            User2.address,
            User2.address,
            User2.address,
            User2.address,
            User2.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );

      // Step 1: Owner of ERC1155 mint 5 tokens and all are 10 for TBA account
      this.mlog.log(
        "[TBA Account]",
        "mint 5 tokens and all are 10 for TBA account"
      );
      await bora1155.tbaMint(tbaAddress, amount, emptyData);
      this.mlog.log(
        "[TBA Account]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );

      // Step 2: Owner calls transfer1155() to transfer token id 10000002 with amount is 20 to User 2
      // Step 3: Verify transaction will be reverted with error message “ERC1155: transfer from incorrect owner”
      this.mlog.log(
        "[Owner of TBA]",
        "calls transfer1155() to transfer token id 10000002 with amount is 20 to User 2"
      );
      await expect(
        tba
          .connect(User1)
          .transfer1155(
            bora1155.target,
            User2.address,
            10000002,
            amount * 2,
            emptyData
          )
      ).to.be.revertedWith("ERC1155: insufficient balance for transfer");

      // Step 4: Verify TBA account balance is not changed
      expect(
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([10, 10, 10, 10, 10]);

      // Step 5: Verify balance of User 2 is not changed
      expect(
        await bora1155.balanceOfBatch(
          [
            User2.address,
            User2.address,
            User2.address,
            User2.address,
            User2.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      ).to.deep.equal([0, 0, 0, 0, 0]);

      this.mlog.after(
        "[TBA Account]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [tbaAddress, tbaAddress, tbaAddress, tbaAddress, tbaAddress],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );
      this.mlog.after(
        "[User 2]",
        "balance of token ids [10000001, 20000001, 30000001, 40000001, 50000001]:",
        await bora1155.balanceOfBatch(
          [
            User2.address,
            User2.address,
            User2.address,
            User2.address,
            User2.address,
          ],
          [10000001, 20000001, 30000001, 40000001, 50000001]
        )
      );
    });
  });

  describe("IsValidSigner", async function () {
    it("Should return 0x00000000 when signer is zero address", async function () {
      // Step 1: Owner calls isValidSigner() with zero address
      // Step 2: Verify the result is 0x00000000
      this.mlog.log(
        "[Owner of TBA]",
        "calls isValidSigner() with zero address"
      );
      expect(
        await tba.connect(User1).isValidSigner(ethers.ZeroAddress, emptyData)
      ).to.be.equal("0x00000000");
    });
  });

  describe("IsValidSignature", async function () {
    it("Should return empty when hash value is 0", async function () {
      // Step 1: Owner calls isValidSignature() with hash value is 0
      // Verify the result is empty
      const data =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      const dataEncode = ethers.keccak256(ethers.toUtf8Bytes(data));
      const message = ethers.hashMessage(dataEncode);
      const signature = await User1.signMessage(message);
      this.mlog.log(
        "[TBA Account]",
        "calls isValidSignature() with hash value is 0"
      );
      await expect(
        await tba.connect(User1).isValidSignature(message, signature)
      ).to.be.equals("0x00000000");
    });

    it("Should return empty when signature value is 0", async function () {
      // Step 1: Owner calls isValidSignature() with signature value is 0
      // Step 2: Verify the result is empty
      this.mlog.log(
        "[User 1]",
        "calls isValidSignature() with signature value is 0"
      );
      let data =
        "function transfer1155( address contractAddress, address to, uint256 tokenId, uint256 amount, bytes memory data )";
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(data));
      const ethHash = ethers.hashMessage(dataHash);
      const signature = "0x00000000";
      this.mlog.log(
        "[TBA Account]",
        "calls isValidSignature() with signature value is 0"
      );
      await expect(
        await tba.connect(User1).isValidSignature(ethHash, signature)
      ).to.be.equals(signature);
    });
  });

  describe("SupportsInterface", async function () {
    it("Should return false when interface value is 0", async function () {
      // Step 1: Owner calls supportsInterface() with interface value is 0
      this.mlog.log(
        "[Owner of TBA]",
        "calls supportsInterface() with interface value is 0"
      );

      // Step 2: Verify the result is false.
      await expect(
        await tba.connect(User1).supportsInterface("0x00000000")
      ).to.be.equal(false);
    });
  });

  describe("onERC721Received", async function () {
    it("Should revert when operator is zero address", async function () {
      // Step 1: User 1 calls onERC721Received() with operator value is zero address
      this.mlog.log(
        "[User 1]",
        "calls onERC721Received() with operator value is zero address"
      );

      // Step 2: Verify the transaction will be reverted with error message “Invalid parameter”
      await expect(
        bora6551Account
          .connect(User1)
          .onERC721Received(ethers.ZeroAddress, tbaAddress, 20000001, emptyData)
      ).to.be.revertedWith("Invalid parameter");
    });

    it("Should revert when token id is 0", async function () {
      // Step 1: User 1 calls onERC721Received() with token id 0
      this.mlog.log("[User 1]", "calls onERC721Received() with token id 0");

      // Step 2: Verify the transaction will be reverted with error message “Invalid parameter”
      await expect(
        bora6551Account
          .connect(User1)
          .onERC721Received(User2.address, tbaAddress, 0, emptyData)
      ).to.be.revertedWith("Invalid parameter");
    });
  });

  describe("onERC1155Received", async function () {
    it("Should revert when operator is zero address", async function () {
      // Step 1: User 1 calls onERC1155Received() with operator value is zero address
      this.mlog.log(
        "[User 1]",
        "calls onERC1155Received() with operator value is zero address"
      );

      // Step 2: Verify the transaction will be reverted with error message “Invalid parameter”
      await expect(
        bora6551Account
          .connect(User1)
          .onERC1155Received(ethers.ZeroAddress, tbaAddress, 1, 10, emptyData)
      ).to.be.revertedWith("Invalid parameter");
    });

    it("Should revert when token id is 0", async function () {
      // Step 1: User 1 calls onERC1155Received() with token id 0
      this.mlog.log("[User 1]", "calls onERC1155Received() with token id 0");

      // Step 2: Verify the transaction will be reverted with error message “Invalid parameter”
      await expect(
        bora6551Account
          .connect(User1)
          .onERC1155Received(User2.address, tbaAddress, 0, 10, emptyData)
      ).to.be.revertedWith("Invalid parameter");
    });

    it("Should revert when value is 0", async function () {
      // Step 1: User 1 calls onERC1155Received() with value id 0
      this.mlog.log("[User 1]", "calls onERC1155Received() with value id 0");

      // Step 2: Verify the transaction will be reverted with error message “Invalid parameter”
      await expect(
        bora6551Account
          .connect(User1)
          .onERC1155Received(User2.address, tbaAddress, 1, 0, emptyData)
      ).to.be.revertedWith("Invalid parameter");
    });
  });

  describe("onERC1155BatchReceived", async function () {
    it("Should revert when operator is zero address", async function () {
      // Step 1: User 1 calls onERC1155BatchReceived() with operator value is zero address
      this.mlog.log(
        "[User 1]",
        "calls onERC1155BatchReceived() with operator value is zero address"
      );

      // Step 2: Verify the transaction will be reverted with error message “Invalid parameter”
      await expect(
        bora6551Account
          .connect(User1)
          .onERC1155BatchReceived(
            ethers.ZeroAddress,
            User2.address,
            [1],
            [10],
            emptyData
          )
      ).to.be.revertedWith("Invalid parameter");
    });

    it("Should revert when tokens id empty array", async function () {
      // Step 1: User 1 calls onERC1155BatchReceived() with tokens is empty array
      this.mlog.log(
        "[User 1]",
        "calls onERC1155BatchReceived() with tokens is empty array"
      );

      // Step 2: Verify the transaction will be reverted with error message “Invalid parameter”
      await expect(
        bora6551Account
          .connect(User1)
          .onERC1155BatchReceived(
            tbaAddress,
            User2.address,
            [],
            [10],
            emptyData
          )
      ).to.be.revertedWith("Invalid parameter");
    });

    it("Should revert when values is empty array", async function () {
      // Step 1: User 1 calls onERC1155BatchReceived() with values is empty array
      this.mlog.log(
        "[User 1]",
        "calls onERC1155BatchReceived() with values is empty array"
      );

      // Step 2: Verify the transaction will be reverted with error message “Invalid parameter”
      await expect(
        bora6551Account
          .connect(User1)
          .onERC1155BatchReceived(tbaAddress, User2.address, [1], [], emptyData)
      ).to.be.revertedWith("Invalid parameter");
    });
  });
});
